import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { LoggerService } from './logger/logger.service';

async function bootstrap() {
	// Create application context with Winston logger
	const app = await NestFactory.createApplicationContext(AppModule, {
		bufferLogs: true
	});

	// Use Winston logger as the application logger
	const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
	app.useLogger(logger);

	// Create application logger with ConfigService
	const configService = app.get<ConfigService>(ConfigService);
	const appLogger = new LoggerService('Application', {}, configService);

	// Log application startup
	appLogger.info('Discord bot application starting...');

	// Handle graceful shutdown
	process.on('SIGINT', async () => {
		appLogger.info('Received SIGINT, shutting down gracefully...');
		try {
			await appLogger.flush();
			await app.close();
			process.exit(0);
		} catch (error) {
			console.error('Error during graceful shutdown:', error);
			process.exit(1);
		}
	});

	process.on('SIGTERM', async () => {
		appLogger.info('Received SIGTERM, shutting down gracefully...');
		try {
			await appLogger.flush();
			await app.close();
			process.exit(0);
		} catch (error) {
			console.error('Error during graceful shutdown:', error);
			process.exit(1);
		}
	});

	// Handle uncaught exceptions
	process.on('uncaughtException', error => {
		appLogger.error('Uncaught Exception:', error.stack, 'Application');
		appLogger.safeFlush(); // Use safe flush to prevent hanging
		setTimeout(() => process.exit(1), 1000); // Give flush time to complete
	});

	// Handle unhandled promise rejections
	process.on('unhandledRejection', (reason, promise) => {
		appLogger.error('Unhandled Rejection at:', promise.toString(), 'Application', { reason });
		appLogger.safeFlush(); // Use safe flush to prevent hanging
		setTimeout(() => process.exit(1), 1000); // Give flush time to complete
	});

	appLogger.info('Discord bot application started successfully');
}

bootstrap().catch(error => {
	// Create bootstrap logger without ConfigService as fallback
	const logger = new LoggerService('Bootstrap');
	logger.error('Failed to start application:', error.stack, 'bootstrap');
	process.exit(1);
});
