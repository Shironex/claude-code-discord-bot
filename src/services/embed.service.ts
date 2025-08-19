import { Injectable } from '@nestjs/common';
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder } from 'discord.js';
import { Repository, PaginatedRepositories } from './github.service';
import { ContainerExecutionResult, RepositoryCloneInfo } from '../interfaces/container.interface';
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

	createRepositorySelectedEmbed(repository: Repository): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setTitle('✅ Repository Selected')
			.setDescription(`**${repository.name}**\n\`${repository.fullName}\``)
			.addFields(DiscordUtils.createRepositoryFieldsForEmbed(repository))
			.setColor(DISCORD_COLORS.SUCCESS)
			.setTimestamp();

		if (repository.description) {
			embed.setDescription(`**${repository.name}**\n\`${repository.fullName}\`\n\n*${repository.description}*`);
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

	// Container-related embeds
	createContainerStartingEmbed(repository: Repository): EmbedBuilder {
		return new EmbedBuilder()
			.setTitle('🐳 Starting Container')
			.setDescription(`🔄 Starting Docker container to clone repository...\n\n**Repository:** \`${repository.fullName}\``)
			.addFields([
				{ name: '📊 Language', value: repository.language || 'Unknown', inline: true },
				{ name: '⭐ Stars', value: repository.stargazersCount.toString(), inline: true },
				{ name: '🔒 Visibility', value: repository.private ? 'Private' : 'Public', inline: true }
			])
			.setColor(DISCORD_COLORS.INFO)
			.setFooter({ text: 'This may take a few moments...' })
			.setTimestamp();
	}

	createContainerExecutionEmbed(result: ContainerExecutionResult): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setTimestamp()
			.addFields([
				{ name: '🕒 Execution Time', value: `${(result.executionTime / 1000).toFixed(2)}s`, inline: true },
				{ name: '🆔 Container ID', value: `\`${result.containerId.substring(0, 12)}\``, inline: true }
			]);

		if (result.success) {
			embed
				.setTitle('✅ Repository Cloned Successfully')
				.setColor(DISCORD_COLORS.SUCCESS)
				.setDescription('🎉 Repository has been successfully cloned and is ready for analysis!');

			if (result.repositoryInfo) {
				embed.addFields([
					{ name: '📁 Repository Size', value: result.repositoryInfo.size, inline: true },
					{ name: '📄 File Count', value: result.repositoryInfo.fileCount.toString(), inline: true },
					{ name: '🌿 Current Branch', value: result.repositoryInfo.currentBranch, inline: true },
					{ name: '📝 Latest Commit', value: result.repositoryInfo.latestCommit, inline: false },
					{ name: '💬 Commit Message', value: result.repositoryInfo.commitMessage.length > 100 
						? result.repositoryInfo.commitMessage.substring(0, 97) + '...' 
						: result.repositoryInfo.commitMessage, inline: false }
				]);
			}
		} else {
			embed
				.setTitle('❌ Repository Clone Failed')
				.setColor(DISCORD_COLORS.ERROR)
				.setDescription(`🚫 Failed to clone repository\n\n**Error:** \`${result.error}\``);
		}

		return embed;
	}

	createContainerLogsEmbed(result: ContainerExecutionResult): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setTitle('📋 Container Execution Logs')
			.setColor(result.success ? DISCORD_COLORS.INFO : DISCORD_COLORS.ERROR)
			.setTimestamp();

		if (result.logs.length > 0) {
			// Take last 10 log entries to avoid Discord's field limit
			const recentLogs = result.logs.slice(-10);
			const logsText = recentLogs.join('\n');
			
			// Discord embed description has a 4096 character limit
			const truncatedLogs = logsText.length > 4000 
				? logsText.substring(0, 3997) + '...' 
				: logsText;

			embed.setDescription(`\`\`\`\n${truncatedLogs}\n\`\`\``);
		} else {
			embed.setDescription('No logs available.');
		}

		return embed;
	}

	createDockerNotAvailableEmbed(): EmbedBuilder {
		return this.createErrorEmbed(
			'Docker Not Available',
			'Docker is not available or not running. Please ensure Docker is installed and running on the host system.'
		);
	}

	createContainerTimeoutEmbed(repository: Repository): EmbedBuilder {
		return this.createErrorEmbed(
			'Container Execution Timeout',
			`The container execution for \`${repository.fullName}\` has timed out. This may indicate:\n\n` +
			'• Repository is too large\n' +
			'• Network connectivity issues\n' +
			'• GitHub API rate limiting\n\n' +
			'Please try again with a smaller repository or check your network connection.'
		);
	}
}
