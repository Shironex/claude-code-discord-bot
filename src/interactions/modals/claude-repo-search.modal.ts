import { Injectable } from '@nestjs/common';
import { Context, Modal, ModalContext } from 'necord';
import { MessageFlags, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { BaseService } from '../../services/base/base.service';
import { GitHubService } from '../../services/github.service';
import { WorkflowService } from '../../services/workflow.service';
import { SessionService } from '../../services/session.service';
import { EmbedService } from '../../services/embed.service';
import { Repository } from '../../interfaces/models/repository.interface';
import { CUSTOM_IDS } from '../../utils/discord.constants';
import { MESSAGES } from '../../utils/messages.constants';
import { DiscordUtils } from '../../utils/discord.utils';

@Injectable()
export class ClaudeRepoSearchModalHandler extends BaseService {
	constructor(
		private readonly githubService: GitHubService,
		private readonly workflowService: WorkflowService,
		private readonly sessionService: SessionService,
		private readonly embedService: EmbedService
	) {
		super(ClaudeRepoSearchModalHandler.name);
	}

	@Modal(CUSTOM_IDS.CLAUDE_REPO_SEARCH_MODAL)
	public async onClaudeRepoSearchModal(@Context() [interaction]: ModalContext) {
		const userId = interaction.user.id;
		const session = this.sessionService.getSession(userId);

		if (!session) {
			return interaction.reply({
				content: MESSAGES.SESSION_EXPIRED,
				flags: [MessageFlags.Ephemeral]
			});
		}

		await interaction.deferReply();

		try {
			const searchTerm = interaction.fields.getTextInputValue(CUSTOM_IDS.CLAUDE_REPO_SEARCH_INPUT);
			
			this.logger.log(`Repository search: "${searchTerm}" by user: ${interaction.user.tag} (${userId})`);

			let repositories: Repository[] = [];

			// Check if it's a direct repository reference (owner/repo format)
			const directRepoMatch = searchTerm.match(/^([^\/\s]+)\/([^\/\s]+)$/);
			if (directRepoMatch) {
				const [, owner, repo] = directRepoMatch;
				try {
					const repository = await this.githubService.getRepository(owner, repo);
					repositories = [repository];
					this.logger.log(`Direct repository found: ${repository.fullName}`);
				} catch (error) {
					this.logger.log(`Direct repository not found: ${owner}/${repo}`);
					// Continue to search if direct lookup fails
				}
			}

			// If no direct match found, search user's repositories
			if (repositories.length === 0) {
				try {
					const searchResults = await this.githubService.searchRepositories(searchTerm, 1, 25);
					repositories = searchResults.repositories;
					this.logger.log(`Search found ${repositories.length} repositories for term: "${searchTerm}"`);
				} catch (error) {
					this.logger.error(`Repository search failed: ${error.message}`, error);
					const embed = this.embedService.createErrorEmbed(
						'Search Failed',
						`Failed to search repositories. Please try again.`
					);
					return interaction.editReply({ embeds: [embed] });
				}
			}

			if (repositories.length === 0) {
				const embed = this.embedService.createNoSearchResultsEmbed(searchTerm);
				return interaction.editReply({ embeds: [embed] });
			}

			// Check which repositories have Claude workflow
			const repositoriesWithWorkflow: Repository[] = [];
			const repositoriesWithoutWorkflow: Repository[] = [];

			for (const repo of repositories) {
				try {
					const [owner, repoName] = repo.fullName.split('/');
					const hasWorkflow = await this.workflowService.checkWorkflowExists(owner, repoName, 'claude.yml');
					
					if (hasWorkflow) {
						repositoriesWithWorkflow.push(repo);
					} else {
						repositoriesWithoutWorkflow.push(repo);
					}
				} catch (error) {
					this.logger.error(`Failed to check workflow for ${repo.fullName}: ${error.message}`);
					repositoriesWithoutWorkflow.push(repo);
				}
			}

			// Store search results in session
			this.sessionService.updateSession(userId, {
				action: 'claude_repository_selection',
				paginatedData: {
					repositories: repositoriesWithWorkflow,
					totalCount: repositoriesWithWorkflow.length,
					hasNextPage: false,
					hasPreviousPage: false,
					currentPage: 1,
					totalPages: 1
				},
				searchQuery: searchTerm
			});

			if (repositoriesWithWorkflow.length === 0) {
				// No repositories with Claude workflow found
				let description = `No repositories found matching "${searchTerm}" with Claude Code workflow configured.`;
				
				if (repositoriesWithoutWorkflow.length > 0) {
					description += `\n\n**Found repositories without Claude Code:**\n`;
					description += repositoriesWithoutWorkflow
						.slice(0, 5)
						.map(repo => `• ${repo.fullName}`)
						.join('\n');
						
					if (repositoriesWithoutWorkflow.length > 5) {
						description += `\n• ... and ${repositoriesWithoutWorkflow.length - 5} more`;
					}
					
					description += `\n\nTo use Claude Code with these repositories, add a \`.github/workflows/claude.yml\` file.`;
				}

				const embed = this.embedService.createWarningEmbed(
					'No Claude Code Repositories Found',
					description
				);
				return interaction.editReply({ embeds: [embed] });
			}

			// Create embed and select menu for repositories with workflow
			const embed = this.embedService.createRepositorySelectionEmbed(
				{
					repositories: repositoriesWithWorkflow,
					totalCount: repositoriesWithWorkflow.length,
					hasNextPage: false,
					hasPreviousPage: false,
					currentPage: 1,
					totalPages: 1
				},
				searchTerm
			);

			// Limit to max 25 options for select menu
			const selectOptions = repositoriesWithWorkflow.slice(0, 25);
			const selectMenu = DiscordUtils.createRepositorySelectMenu(selectOptions);
			const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

			let description = `Found **${repositoriesWithWorkflow.length}** repositories with Claude Code workflow:`;
			if (repositoriesWithoutWorkflow.length > 0) {
				description += `\n\n*${repositoriesWithoutWorkflow.length} additional repositories found without Claude Code workflow.*`;
			}

			embed.setDescription(description);

			await interaction.editReply({
				embeds: [embed],
				components: [selectRow]
			});

			this.logger.log(`Repository selection presented: ${repositoriesWithWorkflow.length} valid repositories`);

		} catch (error) {
			this.logger.error(`Claude repository search modal error: ${error.message}`, error);
			const embed = this.embedService.createErrorEmbed(
				'Search Error',
				'An unexpected error occurred while searching repositories. Please try again.'
			);
			return interaction.editReply({ embeds: [embed] });
		}
	}
}