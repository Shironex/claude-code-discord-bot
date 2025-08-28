import { Injectable } from '@nestjs/common';
import { Context, Button, ButtonContext } from 'necord';
import { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { BaseService } from '../../services/base/base.service';
import { SessionService } from '../../services/session.service';
import { CUSTOM_IDS } from '../../utils/discord.constants';
import { MESSAGES } from '../../utils/messages.constants';
import { FileTreeUtils } from '../../utils/file-tree.utils';

@Injectable()
export class SkipFileSelectionButtonHandler extends BaseService {
	constructor(private readonly sessionService: SessionService) {
		super(SkipFileSelectionButtonHandler.name);
	}

	@Button(CUSTOM_IDS.SKIP_FILE_SELECTION)
	public async onSkipFileSelection(@Context() [interaction]: ButtonContext) {
		const userId = interaction.user.id;
		const session = this.sessionService.getSession(userId);

		if (!session || !session.repository) {
			return interaction.reply({
				content: MESSAGES.SESSION_EXPIRED,
				flags: [MessageFlags.Ephemeral]
			});
		}

		try {
			this.logger.log(`User ${interaction.user.tag} (${userId}) skipped file selection`);

			// Clear any previously selected file paths and move to image upload step
			this.sessionService.updateSession(userId, {
				selectedFilePaths: [],
				action: 'claude_image_selection'
			});

			// Import EmbedService and DiscordUtils dynamically to avoid circular dependencies
			const { EmbedService } = await import('../../services/embed.service');
			const { createImageUploadPrompt } = await import('../../utils/discord.utils');

			// Create embed and components for image upload step
			const { embed, components } = createImageUploadPrompt(session.repository.name);

			await interaction.update({ embeds: [embed], components });

			this.logger.log(`Image upload prompt displayed for ${session.repository.fullName}`);
		} catch (error) {
			this.logger.error(`Failed to handle skip file selection: ${error.message}`, error);
			return interaction.reply({
				content: 'Failed to show image upload step. Please try again.',
				flags: [MessageFlags.Ephemeral]
			});
		}
	}

	private createPromptModal(repositoryName: string): ModalBuilder {
		const modal = new ModalBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_PROMPT_MODAL)
			.setTitle(`🤖 Analyze ${repositoryName}`);

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

		// File context input (optional, empty)
		const fileContextInput = new TextInputBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_FILE_CONTEXT_INPUT)
			.setLabel('File Context (optional)')
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder('src/services/, README.md (comma-separated paths)')
			.setRequired(false)
			.setMaxLength(2000);

		const promptRow = new ActionRowBuilder<TextInputBuilder>().addComponents(promptInput);
		const branchRow = new ActionRowBuilder<TextInputBuilder>().addComponents(branchInput);
		const fileContextRow = new ActionRowBuilder<TextInputBuilder>().addComponents(fileContextInput);

		modal.addComponents(promptRow, branchRow, fileContextRow);

		return modal;
	}
}
