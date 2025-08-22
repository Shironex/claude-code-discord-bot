import { transports } from 'winston';
import { fileFormatter } from '../formatters/file.formatter';
import { sanitizeServiceName } from '../utils/security.utils';

/**
 * Create service-specific file transport
 * @param serviceName Name of the service (will be sanitized for filename)
 * @returns Winston file transport for service-specific logs
 */
export const createServiceFileTransport = (serviceName: string) => {
	const sanitizedName = sanitizeServiceName(serviceName);
	
	return new transports.File({
		filename: `logs/services/${sanitizedName}.log`,
		format: fileFormatter(),
		maxsize: 5242880, // 5MB
		maxFiles: 5,
		tailable: true
	});
};