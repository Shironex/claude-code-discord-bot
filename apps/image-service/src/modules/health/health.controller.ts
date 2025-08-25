import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, MemoryHealthIndicator, HealthCheckResult } from '@nestjs/terminus';
import { HealthService, HealthStatus } from './health.service';
import {
	ApiGetHealthStatus,
	ApiGetLiveness,
	ApiGetReadiness,
	ApiTerminusHealthCheck,
	ApiGetStartup
} from './health.swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
	constructor(
		private readonly healthService: HealthService,
		private readonly health: HealthCheckService,
		private readonly http: HttpHealthIndicator,
		private readonly memory: MemoryHealthIndicator,
	) {}

	/**
	 * Comprehensive health check
	 */
	@Get()
	@ApiGetHealthStatus()
	async getHealthStatus(): Promise<HealthStatus> {
		return await this.healthService.getHealthStatus();
	}

	/**
	 * Liveness probe endpoint
	 */
	@Get('live')
	@ApiGetLiveness()
	getLiveness(): { status: 'ok' | 'error'; uptime: number } {
		return this.healthService.getLivenessStatus();
	}

	/**
	 * Readiness probe endpoint
	 */
	@Get('ready')
	@ApiGetReadiness()
	async getReadiness(): Promise<{ status: 'ready' | 'not-ready'; services: string[] }> {
		const readiness = await this.healthService.getReadinessStatus();

		// Return 503 if not ready
		if (readiness.status === 'not-ready') {
			throw new Error('Service not ready');
		}

		return readiness;
	}

	/**
	 * Terminus-based health check
	 */
	@Get('check')
	@HealthCheck()
	@ApiTerminusHealthCheck()
	healthCheck(): Promise<HealthCheckResult> {
		return this.health.check([
			// Memory check - fail if using more than 150MB heap
			() => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
			// Memory check - fail if RSS memory exceeds 200MB
			() => this.memory.checkRSS('memory_rss', 200 * 1024 * 1024),
		]);
	}

	/**
	 * Startup probe endpoint
	 */
	@Get('startup')
	@ApiGetStartup()
	getStartup(): { status: 'started'; uptime: number; initializationTime: number } {
		const uptime = process.uptime() * 1000; // Convert to milliseconds

		return {
			status: 'started',
			uptime: uptime,
			initializationTime: Math.min(uptime, 10000), // Max 10 seconds init time
		};
	}
}
