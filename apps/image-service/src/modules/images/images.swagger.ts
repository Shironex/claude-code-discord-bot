import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiImageRetrieval, ApiImageDeletion, ApiErrorResponses, ApiAdminEndpoint } from '../../common/decorators/swagger.decorators';

/**
 * Swagger documentation for image retrieval endpoint
 */
export function ApiGetImage() {
	return applyDecorators(
		ApiImageRetrieval({
			description:
				'Retrieve image data by its unique identifier. Returns the raw image file with appropriate headers for caching and metadata.',
		}),
		ApiErrorResponses({
			includeNotFound: true,
			includeAuth: true,
			includeValidation: true,
		}),
	);
}

/**
 * Swagger documentation for image metadata endpoint
 */
export function ApiGetImageMetadata() {
	return applyDecorators(
		ApiImageRetrieval({
			includeMetadata: true,
			description: 'Get image metadata including size, type, upload time, and expiration without downloading the actual image data.',
		}),
		ApiErrorResponses({
			includeNotFound: true,
			includeAuth: true,
			includeValidation: true,
		}),
	);
}

/**
 * Swagger documentation for image deletion endpoint
 */
export function ApiDeleteImage() {
	return applyDecorators(
		ApiImageDeletion({
			description: 'Permanently delete an image and all its metadata from storage',
		}),
		ApiErrorResponses({
			includeNotFound: true,
			includeAuth: true,
			includeValidation: true,
		}),
	);
}

/**
 * Swagger documentation for storage statistics endpoint (admin)
 */
export function ApiGetStorageStats() {
	return applyDecorators(
		ApiAdminEndpoint({
			summary: 'Get storage statistics',
			description: 'Retrieve comprehensive storage usage statistics including total images, sizes, and cleanup metrics',
		}),
		ApiResponse({
			status: 200,
			description: 'Storage statistics retrieved successfully',
			schema: {
				type: 'object',
				properties: {
					totalImages: {
						type: 'number',
						example: 150,
						description: 'Total number of images currently stored',
					},
					totalSize: {
						type: 'number',
						example: 52428800,
						description: 'Total storage used in bytes',
					},
					expiredImages: {
						type: 'number',
						example: 5,
						description: 'Number of images that have expired but not yet cleaned up',
					},
					oldestImage: {
						type: 'string',
						format: 'date-time',
						nullable: true,
						example: '2024-01-20T10:30:00.000Z',
						description: 'Upload timestamp of oldest stored image',
					},
					newestImage: {
						type: 'string',
						format: 'date-time',
						nullable: true,
						example: '2024-01-20T16:45:00.000Z',
						description: 'Upload timestamp of most recently stored image',
					},
					averageSize: {
						type: 'number',
						example: 349525,
						description: 'Average file size in bytes',
					},
					storageDistribution: {
						type: 'object',
						description: 'Storage usage by image type',
						properties: {
							'image/jpeg': { type: 'number', example: 25 },
							'image/png': { type: 'number', example: 15 },
							'image/gif': { type: 'number', example: 5 },
							'image/webp': { type: 'number', example: 5 },
						},
					},
					sizeBuckets: {
						type: 'object',
						description: 'Distribution of images by size ranges',
						properties: {
							small: {
								type: 'object',
								properties: {
									count: { type: 'number', example: 50 },
									maxSize: { type: 'number', example: 100000 },
									description: { type: 'string', example: 'Images under 100KB' },
								},
							},
							medium: {
								type: 'object',
								properties: {
									count: { type: 'number', example: 75 },
									maxSize: { type: 'number', example: 1000000 },
									description: { type: 'string', example: 'Images 100KB - 1MB' },
								},
							},
							large: {
								type: 'object',
								properties: {
									count: { type: 'number', example: 25 },
									maxSize: { type: 'number', example: 10485760 },
									description: { type: 'string', example: 'Images over 1MB' },
								},
							},
						},
					},
				},
			},
		}),
		ApiErrorResponses({ includeAuth: true }),
	);
}

/**
 * Swagger documentation for manual cleanup trigger endpoint (admin)
 */
