import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { EmbedBuilder, Colors } from 'discord.js';
import { BaseService } from '../../services/base/base.service';
import { LoggerFactory } from '@claude-code/shared';
import { ImageServiceClient } from '../../services/image-service/image-service.client';

@Injectable()
export class ImageServiceCommand extends BaseService {
	constructor(
		loggerFactory: LoggerFactory,
		private readonly imageServiceClient: ImageServiceClient
	) {
		super(ImageServiceCommand.name, loggerFactory);
	}

	@SlashCommand({
		name: 'debug-image-service',
		description: 'Test image service connectivity and configuration'
	})
	public async onDebugImageService(@Context() [interaction]: SlashCommandContext) {
		this.logger.log(
			`User ${interaction.user.tag} (${interaction.user.id}) testing image service`,
			'onDebugImageService'
		);

		await interaction.deferReply({ ephemeral: true });

		try {
			// Get diagnostic information
			const diagnosticInfo = this.imageServiceClient.getDiagnosticInfo();

			const embed = new EmbedBuilder()
				.setTitle('🔍 Image Service Diagnostics')
				.setColor(diagnosticInfo.isAvailable ? Colors.Green : Colors.Red)
				.setTimestamp();

			// Configuration status
			embed.addFields([
				{
					name: '⚙️ Configuration',
					value: [
						`**Base URL:** ${diagnosticInfo.baseUrl}`,
						`**Has API Key:** ${diagnosticInfo.hasApiKey ? '✅' : '❌'}`,
						`**API Key Preview:** ${diagnosticInfo.apiKeyPrefix}`,
						`**Timeout:** ${diagnosticInfo.timeout}ms`,
						`**Is Available:** ${diagnosticInfo.isAvailable ? '✅' : '❌'}`
					].join('\n'),
					inline: false
				}
			]);

			if (!diagnosticInfo.isAvailable) {
				embed.addFields([
					{
						name: '❌ Service Not Available',
						value: [
							'The image service is not properly configured.',
							'**Possible issues:**',
							'• Missing DISCORD_BOT_API_KEY environment variable',
							'• Missing IMAGE_SERVICE_BASE_URL environment variable',
							'• Image service is not running'
						].join('\n'),
						inline: false
					}
				]);
			} else {
				// Test connection
				embed.addFields([
					{
						name: '🔄 Testing Connection...',
						value: 'Attempting to connect to image service...',
						inline: false
					}
				]);

				await interaction.editReply({ embeds: [embed] });

				try {
					const connectionSuccessful = await this.imageServiceClient.testConnection();

					if (connectionSuccessful) {
						embed.spliceFields(-1, 1); // Remove "Testing Connection..." field
						embed.addFields([
							{
								name: '✅ Connection Test',
								value: 'Successfully connected to image service!',
								inline: false
							}
						]);

						// Try to get additional health info
						try {
							const health = await this.imageServiceClient.getHealth();
							embed.addFields([
								{
									name: '💚 Health Status',
									value: [
										`**Status:** ${health.status || 'unknown'}`,
										`**Uptime:** ${health.uptime ? Math.floor(health.uptime / 1000) + 's' : 'unknown'}`,
										`**Version:** ${health.version || 'unknown'}`,
										`**Environment:** ${health.environment || 'unknown'}`
									].join('\n'),
									inline: false
								}
							]);
						} catch (healthError) {
							embed.addFields([
								{
									name: '⚠️ Health Check',
									value: `Could not retrieve health info: ${healthError.message}`,
									inline: false
								}
							]);
						}
					} else {
						embed.spliceFields(-1, 1); // Remove "Testing Connection..." field
						embed.setColor(Colors.Red);
						embed.addFields([
							{
								name: '❌ Connection Test Failed',
								value: [
									'Could not connect to image service.',
									'**Possible causes:**',
									'• Image service is not running',
									'• Wrong base URL configuration',
									'• Network connectivity issues',
									'• Authentication problems'
								].join('\n'),
								inline: false
							}
						]);
					}
				} catch (connectionError) {
					embed.spliceFields(-1, 1); // Remove "Testing Connection..." field
					embed.setColor(Colors.Red);
					embed.addFields([
						{
							name: '💥 Connection Error',
							value: [
								`**Error:** ${connectionError.message}`,
								'**Possible causes:**',
								'• Invalid API key',
								'• Authentication failure (401)',
								'• Service unavailable (503)',
								'• Network timeout'
							].join('\n'),
							inline: false
						}
					]);

					// Log detailed error for debugging
					this.logger.error('Image service connection test failed during debug command:', {
						error: connectionError.message,
						stack: connectionError.stack,
						details: (connectionError as any).details,
						cause: (connectionError as any).cause
					});
				}
			}

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			this.logger.error('Error during image service debug command:', error);

			const errorEmbed = new EmbedBuilder()
				.setTitle('💥 Debug Command Error')
				.setColor(Colors.Red)
				.setDescription(`An error occurred while testing the image service: ${error.message}`)
				.setTimestamp();

			await interaction.editReply({ embeds: [errorEmbed] });
		}
	}
}
