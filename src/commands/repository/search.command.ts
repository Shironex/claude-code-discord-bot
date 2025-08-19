import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext, Options } from 'necord';
import { MessageFlags } from 'discord.js';
import { GitHubService } from '../../services/github.service';
import { SessionService } from '../../services/session.service';
import { EmbedService } from '../../services/embed.service';
import { SearchDto } from '../../dtos/search.dto';

@Injectable()
export class SearchCommand {
	constructor(
		private readonly githubService: GitHubService,
		private readonly sessionService: SessionService,
		private readonly embedService: EmbedService
	) {}

	@SlashCommand({ name: 'search', description: 'Search for repositories' })
	public async onSearch(
		@Context() [interaction]: SlashCommandContext, 
		@Options() { query }: SearchDto
	) {
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
		const loadingEmbed = this.embedService.createSearchLoadingEmbed(query);

		await interaction.reply({
			embeds: [loadingEmbed],
			flags: [MessageFlags.Ephemeral]
		});

		try {
			// Search repositories
			const searchResults = await this.githubService.searchRepositories(query, 1, 25);

			if (searchResults.repositories.length === 0) {
				const embed = this.embedService.createNoSearchResultsEmbed(query);
				return interaction.editReply({
					embeds: [embed],
					components: []
				});
			}

			// Create or update session
			this.sessionService.createSession(userId);
			this.sessionService.setPaginatedData(userId, searchResults);
			this.sessionService.setSearchQuery(userId, query);

			// Create embed and components for search results
			const { embed, components } = this.embedService.createRepositorySelectionMessage(
				searchResults, 
				query
			);

			await interaction.editReply({
				embeds: [embed],
				components: components
			});

		} catch (error) {
			console.error('Error searching repositories:', error);
			
			const errorEmbed = this.embedService.createSearchErrorEmbed(query);

			await interaction.editReply({
				embeds: [errorEmbed],
				components: []
			});
		}
	}
}