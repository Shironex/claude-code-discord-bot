export interface Repository {
	id: number;
	name: string;
	fullName: string;
	description: string | null;
	language: string | null;
	stargazersCount: number;
	forksCount: number;
	updatedAt: string;
	private: boolean;
	htmlUrl: string;
}

export interface PaginatedRepositories {
	repositories: Repository[];
	totalCount: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	currentPage: number;
	totalPages: number;
}