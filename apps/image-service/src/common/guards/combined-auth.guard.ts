import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ApiKeyGuard } from './api-key.guard';
import { HmacGuard } from './hmac.guard';

/**
 * Combined authentication guard that validates both API key and HMAC signature
 * Provides the highest level of security for sensitive endpoints
 */
@Injectable()
export class CombinedAuthGuard implements CanActivate {
	private readonly logger = new Logger(CombinedAuthGuard.name);

	constructor(
		private readonly configService: ConfigService,
		private readonly apiKeyGuard: ApiKeyGuard,
		private readonly hmacGuard: HmacGuard,
	) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<Request>();

		try {
			// First validate API key
			const apiKeyResult = this.apiKeyGuard.canActivate(context);
			if (!apiKeyResult) {
				throw new UnauthorizedException('API key validation failed');
			}

			// Then validate HMAC signature (only if enabled)
			const requireHmac = this.configService.get<boolean>('imageService.auth.requireHmac', false);

			if (requireHmac) {
				const hmacResult = this.hmacGuard.canActivate(context);
				if (!hmacResult) {
					throw new UnauthorizedException('HMAC validation failed');
				}

				this.logger.debug('Combined auth successful: API key + HMAC validated');
			} else {
				this.logger.debug('Combined auth successful: API key validated (HMAC not required)');
			}

			// Add combined auth context
			request['combinedAuth'] = {
				authenticated: true,
				apiKeyValidated: true,
				hmacValidated: requireHmac,
				source: request['authContext']?.source || 'unknown',
			};

			return true;
		} catch (error) {
			this.logger.warn(`Combined authentication failed: ${error.message}`);
			throw error;
		}
	}
}
