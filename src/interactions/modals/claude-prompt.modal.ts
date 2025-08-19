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
			const prompt = interaction.fields.getTextInputValue(CUSTOM_IDS.CLAUDE_PROMPT_INPUT);
			const branch = interaction.fields.getTextInputValue(CUSTOM_IDS.CLAUDE_BRANCH_INPUT) || 'main';

			const [owner, repo] = session.repository.fullName.split('/');

			this.logger.log(`Claude prompt modal submission:`);
			this.logger.log(`Repository: ${session.repository.fullName}`);
			this.logger.log(`Branch: ${branch}`);
			this.logger.log(`User: ${interaction.user.tag} (${userId})`);
			this.logger.log(`Prompt: ${prompt.substring(0, 100)}...`);

			// Dispatch the workflow
			await this.workflowService.dispatchWorkflow({
				owner,
				repo,
				workflowId: 'claude.yml',
				ref: branch,
				inputs: {
					prompt
				}
			});

			// Wait a moment for GitHub to create the run
			await new Promise(resolve => setTimeout(resolve, 2000));
			const latestRun = await this.workflowService.getLatestWorkflowRun(owner, repo, 'claude.yml');

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
					latestRun
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

				this.logger.log(`Successfully dispatched Claude workflow: Run ${latestRun.id} (monitoring enabled)`);
			} else {
				const embed = this.embedService.createSuccessEmbed(
					'Workflow Dispatched',
					`Claude Code workflow has been triggered for \`${session.repository.fullName}\` on branch \`${branch}\`.\n\n**Prompt:** ${prompt}\n\nCheck the [Actions tab](https://github.com/${owner}/${repo}/actions) to monitor progress.`
				);

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
}
