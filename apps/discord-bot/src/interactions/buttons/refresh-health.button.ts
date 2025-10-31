import { Injectable } from '@nestjs/common';
import { Context, Button, ButtonContext } from 'necord';
import { ActionRowBuilder, ButtonBuilder } from 'discord.js';
import { BaseService } from '../../services/base/base.service';
import { HealthCheckService } from '../../services/health-check.service';
import { EmbedService } from '../../services/embed.service';
import { LoggerFactory } from '@claude-code/shared';
import { CUSTOM_IDS } from '../../utils/discord.constants';
import { DiscordUtils } from '../../utils/discord.utils';

/**
 * Refresh Health Button Handler
 * Handles button clicks to refresh bot health status
 * Forces a fresh health check by bypassing the cache
 */
@Injectable()
export class RefreshHealthButtonHandler extends BaseService {
	constructor(
		loggerFactory: LoggerFactory,
		private readonly healthCheckService: HealthCheckService,
		private readonly embedService: EmbedService
	) {
		super(RefreshHealthButtonHandler.name, loggerFactory);
	}

	@Button(CUSTOM_IDS.REFRESH_HEALTH)
	public async onRefreshHealth(@Context() [interaction]: ButtonContext) {
		const userId = interaction.user.id;
		this.logger.log(`User ${interaction.user.tag} (${userId}) requested health check refresh`, 'onRefreshHealth');

		try {
			// Use deferUpdate to show the interaction was received
			// This updates the message without sending a new one
			await interaction.deferUpdate();

			// Force a fresh health check (bypass cache)
			const healthStatus = await this.healthCheckService.getFullHealthStatus(true);

			// Create updated embed
			const embed = this.embedService.createHealthCheckEmbed(healthStatus);

			// Re-create refresh button
			const refreshButton = DiscordUtils.createRefreshHealthButton();
			const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(refreshButton);

			// Update the message
			await interaction.editReply({
				embeds: [embed],
				components: [actionRow]
			});

			this.logger.log(
				`Health check refreshed for user ${userId} - Overall status: ${healthStatus.overallStatus}`,
				'onRefreshHealth'
			);
		} catch (error) {
			this.logger.error(`Failed to refresh health check for user ${userId}`, error, 'onRefreshHealth');

			const errorEmbed = this.embedService.createErrorEmbed(
				'Refresh Failed',
				`Failed to refresh health status: \`${error.message}\``
			);

			// Try to update with error message
			try {
				await interaction.editReply({
					embeds: [errorEmbed],
					components: []
				});
			} catch (replyError) {
				this.logger.error('Failed to send error response', replyError, 'onRefreshHealth');
			}
		}
	}
}
