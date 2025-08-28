import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

export interface HmacContext {
	validated: boolean;
	timestamp: string;
	maxAge?: number;
}

/**
 * Guard to validate HMAC signatures for enhanced security
 * Prevents replay attacks and ensures request integrity
 */
@Injectable()
export class HmacGuard implements CanActivate {
	private readonly logger = new Logger(HmacGuard.name);

	constructor(private readonly configService: ConfigService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<Request>();

		try {
			const hmacOptions = this.extractHmacOptions(request);
			const validationResult = this.validateHmacSignature(hmacOptions);

			if (!validationResult.isValid) {
				this.logger.warn(`HMAC validation failed: ${validationResult.reason}`);
				throw new UnauthorizedException('Invalid HMAC signature');
			}

			// Add HMAC validation context to request
			const hmacContext: HmacContext = {
				validated: true,
				timestamp: hmacOptions.timestamp,
				maxAge: hmacOptions.maxAge,
			};

			request['hmacContext'] = hmacContext;
			this.logger.debug('HMAC signature validated successfully');

			return true;
		} catch (error) {
			if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
				throw error;
			}

			this.logger.error('Error during HMAC validation', error);
			throw new UnauthorizedException('HMAC validation failed');
		}
	}

	private extractHmacOptions(request: Request): {
		timestamp: string;
		signature: string;
		body: string;
		maxAge?: number;
	} {
		// Extract timestamp
		const timestamp = request.headers['x-timestamp'] as string;
		if (!timestamp) {
			throw new BadRequestException('Missing x-timestamp header for HMAC validation');
		}

		// Extract signature
		const signature = request.headers['x-signature'] as string;
		if (!signature) {
			throw new BadRequestException('Missing x-signature header for HMAC validation');
		}

		// Get request body
		let body = '';
		if (request.body) {
			if (typeof request.body === 'string') {
				body = request.body;
			} else if (Buffer.isBuffer(request.body)) {
				body = request.body.toString('utf8');
			} else {
				body = JSON.stringify(request.body);
			}
		}

		// Optional max age override
		const maxAgeHeader = request.headers['x-max-age'] as string;
		const maxAge = maxAgeHeader ? parseInt(maxAgeHeader, 10) : 300; // Default 5 minutes

		return {
			timestamp,
			signature,
			body,
			maxAge,
		};
	}

	private validateHmacSignature(options: { timestamp: string; signature: string; body: string; maxAge?: number }): {
		isValid: boolean;
		reason?: string;
	} {
		const { timestamp, signature, body, maxAge = 300 } = options;

		// Check timestamp to prevent replay attacks
		const now = Math.floor(Date.now() / 1000);
		const requestTime = parseInt(timestamp, 10);

		if (isNaN(requestTime)) {
			return {
				isValid: false,
				reason: 'Invalid timestamp format',
			};
		}

		if (now - requestTime > maxAge) {
			return {
				isValid: false,
				reason: `Request too old. Max age: ${maxAge}s`,
			};
		}

		// Get HMAC secret from config
		const hmacSecret = this.configService.get<string>('imageService.auth.hmacSecret') || this.configService.get<string>('HMAC_SECRET');

		if (!hmacSecret) {
			this.logger.error('HMAC secret not configured');
			return {
				isValid: false,
				reason: 'HMAC validation unavailable - secret not configured',
			};
		}

		// Create expected signature
		const payload = `${timestamp}.${body}`;
		const expectedSignature = this.createHmacSignature(payload, hmacSecret);

		// Validate signature using timing-safe comparison
		if (!this.secureCompare(signature, expectedSignature)) {
			return {
				isValid: false,
				reason: 'HMAC signature mismatch',
			};
		}

		return { isValid: true };
	}

	private createHmacSignature(payload: string, secret: string): string {
		const hmac = createHmac('sha256', secret);
		hmac.update(payload, 'utf8');
		return `sha256=${hmac.digest('hex')}`;
	}

	private secureCompare(a: string, b: string): boolean {
		if (a.length !== b.length) {
			return false;
		}

		try {
			const bufferA = Buffer.from(a, 'utf8');
			const bufferB = Buffer.from(b, 'utf8');
			return timingSafeEqual(bufferA, bufferB);
		} catch (error) {
			this.logger.error('Error in secure comparison', error);
			return false;
		}
	}
}
