/**
 * Security utilities for logging operations
 */

/**
 * List of sensitive keys that should be filtered from metadata
 */
export const SENSITIVE_KEYS = [
	'password',
	'token',
	'key',
	'secret',
	'apikey',
	'api_key',
	'auth',
	'authorization',
	'bearer',
	'cookie',
	'session',
	'csrf',
	'private',
	'credential',
	'jwt',
	'refresh',
	'access_token',
	'refresh_token',
	'client_secret',
	'webhook_secret'
] as const;

/**
 * Maximum allowed length for service names
 */
export const MAX_SERVICE_NAME_LENGTH = 50;

/**
 * Sanitize service name to prevent path traversal attacks
 * @param serviceName The service name to sanitize
 * @returns Sanitized service name safe for file paths
 * @throws Error if service name is invalid
 */
export function sanitizeServiceName(serviceName: string): string {
	if (!serviceName || typeof serviceName !== 'string') {
		throw new Error('Service name must be a non-empty string');
	}

	// Remove any path traversal attempts and dangerous characters
	const sanitized = serviceName
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]/g, '-') // Only allow alphanumeric and convert to hyphens
		.replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
		.replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
		.replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
		.substring(0, MAX_SERVICE_NAME_LENGTH); // Limit length

	// Validate final result
	if (!sanitized || sanitized === '-' || sanitized.length === 0) {
		throw new Error(`Invalid service name: "${serviceName}" - must contain at least one alphanumeric character`);
	}

	// Additional security check - ensure no path traversal patterns remain
	if (sanitized.includes('..') || sanitized.includes('/') || sanitized.includes('\\')) {
		throw new Error(`Service name contains invalid path characters: "${sanitized}"`);
	}

	return sanitized;
}

/**
 * Filter sensitive data from metadata object
 * @param metadata The metadata object to filter
 * @returns Filtered metadata with sensitive keys removed or masked
 */
export function filterSensitiveData(metadata: Record<string, any>): Record<string, any> {
	if (!metadata || typeof metadata !== 'object') {
		return metadata;
	}

	const filtered: Record<string, any> = {};

	for (const [key, value] of Object.entries(metadata)) {
		const lowerKey = key.toLowerCase();
		
		// Check if key contains any sensitive patterns
		const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => 
			lowerKey.includes(sensitiveKey)
		);

		if (isSensitive) {
			// Mask sensitive data instead of removing completely
			filtered[key] = '[REDACTED]';
		} else if (value && typeof value === 'object' && !Array.isArray(value)) {
			// Recursively filter nested objects
			filtered[key] = filterSensitiveData(value);
		} else {
			// Keep non-sensitive data as-is
			filtered[key] = value;
		}
	}

	return filtered;
}

/**
 * Validate log level to ensure type safety
 * @param level The log level to validate
 * @returns True if level is valid
 */
export function isValidLogLevel(level: string): level is 'error' | 'warn' | 'info' | 'debug' | 'verbose' {
	return ['error', 'warn', 'info', 'debug', 'verbose'].includes(level);
}

/**
 * Validate and sanitize log message
 * @param message The message to validate
 * @returns Sanitized message
 * @throws Error if message is invalid
 */
export function validateLogMessage(message: any): string {
	if (message === null || message === undefined) {
		return '[null/undefined message]';
	}

	if (typeof message === 'string') {
		return message.length > 10000 ? message.substring(0, 10000) + '...[truncated]' : message;
	}

	if (typeof message === 'object') {
		try {
			const stringified = JSON.stringify(message);
			return stringified.length > 10000 ? stringified.substring(0, 10000) + '...[truncated]' : stringified;
		} catch (error) {
			return '[object - failed to stringify]';
		}
	}

	// Convert other types to string
	return String(message);
}

/**
 * Validate context parameter
 * @param context The context to validate
 * @returns Sanitized context or undefined
 */
export function validateContext(context: any): string | undefined {
	if (context === null || context === undefined) {
		return undefined;
	}

	if (typeof context === 'string') {
		const trimmed = context.trim();
		if (trimmed.length === 0) {
			return undefined;
		}
		// Limit context length and sanitize
		return trimmed.length > 100 ? trimmed.substring(0, 100) + '...' : trimmed;
	}

	// Convert non-string contexts to string
	return String(context).substring(0, 100);
}

/**
 * Validate metadata parameter
 * @param metadata The metadata to validate
 * @returns Sanitized metadata or undefined
 */
export function validateMetadata(metadata: any): Record<string, any> | undefined {
	if (metadata === null || metadata === undefined) {
		return undefined;
	}

	if (typeof metadata !== 'object' || Array.isArray(metadata)) {
		// Convert non-object metadata to object
		return { value: metadata };
	}

	// Check for circular references and deep objects
	try {
		JSON.stringify(metadata);
		return metadata;
	} catch (error) {
		return { error: 'Metadata contains circular references or is not serializable' };
	}
}