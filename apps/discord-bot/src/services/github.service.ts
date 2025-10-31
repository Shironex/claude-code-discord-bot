import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseService } from './base/base.service';
import { IGitHubService } from '../interfaces/services/github.interface';
import { Repository, PaginatedRepositories } from '../interfaces/models/repository.interface';
import { LoggerFactory } from '@claude-code/shared';

@Injectable()
export class GitHubService extends BaseService implements IGitHubService {
	constructor(configService: ConfigService, loggerFactory: LoggerFactory) {
		super(GitHubService.name, loggerFactory, configService, true);
	}

	async getUserRepositories(limit: number = 25): Promise<Repository[]> {
		this.validateGitHubAccess();

		try {
			this.logger.log(`Fetching user repositories (limit: ${limit})`);

			const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
				sort: 'updated',
				direction: 'desc',
				per_page: limit,
				type: 'all'
			});

			const repositories: Repository[] = data.map(repo => ({
				id: repo.id,
				name: repo.name,
				fullName: repo.full_name,
				description: repo.description,
				language: repo.language,
				stargazersCount: repo.stargazers_count,
				forksCount: repo.forks_count,
				updatedAt: repo.updated_at,
				private: repo.private,
				htmlUrl: repo.html_url
			}));

			this.logger.log(`Successfully fetched ${repositories.length} repositories`);
			return repositories;
		} catch (error) {
			this.logger.error('Failed to fetch repositories', error);
			throw new Error('Failed to fetch GitHub repositories');
		}
	}

	async getUserRepositoriesPaginated(page: number = 1, perPage: number = 25): Promise<PaginatedRepositories> {
		this.validateGitHubAccess();

		try {
			this.logger.log(`Fetching user repositories (page: ${page}, per_page: ${perPage})`);

			const { data, headers } = await this.octokit.rest.repos.listForAuthenticatedUser({
				sort: 'updated',
				direction: 'desc',
				per_page: perPage,
				page: page,
				type: 'all'
			});

			const repositories: Repository[] = data.map(repo => ({
				id: repo.id,
				name: repo.name,
				fullName: repo.full_name,
				description: repo.description,
				language: repo.language,
				stargazersCount: repo.stargazers_count,
				forksCount: repo.forks_count,
				updatedAt: repo.updated_at,
				private: repo.private,
				htmlUrl: repo.html_url
			}));

			// Parse pagination info from headers
			const linkHeader = headers.link;
			const hasNextPage = linkHeader ? linkHeader.includes('rel="next"') : false;
			const hasPreviousPage = page > 1;

			// Estimate total count (GitHub doesn't provide exact count for user repos)
			const totalCount =
				data.length < perPage ? (page - 1) * perPage + data.length : page * perPage + (hasNextPage ? 1 : 0);
			const totalPages = Math.ceil(totalCount / perPage);

			this.logger.log(`Successfully fetched ${repositories.length} repositories (page ${page})`);

			return {
				repositories,
				totalCount,
				hasNextPage,
				hasPreviousPage,
				currentPage: page,
				totalPages
			};
		} catch (error) {
			this.logger.error('Failed to fetch repositories', error);
			throw new Error('Failed to fetch GitHub repositories');
		}
	}

	async searchRepositories(query: string, page: number = 1, perPage: number = 25): Promise<PaginatedRepositories> {
		this.validateGitHubAccess();

		try {
			this.logger.log(`Searching repositories: "${query}" (page: ${page}, per_page: ${perPage})`);

			// Search in user's repositories
			const { data } = await this.octokit.rest.search.repos({
				q: `user:${await this.getAuthenticatedUsername()} ${query}`,
				sort: 'updated',
				order: 'desc',
				per_page: perPage,
				page: page
			});

			const repositories: Repository[] = data.items.map(repo => ({
				id: repo.id,
				name: repo.name,
				fullName: repo.full_name,
				description: repo.description,
				language: repo.language,
				stargazersCount: repo.stargazers_count,
				forksCount: repo.forks_count || 0,
				updatedAt: repo.updated_at,
				private: repo.private,
				htmlUrl: repo.html_url
			}));

			const totalCount = data.total_count;
			const totalPages = Math.ceil(totalCount / perPage);
			const hasNextPage = page < totalPages;
			const hasPreviousPage = page > 1;

			this.logger.log(`Successfully found ${repositories.length} repositories for query "${query}"`);

			return {
				repositories,
				totalCount,
				hasNextPage,
				hasPreviousPage,
				currentPage: page,
				totalPages
			};
		} catch (error) {
			this.logger.error(`Failed to search repositories for query "${query}"`, error);
			throw new Error('Failed to search GitHub repositories');
		}
	}

	private async getAuthenticatedUsername(): Promise<string> {
		this.validateGitHubAccess();

		try {
			const { data } = await this.octokit.rest.users.getAuthenticated();
			return data.login;
		} catch (error) {
			this.logger.error('Failed to get authenticated user', error);
			throw new Error('Failed to get authenticated user');
		}
	}

	async getRepository(owner: string, repo: string): Promise<Repository> {
		this.validateGitHubAccess();

		try {
			this.logger.log(`Fetching repository: ${owner}/${repo}`);

			const { data } = await this.octokit.rest.repos.get({
				owner,
				repo
			});

			return {
				id: data.id,
				name: data.name,
				fullName: data.full_name,
				description: data.description,
				language: data.language,
				stargazersCount: data.stargazers_count,
				forksCount: data.forks_count,
				updatedAt: data.updated_at,
				private: data.private,
				htmlUrl: data.html_url
			};
		} catch (error) {
			this.logger.error(`Failed to fetch repository ${owner}/${repo}`, error);
			throw new Error(`Failed to fetch repository ${owner}/${repo}`);
		}
	}

	isConfigured(): boolean {
		return this.hasGitHubAccess;
	}

	/**
	 * Get GitHub API rate limit information
	 * @returns Rate limit data including remaining calls and reset time
	 */
	async getRateLimitInfo(): Promise<{
		remaining: number;
		limit: number;
		reset: Date;
	}> {
		this.validateGitHubAccess();

		try {
			const rateLimit = await this.octokit.rest.rateLimit.get();
			const core = rateLimit.data.resources.core;

			return {
				remaining: core.remaining,
				limit: core.limit,
				reset: new Date(core.reset * 1000)
			};
		} catch (error) {
			this.logger.error('Failed to fetch rate limit information', error, 'getRateLimitInfo');
			throw new Error('Failed to fetch GitHub API rate limit information');
		}
	}
}
