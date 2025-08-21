import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(private readonly configService: ConfigService) {}

	/**
	 * Generate API key for service configuration
	 * Helper method for setting up authentication
	 */
	generateApiKey(prefix?: string): string {
		const bytes = randomBytes(32);
		const apiKey = bytes.toString('base64url');
		return prefix ? `${prefix}_${apiKey}` : apiKey;
	}

	/**
	 * Generate HMAC secret for service configuration
	 */
	generateHmacSecret(): string {
		return randomBytes(64).toString('base64');
	}

	/**
	 * Get auth configuration summary
	 */
	getAuthConfig(): {
		hasDiscordBotKey: boolean;
		hasClaudeCodeKey: boolean;
		hasHmacSecret: boolean;
		requireHmac: boolean;
	} {
		return {
			hasDiscordBotKey: !!(
				this.configService.get<string>('imageService.auth.discordBotApiKey') ||
				this.configService.get<string>('DISCORD_BOT_API_KEY')
			),
			hasClaudeCodeKey: !!(
				this.configService.get<string>('imageService.auth.claudeCodeApiKey') ||
				this.configService.get<string>('CLAUDE_CODE_API_KEY')
			),
			hasHmacSecret: !!(
				this.configService.get<string>('imageService.auth.hmacSecret') || this.configService.get<string>('HMAC_SECRET')
			),
			requireHmac: this.configService.get<boolean>('imageService.auth.requireHmac', false),
		};
	}

	/**
	 * Generate setup instructions for authentication
	 */
	generateSetupInstructions(): {
		envVars: Record<string, string>;
		instructions: string[];
	} {
		const discordApiKey = this.generateApiKey('discord');
		const claudeApiKey = this.generateApiKey('claude');
		const hmacSecret = this.generateHmacSecret();

		return {
			envVars: {
				DISCORD_BOT_API_KEY: discordApiKey,
				CLAUDE_CODE_API_KEY: claudeApiKey,
				HMAC_SECRET: hmacSecret,
			},
			instructions: [
				'Add the following environment variables to your .env file:',
				'DISCORD_BOT_API_KEY - For Discord bot authentication',
				'CLAUDE_CODE_API_KEY - For Claude Code (GitHub Actions) authentication',
				'HMAC_SECRET - For HMAC signature validation (optional but recommended)',
				'',
				'Usage in Discord bot:',
				`headers: { 'x-api-key': '${discordApiKey}' }`,
				'',
				'Usage in GitHub Actions:',
				'Set CLAUDE_CODE_API_KEY as a repository secret',
				"headers: { 'x-api-key': '${{ secrets.CLAUDE_CODE_API_KEY }}' }",
			],
		};
	}
}
