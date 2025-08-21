/**
 * Image service constants for file handling and storage
 */
export const IMAGE_CONSTANTS = {
	// File size limits (Discord limit is 10MB, we'll use 10MB as max)
	MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
	MIN_FILE_SIZE: 1024, // 1KB minimum

	// Supported file types
	ALLOWED_MIMETYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'] as const,

	// File extensions for validation
	ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'] as const,

	// Storage configuration
	DEFAULT_TTL_SECONDS: 30 * 60, // 30 minutes
	MAX_TTL_SECONDS: 2 * 60 * 60, // 2 hours
	MIN_TTL_SECONDS: 5 * 60, // 5 minutes

	// Rate limiting
	MAX_FILES_PER_REQUEST: 10,
	MAX_FILES_PER_USER_PER_HOUR: 50,
	MAX_TOTAL_SIZE_PER_REQUEST: 50 * 1024 * 1024, // 50MB total per request

	// Redis keys
	REDIS_KEYS: {
		IMAGE_PREFIX: 'image:',
		USER_RATE_LIMIT_PREFIX: 'rate_limit:user:',
		CLEANUP_LOCK: 'cleanup:lock',
	},

	// API configuration
	API_ENDPOINTS: {
		UPLOAD: '/upload',
		BATCH_UPLOAD: '/upload/batch',
		GET_IMAGE: '/images/:id',
		DELETE_IMAGE: '/images/:id',
		HEALTH: '/health',
	},

	// Security
	API_KEY_HEADER: 'x-api-key',
	HMAC_SIGNATURE_HEADER: 'x-signature',
	TIMESTAMP_HEADER: 'x-timestamp',
	MAX_TIMESTAMP_DRIFT: 5 * 60 * 1000, // 5 minutes

	// Error messages
	ERRORS: {
		FILE_TOO_LARGE: 'File size exceeds maximum allowed size',
		FILE_TOO_SMALL: 'File size is below minimum required size',
		INVALID_FILE_TYPE: 'File type not supported',
		INVALID_FILE_EXTENSION: 'File extension not allowed',
		TOO_MANY_FILES: 'Too many files in request',
		TOTAL_SIZE_EXCEEDED: 'Total file size exceeds limit',
		RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
		INVALID_API_KEY: 'Invalid or missing API key',
		INVALID_SIGNATURE: 'Invalid HMAC signature',
		TIMESTAMP_TOO_OLD: 'Request timestamp too old',
		IMAGE_NOT_FOUND: 'Image not found or expired',
		IMAGE_EXPIRED: 'Image has expired',
		UPLOAD_FAILED: 'Failed to upload image',
		STORAGE_ERROR: 'Storage service error',
		INVALID_IMAGE_ID: 'Invalid image ID format',
	},
} as const;

/**
 * Type definitions for image constants
 */
export type AllowedMimeType = (typeof IMAGE_CONSTANTS.ALLOWED_MIMETYPES)[number];
export type AllowedExtension = (typeof IMAGE_CONSTANTS.ALLOWED_EXTENSIONS)[number];
