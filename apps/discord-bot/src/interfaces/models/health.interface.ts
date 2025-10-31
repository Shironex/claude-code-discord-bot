/**
 * Health status for individual components
 */
export type HealthStatus = 'operational' | 'degraded' | 'critical' | 'unavailable';

/**
 * Individual component health information
 */
export interface ComponentHealth {
	status: HealthStatus;
	message: string;
	responseTime?: number;
	details?: {
		uptime?: number;
		memory?: {
			used: number;
			total: number;
			percentage: number;
		};
		latency?: number;
		rateLimit?: {
			remaining: number;
			limit: number;
			reset: Date;
		};
		activeSessions?: number;
		lastCleanup?: Date;
		version?: string;
		error?: string;
	};
	error?: string;
	lastCheck: Date;
}

/**
 * Complete bot health status across all components
 */
export interface BotHealthStatus {
	overallStatus: HealthStatus;
	runtime: ComponentHealth;
	github: ComponentHealth;
	sessions: ComponentHealth;
	imageService: ComponentHealth;
	timestamp: Date;
	cached: boolean;
}

/**
 * Cached health check result
 */
export interface CachedHealthResult {
	result: BotHealthStatus;
	timestamp: number;
}
