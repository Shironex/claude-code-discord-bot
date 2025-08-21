import { Injectable } from '@nestjs/common';
import { Context, Modal, ModalContext } from 'necord';
import { ActionRowBuilder, ButtonBuilder, MessageFlags } from 'discord.js';
import { BaseService } from '../../services/base/base.service';
import { SessionService } from '../../services/session.service';
import { WorkflowService } from '../../services/workflow.service';
import { EmbedService } from '../../services/embed.service';
import { WorkflowMonitorService } from '../../services/workflow-monitor.service';
import { CUSTOM_IDS } from '../../utils/discord.constants';
import { MESSAGES } from '../../utils/messages.constants';
import { DiscordUtils } from '../../utils/discord.utils';
import { FileTreeUtils } from '../../utils/file-tree.utils';
import { TypeGuards } from '../../utils/type-guards';
import { TrackingUtils } from '../../utils/tracking.utils';

@Injectable()
export class ClaudePromptModalHandler extends BaseService {
	constructor(
		private readonly sessionService: SessionService,
		private readonly workflowService: WorkflowService,
		private readonly embedService: EmbedService,
		private readonly workflowMonitorService: WorkflowMonitorService
	) {
		super(ClaudePromptModalHandler.name);
	}

	@Modal(CUSTOM_IDS.CLAUDE_PROMPT_MODAL)
	public async onClaudePromptModal(@Context() [interaction]: ModalContext) {
		const userId = interaction.user.id;
		const session = this.sessionService.getSession(userId);

		if (!session || !session.repository) {
			return interaction.reply({
				content: MESSAGES.SESSION_EXPIRED,
				flags: [MessageFlags.Ephemeral]
			});
		}

		await interaction.deferReply();

		try {
			const rawPrompt = this.sanitizeInput(interaction.fields.getTextInputValue(CUSTOM_IDS.CLAUDE_PROMPT_INPUT));
			const rawBranch = this.sanitizeInput(
				interaction.fields.getTextInputValue(CUSTOM_IDS.CLAUDE_BRANCH_INPUT) || 'main'
			);

			// Validate prompt with type guard
			if (!TypeGuards.isValidPrompt(rawPrompt)) {
				return interaction.editReply({
					content: '❌ Invalid prompt. Please provide a prompt between 10 and 6000 characters.'
				});
			}

			// Validate branch name with type guard
			if (!TypeGuards.isValidBranchName(rawBranch)) {
				return interaction.editReply({
					content: '❌ Invalid branch name. Please provide a valid Git branch name.'
				});
			}

			const prompt = rawPrompt;
			const branch = rawBranch;

			// Get file context input (optional)
			let fileContextInput = '';
			try {
				fileContextInput = this.sanitizeInput(
					interaction.fields.getTextInputValue(CUSTOM_IDS.CLAUDE_FILE_CONTEXT_INPUT) || ''
				);
			} catch {
				// Field might not exist in older modal instances
			}

			// Get image URLs input (optional)
			let imageUrlsInput = '';
			try {
				imageUrlsInput = this.sanitizeInput(
					interaction.fields.getTextInputValue(CUSTOM_IDS.CLAUDE_IMAGE_URLS_INPUT) || ''
				);
			} catch {
				// Field might not exist in older modal instances
			}

			// Parse and combine file paths from session and modal input with validation
			const sessionPaths = TypeGuards.getFilePathArray(session.selectedFilePaths);
			const modalPaths = FileTreeUtils.parseFilePathsString(fileContextInput);
			const combinedPaths = [...sessionPaths, ...modalPaths];

			// Validate all file paths for security
			const validatedPaths = combinedPaths.filter(path => TypeGuards.isValidFilePath(path));
			const allFilePaths = [...new Set(validatedPaths)]; // Remove duplicates

			// Log warning if any paths were filtered out
			if (combinedPaths.length !== allFilePaths.length) {
				this.logger.warn(`Filtered out ${combinedPaths.length - allFilePaths.length} invalid file paths`);
			}

			// Parse and validate image URLs
			const imageUrls = this.parseImageUrls(imageUrlsInput);

			// Log image URLs if present
			if (imageUrls.length > 0) {
				this.logger.log(`Image URLs included: ${imageUrls.length} images`);
				this.logger.log(`Image URLs: ${imageUrls.join(', ')}`);
			}

			const [owner, repo] = session.repository.fullName.split('/');

			this.logger.log(`Claude prompt modal submission:`);
			this.logger.log(`Repository: ${session.repository.fullName}`);
			this.logger.log(`Branch: ${branch}`);
			this.logger.log(`User: ${interaction.user.tag} (${userId})`);
			this.logger.log(`Prompt: ${prompt.substring(0, 100)}...`);
			this.logger.log(`File context paths: ${allFilePaths.join(', ')}`);

			// Generate unique tracking ID for this workflow dispatch
			const trackingId = TrackingUtils.generateTrackingId();
			const dispatchTime = Date.now();

			// Create enhanced prompt with file context, image context, and tracking ID
			let enhancedPrompt = prompt;

			// Add file context if present
			if (allFilePaths.length > 0) {
				const contextSection = FileTreeUtils.generateContextPrompt(allFilePaths);
				enhancedPrompt = contextSection + prompt;
			}

			// Add image context if present
			if (imageUrls.length > 0) {
				const imageContextSection = this.generateImageContextPrompt(imageUrls);
				enhancedPrompt = imageContextSection + enhancedPrompt;
			}

			// Validate total prompt length including all context
			if (enhancedPrompt.length > 6000) {
				// Conservative limit including context
				return interaction.editReply({
					content:
						'❌ Combined prompt, file context, and image context is too long. Please reduce your selections or shorten your prompt.'
				});
			}

			// Add tracking ID to the prompt (will be visible in workflow logs)
			const trackedPrompt = `[Tracking: ${trackingId}]\n\n${enhancedPrompt}`;

			this.logger.log(`Dispatching workflow with tracking ID: ${trackingId}`);

			// Dispatch the workflow with tracking ID
			await this.workflowService.dispatchWorkflow({
				owner,
				repo,
				workflowId: 'claude.yml',
				ref: branch,
				inputs: {
					prompt: trackedPrompt,
					tracking_id: trackingId
				}
			});

			// Find the workflow run using tracking ID
			this.logger.log(`Searching for workflow run with tracking ID: ${trackingId}`);
			const latestRun = await this.workflowService.findWorkflowRunByTrackingId(
				owner,
				repo,
				'claude.yml',
				trackingId,
				dispatchTime,
				15 // Max 15 attempts (about 30-45 seconds of polling)
			);

			if (latestRun) {
				// Track the workflow run in session
				this.sessionService.addWorkflowRun(userId, {
					runId: latestRun.id,
					repository: session.repository.fullName,
					status: latestRun.status,
					startedAt: new Date(latestRun.created_at),
					workflowUrl: latestRun.html_url
				});

				const embed = this.embedService.createWorkflowDispatchedEmbed(
					session.repository.fullName,
					branch,
					prompt,
					latestRun,
					allFilePaths
				);

				// Create action buttons
				const components: ActionRowBuilder<ButtonBuilder>[] = [];
				const statusButton = DiscordUtils.createWorkflowStatusButton();
				const viewButton = DiscordUtils.createViewWorkflowButton(latestRun.html_url);

				const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(statusButton, viewButton);
				components.push(actionRow);

				const reply = await interaction.editReply({
					embeds: [embed],
					components
				});

				// Add workflow to monitor for automatic updates
				this.workflowMonitorService.addWorkflowToMonitor(
					userId,
					session.repository.fullName,
					latestRun.id,
					reply.id,
					interaction.channelId
				);

				this.logger.log(
					`Successfully dispatched Claude workflow: Run ${latestRun.id} with tracking ID ${trackingId} (monitoring enabled)`
				);
			} else {
				// Workflow was dispatched but we couldn't find it yet
				this.logger.warn(
					`Could not find workflow run with tracking ID ${trackingId}, showing fallback message`
				);

				let description = `Claude Code workflow has been triggered for \`${session.repository.fullName}\` on branch \`${branch}\`.\n\n**Prompt:** ${prompt}`;

				if (allFilePaths.length > 0) {
					description += `\n\n**File Context:** ${allFilePaths.slice(0, 5).join(', ')}${allFilePaths.length > 5 ? ` (and ${allFilePaths.length - 5} more)` : ''}`;
				}

				description += `\n\n**Tracking ID:** \`${trackingId}\`\n\nThe workflow has been dispatched but may take a moment to appear. Check the [Actions tab](https://github.com/${owner}/${repo}/actions) to monitor progress.`;

				const embed = this.embedService.createSuccessEmbed('Workflow Dispatched', description);

				await interaction.editReply({ embeds: [embed] });
			}
		} catch (error) {
			this.logger.error(`Failed to dispatch workflow from modal: ${error.message}`, error);
			const embed = this.embedService.createErrorEmbed(
				'Workflow Dispatch Failed',
				`Failed to trigger Claude Code workflow:\n\`${error.message}\`\n\nPlease check:\n• You have access to trigger workflows in this repository\n• The repository has the Claude Code workflow configured\n• Your GitHub token has the necessary permissions`
			);
			return interaction.editReply({ embeds: [embed] });
		}
	}

