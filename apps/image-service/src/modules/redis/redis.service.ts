import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { RedisConfig } from '../../config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(RedisService.name);
	private client: Redis | null = null;
	private isConnected = false;
	private reconnectAttempts = 0;
	private readonly maxReconnectAttempts = 10;

	constructor(private configService: ConfigService) {}

	async onModuleInit(): Promise<void> {
		await this.connect();
	}

	async onModuleDestroy(): Promise<void> {
		await this.disconnect();
	}

	/**
	 * Establish Redis connection
	 */
	private async connect(): Promise<void> {
		try {
			const redisConfig = this.configService.get<RedisConfig>('redis');
			if (!redisConfig) {
				throw new Error('Redis configuration not found');
			}

			const options: RedisOptions = {
				host: redisConfig.host,
				port: redisConfig.port,
				username: redisConfig.username,
				password: redisConfig.password,
				db: redisConfig.db,
				keyPrefix: redisConfig.keyPrefix,
				connectionName: redisConfig.connectionName,
				enableReadyCheck: redisConfig.enableReadyCheck,
				maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
				connectTimeout: redisConfig.connectTimeout,
				commandTimeout: redisConfig.commandTimeout,
				family: redisConfig.family,
				keepAlive: redisConfig.keepAlive,
				lazyConnect: redisConfig.lazyConnect,

				// Custom retry strategy
				retryStrategy: (times: number) => {
					const delay = Math.min(times * 50, 2000);
					this.logger.warn(`Redis connection retry ${times}, delay: ${delay}ms`);
					return delay;
				},

				// Reconnect on specific errors
				reconnectOnError: (err: Error) => {
					const targetErrors = ['READONLY', 'ECONNRESET', 'ENOTFOUND'];
					const shouldReconnect = targetErrors.some((target) => err.message.includes(target));
					if (shouldReconnect) {
						this.logger.warn(`Redis reconnecting due to error: ${err.message}`);
					}
					return shouldReconnect;
				},
			};

			this.client = new Redis(options);
			this.setupEventHandlers();

			// Explicitly initiate connection when lazyConnect is enabled
			await this.client.connect();

			// Wait for connection
			await this.waitForConnection();
			this.logger.log('Redis connection established successfully');
		} catch (error) {
			this.logger.error(`Failed to connect to Redis: ${error.message}`, error.stack);
			throw error;
		}
	}

	/**
	 * Set up Redis event handlers
	 */
	private setupEventHandlers(): void {
		if (!this.client) return;

		this.client.on('connect', () => {
			this.logger.log('Redis client connected');
			this.isConnected = true;
			this.reconnectAttempts = 0;
		});

		this.client.on('ready', () => {
			this.logger.log('Redis client ready');
			this.isConnected = true;
		});

		this.client.on('error', (error) => {
			this.logger.error(`Redis error: ${error.message}`, error.stack);
			this.isConnected = false;
		});

		this.client.on('close', () => {
			this.logger.warn('Redis connection closed');
			this.isConnected = false;
		});

		this.client.on('reconnecting', (ms: number) => {
			this.reconnectAttempts++;
			this.logger.warn(`Redis reconnecting in ${ms}ms (attempt ${this.reconnectAttempts})`);

			if (this.reconnectAttempts >= this.maxReconnectAttempts) {
				this.logger.error('Max reconnection attempts reached');
				this.client?.disconnect();
			}
		});

		this.client.on('end', () => {
			this.logger.warn('Redis connection ended');
			this.isConnected = false;
		});
	}

	/**
	 * Wait for Redis connection to be ready
	 */
	private async waitForConnection(timeout = 10000): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.client) {
				reject(new Error('Redis client not initialized'));
				return;
			}

			const timer = setTimeout(() => {
				reject(new Error('Redis connection timeout'));
			}, timeout);

			if (this.client.status === 'ready') {
				clearTimeout(timer);
				resolve();
				return;
			}

			this.client.once('ready', () => {
				clearTimeout(timer);
				resolve();
			});

			this.client.once('error', (error) => {
				clearTimeout(timer);
				reject(error);
			});
		});
	}

	/**
	 * Disconnect from Redis
	 */
	private async disconnect(): Promise<void> {
		if (this.client) {
			this.logger.log('Disconnecting from Redis...');
			await this.client.quit();
			this.client = null;
			this.isConnected = false;
			this.logger.log('Redis disconnected');
		}
	}

	/**
	 * Get Redis client instance
	 */
	getClient(): Redis {
		if (!this.client) {
			throw new Error('Redis client not initialized');
		}
		if (!this.isConnected) {
			throw new Error('Redis client not connected');
		}
		return this.client;
	}

	/**
	 * Check if Redis is connected and healthy
	 */
	async isHealthy(): Promise<boolean> {
		try {
			if (!this.client || !this.isConnected) {
				return false;
			}

			const result = await this.client.ping();
			return result === 'PONG';
		} catch (error) {
			this.logger.error(`Redis health check failed: ${error.message}`);
			return false;
		}
	}

	/**
	 * Get Redis connection status
	 */
	getStatus(): {
		connected: boolean;
		status: string;
		reconnectAttempts: number;
		uptime?: number;
	} {
		return {
			connected: this.isConnected,
			status: this.client?.status || 'disconnected',
			reconnectAttempts: this.reconnectAttempts,
			uptime: this.client?.status === 'ready' ? Date.now() : undefined,
		};
	}

	/**
	 * Execute Redis command with error handling
	 */
	async execute<T = any>(command: string, ...args: any[]): Promise<T> {
		try {
			const client = this.getClient();
			return await (client as any)[command](...args);
		} catch (error) {
			this.logger.error(`Redis command failed [${command}]: ${error.message}`, error.stack);
			throw error;
		}
	}

	/**
	 * Set key with TTL
	 */
	async set(key: string, value: string | Buffer, ttlSeconds?: number): Promise<void> {
		const client = this.getClient();
		if (ttlSeconds) {
			await client.setex(key, ttlSeconds, value);
		} else {
			await client.set(key, value);
		}
	}

	/**
	 * Get value by key
	 */
	async get(key: string): Promise<string | null> {
		const client = this.getClient();
		return await client.get(key);
	}

	/**
	 * Get buffer value by key
	 */
	async getBuffer(key: string): Promise<Buffer | null> {
		const client = this.getClient();
		return await client.getBuffer(key);
	}

	/**
	 * Delete key
	 */
	async del(key: string): Promise<number> {
		const client = this.getClient();
		return await client.del(key);
	}

	/**
	 * Check if key exists
	 */
	async exists(key: string): Promise<boolean> {
		const client = this.getClient();
		const result = await client.exists(key);
		return result === 1;
	}

	/**
	 * Set TTL for existing key
	 */
	async expire(key: string, ttlSeconds: number): Promise<boolean> {
		const client = this.getClient();
		const result = await client.expire(key, ttlSeconds);
		return result === 1;
	}

	/**
	 * Get TTL for key
	 */
	async ttl(key: string): Promise<number> {
		const client = this.getClient();
		return await client.ttl(key);
	}

	/**
	 * Get all keys matching pattern
	 */
	async keys(pattern: string): Promise<string[]> {
		const client = this.getClient();
		return await client.keys(pattern);
	}

	/**
	 * Scan keys with cursor for large datasets
	 */
	async scan(cursor: string, pattern?: string, count?: number): Promise<[string, string[]]> {
		const client = this.getClient();
		const args: any[] = [cursor];

		if (pattern) {
			args.push('MATCH', pattern);
		}

		if (count) {
			args.push('COUNT', count);
		}

		return await client.scan(args as any);
	}

	/**
	 * Increment counter
	 */
	async incr(key: string): Promise<number> {
		const client = this.getClient();
		return await client.incr(key);
	}

	/**
	 * Increment counter by amount
	 */
	async incrby(key: string, amount: number): Promise<number> {
		const client = this.getClient();
		return await client.incrby(key, amount);
	}

	/**
	 * Hash operations
	 */
	async hset(key: string, field: string, value: string): Promise<number> {
		const client = this.getClient();
		return await client.hset(key, field, value);
	}

	async hget(key: string, field: string): Promise<string | null> {
		const client = this.getClient();
		return await client.hget(key, field);
	}

	async hgetall(key: string): Promise<Record<string, string>> {
		const client = this.getClient();
		return await client.hgetall(key);
	}

	async hdel(key: string, ...fields: string[]): Promise<number> {
		const client = this.getClient();
		return await client.hdel(key, ...fields);
	}
}
