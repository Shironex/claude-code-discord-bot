import { format, Logform } from 'winston';
import { filterSensitiveData } from '../utils/security.utils';
import { LOG_TIMESTAMP_FORMAT } from '../constants';

const { combine, timestamp, errors, printf } = format;

export const fileFormatter = (): Logform.Format => {
	return combine(
		timestamp({ format: LOG_TIMESTAMP_FORMAT }),
		errors({ stack: true }),
		printf(({ timestamp, level, message, service, method, duration, stack, ...meta }) => {
			// Filter sensitive data from metadata before logging to files
			const filteredMeta = Object.keys(meta).length > 0 ? filterSensitiveData(meta) : {};

			const logEntry: any = {
				timestamp,
				level,
				service,
				method,
				message,
				duration
			};

			if (stack) {
				logEntry.stack = stack;
			}

			if (Object.keys(filteredMeta).length > 0) {
				logEntry.metadata = filteredMeta;
			}

			return JSON.stringify(logEntry);
		})
	);
};