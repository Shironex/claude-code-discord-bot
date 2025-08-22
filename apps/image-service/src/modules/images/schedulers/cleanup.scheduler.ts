import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ImagesService } from '../images.service';

@Injectable()
export class CleanupScheduler {
	private readonly logger = new Logger(CleanupScheduler.name);
	private isRunning = false;
	private lastCleanup: Date | null = null;
	private cleanupStats = {
		totalRuns: 0,
		totalCleaned: 0,
		totalErrors: 0,
		averageDuration: 0,
	};

	constructor(
		private readonly imagesService: ImagesService,
		private readonly configService: ConfigService,
	) {}

	/**
	 * Run cleanup every 15 minutes
	 */
	@Cron(CronExpression.EVERY_10_MINUTES)
	async handleCleanup(): Promise<void> {
		if (this.isRunning) {
			this.logger.warn('Cleanup already running, skipping...');
			return;
		}

		if (!this.isCleanupEnabled()) {
			this.logger.debug('Cleanup scheduler disabled');
			return;
		}

		this.isRunning = true;
		const startTime = Date.now();

		try {
			this.logger.log('Starting scheduled cleanup...');

			const result = await this.imagesService.performCleanup();

			// Update statistics
			this.cleanupStats.totalRuns++;
			this.cleanupStats.totalCleaned += result.cleanedCount;
			this.cleanupStats.totalErrors += result.errors.length;
			this.cleanupStats.averageDuration =
				(this.cleanupStats.averageDuration * (this.cleanupStats.totalRuns - 1) + result.duration) / this.cleanupStats.totalRuns;

			this.lastCleanup = new Date();

			this.logger.log(
				`Scheduled cleanup completed: ${result.cleanedCount} images cleaned, ` +
					`${result.totalSize} bytes freed, ${result.duration}ms duration`,
			);

			if (result.errors.length > 0) {
				this.logger.warn(`Cleanup had ${result.errors.length} errors`);
				result.errors.slice(0, 5).forEach((error) => this.logger.warn(`Cleanup error: ${error}`));
				if (result.errors.length > 5) {
					this.logger.warn(`... and ${result.errors.length - 5} more errors`);
				}
			}
		} catch (error) {
			this.cleanupStats.totalErrors++;
			this.logger.error(`Scheduled cleanup failed: ${error.message}`, error.stack);
		} finally {
			this.isRunning = false;
			const duration = Date.now() - startTime;
			this.logger.debug(`Cleanup scheduler finished in ${duration}ms`);
		}
	}

	/**
	 * Run cleanup every hour for more thorough cleaning
	 */
	@Cron(CronExpression.EVERY_HOUR)
	async handleThoroughCleanup(): Promise<void> {
		if (this.isRunning) {
			this.logger.warn('Cleanup already running, skipping thorough cleanup...');
			return;
		}

		if (!this.isCleanupEnabled()) {
			return;
		}

		this.logger.log('Starting thorough scheduled cleanup...');

		try {
			// Get storage stats first
			const stats = await this.imagesService.getStats();

			this.logger.log(
				`Storage stats before cleanup: ${stats.totalImages} images, ` +
					`${Math.round(stats.totalSize / 1024 / 1024)}MB, ${stats.expiredImages} expired`,
			);

			// Run cleanup if there are expired images
			if (stats.expiredImages > 0) {
				await this.handleCleanup();
			}

			// Log final stats
			const finalStats = await this.imagesService.getStats();
			this.logger.log(
				`Storage stats after cleanup: ${finalStats.totalImages} images, ` + `${Math.round(finalStats.totalSize / 1024 / 1024)}MB`,
			);
		} catch (error) {
			this.logger.error(`Thorough cleanup failed: ${error.message}`, error.stack);
		}
	}

	/**
	 * Emergency cleanup for high storage usage
	 */
	@Cron('0 */2 * * *') // Every 2 hours
	async handleEmergencyCleanup(): Promise<void> {
		if (!this.isCleanupEnabled()) {
			return;
		}

		try {
			const stats = await this.imagesService.getStats();
			const maxImages = this.getMaxImages();
			const maxSize = this.getMaxStorageSize();

			// Check if we need emergency cleanup
			const needsCleanup =
				stats.totalImages > maxImages || stats.totalSize > maxSize || stats.expiredImages > stats.totalImages * 0.1; // More than 10% expired

			if (needsCleanup) {
				this.logger.warn(
					`Emergency cleanup triggered: ${stats.totalImages}/${maxImages} images, ` +
						`${Math.round(stats.totalSize / 1024 / 1024)}MB/${Math.round(maxSize / 1024 / 1024)}MB, ` +
						`${stats.expiredImages} expired`,
				);

				await this.handleCleanup();
			}
		} catch (error) {
			this.logger.error(`Emergency cleanup check failed: ${error.message}`, error.stack);
		}
	}

	/**
	 * Get cleanup statistics
	 */
	getCleanupStats(): {
		isRunning: boolean;
		lastCleanup: Date | null;
		stats: typeof this.cleanupStats;
	} {
		return {
			isRunning: this.isRunning,
			lastCleanup: this.lastCleanup,
			stats: { ...this.cleanupStats },
		};
	}

	/**
	 * Manually trigger cleanup (for admin endpoints)
	 */
	async triggerManualCleanup(): Promise<{
		success: boolean;
		result?: any;
		error?: string;
	}> {
		if (this.isRunning) {
			return {
				success: false,
				error: 'Cleanup already running',
			};
		}

		try {
			this.logger.log('Manual cleanup triggered');
			const result = await this.imagesService.performCleanup();

			this.cleanupStats.totalRuns++;
			this.cleanupStats.totalCleaned += result.cleanedCount;
			this.lastCleanup = new Date();

			return {
				success: true,
				result,
			};
		} catch (error) {
			this.logger.error(`Manual cleanup failed: ${error.message}`, error.stack);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	/**
	 * Check if cleanup is enabled
	 */
	private isCleanupEnabled(): boolean {
		return this.configService.get<boolean>('startup.enableScheduler', true);
	}

	/**
	 * Get maximum number of images before emergency cleanup
	 */
	private getMaxImages(): number {
		return this.configService.get<number>('storage.maxImages', 10000);
	}

	/**
	 * Get maximum storage size before emergency cleanup
	 */
	private getMaxStorageSize(): number {
		// Default: 1GB
		return this.configService.get<number>('storage.maxSize', 1024 * 1024 * 1024);
	}
}
