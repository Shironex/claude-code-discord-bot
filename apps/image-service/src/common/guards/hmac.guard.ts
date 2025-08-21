import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import { IMAGE_CONSTANTS } from '../constants';

/**
 * Guard to validate HMAC signature authentication
 * Provides additional security by verifying request integrity
 */
@Injectable()
export class HmacGuard implements CanActivate {
	constructor(private configService: ConfigService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<Request>();

		const signature = request.headers[IMAGE_CONSTANTS.HMAC_SIGNATURE_HEADER] as string;
		const timestamp = request.headers[IMAGE_CONSTANTS.TIMESTAMP_HEADER] as string;

		if (!signature || !timestamp) {
			throw new UnauthorizedException('Missing HMAC signature or timestamp');
		}

		// Check timestamp to prevent replay attacks
		const requestTime = parseInt(timestamp, 10);
		const currentTime = Date.now();
		const timeDrift = Math.abs(currentTime - requestTime);

		if (timeDrift > IMAGE_CONSTANTS.MAX_TIMESTAMP_DRIFT) {
			throw new UnauthorizedException(IMAGE_CONSTANTS.ERRORS.TIMESTAMP_TOO_OLD);
		}

		// Verify HMAC signature
		if (!this.verifySignature(request, signature, timestamp)) {
			throw new UnauthorizedException(IMAGE_CONSTANTS.ERRORS.INVALID_SIGNATURE);
		}

		return true;
	}

	private verifySignature(request: Request, providedSignature: string, timestamp: string): boolean {
		const secret = this.configService.get<string>('IMAGE_SERVICE_HMAC_SECRET');
		if (!secret) {
			throw new UnauthorizedException('HMAC secret not configured on server');
		}

		// Create payload for signature
		const method = request.method;
		const path = request.path;
		const body = this.getRequestBody(request);

		// Format: timestamp|method|path|body
		const payload = `${timestamp}|${method}|${path}|${body}`;

		// Generate expected signature
		const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

		// Use secure comparison to prevent timing attacks
		return this.secureCompare(providedSignature, expectedSignature);
	}

	private getRequestBody(request: Request): string {
		// For multipart/form-data (file uploads), we can't easily include body in signature
		// So we'll use a simplified approach for file upload endpoints
		if (request.headers['content-type']?.includes('multipart/form-data')) {
			return ''; // Empty body for multipart uploads
		}

		// For JSON requests, stringify the body
		if (request.body && typeof request.body === 'object') {
			return JSON.stringify(request.body);
		}

		return request.body || '';
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
