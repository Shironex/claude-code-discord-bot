import { registerAs } from '@nestjs/config';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export default registerAs('cors', (): CorsOptions => {
	const isDevelopment = process.env.NODE_ENV === 'development';

	// Parse allowed origins from environment
	const allowedOrigins = process.env.CORS_ORIGINS
		? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
		: isDevelopment
			? ['http://localhost:3000', 'http://localhost:3001']
			: [];

	return {
		origin: (origin, callback) => {
			// Allow requests with no origin (e.g., mobile apps, Postman)
			if (!origin) {
				return callback(null, true);
			}

			// In development, allow all localhost origins
			if (isDevelopment && origin.includes('localhost')) {
				return callback(null, true);
			}

			// Check against allowed origins
			if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
				return callback(null, true);
			}

			// Deny request
			callback(new Error('Not allowed by CORS policy'));
		},

		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

		allowedHeaders: [
			'Content-Type',
			'Authorization',
			'X-Requested-With',
			'Accept',
			'Origin',
			'x-api-key',
			'x-signature',
			'x-timestamp',
		],

		credentials: process.env.CORS_CREDENTIALS === 'true',

		// Preflight cache duration (in seconds)
		maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10), // 24 hours

		// Enable preflight for all routes
		preflightContinue: false,

		// Pass the CORS preflight response to the next handler
		optionsSuccessStatus: 204,
	};
});
