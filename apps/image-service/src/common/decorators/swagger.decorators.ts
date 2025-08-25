import { applyDecorators } from '@nestjs/common';
import { ApiConsumes, ApiBody, ApiResponse, ApiSecurity, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ImageUploadResponseDto, BatchUploadResponseDto, ImageMetadataDto, DeleteImageResponseDto } from '../dto';
import { IMAGE_CONSTANTS } from '../constants';

/**
 * Standard decorator for image upload endpoints
 * Includes multipart/form-data consumption and common responses
 */
export function ApiImageUpload(options?: { summary?: string; description?: string; multiple?: boolean; includeOptions?: boolean }) {
	const {
		summary = options?.multiple ? 'Upload multiple images' : 'Upload a single image',
		description = options?.multiple
			? 'Upload multiple image files in a single request'
			: 'Upload a single image file with optional metadata',
		multiple = false,
		includeOptions = true,
	} = options || {};

	const decorators = [ApiOperation({ summary, description }), ApiConsumes('multipart/form-data'), ApiSecurity('api-key')];

	// Add body schema
	if (multiple) {
		decorators.push(
			ApiBody({
				description: 'Multiple image files to upload',
				schema: {
					type: 'object',
					properties: {
						images: {
							type: 'array',
							items: {
								type: 'string',
								format: 'binary',
							},
							description: `Array of image files (max ${IMAGE_CONSTANTS.MAX_FILES_PER_REQUEST} files)`,
						},
						...(includeOptions && {
							ttl: {
								type: 'number',
								description: 'Time to live in seconds for all images',
								minimum: IMAGE_CONSTANTS.MIN_TTL_SECONDS,
								maximum: IMAGE_CONSTANTS.MAX_TTL_SECONDS,
								example: 3600,
							},
							userId: {
								type: 'string',
								description: 'User identifier for tracking',
								example: 'user_123',
							},
						}),
					},
					required: ['images'],
				},
			}),
		);
	} else {
		decorators.push(
			ApiBody({
				description: 'Image file to upload',
				schema: {
					type: 'object',
					properties: {
						image: {
							type: 'string',
							format: 'binary',
							description: 'Image file (JPEG, PNG, GIF, WebP, BMP, TIFF)',
						},
					},
					required: ['image'],
				},
			}),
		);

		if (includeOptions) {
			decorators.push(
				ApiQuery({
					name: 'ttl',
					required: false,
					type: Number,
					description: `Time to live in seconds (${IMAGE_CONSTANTS.MIN_TTL_SECONDS}-${IMAGE_CONSTANTS.MAX_TTL_SECONDS})`,
					example: IMAGE_CONSTANTS.DEFAULT_TTL_SECONDS,
				}),
				ApiQuery({
					name: 'userId',
					required: false,
					type: String,
					description: 'User identifier for tracking',
					example: 'user_123',
				}),
			);
		}
	}

	return applyDecorators(...decorators);
}

/**
 * Standard decorator for image response documentation
 */
export function ApiImageResponse(options?: { multiple?: boolean; includeMetadata?: boolean }) {
	const { multiple = false, includeMetadata = false } = options || {};

	const decorators = [
		ApiResponse({
			status: 201,
			description: multiple ? 'Batch upload completed' : 'Image uploaded successfully',
			type: multiple ? BatchUploadResponseDto : ImageUploadResponseDto,
		}),
	];

	if (includeMetadata) {
		decorators.push(
			ApiResponse({
				status: 200,
				description: 'Image metadata retrieved',
				type: ImageMetadataDto,
			}),
		);
	}

	return applyDecorators(...decorators);
}

/**
 * Standard error responses for image-related endpoints
 */
export function ApiErrorResponses(options?: {
	includeNotFound?: boolean;
	includeValidation?: boolean;
	includeAuth?: boolean;
	includeRateLimit?: boolean;
}) {
	const { includeNotFound = false, includeValidation = true, includeAuth = true, includeRateLimit = false } = options || {};

	const decorators: any[] = [];

	if (includeValidation) {
		decorators.push(
			ApiResponse({
				status: 400,
				description: 'Invalid file, validation error, or bad request',
				schema: {
					type: 'object',
					properties: {
						statusCode: { type: 'number', example: 400 },
						message: {
							oneOf: [
								{ type: 'string', example: 'Invalid file type' },
								{ type: 'array', items: { type: 'string' }, example: ['File too large', 'Invalid MIME type'] },
							],
						},
						error: { type: 'string', example: 'Bad Request' },
					},
				},
			}),
		);
	}

	if (includeAuth) {
		decorators.push(
			ApiResponse({
				status: 401,
				description: 'Unauthorized - Invalid or missing API key',
				schema: {
					type: 'object',
					properties: {
						statusCode: { type: 'number', example: 401 },
						message: { type: 'string', example: 'Unauthorized' },
						error: { type: 'string', example: 'Unauthorized' },
					},
				},
			}),
			ApiResponse({
				status: 403,
				description: 'Forbidden - Invalid HMAC signature or insufficient permissions',
				schema: {
					type: 'object',
					properties: {
						statusCode: { type: 'number', example: 403 },
						message: { type: 'string', example: 'Invalid signature' },
						error: { type: 'string', example: 'Forbidden' },
					},
				},
			}),
		);
	}

	if (includeNotFound) {
		decorators.push(
			ApiResponse({
				status: 404,
				description: 'Image not found or expired',
				schema: {
					type: 'object',
					properties: {
						statusCode: { type: 'number', example: 404 },
						message: { type: 'string', example: 'Image not found or has expired' },
						error: { type: 'string', example: 'Not Found' },
					},
				},
			}),
		);
	}

	if (includeRateLimit) {
		decorators.push(
			ApiResponse({
				status: 429,
				description: 'Too Many Requests - Rate limit exceeded',
				schema: {
					type: 'object',
					properties: {
						statusCode: { type: 'number', example: 429 },
						message: { type: 'string', example: 'Rate limit exceeded. Try again later.' },
						error: { type: 'string', example: 'Too Many Requests' },
					},
				},
			}),
		);
	}

	decorators.push(
		ApiResponse({
			status: 500,
			description: 'Internal server error',
			schema: {
				type: 'object',
				properties: {
					statusCode: { type: 'number', example: 500 },
					message: { type: 'string', example: 'Internal server error' },
					error: { type: 'string', example: 'Internal Server Error' },
				},
			},
		}),
	);

	return applyDecorators(...decorators);
}

