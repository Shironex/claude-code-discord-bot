import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';
import { FileValidationUtil } from '../../common/utils';
import { IMAGE_CONSTANTS } from '../../common/constants';
import { ImageUploadResponseDto, BatchUploadResponseDto, BatchUploadOptionsDto } from '../../common/dto';
import { ImageMetadata } from '../../common/interfaces';

@Injectable()
export class UploadService {
	private readonly logger = new Logger(UploadService.name);

	constructor(
		private readonly storageService: StorageService,
		private readonly configService: ConfigService,
	) {}

	/**
	 * Upload a single image
	 */
	async uploadSingle(file: Express.Multer.File, options?: { ttl?: number; userId?: string }): Promise<ImageUploadResponseDto> {
		this.logger.log(`Starting single file upload: ${file.originalname} (${file.size} bytes)`);

		try {
			// Validate file
			const validationResult = FileValidationUtil.validateFile(file);
			if (!validationResult.isValid) {
				throw new BadRequestException(`File validation failed: ${validationResult.errors.join(', ')}`);
			}

			// Log warnings if any
			if (validationResult.warnings.length > 0) {
				this.logger.warn(`Upload warnings: ${validationResult.warnings.join(', ')}`);
			}

			// Generate unique ID and metadata
			const id = this.storageService.generateId();
			const now = new Date();
			const ttl = this.validateTtl(options?.ttl);
			const expiresAt = new Date(now.getTime() + ttl * 1000);

			const metadata: ImageMetadata = {
				id,
				size: file.size,
				mimeType: file.mimetype,
				uploadedAt: now,
				expiresAt,
				originalName: FileValidationUtil.sanitizeFilename(file.originalname),
				userId: options?.userId,
			};

			// Store the image
			await this.storageService.store(id, file.buffer, metadata, ttl);

			// Generate response
			const response: ImageUploadResponseDto = {
				id,
				url: this.generateImageUrl(id),
				expires: expiresAt.toISOString(),
				size: file.size,
				mimeType: file.mimetype,
				originalName: metadata.originalName,
			};

			this.logger.log(`Successfully uploaded image ${id} (TTL: ${ttl}s)`);
			return response;
		} catch (error) {
			this.logger.error(`Failed to upload file ${file.originalname}: ${error.message}`, error.stack);
			throw error;
		}
	}

