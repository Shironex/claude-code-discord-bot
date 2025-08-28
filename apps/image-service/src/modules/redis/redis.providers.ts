import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisConfig } from '../../config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const redisProviders: Provider[] = [
	{
		provide: REDIS_CLIENT,
		useFactory: (configService: ConfigService): Redis => {
			const config = configService.get<RedisConfig>('redis');

			if (!config) {
				throw new Error('Redis configuration not found');
			}

			return new Redis({
				host: config.host,
				port: config.port,
				username: config.username,
				password: config.password,
				db: config.db,
				keyPrefix: config.keyPrefix,
				connectionName: config.connectionName,
				enableReadyCheck: config.enableReadyCheck,
				maxRetriesPerRequest: config.maxRetriesPerRequest,
				connectTimeout: config.connectTimeout,
				commandTimeout: config.commandTimeout,
				family: config.family,
				keepAlive: config.keepAlive,
				lazyConnect: config.lazyConnect,

				retryStrategy: (times: number) => {
					const delay = Math.min(times * 50, 2000);
					return delay;
				},

				reconnectOnError: (err: Error) => {
					const targetErrors = ['READONLY', 'ECONNRESET', 'ENOTFOUND'];
					return targetErrors.some((target) => err.message.includes(target));
				},
			});
		},
		inject: [ConfigService],
	},
];
