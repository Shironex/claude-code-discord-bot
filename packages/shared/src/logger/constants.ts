/**
 * Logger constants and configuration
 */

/**
 * Valid log levels in order of severity
 */
export const LOG_LEVELS = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3,
	verbose: 4
} as const;

/**
 * Color mapping for log levels
 */
export const LOG_COLORS = {
	error: 'red',
	warn: 'yellow',
	info: 'green',
	debug: 'blue',
	verbose: 'magenta'
} as const;

/**
 * Default log format timestamp
 */
export const LOG_TIMESTAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * Default memory monitoring thresholds
 */
export const MEMORY_THRESHOLDS = {
	WARNING: 90, // Percentage of heap usage to trigger warning
	DEBUG: 75,   // Percentage of heap usage to trigger debug logging
	CHECK_INTERVAL: 30000 // Memory check interval in milliseconds
} as const;

/**
 * Performance timing thresholds in milliseconds
 */
export const PERFORMANCE_THRESHOLDS = {
	SLOW_OPERATION: 1000, // Operations slower than this are logged as warnings
	VERY_SLOW_OPERATION: 5000 // Operations slower than this are logged as errors
} as const;

/**
 * Logger service names token for dependency injection
 */
export const LOGGER_SERVICE_TOKEN = 'LOGGER_SERVICE';

/**
 * Custom logger token for dependency injection
 */
export const CUSTOM_LOGGER = 'CUSTOM_LOGGER';