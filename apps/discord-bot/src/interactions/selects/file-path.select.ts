import { Injectable } from '@nestjs/common';
import { Context, StringSelect, StringSelectContext } from 'necord';
import { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { BaseService } from '../../services/base/base.service';
import { SessionService } from '../../services/session.service';
import { FileExplorerService } from '../../services/file-explorer.service';
import { CUSTOM_IDS } from '../../utils/discord.constants';
import { MESSAGES } from '../../utils/messages.constants';
import { FileTreeUtils } from '../../utils/file-tree.utils';
import { ErrorCategorizer } from '../../utils/error.types';

@Injectable()
export class FilePathSelectHandler extends BaseService {
	constructor(
		private readonly sessionService: SessionService,
		private readonly fileExplorerService: FileExplorerService
	) {
		super(FilePathSelectHandler.name);
	}

	@StringSelect(CUSTOM_IDS.FILE_PATH_SELECT)
	public async onFilePathSelect(@Context() [interaction]: StringSelectContext) {
		const userId = interaction.user.id;
		const session = this.sessionService.getSession(userId);

		if (!session || !session.repository) {
			return interaction.reply({
				content: MESSAGES.SESSION_EXPIRED,
				flags: [MessageFlags.Ephemeral]
			});
		}

		try {
			// Get selected file paths from the interaction
			const selectedPaths = interaction.values;

			this.logger.log(`File path selection: ${selectedPaths.length} paths selected by ${interaction.user.tag}`);
			this.logger.log(`Selected paths: ${selectedPaths.join(', ')}`);

			// Update session with selected file paths and move to image selection step
			this.sessionService.updateSession(userId, {
				selectedFilePaths: selectedPaths,
				action: 'claude_image_selection'
			});

			// Import DiscordUtils dynamically to avoid circular dependencies
			const { createImageUploadPrompt } = await import('../../utils/discord.utils');

			// Create embed and components for image upload step
			const { embed, components } = createImageUploadPrompt(session.repository.name);

			await interaction.update({ embeds: [embed], components });

			this.logger.log(
				`Image upload prompt displayed for ${session.repository.fullName} with ${selectedPaths.length} pre-selected files`
			);
		} catch (error: any) {
			// Categorize the error for proper handling and logging
			const categorizedError = ErrorCategorizer.categorizeError(error);
			const logLevel = ErrorCategorizer.getLogLevel(categorizedError.category);

			// Log with appropriate level
			if (logLevel === 'error') {
				this.logger.error(
					`Failed to handle file path selection (${categorizedError.category}): ${categorizedError.message}`,
					error
				);
			} else if (logLevel === 'warn') {
				this.logger.warn(
					`File path selection warning (${categorizedError.category}): ${categorizedError.message}`
				);
			} else {
				this.logger.log(`File path selection info (${categorizedError.category}): ${categorizedError.message}`);
			}

			return interaction.reply({
				content: 'Failed to show image upload step. Please try again.',
				flags: [MessageFlags.Ephemeral]
			});
		}
	}

	private async createPromptModal(selectedPaths: string[]): Promise<ModalBuilder> {
		const modal = new ModalBuilder().setCustomId(CUSTOM_IDS.CLAUDE_PROMPT_MODAL).setTitle('Claude Code Analysis');

		// Prompt input (required)
		const promptInput = new TextInputBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_PROMPT_INPUT)
			.setLabel('Analysis Prompt')
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder('Describe what you want Claude to analyze or do...')
			.setRequired(true)
			.setMinLength(10)
			.setMaxLength(2000);

		// Branch input (optional)
		const branchInput = new TextInputBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_BRANCH_INPUT)
			.setLabel('Target Branch (optional)')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('main')
			.setRequired(false)
			.setValue('main')
			.setMaxLength(100);

		// File context input (optional, pre-filled with selections)
		const fileContextInput = new TextInputBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_FILE_CONTEXT_INPUT)
			.setLabel('File Context (optional - edit as needed)')
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder('src/services/, README.md (comma-separated paths)')
			.setRequired(false)
			.setMaxLength(2000);

		// Pre-fill with selected paths if any
		if (selectedPaths && selectedPaths.length > 0) {
			const pathsString = FileTreeUtils.formatFilePathsString(selectedPaths);
			fileContextInput.setValue(pathsString);
		}

		const promptRow = new ActionRowBuilder<TextInputBuilder>().addComponents(promptInput);
		const branchRow = new ActionRowBuilder<TextInputBuilder>().addComponents(branchInput);
		const fileContextRow = new ActionRowBuilder<TextInputBuilder>().addComponents(fileContextInput);

		modal.addComponents(promptRow, branchRow, fileContextRow);

		return modal;
	}
}
