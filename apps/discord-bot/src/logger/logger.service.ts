import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { createLoggerConfig, CustomLoggerOptions } from './logger.config';
import { createServiceFileTransport } from './transports/service-file.transport';

@Injectable()
export class LoggerService implements NestLoggerService {
	private logger: winston.Logger;
	private readonly serviceName: string;
	private readonly serviceFileTransport: winston.transport | null = null;

	constructor(serviceName: string, options: CustomLoggerOptions = {}) {
		this.serviceName = serviceName;

		// Create base logger configuration
		const config = createLoggerConfig({ ...options, serviceName });
		this.logger = winston.createLogger(config);

		// Add service-specific file transport if file logging is enabled
		if (options.enableFileLogging !== false) {
			this.serviceFileTransport = createServiceFileTransport(serviceName);
			this.logger.add(this.serviceFileTransport);
		}

		// Set winston colors
		winston.addColors({
			error: 'red',
			warn: 'yellow',
			info: 'green',
			debug: 'blue',
			verbose: 'magenta'
		});
	}

	/**
	 * Log an info message
	 */
	log(message: string, context?: string, metadata?: any): void {
		this.info(message, context, metadata);
	}

	/**
	 * Log an error message
	 */
	error(message: string, trace?: string, context?: string, metadata?: any): void {
		const logMeta = {
			service: this.serviceName,
			method: context,
			...(metadata && { ...metadata })
		};

		if (trace) {
			this.logger.error(message, { ...logMeta, stack: trace });
		} else {
			this.logger.error(message, logMeta);
		}
	}

	/**
	 * Log a warning message
	 */
	warn(message: string, context?: string, metadata?: any): void {
		this.logger.warn(message, {
			service: this.serviceName,
			method: context,
			...(metadata && { ...metadata })
		});
	}

	/**
	 * Log a debug message
	 */
	debug(message: string, context?: string, metadata?: any): void {
		this.logger.debug(message, {
			service: this.serviceName,
			method: context,
			...(metadata && { ...metadata })
		});
	}

	/**
	 * Log a verbose message
	 */
	verbose(message: string, context?: string, metadata?: any): void {
		this.logger.verbose(message, {
			service: this.serviceName,
			method: context,
			...(metadata && { ...metadata })
		});
	}

	/**
	 * Log an info message with additional context
	 */
	info(message: string, context?: string, metadata?: any): void {
		this.logger.info(message, {
			service: this.serviceName,
			method: context,
			...(metadata && { ...metadata })
		});
	}

	/**
	 * Time a method execution
	 */
	time(label: string): void {
		console.time(`${this.serviceName}::${label}`);
	}

	/**
	 * End timing and log the duration
	 */
	timeEnd(label: string, message?: string, level: 'info' | 'debug' = 'debug'): void {
		console.timeEnd(`${this.serviceName}::${label}`);

		const logMessage = message || `${label} completed`;
		const logMeta = {
			service: this.serviceName,
			method: label
		};

		this.logger[level](logMessage, logMeta);
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
	 * Log performance metrics
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

		this.logger[level](message, logMeta);
	}

	/**
	 * Create a child logger with additional context
	 */
	child(additionalContext: Record<string, any>): LoggerService {
		const childLogger = new LoggerService(this.serviceName, {
			enableFileLogging: false // Child loggers don't need separate files
		});

		// Override the Winston logger to include additional context
		const originalChild = childLogger.logger.child(additionalContext);
		childLogger.logger = originalChild;

		return childLogger;
	}

	/**
	 * Flush all transports (useful for graceful shutdown)
	 */
	flush(): void {
		this.logger.end();
	}
}
