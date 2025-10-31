import { Injectable } from '@nestjs/common';
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, Colors } from 'discord.js';
import { BaseService } from './base/base.service';
import { IEmbedService } from '../interfaces/services/embed.interface';
import { Repository, PaginatedRepositories } from '../interfaces/models/repository.interface';
import { WorkflowRun } from '../interfaces/models/workflow.interface';
import { MessageComponents } from '../interfaces/discord/discord.interface';
import { DISCORD_COLORS } from '../utils/discord.constants';
import { MESSAGES } from '../utils/messages.constants';
import { DiscordUtils } from '../utils/discord.utils';
import { WorkflowUtils } from '../utils/workflow.utils';
import { BotHealthStatus, ComponentHealth, HealthStatus } from '../interfaces/models/health.interface';

@Injectable()
export class EmbedService extends BaseService implements IEmbedService {
	constructor() {
		super(EmbedService.name);
	}
	createLoadingEmbed(message: string): EmbedBuilder {
		return new EmbedBuilder()
			.setTitle('🤖 Claude Code Bot')
			.setDescription(`🔄 ${message}`)
			.setColor(DISCORD_COLORS.INFO);
	}

	createErrorEmbed(title: string, description: string): EmbedBuilder {
		return new EmbedBuilder().setTitle(`❌ ${title}`).setDescription(description).setColor(DISCORD_COLORS.ERROR);
	}

	createSuccessEmbed(title: string, description: string): EmbedBuilder {
		return new EmbedBuilder().setTitle(`✅ ${title}`).setDescription(description).setColor(DISCORD_COLORS.SUCCESS);
	}

	createWarningEmbed(title: string, description: string): EmbedBuilder {
		return new EmbedBuilder().setTitle(`⚠️ ${title}`).setDescription(description).setColor(DISCORD_COLORS.WARNING);
	}

	createGitHubNotConfiguredEmbed(): EmbedBuilder {
		return this.createErrorEmbed('GitHub Not Configured', MESSAGES.GITHUB_NOT_CONFIGURED);
	}

	createNoRepositoriesEmbed(): EmbedBuilder {
		return this.createWarningEmbed('No Repositories Found', 'No repositories found in your GitHub account.');
	}

	createNoSearchResultsEmbed(query: string): EmbedBuilder {
		return this.createWarningEmbed('No Results Found', `No repositories found matching "${query}".`);
	}

	createRepositorySelectionEmbed(paginatedRepos: PaginatedRepositories, searchQuery: string | null): EmbedBuilder {
		const title = searchQuery ? `🔍 Search Results for "${searchQuery}"` : '🤖 Claude Code Bot';

		const description = searchQuery
			? `Found ${paginatedRepos.totalCount} repositories matching "${searchQuery}". Select one to analyze:`
			: `Found ${paginatedRepos.totalCount} repositories. Select one to analyze:`;

		return new EmbedBuilder()
			.setTitle(title)
			.setDescription(description)
			.setColor(DISCORD_COLORS.PRIMARY)
			.setFooter({
				text: `Page ${paginatedRepos.currentPage} of ${paginatedRepos.totalPages} • Step 1 of 2`
			});
	}

	createRepositorySelectedEmbed(repository: Repository, hasClaudeWorkflow?: boolean): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setTitle('✅ Repository Selected')
			.setDescription(`**${repository.name}**\n\`${repository.fullName}\``)
			.addFields(DiscordUtils.createRepositoryFieldsForEmbed(repository))
			.setColor(DISCORD_COLORS.SUCCESS)
			.setTimestamp();

		if (repository.description) {
			embed.setDescription(`**${repository.name}**\n\`${repository.fullName}\`\n\n*${repository.description}*`);
		}

		if (hasClaudeWorkflow !== undefined) {
			const claudeField = {
				name: '🤖 Claude Code',
				value: hasClaudeWorkflow ? '✅ Available' : '❌ Not configured',
				inline: true
			};
			embed.addFields(claudeField);
		}

