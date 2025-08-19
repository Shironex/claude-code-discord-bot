import { Injectable } from '@nestjs/common';
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder } from 'discord.js';
import { Repository, PaginatedRepositories } from './github.service';
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
		return new EmbedBuilder()
			.setTitle(`❌ ${title}`)
			.setDescription(description)
			.setColor(DISCORD_COLORS.ERROR);
	}

	createSuccessEmbed(title: string, description: string): EmbedBuilder {
		return new EmbedBuilder()
			.setTitle(`✅ ${title}`)
			.setDescription(description)
			.setColor(DISCORD_COLORS.SUCCESS);
	}

	createWarningEmbed(title: string, description: string): EmbedBuilder {
		return new EmbedBuilder()
			.setTitle(`⚠️ ${title}`)
			.setDescription(description)
			.setColor(DISCORD_COLORS.WARNING);
	}

	createGitHubNotConfiguredEmbed(): EmbedBuilder {
		return this.createErrorEmbed(
			'GitHub Not Configured',
			MESSAGES.GITHUB_NOT_CONFIGURED
		);
	}

	createNoRepositoriesEmbed(): EmbedBuilder {
		return this.createWarningEmbed(
			'No Repositories Found',
			'No repositories found in your GitHub account.'
		);
	}

	createNoSearchResultsEmbed(query: string): EmbedBuilder {
		return this.createWarningEmbed(
			'No Results Found',
			`No repositories found matching "${query}".`
		);
	}

	createRepositorySelectionEmbed(
		paginatedRepos: PaginatedRepositories, 
		searchQuery: string | null
	): EmbedBuilder {
		const title = searchQuery 
			? `🔍 Search Results for "${searchQuery}"` 
			: '🤖 Claude Code Bot';
		
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
			embed.setDescription(
				`**${repository.name}**\n\`${repository.fullName}\`\n\n*${repository.description}*`
			);
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
		return this.createErrorEmbed(
			'Search Error',
			`Failed to search repositories for "${query}". Please try again.`
		);
	}

	createPaginationErrorEmbed(): EmbedBuilder {
		return this.createErrorEmbed(
			'Pagination Error',
			MESSAGES.PAGINATION_ERROR
		);
	}

	createSessionExpiredEmbed(): EmbedBuilder {
		return this.createErrorEmbed(
			'Session Expired',
			MESSAGES.SESSION_EXPIRED
		);
	}
}