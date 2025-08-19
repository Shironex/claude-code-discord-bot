import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, EmbedBuilder } from 'discord.js';

export interface RepositoryDisplayOptions {
	showPagination?: boolean;
	includePrivate?: boolean;
	perPage?: number;
}

export interface MessageComponents {
	embed: EmbedBuilder;
	components: (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[];
}

export interface PaginationInfo {
	currentPage: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	totalCount: number;
}

export interface EmbedColors {
	PRIMARY: number;
	SUCCESS: number;
	WARNING: number;
	ERROR: number;
	INFO: number;
}
