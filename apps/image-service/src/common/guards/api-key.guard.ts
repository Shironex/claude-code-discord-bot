import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IMAGE_CONSTANTS } from '../constants';

export interface AuthContext {
	source: 'discord-bot' | 'claude-code';
	userId?: string;
	authenticated: boolean;
}

/**
 * Guard to validate API key authentication
 * Supports both Discord bot and Claude Code (GitHub Actions) API keys
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
	private readonly logger = new Logger(ApiKeyGuard.name);

	constructor(private readonly configService: ConfigService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<Request>();
		const apiKey = this.extractApiKey(request);

		if (!apiKey) {
			this.logger.warn('No API key provided in request');
			throw new UnauthorizedException(IMAGE_CONSTANTS.ERRORS.INVALID_API_KEY);
		}

		const authResult = this.validateApiKey(apiKey);

		if (!authResult.isValid) {
			this.logger.warn(`Authentication failed: ${authResult.reason}`);
			throw new UnauthorizedException(IMAGE_CONSTANTS.ERRORS.INVALID_API_KEY);
		}

		// Add auth context to request for later use
		const authContext: AuthContext = {
			source: authResult.source,
			userId: this.extractUserId(request, authResult.source),
			authenticated: true,
		};

		request['authContext'] = authContext;
		this.logger.debug(`Authenticated request from ${authResult.source}`);

		return true;
	}

	private validateApiKey(apiKey: string): {
		isValid: boolean;
		source: 'discord-bot' | 'claude-code';
		reason?: string;
	} {
		// Discord bot API key
		const discordApiKey =
			this.configService.get<string>('imageService.auth.discordBotApiKey') || this.configService.get<string>('DISCORD_BOT_API_KEY');

		if (discordApiKey && this.secureCompare(apiKey, discordApiKey)) {
			return { isValid: true, source: 'discord-bot' };
		}

		// Claude Code API key (GitHub Actions)
		const claudeApiKey =
			this.configService.get<string>('imageService.auth.claudeCodeApiKey') || this.configService.get<string>('CLAUDE_CODE_API_KEY');

		if (claudeApiKey && this.secureCompare(apiKey, claudeApiKey)) {
			return { isValid: true, source: 'claude-code' };
		}

		return {
			isValid: false,
			source: 'discord-bot', // Default for error response
			reason: 'Invalid API key or no API keys configured',
		};
	}

	private extractApiKey(request: Request): string | undefined {
		// Check header first
		const headerKey = request.headers[IMAGE_CONSTANTS.API_KEY_HEADER] as string;

		if (headerKey) {
			return headerKey;
		}

		// Check authorization header as fallback (Bearer token)
		const authHeader = request.headers.authorization;
		if (authHeader && authHeader.startsWith('Bearer ')) {
			return authHeader.substring(7);
		}

		// Check query parameter as last resort (not recommended for production)
		return request.query.apiKey as string;
	}

	private extractUserId(request: Request, source: string): string | undefined {
		const headers = request.headers as Record<string, string>;

		// For Discord bot requests, check for Discord user ID
		if (source === 'discord-bot') {
			return headers['x-discord-user-id'] || headers['x-user-id'];
		}

		// For Claude Code requests, use workflow or repository info
		if (source === 'claude-code') {
			return headers['x-github-repository'] || headers['x-workflow-id'] || 'claude-code';
		}

		// Generic user ID header
		return headers['x-user-id'];
	}

	private secureCompare(a: string, b: string): boolean {
		if (a.length !== b.length) {
			return false;
		}

		let result = 0;
		for (let i = 0; i < a.length; i++) {
			result |= a.charCodeAt(i) ^ b.charCodeAt(i);
		}

		return result === 0;
	}
}
