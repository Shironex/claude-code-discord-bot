import { transports } from 'winston';
import { fileFormatter } from '../formatters/file.formatter';

/**
 * Create error file transport for error-level logs only
 * @param handleExceptions Whether this transport should handle uncaught exceptions
 * @returns Winston file transport for errors
 */
export const errorFileTransport = (handleExceptions: boolean = false) => {
	return new transports.File({
		filename: 'logs/error.log',
		level: 'error',
		format: fileFormatter(),
		handleExceptions,
		handleRejections: handleExceptions,
		maxsize: 5242880, // 5MB
		maxFiles: 5,
		tailable: true
	});
};