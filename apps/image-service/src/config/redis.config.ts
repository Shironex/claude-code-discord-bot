import { registerAs } from '@nestjs/config';

export interface RedisConfig {
	host: string;
	port: number;
	username?: string;
	password?: string;
	db: number;
	maxRetriesPerRequest: number;
	keyPrefix?: string;
	connectionName?: string;
	enableReadyCheck: boolean;
	connectTimeout: number;
	commandTimeout: number;
	family: number;
	keepAlive: number;
	lazyConnect: boolean;
}

export default registerAs('redis', (): RedisConfig => {
	return {
		host: process.env.REDIS_HOST || 'localhost',
		port: parseInt(process.env.REDIS_PORT || '6379', 10),
		username: process.env.REDIS_USERNAME,
		password: process.env.REDIS_PASSWORD,
		db: parseInt(process.env.REDIS_DB || '0', 10),
		maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
		keyPrefix: process.env.REDIS_KEY_PREFIX || 'img_service:',
		connectionName: process.env.REDIS_CONNECTION_NAME || 'image-service',
		enableReadyCheck: true,
		connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
		commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),
		family: 4, // IPv4
		keepAlive: 1,
		lazyConnect: true,
	};
});
