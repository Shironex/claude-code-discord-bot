import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { IMAGE_CONSTANTS } from '../../common/constants';

export interface HealthStatus {
	status: 'ok' | 'error';
	timestamp: string;
	uptime: number;
	version: string;
	environment: string;
	services: {
		redis: ServiceHealth;
		storage: ServiceHealth;
		auth: ServiceHealth;
		upload: ServiceHealth;
	};
	memory: {
		used: number;
		total: number;
		percentage: number;
	};
	system: {
		nodeVersion: string;
		platform: string;
		arch: string;
	};
}

export interface ServiceHealth {
	status: 'healthy' | 'unhealthy' | 'degraded';
	responseTime?: number;
	error?: string;
	details?: Record<string, any>;
}

@Injectable()
export class HealthService {
	private readonly logger = new Logger(HealthService.name);
	private readonly startTime = Date.now();

	constructor(
		private readonly configService: ConfigService,
		private readonly redisService: RedisService,
	) {}

	/**
	 * Get comprehensive health status
	 */
	async getHealthStatus(): Promise<HealthStatus> {
		this.logger.debug('Performing health check');

		const [redisHealth, storageHealth, authHealth, uploadHealth] = await Promise.allSettled([
			this.checkRedisHealth(),
			this.checkStorageHealth(),
			this.checkAuthHealth(),
			this.checkUploadHealth(),
		]);

		const services = {
			redis: this.getResultValue(redisHealth),
			storage: this.getResultValue(storageHealth),
			auth: this.getResultValue(authHealth),
			upload: this.getResultValue(uploadHealth),
		};

		const overallStatus = this.determineOverallStatus(services);
		const memoryInfo = this.getMemoryInfo();

		return {
			status: overallStatus,
			timestamp: new Date().toISOString(),
			uptime: Date.now() - this.startTime,
			version: this.configService.get<string>('npm_package_version', '1.0.0'),
			environment: this.configService.get<string>('NODE_ENV', 'development'),
			services,
			memory: memoryInfo,
			system: {
				nodeVersion: process.version,
				platform: process.platform,
				arch: process.arch,
			},
		};
	}

	/**
	 * Simple health check for liveness probes
	 */
	getLivenessStatus(): { status: 'ok' | 'error'; uptime: number } {
		return {
			status: 'ok',
			uptime: Date.now() - this.startTime,
		};
	}

	/**
	 * Readiness check for readiness probes
	 */
	async getReadinessStatus(): Promise<{ status: 'ready' | 'not-ready'; services: string[] }> {
		const criticalServices: string[] = [];
		const failedServices: string[] = [];

		// Check Redis
		try {
			await this.checkRedisHealth();
			criticalServices.push('redis');
		} catch (error) {
			this.logger.error(`Redis health check failed: ${error.message}`);
			failedServices.push('redis');
		}

		// Check auth configuration
		try {
			this.checkAuthHealth();
			criticalServices.push('auth');
		} catch (error) {
			this.logger.error(`Auth health check failed: ${error.message}`);
			failedServices.push('auth');
		}

		return {
			status: failedServices.length === 0 ? 'ready' : 'not-ready',
			services: failedServices.length > 0 ? failedServices : criticalServices,
		};
	}

	/**
	 * Check Redis health
	 */
	private async checkRedisHealth(): Promise<ServiceHealth> {
		const start = Date.now();

		try {
			const isHealthy = await this.redisService.isHealthy();
			const responseTime = Date.now() - start;

			if (isHealthy) {
				return {
					status: 'healthy',
					responseTime,
					details: {
						connected: true,
					},
				};
			} else {
				return {
					status: 'unhealthy',
					responseTime,
					error: 'Redis health check failed',
				};
			}
		} catch (error) {
			return {
				status: 'unhealthy',
				responseTime: Date.now() - start,
				error: error.message,
			};
		}
	}

