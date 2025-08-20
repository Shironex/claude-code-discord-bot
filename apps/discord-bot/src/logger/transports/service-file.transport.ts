import * as DailyRotateFile from 'winston-daily-rotate-file';
import { simpleFileFormatter } from '../formatters/file.formatter';
import * as path from 'path';

export const createServiceFileTransport = (serviceName: string) => {
	const logDir = path.resolve(process.cwd(), 'logs', 'services');
	const sanitizedServiceName = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '-');

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
};
