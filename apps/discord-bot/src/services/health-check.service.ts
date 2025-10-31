import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseService } from './base/base.service';
import { LoggerFactory } from '@claude-code/shared';
import { GitHubService } from './github.service';
import { SessionService } from './session.service';
import { ImageServiceClient } from './image-service/image-service.client';
import {
	BotHealthStatus,
	ComponentHealth,
	HealthStatus,
	CachedHealthResult
} from '../interfaces/models/health.interface';

/**
 * Service for checking the health status of all bot components
 * Implements caching to avoid excessive health checks
 */
@Injectable()
export class HealthCheckService extends BaseService {
	private cachedResult: CachedHealthResult | null = null;
	private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
	private readonly CHECK_TIMEOUT_MS = 3000; // 3 second timeout per check
	private readonly startTime: number;

	constructor(
		loggerFactory: LoggerFactory,
		private readonly configService: ConfigService,
		private readonly githubService: GitHubService,
		private readonly sessionService: SessionService,
		private readonly imageServiceClient: ImageServiceClient
	) {
		super(HealthCheckService.name, loggerFactory);
		this.startTime = Date.now();
		this.logger.log('HealthCheckService initialized');
	}

	/**
	 * Get the full health status of the bot
	 * @param forceRefresh - If true, bypass cache and perform fresh checks
	 * @returns Complete health status across all components
	 */
	async getFullHealthStatus(forceRefresh: boolean = false): Promise<BotHealthStatus> {
		const now = Date.now();

		// Return cached result if valid and not forcing refresh
		if (!forceRefresh && this.cachedResult && now - this.cachedResult.timestamp < this.CACHE_TTL_MS) {
			this.logger.log('Returning cached health status');
			return { ...this.cachedResult.result, cached: true };
		}

		this.logger.log('Performing fresh health checks');

		// Run all health checks in parallel with timeout protection
		const [runtime, github, sessions, imageService] = await Promise.all([
			this.withTimeout(this.checkBotRuntime(), this.CHECK_TIMEOUT_MS, 'runtime'),
			this.withTimeout(this.checkGitHubIntegration(), this.CHECK_TIMEOUT_MS, 'github'),
			this.withTimeout(this.checkSessionHealth(), this.CHECK_TIMEOUT_MS, 'sessions'),
			this.withTimeout(this.checkImageService(), this.CHECK_TIMEOUT_MS, 'imageService')
		]);

		// Determine overall status based on component statuses
		const overallStatus = this.determineOverallStatus([runtime, github, sessions, imageService]);

		const result: BotHealthStatus = {
			overallStatus,
			runtime,
			github,
			sessions,
			imageService,
			timestamp: new Date(),
			cached: false
		};

		// Cache the result
		this.cachedResult = {
			result,
			timestamp: now
		};

		this.logger.log(`Health check completed - Overall status: ${overallStatus}`);
		return result;
	}

	/**
	 * Check bot runtime health (uptime, memory, latency)
	 */
	private async checkBotRuntime(): Promise<ComponentHealth> {
		const startTime = Date.now();

		try {
			const uptime = Math.floor((Date.now() - this.startTime) / 1000); // seconds
			const memUsage = process.memoryUsage();
			const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
			const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
			const memPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

			// Determine status based on memory usage
			let status: HealthStatus = 'operational';
			let message = 'Bot runtime is healthy';

			if (memPercentage > 90) {
				status = 'critical';
				message = 'Critical: Memory usage above 90%';
			} else if (memPercentage > 75) {
				status = 'degraded';
				message = 'Warning: Memory usage above 75%';
			}

			const responseTime = Date.now() - startTime;

			return {
				status,
				message,
				responseTime,
				details: {
					uptime,
					memory: {
						used: memUsedMB,
						total: memTotalMB,
						percentage: memPercentage
					}
				},
				lastCheck: new Date()
			};
		} catch (error) {
			this.logger.error('Failed to check bot runtime', error, 'checkBotRuntime');
			return {
				status: 'critical',
				message: 'Failed to check runtime status',
				error: error.message,
				lastCheck: new Date()
			};
		}
	}

