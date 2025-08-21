import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface StartupConfig {
	enableSwagger: boolean;
	enableScalar: boolean;
	enableScheduler: boolean;
	enableMetrics: boolean;
	gracefulShutdownTimeout: number;
	healthCheckPath: string;
	metricsPath: string;
	swaggerPath: string;
	globalPrefix: string;
	enableVersioning: boolean;
	defaultVersion: string;
	baseUrl: string;
}

/**
 * Creates startup configuration based on environment variables
 */
export const createStartupConfig = (configService: ConfigService): StartupConfig => {
	const isDevelopment = configService.get<string>('NODE_ENV', 'development') === 'development';
	const port = configService.get<number>('PORT', 3001);
	const baseUrl = configService.get<string>('IMAGE_SERVICE_BASE_URL', `http://localhost:${port}`);

	return {
		enableSwagger: configService.get<string>('ENABLE_SWAGGER') === 'true' || isDevelopment,
		enableScalar: isDevelopment, // Only enable Scalar in development
		enableScheduler: configService.get<string>('ENABLE_SCHEDULER') !== 'false', // Default to true
		enableMetrics: configService.get<string>('ENABLE_METRICS') === 'true' || isDevelopment,
		gracefulShutdownTimeout: parseInt(configService.get<string>('GRACEFUL_SHUTDOWN_TIMEOUT', '10000'), 10),
		healthCheckPath: configService.get<string>('HEALTH_CHECK_PATH', '/health'),
		metricsPath: configService.get<string>('METRICS_PATH', '/metrics'),
		swaggerPath: configService.get<string>('SWAGGER_PATH', '/api'),
		globalPrefix: configService.get<string>('GLOBAL_PREFIX', 'api/v1'),
		enableVersioning: configService.get<string>('ENABLE_VERSIONING') === 'true',
		defaultVersion: configService.get<string>('DEFAULT_VERSION', '1'),
		baseUrl,
	};
};

/**
 * Startup service that handles application initialization logging
 */
export class StartupService {
	private readonly logger = new Logger('StartupService');

	constructor(
		private readonly configService: ConfigService,
		private readonly startupConfig: StartupConfig,
	) {}

	/**
	 * Log application startup information
	 */
	logStartupInfo(): void {
		const environment = this.configService.get<string>('NODE_ENV', 'development');

		this.logger.log(`🚀 Image Service API is running on: ${this.startupConfig.baseUrl}/${this.startupConfig.globalPrefix}`);

		if (this.startupConfig.enableSwagger) {
			this.logger.log(`📚 API Documentation available at: ${this.startupConfig.baseUrl}/api/docs/swagger`);
		}

		if (this.startupConfig.enableScalar) {
			this.logger.log(`📚 API Scalar Reference available at: ${this.startupConfig.baseUrl}/api/docs/scalar`);
		}

		this.logger.log(
			`🏥 Health check available at: ${this.startupConfig.baseUrl}/${this.startupConfig.globalPrefix}${this.startupConfig.healthCheckPath}`,
		);

		this.logEnvironmentInfo(environment);
		this.logAuthConfiguration();
	}

	/**
	 * Log Scalar API reference setup info
	 */
	logScalarSetup(): void {
		if (this.startupConfig.enableScalar) {
			this.logger.log(`📚 API Scalar Reference available at: ${this.startupConfig.baseUrl}/api/docs/scalar`);
		}
	}

	/**
	 * Log Scalar setup warning
	 */
	logScalarWarning(): void {
		this.logger.warn('Scalar API reference not available (dev dependency not installed)');
	}

	/**
	 * Log environment information
	 */
	private logEnvironmentInfo(environment: string): void {
		this.logger.log(`Environment: ${environment}`);
	}

	/**
	 * Log authentication configuration status
	 */
	private logAuthConfiguration(): void {
		const hasDiscordKey = !!this.configService.get<string>('DISCORD_BOT_API_KEY');
		const hasClaudeKey = !!this.configService.get<string>('CLAUDE_CODE_API_KEY');
		const hasHmacSecret = !!this.configService.get<string>('HMAC_SECRET');

		this.logger.log(`Auth configuration: Discord=${hasDiscordKey}, Claude=${hasClaudeKey}, HMAC=${hasHmacSecret}`);
	}
}
