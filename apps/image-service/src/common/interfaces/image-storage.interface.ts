/**
 * Interface for image storage operations
 */
export interface IImageStorage {
	/**
	 * Store an image with TTL
	 * @param id Unique image identifier
	 * @param imageData Image buffer or data
	 * @param metadata Image metadata
	 * @param ttlSeconds Time to live in seconds
	 * @returns Promise<void>
	 */
	store(id: string, imageData: Buffer, metadata: ImageMetadata, ttlSeconds: number): Promise<void>;

	/**
	 * Retrieve an image by ID
	 * @param id Image identifier
	 * @returns Promise<StoredImage | null>
	 */
	get(id: string): Promise<StoredImage | null>;

	/**
	 * Delete an image by ID
	 * @param id Image identifier
	 * @returns Promise<boolean> - true if deleted, false if not found
	 */
	delete(id: string): Promise<boolean>;

	/**
	 * Check if an image exists
	 * @param id Image identifier
	 * @returns Promise<boolean>
	 */
	exists(id: string): Promise<boolean>;

	/**
	 * Get image metadata without the image data
	 * @param id Image identifier
	 * @returns Promise<ImageMetadata | null>
	 */
	getMetadata(id: string): Promise<ImageMetadata | null>;

	/**
	 * Extend TTL for an existing image
	 * @param id Image identifier
	 * @param ttlSeconds New TTL in seconds
	 * @returns Promise<boolean> - true if TTL was extended, false if image not found
	 */
	extendTtl(id: string, ttlSeconds: number): Promise<boolean>;

	/**
	 * Get all image IDs (for cleanup operations)
	 * @returns Promise<string[]>
	 */
	getAllImageIds(): Promise<string[]>;

	/**
	 * Cleanup expired images
	 * @returns Promise<number> - number of cleaned up images
	 */
	cleanup(): Promise<number>;
}

/**
 * Image metadata structure
 */
export interface ImageMetadata {
	id: string;
	size: number;
	mimeType: string;
	uploadedAt: Date;
	expiresAt: Date;
	originalName?: string;
	userId?: string;
}

/**
 * Stored image with data and metadata
 */
export interface StoredImage {
	data: Buffer;
	metadata: ImageMetadata;
}

/**
 * Rate limiting interface
 */
export interface IRateLimit {
	/**
	 * Check if a user has exceeded rate limits
	 * @param userId User identifier
	 * @param action Action being performed (upload, batch, etc.)
	 * @returns Promise<RateLimitResult>
	 */
	checkLimit(userId: string, action: RateLimitAction): Promise<RateLimitResult>;

	/**
	 * Record an action for rate limiting
	 * @param userId User identifier
	 * @param action Action being performed
	 * @param count Number of items (for batch operations)
	 * @returns Promise<void>
	 */
	recordAction(userId: string, action: RateLimitAction, count?: number): Promise<void>;

	/**
	 * Get current rate limit status for a user
	 * @param userId User identifier
	 * @returns Promise<RateLimitStatus>
	 */
	getStatus(userId: string): Promise<RateLimitStatus>;

	/**
	 * Reset rate limits for a user (admin operation)
	 * @param userId User identifier
	 * @returns Promise<void>
	 */
	reset(userId: string): Promise<void>;
}

/**
 * Rate limit actions
 */
export type RateLimitAction = 'upload' | 'batch_upload' | 'delete';

/**
 * Rate limit check result
 */
export interface RateLimitResult {
	allowed: boolean;
	remainingQuota: number;
	resetTime: Date;
	reason?: string;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
	userId: string;
	currentUsage: number;
	maxQuota: number;
	resetTime: Date;
	actions: Record<RateLimitAction, number>;
}

/**
 * Upload configuration interface
 */
export interface UploadConfig {
	maxFileSize: number;
	maxFiles: number;
	allowedMimeTypes: string[];
	allowedExtensions: string[];
	defaultTtl: number;
	maxTtl: number;
	minTtl: number;
}

/**
 * Storage statistics interface
 */
export interface StorageStats {
	totalImages: number;
	totalSize: number;
	expiredImages: number;
	oldestImage: Date | null;
	newestImage: Date | null;
	averageSize: number;
}

/**
 * Cleanup result interface
 */
export interface CleanupResult {
	cleanedCount: number;
	totalSize: number;
	errors: string[];
	duration: number;
}
