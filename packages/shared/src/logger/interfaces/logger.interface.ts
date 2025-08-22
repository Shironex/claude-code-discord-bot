import { LoggerOptions } from 'winston';
import { ConfigService } from '@nestjs/config';

/**
 * Valid log levels
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

/**
 * Custom logger options extending Winston LoggerOptions
 */
export interface CustomLoggerOptions extends LoggerOptions {
	serviceName?: string;
	enableFileLogging?: boolean;
	logLevel?: LogLevel;
	configService?: ConfigService;
}

/**
 * Logger service interface
 */
export interface ILoggerService {
	log(message: any, context?: any, metadata?: any): void;
	error(message: any, trace?: any, context?: any, metadata?: any): void;
	warn(message: any, context?: any, metadata?: any): void;
	debug(message: any, context?: any, metadata?: any): void;
	verbose(message: any, context?: any, metadata?: any): void;
	info(message: any, context?: any, metadata?: any): void;
	
	// Performance monitoring
	time(label: string): void;
	timeEnd(label: string): number;
	performance(operation: string, duration: number, context?: string): void;
	
	// Method lifecycle logging
	methodEntry(methodName: string, params?: any): void;
	methodExit(methodName: string, result?: any): void;
	
	// Child logger creation
	child(metadata: Record<string, any>): ILoggerService;
	
	// Lifecycle
	flush(): Promise<void>;
	safeFlush(): Promise<void>;
}

/**
 * Logger factory interface
 */
export interface ILoggerFactory {
	createLogger(serviceName: string): ILoggerService;
	getAllLoggers(): ILoggerService[];
	flushAll(): Promise<void>;
	clear(): void;
}

/**
 * Performance monitoring metadata
 */
export interface PerformanceMetadata {
	operation: string;
	duration: number;
	context?: string;
	timestamp: string;
}

/**
 * Memory usage information
 */
export interface MemoryUsage {
	used: number;
	total: number;
	percentage: number;
	external: number;
	heapUsed: number;
	heapTotal: number;
}