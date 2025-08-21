import { registerAs } from '@nestjs/config';
import { DocumentBuilder } from '@nestjs/swagger';

export default registerAs('swagger', () => {
	return new DocumentBuilder()
		.setTitle('Image Service API')
		.setDescription(
			'A secure, temporary image storage service for Discord bot integration. ' +
				'Supports file uploads with TTL-based expiration, rate limiting, and comprehensive validation.',
		)
		.setVersion('1.0.0')
		.setContact('Claude Code Discord Bot', 'https://github.com/your-org/claude-code-discord-bot', 'support@yourorg.com')
		.setLicense('MIT', 'https://opensource.org/licenses/MIT')
		.addServer('http://localhost:3001', 'Development server')
		.addServer('https://image-service.yourorg.com', 'Production server')
		.addApiKey(
			{
				type: 'apiKey',
				name: 'x-api-key',
				in: 'header',
				description: 'API key for authenticating requests',
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
		.addTag('images', 'Image retrieval and management')
		.addTag('health', 'Service health and monitoring')
		.build();
});
