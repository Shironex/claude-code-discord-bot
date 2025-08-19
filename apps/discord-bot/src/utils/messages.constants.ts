export const MESSAGES = {
	GITHUB_NOT_CONFIGURED:
		'GitHub token is not configured. Please add your GitHub personal access token to the environment variables.',
	SESSION_EXPIRED: 'Session expired. Please run /run or /search again.',
	REPOSITORY_NOT_FOUND: 'Repository not found. Please try again.',
	PAGINATION_ERROR: 'Failed to load repositories. Please try again.',
	SEARCH_ERROR: 'Failed to search repositories. Please try again.',
	OPERATION_CANCELLED: 'Operation cancelled.'
} as const;
