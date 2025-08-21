import { registerAs } from '@nestjs/config';

export interface StartupConfig {
	enableSwagger: boolean;
	enableScheduler: boolean;
	enableMetrics: boolean;
	gracefulShutdownTimeout: number;
	healthCheckPath: string;
	metricsPath: string;
	swaggerPath: string;
	globalPrefix: string;
	enableVersioning: boolean;
	defaultVersion: string;
}

export default registerAs('startup', (): StartupConfig => {
	const isDevelopment = process.env.NODE_ENV === 'development';

	return {
		enableSwagger: process.env.ENABLE_SWAGGER === 'true' || isDevelopment,
		enableScheduler: process.env.ENABLE_SCHEDULER !== 'false', // Default to true
		enableMetrics: process.env.ENABLE_METRICS === 'true' || isDevelopment,
		gracefulShutdownTimeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '10000', 10),
		healthCheckPath: process.env.HEALTH_CHECK_PATH || '/health',
		metricsPath: process.env.METRICS_PATH || '/metrics',
		swaggerPath: process.env.SWAGGER_PATH || '/api',
		globalPrefix: process.env.GLOBAL_PREFIX || '',
		enableVersioning: process.env.ENABLE_VERSIONING === 'true',
		defaultVersion: process.env.DEFAULT_VERSION || '1',
	};
});
