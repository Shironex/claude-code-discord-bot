import * as DailyRotateFile from 'winston-daily-rotate-file';
import { simpleFileFormatter } from '../formatters/file.formatter';
import { sanitizeServiceName } from '../../utils/security.utils';
import * as path from 'path';

export const createServiceFileTransport = (serviceName: string) => {
	try {
		const baseLogDir = process.env.LOG_DIR || 'logs';
		const logDir = path.resolve(process.cwd(), baseLogDir, 'services');
		const sanitizedServiceName = sanitizeServiceName(serviceName);

		return new DailyRotateFile({
			filename: path.join(logDir, `${sanitizedServiceName}-%DATE%.log`),
			datePattern: 'YYYY-MM-DD',
			format: simpleFileFormatter,
			maxSize: '10m',
			maxFiles: '7d',
			zippedArchive: true,
			createSymlink: true,
			symlinkName: `${sanitizedServiceName}.log`,
			level: process.env.LOG_LEVEL || 'debug'
		});
	} catch (error) {
		// Fallback to a safe default if service name sanitization fails
		console.error(`Failed to create service file transport for "${serviceName}":`, error);
		throw new Error(`Invalid service name for logging: ${error.message}`);
	}
};
