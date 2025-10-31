import {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	Colors
} from 'discord.js';
import { Repository } from '../interfaces/models/repository.interface';
import { FileTreeItem } from '../services/file-explorer.service';
import { CUSTOM_IDS } from './discord.constants';
import { LANGUAGE_EMOJIS } from './github.constants';
import { FileTreeUtils } from './file-tree.utils';

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

	static createRefreshHealthButton(): ButtonBuilder {
		return new ButtonBuilder()
			.setCustomId(CUSTOM_IDS.REFRESH_HEALTH)
			.setLabel('Refresh')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('🔄');
	}

	static createFileSelectMenu(fileItems: ReadonlyArray<FileTreeItem>): StringSelectMenuBuilder {
		// Sort items for better display
		const sortedItems = FileTreeUtils.sortItemsForDisplay(fileItems);

		// Limit to 25 items due to Discord's select menu constraint
		const limitedItems = sortedItems.slice(0, 25);

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId(CUSTOM_IDS.FILE_PATH_SELECT)
			.setPlaceholder('📁 Choose files/folders for context...')
			.setMinValues(0)
			.setMaxValues(limitedItems.length); // Use limited items length

		limitedItems.forEach(item => {
			const emoji = FileTreeUtils.getFileEmoji(item);
			const description = FileTreeUtils.createItemDescription(item);

			selectMenu.addOptions({
				label: item.name.length > 100 ? item.name.substring(0, 97) + '...' : item.name,
				value: item.path,
				description: description,
				emoji: emoji
			});
		});

		return selectMenu;
	}

	static createFileSelectionComponents(
		fileItems: ReadonlyArray<FileTreeItem>
	): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
		const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];

		// Add select menu if we have files
		if (fileItems.length > 0) {
			const selectMenu = this.createFileSelectMenu(fileItems);
			const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
			components.push(selectRow);
		}

		// Add skip button
		const skipButton = new ButtonBuilder()
			.setCustomId(CUSTOM_IDS.SKIP_FILE_SELECTION)
			.setLabel('Skip File Selection')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('⏭️');

		const cancelButton = this.createCancelButton();

		const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(skipButton, cancelButton);
		components.push(buttonRow);

		return components;
	}

	static createSkipFileSelectionButton(): ButtonBuilder {
		return new ButtonBuilder()
			.setCustomId(CUSTOM_IDS.SKIP_FILE_SELECTION)
			.setLabel('Skip File Selection')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('⏭️');
	}

	static createAddImagesButton(): ButtonBuilder {
		return new ButtonBuilder()
			.setCustomId(CUSTOM_IDS.ADD_IMAGES)
			.setLabel('Add Images')
			.setStyle(ButtonStyle.Primary)
			.setEmoji('🖼️');
	}

	static createSkipImagesButton(): ButtonBuilder {
		return new ButtonBuilder()
			.setCustomId(CUSTOM_IDS.SKIP_IMAGES)
			.setLabel('Skip Images')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('⏭️');
	}

	static createImageUploadComponents(): ActionRowBuilder<ButtonBuilder>[] {
		const addImagesButton = this.createAddImagesButton();
		const skipImagesButton = this.createSkipImagesButton();
		const cancelButton = this.createCancelButton();

		const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			addImagesButton,
			skipImagesButton,
			cancelButton
		);

		return [buttonRow];
	}
}

/**
 * Create image upload prompt embed and components
 */
export function createImageUploadPrompt(repositoryName: string): {
	embed: EmbedBuilder;
	components: ActionRowBuilder<ButtonBuilder>[];
} {
	const embed = new EmbedBuilder()
		.setTitle('🖼️ Add Images to Context')
		.setColor(Colors.Blue)
		.setDescription(
			`**Repository:** ${repositoryName}\n\n` +
				'Would you like to add images to provide additional context for your Claude Code analysis?\n\n' +
				'**If you choose "Add Images":**\n' +
				'• Upload images in your next message\n' +
				'• Supported formats: PNG, JPG, GIF, WebP, BMP, TIFF\n' +
				'• Max file size: 10MB per image\n' +
				'• Up to 10 images at once\n' +
				'• Images will be processed and URLs will be included in your prompt'
		)
		.addFields([
			{
				name: '💡 Use Cases',
				value: '• Screenshots of UI/errors\n• Diagrams or mockups\n• Documentation images\n• Design references',
				inline: false
			}
		])
		.setFooter({
			text: 'Images will be temporarily stored and automatically cleaned up after analysis'
		})
		.setTimestamp();

	const components = DiscordUtils.createImageUploadComponents();

	return { embed, components };
}
