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
	REPO_PREV: 'repo-prev',
	REPO_NEXT: 'repo-next',
	REPO_PAGE_INFO: 'repo-page-info',
	CANCEL: 'cancel',
	CLAUDE_ANALYZE: 'claude-analyze',
	WORKFLOW_STATUS: 'workflow-status',
	VIEW_WORKFLOW: 'view-workflow'
} as const;