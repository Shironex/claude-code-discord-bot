import * as Joi from 'joi';

/**
 * Comprehensive validation schema for all environment variables used by the image service
 * Ensures application fails fast with clear error messages for invalid configuration
 */
export const validationSchema = Joi.object({
	// === Core Application Configuration ===
	NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development').description('Application environment'),

	PORT: Joi.number().port().default(3001).description('Server port number'),

	IMAGE_SERVICE_BASE_URL: Joi.string()
		.uri({ scheme: ['http', 'https'] })
		.optional()
		.description('Base URL for the image service (used for generating image URLs)'),

	// === Authentication Configuration ===
	DISCORD_BOT_API_KEY: Joi.string().min(32).optional().description('API key for Discord bot authentication'),

	CLAUDE_CODE_API_KEY: Joi.string().min(32).optional().description('API key for Claude Code authentication'),

	HMAC_SECRET: Joi.string().min(32).optional().description('Secret key for HMAC signature validation'),

	REQUIRE_HMAC: Joi.boolean().default(false).description('Whether HMAC validation is required'),

	// === Redis Configuration ===
	REDIS_HOST: Joi.string().hostname().default('localhost').description('Redis server hostname'),

	REDIS_PORT: Joi.number().port().default(6379).description('Redis server port'),

	REDIS_PASSWORD: Joi.string().optional().allow('').description('Redis server password (optional)'),

	REDIS_DB: Joi.number().integer().min(0).max(15).default(0).description('Redis database number (0-15)'),

	REDIS_MAX_RETRIES: Joi.number().integer().min(0).max(10).default(3).description('Maximum Redis connection retries'),

	REDIS_RETRY_DELAY: Joi.number().integer().min(50).max(5000).default(100).description('Redis retry delay in milliseconds'),

	// === File Upload Configuration ===
	MAX_FILE_SIZE: Joi.number()
		.integer()
		.min(1024) // 1KB minimum
		.max(100 * 1024 * 1024) // 100MB maximum
		.default(10 * 1024 * 1024) // 10MB default
		.description('Maximum file size in bytes'),

	MAX_FILES_PER_REQUEST: Joi.number().integer().min(1).max(50).default(10).description('Maximum number of files per upload request'),

	ALLOWED_MIMETYPES: Joi.string()
		.pattern(/^image\/[a-z0-9+.-]+(,\s*image\/[a-z0-9+.-]+)*$/)
		.optional()
		.description('Comma-separated list of allowed MIME types (must start with image/)'),

	// === TTL Configuration ===
	DEFAULT_TTL_SECONDS: Joi.number()
		.integer()
		.min(300) // 5 minutes minimum
		.max(86400 * 7) // 1 week maximum
		.default(1800) // 30 minutes default
		.description('Default TTL for uploaded images in seconds'),

	MIN_TTL_SECONDS: Joi.number()
		.integer()
		.min(60) // 1 minute minimum
		.max(3600) // 1 hour maximum
		.default(300) // 5 minutes default
		.description('Minimum allowed TTL in seconds'),

	MAX_TTL_SECONDS: Joi.number()
		.integer()
		.min(3600) // 1 hour minimum
		.max(86400 * 30) // 30 days maximum
		.default(86400 * 2) // 2 days default
		.description('Maximum allowed TTL in seconds'),

	// === Rate Limiting Configuration ===
	MAX_FILES_PER_HOUR: Joi.number().integer().min(1).max(1000).default(50).description('Maximum files per user per hour'),

	MAX_TOTAL_SIZE_PER_REQUEST: Joi.number()
		.integer()
		.min(1024) // 1KB minimum
		.max(500 * 1024 * 1024) // 500MB maximum
		.default(50 * 1024 * 1024) // 50MB default
		.description('Maximum total size per upload request in bytes'),

	// === CORS Configuration ===
	CORS_ORIGIN: Joi.alternatives()
		.try(
			Joi.string().valid('*'),
			Joi.string().uri({ scheme: ['http', 'https'] }),
			Joi.string().pattern(/^(https?:\/\/[^,]+)(,\s*https?:\/\/[^,]+)*$/),
		)
		.default('http://localhost:3000')
		.description('CORS origins - single URL, comma-separated URLs, or * for all'),

	CORS_CREDENTIALS: Joi.boolean().default(false).description('Whether to allow credentials in CORS requests'),

	// === Security Configuration ===
	MAX_TIMESTAMP_DRIFT: Joi.number()
		.integer()
		.min(60) // 1 minute minimum
		.max(3600) // 1 hour maximum
		.default(300) // 5 minutes default
		.description('Maximum allowed timestamp drift in seconds'),

	ENABLE_HMAC_VALIDATION: Joi.boolean().default(false).description('Whether to enable HMAC signature validation'),

	// === Documentation Configuration ===
	ENABLE_SWAGGER: Joi.boolean().default(true).description('Whether to enable Swagger/OpenAPI documentation'),

	ENABLE_SCALAR: Joi.boolean().default(true).description('Whether to enable Scalar API reference'),

	// === Security Headers Configuration ===
	HSTS_MAX_AGE: Joi.number()
		.integer()
		.min(0)
		.max(31536000 * 2) // 2 years maximum
		.default(31536000) // 1 year default
		.description('HSTS max age in seconds'),

	HSTS_INCLUDE_SUBDOMAINS: Joi.boolean().default(true).description('Whether to include subdomains in HSTS'),

	HSTS_PRELOAD: Joi.boolean().default(true).description('Whether to enable HSTS preload'),

	REFERRER_POLICY: Joi.string()
		.valid(
			'no-referrer',
			'no-referrer-when-downgrade',
			'origin',
			'origin-when-cross-origin',
			'same-origin',
			'strict-origin',
			'strict-origin-when-cross-origin',
			'unsafe-url',
		)
		.default('no-referrer')
		.description('Referrer policy setting'),

	// === Cleanup Configuration (Optional) ===
	CLEANUP_INTERVAL: Joi.number()
		.integer()
		.min(60) // 1 minute minimum
		.max(3600) // 1 hour maximum
		.default(300) // 5 minutes default
		.description('File cleanup check interval in seconds'),
})
	.custom((value, helpers) => {
		// Custom validation: MIN_TTL <= DEFAULT_TTL <= MAX_TTL
		const minTtl = value.MIN_TTL_SECONDS || 300;
		const defaultTtl = value.DEFAULT_TTL_SECONDS || 1800;
		const maxTtl = value.MAX_TTL_SECONDS || 172800;

		if (minTtl > defaultTtl) {
			return helpers.error('custom.ttl.min_greater_than_default', {
				minTtl,
				defaultTtl,
			});
		}

		if (defaultTtl > maxTtl) {
			return helpers.error('custom.ttl.default_greater_than_max', {
				defaultTtl,
				maxTtl,
			});
		}

		// Custom validation: Ensure at least one API key is provided in production
		if (value.NODE_ENV === 'production') {
			const hasDiscordKey = value.DISCORD_BOT_API_KEY && value.DISCORD_BOT_API_KEY.length >= 32;
			const hasClaudeKey = value.CLAUDE_CODE_API_KEY && value.CLAUDE_CODE_API_KEY.length >= 32;

			if (!hasDiscordKey && !hasClaudeKey) {
				return helpers.error('custom.auth.no_api_keys_in_production');
			}

			// In production, if HMAC is enabled, secret must be provided
			if (value.ENABLE_HMAC_VALIDATION && (!value.HMAC_SECRET || value.HMAC_SECRET.length < 32)) {
				return helpers.error('custom.auth.hmac_secret_required_in_production');
			}
		}

		return value;
	})
	.messages({
		'custom.ttl.min_greater_than_default': 'MIN_TTL_SECONDS ({#minTtl}) cannot be greater than DEFAULT_TTL_SECONDS ({#defaultTtl})',
		'custom.ttl.default_greater_than_max': 'DEFAULT_TTL_SECONDS ({#defaultTtl}) cannot be greater than MAX_TTL_SECONDS ({#maxTtl})',
		'custom.auth.no_api_keys_in_production':
			'At least one API key (DISCORD_BOT_API_KEY or CLAUDE_CODE_API_KEY) must be provided in production',
		'custom.auth.hmac_secret_required_in_production':
			'HMAC_SECRET must be provided and at least 32 characters when ENABLE_HMAC_VALIDATION is true in production',
	});
