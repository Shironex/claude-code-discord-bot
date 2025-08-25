import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

/**
 * Common service health status schema component
 */
export const ServiceHealthSchema = {
	type: 'object',
	properties: {
		status: { 
			type: 'string', 
			enum: ['healthy', 'unhealthy', 'degraded'],
			description: 'Service component health status'
		},
		responseTime: { 
			type: 'number',
			example: 15,
			description: 'Response time in milliseconds'
		},
		lastCheck: { 
			type: 'string', 
			format: 'date-time',
			description: 'Timestamp of last health check'
		},
		details: {
			type: 'object',
			description: 'Additional service-specific health details',
			additionalProperties: true,
		},
		error: {
			type: 'string',
			nullable: true,
			description: 'Error message if service is unhealthy',
		},
	},
};

/**
 * Swagger documentation for comprehensive health check endpoint
 */
export function ApiGetHealthStatus() {
	return applyDecorators(
		ApiOperation({
			summary: 'Get comprehensive health status',
			description: 'Returns detailed health information about all service components including Redis, storage, authentication, and system metrics. Use this endpoint for comprehensive monitoring and debugging.',
		}),
		ApiResponse({
			status: 200,
			description: 'Health status retrieved successfully',
			schema: {
				type: 'object',
				properties: {
					status: { 
						type: 'string', 
						enum: ['ok', 'error', 'degraded'],
						example: 'ok',
						description: 'Overall service health status' 
					},
					timestamp: { 
						type: 'string', 
						format: 'date-time',
						example: '2024-01-20T16:45:00.000Z',
						description: 'When the health check was performed' 
					},
					uptime: { 
						type: 'number', 
						example: 123456,
						description: 'Service uptime in milliseconds' 
					},
					version: { 
						type: 'string', 
						example: '1.0.0',
						description: 'Service version' 
					},
					environment: { 
						type: 'string', 
						example: 'development',
						description: 'Deployment environment' 
					},
					services: {
						type: 'object',
						description: 'Health status of individual service components',
						properties: {
							redis: { 
								$ref: '#/components/schemas/ServiceHealth',
								description: 'Redis connection and performance health' 
							},
							storage: { 
								$ref: '#/components/schemas/ServiceHealth',
								description: 'File storage system health' 
							},
							auth: { 
								$ref: '#/components/schemas/ServiceHealth',
								description: 'Authentication system health' 
							},
							upload: { 
								$ref: '#/components/schemas/ServiceHealth',
								description: 'Upload service health and capacity' 
							},
							cleanup: {
								$ref: '#/components/schemas/ServiceHealth',
								description: 'Cleanup scheduler health'
							},
						},
					},
					memory: {
						type: 'object',
						description: 'Memory usage statistics',
						properties: {
							used: { 
								type: 'number', 
								example: 45,
								description: 'Used memory in MB' 
							},
							total: { 
								type: 'number', 
								example: 128,
								description: 'Total available memory in MB' 
							},
							percentage: { 
								type: 'number', 
								example: 35,
								description: 'Memory usage percentage' 
							},
							heap: {
								type: 'object',
								properties: {
									used: { type: 'number', example: 32 },
									total: { type: 'number', example: 64 },
									limit: { type: 'number', example: 128 },
								},
							},
						},
					},
					system: {
						type: 'object',
						description: 'System information',
						properties: {
							nodeVersion: { 
								type: 'string', 
								example: 'v18.17.0',
								description: 'Node.js version' 
							},
							platform: { 
								type: 'string', 
								example: 'linux',
								description: 'Operating system platform' 
							},
							arch: { 
								type: 'string', 
								example: 'x64',
								description: 'CPU architecture' 
							},
							loadAverage: {
								type: 'array',
								items: { type: 'number' },
								example: [0.5, 0.8, 1.2],
								description: '1, 5, and 15 minute load averages',
							},
						},
					},
					performance: {
						type: 'object',
						description: 'Performance metrics',
						properties: {
							avgResponseTime: { type: 'number', example: 45 },
							requestsPerSecond: { type: 'number', example: 12.5 },
							errorRate: { type: 'number', example: 0.02 },
							cacheHitRate: { type: 'number', example: 0.85 },
						},
					},
				},
			},
		}),
		ApiResponse({
			status: 503,
			description: 'Service is unhealthy or degraded',
			schema: {
				type: 'object',
				properties: {
					status: { type: 'string', example: 'error' },
					timestamp: { type: 'string', format: 'date-time' },
					errors: {
						type: 'array',
						items: { type: 'string' },
						example: ['Redis connection failed', 'Storage disk full'],
					},
					services: {
						type: 'object',
						description: 'Failed service details',
					},
				},
			},
		}),
	);
}

