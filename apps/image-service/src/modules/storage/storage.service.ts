import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { IImageStorage, ImageMetadata, StoredImage, CleanupResult, StorageStats } from '../../common/interfaces';
import { IMAGE_CONSTANTS } from '../../common/constants';
import { IdGeneratorUtil } from '../../common/utils';

@Injectable()
export class StorageService implements IImageStorage {
	private readonly logger = new Logger(StorageService.name);

	constructor(
		private readonly redisService: RedisService,
		private readonly configService: ConfigService,
	) {}

	/**
	 * Store an image with TTL
	 */
	async store(id: string, imageData: Buffer, metadata: ImageMetadata, ttlSeconds: number): Promise<void> {
		try {
			const imageKey = this.getImageKey(id);
			const metadataKey = this.getMetadataKey(id);

			// Store image data as binary
			await this.redisService.set(imageKey, imageData, ttlSeconds);

			// Store metadata as JSON
			await this.redisService.set(metadataKey, JSON.stringify(metadata), ttlSeconds);

			this.logger.log(`Stored image ${id} with TTL ${ttlSeconds}s`);
		} catch (error) {
			this.logger.error(`Failed to store image ${id}: ${error.message}`, error.stack);
			throw new Error(`Storage operation failed: ${error.message}`);
		}
	}

	/**
	 * Retrieve an image by ID
	 */
	async get(id: string): Promise<StoredImage | null> {
		try {
			const imageKey = this.getImageKey(id);
			const metadataKey = this.getMetadataKey(id);

			// Get both image data and metadata
			const [imageData, metadataJson] = await Promise.all([
				this.redisService.getBuffer(imageKey),
				this.redisService.get(metadataKey),
			]);

			if (!imageData || !metadataJson) {
				return null;
			}

			const metadata = JSON.parse(metadataJson) as ImageMetadata;

			// Check if expired
			if (new Date() > metadata.expiresAt) {
				// Clean up expired image
				await this.delete(id);
				return null;
			}

			return {
				data: imageData,
				metadata,
			};
		} catch (error) {
			this.logger.error(`Failed to retrieve image ${id}: ${error.message}`, error.stack);
			return null;
		}
	}

	/**
	 * Delete an image by ID
	 */
	async delete(id: string): Promise<boolean> {
		try {
			const imageKey = this.getImageKey(id);
			const metadataKey = this.getMetadataKey(id);

			const deletedCount = await Promise.all([this.redisService.del(imageKey), this.redisService.del(metadataKey)]);

			const success = deletedCount.every((count) => count > 0);

			if (success) {
				this.logger.log(`Deleted image ${id}`);
			}

			return success;
		} catch (error) {
			this.logger.error(`Failed to delete image ${id}: ${error.message}`, error.stack);
			return false;
		}
	}

	/**
	 * Check if an image exists
	 */
	async exists(id: string): Promise<boolean> {
		try {
			const imageKey = this.getImageKey(id);
			return await this.redisService.exists(imageKey);
		} catch (error) {
			this.logger.error(`Failed to check existence of image ${id}: ${error.message}`, error.stack);
			return false;
		}
	}

	/**
	 * Get image metadata without the image data
	 */
	async getMetadata(id: string): Promise<ImageMetadata | null> {
		try {
			const metadataKey = this.getMetadataKey(id);
			const metadataJson = await this.redisService.get(metadataKey);

			if (!metadataJson) {
				return null;
			}

			const metadata = JSON.parse(metadataJson) as ImageMetadata;

			// Check if expired
			if (new Date() > metadata.expiresAt) {
				// Clean up expired image
				await this.delete(id);
				return null;
			}

			return metadata;
		} catch (error) {
			this.logger.error(`Failed to get metadata for image ${id}: ${error.message}`, error.stack);
			return null;
		}
	}

	/**
	 * Extend TTL for an existing image
	 */
	async extendTtl(id: string, ttlSeconds: number): Promise<boolean> {
		try {
			const imageKey = this.getImageKey(id);
			const metadataKey = this.getMetadataKey(id);

			// First check if image exists
			if (!(await this.exists(id))) {
				return false;
			}

			// Update TTL for both keys
			const results = await Promise.all([
				this.redisService.expire(imageKey, ttlSeconds),
				this.redisService.expire(metadataKey, ttlSeconds),
			]);

			// Also update metadata with new expiration time
			const metadata = await this.getMetadata(id);
			if (metadata) {
				metadata.expiresAt = new Date(Date.now() + ttlSeconds * 1000);
				await this.redisService.set(metadataKey, JSON.stringify(metadata), ttlSeconds);
			}

			const success = results.every((result) => result);

			if (success) {
				this.logger.log(`Extended TTL for image ${id} to ${ttlSeconds}s`);
			}

			return success;
		} catch (error) {
			this.logger.error(`Failed to extend TTL for image ${id}: ${error.message}`, error.stack);
			return false;
		}
	}

	/**
	 * Get all image IDs (for cleanup operations)
	 */
	async getAllImageIds(): Promise<string[]> {
		try {
			const pattern = this.getImageKey('*');
			const keys = await this.redisService.keys(pattern);

			// Extract IDs from keys
			return keys.map((key) => this.extractIdFromKey(key)).filter(Boolean);
		} catch (error) {
			this.logger.error(`Failed to get all image IDs: ${error.message}`, error.stack);
			return [];
		}
	}

