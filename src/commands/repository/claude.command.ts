import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext, Options } from 'necord';
import { MessageFlags, ActionRowBuilder, ButtonBuilder } from 'discord.js';
import { GitHubService } from '../../services/github.service';
import { WorkflowService } from '../../services/workflow.service';
import { SessionService } from '../../services/session.service';
import { EmbedService } from '../../services/embed.service';
import { WorkflowMonitorService } from '../../services/workflow-monitor.service';
import { ClaudeDto } from '../../dtos/claude.dto';
import { DiscordUtils } from '../../utils/discord.utils';

@Injectable()
export class ClaudeCommand {
	private readonly logger = new Logger(ClaudeCommand.name);

	constructor(
		private readonly githubService: GitHubService,
		private readonly workflowService: WorkflowService,
		private readonly sessionService: SessionService,
		private readonly embedService: EmbedService,
		private readonly workflowMonitorService: WorkflowMonitorService
	) {}

	@SlashCommand({
		name: 'claude',
		description: 'Analyze a GitHub repository with Claude Code'
	})
	public async onClaudeCommand(@Context() [interaction]: SlashCommandContext, @Options() options: ClaudeDto) {
		const userId = interaction.user.id;

		// Validate GitHub service
		if (!this.githubService.isConfigured()) {
			const embed = this.embedService.createGitHubNotConfiguredEmbed();
			return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
		}

		// Validate workflow service
		if (!this.workflowService.isConfigured()) {
			const embed = this.embedService.createErrorEmbed(
				'GitHub Token Missing',
				'GitHub token is not configured. Workflow dispatch functionality is unavailable.'
			);
			return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
		}

		await interaction.deferReply();

		try {
			// Parse repository input
			const repoMatch = options.repository.match(/^([^\/]+)\/([^\/]+)$/);
			if (!repoMatch) {
				const embed = this.embedService.createErrorEmbed(
					'Invalid Repository Format',
					'Please use the format: `owner/repository-name`\nExample: `microsoft/vscode`'
				);
				return interaction.editReply({ embeds: [embed] });
			}

			const [, owner, repo] = repoMatch;
			const branch = options.branch || 'main';

			this.logger.log(`Claude command: ${owner}/${repo} on branch ${branch}`);
			this.logger.log(`User: ${interaction.user.tag} (${userId})`);
			this.logger.log(`Prompt: ${options.prompt.substring(0, 100)}...`);

			// Check if repository exists and is accessible
			try {
				await this.githubService.getRepository(owner, repo);
			} catch (error) {
				const embed = this.embedService.createErrorEmbed(
					'Repository Not Found',
					`Could not access repository \`${owner}/${repo}\`. Please check:\n• Repository exists\n• Repository is public or you have access\n• Repository name is spelled correctly`
				);
				return interaction.editReply({ embeds: [embed] });
			}

			// Check if Claude Code workflow exists
			const hasWorkflow = await this.workflowService.checkWorkflowExists(owner, repo, 'claude.yml');
			if (!hasWorkflow) {
				const embed = this.embedService.createWorkflowNotFoundEmbed(owner, repo);
				return interaction.editReply({ embeds: [embed] });
			}

			// Dispatch the workflow
			try {
				await this.workflowService.dispatchWorkflow({
					owner,
					repo,
					workflowId: 'claude.yml',
					ref: branch,
					inputs: {
						prompt: options.prompt
					}
				});

				// Get the latest workflow run (should be the one we just dispatched)
				// Wait a moment for GitHub to create the run
				await new Promise(resolve => setTimeout(resolve, 2000));
				const latestRun = await this.workflowService.getLatestWorkflowRun(owner, repo, 'claude.yml');

				// Create or update session
				if (!this.sessionService.hasSession(userId)) {
					this.sessionService.createSession(userId);
				}

				// Track the workflow run
				if (latestRun) {
					this.sessionService.updateSession(userId, {
						action: 'claude_analysis',
						repository: {
							id: 0, // We don't have the full repo object
							name: repo,
							fullName: `${owner}/${repo}`,
							description: null,
							language: null,
							stargazersCount: 0,
							forksCount: 0,
							updatedAt: new Date().toISOString(),
							private: false,
							htmlUrl: `https://github.com/${owner}/${repo}`
						}
					});

					const embed = this.embedService.createWorkflowDispatchedEmbed(
						`${owner}/${repo}`,
						branch,
						options.prompt,
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
						`${owner}/${repo}`,
						latestRun.id,
						reply.id,
						interaction.channelId
					);
				} else {
					const embed = this.embedService.createSuccessEmbed(
						'Workflow Dispatched',
						`Claude Code workflow has been triggered for \`${owner}/${repo}\` on branch \`${branch}\`.\n\n**Prompt:** ${options.prompt}\n\nCheck the [Actions tab](https://github.com/${owner}/${repo}/actions) to monitor progress.`
					);

					await interaction.editReply({ embeds: [embed] });
				}

				// Log success
				this.logger.log(`Successfully dispatched Claude workflow for ${owner}/${repo}`);
			} catch (error) {
				this.logger.error(`Failed to dispatch workflow: ${error.message}`, error);
				const embed = this.embedService.createErrorEmbed(
					'Workflow Dispatch Failed',
					`Failed to trigger Claude Code workflow:\n\`${error.message}\`\n\nPlease check:\n• You have access to trigger workflows in this repository\n• The repository has the Claude Code workflow configured\n• Your GitHub token has the necessary permissions`
				);
				return interaction.editReply({ embeds: [embed] });
			}
		} catch (error) {
			this.logger.error(`Claude command error: ${error.message}`, error);
			const embed = this.embedService.createErrorEmbed(
				'Command Error',
				'An unexpected error occurred. Please try again.'
			);
			return interaction.editReply({ embeds: [embed] });
		}
	}
}
