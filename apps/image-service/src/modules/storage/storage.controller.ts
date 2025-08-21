import { Controller, Get, Delete, Param, Res, NotFoundException, HttpStatus, UseGuards, Post, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiSecurity } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { CleanupScheduler } from './schedulers/cleanup.scheduler';
import { ApiKeyGuard } from '../../common/guards';
import { DeleteImageResponseDto, ImageMetadataDto } from '../../common/dto';
import { IMAGE_CONSTANTS } from '../../common/constants';

@ApiTags('images')
@Controller('images')
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
export class StorageController {
	constructor(
		private readonly storageService: StorageService,
		private readonly cleanupScheduler: CleanupScheduler,
	) {}

	/**
	 * Retrieve an image by ID
	 */
	@Get(':id')
	@ApiOperation({
		summary: 'Retrieve image by ID',
		description: 'Get image data by its unique identifier. Returns 404 if image not found or expired.',
	})
	@ApiParam({
		name: 'id',
		description: 'Unique image identifier',
		example: 'abc123def456',
	})
	@ApiResponse({
		status: 200,
		description: 'Image data',
		content: {
			'image/jpeg': { schema: { type: 'string', format: 'binary' } },
			'image/png': { schema: { type: 'string', format: 'binary' } },
			'image/gif': { schema: { type: 'string', format: 'binary' } },
			'image/webp': { schema: { type: 'string', format: 'binary' } },
		},
	})
	@ApiResponse({
		status: 404,
		description: 'Image not found or expired',
	})
	async getImage(@Param('id') id: string, @Res() res: Response): Promise<void> {
		// Validate ID format
		if (!this.isValidImageId(id)) {
			throw new BadRequestException(IMAGE_CONSTANTS.ERRORS.INVALID_IMAGE_ID);
		}

		const storedImage = await this.storageService.get(id);

		if (!storedImage) {
			throw new NotFoundException(IMAGE_CONSTANTS.ERRORS.IMAGE_NOT_FOUND);
		}

		// Set appropriate headers
		const lastModified =
			storedImage.metadata.uploadedAt instanceof Date
				? storedImage.metadata.uploadedAt.toUTCString()
				: new Date(storedImage.metadata.uploadedAt).toUTCString();

		res.set({
			'Content-Type': storedImage.metadata.mimeType,
			'Content-Length': storedImage.metadata.size.toString(),
			'Cache-Control': 'public, max-age=3600', // 1 hour cache
			ETag: `"${id}"`,
			'Last-Modified': lastModified,
		});

		// Add filename if available
		if (storedImage.metadata.originalName) {
			res.set('Content-Disposition', `inline; filename="${storedImage.metadata.originalName}"`);
		}

		res.status(HttpStatus.OK).send(storedImage.data);
	}

	/**
	 * Get image metadata without downloading the image
	 */
	@Get(':id/metadata')
	@ApiOperation({
		summary: 'Get image metadata',
		description: 'Retrieve image metadata including size, type, and expiration information without downloading the image data.',
	})
	@ApiParam({
		name: 'id',
		description: 'Unique image identifier',
		example: 'abc123def456',
	})
	@ApiResponse({
		status: 200,
		description: 'Image metadata',
		type: ImageMetadataDto,
	})
	@ApiResponse({
		status: 404,
		description: 'Image not found or expired',
	})
	async getImageMetadata(@Param('id') id: string): Promise<ImageMetadataDto> {
		// Validate ID format
		if (!this.isValidImageId(id)) {
			throw new BadRequestException(IMAGE_CONSTANTS.ERRORS.INVALID_IMAGE_ID);
		}

		const metadata = await this.storageService.getMetadata(id);

		if (!metadata) {
			throw new NotFoundException(IMAGE_CONSTANTS.ERRORS.IMAGE_NOT_FOUND);
		}

		return {
			id: metadata.id,
			size: metadata.size,
			mimeType: metadata.mimeType,
			uploadedAt: metadata.uploadedAt.toISOString(),
			expiresAt: metadata.expiresAt.toISOString(),
			originalName: metadata.originalName,
		};
	}

