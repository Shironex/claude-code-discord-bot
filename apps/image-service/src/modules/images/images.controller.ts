import { Controller, Get, Delete, Param, Res, NotFoundException, HttpStatus, UseGuards, Post, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { ImagesService } from './images.service';
import { CleanupScheduler } from './schedulers/cleanup.scheduler';
import { ApiKeyGuard } from '../../common/guards';
import { DeleteImageResponseDto, ImageMetadataDto } from '../../common/dto';
import { IMAGE_CONSTANTS } from '../../common/constants';
import {
	ApiGetImage,
	ApiGetImageMetadata,
	ApiDeleteImage,
	ApiGetStorageStats,
	ApiTriggerCleanup,
	ApiGetCleanupStats,
} from './images.swagger';

@ApiTags('images')
@Controller('images')
@UseGuards(ApiKeyGuard)
export class ImagesController {
	constructor(
		private readonly imagesService: ImagesService,
		private readonly cleanupScheduler: CleanupScheduler,
	) {}

	/**
	 * Retrieve an image by ID
	 */
	@Get(':id')
	@ApiGetImage()
	async getImage(@Param('id') id: string, @Res() res: Response): Promise<void> {
		// Validate ID format
		if (!this.isValidImageId(id)) {
			throw new BadRequestException(IMAGE_CONSTANTS.ERRORS.INVALID_IMAGE_ID);
		}

		const storedImage = await this.imagesService.get(id);

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
	@ApiGetImageMetadata()
	async getImageMetadata(@Param('id') id: string): Promise<ImageMetadataDto> {
		// Validate ID format
		if (!this.isValidImageId(id)) {
			throw new BadRequestException(IMAGE_CONSTANTS.ERRORS.INVALID_IMAGE_ID);
		}

		const metadata = await this.imagesService.getMetadata(id);

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
	@ApiDeleteImage()
	async deleteImage(@Param('id') id: string): Promise<DeleteImageResponseDto> {
		// Validate ID format
		if (!this.isValidImageId(id)) {
			throw new BadRequestException(IMAGE_CONSTANTS.ERRORS.INVALID_IMAGE_ID);
		}

		const deleted = await this.imagesService.delete(id);

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
	@ApiGetStorageStats()
	async getStorageStats(): Promise<{
		totalImages: number;
		totalSize: number;
		expiredImages: number;
		oldestImage: string | null;
		newestImage: string | null;
		averageSize: number;
	}> {
		const stats = await this.imagesService.getStats();

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
	@ApiTriggerCleanup()
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
	@ApiGetCleanupStats()
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
