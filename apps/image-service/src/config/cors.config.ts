import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

/**
 * Creates CORS configuration based on environment variables
 * Supports multiple origins, GitHub Actions runners, and development settings
 */
export const createCorsConfig = (configService: ConfigService): CorsOptions => {
	// Parse allowed origins from environment (using same env var as main.ts)
	const corsOrigins = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000,https://github.com,https://actions.github.com');
	const allowedOrigins = corsOrigins
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);

	return {
		origin: (origin: string | undefined, callback: (error: Error | null, success?: boolean) => void) => {
			// Allow requests with no origin (like mobile apps, curl, Postman, or server-to-server)
			if (!origin) return callback(null, true);

			// Check if origin matches any allowed origins or patterns
			const isAllowed = allowedOrigins.some((allowedOrigin) => {
				// Exact match
				if (origin === allowedOrigin) return true;

				// GitHub Actions runners (dynamic IPs)
				if (allowedOrigin === 'https://github.com' && origin.includes('github')) return true;
				if (allowedOrigin === 'https://actions.github.com' && origin.includes('github')) return true;

				// Self-hosted runners (configurable)
				if (allowedOrigin === '*') return true;

				return false;
			});

			if (isAllowed) {
				callback(null, true);
			} else {
				console.warn(`CORS blocked origin: ${origin}`);
				callback(new Error('Not allowed by CORS'), false);
			}
		},

		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],

		allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-timestamp', 'x-signature'],

		credentials: false, // API key auth doesn't need credentials

		// Preflight cache duration (in seconds)
		maxAge: parseInt(configService.get<string>('CORS_MAX_AGE', '86400'), 10), // 24 hours

		// Enable preflight for all routes
		preflightContinue: false,

		// Pass the CORS preflight response to the next handler
		optionsSuccessStatus: 204,
	};
};
