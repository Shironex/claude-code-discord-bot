import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(private readonly configService: ConfigService) {}

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
}
