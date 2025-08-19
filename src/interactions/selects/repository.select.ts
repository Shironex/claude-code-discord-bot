import { Injectable } from '@nestjs/common';
import { Context, StringSelect, StringSelectContext } from 'necord';
import { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { BaseService } from '../../services/base/base.service';
import { Repository } from '../../interfaces/models/repository.interface';
import { SessionService } from '../../services/session.service';
import { CUSTOM_IDS } from '../../utils/discord.constants';
import { MESSAGES } from '../../utils/messages.constants';

@Injectable()
export class RepositorySelectHandler extends BaseService {
	constructor(
		private readonly sessionService: SessionService
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
			action: 'claude_prompt_input'
		});

		this.logger.log(`Repository selected: ${selectedRepo.fullName} by user: ${interaction.user.tag} (${userId})`);

		// Show prompt modal directly
		const modal = new ModalBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_PROMPT_MODAL)
			.setTitle(`🤖 Analyze ${selectedRepo.name}`);

		const promptInput = new TextInputBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_PROMPT_INPUT)
			.setLabel('What would you like Claude to do?')
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder('Example: Review the code for security vulnerabilities and suggest improvements')
			.setRequired(true)
			.setMaxLength(2000);

		const branchInput = new TextInputBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_BRANCH_INPUT)
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
