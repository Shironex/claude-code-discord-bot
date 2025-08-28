import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ApiImageUpload, ApiImageResponse, ApiErrorResponses, ApiAuthRequired } from '../../common/decorators/swagger.decorators';

/**
 * Swagger documentation for single image upload endpoint
 */
export function ApiUploadSingle() {
	return applyDecorators(
		ApiImageUpload({
			summary: 'Upload a single image',
			description:
				'Upload a single image file with optional TTL and user tracking. The image will be stored temporarily with automatic cleanup.',
			multiple: false,
			includeOptions: true,
		}),
		ApiImageResponse({ multiple: false }),
		ApiErrorResponses({
			includeValidation: true,
			includeAuth: true,
			includeRateLimit: true,
		}),
	);
}

/**
 * Swagger documentation for batch image upload endpoint
 */
export function ApiUploadBatch() {
	return applyDecorators(
		ApiImageUpload({
			summary: 'Upload multiple images in batch',
			description:
				'Upload multiple image files in a single request. All images will share the same TTL and metadata. Maximum files per request is configurable.',
			multiple: true,
			includeOptions: true,
		}),
		ApiImageResponse({ multiple: true }),
		ApiErrorResponses({
			includeValidation: true,
			includeAuth: true,
			includeRateLimit: true,
		}),
	);
}

/**
 * Swagger documentation for upload statistics endpoint
 */
export function ApiUploadStats() {
	return applyDecorators(
		ApiOperation({
			summary: 'Get upload statistics and metrics',
			description:
				'Retrieve comprehensive upload statistics including total uploads, file sizes, supported formats, and current service limits. Useful for monitoring and capacity planning.',
		}),
		ApiAuthRequired(),
		ApiResponse({
			status: 200,
			description: 'Upload statistics retrieved successfully',
			schema: {
				type: 'object',
				properties: {
					totalUploads: {
						type: 'number',
						example: 1234,
						description: 'Total number of successful uploads since service start',
					},
					totalSize: {
						type: 'number',
						example: 52428800,
						description: 'Total size in bytes of all uploaded images',
					},
					averageFileSize: {
						type: 'number',
						example: 349525,
						description: 'Average file size in bytes',
					},
					supportedFormats: {
						type: 'array',
						items: { type: 'string' },
						example: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
						description: 'List of supported MIME types',
					},
					limits: {
						type: 'object',
						description: 'Current service limits and restrictions',
						properties: {
							maxFileSize: {
								type: 'number',
								example: 10485760,
								description: 'Maximum file size in bytes (per file)',
							},
							maxFiles: {
								type: 'number',
								example: 10,
								description: 'Maximum number of files per batch request',
							},
							maxTotalSize: {
								type: 'number',
								example: 52428800,
								description: 'Maximum total size for batch uploads in bytes',
							},
							maxFilesPerHour: {
								type: 'number',
								example: 50,
								description: 'Rate limit: maximum files per user per hour',
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
 * Swagger documentation for upload limits endpoint
 */
export function ApiUploadLimits() {
	return applyDecorators(
		ApiOperation({
			summary: 'Get current upload limits and configuration',
			description:
				'Retrieve detailed information about upload restrictions, file size limits, supported formats, and TTL configuration. Use this endpoint to validate uploads before attempting them.',
		}),
		ApiAuthRequired(),
		ApiResponse({
			status: 200,
			description: 'Upload limits and configuration',
			schema: {
				type: 'object',
				properties: {
					maxFileSize: {
						type: 'number',
						example: 10485760,
						description: 'Maximum size for individual files in bytes',
					},
					maxFiles: {
						type: 'number',
						example: 10,
						description: 'Maximum files per batch upload request',
					},
					maxTotalSize: {
						type: 'number',
						example: 52428800,
						description: 'Maximum combined size for batch uploads in bytes',
					},
					maxFilesPerHour: {
						type: 'number',
						example: 50,
						description: 'Rate limiting: maximum files per user per hour',
					},
					supportedFormats: {
						type: 'array',
						items: { type: 'string' },
						example: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'],
						description: 'Supported image MIME types',
					},
					supportedExtensions: {
						type: 'array',
						items: { type: 'string' },
						example: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'],
						description: 'Supported file extensions',
					},
					ttlLimits: {
						type: 'object',
						description: 'Time-to-live (TTL) configuration in seconds',
						properties: {
							default: {
								type: 'number',
								example: 1800,
								description: 'Default TTL if not specified (30 minutes)',
							},
							min: {
								type: 'number',
								example: 300,
								description: 'Minimum allowed TTL (5 minutes)',
							},
							max: {
								type: 'number',
								example: 7200,
								description: 'Maximum allowed TTL (2 hours)',
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
 * Swagger documentation for file validation endpoint
 */
export function ApiValidateFile() {
	return applyDecorators(
		ApiOperation({
			summary: 'Validate file without uploading',
			description:
				'Test endpoint to validate an image file against all service constraints without actually storing it. Returns detailed validation results and metadata extraction.',
		}),
		ApiBody({
			description: 'Image file to validate',
			schema: {
				type: 'object',
				properties: {
					image: {
						type: 'string',
						format: 'binary',
						description: 'Image file for validation testing',
					},
				},
				required: ['image'],
			},
		}),
		ApiAuthRequired(),
		ApiResponse({
			status: 200,
			description: 'File validation completed',
			schema: {
				type: 'object',
				properties: {
					isValid: {
						type: 'boolean',
						example: true,
						description: 'Whether the file passes all validation checks',
					},
					warnings: {
						type: 'array',
						items: { type: 'string' },
						example: ['File size is large', 'Uncommon image format'],
						description: 'Non-fatal warnings about the file',
					},
					metadata: {
						type: 'object',
						description: 'Extracted file metadata and analysis',
						properties: {
							detectedType: {
								type: 'string',
								nullable: true,
								example: 'image/jpeg',
								description: 'MIME type detected from file content (magic bytes)',
							},
							declaredType: {
								type: 'string',
								example: 'image/jpeg',
								description: 'MIME type from Content-Type header',
							},
							size: {
								type: 'number',
								example: 1024000,
								description: 'File size in bytes',
							},
							filename: {
								type: 'string',
								example: 'test-image.jpg',
								description: 'Original filename if provided',
							},
							dimensions: {
								type: 'object',
								nullable: true,
								description: 'Image dimensions if detectable',
								properties: {
									width: { type: 'number', example: 1920 },
									height: { type: 'number', example: 1080 },
								},
							},
							colorSpace: {
								type: 'string',
								nullable: true,
								example: 'sRGB',
								description: 'Color space information if detectable',
							},
						},
					},
					validation: {
						type: 'object',
						description: 'Detailed validation results',
						properties: {
							sizeCheck: {
								type: 'boolean',
								description: 'Whether file size is within limits',
							},
							typeCheck: {
								type: 'boolean',
								description: 'Whether MIME type is supported',
							},
							contentCheck: {
								type: 'boolean',
								description: 'Whether file content matches declared type',
							},
							securityCheck: {
								type: 'boolean',
								description: 'Whether file passes security scans',
							},
						},
					},
				},
			},
		}),
		ApiErrorResponses({
			includeValidation: true,
			includeAuth: true,
		}),
	);
}

/**
 * Complete Swagger documentation for upload module
 * Can be used as a module-level decorator if needed
 */
export function ApiUploadModule() {
	return applyDecorators();
	// This would be applied at the controller level
	// Currently not used but available for future module-level docs
}
