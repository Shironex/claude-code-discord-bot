import { Repository, PaginatedRepositories } from '../models/repository.interface';

export interface IGitHubService {
	getUserRepositories(limit?: number): Promise<Repository[]>;
	getUserRepositoriesPaginated(page?: number, perPage?: number): Promise<PaginatedRepositories>;
	searchRepositories(query: string, page?: number, perPage?: number): Promise<PaginatedRepositories>;
	getRepository(owner: string, repo: string): Promise<Repository>;
	isConfigured(): boolean;
}
