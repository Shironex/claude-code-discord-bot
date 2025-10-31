import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, type SlashCommandContext } from 'necord';
import { ActionRowBuilder, ButtonBuilder, MessageFlags } from 'discord.js';
import { BaseService } from '../../services/base/base.service';
import { HealthCheckService } from '../../services/health-check.service';
import { EmbedService } from '../../services/embed.service';
import { LoggerFactory } from '@claude-code/shared';
import { DiscordUtils } from '../../utils/discord.utils';

/**
 * Doctor Command - Comprehensive health check for all bot components
 * Provides real-time status across bot runtime, GitHub integration,
 * session management, and image service with caching and refresh capability
 */
@Injectable()
export class DoctorCommand extends BaseService {
	constructor(
		loggerFactory: LoggerFactory,
		private readonly healthCheckService: HealthCheckService,
		private readonly embedService: EmbedService
	) {
		super(DoctorCommand.name, loggerFactory);
	}

	@SlashCommand({
		name: 'doctor',
		description: 'Check bot health status across all components'
	})
	public async onDoctorCommand(@Context() [interaction]: SlashCommandContext) {
		const userId = interaction.user.id;
		this.logger.log(`User ${interaction.user.tag} (${userId}) requested health check`, 'onDoctorCommand');

		try {
			// Defer reply for better UX (ephemeral so only user sees it)
			await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

			// Get health status (uses cache if available)
			const healthStatus = await this.healthCheckService.getFullHealthStatus();

			// Create embed with health information
			const embed = this.embedService.createHealthCheckEmbed(healthStatus);

			// Create refresh button
			const refreshButton = DiscordUtils.createRefreshHealthButton();
			const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(refreshButton);

			// Send response
			await interaction.editReply({
				embeds: [embed],
				components: [actionRow]
			});

			this.logger.log(
				`Health check completed for user ${userId} - Overall status: ${healthStatus.overallStatus}`,
				'onDoctorCommand'
			);
		} catch (error) {
			this.logger.error(`Failed to execute health check for user ${userId}`, error, 'onDoctorCommand');

			const errorEmbed = this.embedService.createErrorEmbed(
				'Health Check Failed',
				`An error occurred while checking bot health: \`${error.message}\``
			);

			// Try to send error response
			try {
				if (interaction.deferred || interaction.replied) {
					await interaction.editReply({ embeds: [errorEmbed], components: [] });
				} else {
					await interaction.reply({
						embeds: [errorEmbed],
						flags: [MessageFlags.Ephemeral]
					});
				}
			} catch (replyError) {
				this.logger.error('Failed to send error response', replyError, 'onDoctorCommand');
			}
		}
	}
}
