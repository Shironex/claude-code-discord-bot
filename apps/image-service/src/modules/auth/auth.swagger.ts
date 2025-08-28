import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ApiAuthRequired, ApiErrorResponses } from '../../common/decorators/swagger.decorators';

/**
 * Swagger documentation for authentication configuration endpoint
 */
export function ApiGetAuthConfig() {
	return applyDecorators(
		ApiOperation({
			summary: 'Get authentication configuration status',
			description:
				'Returns information about the current authentication setup, including which authentication methods are available and properly configured. Useful for debugging authentication issues.',
		}),
		ApiAuthRequired({
			description: 'This endpoint itself requires authentication to view auth status',
		}),
		ApiResponse({
			status: 200,
			description: 'Authentication configuration status',
			schema: {
				type: 'object',
				properties: {
					hasDiscordBotKey: {
						type: 'boolean',
						example: true,
						description: 'Whether Discord bot API key is configured',
					},
					hasClaudeCodeKey: {
						type: 'boolean',
						example: true,
						description: 'Whether Claude Code API key is configured',
					},
					hasHmacSecret: {
						type: 'boolean',
						example: false,
						description: 'Whether HMAC signature validation is configured',
					},
					requireHmac: {
						type: 'boolean',
						example: false,
						description: 'Whether HMAC signature validation is required',
					},
					authMethods: {
						type: 'array',
						items: {
							type: 'string',
							enum: ['api-key', 'hmac-signature'],
						},
						example: ['api-key'],
						description: 'List of enabled authentication methods',
					},
					keyValidation: {
						type: 'object',
						description: 'API key validation configuration',
						properties: {
							keyFormat: { type: 'string', example: 'base64url', description: 'Expected key format' },
							minLength: { type: 'number', example: 32, description: 'Minimum key length' },
							sources: {
								type: 'array',
								items: { type: 'string' },
								example: ['discord-bot', 'claude-code'],
								description: 'Configured key sources',
							},
						},
					},
				},
			},
		}),
		ApiErrorResponses({ includeAuth: true }),
	);
}

/**
 * Swagger documentation for authentication test endpoint
 */
export function ApiTestAuth() {
	return applyDecorators(
		ApiOperation({
			summary: 'Test authentication',
			description:
				'Test endpoint to verify that API key authentication is working correctly. Returns authentication context and metadata about the authenticated request.',
		}),
		ApiAuthRequired({
			description: 'Test your API key authentication with this endpoint',
		}),
		ApiHeader({
			name: 'x-api-key',
			description: 'Your API key (Discord bot or Claude Code)',
			required: true,
			example: 'discord_AbCdEf1234567890_base64url_encoded_key',
		}),
		ApiHeader({
			name: 'x-signature',
			description: 'HMAC signature (optional, if HMAC is configured)',
			required: false,
			example: 'sha256=abc123def456...',
		}),
		ApiHeader({
			name: 'x-timestamp',
			description: 'Request timestamp for HMAC (required if using HMAC)',
			required: false,
			example: '1642694400',
		}),
		ApiResponse({
			status: 200,
			description: 'Authentication test successful',
			schema: {
				type: 'object',
				properties: {
					authenticated: {
						type: 'boolean',
						example: true,
						description: 'Confirmation that authentication succeeded',
					},
					source: {
						type: 'string',
						enum: ['discord-bot', 'claude-code', 'unknown'],
						example: 'discord-bot',
						description: 'Which API key source was used',
					},
					userId: {
						type: 'string',
						nullable: true,
						example: 'bot_123456',
						description: 'User/bot identifier if available',
					},
					timestamp: {
						type: 'string',
						format: 'date-time',
						example: '2024-01-20T16:45:00.000Z',
						description: 'Server timestamp when auth was verified',
					},
					authMethod: {
						type: 'string',
						enum: ['api-key-only', 'api-key-with-hmac'],
						example: 'api-key-only',
						description: 'Authentication method used',
					},
					permissions: {
						type: 'array',
						items: { type: 'string' },
						example: ['upload', 'download', 'delete'],
						description: 'Permissions granted to this API key',
					},
					rateLimit: {
						type: 'object',
						description: 'Rate limiting information for this key',
						properties: {
							remaining: { type: 'number', example: 47 },
							reset: { type: 'string', format: 'date-time' },
							limit: { type: 'number', example: 50 },
						},
					},
				},
			},
		}),
		ApiResponse({
			status: 401,
			description: 'Authentication failed - Invalid or missing API key',
			schema: {
				type: 'object',
				properties: {
					statusCode: { type: 'number', example: 401 },
					message: {
						type: 'string',
						example: 'Invalid API key or missing authentication header',
					},
					error: { type: 'string', example: 'Unauthorized' },
					details: {
						type: 'object',
						properties: {
							reason: {
								type: 'string',
								enum: ['missing-header', 'invalid-format', 'key-not-found', 'key-expired'],
								example: 'invalid-format',
							},
							hint: {
								type: 'string',
								example: 'API key should be in format: source_key_base64url',
							},
						},
					},
				},
			},
		}),
		ApiResponse({
			status: 403,
			description: 'HMAC signature validation failed',
			schema: {
				type: 'object',
				properties: {
					statusCode: { type: 'number', example: 403 },
					message: { type: 'string', example: 'HMAC signature validation failed' },
					error: { type: 'string', example: 'Forbidden' },
					details: {
						type: 'object',
						properties: {
							reason: {
								type: 'string',
								enum: ['missing-signature', 'invalid-signature', 'timestamp-mismatch', 'replay-attack'],
								example: 'invalid-signature',
							},
							timestamp: { type: 'number', example: 1642694400 },
						},
					},
				},
			},
		}),
	);
}