	/**
	 * Check storage health
	 */
	private async checkStorageHealth(): Promise<ServiceHealth> {
		const start = Date.now();

		try {
			// Test Redis connectivity for storage
			const isRedisHealthy = await this.redisService.isHealthy();
			const responseTime = Date.now() - start;

			if (isRedisHealthy) {
				return {
					status: 'healthy',
					responseTime,
					details: {
						provider: 'redis',
						connected: true,
					},
				};
			} else {
				return {
					status: 'unhealthy',
					responseTime,
					error: 'Storage backend (Redis) is unhealthy',
				};
			}
		} catch (error) {
			return {
				status: 'unhealthy',
				responseTime: Date.now() - start,
				error: error.message,
			};
		}
	}

	/**
	 * Check authentication health
	 */
	private checkAuthHealth(): ServiceHealth {
		const start = Date.now();

		try {
			const discordKey = this.configService.get<string>('DISCORD_BOT_API_KEY');
			const claudeKey = this.configService.get<string>('CLAUDE_CODE_API_KEY');
			const hmacSecret = this.configService.get<string>('HMAC_SECRET');

			const hasDiscordKey = !!discordKey;
			const hasClaudeKey = !!claudeKey;
			const hasHmacSecret = !!hmacSecret;

			const responseTime = Date.now() - start;

			if (hasDiscordKey && hasClaudeKey) {
				return {
					status: 'healthy',
					responseTime,
					details: {
						discordKeyConfigured: hasDiscordKey,
						claudeKeyConfigured: hasClaudeKey,
						hmacSecretConfigured: hasHmacSecret,
					},
				};
			} else {
				return {
					status: 'unhealthy',
					responseTime,
					error: 'Missing required API keys',
					details: {
						discordKeyConfigured: hasDiscordKey,
						claudeKeyConfigured: hasClaudeKey,
						hmacSecretConfigured: hasHmacSecret,
					},
				};
			}
		} catch (error) {
			return {
				status: 'unhealthy',
				responseTime: Date.now() - start,
				error: error.message,
			};
		}
	}

	/**
	 * Check upload service health
	 */
	private checkUploadHealth(): ServiceHealth {
		const start = Date.now();

		try {
			// Check upload configuration
			const maxFileSize = this.configService.get<number>('imageService.upload.maxFileSize', IMAGE_CONSTANTS.MAX_FILE_SIZE);
			const allowedTypes = this.configService.get<string[]>('imageService.upload.allowedMimeTypes', [
				...IMAGE_CONSTANTS.ALLOWED_MIMETYPES,
			]);

			const responseTime = Date.now() - start;

			return {
				status: 'healthy',
				responseTime,
				details: {
					maxFileSize,
					allowedTypesCount: allowedTypes.length,
					allowedTypes: allowedTypes.slice(0, 3), // Show first 3
				},
			};
		} catch (error) {
			return {
				status: 'unhealthy',
				responseTime: Date.now() - start,
				error: error.message,
			};
		}
	}

	/**
	 * Get memory usage information
	 */
	private getMemoryInfo(): { used: number; total: number; percentage: number } {
		const used = process.memoryUsage().heapUsed;
		const total = process.memoryUsage().heapTotal;
		const percentage = Math.round((used / total) * 100);

		return {
			used: Math.round(used / 1024 / 1024), // MB
			total: Math.round(total / 1024 / 1024), // MB
			percentage,
		};
	}

	/**
	 * Determine overall system status
	 */
	private determineOverallStatus(services: Record<string, ServiceHealth>): 'ok' | 'error' {
		const serviceStatuses = Object.values(services);
		const hasUnhealthy = serviceStatuses.some((service) => service.status === 'unhealthy');

		return hasUnhealthy ? 'error' : 'ok';
	}

	/**
	 * Extract value from Promise.allSettled result
	 */
	private getResultValue<T>(result: PromiseSettledResult<T>): T | ServiceHealth {
		if (result.status === 'fulfilled') {
			return result.value;
		} else {
			return {
				status: 'unhealthy',
				error: result.reason?.message || 'Health check failed',
			};
		}
	}
}
