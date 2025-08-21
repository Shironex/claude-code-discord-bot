import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ApiKeyGuard } from '../../common/guards';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	/**
	 * Get authentication configuration status
	 */
	@Get('config')
	@UseGuards(ApiKeyGuard)
	@ApiSecurity('api-key')
	@ApiOperation({
		summary: 'Get auth configuration',
		description: 'Returns the current authentication configuration status.',
	})
	@ApiResponse({
		status: 200,
		description: 'Auth configuration status',
		schema: {
			type: 'object',
			properties: {
				hasDiscordBotKey: { type: 'boolean', example: true },
				hasClaudeCodeKey: { type: 'boolean', example: true },
				hasHmacSecret: { type: 'boolean', example: false },
				requireHmac: { type: 'boolean', example: false },
			},
		},
	})
	getAuthConfig(): {
		hasDiscordBotKey: boolean;
		hasClaudeCodeKey: boolean;
		hasHmacSecret: boolean;
		requireHmac: boolean;
	} {
		return this.authService.getAuthConfig();
	}

	/**
	 * Generate setup instructions for authentication
	 */
	@Post('setup')
	@ApiOperation({
		summary: 'Generate auth setup instructions',
		description: 'Generates new API keys and HMAC secret with setup instructions.',
	})
	@ApiResponse({
		status: 201,
		description: 'Setup instructions generated',
		schema: {
			type: 'object',
			properties: {
				envVars: {
					type: 'object',
					properties: {
						DISCORD_BOT_API_KEY: { type: 'string' },
						CLAUDE_CODE_API_KEY: { type: 'string' },
						HMAC_SECRET: { type: 'string' },
					},
				},
				instructions: {
					type: 'array',
					items: { type: 'string' },
				},
			},
		},
	})
	generateSetup(): {
		envVars: Record<string, string>;
		instructions: string[];
	} {
		return this.authService.generateSetupInstructions();
	}

	/**
	 * Test authentication endpoint
	 */
	@Get('test')
	@UseGuards(ApiKeyGuard)
	@ApiSecurity('api-key')
	@ApiOperation({
		summary: 'Test authentication',
		description: 'Test endpoint to verify API key authentication is working.',
	})
	@ApiResponse({
		status: 200,
		description: 'Authentication test successful',
		schema: {
			type: 'object',
			properties: {
				authenticated: { type: 'boolean', example: true },
				source: { type: 'string', enum: ['discord-bot', 'claude-code'] },
				userId: { type: 'string', nullable: true },
				timestamp: { type: 'string', format: 'date-time' },
			},
		},
	})
	testAuth(): {
		authenticated: boolean;
		source: string;
		userId?: string;
		timestamp: string;
	} {
		// This would be populated by the ApiKeyGuard
		// For now, return a basic response
		return {
			authenticated: true,
			source: 'discord-bot', // Would come from authContext
			timestamp: new Date().toISOString(),
		};
	}
}
