import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { MessageFlags } from 'discord.js';
import { GitHubService } from '../../services/github.service';
import { SessionService } from '../../services/session.service';
import { EmbedService } from '../../services/embed.service';

@Injectable()
export class RunCommand {
	constructor(
		private readonly githubService: GitHubService,
		private readonly sessionService: SessionService,
		private readonly embedService: EmbedService
	) {}

	@SlashCommand({ name: 'run', description: 'Run Claude Code on a repository' })
	public async onRun(@Context() [interaction]: SlashCommandContext) {
		const userId = interaction.user.id;

		// Check if GitHub is configured
		if (!this.githubService.isConfigured()) {
			const embed = this.embedService.createGitHubNotConfiguredEmbed();
			return interaction.reply({
				embeds: [embed],
				flags: [MessageFlags.Ephemeral]
			});
		}

		// Show loading state
		const loadingEmbed = this.embedService.createLoadingEmbed('Fetching your repositories from GitHub...');

		await interaction.reply({
			embeds: [loadingEmbed],
			flags: [MessageFlags.Ephemeral]
		});

		try {
			// Fetch repositories from GitHub with pagination
			const paginatedRepos = await this.githubService.getUserRepositoriesPaginated(1, 25);

			if (paginatedRepos.repositories.length === 0) {
				const embed = this.embedService.createNoRepositoriesEmbed();
				return interaction.editReply({
					embeds: [embed],
					components: []
				});
			}

			// Create or update session
			this.sessionService.createSession(userId);
			this.sessionService.setPaginatedData(userId, paginatedRepos);

			// Create embed and components for repository selection
			const { embed, components } = this.embedService.createRepositorySelectionMessage(paginatedRepos, null);

			await interaction.editReply({
				embeds: [embed],
				components: components
			});
		} catch (error) {
			console.error('Error fetching repositories:', error);

			const errorEmbed = this.embedService.createErrorEmbed(
				'Error Fetching Repositories',
				'Failed to fetch repositories from GitHub. Please check your token and try again.'
			);

			await interaction.editReply({
				embeds: [errorEmbed],
				components: []
			});
		}
	}
}
