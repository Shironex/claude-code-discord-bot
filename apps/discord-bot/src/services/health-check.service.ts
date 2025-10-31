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
 * Health check thresholds and configuration constants
 */
const HEALTH_CHECK_THRESHOLDS = {
	// Memory thresholds
	MEMORY_DEGRADED_PERCENT: 75,
	MEMORY_CRITICAL_PERCENT: 90,

	// Session thresholds
	SESSIONS_DEGRADED_COUNT: 50,
	SESSIONS_CRITICAL_COUNT: 100,

	// GitHub rate limit thresholds
	RATE_LIMIT_DEGRADED_COUNT: 100,
	RATE_LIMIT_CRITICAL_COUNT: 0,

	// Image service response time thresholds (ms)
	IMAGE_SERVICE_DEGRADED_MS: 2000
} as const;

/**
 * Default health check configuration
 */
const HEALTH_CHECK_CONFIG = {
	CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
	DEFAULT_TIMEOUT_MS: 3000 // 3 seconds
} as const;

/**
 * Service for checking the health status of all bot components
 * Implements caching to avoid excessive health checks
 */
@Injectable()
export class HealthCheckService extends BaseService {
	private cachedResult: CachedHealthResult | null = null;
	private readonly cacheTtlMs: number;
	private readonly checkTimeoutMs: number;
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

		// Allow configurable timeout and cache TTL from environment
		this.cacheTtlMs =
			this.configService.get<number>('HEALTH_CHECK_CACHE_TTL_MS') ?? HEALTH_CHECK_CONFIG.CACHE_TTL_MS;
		this.checkTimeoutMs =
			this.configService.get<number>('HEALTH_CHECK_TIMEOUT_MS') ?? HEALTH_CHECK_CONFIG.DEFAULT_TIMEOUT_MS;

		this.logger.log(
			`HealthCheckService initialized (cache: ${this.cacheTtlMs}ms, timeout: ${this.checkTimeoutMs}ms)`
		);
	}

	/**
	 * Get the full health status of the bot
	 * @param forceRefresh - If true, bypass cache and perform fresh checks
	 * @returns Complete health status across all components
	 */
	async getFullHealthStatus(forceRefresh: boolean = false): Promise<BotHealthStatus> {
		const now = Date.now();

		// Return cached result if valid and not forcing refresh
		if (!forceRefresh && this.cachedResult && now - this.cachedResult.timestamp < this.cacheTtlMs) {
			this.logger.log('Returning cached health status');
			// Mark as cached but return the cached result directly (no unnecessary spreading)
			this.cachedResult.result.cached = true;
			return this.cachedResult.result;
		}

		this.logger.log('Performing fresh health checks');

		// Run all health checks in parallel with timeout protection
		const [runtime, github, sessions, imageService] = await Promise.all([
			this.withTimeout(this.checkBotRuntime(), this.checkTimeoutMs, 'runtime'),
			this.withTimeout(this.checkGitHubIntegration(), this.checkTimeoutMs, 'github'),
			this.withTimeout(this.checkSessionHealth(), this.checkTimeoutMs, 'sessions'),
			this.withTimeout(this.checkImageService(), this.checkTimeoutMs, 'imageService')
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

			// Determine status based on memory usage thresholds
			let status: HealthStatus = 'operational';
			let message = 'Bot runtime is healthy';

			if (memPercentage > HEALTH_CHECK_THRESHOLDS.MEMORY_CRITICAL_PERCENT) {
				status = 'critical';
				message = `Critical: Memory usage above ${HEALTH_CHECK_THRESHOLDS.MEMORY_CRITICAL_PERCENT}%`;
			} else if (memPercentage > HEALTH_CHECK_THRESHOLDS.MEMORY_DEGRADED_PERCENT) {
				status = 'degraded';
				message = `Warning: Memory usage above ${HEALTH_CHECK_THRESHOLDS.MEMORY_DEGRADED_PERCENT}%`;
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
				error: this.sanitizeErrorMessage(error),
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
					responseTime: Date.now() - startTime,
					lastCheck: new Date()
				};
			}

			// Use public method to get rate limit information
			const rateLimitInfo = await this.githubService.getRateLimitInfo();

			// Determine status based on rate limit thresholds
			let status: HealthStatus = 'operational';
			let message = 'GitHub integration is healthy';

			if (rateLimitInfo.remaining === HEALTH_CHECK_THRESHOLDS.RATE_LIMIT_CRITICAL_COUNT) {
				status = 'critical';
				message = 'Rate limit exceeded';
			} else if (rateLimitInfo.remaining < HEALTH_CHECK_THRESHOLDS.RATE_LIMIT_DEGRADED_COUNT) {
				status = 'degraded';
				message = `Low rate limit: ${rateLimitInfo.remaining} calls remaining`;
			}

			const responseTime = Date.now() - startTime;

			return {
				status,
				message,
				responseTime,
				details: {
					rateLimit: {
						remaining: rateLimitInfo.remaining,
						limit: rateLimitInfo.limit,
						reset: rateLimitInfo.reset
					}
				},
				lastCheck: new Date()
			};
		} catch (error) {
			this.logger.error('Failed to check GitHub integration', error, 'checkGitHubIntegration');
			return {
				status: 'critical',
				message: 'GitHub API check failed',
				error: this.sanitizeErrorMessage(error),
				responseTime: Date.now() - startTime,
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
			// Use public method to get session count
			const activeSessions = this.sessionService.getSessionCount();

			// Determine status based on active session thresholds
			let status: HealthStatus = 'operational';
			let message = 'Session health is good';

			if (activeSessions > HEALTH_CHECK_THRESHOLDS.SESSIONS_CRITICAL_COUNT) {
				status = 'critical';
				message = `Critical: ${activeSessions} active sessions`;
			} else if (activeSessions > HEALTH_CHECK_THRESHOLDS.SESSIONS_DEGRADED_COUNT) {
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
				error: this.sanitizeErrorMessage(error),
				responseTime: Date.now() - startTime,
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
					responseTime: Date.now() - startTime,
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

			// Determine status based on response time threshold
			let status: HealthStatus = 'operational';
			let message = 'Image service is healthy';

			if (responseTime > HEALTH_CHECK_THRESHOLDS.IMAGE_SERVICE_DEGRADED_MS) {
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
				error: this.sanitizeErrorMessage(error),
				responseTime: Date.now() - startTime,
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
				setTimeout(() => reject(new Error(`Health check timed out after ${timeoutMs}ms`)), timeoutMs)
			)
		]).catch(error => {
			this.logger.error(`Health check failed for ${componentName}`, error, 'withTimeout');
			// Return a failed health status on timeout
			return {
				status: 'critical',
				message: 'Health check timed out',
				error: this.sanitizeErrorMessage(error),
				responseTime: timeoutMs,
				lastCheck: new Date()
			} as T;
		});
	}

	/**
	 * Sanitize error messages to avoid exposing internal system details
	 * @param error - The error to sanitize
	 * @returns A safe error message string
	 */
	private sanitizeErrorMessage(error: unknown): string {
		if (error instanceof Error) {
			// Only return generic error type, not the full message which might contain sensitive info
			return error.name || 'Unknown error';
		}
		return 'Unknown error';
	}

	/**
	 * Clear the cached health result (useful for testing)
	 */
	clearCache(): void {
		this.cachedResult = null;
		this.logger.log('Health check cache cleared');
	}
}
