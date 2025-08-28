import { Injectable } from '@nestjs/common';
import { Context, Button, ButtonContext } from 'necord';
import { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { BaseService } from '../../services/base/base.service';
import { SessionService } from '../../services/session.service';
import { CUSTOM_IDS } from '../../utils/discord.constants';
import { MESSAGES } from '../../utils/messages.constants';

@Injectable()
export class SkipImagesButtonHandler extends BaseService {
	constructor(private readonly sessionService: SessionService) {
		super(SkipImagesButtonHandler.name);
	}

	@Button(CUSTOM_IDS.SKIP_IMAGES)
	public async onSkipImages(@Context() [interaction]: ButtonContext) {
		const userId = interaction.user.id;
		const session = this.sessionService.getSession(userId);

		if (!session || !session.repository) {
			return interaction.reply({
				content: MESSAGES.SESSION_EXPIRED,
				flags: [MessageFlags.Ephemeral]
			});
		}

		try {
			this.logger.log(`User ${interaction.user.tag} (${userId}) skipped image upload`);

			// Update session to move to prompt input (no images)
			this.sessionService.updateSession(userId, {
				action: 'claude_prompt_input',
				uploadedImages: [], // Ensure no images are included
				awaitingImages: false
			});

			// Create and show the prompt modal
			const modal = this.createPromptModal(session.repository.name, session.selectedFilePaths || []);
			await interaction.showModal(modal);

			this.logger.log(`Prompt modal displayed (no images) for ${session.repository.fullName}`);
		} catch (error) {
			this.logger.error(`Failed to handle skip images: ${error.message}`, error);
			return interaction.reply({
				content: 'Failed to open prompt modal. Please try again.',
				flags: [MessageFlags.Ephemeral]
			});
		}
	}

	private createPromptModal(repositoryName: string, selectedFilePaths: string[]): ModalBuilder {
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

		// File context input (optional, with pre-selected files if any)
		const fileContextInput = new TextInputBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_FILE_CONTEXT_INPUT)
			.setLabel('File Context (optional)')
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder('src/services/, README.md (comma-separated paths)')
			.setRequired(false)
			.setMaxLength(2000);

		// Pre-populate with selected file paths
		if (selectedFilePaths.length > 0) {
			fileContextInput.setValue(selectedFilePaths.join(', '));
		}

		// Image URLs input (empty since we're skipping images)
		const imageUrlsInput = new TextInputBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_IMAGE_URLS_INPUT)
			.setLabel('Image URLs (optional)')
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder('https://example.com/image1.png, https://example.com/image2.jpg')
			.setRequired(false)
			.setMaxLength(2000)
			.setValue(''); // Empty since no images

		const promptRow = new ActionRowBuilder<TextInputBuilder>().addComponents(promptInput);
		const branchRow = new ActionRowBuilder<TextInputBuilder>().addComponents(branchInput);
		const fileContextRow = new ActionRowBuilder<TextInputBuilder>().addComponents(fileContextInput);
		const imageUrlsRow = new ActionRowBuilder<TextInputBuilder>().addComponents(imageUrlsInput);

		modal.addComponents(promptRow, branchRow, fileContextRow, imageUrlsRow);

		return modal;
	}
}
