import { EmbedBuilder } from 'discord.js';
import { Repository, PaginatedRepositories } from '../models/repository.interface';
import { WorkflowRun } from '../models/workflow.interface';
import { MessageComponents } from '../discord/discord.interface';

export interface IEmbedService {
	createLoadingEmbed(message: string): EmbedBuilder;
	createErrorEmbed(title: string, description: string): EmbedBuilder;
	createSuccessEmbed(title: string, description: string): EmbedBuilder;
	createWarningEmbed(title: string, description: string): EmbedBuilder;
	createGitHubNotConfiguredEmbed(): EmbedBuilder;
	createNoRepositoriesEmbed(): EmbedBuilder;
	createNoSearchResultsEmbed(query: string): EmbedBuilder;
	createRepositorySelectionEmbed(paginatedRepos: PaginatedRepositories, searchQuery: string | null): EmbedBuilder;
	createRepositorySelectedEmbed(repository: Repository, hasClaudeWorkflow?: boolean): EmbedBuilder;
	createRepositorySelectionMessage(paginatedRepos: PaginatedRepositories, searchQuery: string | null): MessageComponents;
	createSearchLoadingEmbed(query: string): EmbedBuilder;
	createSearchErrorEmbed(query: string): EmbedBuilder;
	createPaginationErrorEmbed(): EmbedBuilder;
	createSessionExpiredEmbed(): EmbedBuilder;
	createWorkflowNotFoundEmbed(owner: string, repo: string): EmbedBuilder;
	createWorkflowDispatchedEmbed(repository: string, branch: string, prompt: string, workflowRun: WorkflowRun): EmbedBuilder;
	createWorkflowStatusEmbed(workflowRun: WorkflowRun, repository: string): EmbedBuilder;
	createWorkflowCompletedEmbed(repository: string, workflowRun: WorkflowRun, startTime: Date): EmbedBuilder;
}