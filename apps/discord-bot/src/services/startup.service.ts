import { Injectable, OnModuleInit } from '@nestjs/common';
import { BaseService } from './base/base.service';
import { LoggerFactory } from '@claude-code/shared';
import { ImageServiceClient } from './image-service/image-service.client';

@Injectable()
export class StartupService extends BaseService implements OnModuleInit {
	constructor(
		loggerFactory: LoggerFactory,
		private readonly imageServiceClient: ImageServiceClient
	) {
		super(StartupService.name, loggerFactory);
	}

	async onModuleInit() {
		this.logger.log('Discord bot starting up - performing health checks...', 'onModuleInit');

		await this.checkImageServiceConnection();

		this.logger.log('Startup health checks completed', 'onModuleInit');
	}

	private async checkImageServiceConnection() {
		this.logger.log('Testing image service connection...', 'checkImageServiceConnection');

		// Log diagnostic information first
		const diagnosticInfo = this.imageServiceClient.getDiagnosticInfo();
		this.logger.log('Image service client configuration:', diagnosticInfo);

		if (!diagnosticInfo.isConfigured) {
			this.logger.warn(
				'Image service is not properly configured - image upload features will be unavailable',
				'checkImageServiceConnection',
				{
					issues: {
						hasApiKey: diagnosticInfo.hasApiKey,
						baseUrl: diagnosticInfo.baseUrl,
						isAvailable: diagnosticInfo.isAvailable
					},
					troubleshooting: {
						step1: 'Check DISCORD_BOT_API_KEY is set in Discord bot .env file',
						step2: 'Check IMAGE_SERVICE_BASE_URL points to running image service',
						step3: 'Ensure image service is running on the configured URL',
						step4: 'Verify DISCORD_BOT_API_KEY is also set in image service .env file (must match!)'
					}
				}
			);
			return;
		}

		try {
			const connectionSuccessful = await this.imageServiceClient.testConnection();

			if (connectionSuccessful) {
				this.logger.log(
					'✅ Image service connection test successful - image uploads are ready',
					'checkImageServiceConnection'
				);

				// Try to get health status for additional info
				try {
					const health = await this.imageServiceClient.getHealth();
					this.logger.log('Image service health status:', health);
				} catch (healthError) {
					this.logger.warn('Could not retrieve image service health status', 'checkImageServiceConnection', {
						error: healthError.message
					});
				}
			} else {
				this.logger.error(
					'❌ Image service connection test failed - image uploads will not work',
					'checkImageServiceConnection'
				);
			}
		} catch (error) {
			this.logger.error('❌ Image service connection test threw an error:', error, 'checkImageServiceConnection');

			// Log detailed error information for debugging
			this.logger.error('Connection test error details:', 'checkImageServiceConnection', {
				message: error.message,
				stack: error.stack,
				cause: (error as any).cause,
				details: (error as any).details,
				troubleshooting: {
					if401: 'API key mismatch - ensure DISCORD_BOT_API_KEY matches in both Discord bot and image service .env files',
					if404: 'Image service endpoint not found - check IMAGE_SERVICE_BASE_URL and verify service is running',
					if503: 'Image service unavailable - check service health and dependencies (Redis)',
					ifTimeout: 'Connection timeout - verify network connectivity and service responsiveness'
				}
			});
		}
	}
}