	/**
	 * Upload multiple images in batch
	 */
	async uploadBatch(files: Express.Multer.File[], options?: BatchUploadOptionsDto): Promise<BatchUploadResponseDto> {
		this.logger.log(`Starting batch upload: ${files.length} files`);

		try {
			// Validate all files first
			const validationResult = FileValidationUtil.validateFiles(files);
			if (!validationResult.isValid) {
				throw new BadRequestException(`Batch validation failed: ${validationResult.errors.join(', ')}`);
			}

			const successfulUploads: ImageUploadResponseDto[] = [];
			const errors: Array<{ index: number; error: string; filename?: string }> = [];

			// Process each file
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				try {
					const result = await this.uploadSingle(file, {
						ttl: options?.ttl,
						userId: options?.userId,
					});
					successfulUploads.push(result);
				} catch (error) {
					errors.push({
						index: i,
						error: error.message,
						filename: file.originalname,
					});
					this.logger.warn(`Failed to upload file ${i} (${file.originalname}): ${error.message}`);
				}
			}

			const response: BatchUploadResponseDto = {
				images: successfulUploads,
				totalCount: files.length,
				successCount: successfulUploads.length,
				errors: errors.length > 0 ? errors : undefined,
			};

			this.logger.log(`Batch upload completed: ${successfulUploads.length}/${files.length} successful uploads`);

			return response;
		} catch (error) {
			this.logger.error(`Batch upload failed: ${error.message}`, error.stack);
			throw error;
		}
	}

	/**
	 * Check upload limits for rate limiting
	 */
	checkUploadLimits(
		userId?: string,
		fileCount: number = 1,
		totalSize: number = 0,
	): {
		allowed: boolean;
		reason?: string;
		limits: {
			maxFiles: number;
			maxSize: number;
			maxFilesPerHour: number;
		};
	} {
		const limits = {
			maxFiles: this.configService.get<number>('imageService.upload.maxFiles', IMAGE_CONSTANTS.MAX_FILES_PER_REQUEST),
			maxSize: this.configService.get<number>(
				'imageService.rateLimit.maxTotalSizePerRequest',
				IMAGE_CONSTANTS.MAX_TOTAL_SIZE_PER_REQUEST,
			),
			maxFilesPerHour: this.configService.get<number>(
				'imageService.rateLimit.maxFilesPerHour',
				IMAGE_CONSTANTS.MAX_FILES_PER_USER_PER_HOUR,
			),
		};

		// Check file count limit
		if (fileCount > limits.maxFiles) {
			return {
				allowed: false,
				reason: `Too many files. Maximum ${limits.maxFiles} files per request.`,
				limits,
			};
		}

		// Check total size limit
		if (totalSize > limits.maxSize) {
			return {
				allowed: false,
				reason: `Total size too large. Maximum ${Math.round(limits.maxSize / 1024 / 1024)}MB per request.`,
				limits,
			};
		}

		// TODO: Implement Redis-based rate limiting for userId
		// For now, just return allowed
		return {
			allowed: true,
			limits,
		};
	}

	/**
	 * Get upload statistics
	 */
	async getUploadStats(): Promise<{
		totalUploads: number;
		totalSize: number;
		averageFileSize: number;
		supportedFormats: string[];
		limits: {
			maxFileSize: number;
			maxFiles: number;
			maxTotalSize: number;
			maxFilesPerHour: number;
		};
	}> {
		// Get storage stats
		const storageStats = await this.storageService.getStats();

		return {
			totalUploads: storageStats.totalImages,
			totalSize: storageStats.totalSize,
			averageFileSize: storageStats.averageSize,
			supportedFormats: [...IMAGE_CONSTANTS.ALLOWED_MIMETYPES],
			limits: {
				maxFileSize: this.configService.get<number>('imageService.upload.maxFileSize', IMAGE_CONSTANTS.MAX_FILE_SIZE),
				maxFiles: this.configService.get<number>('imageService.upload.maxFiles', IMAGE_CONSTANTS.MAX_FILES_PER_REQUEST),
				maxTotalSize: this.configService.get<number>(
					'imageService.rateLimit.maxTotalSizePerRequest',
					IMAGE_CONSTANTS.MAX_TOTAL_SIZE_PER_REQUEST,
				),
				maxFilesPerHour: this.configService.get<number>(
					'imageService.rateLimit.maxFilesPerHour',
					IMAGE_CONSTANTS.MAX_FILES_PER_USER_PER_HOUR,
				),
			},
		};
	}

	/**
	 * Validate and normalize TTL
	 */
	private validateTtl(ttl?: number): number {
		const defaultTtl = this.configService.get<number>('imageService.upload.defaultTtl', IMAGE_CONSTANTS.DEFAULT_TTL_SECONDS);
		const maxTtl = this.configService.get<number>('imageService.upload.maxTtl', IMAGE_CONSTANTS.MAX_TTL_SECONDS);
		const minTtl = this.configService.get<number>('imageService.upload.minTtl', IMAGE_CONSTANTS.MIN_TTL_SECONDS);

		if (!ttl) {
			return defaultTtl;
		}

		if (ttl < minTtl) {
			this.logger.warn(`TTL ${ttl} below minimum, using ${minTtl}`);
			return minTtl;
		}

		if (ttl > maxTtl) {
			this.logger.warn(`TTL ${ttl} above maximum, using ${maxTtl}`);
			return maxTtl;
		}

		return ttl;
	}

	/**
	 * Generate image URL
	 */
	private generateImageUrl(id: string): string {
		const baseUrl = this.configService.get<string>('imageService.baseUrl', 'http://localhost:3001');
		return `${baseUrl}/api/v1/images/${id}`;
	}

	/**
	 * Validate file before processing
	 */
	private validateUploadFile(file: Express.Multer.File): void {
		if (!file) {
			throw new BadRequestException('No file provided');
		}

		if (!file.buffer || file.buffer.length === 0) {
			throw new BadRequestException('File is empty');
		}

		// Additional validation beyond multer filter
		const result = FileValidationUtil.validateFile(file);
		if (!result.isValid) {
			throw new BadRequestException(`File validation failed: ${result.errors.join(', ')}`);
		}
	}

	/**
	 * Calculate total size of multiple files
	 */
	private calculateTotalSize(files: Express.Multer.File[]): number {
		return files.reduce((total, file) => total + file.size, 0);
	}

	/**
	 * Generate upload summary for logging
	 */
	private generateUploadSummary(files: Express.Multer.File[], options?: any): string {
		const totalSize = this.calculateTotalSize(files);
		const sizeInMB = Math.round((totalSize / 1024 / 1024) * 100) / 100;

		return `${files.length} files, ${sizeInMB}MB total, TTL: ${options?.ttl || 'default'}s, User: ${options?.userId || 'anonymous'}`;
	}
}