	/**
	 * Check GitHub integration health (token validity, rate limits)
	 */
	private async checkGitHubIntegration(): Promise<ComponentHealth> {
		const startTime = Date.now();

		try {
			// Check if GitHub is configured
			if (!this.githubService.isConfigured()) {
				return {
					status: 'unavailable',
					message: 'GitHub integration not configured',
					lastCheck: new Date()
				};
			}

			// Try to get rate limit information
			const rateLimit = await this.githubService['octokit'].rest.rateLimit.get();
			const core = rateLimit.data.resources.core;
			const remaining = core.remaining;
			const limit = core.limit;
			const resetDate = new Date(core.reset * 1000);

			// Determine status based on rate limit
			let status: HealthStatus = 'operational';
			let message = 'GitHub integration is healthy';

			if (remaining === 0) {
				status = 'critical';
				message = 'Rate limit exceeded';
			} else if (remaining < 100) {
				status = 'degraded';
				message = `Low rate limit: ${remaining} calls remaining`;
			}

			const responseTime = Date.now() - startTime;

			return {
				status,
				message,
				responseTime,
				details: {
					rateLimit: {
						remaining,
						limit,
						reset: resetDate
					}
				},
				lastCheck: new Date()
			};
		} catch (error) {
			this.logger.error('Failed to check GitHub integration', error, 'checkGitHubIntegration');
			return {
				status: 'critical',
				message: 'GitHub API check failed',
				error: error.message,
				lastCheck: new Date()
			};
		}
	}

	/**
	 * Check session health (active sessions, memory)
	 */
	private async checkSessionHealth(): Promise<ComponentHealth> {
		const startTime = Date.now();

		try {
			const activeSessions = this.sessionService['sessions'].size;

			// Determine status based on active sessions
			let status: HealthStatus = 'operational';
			let message = 'Session health is good';

			if (activeSessions > 100) {
				status = 'critical';
				message = `Critical: ${activeSessions} active sessions`;
			} else if (activeSessions > 50) {
				status = 'degraded';
				message = `Warning: ${activeSessions} active sessions`;
			}

			const responseTime = Date.now() - startTime;

			return {
				status,
				message,
				responseTime,
				details: {
					activeSessions
				},
				lastCheck: new Date()
			};
		} catch (error) {
			this.logger.error('Failed to check session health', error, 'checkSessionHealth');
			return {
				status: 'critical',
				message: 'Failed to check session health',
				error: error.message,
				lastCheck: new Date()
			};
		}
	}

	/**
	 * Check image service health
	 */
	private async checkImageService(): Promise<ComponentHealth> {
		const startTime = Date.now();

		try {
			// Check if image service is configured
			if (!this.imageServiceClient.isAvailable()) {
				return {
					status: 'unavailable',
					message: 'Image service not configured',
					lastCheck: new Date()
				};
			}

			// Test connection
			const connectionSuccessful = await this.imageServiceClient.testConnection();
			const responseTime = Date.now() - startTime;

			if (!connectionSuccessful) {
				return {
					status: 'critical',
					message: 'Image service connection failed',
					responseTime,
					lastCheck: new Date()
				};
			}

			// Get health information
			const health = await this.imageServiceClient.getHealth();

			// Determine status based on response time
			let status: HealthStatus = 'operational';
			let message = 'Image service is healthy';

			if (responseTime > 2000) {
				status = 'degraded';
				message = `Slow response time: ${responseTime}ms`;
			}

			return {
				status,
				message,
				responseTime,
				details: {
					version: health.version,
					uptime: health.uptime
				},
				lastCheck: new Date()
			};
		} catch (error) {
			this.logger.error('Failed to check image service', error, 'checkImageService');
			return {
				status: 'critical',
				message: 'Image service check failed',
				error: error.message,
				lastCheck: new Date()
			};
		}
	}

	/**
	 * Determine overall health status based on component statuses
	 */
	private determineOverallStatus(components: ComponentHealth[]): HealthStatus {
		// If any component is critical, overall is critical
		if (components.some(c => c.status === 'critical')) {
			return 'critical';
		}

		// If any component is degraded, overall is degraded
		if (components.some(c => c.status === 'degraded')) {
			return 'degraded';
		}

		// If all are unavailable, overall is unavailable
		if (components.every(c => c.status === 'unavailable')) {
			return 'unavailable';
		}

		// Otherwise operational
		return 'operational';
	}

	/**
	 * Wrap a promise with a timeout
	 */
	private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, componentName: string): Promise<T> {
		return Promise.race([
			promise,
			new Promise<T>((_, reject) =>
				setTimeout(() => reject(new Error(`${componentName} check timed out after ${timeoutMs}ms`)), timeoutMs)
			)
		]).catch(error => {
			this.logger.error(`Health check timed out for ${componentName}`, error, 'withTimeout');
			// Return a failed health status on timeout
			return {
				status: 'critical',
				message: `Health check timed out`,
				error: error.message,
				lastCheck: new Date()
			} as T;
		});
	}

	/**
	 * Clear the cached health result (useful for testing)
	 */
	clearCache(): void {
		this.cachedResult = null;
		this.logger.log('Health check cache cleared');
	}
}
