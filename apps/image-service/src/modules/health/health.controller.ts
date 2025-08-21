import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, MemoryHealthIndicator, HealthCheckResult } from '@nestjs/terminus';
import { HealthService, HealthStatus } from './health.service';

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
	@ApiOperation({
		summary: 'Get comprehensive health status',
		description: 'Returns detailed health information about all service components.',
	})
	@ApiResponse({
		status: 200,
		description: 'Health status retrieved successfully',
		schema: {
			type: 'object',
			properties: {
				status: { type: 'string', enum: ['ok', 'error'] },
				timestamp: { type: 'string', format: 'date-time' },
				uptime: { type: 'number', example: 123456 },
				version: { type: 'string', example: '1.0.0' },
				environment: { type: 'string', example: 'development' },
				services: {
					type: 'object',
					properties: {
						redis: { $ref: '#/components/schemas/ServiceHealth' },
						storage: { $ref: '#/components/schemas/ServiceHealth' },
						auth: { $ref: '#/components/schemas/ServiceHealth' },
						upload: { $ref: '#/components/schemas/ServiceHealth' },
					},
				},
				memory: {
					type: 'object',
					properties: {
						used: { type: 'number', example: 45 },
						total: { type: 'number', example: 128 },
						percentage: { type: 'number', example: 35 },
					},
				},
				system: {
					type: 'object',
					properties: {
						nodeVersion: { type: 'string', example: 'v18.17.0' },
						platform: { type: 'string', example: 'darwin' },
						arch: { type: 'string', example: 'x64' },
					},
				},
			},
		},
	})
	async getHealthStatus(): Promise<HealthStatus> {
		return await this.healthService.getHealthStatus();
	}

	/**
	 * Liveness probe endpoint
	 */
	@Get('live')
	@ApiOperation({
		summary: 'Liveness probe',
		description: 'Simple endpoint to check if the service is alive. Used for Kubernetes liveness probes.',
	})
	@ApiResponse({
		status: 200,
		description: 'Service is alive',
		schema: {
			type: 'object',
			properties: {
				status: { type: 'string', example: 'ok' },
				uptime: { type: 'number', example: 123456 },
			},
		},
	})
	getLiveness(): { status: 'ok' | 'error'; uptime: number } {
		return this.healthService.getLivenessStatus();
	}

	/**
	 * Readiness probe endpoint
	 */
	@Get('ready')
	@ApiOperation({
		summary: 'Readiness probe',
		description: 'Checks if the service is ready to handle requests. Used for Kubernetes readiness probes.',
	})
	@ApiResponse({
		status: 200,
		description: 'Service is ready',
		schema: {
			type: 'object',
			properties: {
				status: { type: 'string', enum: ['ready', 'not-ready'] },
				services: {
					type: 'array',
					items: { type: 'string' },
					example: ['redis', 'auth'],
				},
			},
		},
	})
	@ApiResponse({
		status: 503,
		description: 'Service is not ready',
	})
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
	@ApiOperation({
		summary: 'Terminus health check',
		description: 'Advanced health check using @nestjs/terminus with detailed component status.',
	})
	@ApiResponse({
		status: 200,
		description: 'Health check passed',
	})
	@ApiResponse({
		status: 503,
		description: 'Health check failed',
	})
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
	@ApiOperation({
		summary: 'Startup probe',
		description: 'Checks if the service has started successfully. Used for Kubernetes startup probes.',
	})
	@ApiResponse({
		status: 200,
		description: 'Service has started',
		schema: {
			type: 'object',
			properties: {
				status: { type: 'string', example: 'started' },
				uptime: { type: 'number', example: 123456 },
				initializationTime: { type: 'number', example: 5000 },
			},
		},
	})
	getStartup(): { status: 'started'; uptime: number; initializationTime: number } {
		const uptime = process.uptime() * 1000; // Convert to milliseconds

		return {
			status: 'started',
			uptime: uptime,
			initializationTime: Math.min(uptime, 10000), // Max 10 seconds init time
		};
	}
}
