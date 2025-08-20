import * as DailyRotateFile from 'winston-daily-rotate-file';
import { fileFormatter } from '../formatters/file.formatter';
import * as path from 'path';

export const combinedFileTransport = () => {
	const logDir = path.resolve(process.cwd(), 'logs');

	return new DailyRotateFile({
		filename: path.join(logDir, 'combined-%DATE%.log'),
		datePattern: 'YYYY-MM-DD',
		format: fileFormatter,
		maxSize: '20m',
		maxFiles: '14d',
		zippedArchive: true,
		createSymlink: true,
		symlinkName: 'combined.log',
		level: process.env.LOG_LEVEL || 'info'
	});
};