		return embed;
	}

	createRepositorySelectionMessage(
		paginatedRepos: PaginatedRepositories,
		searchQuery: string | null
	): MessageComponents {
		const embed = this.createRepositorySelectionEmbed(paginatedRepos, searchQuery);
		const selectRow = DiscordUtils.createSelectMenuRow(paginatedRepos.repositories);

		const components: (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[] = [selectRow];

		return { embed, components };
	}

	createSearchLoadingEmbed(query: string): EmbedBuilder {
		return new EmbedBuilder()
			.setTitle('🔍 Searching Repositories')
			.setDescription(`🔄 Searching for "${query}"...`)
			.setColor(DISCORD_COLORS.INFO);
	}

	createSearchErrorEmbed(query: string): EmbedBuilder {
		return this.createErrorEmbed('Search Error', `Failed to search repositories for "${query}". Please try again.`);
	}

	createPaginationErrorEmbed(): EmbedBuilder {
		return this.createErrorEmbed('Pagination Error', MESSAGES.PAGINATION_ERROR);
	}

	createSessionExpiredEmbed(): EmbedBuilder {
		return this.createErrorEmbed('Session Expired', MESSAGES.SESSION_EXPIRED);
	}

	createWorkflowNotFoundEmbed(owner: string, repo: string): EmbedBuilder {
		return this.createWarningEmbed(
			'Claude Code Not Configured',
			`Repository \`${owner}/${repo}\` does not have Claude Code workflow configured.\n\n` +
				'To enable Claude Code analysis:\n' +
				'1. Add the Claude Code workflow file to `.github/workflows/claude.yml`\n' +
				'2. Configure your `CLAUDE_CODE_OAUTH_TOKEN` secret\n' +
				'3. Push the changes to your repository\n\n' +
				'[Learn more about Claude Code setup](https://docs.anthropic.com/en/docs/claude/github-actions)'
		);
	}

	createWorkflowDispatchedEmbed(
		repository: string,
		branch: string,
		prompt: string,
		workflowRun: WorkflowRun,
		filePaths?: string[]
	): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setTitle('🚀 Claude Code Workflow Started')
			.setDescription(`Claude is analyzing \`${repository}\` on branch \`${branch}\``)
			.addFields([
				{
					name: '📝 Task',
					value: prompt.length > 500 ? `${prompt.substring(0, 500)}...` : prompt,
					inline: false
				},
				{
					name: '🔄 Status',
					value: WorkflowUtils.getWorkflowStatusText(workflowRun.status, workflowRun.conclusion),
					inline: true
				},
				{
					name: '🏃 Run #',
					value: `${workflowRun.run_number}`,
					inline: true
				},
				{
					name: '🕒 Started',
					value: `<t:${Math.floor(new Date(workflowRun.created_at).getTime() / 1000)}:R>`,
					inline: true
				}
			]);

		// Add file context if provided
		if (filePaths && filePaths.length > 0) {
			const fileContext =
				filePaths.length > 5
					? `${filePaths.slice(0, 5).join(', ')} (and ${filePaths.length - 5} more)`
					: filePaths.join(', ');

			embed.addFields([
				{
					name: '📁 File Context',
					value: `\`${fileContext}\``,
					inline: false
				}
			]);
		}

		embed.setColor(DISCORD_COLORS.INFO).setTimestamp();

		return embed;
	}

	createWorkflowStatusEmbed(workflowRun: WorkflowRun, repository: string): EmbedBuilder {
		const statusEmoji = WorkflowUtils.getWorkflowStatusEmoji(workflowRun.status, workflowRun.conclusion);
		const statusText = WorkflowUtils.getWorkflowStatusText(workflowRun.status, workflowRun.conclusion);

		let color = DISCORD_COLORS.INFO;
		if (workflowRun.status === 'completed') {
			color = workflowRun.conclusion === 'success' ? DISCORD_COLORS.SUCCESS : DISCORD_COLORS.ERROR;
		}

		const embed = new EmbedBuilder()
			.setTitle(`${statusEmoji} Workflow Status`)
			.setDescription(`**${repository}** - Run #${workflowRun.run_number}`)
			.addFields([
				{
					name: '🔄 Status',
					value: statusText,
					inline: true
				},
				{
					name: '🌿 Branch',
					value: workflowRun.head_branch,
					inline: true
				},
				{
					name: '🕒 Started',
					value: `<t:${Math.floor(new Date(workflowRun.created_at).getTime() / 1000)}:R>`,
					inline: true
				}
			])
			.setColor(color)
			.setTimestamp()
			.setFooter({ text: `Run ID: ${workflowRun.id}` });

		if (workflowRun.status === 'completed' && workflowRun.updated_at) {
			embed.addFields({
				name: '✅ Completed',
				value: `<t:${Math.floor(new Date(workflowRun.updated_at).getTime() / 1000)}:R>`,
				inline: true
			});
		}

		return embed;
	}

	createWorkflowCompletedEmbed(repository: string, workflowRun: WorkflowRun, startTime: Date): EmbedBuilder {
		const statusEmoji = WorkflowUtils.getWorkflowStatusEmoji(workflowRun.status, workflowRun.conclusion);
		const statusText = WorkflowUtils.getWorkflowStatusText(workflowRun.status, workflowRun.conclusion);

		let color = DISCORD_COLORS.SUCCESS;
		if (workflowRun.conclusion !== 'success') {
			color = workflowRun.conclusion === 'failure' ? DISCORD_COLORS.ERROR : DISCORD_COLORS.WARNING;
		}

		const duration = workflowRun.updated_at
			? Math.round((new Date(workflowRun.updated_at).getTime() - startTime.getTime()) / 1000)
			: null;

		const embed = new EmbedBuilder()
			.setTitle(`${statusEmoji} Workflow Completed`)
			.setDescription(`**${repository}** - Run #${workflowRun.run_number}`)
			.addFields([
				{
					name: '🔄 Status',
					value: statusText,
					inline: true
				},
				{
					name: '🌿 Branch',
					value: workflowRun.head_branch,
					inline: true
				},
				{
					name: '⏱️ Duration',
					value: duration ? `${duration}s` : 'Unknown',
					inline: true
				}
			])
			.setColor(color)
			.setTimestamp()
			.setFooter({ text: `Run ID: ${workflowRun.id}` });

		if (workflowRun.conclusion === 'success') {
			embed.addFields({
				name: '🎉 Result',
				value: 'Task completed successfully! Check for any pull requests that may have been created.',
				inline: false
			});
		} else if (workflowRun.conclusion === 'failure') {
			embed.addFields({
				name: '❌ Error',
				value: 'Workflow failed. Click "View on GitHub" to see the error details.',
				inline: false
			});
		}

		return embed;
	}

	createFileSelectionEmbed(repository: Repository, fileTree: any): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setTitle('📁 Select Files/Folders for Context')
			.setDescription(
				`Choose files or folders to include as context for Claude's analysis of **${repository.name}**.\n\n` +
					`Select specific files/folders that are relevant to your task, or skip to enter file paths manually in the next step.`
			)
			.addFields([
				{
					name: '📊 Repository Info',
					value:
						`**Files Found:** ${fileTree.items.length}${fileTree.truncated ? ` (showing first ${fileTree.items.length} of ${fileTree.totalItems})` : ''}\n` +
						`**Language:** ${repository.language || 'Unknown'}\n` +
						`**Updated:** ${new Date(repository.updatedAt).toLocaleDateString()}`,
					inline: false
				},
				{
					name: '💡 Tips',
					value:
						'• ⭐ indicates commonly important files/folders\n' +
						'• You can select up to 25 items\n' +
						'• Skip if you want to enter paths manually\n' +
						'• Selected paths will be pre-filled in the next step',
					inline: false
				}
			])
			.setColor(DISCORD_COLORS.PRIMARY)
			.setFooter({ text: 'Choose relevant files and folders for better context' });

		return embed;
	}

	createPromptReadyEmbed(repository: Repository, selectedPaths: string[]): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setTitle('✅ Ready for Analysis Prompt')
			.setDescription(
				`File selection complete for **${repository.name}**. Click the button below to enter your analysis prompt.`
			)
			.addFields([
				{
					name: '📁 Selected Files/Folders',
					value:
						selectedPaths.length > 0
							? `\`${selectedPaths.slice(0, 10).join('`, `')}\`${selectedPaths.length > 10 ? `\n*...and ${selectedPaths.length - 10} more*` : ''}`
							: '*No files selected - you can add them manually in the prompt*',
					inline: false
				},
				{
					name: '📝 Next Step',
					value: 'Click **"Enter Analysis Prompt"** to specify what you want Claude to do with these files.',
					inline: false
				}
			])
			.setColor(DISCORD_COLORS.SUCCESS);

		return embed;
	}

	/**
	 * Create health check embed with component status
	 */
	createHealthCheckEmbed(healthStatus: BotHealthStatus): EmbedBuilder {
		// Determine overall color based on worst status
		const color = this.getHealthColor(healthStatus.overallStatus);

		const embed = new EmbedBuilder()
			.setTitle('🏥 Bot Health Check')
			.setDescription(this.getOverallStatusMessage(healthStatus.overallStatus))
			.setColor(color)
			.setTimestamp();

		// Add fields for each component
		embed.addFields([
			{
				name: this.formatComponentStatus('Bot Runtime', healthStatus.runtime),
				value: this.formatComponentDetails(healthStatus.runtime),
				inline: true
			},
			{
				name: this.formatComponentStatus('GitHub Integration', healthStatus.github),
				value: this.formatComponentDetails(healthStatus.github),
				inline: true
			},
			{
				name: this.formatComponentStatus('Session Health', healthStatus.sessions),
				value: this.formatComponentDetails(healthStatus.sessions),
				inline: true
			},
			{
				name: this.formatComponentStatus('Image Service', healthStatus.imageService),
				value: this.formatComponentDetails(healthStatus.imageService),
				inline: true
			}
		]);

		const cacheStatus = healthStatus.cached ? '(Cached)' : '(Fresh check)';
		embed.setFooter({
			text: `Last checked ${cacheStatus} • Refreshes every 5 minutes`
		});

		return embed;
	}

	/**
	 * Get the color for a health status
	 */
	private getHealthColor(status: HealthStatus): number {
		switch (status) {
			case 'operational':
				return Colors.Green;
			case 'degraded':
				return Colors.Yellow;
			case 'critical':
				return Colors.Red;
			case 'unavailable':
				return Colors.Grey;
			default:
				return Colors.Grey;
		}
	}

	/**
	 * Get the overall status message
	 */
	private getOverallStatusMessage(status: HealthStatus): string {
		switch (status) {
			case 'operational':
				return '✅ All systems operational';
			case 'degraded':
				return '⚠️ Some systems are experiencing issues';
			case 'critical':
				return '🔴 Critical issues detected';
			case 'unavailable':
				return '⚪ Systems unavailable';
			default:
				return '❓ Status unknown';
		}
	}

	/**
	 * Format component status with icon
	 */
	private formatComponentStatus(name: string, component: ComponentHealth): string {
		const icon = this.getStatusIcon(component.status);
		return `${icon} ${name}`;
	}

	/**
	 * Get status icon
	 */
	private getStatusIcon(status: HealthStatus): string {
		switch (status) {
			case 'operational':
				return '🟢';
			case 'degraded':
				return '🟡';
			case 'critical':
				return '🔴';
			case 'unavailable':
				return '⚪';
			default:
				return '⚪';
		}
	}

	/**
	 * Format component details
	 */
	private formatComponentDetails(component: ComponentHealth): string {
		const lines: string[] = [];

		// Add main message
		lines.push(`**Status:** ${component.message}`);

		// Add response time if available
		if (component.responseTime !== undefined) {
			lines.push(`**Response:** ${component.responseTime}ms`);
		}

		// Add specific details based on what's available
		if (component.details) {
			const details = component.details;

			// Memory info
			if (details.memory) {
				lines.push(`**Memory:** ${details.memory.used}MB / ${details.memory.total}MB (${details.memory.percentage}%)`);
			}

			// Uptime
			if (details.uptime !== undefined) {
				const hours = Math.floor(details.uptime / 3600);
				const minutes = Math.floor((details.uptime % 3600) / 60);
				lines.push(`**Uptime:** ${hours}h ${minutes}m`);
			}

			// Rate limit
			if (details.rateLimit) {
				lines.push(`**Rate Limit:** ${details.rateLimit.remaining}/${details.rateLimit.limit}`);
			}

			// Active sessions
			if (details.activeSessions !== undefined) {
				lines.push(`**Sessions:** ${details.activeSessions}`);
			}

			// Version
			if (details.version) {
				lines.push(`**Version:** ${details.version}`);
			}
		}

		// Add error if present
		if (component.error) {
			lines.push(`**Error:** ${component.error}`);
		}

		return lines.join('\n');
	}
}
