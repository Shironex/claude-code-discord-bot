import { format, Logform } from 'winston';
import chalk from 'chalk';
import { filterSensitiveData } from '../utils/security.utils';
import { LOG_TIMESTAMP_FORMAT } from '../constants';

const { combine, timestamp, printf, errors } = format;

export const consoleFormatter = (serviceName: string): Logform.Format => {
	return combine(
		timestamp({ format: LOG_TIMESTAMP_FORMAT }),
		errors({ stack: true }),
		printf(({ level, message, timestamp, service, method, duration, stack, ...meta }) => {
			// Color mapping for log levels
			const levelColors = {
				error: chalk.red,
				warn: chalk.yellow,
				info: chalk.green,
				debug: chalk.blue,
				verbose: chalk.magenta
			};

			const colorFn = levelColors[level as keyof typeof levelColors] || chalk.white;
			const levelText = colorFn(level.toUpperCase().padEnd(7));

			// Format timestamp
			const timeText = chalk.gray(`[${timestamp}]`);

			// Format service name
			const serviceText = chalk.cyan(`[${service || serviceName}]`);

			// Format method if provided
			const methodText = method ? chalk.blue(`::${method}`) : '';

			// Format duration if provided
			const durationText = duration ? chalk.magenta(` (${duration}ms)`) : '';

			// Format message
			let messageText = message;

			// Handle error stack traces
			if (stack) {
				messageText += `\n${chalk.red(stack)}`;
			}

			// Add metadata if present - filter sensitive data first
			if (Object.keys(meta).length > 0) {
				const filteredMeta = filterSensitiveData(meta);
				const metaText = JSON.stringify(filteredMeta, null, 2);
				messageText += chalk.gray(`\nMetadata: ${metaText}`);
			}

			return `${timeText} ${levelText} ${serviceText}${methodText} ${messageText}${durationText}`;
		})
	);
};