/**
 * Swagger documentation for HMAC signature generation helper (if implemented)
 */
export function ApiHmacHelper() {
	return applyDecorators(
		ApiOperation({
			summary: 'HMAC signature generation helper',
			description:
				'Helper endpoint that demonstrates how to generate HMAC signatures for authenticated requests. Only available in development mode.',
		}),
		ApiAuthRequired(),
		ApiResponse({
			status: 200,
			description: 'HMAC signature generation example',
			schema: {
				type: 'object',
				properties: {
					example: {
						type: 'object',
						properties: {
							method: { type: 'string', example: 'POST' },
							path: { type: 'string', example: '/upload' },
							body: { type: 'string', example: 'binary file data' },
							timestamp: { type: 'number', example: 1642694400 },
							signature: { type: 'string', example: 'sha256=abc123def456...' },
						},
					},
					algorithm: { type: 'string', example: 'SHA256' },
					instructions: {
						type: 'array',
						items: { type: 'string' },
						example: [
							'1. Concatenate: METHOD + PATH + BODY + TIMESTAMP',
							'2. Generate HMAC-SHA256 with secret key',
							'3. Include signature in x-signature header',
							'4. Include timestamp in x-timestamp header',
						],
					},
				},
			},
		}),
		ApiResponse({
			status: 404,
			description: 'HMAC helper not available (production mode or HMAC not configured)',
		}),
	);
}

/**
 * Authentication overview documentation
 */
export function ApiAuthOverview() {
	return applyDecorators(
		ApiOperation({
			summary: 'Authentication Overview',
			description: `
**Authentication Methods**

This API supports two authentication methods:

1. **API Key Authentication** (Required)
   - Header: \`x-api-key: source_key_base64url\`
   - Supported sources: discord-bot, claude-code
   - Format: \`{source}_{key}_{encoding}\`

2. **HMAC Signature Authentication** (Optional)
   - Header: \`x-signature: sha256=signature\`
   - Header: \`x-timestamp: unix_timestamp\`
   - Prevents replay attacks and ensures request integrity

**Usage Examples**

API Key Only:
\`\`\`
curl -H "x-api-key: discord_AbCdEf1234567890_base64url" https://api.example.com/upload
\`\`\`

With HMAC Signature:
\`\`\`
curl -H "x-api-key: discord_key_here" \\
     -H "x-signature: sha256=computed_signature" \\
     -H "x-timestamp: 1642694400" \\
     https://api.example.com/upload
\`\`\`

**Security Notes**
- API keys should be stored securely and rotated regularly
- HMAC signatures prevent request tampering and replay attacks
- All authentication failures are logged for security monitoring
			`,
		}),
	);
}

/**
 * Complete Swagger documentation for auth module
 */
export function ApiAuthModule() {
	return applyDecorators(
		// Module-level documentation
		ApiAuthOverview(),
	);
}
