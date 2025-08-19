import { EmbedColors } from '../interfaces/discord.interface';

export const DISCORD_COLORS: EmbedColors = {
	PRIMARY: 0x5865f2,
	SUCCESS: 0x00ff00,
	WARNING: 0xff9900,
	ERROR: 0xff0000,
	INFO: 0xffff00
};

export const LANGUAGE_EMOJIS: Record<string, string> = {
	JavaScript: '🟨',
	TypeScript: '🟦',
	Python: '🟩',
	Java: '🟧',
	'C++': '🟪',
	'C#': '🟣',
	Go: '🟢',
	Rust: '🟤',
	Ruby: '🟥',
	PHP: '🟨',
	Swift: '🟠',
	Kotlin: '🟣',
	Dart: '🟦',
	Shell: '⚫',
	HTML: '🟧',
	CSS: '🟦',
	Vue: '🟢',
	React: '🟦'
};

export const PAGINATION_LIMITS = {
	REPOSITORIES_PER_PAGE: 25,
	MAX_SELECT_OPTIONS: 25
} as const;

export const CUSTOM_IDS = {
	REPO_SELECT: 'repo-select',
	REPO_PREV: 'repo-prev',
	REPO_NEXT: 'repo-next',
	REPO_PAGE_INFO: 'repo-page-info',
	CANCEL: 'cancel',
	CLAUDE_ANALYZE: 'claude-analyze',
	WORKFLOW_STATUS: 'workflow-status',
	VIEW_WORKFLOW: 'view-workflow'
} as const;

export const MESSAGES = {
	GITHUB_NOT_CONFIGURED:
		'GitHub token is not configured. Please add your GitHub personal access token to the environment variables.',
	SESSION_EXPIRED: 'Session expired. Please run /run or /search again.',
	REPOSITORY_NOT_FOUND: 'Repository not found. Please try again.',
	PAGINATION_ERROR: 'Failed to load repositories. Please try again.',
	SEARCH_ERROR: 'Failed to search repositories. Please try again.',
	OPERATION_CANCELLED: 'Operation cancelled.'
} as const;
