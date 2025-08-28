import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggerService, LoggerFactory } from '@claude-code/shared';
import { createCorsConfig } from './config/cors.config';
import { createStartupConfig, StartupService } from './config/startup.config';
import { SwaggerService } from './config/swagger.config';
import { createHelmetConfig } from './config/helmet.config';
import fs from 'fs';

async function bootstrap() {
	// Create NestJS application
	const app = await NestFactory.create(AppModule, {
		bufferLogs: true,
	});

	// Use our custom logger as the application logger
	const loggerFactory = app.get(LoggerFactory);
	const nestLogger = loggerFactory.createLogger('NestJS');
	app.useLogger(nestLogger);

	// Get configuration service and create startup config
	const configService = app.get(ConfigService);
	const startupConfig = createStartupConfig(configService);
	const startupService = new StartupService(configService, startupConfig);

	// Create application logger with ConfigService
	const logger = new LoggerService('ImageService', {}, configService as any);

	// Security middleware with configuration from helmet.config.ts
	app.use(helmet(createHelmetConfig(configService)));

	// Enable CORS with configuration from cors.config.ts
	app.enableCors(createCorsConfig(configService));

	// Global validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true,
		}),
	);

	// API prefix from startup config
	app.setGlobalPrefix(startupConfig.globalPrefix);

	// Swagger documentation (only if enabled)
	let document: any;
	if (startupConfig.enableSwagger) {
		document = SwaggerService.setupSwagger(app, configService);
	}

	// Only setup Scalar API reference if enabled
	if (startupConfig.enableScalar && document) {
		const scalarSetupSuccess = SwaggerService.setupScalar(app, document);

		if (scalarSetupSuccess) {
			startupService.logScalarSetup();
		} else {
			startupService.logScalarWarning();
		}
	}

	// Only write swagger spec in development
	const environment = configService.get<string>('NODE_ENV', 'development');
	if (environment !== 'production' && document) {
		fs.writeFileSync('./swagger-spec.json', JSON.stringify(document));
	}

	// Start server
	const port = configService.get<number>('PORT', 3001);
	await app.listen(port);

	// Log startup information using startup service
	startupService.logStartupInfo();
	logger.info('Image Service application started successfully');

	// Handle graceful shutdown
	process.on('SIGINT', () => {
		void (async () => {
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
		})();
	});

	process.on('SIGTERM', () => {
		void (async () => {
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
		})();
	});

	// Handle uncaught exceptions
	process.on('uncaughtException', (error) => {
		void (async () => {
			logger.error('Uncaught Exception:', error.stack, 'ImageService');
			await logger.safeFlush(); // Use safe flush to prevent hanging
			setTimeout(() => process.exit(1), 1000); // Give flush time to complete
		})();
	});

	// Handle unhandled promise rejections
	process.on('unhandledRejection', (reason, promise) => {
		void (async () => {
			logger.error('Unhandled Rejection at:', promise, 'ImageService', { reason });
			await logger.safeFlush(); // Use safe flush to prevent hanging
			setTimeout(() => process.exit(1), 1000); // Give flush time to complete
		})();
	});
}

bootstrap().catch((error) => {
	// Create bootstrap logger without ConfigService as fallback
	const logger = new LoggerService('Bootstrap');
	logger.error('Failed to start image service:', error.stack, 'bootstrap');
	process.exit(1);
});
