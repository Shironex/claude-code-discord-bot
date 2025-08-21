import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import fs from 'fs';

async function bootstrap() {
	const logger = new Logger('Bootstrap');

	// Create NestJS application
	const app = await NestFactory.create(AppModule);

	// Get configuration service
	const configService = app.get(ConfigService);

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

	// Enable CORS - Allow multiple origins for different environments
	const corsOrigins = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000,https://github.com,https://actions.github.com');
	const allowedOrigins = corsOrigins
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);

	app.enableCors({
		origin: (origin: string | undefined, callback: (error: Error | null, success?: boolean) => void) => {
			// Allow requests with no origin (like mobile apps, curl, Postman, or server-to-server)
			if (!origin) return callback(null, true);

			// Check if origin matches any allowed origins or patterns
			const isAllowed = allowedOrigins.some((allowedOrigin) => {
				// Exact match
				if (origin === allowedOrigin) return true;

				// GitHub Actions runners (dynamic IPs)
				if (allowedOrigin === 'https://github.com' && origin.includes('github')) return true;
				if (allowedOrigin === 'https://actions.github.com' && origin.includes('github')) return true;

				// Self-hosted runners (configurable)
				if (allowedOrigin === '*') return true;

				return false;
			});

			if (isAllowed) {
				callback(null, true);
			} else {
				console.warn(`CORS blocked origin: ${origin}`);
				callback(new Error('Not allowed by CORS'), false);
			}
		},
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-timestamp', 'x-signature'],
		credentials: false, // API key auth doesn't need credentials
	});

	// Global validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true,
		}),
	);

	// API prefix
	app.setGlobalPrefix('api/v1');

	// Swagger documentation
	const swaggerConfig = new DocumentBuilder()
		.setTitle('Image Service API')
		.setDescription('Temporary image storage service for Discord bot and Claude Code integration')
		.setVersion('1.0.0')
		.addTag('upload', 'Image upload operations')
		.addTag('storage', 'Image storage and retrieval')
		.addTag('auth', 'Authentication endpoints')
		.addTag('health', 'Health check endpoints')
		.addApiKey(
			{
				type: 'apiKey',
				name: 'x-api-key',
				in: 'header',
				description: 'API key for authentication (Discord bot or Claude Code)',
			},
			'api-key',
		)
		.addServer('http://localhost:3001', 'Development server')
		.addServer('https://your-domain.com', 'Production server')
		.build();

	const document = SwaggerModule.createDocument(app, swaggerConfig);

	SwaggerModule.setup('api/docs/swagger', app, document, {
		swaggerOptions: {
			persistAuthorization: true,
			tagsSorter: 'alpha',
			operationsSorter: 'alpha',
		},
		customSiteTitle: 'Image Service API Documentation',
	});

	// Only setup Scalar API reference in development
	const environment = configService.get<string>('NODE_ENV', 'development');
	if (environment !== 'production') {
		try {
			// Dynamic import to avoid production dependency issues
			const { apiReference } = await import('@scalar/nestjs-api-reference');

			app.use(
				'/api/docs/scalar',
				apiReference({
					content: document,
					theme: 'deepSpace',
				}),
			);

			logger.log(`📚 API Scalar Reference available at: http://localhost:${configService.get<number>('PORT', 3001)}/api/docs/scalar`);
		} catch {
			logger.warn('Scalar API reference not available (dev dependency not installed)');
		}
	}

	// Only write swagger spec in development
	if (environment !== 'production') {
		fs.writeFileSync('./swagger-spec.json', JSON.stringify(document));
	}

	// Start server
	const port = configService.get<number>('PORT', 3001);
	await app.listen(port);

	logger.log(`🚀 Image Service API is running on: http://localhost:${port}/api/v1`);
	logger.log(`📚 API Documentation available at: http://localhost:${port}/api/docs/swagger`);
	if (environment !== 'production') {
		// Scalar reference log is handled above when setting it up
	}
	logger.log(`🏥 Health check available at: http://localhost:${port}/api/v1/health`);

	// Log configuration status
	const hasDiscordKey = !!configService.get<string>('DISCORD_BOT_API_KEY');
	const hasClaudeKey = !!configService.get<string>('CLAUDE_CODE_API_KEY');
	const hasHmacSecret = !!configService.get<string>('HMAC_SECRET');

	logger.log(`Environment: ${environment}`);
	logger.log(`Auth configuration: Discord=${hasDiscordKey}, Claude=${hasClaudeKey}, HMAC=${hasHmacSecret}`);
}

void bootstrap();
