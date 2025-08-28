import { transports } from 'winston';
import { consoleFormatter } from '../formatters/console.formatter';

/**
 * Create console transport with colored output
 * @param serviceName Name of the service for formatting
 * @param handleExceptions Whether this transport should handle uncaught exceptions
 * @returns Winston console transport
 */
export const consoleTransport = (serviceName: string, handleExceptions: boolean = false) => {
	return new transports.Console({
		format: consoleFormatter(serviceName),
		handleExceptions,
		handleRejections: handleExceptions,
		stderrLevels: ['error']
	});
};