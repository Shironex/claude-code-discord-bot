import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { createLoggerConfig, CustomLoggerOptions } from './logger.config';
import { createServiceFileTransport } from './transports/service-file.transport';
import { 
	isValidLogLevel, 
	validateLogMessage, 
	validateContext, 
	validateMetadata 
} from '../utils/security.utils';

@Injectable()
export class LoggerService implements NestLoggerService {
	private logger: winston.Logger;
	private readonly serviceName: string;
	private readonly serviceFileTransport: winston.transport | null = null;
	private readonly timers: Map<string, number> = new Map();

	constructor(serviceName: string, options: CustomLoggerOptions = {}) {
		try {
			// Validate service name
			if (!serviceName || typeof serviceName !== 'string' || serviceName.trim().length === 0) {
				throw new Error('Service name must be a non-empty string');
			}

			this.serviceName = serviceName.trim();

			// Create base logger configuration
			const config = createLoggerConfig({ ...options, serviceName: this.serviceName });
			this.logger = winston.createLogger(config);

			// Add service-specific file transport if file logging is enabled
			if (options.enableFileLogging !== false) {
				try {
					this.serviceFileTransport = createServiceFileTransport(this.serviceName);
					this.logger.add(this.serviceFileTransport);
				} catch (error) {
					// Log the error but don't fail completely - fallback to console/combined logging
					console.warn(`Failed to create service file transport for "${this.serviceName}": ${error.message}`);
				}
			}

			// Set winston colors safely
			try {
				winston.addColors({
					error: 'red',
					warn: 'yellow',
					info: 'green',
					debug: 'blue',
					verbose: 'magenta'
				});
			} catch (error) {
				// Colors are not critical, continue without them
				console.warn('Failed to set Winston colors:', error.message);
			}

			// Setup memory monitoring for main application logger
			if (this.serviceName === 'Application') {
				this.setupMemoryMonitoring();
			}
		} catch (error) {
			// If logger creation fails completely, create a minimal fallback
			console.error(`Failed to create logger for service "${serviceName}":`, error);
			this.serviceName = serviceName || 'Unknown';
			
			// Create minimal fallback logger
			this.logger = winston.createLogger({
				level: 'error',
				transports: [new winston.transports.Console()]
			});
		}
	}

	/**
	 * Log an info message
	 */
	log(message: any, context?: any, metadata?: any): void {
		this.info(message, context, metadata);
	}

	/**
	 * Log an error message
	 */
	error(message: any, trace?: any, context?: any, metadata?: any): void {
		try {
			const validatedMessage = validateLogMessage(message);
			const validatedContext = validateContext(context);
			const validatedMetadata = validateMetadata(metadata);
			const validatedTrace = trace ? validateLogMessage(trace) : undefined;

			const logMeta = {
				service: this.serviceName,
				method: validatedContext,
				...(validatedMetadata && { ...validatedMetadata })
			};

			if (validatedTrace) {
				this.logger.error(validatedMessage, { ...logMeta, stack: validatedTrace });
			} else {
				this.logger.error(validatedMessage, logMeta);
			}
		} catch (validationError) {
			// Fallback logging if validation fails
			console.error('Logger validation error:', validationError);
			this.logger.error('[Invalid log parameters]', { service: this.serviceName });
		}
	}

	/**
	 * Log a warning message
	 */
	warn(message: any, context?: any, metadata?: any): void {
		try {
			const validatedMessage = validateLogMessage(message);
			const validatedContext = validateContext(context);
			const validatedMetadata = validateMetadata(metadata);

			this.logger.warn(validatedMessage, {
				service: this.serviceName,
				method: validatedContext,
				...(validatedMetadata && { ...validatedMetadata })
			});
		} catch (validationError) {
			console.error('Logger validation error:', validationError);
			this.logger.warn('[Invalid log parameters]', { service: this.serviceName });
		}
	}

	/**
	 * Log a debug message
	 */
	debug(message: any, context?: any, metadata?: any): void {
		try {
			const validatedMessage = validateLogMessage(message);
			const validatedContext = validateContext(context);
			const validatedMetadata = validateMetadata(metadata);

			this.logger.debug(validatedMessage, {
				service: this.serviceName,
				method: validatedContext,
				...(validatedMetadata && { ...validatedMetadata })
			});
		} catch (validationError) {
			console.error('Logger validation error:', validationError);
			this.logger.debug('[Invalid log parameters]', { service: this.serviceName });
		}
	}

	/**
	 * Log a verbose message
	 */
	verbose(message: any, context?: any, metadata?: any): void {
		try {
			const validatedMessage = validateLogMessage(message);
			const validatedContext = validateContext(context);
			const validatedMetadata = validateMetadata(metadata);

			this.logger.verbose(validatedMessage, {
				service: this.serviceName,
				method: validatedContext,
				...(validatedMetadata && { ...validatedMetadata })
			});
		} catch (validationError) {
			console.error('Logger validation error:', validationError);
			this.logger.verbose('[Invalid log parameters]', { service: this.serviceName });
		}
	}

	/**
	 * Log an info message with additional context
	 */
	info(message: any, context?: any, metadata?: any): void {
		try {
			const validatedMessage = validateLogMessage(message);
			const validatedContext = validateContext(context);
			const validatedMetadata = validateMetadata(metadata);

			this.logger.info(validatedMessage, {
				service: this.serviceName,
				method: validatedContext,
				...(validatedMetadata && { ...validatedMetadata })
			});
		} catch (validationError) {
			console.error('Logger validation error:', validationError);
			this.logger.info('[Invalid log parameters]', { service: this.serviceName });
		}
	}

