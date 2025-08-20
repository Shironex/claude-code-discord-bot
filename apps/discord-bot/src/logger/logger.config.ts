import { LoggerOptions, transport } from 'winston';
import { ConfigService } from '@nestjs/config';
import { consoleTransport } from './transports/console.transport';
import { errorFileTransport } from './transports/error-file.transport';
import { combinedFileTransport } from './transports/combined-file.transport';

export interface CustomLoggerOptions extends LoggerOptions {
	serviceName?: string;
	enableFileLogging?: boolean;
	logLevel?: string;
	configService?: ConfigService;
}

export const createLoggerConfig = (options: CustomLoggerOptions = {}): LoggerOptions => {
	const configService = options.configService;
	
	const {
		serviceName = 'Application',
		enableFileLogging = (configService?.get<string>('ENABLE_FILE_LOGS') || process.env.ENABLE_FILE_LOGS) !== 'false',
		logLevel = configService?.get<string>('LOG_LEVEL') || 
				   process.env.LOG_LEVEL || 
				   (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
	} = options;

	// Only the main Application logger should handle global exceptions
	const isMainLogger = serviceName === 'Application';
	const transports: transport[] = [consoleTransport(serviceName, isMainLogger)];

	if (enableFileLogging) {
		transports.push(
			errorFileTransport(isMainLogger),
			combinedFileTransport()
			// Service-specific file transport will be added dynamically
		);
	}

	return {
		level: logLevel,
		transports,
		exitOnError: false,
		silent: process.env.NODE_ENV === 'test'
	};
};

export const LOG_LEVELS = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3,
	verbose: 4
} as const;

export const LOG_COLORS = {
	error: 'red',
	warn: 'yellow',
	info: 'green',
	debug: 'blue',
	verbose: 'magenta'
} as const;
