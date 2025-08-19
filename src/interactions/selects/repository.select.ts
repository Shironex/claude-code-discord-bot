import { Injectable } from '@nestjs/common';
import { Context, StringSelect, StringSelectContext } from 'necord';
import { Repository } from '../../services/github.service';
import { SessionService } from '../../services/session.service';
import { EmbedService } from '../../services/embed.service';
import { CUSTOM_IDS, MESSAGES } from '../../utils/constants';

@Injectable()
export class RepositorySelectHandler {
	constructor(
		private readonly sessionService: SessionService,
		private readonly embedService: EmbedService
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
				ephemeral: true
			});
		}

		const selectedRepoFullName = interaction.values[0];
		const selectedRepo = session.paginatedData.repositories.find(
			(repo: Repository) => repo.fullName === selectedRepoFullName
		);

		if (!selectedRepo) {
			return interaction.reply({
				content: MESSAGES.REPOSITORY_NOT_FOUND,
				ephemeral: true
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

		// Create success embed with repository details
		const embed = this.embedService.createRepositorySelectedEmbed(selectedRepo);

		await interaction.update({
			embeds: [embed],
			components: []
		});
	}
}
