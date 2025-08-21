import { registerAs } from '@nestjs/config';
import { IMAGE_CONSTANTS } from '../common/constants';

export interface ImageServiceConfig {
	port: number;
	nodeEnv: string;
	apiKey: string;
	hmacSecret?: string;
	redis: {
		host: string;
		port: number;
		password?: string;
		db: number;
		maxRetriesPerRequest: number;
		retryDelayOnFailover: number;
	};
	upload: {
		maxFileSize: number;
		maxFiles: number;
		allowedMimeTypes: string[];
		defaultTtl: number;
		maxTtl: number;
		minTtl: number;
	};
	rateLimit: {
		maxFilesPerHour: number;
		maxTotalSizePerRequest: number;
	};
	cors: {
		origin: string[];
		credentials: boolean;
	};
	security: {
		maxTimestampDrift: number;
		enableHmacValidation: boolean;
	};
}

export default registerAs('imageService', (): ImageServiceConfig => {
	// Validate required environment variables
	const requiredEnvVars = ['IMAGE_SERVICE_API_KEY'];
	const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

	if (missingVars.length > 0) {
		throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
	}

	return {
		port: parseInt(process.env.PORT || '3001', 10),
		nodeEnv: process.env.NODE_ENV || 'development',
		apiKey: process.env.IMAGE_SERVICE_API_KEY!,
		hmacSecret: process.env.IMAGE_SERVICE_HMAC_SECRET,

		redis: {
			host: process.env.REDIS_HOST || 'localhost',
			port: parseInt(process.env.REDIS_PORT || '6379', 10),
			password: process.env.REDIS_PASSWORD,
			db: parseInt(process.env.REDIS_DB || '0', 10),
			maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
			retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
		},

		upload: {
			maxFileSize: parseInt(process.env.MAX_FILE_SIZE || IMAGE_CONSTANTS.MAX_FILE_SIZE.toString(), 10),
			maxFiles: parseInt(process.env.MAX_FILES_PER_REQUEST || IMAGE_CONSTANTS.MAX_FILES_PER_REQUEST.toString(), 10),
			allowedMimeTypes: process.env.ALLOWED_MIMETYPES
				? process.env.ALLOWED_MIMETYPES.split(',').map((type) => type.trim())
				: [...IMAGE_CONSTANTS.ALLOWED_MIMETYPES],
			defaultTtl: parseInt(process.env.DEFAULT_TTL_SECONDS || IMAGE_CONSTANTS.DEFAULT_TTL_SECONDS.toString(), 10),
			maxTtl: parseInt(process.env.MAX_TTL_SECONDS || IMAGE_CONSTANTS.MAX_TTL_SECONDS.toString(), 10),
			minTtl: parseInt(process.env.MIN_TTL_SECONDS || IMAGE_CONSTANTS.MIN_TTL_SECONDS.toString(), 10),
		},

		rateLimit: {
			maxFilesPerHour: parseInt(process.env.MAX_FILES_PER_HOUR || IMAGE_CONSTANTS.MAX_FILES_PER_USER_PER_HOUR.toString(), 10),
			maxTotalSizePerRequest: parseInt(
				process.env.MAX_TOTAL_SIZE_PER_REQUEST || IMAGE_CONSTANTS.MAX_TOTAL_SIZE_PER_REQUEST.toString(),
				10,
			),
		},

		cors: {
			origin: process.env.CORS_ORIGINS
				? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
				: ['http://localhost:3000'], // Default for Discord bot
			credentials: process.env.CORS_CREDENTIALS === 'true',
		},

		security: {
			maxTimestampDrift: parseInt(process.env.MAX_TIMESTAMP_DRIFT || IMAGE_CONSTANTS.MAX_TIMESTAMP_DRIFT.toString(), 10),
			enableHmacValidation: process.env.ENABLE_HMAC_VALIDATION === 'true',
		},
	};
});
