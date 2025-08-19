import { Injectable } from '@nestjs/common';
import { Context, Button, ButtonContext } from 'necord';
import { GitHubService } from '../../services/github.service';
import { PaginatedRepositories } from '../../interfaces/models/repository.interface';
import { SessionService } from '../../services/session.service';
import { EmbedService } from '../../services/embed.service';
import { CUSTOM_IDS } from '../../utils/discord.constants';
import { MESSAGES } from '../../utils/messages.constants';
import { MessageFlags } from 'discord.js';

@Injectable()
export class PaginationButtonsHandler {
	constructor(
		private readonly githubService: GitHubService,
		private readonly sessionService: SessionService,
		private readonly embedService: EmbedService
	) {}

	@Button(CUSTOM_IDS.REPO_PREV)
	public async onRepoPrevious(@Context() [interaction]: ButtonContext) {
		if (interaction.customId !== CUSTOM_IDS.REPO_PREV) {
			return;
		}

		await this.handlePagination([interaction], -1);
	}

	@Button(CUSTOM_IDS.REPO_NEXT)
	public async onRepoNext(@Context() [interaction]: ButtonContext) {
		if (interaction.customId !== CUSTOM_IDS.REPO_NEXT) {
			return;
		}

		await this.handlePagination([interaction], 1);
	}

	private async handlePagination(interaction: ButtonContext, pageChange: number) {
		const userId = interaction[0].user.id;
		const session = this.sessionService.getSession(userId);

		if (!session || !session.paginatedData) {
			return interaction[0].reply({
				content: MESSAGES.SESSION_EXPIRED,
				flags: [MessageFlags.Ephemeral]
			});
		}

		const currentPage = session.paginatedData.currentPage;
		const newPage = currentPage + pageChange;

		// Show loading state
		await interaction[0].deferUpdate();

		try {
			let newPaginatedData: PaginatedRepositories;

			if (session.searchQuery) {
				// Handle search pagination
				newPaginatedData = await this.githubService.searchRepositories(session.searchQuery, newPage, 25);
			} else {
				// Handle regular pagination
				newPaginatedData = await this.githubService.getUserRepositoriesPaginated(newPage, 25);
			}

			// Update session
			this.sessionService.setPaginatedData(userId, newPaginatedData);

			// Create updated message
			const { embed, components } = this.embedService.createRepositorySelectionMessage(
				newPaginatedData,
				session.searchQuery
			);

			await interaction[0].editReply({
				embeds: [embed],
				components: components
			});
		} catch (error) {
			console.error('Error during pagination:', error);

			const errorEmbed = this.embedService.createPaginationErrorEmbed();

			await interaction[0].editReply({
				embeds: [errorEmbed],
				components: []
			});
		}
	}
}