/**
 * Authentication requirement decorator
 * Documents API key and optional HMAC authentication
 */
export function ApiAuthRequired(options?: { requireHmac?: boolean; description?: string }) {
	const {
		requireHmac = false,
		description = requireHmac ? 'Requires both API key and HMAC signature authentication' : 'Requires API key authentication',
	} = options || {};

	const decorators: any[] = [ApiSecurity('api-key')];

	if (requireHmac) {
		decorators.push(ApiSecurity('hmac-signature'));
	}

	// Add operation description if provided
	if (description) {
		decorators.push(
			ApiOperation({
				description: `${description}. Authentication headers: x-api-key${requireHmac ? ', x-signature' : ''}`,
			}),
		);
	}

	return applyDecorators(...decorators);
}

/**
 * Standard decorator for image retrieval endpoints
 */
export function ApiImageRetrieval(options?: { includeMetadata?: boolean; description?: string }) {
	const { includeMetadata = false, description = 'Retrieve image by ID' } = options || {};

	const decorators = [
		ApiOperation({
			summary: includeMetadata ? 'Get image metadata' : 'Retrieve image',
			description: includeMetadata ? 'Get image metadata without downloading the actual image data' : description,
		}),
		ApiParam({
			name: 'id',
			description: 'Unique image identifier (8-32 alphanumeric characters)',
			example: 'abc123def456',
			schema: {
				type: 'string',
				pattern: '^[a-zA-Z0-9_-]{8,32}$',
			},
		}),
		ApiSecurity('api-key'),
	];

	if (includeMetadata) {
		decorators.push(
			ApiResponse({
				status: 200,
				description: 'Image metadata',
				type: ImageMetadataDto,
			}),
		);
	} else {
		decorators.push(
			ApiResponse({
				status: 200,
				description: 'Image data',
				content: {
					'image/jpeg': { schema: { type: 'string', format: 'binary' } },
					'image/png': { schema: { type: 'string', format: 'binary' } },
					'image/gif': { schema: { type: 'string', format: 'binary' } },
					'image/webp': { schema: { type: 'string', format: 'binary' } },
					'image/bmp': { schema: { type: 'string', format: 'binary' } },
					'image/tiff': { schema: { type: 'string', format: 'binary' } },
				},
				headers: {
					'Content-Type': {
						description: 'MIME type of the image',
						schema: { type: 'string', example: 'image/png' },
					},
					'Content-Length': {
						description: 'Size of the image in bytes',
						schema: { type: 'integer', example: 1024000 },
					},
					'Content-Disposition': {
						description: 'Filename for download',
						schema: { type: 'string', example: 'inline; filename="image.png"' },
					},
					'Cache-Control': {
						description: 'Cache control header',
						schema: { type: 'string', example: 'public, max-age=3600' },
					},
					ETag: {
						description: 'Entity tag for caching',
						schema: { type: 'string', example: '"abc123def456"' },
					},
					'Last-Modified': {
						description: 'Last modification date',
						schema: { type: 'string', example: 'Wed, 20 Jan 2024 14:30:00 GMT' },
					},
				},
			}),
		);
	}

	return applyDecorators(...decorators);
}

/**
 * Standard decorator for image deletion endpoints
 */
export function ApiImageDeletion(options?: { description?: string }) {
	const { description = 'Permanently delete an image and its metadata' } = options || {};

	return applyDecorators(
		ApiOperation({
			summary: 'Delete image',
			description: `${description}. This action cannot be undone.`,
		}),
		ApiParam({
			name: 'id',
			description: 'Unique image identifier to delete',
			example: 'abc123def456',
		}),
		ApiSecurity('api-key'),
		ApiResponse({
			status: 200,
			description: 'Image deleted successfully',
			type: DeleteImageResponseDto,
		}),
	);
}

/**
 * Administrative endpoint decorator
 */
export function ApiAdminEndpoint(options?: { summary?: string; description?: string }) {
	const { summary = 'Administrative endpoint', description = 'Administrative endpoint with restricted access' } = options || {};

	return applyDecorators(
		ApiOperation({
			summary: `[ADMIN] ${summary}`,
			description: `${description}. This endpoint may require additional authentication or permissions.`,
		}),
		ApiSecurity('api-key'),
		ApiResponse({
			status: 401,
			description: 'Unauthorized - Admin access required',
		}),
		ApiResponse({
			status: 403,
			description: 'Forbidden - Insufficient permissions',
		}),
	);
}
