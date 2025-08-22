import { transports } from 'winston';
import { fileFormatter } from '../formatters/file.formatter';

/**
 * Create combined file transport for all log levels
 * @returns Winston file transport for combined logs
 */
export const combinedFileTransport = () => {
	return new transports.File({
		filename: 'logs/combined.log',
		format: fileFormatter(),
		maxsize: 5242880, // 5MB
		maxFiles: 10,
		tailable: true
	});
};