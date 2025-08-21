import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createCorsConfig } from './config/cors.config';
import { createStartupConfig, StartupService } from './config/startup.config';
import { SwaggerService } from './config/swagger.config';
import fs from 'fs';

async function bootstrap() {
	// Create NestJS application
	const app = await NestFactory.create(AppModule);

	// Get configuration service and create startup config
	const configService = app.get(ConfigService);
	const startupConfig = createStartupConfig(configService);
	const startupService = new StartupService(configService, startupConfig);

	// Security middleware
	app.use(
		helmet({
			crossOriginEmbedderPolicy: false, // Needed for Swagger/Scalar UI
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
					styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
					imgSrc: ["'self'", 'data:', 'blob:'],
					connectSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.scalar.com'],
					fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.scalar.com'],
					objectSrc: ["'none'"],
					mediaSrc: ["'self'"],
					frameSrc: ["'self'"],
				},
			},
		}),
	);

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
}

void bootstrap();
