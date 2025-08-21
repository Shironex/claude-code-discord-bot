import { registerAs } from '@nestjs/config';

export interface RedisConfig {
	host: string;
	port: number;
	password?: string;
	db: number;
	maxRetriesPerRequest: number;
	retryDelayOnFailover: number;
	keyPrefix?: string;
	connectionName?: string;
	enableReadyCheck: boolean;
	maxLoadingTimeout: number;
}

export default registerAs('redis', (): RedisConfig => {
	return {
		host: process.env.REDIS_HOST || 'localhost',
		port: parseInt(process.env.REDIS_PORT || '6379', 10),
		password: process.env.REDIS_PASSWORD,
		db: parseInt(process.env.REDIS_DB || '0', 10),
		maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
		retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
		keyPrefix: process.env.REDIS_KEY_PREFIX || 'img_service:',
		connectionName: process.env.REDIS_CONNECTION_NAME || 'image-service',
		enableReadyCheck: true,
		maxLoadingTimeout: parseInt(process.env.REDIS_LOADING_TIMEOUT || '5000', 10),
	};
});
