import { LoggerOptions, transport } from 'winston';
import { consoleTransport } from './transports/console.transport';
import { errorFileTransport } from './transports/error-file.transport';
import { combinedFileTransport } from './transports/combined-file.transport';
import { CustomLoggerOptions } from './interfaces/logger.interface';

export const createLoggerConfig = (options: CustomLoggerOptions = {}): LoggerOptions => {
	const configService = options.configService;

	const {
		serviceName = 'Application',
		enableFileLogging = (configService?.get<string>('ENABLE_FILE_LOGS') || process.env.ENABLE_FILE_LOGS) !==
			'false',
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