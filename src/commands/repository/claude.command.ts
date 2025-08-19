import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { BaseService } from '../../services/base/base.service';
import { GitHubService } from '../../services/github.service';
import { SessionService } from '../../services/session.service';
import { EmbedService } from '../../services/embed.service';
import { CUSTOM_IDS } from '../../utils/discord.constants';

@Injectable()
export class ClaudeCommand extends BaseService {
	constructor(
		private readonly githubService: GitHubService,
		private readonly sessionService: SessionService,
		private readonly embedService: EmbedService
	) {
		super(ClaudeCommand.name);
	}

	@SlashCommand({
		name: 'claude',
		description: 'Analyze a GitHub repository with Claude Code'
	})
	public async onClaudeCommand(@Context() [interaction]: SlashCommandContext) {
		const userId = interaction.user.id;

		// Validate GitHub service
		if (!this.githubService.isConfigured()) {
			const embed = this.embedService.createGitHubNotConfiguredEmbed();
			return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
		}

		// Create or update session for the new workflow
		if (!this.sessionService.hasSession(userId)) {
			this.sessionService.createSession(userId);
		}

		// Update session to track that we're in the Claude workflow
		this.sessionService.updateSession(userId, {
			action: 'claude_repository_search'
		});

		this.logger.log(`Claude command initiated by user: ${interaction.user.tag} (${userId})`);

		// Create repository search modal
		const modal = new ModalBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_REPO_SEARCH_MODAL)
			.setTitle('🤖 Claude Code Analysis');

		const repositoryInput = new TextInputBuilder()
			.setCustomId(CUSTOM_IDS.CLAUDE_REPO_SEARCH_INPUT)
			.setLabel('Repository Name or Search Term')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('e.g., "discord-bot" or "microsoft/vscode"')
			.setRequired(true)
			.setMaxLength(100);

		const repositoryRow = new ActionRowBuilder<TextInputBuilder>().addComponents(repositoryInput);
		modal.addComponents(repositoryRow);

		await interaction.showModal(modal);
	}
}