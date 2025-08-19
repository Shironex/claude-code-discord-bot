import { Injectable } from '@nestjs/common';
import { Context, StringSelect, StringSelectContext } from 'necord';
import {
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle
} from 'discord.js';
import { BaseService } from '../../services/base/base.service';
import { Repository } from '../../interfaces/models/repository.interface';
import { SessionService } from '../../services/session.service';
import { FileExplorerService } from '../../services/file-explorer.service';
import { EmbedService } from '../../services/embed.service';
import { CUSTOM_IDS } from '../../utils/discord.constants';
import { MESSAGES } from '../../utils/messages.constants';
import { DiscordUtils } from '../../utils/discord.utils';
import { FileTreeUtils } from '../../utils/file-tree.utils';
import { ErrorCategorizer } from '../../utils/error.types';

@Injectable()
export class RepositorySelectHandler extends BaseService {
	constructor(
		private readonly sessionService: SessionService,
		private readonly fileExplorerService: FileExplorerService,
		private readonly embedService: EmbedService
	) {
		super(RepositorySelectHandler.name);
	}

	@StringSelect(CUSTOM_IDS.REPO_SELECT)
	public async onRepoSelect(@Context() [interaction]: StringSelectContext) {
		// Only handle custom IDs that match exactly
		if (interaction.customId !== CUSTOM_IDS.REPO_SELECT) {
			return;
		}

		const userId = interaction.user.id;
		const session = this.sessionService.getSession(userId);

		if (!session || !session.paginatedData) {
			return interaction.reply({
				content: MESSAGES.SESSION_EXPIRED,
				flags: [MessageFlags.Ephemeral]
			});
		}

		const selectedRepoFullName = interaction.values[0];
		const selectedRepo = session.paginatedData.repositories.find(
			(repo: Repository) => repo.fullName === selectedRepoFullName
		);

		if (!selectedRepo) {
			return interaction.reply({
				content: MESSAGES.REPOSITORY_NOT_FOUND,
				flags: [MessageFlags.Ephemeral]
			});
		}

		// Update session with selected repository
		this.sessionService.updateSession(userId, {
			repository: selectedRepo,
			action: 'file_selection'
		});

		this.logger.log(`Repository selected: ${selectedRepo.fullName} by user: ${interaction.user.tag} (${userId})`);

		// Show file selection interface
		await this.showFileSelection(interaction, selectedRepo, userId);
	}

	private async showFileSelection(interaction: StringSelectContext[0], repository: Repository, userId: string) {
		try {
			const [owner, repo] = repository.fullName.split('/');

			// Get file tree from GitHub
			const fileTree = await this.fileExplorerService.getFileTree(owner, repo);

			if (fileTree.items.length === 0) {
				// No files found, skip to prompt modal by showing button
				return await this.showPromptReadyMessage(interaction, repository, [], userId);
			}

			// Create file selection message
			const embed = this.embedService.createFileSelectionEmbed(repository, fileTree);
			const components = DiscordUtils.createFileSelectionComponents(fileTree.items);

			await interaction.reply({
				embeds: [embed],
				components
			});

			this.logger.log(
				`File selection interface shown for ${repository.fullName} (${fileTree.items.length} items)`
			);
		} catch (error: any) {
			// Categorize the error for proper handling and logging
			const categorizedError = ErrorCategorizer.categorizeError(error);
			const logLevel = ErrorCategorizer.getLogLevel(categorizedError.category);
			
			// Log with appropriate level
			if (logLevel === 'error') {
				this.logger.error(`Failed to show file selection for ${repository.fullName} (${categorizedError.category}): ${categorizedError.message}`, error);
			} else if (logLevel === 'warn') {
				this.logger.warn(`File selection warning for ${repository.fullName} (${categorizedError.category}): ${categorizedError.message}`);
			} else {
				this.logger.log(`File selection info for ${repository.fullName} (${categorizedError.category}): ${categorizedError.message}`);
			}

			// For certain error types, show error message; for others, fallback to prompt ready
			if (categorizedError.category === 'rate_limit' || categorizedError.category === 'authentication' || categorizedError.category === 'permission') {
				await interaction.reply({
					content: categorizedError.userMessage,
					flags: [MessageFlags.Ephemeral]
				});
			} else {
				// Fallback to prompt ready message for other errors (like network issues)
				await this.showPromptReadyMessage(interaction, repository, [], userId);
			}
		}
	}

	private async showPromptReadyMessage(
		interaction: StringSelectContext[0],
		repository: Repository,
		selectedPaths: string[],
		userId: string
	) {
		// Store selected paths in session for later use in modal
		this.sessionService.updateSession(userId, {
			selectedFilePaths: selectedPaths,
			action: 'claude_prompt_input'
		});

		// Create button to open modal
		const openModalButton = new ButtonBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_PROMPT_MODAL + '_trigger')
			.setLabel('📝 Enter Analysis Prompt')
			.setStyle(ButtonStyle.Primary);

		const skipButton = new ButtonBuilder()
			.setCustomId(CUSTOM_IDS.SKIP_FILE_SELECTION)
			.setLabel('Skip File Selection')
			.setStyle(ButtonStyle.Secondary);

		const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(openModalButton, skipButton);

		const embed = this.embedService.createPromptReadyEmbed(repository, selectedPaths);

		await interaction.reply({
			embeds: [embed],
			components: [buttonRow]
		});
	}
}
