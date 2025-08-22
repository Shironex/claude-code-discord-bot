import { Injectable } from '@nestjs/common';
import { Context, Button, ButtonContext } from 'necord';
import { CUSTOM_IDS } from '../../utils/discord.constants';
import { SessionService } from '../../services/session.service';
import { BaseService } from '../../services/base/base.service';
import { LoggerFactory } from '@claude-code/shared';
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

@Injectable()
export class OpenClaudePromptButtonHandler extends BaseService {
	constructor(
		loggerFactory: LoggerFactory,
		private readonly sessionService: SessionService
	) {
		super(OpenClaudePromptButtonHandler.name, loggerFactory);
	}

	@Button(CUSTOM_IDS.OPEN_CLAUDE_PROMPT)
	public async onOpenClaudePrompt(@Context() [interaction]: ButtonContext) {
		const userId = interaction.user.id;
		const session = this.sessionService.getSession(userId);

		this.logger.log(
			`User ${interaction.user.tag} (${userId}) opening Claude prompt with uploaded images`,
			'onOpenClaudePrompt'
		);

		if (!session || !session.repository) {
			this.logger.warn(`No valid session found for user ${userId}`, 'onOpenClaudePrompt');
			await interaction.reply({
				content: '❌ Session expired. Please use `/claude` command to start over.',
				ephemeral: true
			});
			return;
		}

		try {
			// Get uploaded image URLs from session
			const imageUrls = session.uploadedImages?.map(img => img.url).join(', ') || '';

			// Create the prompt modal with pre-filled image URLs
			const modal = this.createPromptModalWithImages(
				session.repository.name,
				session.selectedFilePaths || [],
				imageUrls
			);

			await interaction.showModal(modal);

			// Update session state
			this.sessionService.updateSession(userId, {
				action: 'claude_prompt_input',
				awaitingImages: false
			});

			this.logger.log(
				`Opened Claude prompt modal for user ${interaction.user.tag} with ${session.uploadedImages?.length || 0} images`,
				'onOpenClaudePrompt'
			);
		} catch (error) {
			this.logger.error(`Error opening Claude prompt modal: ${error.message}`, error, 'onOpenClaudePrompt');

			await interaction.reply({
				content: '❌ Error opening prompt modal. Please try again or use `/claude` command.',
				ephemeral: true
			});
		}
	}

	private createPromptModalWithImages(
		repositoryName: string,
		selectedFilePaths: string[],
		imageUrls: string
	): ModalBuilder {
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

		// Image URLs input (pre-filled with uploaded image URLs)
		const imageUrlsInput = new TextInputBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_IMAGE_URLS_INPUT)
			.setLabel('Image URLs (pre-filled from uploads)')
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder('https://example.com/image1.png, https://example.com/image2.jpg')
			.setRequired(false)
			.setMaxLength(2000)
			.setValue(imageUrls);

		const promptRow = new ActionRowBuilder<TextInputBuilder>().addComponents(promptInput);
		const branchRow = new ActionRowBuilder<TextInputBuilder>().addComponents(branchInput);
		const fileContextRow = new ActionRowBuilder<TextInputBuilder>().addComponents(fileContextInput);
		const imageUrlsRow = new ActionRowBuilder<TextInputBuilder>().addComponents(imageUrlsInput);

		modal.addComponents(promptRow, branchRow, fileContextRow, imageUrlsRow);

		return modal;
	}
}