	/**
	 * Delete an image by ID
	 */
	@Delete(':id')
	@ApiOperation({
		summary: 'Delete image by ID',
		description: 'Permanently delete an image and its metadata. This action cannot be undone.',
	})
	@ApiParam({
		name: 'id',
		description: 'Unique image identifier',
		example: 'abc123def456',
	})
	@ApiResponse({
		status: 200,
		description: 'Image deleted successfully',
		type: DeleteImageResponseDto,
	})
	@ApiResponse({
		status: 404,
		description: 'Image not found',
	})
	async deleteImage(@Param('id') id: string): Promise<DeleteImageResponseDto> {
		// Validate ID format
		if (!this.isValidImageId(id)) {
			throw new BadRequestException(IMAGE_CONSTANTS.ERRORS.INVALID_IMAGE_ID);
		}

		const deleted = await this.storageService.delete(id);

		if (!deleted) {
			throw new NotFoundException(IMAGE_CONSTANTS.ERRORS.IMAGE_NOT_FOUND);
		}

		return {
			success: true,
			message: 'Image deleted successfully',
			id,
		};
	}

	/**
	 * Get storage statistics (admin endpoint)
	 */
	@Get('_admin/stats')
	@ApiOperation({
		summary: 'Get storage statistics',
		description: 'Administrative endpoint to retrieve storage usage statistics.',
	})
	@ApiResponse({
		status: 200,
		description: 'Storage statistics',
		schema: {
			type: 'object',
			properties: {
				totalImages: { type: 'number', example: 150 },
				totalSize: { type: 'number', example: 52428800 },
				expiredImages: { type: 'number', example: 5 },
				oldestImage: { type: 'string', format: 'date-time', nullable: true },
				newestImage: { type: 'string', format: 'date-time', nullable: true },
				averageSize: { type: 'number', example: 349525 },
			},
		},
	})
	async getStorageStats(): Promise<{
		totalImages: number;
		totalSize: number;
		expiredImages: number;
		oldestImage: string | null;
		newestImage: string | null;
		averageSize: number;
	}> {
		const stats = await this.storageService.getStats();

		return {
			totalImages: stats.totalImages,
			totalSize: stats.totalSize,
			expiredImages: stats.expiredImages,
			oldestImage: stats.oldestImage?.toISOString() || null,
			newestImage: stats.newestImage?.toISOString() || null,
			averageSize: stats.averageSize,
		};
	}

	/**
	 * Trigger manual cleanup (admin endpoint)
	 */
	@Post('_admin/cleanup')
	@ApiOperation({
		summary: 'Trigger manual cleanup',
		description: 'Administrative endpoint to manually trigger cleanup of expired images.',
	})
	@ApiResponse({
		status: 200,
		description: 'Cleanup operation result',
		schema: {
			type: 'object',
			properties: {
				success: { type: 'boolean' },
				result: {
					type: 'object',
					properties: {
						cleanedCount: { type: 'number' },
						totalSize: { type: 'number' },
						duration: { type: 'number' },
						errors: { type: 'array', items: { type: 'string' } },
					},
				},
				error: { type: 'string', nullable: true },
			},
		},
	})
	async triggerCleanup(): Promise<{
		success: boolean;
		result?: any;
		error?: string;
	}> {
		return await this.cleanupScheduler.triggerManualCleanup();
	}

	/**
	 * Get cleanup statistics (admin endpoint)
	 */
	@Get('_admin/cleanup/stats')
	@ApiOperation({
		summary: 'Get cleanup statistics',
		description: 'Administrative endpoint to retrieve cleanup operation statistics.',
	})
	@ApiResponse({
		status: 200,
		description: 'Cleanup statistics',
		schema: {
			type: 'object',
			properties: {
				isRunning: { type: 'boolean' },
				lastCleanup: { type: 'string', format: 'date-time', nullable: true },
				stats: {
					type: 'object',
					properties: {
						totalRuns: { type: 'number' },
						totalCleaned: { type: 'number' },
						totalErrors: { type: 'number' },
						averageDuration: { type: 'number' },
					},
				},
			},
		},
	})
	getCleanupStats(): {
		isRunning: boolean;
		lastCleanup: string | null;
		stats: {
			totalRuns: number;
			totalCleaned: number;
			totalErrors: number;
			averageDuration: number;
		};
	} {
		const stats = this.cleanupScheduler.getCleanupStats();

		return {
			isRunning: stats.isRunning,
			lastCleanup: stats.lastCleanup?.toISOString() || null,
			stats: stats.stats,
		};
	}

	/**
	 * Validate image ID format
	 */
	private isValidImageId(id: string): boolean {
		// Check basic format (alphanumeric, reasonable length)
		if (!id || typeof id !== 'string' || id.length < 8 || id.length > 32) {
			return false;
		}

		// Check for valid characters (alphanumeric and some safe symbols)
		return /^[a-zA-Z0-9_-]+$/.test(id);
	}
}
