import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, EmbedBuilder } from 'discord.js';

export interface MessageComponents {
	embed: EmbedBuilder;
	components: (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[];
}

export interface EmbedColors {
	PRIMARY: number;
	SUCCESS: number;
	WARNING: number;
	ERROR: number;
	INFO: number;
}
