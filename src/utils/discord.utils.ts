import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Repository } from '../services/github.service';
import { PaginationInfo } from '../interfaces/discord.interface';
import { CUSTOM_IDS, LANGUAGE_EMOJIS } from './constants';

export class DiscordUtils {
	static createRepositorySelectMenu(repositories: Repository[]): StringSelectMenuBuilder {
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId(CUSTOM_IDS.REPO_SELECT)
			.setPlaceholder('🔍 Choose a repository...');

		repositories.forEach(repo => {
			selectMenu.addOptions({
				label: repo.name,
				value: repo.fullName,
				description: this.formatRepositoryDescription(repo),
				emoji: this.getLanguageEmoji(repo.language)
			});
		});

		return selectMenu;
	}

	static createPaginationButtons(pagination: PaginationInfo): ActionRowBuilder<ButtonBuilder> {
		const prevButton = new ButtonBuilder()
			.setCustomId(CUSTOM_IDS.REPO_PREV)
			.setLabel('Previous')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('⬅️')
			.setDisabled(!pagination.hasPreviousPage);

		const nextButton = new ButtonBuilder()
			.setCustomId(CUSTOM_IDS.REPO_NEXT)
			.setLabel('Next')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('➡️')
			.setDisabled(!pagination.hasNextPage);

		const pageButton = new ButtonBuilder()
			.setCustomId(CUSTOM_IDS.REPO_PAGE_INFO)
			.setLabel(`${pagination.currentPage}/${pagination.totalPages}`)
			.setStyle(ButtonStyle.Primary)
			.setDisabled(true);

		return new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, pageButton, nextButton);
	}

	static createSelectMenuRow(repositories: Repository[]): ActionRowBuilder<StringSelectMenuBuilder> {
		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			this.createRepositorySelectMenu(repositories)
		);
	}

	static formatRepositoryDescription(repo: Repository): string {
		const stars = repo.stargazersCount > 0 ? `⭐ ${repo.stargazersCount}` : '';
		const language = repo.language ? repo.language : 'Unknown';
		const updatedAt = new Date(repo.updatedAt).toLocaleDateString();
		const privacy = repo.private ? '🔒' : '🔓';

		return `${privacy} ${stars} | ${language} | Updated: ${updatedAt}`;
	}

	static getLanguageEmoji(language: string | null): string {
		return LANGUAGE_EMOJIS[language || ''] || '📁';
	}

	static createRepositoryFieldsForEmbed(repo: Repository) {
		return [
			{
				name: '📊 Stats',
				value: `⭐ ${repo.stargazersCount} stars\n🍴 ${repo.forksCount} forks`,
				inline: true
			},
			{
				name: '💻 Language',
				value: repo.language || 'Unknown',
				inline: true
			},
			{
				name: '🔗 Link',
				value: `[View on GitHub](${repo.htmlUrl})`,
				inline: true
			}
		];
	}

	static createClaudeAnalyzeButton(): ButtonBuilder {
		return new ButtonBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_ANALYZE)
			.setLabel('Analyze with Claude')
			.setStyle(ButtonStyle.Primary)
			.setEmoji('🤖');
	}

	static createWorkflowStatusButton(): ButtonBuilder {
		return new ButtonBuilder()
			.setCustomId(CUSTOM_IDS.WORKFLOW_STATUS)
			.setLabel('Check Status')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('🔄');
	}

	static createViewWorkflowButton(workflowUrl: string): ButtonBuilder {
		return new ButtonBuilder()
			.setURL(workflowUrl)
			.setLabel('View on GitHub')
			.setStyle(ButtonStyle.Link)
			.setEmoji('🔗');
	}

	static createCancelButton(): ButtonBuilder {
		return new ButtonBuilder()
			.setCustomId(CUSTOM_IDS.CANCEL)
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Danger)
			.setEmoji('❌');
	}
}
