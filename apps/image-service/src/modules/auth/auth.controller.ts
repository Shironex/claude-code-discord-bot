import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ApiKeyGuard } from '../../common/guards';
import { ApiGetAuthConfig, ApiTestAuth } from './auth.swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	/**
	 * Get authentication configuration status
	 */
	@Get('config')
	@UseGuards(ApiKeyGuard)
	@ApiGetAuthConfig()
	getAuthConfig(): {
		hasDiscordBotKey: boolean;
		hasClaudeCodeKey: boolean;
		hasHmacSecret: boolean;
		requireHmac: boolean;
	} {
		return this.authService.getAuthConfig();
	}

	/**
	 * Test authentication endpoint
	 */
	@Get('test')
	@UseGuards(ApiKeyGuard)
	@ApiTestAuth()
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