	/**
	 * Start timing a method execution using performance.now()
	 */
	time(label: any): void {
		try {
			const validatedLabel = validateLogMessage(label);
			const timerKey = `${this.serviceName}::${validatedLabel}`;
			this.timers.set(timerKey, performance.now());
		} catch (validationError) {
			console.error('Timer label validation error:', validationError);
		}
	}

	/**
	 * End timing and log the duration using performance.now()
	 */
	timeEnd(label: any, message?: any, level: 'info' | 'debug' = 'debug'): number {
		try {
			const validatedLabel = validateLogMessage(label);
			const timerKey = `${this.serviceName}::${validatedLabel}`;
			const startTime = this.timers.get(timerKey);
			
			if (startTime === undefined) {
				this.warn(`Timer "${validatedLabel}" was not started`, 'timeEnd');
				return 0;
			}

			const duration = Math.round(performance.now() - startTime);
			this.timers.delete(timerKey);

			const validatedMessage = message ? validateLogMessage(message) : `${validatedLabel} completed`;
			const logMeta = {
				service: this.serviceName,
				method: validatedLabel,
				duration
			};

			// Type-safe logging method call
			if (level === 'info') {
				this.logger.info(validatedMessage, logMeta);
			} else {
				this.logger.debug(validatedMessage, logMeta);
			}

			return duration;
		} catch (validationError) {
			console.error('Timer validation error:', validationError);
			return 0;
		}
	}

	/**
	 * Log method entry
	 */
	methodEntry(methodName: string, parameters?: any): void {
		const message = `Entering ${methodName}`;
		const metadata = parameters ? { parameters } : undefined;

		this.debug(message, methodName, metadata);
	}

	/**
	 * Log method exit
	 */
	methodExit(methodName: string, result?: any, duration?: number): void {
		const message = `Exiting ${methodName}`;
		const metadata: any = {};

		if (result !== undefined) {
			metadata.result = result;
		}

		if (duration !== undefined) {
			metadata.duration = duration;
		}

		this.debug(message, methodName, Object.keys(metadata).length > 0 ? metadata : undefined);
	}

	/**
	 * Log performance metrics with type-safe level determination
	 */
	performance(operation: string, duration: number, context?: string, metadata?: any): void {
		const level = duration > 3000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
		const message = `Performance: ${operation} took ${duration}ms`;

		const logMeta = {
			service: this.serviceName,
			method: context,
			duration,
			...(metadata && { ...metadata })
		};

		// Type-safe logging method call
		if (level === 'warn') {
			this.logger.warn(message, logMeta);
		} else if (level === 'info') {
			this.logger.info(message, logMeta);
		} else {
			this.logger.debug(message, logMeta);
		}
	}

	/**
	 * Create a child logger with additional context
	 * Uses Winston's built-in child logger to prevent memory leaks
	 */
	child(additionalContext: Record<string, any>): LoggerService {
		// Create a new LoggerService that shares the same Winston logger instance
		const childLoggerService = Object.create(LoggerService.prototype);
		childLoggerService.serviceName = this.serviceName;
		childLoggerService.serviceFileTransport = null; // Child loggers don't need separate file transports
		
		// Use Winston's built-in child logger functionality
		childLoggerService.logger = this.logger.child(additionalContext);
		
		return childLoggerService;
	}

	/**
	 * Flush all transports (useful for graceful shutdown)
	 * Returns a Promise that resolves when all transports are flushed
	 */
	async flush(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				// Set a timeout to prevent hanging
				const timeout = setTimeout(() => {
					reject(new Error('Logger flush timeout after 5 seconds'));
				}, 5000);

				this.logger.end(() => {
					clearTimeout(timeout);
					resolve();
				});
			} catch (error) {
				reject(new Error(`Failed to flush logger: ${error.message}`));
			}
		});
	}

	/**
	 * Safe flush that doesn't throw errors (for use in error handlers)
	 */
	safeFlush(): void {
		try {
			this.flush().catch((error) => {
				// Use console.error as fallback since logger might be in bad state
				console.error('Failed to flush logger safely:', error);
			});
		} catch (error) {
			console.error('Failed to initiate logger flush:', error);
		}
	}

	/**
	 * Setup memory monitoring (only for main application logger)
	 */
	private setupMemoryMonitoring(): void {
		// Check memory usage every 30 seconds
		setInterval(() => {
			try {
				const memUsage = process.memoryUsage();
				const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
				const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
				const heapUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

				// Log memory warnings if usage is high
				if (heapUsagePercent >= 90) {
					this.warn(`High memory usage: ${heapUsagePercent}% (${heapUsedMB}MB/${heapTotalMB}MB)`, 'MemoryMonitor', {
						heapUsed: heapUsedMB,
						heapTotal: heapTotalMB,
						heapUsagePercent,
						external: Math.round(memUsage.external / 1024 / 1024),
						rss: Math.round(memUsage.rss / 1024 / 1024)
					});
				} else if (heapUsagePercent >= 75) {
					this.debug(`Memory usage: ${heapUsagePercent}% (${heapUsedMB}MB/${heapTotalMB}MB)`, 'MemoryMonitor');
				}
			} catch (error) {
				// Don't log memory monitoring errors to avoid recursion
				console.error('Memory monitoring error:', error);
			}
		}, 30000); // Every 30 seconds
	}

	/**
	 * Check if an operation is slow and log accordingly
	 */
	checkSlowOperation(operation: string, duration: number, context?: string): void {
		if (duration > 3000) {
			this.warn(`Slow operation detected: ${operation} took ${duration}ms`, context || 'SlowOperationDetector', {
				operation,
				duration,
				threshold: 3000
			});
		}
	}
}