export function ApiTriggerCleanup() {
	return applyDecorators(
		ApiAdminEndpoint({
			summary: 'Trigger manual cleanup',
			description: 'Manually trigger cleanup of expired images and temporary files. Returns detailed cleanup results.',
		}),
		ApiResponse({
			status: 200,
			description: 'Cleanup operation completed',
			schema: {
				type: 'object',
				properties: {
					success: {
						type: 'boolean',
						example: true,
						description: 'Whether the cleanup operation completed successfully',
					},
					result: {
						type: 'object',
						description: 'Detailed cleanup results',
						properties: {
							cleanedCount: {
								type: 'number',
								example: 12,
								description: 'Number of images/files cleaned up',
							},
							totalSize: {
								type: 'number',
								example: 5242880,
								description: 'Total size in bytes of cleaned up files',
							},
							duration: {
								type: 'number',
								example: 1500,
								description: 'Cleanup operation duration in milliseconds',
							},
							errors: {
								type: 'array',
								items: { type: 'string' },
								example: ['Failed to delete image_123: File not found'],
								description: 'List of errors encountered during cleanup',
							},
							breakdown: {
								type: 'object',
								description: 'Cleanup breakdown by type',
								properties: {
									expiredImages: { type: 'number', example: 10 },
									orphanedMetadata: { type: 'number', example: 2 },
									tempFiles: { type: 'number', example: 0 },
								},
							},
						},
					},
					error: {
						type: 'string',
						nullable: true,
						example: null,
						description: 'Error message if cleanup failed completely',
					},
					timestamp: {
						type: 'string',
						format: 'date-time',
						example: '2024-01-20T16:45:00.000Z',
						description: 'When the cleanup was executed',
					},
				},
			},
		}),
		ApiResponse({
			status: 500,
			description: 'Cleanup operation failed',
			schema: {
				type: 'object',
				properties: {
					success: { type: 'boolean', example: false },
					error: { type: 'string', example: 'Failed to access storage directory' },
				},
			},
		}),
		ApiErrorResponses({ includeAuth: true }),
	);
}

/**
 * Swagger documentation for cleanup statistics endpoint (admin)
 */
export function ApiGetCleanupStats() {
	return applyDecorators(
		ApiAdminEndpoint({
			summary: 'Get cleanup operation statistics',
			description: 'Retrieve statistics about automatic and manual cleanup operations including performance metrics and error rates.',
		}),
		ApiResponse({
			status: 200,
			description: 'Cleanup statistics retrieved successfully',
			schema: {
				type: 'object',
				properties: {
					isRunning: {
						type: 'boolean',
						example: false,
						description: 'Whether a cleanup operation is currently in progress',
					},
					lastCleanup: {
						type: 'string',
						format: 'date-time',
						nullable: true,
						example: '2024-01-20T15:30:00.000Z',
						description: 'Timestamp of the last completed cleanup',
					},
					nextScheduledCleanup: {
						type: 'string',
						format: 'date-time',
						nullable: true,
						example: '2024-01-20T16:00:00.000Z',
						description: 'Timestamp of next scheduled automatic cleanup',
					},
					stats: {
						type: 'object',
						description: 'Aggregate cleanup statistics',
						properties: {
							totalRuns: {
								type: 'number',
								example: 48,
								description: 'Total number of cleanup runs since service start',
							},
							totalCleaned: {
								type: 'number',
								example: 456,
								description: 'Total number of items cleaned up',
							},
							totalErrors: {
								type: 'number',
								example: 3,
								description: 'Total number of cleanup errors encountered',
							},
							averageDuration: {
								type: 'number',
								example: 1200,
								description: 'Average cleanup duration in milliseconds',
							},
							totalSizeCleaned: {
								type: 'number',
								example: 157286400,
								description: 'Total size in bytes of all cleaned up files',
							},
						},
					},
					performance: {
						type: 'object',
						description: 'Performance metrics',
						properties: {
							avgFilesPerSecond: { type: 'number', example: 15.5 },
							avgBytesPerSecond: { type: 'number', example: 2097152 },
							fastestRun: { type: 'number', example: 450 },
							slowestRun: { type: 'number', example: 3200 },
						},
					},
					schedule: {
						type: 'object',
						description: 'Cleanup schedule configuration',
						properties: {
							interval: { type: 'number', example: 300000, description: 'Interval in milliseconds' },
							enabled: { type: 'boolean', example: true },
							lastSuccessfulRun: { type: 'string', format: 'date-time', nullable: true },
						},
					},
				},
			},
		}),
		ApiErrorResponses({ includeAuth: true }),
	);
}

/**
 * Complete Swagger documentation for images/storage module
 */
export function ApiImagesModule() {
	return applyDecorators();
	// Module-level documentation if needed
}
