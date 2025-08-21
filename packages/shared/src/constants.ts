/**
 * Image service constants shared between applications
 */
export const SHARED_IMAGE_CONSTANTS = {
  // File size limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_BATCH_FILES: 10,
  
  // TTL limits (in seconds)
  MIN_TTL_SECONDS: 300, // 5 minutes
  MAX_TTL_SECONDS: 604800, // 7 days
  DEFAULT_TTL_SECONDS: 3600, // 1 hour
  
  // Supported formats
  SUPPORTED_MIME_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
  ] as const,
  
  SUPPORTED_EXTENSIONS: [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif', 
    '.webp',
    '.bmp',
    '.tiff',
    '.tif',
  ] as const,
  
  // API endpoints
  ENDPOINTS: {
    UPLOAD: '/upload',
    BATCH_UPLOAD: '/upload/batch',
    IMAGES: '/images',
    HEALTH: '/health',
    AUTH: '/auth',
  } as const,
  
  // Error codes
  ERROR_CODES: {
    INVALID_IMAGE_ID: 'INVALID_IMAGE_ID',
    IMAGE_NOT_FOUND: 'IMAGE_NOT_FOUND',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    UPLOAD_FAILED: 'UPLOAD_FAILED',
    STORAGE_ERROR: 'STORAGE_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
  } as const,
  
  // Error messages
  ERROR_MESSAGES: {
    INVALID_IMAGE_ID: 'Invalid image ID format',
    IMAGE_NOT_FOUND: 'Image not found or expired',
    FILE_TOO_LARGE: 'File size exceeds maximum allowed',
    INVALID_FILE_TYPE: 'File type not supported',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    UNAUTHORIZED: 'Invalid or missing API key',
    UPLOAD_FAILED: 'Failed to upload image',
    STORAGE_ERROR: 'Storage operation failed',
    VALIDATION_ERROR: 'Request validation failed',
  } as const,
  
  // Rate limits
  RATE_LIMITS: {
    UPLOADS_PER_HOUR: 50,
    BATCH_UPLOADS_PER_HOUR: 10,
    DELETES_PER_HOUR: 100,
  } as const,
  
  // Headers
  HEADERS: {
    API_KEY: 'x-api-key',
    HMAC_SIGNATURE: 'x-hmac-signature',
    TIMESTAMP: 'x-timestamp',
    USER_ID: 'x-user-id',
  } as const,
  
  // Image ID validation
  ID_VALIDATION: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 32,
    ALLOWED_CHARACTERS: /^[a-zA-Z0-9_-]+$/,
  } as const,
} as const;

/**
 * Discord integration constants
 */
export const DISCORD_CONSTANTS = {
  // File upload limits for Discord
  MAX_ATTACHMENT_SIZE: 8 * 1024 * 1024, // 8MB for free users
  MAX_ATTACHMENT_SIZE_NITRO: 100 * 1024 * 1024, // 100MB for Nitro users
  
  // Discord CDN URLs
  CDN_BASE_URL: 'https://cdn.discordapp.com',
  
  // Embed limits
  MAX_EMBED_DESCRIPTION: 4096,
  MAX_EMBED_FIELDS: 25,
  MAX_EMBED_FIELD_NAME: 256,
  MAX_EMBED_FIELD_VALUE: 1024,
  
  // Colors
  COLORS: {
    SUCCESS: 0x00ff00,
    ERROR: 0xff0000,
    WARNING: 0xffaa00,
    INFO: 0x0099ff,
    NEUTRAL: 0x666666,
  } as const,
} as const;

/**
 * GitHub integration constants
 */
export const GITHUB_CONSTANTS = {
  // Workflow file
  WORKFLOW_FILE: '.github/workflows/claude.yml',
  
  // API endpoints
  API_BASE_URL: 'https://api.github.com',
  
  // Rate limits
  RATE_LIMIT_REQUESTS: 5000, // per hour for authenticated requests
  
  // File size limits
  MAX_FILE_SIZE_API: 1024 * 1024, // 1MB via API
  MAX_FILE_SIZE_GIT: 100 * 1024 * 1024, // 100MB via Git LFS
} as const;