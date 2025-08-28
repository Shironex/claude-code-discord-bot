import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { CleanupScheduler } from '@/modules/images/schedulers/cleanup.scheduler';
import { ImagesService } from '@/modules/images/images.service';

describe('CleanupScheduler', () => {
  let scheduler: CleanupScheduler;
  let imagesService: jest.Mocked<ImagesService>;
  let configService: jest.Mocked<ConfigService>;
  let loggerSpy: jest.SpyInstance;

  const mockCleanupResult = {
    cleanedCount: 10,
    totalSize: 1024 * 50, // 50KB
    duration: 150,
    errors: [],
  };

  const mockStats = {
    totalImages: 100,
    totalSize: 1024 * 1024 * 10, // 10MB
    expiredImages: 5,
    oldestImage: new Date('2024-01-01T08:00:00Z'),
    newestImage: new Date('2024-01-01T12:00:00Z'),
    averageSize: 1024 * 100, // 100KB
  };

  beforeEach(async () => {
    const mockImagesService = {
      performCleanup: jest.fn(),
      getStats: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupScheduler,
        {
          provide: ImagesService,
          useValue: mockImagesService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    scheduler = module.get<CleanupScheduler>(CleanupScheduler);
    imagesService = module.get(ImagesService);
    configService = module.get(ConfigService);

    // Spy on logger
    loggerSpy = jest.spyOn(scheduler['logger'], 'log').mockImplementation();
    jest.spyOn(scheduler['logger'], 'warn').mockImplementation();
    jest.spyOn(scheduler['logger'], 'error').mockImplementation();
    jest.spyOn(scheduler['logger'], 'debug').mockImplementation();

    // Default config values
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      switch (key) {
        case 'startup.enableScheduler':
          return true;
        case 'storage.maxImages':
          return 10000;
        case 'storage.maxSize':
          return 1024 * 1024 * 1024; // 1GB
        default:
          return defaultValue;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('handleCleanup', () => {
    it('should perform cleanup successfully', async () => {
      imagesService.performCleanup.mockResolvedValue(mockCleanupResult);

      await scheduler.handleCleanup();

      expect(imagesService.performCleanup).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('Starting scheduled cleanup...');
      expect(loggerSpy).toHaveBeenCalledWith(
        'Scheduled cleanup completed: 10 images cleaned, 51200 bytes freed, 150ms duration'
      );
    });

    it('should skip cleanup when already running', async () => {
      // Set scheduler as running by calling handleCleanup first
      const performCleanupPromise = new Promise(() => {}); // Never resolves
      imagesService.performCleanup.mockReturnValue(performCleanupPromise as any);
      
      // Start first cleanup (won't finish)
      scheduler.handleCleanup();
      
      // Try to start second cleanup
      await scheduler.handleCleanup();

      expect(scheduler['logger'].warn).toHaveBeenCalledWith('Cleanup already running, skipping...');
    });

    it('should skip cleanup when disabled', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'startup.enableScheduler') return false;
        return defaultValue;
      });

      await scheduler.handleCleanup();

      expect(scheduler['logger'].debug).toHaveBeenCalledWith('Cleanup scheduler disabled');
      expect(imagesService.performCleanup).not.toHaveBeenCalled();
    });

    it('should update statistics after successful cleanup', async () => {
      imagesService.performCleanup.mockResolvedValue(mockCleanupResult);

      // Get initial stats
      const initialStats = scheduler.getCleanupStats();
      expect(initialStats.stats.totalRuns).toBe(0);

      await scheduler.handleCleanup();

      // Check updated stats
      const updatedStats = scheduler.getCleanupStats();
      expect(updatedStats.stats.totalRuns).toBe(1);
      expect(updatedStats.stats.totalCleaned).toBe(10);
      expect(updatedStats.stats.totalErrors).toBe(0);
      expect(updatedStats.stats.averageDuration).toBe(150);
      expect(updatedStats.lastCleanup).toBeInstanceOf(Date);
    });

    it('should update statistics with multiple cleanup runs', async () => {
      const firstResult = { ...mockCleanupResult, duration: 100 };
      const secondResult = { ...mockCleanupResult, duration: 200 };

      imagesService.performCleanup
        .mockResolvedValueOnce(firstResult)
        .mockResolvedValueOnce(secondResult);

      await scheduler.handleCleanup();
      await scheduler.handleCleanup();

      const stats = scheduler.getCleanupStats();
      expect(stats.stats.totalRuns).toBe(2);
      expect(stats.stats.totalCleaned).toBe(20);
      expect(stats.stats.averageDuration).toBe(150); // (100 + 200) / 2
    });

    it('should log warnings for cleanup errors', async () => {
      const resultWithErrors = {
        ...mockCleanupResult,
        errors: ['Error 1', 'Error 2', 'Error 3'],
      };
      imagesService.performCleanup.mockResolvedValue(resultWithErrors);

      await scheduler.handleCleanup();

      expect(scheduler['logger'].warn).toHaveBeenCalledWith('Cleanup had 3 errors');
      expect(scheduler['logger'].warn).toHaveBeenCalledWith('Cleanup error: Error 1');
      expect(scheduler['logger'].warn).toHaveBeenCalledWith('Cleanup error: Error 2');
      expect(scheduler['logger'].warn).toHaveBeenCalledWith('Cleanup error: Error 3');
    });

    it('should limit error logging to first 5 errors', async () => {
      const manyErrors = Array.from({ length: 8 }, (_, i) => `Error ${i + 1}`);
      const resultWithManyErrors = {
        ...mockCleanupResult,
        errors: manyErrors,
      };
      imagesService.performCleanup.mockResolvedValue(resultWithManyErrors);

      await scheduler.handleCleanup();

      expect(scheduler['logger'].warn).toHaveBeenCalledWith('Cleanup had 8 errors');
      expect(scheduler['logger'].warn).toHaveBeenCalledWith('... and 3 more errors');
      
      // Should only log first 5 individual errors
      const individualErrorCalls = jest.mocked(scheduler['logger'].warn).mock.calls
        .filter(call => call[0].startsWith('Cleanup error:'));
      expect(individualErrorCalls).toHaveLength(5);
    });

    it('should handle cleanup service errors', async () => {
      const error = new Error('Redis connection failed');
      imagesService.performCleanup.mockRejectedValue(error);

      await scheduler.handleCleanup();

      expect(scheduler['logger'].error).toHaveBeenCalledWith(
        'Scheduled cleanup failed: Redis connection failed',
        error.stack
      );

      // Should increment error stats
      const stats = scheduler.getCleanupStats();
      expect(stats.stats.totalErrors).toBe(1);
    });

    it('should reset running flag after cleanup completion', async () => {
      imagesService.performCleanup.mockResolvedValue(mockCleanupResult);

      const initialStats = scheduler.getCleanupStats();
      expect(initialStats.isRunning).toBe(false);

      await scheduler.handleCleanup();

      const finalStats = scheduler.getCleanupStats();
      expect(finalStats.isRunning).toBe(false);
    });

    it('should reset running flag even after cleanup error', async () => {
      imagesService.performCleanup.mockRejectedValue(new Error('Test error'));

      await scheduler.handleCleanup();

      const stats = scheduler.getCleanupStats();
      expect(stats.isRunning).toBe(false);
    });
  });

  describe('handleThoroughCleanup', () => {
    it('should skip when cleanup is already running', async () => {
      // Mock to make cleanup appear running
      scheduler['isRunning'] = true;

      await scheduler.handleThoroughCleanup();

      expect(scheduler['logger'].warn).toHaveBeenCalledWith('Cleanup already running, skipping thorough cleanup...');
      expect(imagesService.getStats).not.toHaveBeenCalled();
    });

    it('should skip when cleanup is disabled', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'startup.enableScheduler') return false;
        return defaultValue;
      });

      await scheduler.handleThoroughCleanup();

      expect(imagesService.getStats).not.toHaveBeenCalled();
    });

    it('should perform thorough cleanup when expired images exist', async () => {
      const statsWithExpired = { ...mockStats, expiredImages: 10 };
      imagesService.getStats
        .mockResolvedValueOnce(statsWithExpired) // Initial stats
        .mockResolvedValueOnce({ ...statsWithExpired, expiredImages: 0 }); // Final stats
      imagesService.performCleanup.mockResolvedValue(mockCleanupResult);

      await scheduler.handleThoroughCleanup();

      expect(loggerSpy).toHaveBeenCalledWith('Starting thorough scheduled cleanup...');
      expect(loggerSpy).toHaveBeenCalledWith(
        'Storage stats before cleanup: 100 images, 10MB, 10 expired'
      );
      expect(imagesService.performCleanup).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Storage stats after cleanup: 100 images, 10MB'
      );
    });

    it('should skip cleanup when no expired images', async () => {
      const statsWithoutExpired = { ...mockStats, expiredImages: 0 };
      imagesService.getStats.mockResolvedValue(statsWithoutExpired);

      await scheduler.handleThoroughCleanup();

      expect(imagesService.performCleanup).not.toHaveBeenCalled();
    });

    it('should handle errors in thorough cleanup', async () => {
      const error = new Error('Stats retrieval failed');
      imagesService.getStats.mockRejectedValue(error);

      await scheduler.handleThoroughCleanup();

      expect(scheduler['logger'].error).toHaveBeenCalledWith(
        'Thorough cleanup failed: Stats retrieval failed',
        error.stack
      );
    });
  });

  describe('handleEmergencyCleanup', () => {
    it('should skip when cleanup is disabled', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'startup.enableScheduler') return false;
        return defaultValue;
      });

      await scheduler.handleEmergencyCleanup();

      expect(imagesService.getStats).not.toHaveBeenCalled();
    });

    it('should trigger emergency cleanup when too many images', async () => {
      const statsWithTooManyImages = { ...mockStats, totalImages: 15000 };
      imagesService.getStats.mockResolvedValue(statsWithTooManyImages);
      imagesService.performCleanup.mockResolvedValue(mockCleanupResult);

      await scheduler.handleEmergencyCleanup();

      expect(scheduler['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('Emergency cleanup triggered: 15000/10000 images')
      );
      expect(imagesService.performCleanup).toHaveBeenCalled();
    });

    it('should trigger emergency cleanup when storage size too large', async () => {
      const statsWithLargeSize = { ...mockStats, totalSize: 2 * 1024 * 1024 * 1024 }; // 2GB
      imagesService.getStats.mockResolvedValue(statsWithLargeSize);
      imagesService.performCleanup.mockResolvedValue(mockCleanupResult);

      await scheduler.handleEmergencyCleanup();

      expect(scheduler['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('2048MB/1024MB')
      );
      expect(imagesService.performCleanup).toHaveBeenCalled();
    });

    it('should trigger emergency cleanup when too many expired images (>10%)', async () => {
      const statsWithManyExpired = { ...mockStats, totalImages: 100, expiredImages: 15 };
      imagesService.getStats.mockResolvedValue(statsWithManyExpired);
      imagesService.performCleanup.mockResolvedValue(mockCleanupResult);

      await scheduler.handleEmergencyCleanup();

      expect(scheduler['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('15 expired')
      );
      expect(imagesService.performCleanup).toHaveBeenCalled();
    });

    it('should not trigger emergency cleanup when stats are within limits', async () => {
      const normalStats = {
        ...mockStats,
        totalImages: 5000, // Under 10000 limit
        totalSize: 500 * 1024 * 1024, // 500MB, under 1GB limit
        expiredImages: 5, // 5% of 100 images, under 10% threshold
      };
      imagesService.getStats.mockResolvedValue(normalStats);

      await scheduler.handleEmergencyCleanup();

      expect(imagesService.performCleanup).not.toHaveBeenCalled();
    });

    it('should handle errors in emergency cleanup check', async () => {
      const error = new Error('Emergency stats failed');
      imagesService.getStats.mockRejectedValue(error);

      await scheduler.handleEmergencyCleanup();

      expect(scheduler['logger'].error).toHaveBeenCalledWith(
        'Emergency cleanup check failed: Emergency stats failed',
        error.stack
      );
    });

    it('should use custom configuration values', async () => {
      // Override config values
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'startup.enableScheduler':
            return true;
          case 'storage.maxImages':
            return 5000; // Lower limit
          case 'storage.maxSize':
            return 500 * 1024 * 1024; // 500MB limit
          default:
            return defaultValue;
        }
      });

      const statsExceedingCustomLimits = {
        ...mockStats,
        totalImages: 6000, // Exceeds custom 5000 limit
        totalSize: 600 * 1024 * 1024, // Exceeds custom 500MB limit
      };
      imagesService.getStats.mockResolvedValue(statsExceedingCustomLimits);
      imagesService.performCleanup.mockResolvedValue(mockCleanupResult);

      await scheduler.handleEmergencyCleanup();

      expect(scheduler['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('6000/5000 images')
      );
      expect(scheduler['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('600MB/500MB')
      );
      expect(imagesService.performCleanup).toHaveBeenCalled();
    });
  });

  describe('getCleanupStats', () => {
    it('should return initial cleanup statistics', () => {
      const stats = scheduler.getCleanupStats();

      expect(stats).toEqual({
        isRunning: false,
        lastCleanup: null,
        stats: {
          totalRuns: 0,
          totalCleaned: 0,
          totalErrors: 0,
          averageDuration: 0,
        },
      });
    });

    it('should return updated statistics after cleanup', async () => {
      imagesService.performCleanup.mockResolvedValue(mockCleanupResult);

      await scheduler.handleCleanup();

      const stats = scheduler.getCleanupStats();

      expect(stats.isRunning).toBe(false);
      expect(stats.lastCleanup).toBeInstanceOf(Date);
      expect(stats.stats.totalRuns).toBe(1);
      expect(stats.stats.totalCleaned).toBe(10);
      expect(stats.stats.totalErrors).toBe(0);
      expect(stats.stats.averageDuration).toBe(150);
    });

    it('should return a copy of stats to prevent mutation', () => {
      const stats1 = scheduler.getCleanupStats();
      const stats2 = scheduler.getCleanupStats();

      expect(stats1.stats).not.toBe(stats2.stats); // Different objects
      expect(stats1.stats).toEqual(stats2.stats); // Same content
    });
  });

  describe('triggerManualCleanup', () => {
    it('should trigger manual cleanup successfully', async () => {
      imagesService.performCleanup.mockResolvedValue(mockCleanupResult);

      const result = await scheduler.triggerManualCleanup();

      expect(loggerSpy).toHaveBeenCalledWith('Manual cleanup triggered');
      expect(imagesService.performCleanup).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        result: mockCleanupResult,
      });

      // Check stats were updated
      const stats = scheduler.getCleanupStats();
      expect(stats.stats.totalRuns).toBe(1);
      expect(stats.stats.totalCleaned).toBe(10);
    });

    it('should return error when cleanup is already running', async () => {
      scheduler['isRunning'] = true;

      const result = await scheduler.triggerManualCleanup();

      expect(result).toEqual({
        success: false,
        error: 'Cleanup already running',
      });
      expect(imagesService.performCleanup).not.toHaveBeenCalled();
    });

    it('should handle manual cleanup errors', async () => {
      const error = new Error('Manual cleanup failed');
      imagesService.performCleanup.mockRejectedValue(error);

      const result = await scheduler.triggerManualCleanup();

      expect(scheduler['logger'].error).toHaveBeenCalledWith(
        'Manual cleanup failed: Manual cleanup failed',
        error.stack
      );
      expect(result).toEqual({
        success: false,
        error: 'Manual cleanup failed',
      });
    });
  });

  describe('Configuration Integration', () => {
    it('should respect enableScheduler config', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'startup.enableScheduler') return false;
        return defaultValue;
      });

      await scheduler.handleCleanup();
      await scheduler.handleThoroughCleanup();
      await scheduler.handleEmergencyCleanup();

      expect(imagesService.performCleanup).not.toHaveBeenCalled();
      expect(imagesService.getStats).not.toHaveBeenCalled();
    });

    it('should use default config values when not specified', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        return defaultValue; // Always return default
      });

      // Access private methods through scheduler instance
      expect(scheduler['isCleanupEnabled']()).toBe(true);
      expect(scheduler['getMaxImages']()).toBe(10000);
      expect(scheduler['getMaxStorageSize']()).toBe(1024 * 1024 * 1024);
    });
  });

  describe('Logger Integration', () => {
    it('should have a logger instance', () => {
      expect(scheduler['logger']).toBeDefined();
      expect(scheduler['logger'].constructor.name).toBe('Logger');
    });

    it('should log cleanup progress with appropriate levels', async () => {
      imagesService.performCleanup.mockResolvedValue(mockCleanupResult);

      await scheduler.handleCleanup();

      expect(scheduler['logger'].log).toHaveBeenCalledWith('Starting scheduled cleanup...');
      expect(scheduler['logger'].log).toHaveBeenCalledWith(
        expect.stringContaining('Scheduled cleanup completed')
      );
      expect(scheduler['logger'].debug).toHaveBeenCalledWith(
        expect.stringContaining('Cleanup scheduler finished in')
      );
    });
  });

  describe('Cron Job Integration', () => {
    it('should have scheduled cleanup methods', () => {
      // Test that the methods exist
      expect(scheduler.handleCleanup).toBeDefined();
      expect(scheduler.handleThoroughCleanup).toBeDefined();
      expect(scheduler.handleEmergencyCleanup).toBeDefined();
      expect(typeof scheduler.handleCleanup).toBe('function');
      expect(typeof scheduler.handleThoroughCleanup).toBe('function');
      expect(typeof scheduler.handleEmergencyCleanup).toBe('function');
    });
  });

  describe('Concurrent Cleanup Protection', () => {
    it('should prevent concurrent cleanup operations', async () => {
      let cleanupPromiseResolve: () => void;
      const cleanupPromise = new Promise<typeof mockCleanupResult>((resolve) => {
        cleanupPromiseResolve = () => resolve(mockCleanupResult);
      });

      imagesService.performCleanup.mockReturnValue(cleanupPromise);

      // Start first cleanup
      const firstCleanup = scheduler.handleCleanup();

      // Try to start second cleanup while first is running
      await scheduler.handleCleanup();

      expect(scheduler['logger'].warn).toHaveBeenCalledWith('Cleanup already running, skipping...');

      // Complete first cleanup
      cleanupPromiseResolve!();
      await firstCleanup;

      // Now cleanup should be allowed again
      const stats = scheduler.getCleanupStats();
      expect(stats.isRunning).toBe(false);
    });
  });
});