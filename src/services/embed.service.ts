import { Injectable } from '@nestjs/common';
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder } from 'discord.js';
import { Repository, PaginatedRepositories } from './github.service';
import { WorkflowRun } from '../interfaces/workflow.interface';
import { MessageComponents } from '../interfaces/discord.interface';
import { DISCORD_COLORS, MESSAGES } from '../utils/constants';
import { DiscordUtils } from '../utils/discord.utils';

@Injectable()
export class EmbedService {
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

		// Add pagination buttons if there are multiple pages
		if (paginatedRepos.totalPages > 1) {
			const paginationRow = DiscordUtils.createPaginationButtons({
				currentPage: paginatedRepos.currentPage,
				totalPages: paginatedRepos.totalPages,
				hasNextPage: paginatedRepos.hasNextPage,
				hasPreviousPage: paginatedRepos.hasPreviousPage,
				totalCount: paginatedRepos.totalCount
			});
			components.push(paginationRow);
		}

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
		workflowRun: WorkflowRun
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
					value: this.getWorkflowStatusText(workflowRun.status, workflowRun.conclusion),
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
			])
			.setColor(DISCORD_COLORS.INFO)
			.setTimestamp();

		return embed;
	}

	createWorkflowStatusEmbed(workflowRun: WorkflowRun, repository: string): EmbedBuilder {
		const statusEmoji = this.getWorkflowStatusEmoji(workflowRun.status, workflowRun.conclusion);
		const statusText = this.getWorkflowStatusText(workflowRun.status, workflowRun.conclusion);

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

	private getWorkflowStatusEmoji(status: string, conclusion: string | null): string {
		if (status === 'completed') {
			switch (conclusion) {
				case 'success':
					return '✅';
				case 'failure':
					return '❌';
				case 'cancelled':
					return '🚫';
				case 'skipped':
					return '⏭️';
				default:
					return '❓';
			}
		}

		switch (status) {
			case 'queued':
				return '⏳';
			case 'in_progress':
				return '🔄';
			case 'waiting':
				return '⏸️';
			default:
				return '❓';
		}
	}

	private getWorkflowStatusText(status: string, conclusion: string | null): string {
		if (status === 'completed') {
			switch (conclusion) {
				case 'success':
					return 'Completed Successfully';
				case 'failure':
					return 'Failed';
				case 'cancelled':
					return 'Cancelled';
				case 'skipped':
					return 'Skipped';
				default:
					return 'Completed';
			}
		}

		switch (status) {
			case 'queued':
				return 'Queued';
			case 'in_progress':
				return 'Running';
			case 'waiting':
				return 'Waiting';
			default:
				return 'Unknown';
		}
	}

	createWorkflowCompletedEmbed(repository: string, workflowRun: WorkflowRun, startTime: Date): EmbedBuilder {
		const statusEmoji = this.getWorkflowStatusEmoji(workflowRun.status, workflowRun.conclusion);
		const statusText = this.getWorkflowStatusText(workflowRun.status, workflowRun.conclusion);

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
}
