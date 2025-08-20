import { format, Logform } from 'winston';

const { combine, timestamp, errors, json, printf } = format;

export const fileFormatter: Logform.Format = combine(
	timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
	errors({ stack: true }),
	printf(({ timestamp, level, message, service, method, duration, stack, ...meta }) => {
		const logEntry = {
			timestamp,
			level,
			service,
			method,
			message,
			duration,
			...(stack && { stack }),
			...(Object.keys(meta).length > 0 && { metadata: meta })
		};

		return JSON.stringify(logEntry);
	})
);

export const simpleFileFormatter: Logform.Format = combine(
	timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	errors({ stack: true }),
	printf(({ timestamp, level, message, service, method, duration, stack, ...meta }) => {
		let logLine = `[${timestamp}] [${level.toUpperCase()}] [${service || 'App'}]`;

		if (method) {
			logLine += `::${method}`;
		}

		logLine += ` ${message}`;

		if (duration) {
			logLine += ` (${duration}ms)`;
		}

		if (stack) {
			logLine += `\nStack: ${stack}`;
		}

		if (Object.keys(meta).length > 0) {
			logLine += `\nMetadata: ${JSON.stringify(meta)}`;
		}

		return logLine;
	})
);
