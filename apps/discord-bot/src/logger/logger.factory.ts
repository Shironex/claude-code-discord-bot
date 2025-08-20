import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';

/**
 * Factory service for creating logger instances
 * Allows for proper dependency injection while maintaining service-specific context
 */
@Injectable()
export class LoggerFactory {
	private readonly loggers = new Map<string, LoggerService>();

	/**
	 * Create or retrieve a logger for a specific service
	 * @param serviceName The name of the service
	 * @returns LoggerService instance
	 */
	createLogger(serviceName: string): LoggerService {
		if (!serviceName || typeof serviceName !== 'string') {
			throw new Error('Service name must be a non-empty string');
		}

		// Return existing logger if already created for this service
		const existingLogger = this.loggers.get(serviceName);

		if (existingLogger) {
			return existingLogger;
		}

		// Create new logger for this service
		const logger = new LoggerService(serviceName);
		this.loggers.set(serviceName, logger);
		
		return logger;
	}

	/**
	 * Get all created loggers (useful for cleanup)
	 */
	getAllLoggers(): LoggerService[] {
		return Array.from(this.loggers.values());
	}

	/**
	 * Flush all created loggers
	 */
	async flushAll(): Promise<void> {
		const flushPromises = this.getAllLoggers().map(logger => 
			logger.flush().catch(error => {
				console.error(`Failed to flush logger:`, error);
			})
		);

		await Promise.allSettled(flushPromises);
	}

	/**
	 * Clear all logger instances (for cleanup)
	 */
	clear(): void {
		this.loggers.clear();
	}
}