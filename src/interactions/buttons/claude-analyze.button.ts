import { Injectable, Logger } from '@nestjs/common';
import { Context, Button, ButtonContext } from 'necord';
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { SessionService } from '../../services/session.service';
import { EmbedService } from '../../services/embed.service';
import { CUSTOM_IDS, MESSAGES } from '../../utils/constants';

@Injectable()
export class ClaudeAnalyzeButtonHandler {
	private readonly logger = new Logger(ClaudeAnalyzeButtonHandler.name);

	constructor(
		private readonly sessionService: SessionService,
		private readonly embedService: EmbedService
	) {}

	@Button(CUSTOM_IDS.CLAUDE_ANALYZE)
	public async onClaudeAnalyze(@Context() [interaction]: ButtonContext) {
		const userId = interaction.user.id;
		const session = this.sessionService.getSession(userId);

		if (!session || !session.repository) {
			return interaction.reply({
				content: MESSAGES.SESSION_EXPIRED,
				flags: [MessageFlags.Ephemeral]
			});
		}

		this.logger.log(`Claude analyze button clicked for repository: ${session.repository.fullName}`);

		// Create modal for prompt input
		const modal = new ModalBuilder()
			.setCustomId('claude-prompt-modal')
			.setTitle(`Analyze ${session.repository.name}`);

		const promptInput = new TextInputBuilder()
			.setCustomId('claude-prompt-input')
			.setLabel('What would you like Claude to do?')
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder('Example: Review the code for security vulnerabilities and suggest improvements')
			.setRequired(true)
			.setMaxLength(2000);

		const branchInput = new TextInputBuilder()
			.setCustomId('claude-branch-input')
			.setLabel('Branch (optional)')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('main')
			.setRequired(false)
			.setMaxLength(100);

		const promptRow = new ActionRowBuilder<TextInputBuilder>().addComponents(promptInput);
		const branchRow = new ActionRowBuilder<TextInputBuilder>().addComponents(branchInput);

		modal.addComponents(promptRow, branchRow);

		await interaction.showModal(modal);
	}
}
