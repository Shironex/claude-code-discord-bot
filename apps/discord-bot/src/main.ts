import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { LoggerService, LoggerFactory } from '@claude-code/shared';

async function bootstrap() {
	// Create application context for Discord bot (not HTTP server)
	const app = await NestFactory.createApplicationContext(AppModule, {
		bufferLogs: true
	});

	// Use our custom logger as the application logger
	const loggerFactory = app.get(LoggerFactory);
	const nestLogger = loggerFactory.createLogger('NestJS');
	app.useLogger(nestLogger);

	// Create application logger with ConfigService
	const configService = app.get<ConfigService>(ConfigService);
	const logger = new LoggerService('Application', {}, configService as any);

	// Log application startup
	logger.info('Discord bot application starting...');

	// Handle graceful shutdown
	process.on('SIGINT', async () => {
		logger.info('Received SIGINT, shutting down gracefully...');
		try {
			await logger.flush();
			await app.close();
			process.exit(0);
		} catch (error) {
			try {
				logger.error('Error during graceful shutdown (SIGINT):', error);
			} catch {
				// Fallback to console if logger fails
				console.error('Error during graceful shutdown (SIGINT):', error);
			}
			process.exit(1);
		}
	});

	process.on('SIGTERM', async () => {
		logger.info('Received SIGTERM, shutting down gracefully...');
		try {
			await logger.flush();
			await app.close();
			process.exit(0);
		} catch (error) {
			try {
				logger.error('Error during graceful shutdown (SIGTERM):', error);
			} catch {
				// Fallback to console if logger fails
				console.error('Error during graceful shutdown (SIGTERM):', error);
			}
			process.exit(1);
		}
	});

	// Handle uncaught exceptions
	process.on('uncaughtException', error => {
		logger.error('Uncaught Exception:', error.stack, 'Application');
		logger.safeFlush(); // Use safe flush to prevent hanging
		setTimeout(() => process.exit(1), 1000); // Give flush time to complete
	});

	// Handle unhandled promise rejections
	process.on('unhandledRejection', (reason, promise) => {
		logger.error('Unhandled Rejection at:', promise.toString(), 'Application', { reason });
		logger.safeFlush(); // Use safe flush to prevent hanging
		setTimeout(() => process.exit(1), 1000); // Give flush time to complete
	});

	logger.info('Discord bot application started successfully');
}

bootstrap().catch(error => {
	// Create bootstrap logger without ConfigService as fallback
	const logger = new LoggerService('Bootstrap');
	logger.error('Failed to start application:', error.stack, 'bootstrap');
	process.exit(1);
});