/**
 * Swagger documentation for liveness probe endpoint
 */
export function ApiGetLiveness() {
	return applyDecorators(
		ApiOperation({
			summary: 'Liveness probe',
			description: 'Simple endpoint to check if the service process is alive and responding. Used by container orchestrators (Kubernetes, Docker Swarm) for liveness probes. Returns minimal data for fast response.',
		}),
		ApiResponse({
			status: 200,
			description: 'Service is alive and responding',
			schema: {
				type: 'object',
				properties: {
					status: { 
						type: 'string', 
						example: 'ok',
						description: 'Always "ok" if service responds' 
					},
					uptime: { 
						type: 'number', 
						example: 123456,
						description: 'Process uptime in milliseconds' 
					},
					pid: {
						type: 'number',
						example: 1234,
						description: 'Process ID',
					},
					timestamp: {
						type: 'string',
						format: 'date-time',
						description: 'Current server timestamp',
					},
				},
			},
		}),
		ApiResponse({
			status: 500,
			description: 'Service is not responding properly',
		}),
	);
}

/**
 * Swagger documentation for readiness probe endpoint
 */
export function ApiGetReadiness() {
	return applyDecorators(
		ApiOperation({
			summary: 'Readiness probe',
			description: 'Checks if the service is ready to handle requests by validating that all critical dependencies (Redis, storage, auth) are available. Used by load balancers and container orchestrators for readiness probes.',
		}),
		ApiResponse({
			status: 200,
			description: 'Service is ready to handle requests',
			schema: {
				type: 'object',
				properties: {
					status: { 
						type: 'string', 
						example: 'ready',
						description: 'Service readiness status' 
					},
					services: {
						type: 'array',
						items: { type: 'string' },
						example: ['redis', 'auth', 'storage'],
						description: 'List of services that are ready',
					},
					timestamp: {
						type: 'string',
						format: 'date-time',
						description: 'When readiness was checked',
					},
					readyIn: {
						type: 'number',
						example: 5000,
						description: 'Time taken to become ready (milliseconds)',
					},
				},
			},
		}),
		ApiResponse({
			status: 503,
			description: 'Service is not ready to handle requests',
			schema: {
				type: 'object',
				properties: {
					status: { type: 'string', example: 'not-ready' },
					services: {
						type: 'array',
						items: { type: 'string' },
						example: ['redis'],
						description: 'List of services that are not ready',
					},
					errors: {
						type: 'array',
						items: { type: 'string' },
						example: ['Redis connection timeout'],
					},
				},
			},
		}),
	);
}

/**
 * Swagger documentation for Terminus health check endpoint
 */
export function ApiTerminusHealthCheck() {
	return applyDecorators(
		ApiOperation({
			summary: 'Advanced health check using NestJS Terminus',
			description: 'Advanced health check using the @nestjs/terminus library with detailed component checks including memory limits, disk usage, and external service dependencies. Returns standardized health check format.',
		}),
		ApiResponse({
			status: 200,
			description: 'All health checks passed',
			schema: {
				type: 'object',
				properties: {
					status: { 
						type: 'string', 
						example: 'ok',
						description: 'Overall health status' 
					},
					info: {
						type: 'object',
						description: 'Successful health check results',
						properties: {
							memory_heap: {
								type: 'object',
								properties: {
									status: { type: 'string', example: 'up' },
									used: { type: 'number', example: 67108864 },
									limit: { type: 'number', example: 157286400 },
								},
							},
							memory_rss: {
								type: 'object',
								properties: {
									status: { type: 'string', example: 'up' },
									used: { type: 'number', example: 104857600 },
									limit: { type: 'number', example: 209715200 },
								},
							},
						},
					},
					error: {
						type: 'object',
						description: 'Failed health check results',
						example: {},
					},
					details: {
						type: 'object',
						description: 'Detailed results for all checks',
						properties: {
							memory_heap: {
								type: 'object',
								properties: {
									status: { type: 'string', example: 'up' },
									message: { type: 'string', example: 'Heap memory usage is healthy' },
									used: { type: 'number', description: 'Used heap memory in bytes' },
									limit: { type: 'number', description: 'Heap memory limit in bytes' },
								},
							},
						},
					},
				},
			},
		}),
		ApiResponse({
			status: 503,
			description: 'One or more health checks failed',
			schema: {
				type: 'object',
				properties: {
					status: { type: 'string', example: 'error' },
					info: { type: 'object', description: 'Successful checks' },
					error: {
						type: 'object',
						description: 'Failed health check results',
						properties: {
							memory_heap: {
								type: 'object',
								properties: {
									status: { type: 'string', example: 'down' },
									message: { type: 'string', example: 'Used heap memory exceeds limit' },
									used: { type: 'number', example: 167772160 },
									limit: { type: 'number', example: 157286400 },
								},
							},
						},
					},
					details: { type: 'object', description: 'All check details' },
				},
			},
		}),
	);
}

