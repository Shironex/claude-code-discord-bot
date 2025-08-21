import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IMAGE_CONSTANTS } from '../constants';

/**
 * Guard to validate API key authentication
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
	constructor(private configService: ConfigService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<Request>();
		const apiKey = this.extractApiKey(request);

		if (!apiKey) {
			throw new UnauthorizedException(IMAGE_CONSTANTS.ERRORS.INVALID_API_KEY);
		}

		const validApiKey = this.configService.get<string>('IMAGE_SERVICE_API_KEY');

		if (!validApiKey) {
			throw new UnauthorizedException('API key not configured on server');
		}

		if (apiKey !== validApiKey) {
			throw new UnauthorizedException(IMAGE_CONSTANTS.ERRORS.INVALID_API_KEY);
		}

		return true;
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
}
