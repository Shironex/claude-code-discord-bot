import { transports } from 'winston';
import { consoleFormatter } from '../formatters/console.formatter';

export const consoleTransport = (serviceName: string = 'Application', handleGlobalExceptions: boolean = false) => {
	return new transports.Console({
		format: consoleFormatter(serviceName),
		handleExceptions: handleGlobalExceptions,
		handleRejections: handleGlobalExceptions,
		level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
	});
};