/**
 * Swagger documentation for startup probe endpoint
 */
export function ApiGetStartup() {
	return applyDecorators(
		ApiOperation({
			summary: 'Startup probe',
			description: 'Checks if the service has completed its startup sequence successfully. Used by container orchestrators to determine when the service is fully initialized and ready for liveness/readiness probes.',
		}),
		ApiResponse({
			status: 200,
			description: 'Service has started successfully',
			schema: {
				type: 'object',
				properties: {
					status: { 
						type: 'string', 
						example: 'started',
						description: 'Always "started" when service is fully initialized' 
					},
					uptime: { 
						type: 'number', 
						example: 123456,
						description: 'Service uptime in milliseconds' 
					},
					initializationTime: { 
						type: 'number', 
						example: 5000,
						description: 'Time taken to initialize in milliseconds' 
					},
					startedAt: {
						type: 'string',
						format: 'date-time',
						example: '2024-01-20T16:40:00.000Z',
						description: 'When the service started',
					},
					initializationPhases: {
						type: 'object',
						description: 'Startup phase timings',
						properties: {
							configuration: { type: 'number', example: 500 },
							database: { type: 'number', example: 1200 },
							cache: { type: 'number', example: 300 },
							services: { type: 'number', example: 800 },
							routes: { type: 'number', example: 200 },
						},
					},
				},
			},
		}),
		ApiResponse({
			status: 503,
			description: 'Service is still starting up',
		}),
	);
}

/**
 * Health check endpoints overview
 */
export function ApiHealthOverview() {
	return applyDecorators(
		ApiOperation({
			summary: 'Health Check Endpoints Overview',
			description: `
**Health Check Endpoints**

This service provides multiple health check endpoints designed for different use cases:

1. **GET /health** - Comprehensive health status with detailed metrics
   - Use for: Monitoring dashboards, detailed debugging
   - Response time: ~50-100ms
   - Includes: All service components, memory, system info

2. **GET /health/live** - Liveness probe (fastest response)
   - Use for: Container liveness probes
   - Response time: ~5-10ms  
   - Includes: Basic process status only

3. **GET /health/ready** - Readiness probe with dependency checks
   - Use for: Load balancer health checks, container readiness probes
   - Response time: ~20-30ms
   - Includes: Critical dependency validation

4. **GET /health/check** - Advanced Terminus health checks
   - Use for: Detailed service validation, integration tests
   - Response time: ~30-50ms
   - Includes: Memory limits, performance thresholds

5. **GET /health/startup** - Startup probe
   - Use for: Container startup probes, initialization validation
   - Response time: ~5-10ms
   - Includes: Startup timing and phase information

**Recommended Usage**
- Kubernetes liveness: \`/health/live\`
- Kubernetes readiness: \`/health/ready\`  
- Kubernetes startup: \`/health/startup\`
- Load balancer: \`/health/ready\`
- Monitoring: \`/health\`
- CI/CD validation: \`/health/check\`
			`,
		}),
	);
}

/**
 * Schema definitions for health responses
 */
export const HealthSchemas = {
	ServiceHealth: ServiceHealthSchema,
	HealthStatus: {
		type: 'object',
		properties: {
			status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
			services: { type: 'object' },
			timestamp: { type: 'string', format: 'date-time' },
		},
	},
};

/**
 * Complete Swagger documentation for health module
 */
export function ApiHealthModule() {
	return applyDecorators(
		ApiTags('health'),
		ApiHealthOverview(),
	);
}