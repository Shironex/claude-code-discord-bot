import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, StringSelect, StringSelectContext } from 'necord';
import { StringSelectMenuInteraction } from 'discord.js';
import { Repository } from '../../services/github.service';
import { SessionService } from '../../services/session.service';
import { EmbedService } from '../../services/embed.service';
import { ContainerService } from '../../services/container.service';
import { ContainerExecutionRequest } from '../../interfaces/container.interface';
import { CUSTOM_IDS, MESSAGES } from '../../utils/constants';

@Injectable()
export class RepositorySelectHandler {
	constructor(
		private readonly sessionService: SessionService,
		private readonly embedService: EmbedService,
		private readonly containerService: ContainerService,
		private readonly configService: ConfigService
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

		// Show container starting embed
		const startingEmbed = this.embedService.createContainerStartingEmbed(selectedRepo);

		await interaction.update({
			embeds: [startingEmbed],
			components: []
		});

		// Start container execution in the background
		this.executeRepositoryCloning(selectedRepo, userId, interaction);
	}

	private async executeRepositoryCloning(
		repository: Repository,
		userId: string,
		interaction: StringSelectMenuInteraction
	): Promise<void> {
		try {
			// Check if Docker is available
			const dockerAvailable = await this.containerService.isDockerAvailable();
			if (!dockerAvailable) {
				const errorEmbed = this.embedService.createDockerNotAvailableEmbed();
				await interaction.editReply({
					embeds: [errorEmbed],
					components: []
				});
				return;
			}

			// Get GitHub token from config
			const githubToken = this.configService.get<string>('GITHUB_TOKEN');
			if (!githubToken) {
				const errorEmbed = this.embedService.createErrorEmbed(
					'Configuration Error',
					'GitHub token is not configured properly.'
				);
				await interaction.editReply({
					embeds: [errorEmbed],
					components: []
				});
				return;
			}

			// Create execution request
			const executionRequest: ContainerExecutionRequest = {
				repositoryFullName: repository.fullName,
				githubToken,
				userId,
				requestId: `${userId}-${Date.now()}`
			};

			console.log(`🐳 Starting container execution for ${repository.fullName}`);

			// Execute repository cloning
			const result = await this.containerService.executeRepository(executionRequest);

			console.log(`🎯 Container execution completed for ${repository.fullName}:`, {
				success: result.success,
				executionTime: result.executionTime,
				containerId: result.containerId
			});

			// Create result embed
			const resultEmbed = this.embedService.createContainerExecutionEmbed(result);

			// Update the interaction with results
			await interaction.editReply({
				embeds: [resultEmbed],
				components: []
			});

			// Optionally, send logs as a follow-up message if there are any interesting logs
			if (result.logs.length > 0 && !result.success) {
				const logsEmbed = this.embedService.createContainerLogsEmbed(result);
				await interaction.followUp({
					embeds: [logsEmbed],
					ephemeral: true
				});
			}
		} catch (error) {
			console.error(`❌ Container execution error for ${repository.fullName}:`, error);

			const errorEmbed = this.embedService.createErrorEmbed(
				'Container Execution Failed',
				`Failed to execute container for repository: ${error.message}`
			);

			try {
				await interaction.editReply({
					embeds: [errorEmbed],
					components: []
				});
			} catch (editError) {
				console.error('Failed to update interaction after container error:', editError);
			}
		}
	}
}