	/**
	 * Parse and validate image URLs from input string
	 */
	private parseImageUrls(input: string): string[] {
		if (!input || !input.trim()) {
			return [];
		}

		// Split by comma and clean up URLs
		const urls = input
			.split(',')
			.map(url => url.trim())
			.filter(Boolean)
			.filter(url => {
				// Basic URL validation and ensure it looks like an image service URL
				try {
					const parsedUrl = new URL(url);
					return (
						parsedUrl.pathname.includes('/api/v1/images/') &&
						(parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:')
					);
				} catch {
					return false;
				}
			});

		return urls;
	}

	/**
	 * Generate image context section for the prompt
	 */
	private generateImageContextPrompt(imageUrls: string[]): string {
		if (imageUrls.length === 0) {
			return '';
		}

		let contextPrompt = '\n--- Image Context ---\n';
		contextPrompt += 'The following images are provided for analysis:\n\n';

		imageUrls.forEach((url, index) => {
			contextPrompt += `${index + 1}. ${url}\n`;
		});

		contextPrompt += '\nIMPORTANT: To analyze these images:\n';
		contextPrompt += '1. Use curl with x-api-key header to fetch each image:\n';
		contextPrompt += '   ```bash\n';
		contextPrompt += '   curl -H "x-api-key: $CLAUDE_CODE_API_KEY" -o "image_[id].jpg" "[image_url]"\n';
		contextPrompt += '   ```\n';
		contextPrompt += '2. Analyze the visual content to inform your implementation\n';
		contextPrompt += '3. Consider the images as additional context for the task\n';
		contextPrompt += '4. If images fail to fetch, continue with available context\n';
		contextPrompt += '---\n\n';

		return contextPrompt;
	}

	/**
	 * Sanitize user input to prevent injection attacks and normalize content
	 */
	private sanitizeInput(input: string): string {
		if (!input) return '';

		// Remove or replace potentially dangerous characters
		return (
			input
				.trim()
				// Remove null bytes and other control characters except newlines and tabs
				.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
				// Normalize whitespace (but preserve newlines for prompts)
				.replace(/\s+/g, ' ')
				// Remove leading/trailing whitespace from each line
				.split('\n')
				.map(line => line.trim())
				.join('\n')
				// Remove excessive newlines (max 2 consecutive)
				.replace(/\n{3,}/g, '\n\n')
		);
	}
}
