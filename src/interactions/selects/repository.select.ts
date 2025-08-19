import { Injectable } from '@nestjs/common';
import { Context, StringSelect, StringSelectContext } from 'necord';
import { ActionRowBuilder, ButtonBuilder, MessageFlags } from 'discord.js';
import { Repository } from '../../services/github.service';
import { SessionService } from '../../services/session.service';
import { EmbedService } from '../../services/embed.service';
import { WorkflowService } from '../../services/workflow.service';
import { CUSTOM_IDS, MESSAGES } from '../../utils/constants';
import { DiscordUtils } from '../../utils/discord.utils';

@Injectable()
export class RepositorySelectHandler {
	constructor(
		private readonly sessionService: SessionService,
		private readonly embedService: EmbedService,
		private readonly workflowService: WorkflowService
	) {}

	@StringSelect(CUSTOM_IDS.REPO_SELECT)
	public async onRepoSelect(@Context() [interaction]: StringSelectContext) {
		// Only handle custom IDs that match exactly
		if (interaction.customId !== CUSTOM_IDS.REPO_SELECT) {
			return;
		}

		console.log('🎯 Repo select handler triggered:', interaction.customId);

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
		this.sessionService.setRepository(userId, selectedRepo);

		// Log selection
		console.log('\n' + '='.repeat(50));
		console.log('🎯 REPOSITORY SELECTED');
		console.log('='.repeat(50));
		console.log('Repository:', selectedRepo.fullName);
		console.log('Language:', selectedRepo.language);
		console.log('Stars:', selectedRepo.stargazersCount);
		console.log('User:', interaction.user.tag);
		console.log('Session ID:', userId);
		console.log('='.repeat(50) + '\n');

		// Check if repository has Claude Code workflow
		let hasClaudeWorkflow = false;
		try {
			const [owner, repo] = selectedRepo.fullName.split('/');
			hasClaudeWorkflow = await this.workflowService.checkWorkflowExists(owner, repo, 'claude.yml');
		} catch (error) {
			console.warn(`Failed to check Claude workflow for ${selectedRepo.fullName}:`, error.message);
		}

		// Create success embed with repository details
		const embed = this.embedService.createRepositorySelectedEmbed(selectedRepo, hasClaudeWorkflow);

		// Create action buttons
		const components: ActionRowBuilder<ButtonBuilder>[] = [];

		if (hasClaudeWorkflow) {
			const analyzeButton = DiscordUtils.createClaudeAnalyzeButton();
			const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(analyzeButton);
			components.push(actionRow);
		}

		await interaction.update({
			embeds: [embed],
			components
		});
	}
}
