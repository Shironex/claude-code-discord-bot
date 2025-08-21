import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { apiReference } from '@scalar/nestjs-api-reference';

/**
 * Creates Swagger document configuration based on environment variables
 */
export const createSwaggerConfig = (configService: ConfigService) => {
	const baseUrl = configService.get<string>('IMAGE_SERVICE_BASE_URL', 'http://localhost:3001');

	return new DocumentBuilder()
		.setTitle('Image Service API')
		.setDescription('Temporary image storage service for Discord bot and Claude Code integration')
		.setVersion('1.0.0')
		.setContact('Claude Code Discord Bot', 'https://github.com/your-org/claude-code-discord-bot', 'support@yourorg.com')
		.setLicense('MIT', 'https://opensource.org/licenses/MIT')
		.addServer(baseUrl, 'API Server')
		.addApiKey(
			{
				type: 'apiKey',
				name: 'x-api-key',
				in: 'header',
				description: 'API key for authentication (Discord bot or Claude Code)',
			},
			'api-key',
		)
		.addApiKey(
			{
				type: 'apiKey',
				name: 'x-signature',
				in: 'header',
				description: 'HMAC signature for request validation',
			},
			'hmac-signature',
		)
		.addTag('upload', 'Image upload operations')
		.addTag('storage', 'Image storage and retrieval')
		.addTag('auth', 'Authentication endpoints')
		.addTag('health', 'Health check endpoints')
		.build();
};

/**
 * Swagger setup options configuration
 */
export const getSwaggerSetupOptions = () => ({
	swaggerOptions: {
		persistAuthorization: true,
		tagsSorter: 'alpha' as const,
		operationsSorter: 'alpha' as const,
	},
	customSiteTitle: 'Image Service API Documentation',
});

/**
 * Swagger service for handling Swagger and Scalar setup
 */
export class SwaggerService {
	/**
	 * Setup Swagger documentation
	 */
	static setupSwagger(app: INestApplication, configService: ConfigService): any {
		const config = createSwaggerConfig(configService);
		const document = SwaggerModule.createDocument(app, config);

		SwaggerModule.setup('api/docs/swagger', app, document, getSwaggerSetupOptions());

		return document;
	}

	/**
	 * Setup Scalar API reference
	 */
	static setupScalar(app: INestApplication, document: any): boolean {
		try {
			app.use(
				'/api/docs/scalar',
				apiReference({
					content: document,
					theme: 'deepSpace',
				}),
			);

			return true;
		} catch {
			return false;
		}
	}
}
