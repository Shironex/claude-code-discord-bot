import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Repository } from '../interfaces/models/repository.interface';
import { CUSTOM_IDS } from './discord.constants';
import { LANGUAGE_EMOJIS } from './github.constants';

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
