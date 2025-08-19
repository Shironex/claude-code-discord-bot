import { Injectable } from '@nestjs/common';
import { Context, Button, ButtonContext } from 'necord';
import { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { BaseService } from '../../services/base/base.service';
import { SessionService } from '../../services/session.service';
import { CUSTOM_IDS } from '../../utils/discord.constants';
import { MESSAGES } from '../../utils/messages.constants';
import { FileTreeUtils } from '../../utils/file-tree.utils';

@Injectable()
export class ClaudePromptTriggerButtonHandler extends BaseService {
	constructor(private readonly sessionService: SessionService) {
		super(ClaudePromptTriggerButtonHandler.name);
	}

	@Button(CUSTOM_IDS.CLAUDE_PROMPT_MODAL + '_trigger')
	public async onClaudePromptTrigger(@Context() [interaction]: ButtonContext) {
		const userId = interaction.user.id;
		const session = this.sessionService.getSession(userId);

		if (!session || !session.repository) {
			return interaction.reply({
				content: MESSAGES.SESSION_EXPIRED,
				flags: [MessageFlags.Ephemeral]
			});
		}

		try {
			const selectedPaths = session.selectedFilePaths || [];

			this.logger.log(
				`User ${interaction.user.tag} (${userId}) triggered prompt modal with ${selectedPaths.length} selected paths`
			);

			// Create and show the prompt modal with pre-filled file paths
			const modal = this.createPromptModal(session.repository.name, selectedPaths);
			await interaction.showModal(modal);

			this.logger.log(`Prompt modal displayed with ${selectedPaths.length} pre-selected file paths`);
		} catch (error) {
			this.logger.error(`Failed to handle claude prompt trigger: ${error.message}`, error);
			return interaction.reply({
				content: 'Failed to open prompt modal. Please try again.',
				flags: [MessageFlags.Ephemeral]
			});
		}
	}

	private createPromptModal(repositoryName: string, selectedPaths: string[]): ModalBuilder {
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
