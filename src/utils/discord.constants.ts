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
	// Modal IDs
	CLAUDE_REPO_SEARCH_MODAL: 'claude-repo-search-modal',
	CLAUDE_PROMPT_MODAL: 'claude-prompt-modal',
	CLAUDE_REPO_SEARCH_INPUT: 'claude-repo-search-input',
	CLAUDE_PROMPT_INPUT: 'claude-prompt-input',
	CLAUDE_BRANCH_INPUT: 'claude-branch-input'
} as const;