	/**
	 * Cleanup expired images
	 */
	async cleanup(): Promise<number> {
		const startTime = Date.now();
		let cleanedCount = 0;
		const errors: string[] = [];

		try {
			this.logger.log('Starting cleanup of expired images...');

			// Get all image IDs
			const imageIds = await this.getAllImageIds();
			this.logger.log(`Found ${imageIds.length} images to check`);

			// Check each image for expiration
			for (const id of imageIds) {
				try {
					const metadata = await this.getMetadata(id);

					// If getMetadata returns null, the image was already cleaned up
					if (!metadata) {
						cleanedCount++;
						continue;
					}

					// Double-check expiration
					if (new Date() > metadata.expiresAt) {
						const deleted = await this.delete(id);
						if (deleted) {
							cleanedCount++;
						}
					}
				} catch (error) {
					errors.push(`Failed to cleanup image ${id}: ${error.message}`);
					this.logger.warn(`Cleanup error for image ${id}: ${error.message}`);
				}
			}

			const duration = Date.now() - startTime;
			this.logger.log(`Cleanup completed: ${cleanedCount} images cleaned in ${duration}ms`);

			if (errors.length > 0) {
				this.logger.warn(`Cleanup had ${errors.length} errors`);
			}

			return cleanedCount;
		} catch (error) {
			const duration = Date.now() - startTime;
			this.logger.error(`Cleanup failed after ${duration}ms: ${error.message}`, error.stack);
			return cleanedCount;
		}
	}

	/**
	 * Get storage statistics
	 */
	async getStats(): Promise<StorageStats> {
		try {
			const imageIds = await this.getAllImageIds();
			let totalSize = 0;
			let expiredImages = 0;
			let oldestImage: Date | null = null;
			let newestImage: Date | null = null;
			const sizes: number[] = [];

			for (const id of imageIds) {
				try {
					const metadata = await this.getMetadata(id);
					if (metadata) {
						totalSize += metadata.size;
						sizes.push(metadata.size);

						// Check for oldest/newest
						if (!oldestImage || metadata.uploadedAt < oldestImage) {
							oldestImage = metadata.uploadedAt;
						}
						if (!newestImage || metadata.uploadedAt > newestImage) {
							newestImage = metadata.uploadedAt;
						}

						// Check if expired
						if (new Date() > metadata.expiresAt) {
							expiredImages++;
						}
					}
				} catch (error) {
					this.logger.warn(`Error getting stats for image ${id}: ${error.message}`);
				}
			}

			const averageSize = sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;

			return {
				totalImages: imageIds.length,
				totalSize,
				expiredImages,
				oldestImage,
				newestImage,
				averageSize: Math.round(averageSize),
			};
		} catch (error) {
			this.logger.error(`Failed to get storage stats: ${error.message}`, error.stack);
			return {
				totalImages: 0,
				totalSize: 0,
				expiredImages: 0,
				oldestImage: null,
				newestImage: null,
				averageSize: 0,
			};
		}
	}

	/**
	 * Generate a unique image ID
	 */
	generateId(): string {
		return IdGeneratorUtil.generateImageId();
	}

	/**
	 * Get Redis key for image data
	 */
	private getImageKey(id: string): string {
		return `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}${id}`;
	}

	/**
	 * Get Redis key for metadata
	 */
	private getMetadataKey(id: string): string {
		return `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}meta:${id}`;
	}

	/**
	 * Extract image ID from Redis key
	 */
	private extractIdFromKey(key: string): string {
		const prefix = IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX;
		if (key.startsWith(prefix) && !key.includes(':meta:')) {
			return key.substring(prefix.length);
		}
		return '';
	}

	/**
	 * Batch cleanup with detailed results
	 */
	async performCleanup(): Promise<CleanupResult> {
		const startTime = Date.now();
		const errors: string[] = [];
		let cleanedCount = 0;
		let totalSize = 0;

		try {
			// Acquire cleanup lock to prevent concurrent cleanups
			const lockKey = IMAGE_CONSTANTS.REDIS_KEYS.CLEANUP_LOCK;
			const lockTtl = 300; // 5 minutes
			// Check if lock already exists
			const lockExists = await this.redisService.exists(lockKey);
			if (lockExists) {
				throw new Error('Another cleanup operation is already running');
			}

			await this.redisService.set(lockKey, '1', lockTtl);

			try {
				const imageIds = await this.getAllImageIds();

				for (const id of imageIds) {
					try {
						const metadata = await this.getMetadata(id);
						if (!metadata) {
							// Image was already cleaned (expired)
							cleanedCount++;
							continue;
						}

						if (new Date() > metadata.expiresAt) {
							totalSize += metadata.size;
							const deleted = await this.delete(id);
							if (deleted) {
								cleanedCount++;
							} else {
								errors.push(`Failed to delete expired image ${id}`);
							}
						}
					} catch (error) {
						errors.push(`Error processing image ${id}: ${error.message}`);
					}
				}
			} finally {
				// Release cleanup lock
				await this.redisService.del(lockKey);
			}
		} catch (error) {
			errors.push(`Cleanup operation error: ${error.message}`);
		}

		const duration = Date.now() - startTime;

		const result: CleanupResult = {
			cleanedCount,
			totalSize,
			errors,
			duration,
		};

		this.logger.log(`Cleanup result: ${cleanedCount} images, ${totalSize} bytes, ${duration}ms`);

		return result;
	}
}
