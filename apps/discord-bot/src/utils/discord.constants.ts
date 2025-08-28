import { EmbedColors } from '../interfaces/discord/discord.interface';

export const DISCORD_COLORS: EmbedColors = {
	PRIMARY: 0x5865f2,
	SUCCESS: 0x00ff00,
	WARNING: 0xff9900,
	ERROR: 0xff0000,
	INFO: 0xffff00
};

export const CUSTOM_IDS = {
	REPO_SELECT: 'repo-select',
	CANCEL: 'cancel',
	WORKFLOW_STATUS: 'workflow-status',
	VIEW_WORKFLOW: 'view-workflow',
	// File selection
	FILE_PATH_SELECT: 'file-path-select',
	SKIP_FILE_SELECTION: 'skip-file-selection',
	// Image upload
	ADD_IMAGES: 'add-images',
	SKIP_IMAGES: 'skip-images',
	OPEN_CLAUDE_PROMPT: 'open-claude-prompt',
	// Modal IDs
	CLAUDE_REPO_SEARCH_MODAL: 'claude-repo-search-modal',
	CLAUDE_PROMPT_MODAL: 'claude-prompt-modal',
	CLAUDE_REPO_SEARCH_INPUT: 'claude-repo-search-input',
	CLAUDE_PROMPT_INPUT: 'claude-prompt-input',
	CLAUDE_BRANCH_INPUT: 'claude-branch-input',
	CLAUDE_FILE_CONTEXT_INPUT: 'claude-file-context-input',
	CLAUDE_IMAGE_URLS_INPUT: 'claude-image-urls-input'
} as const;
