import * as DailyRotateFile from 'winston-daily-rotate-file';
import { fileFormatter } from '../formatters/file.formatter';
import * as path from 'path';

export const errorFileTransport = (handleGlobalExceptions: boolean = false) => {
	const logDir = path.resolve(process.cwd(), process.env.LOG_DIR || 'logs');

	return new DailyRotateFile({
		filename: path.join(logDir, 'error-%DATE%.log'),
		datePattern: 'YYYY-MM-DD',
		level: 'error',
		format: fileFormatter,
		maxSize: '20m',
		maxFiles: process.env.LOG_MAX_FILES || '14d',
		handleExceptions: handleGlobalExceptions,
		handleRejections: handleGlobalExceptions,
		zippedArchive: true,
		createSymlink: true,
		symlinkName: 'error.log'
	});
};
