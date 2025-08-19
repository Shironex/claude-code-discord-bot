/**
 * Error categorization system for better error handling and user messaging
 */

export enum ErrorCategory {
	NETWORK = 'network',
	AUTHENTICATION = 'authentication', 
	RATE_LIMIT = 'rate_limit',
	NOT_FOUND = 'not_found',
	VALIDATION = 'validation',
	GITHUB_API = 'github_api',
	SESSION = 'session',
	PERMISSION = 'permission',
	UNKNOWN = 'unknown'
}

export interface CategorizedError {
	category: ErrorCategory;
	message: string;
	userMessage: string;
	originalError: Error;
	isRetryable: boolean;
}

export class ErrorCategorizer {
	/**
	 * Categorize an error and provide appropriate user messaging
	 */
	static categorizeError(error: any): CategorizedError {
		const message = error.message || error.toString();
		const lowerMessage = message.toLowerCase();

		// Rate limiting errors
		if (lowerMessage.includes('rate limit') || error.status === 429) {
			return {
				category: ErrorCategory.RATE_LIMIT,
				message,
				userMessage: '⏱️ GitHub API rate limit reached. Please wait a few minutes before trying again.',
				originalError: error,
				isRetryable: true
			};
		}

		// Authentication errors
		if (lowerMessage.includes('authentication') || lowerMessage.includes('unauthorized') || error.status === 401) {
			return {
				category: ErrorCategory.AUTHENTICATION,
				message,
				userMessage: '🔑 GitHub authentication failed. Please contact an administrator.',
				originalError: error,
				isRetryable: false
			};
		}

		// Not found errors
		if (lowerMessage.includes('not found') || error.status === 404) {
			return {
				category: ErrorCategory.NOT_FOUND,
				message,
				userMessage: '❌ Repository not found or no longer accessible.',
				originalError: error,
				isRetryable: false
			};
		}

		// Permission errors
		if (lowerMessage.includes('forbidden') || lowerMessage.includes('permission') || error.status === 403) {
			return {
				category: ErrorCategory.PERMISSION,
				message,
				userMessage: '🚫 Access denied. You may not have permission to access this repository.',
				originalError: error,
				isRetryable: false
			};
		}

		// Validation errors
		if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerMessage.includes('path traversal')) {
			return {
				category: ErrorCategory.VALIDATION,
				message,
				userMessage: '⚠️ Invalid input provided. Please check your selections and try again.',
				originalError: error,
				isRetryable: false
			};
		}

		// Network errors
		if (lowerMessage.includes('network') || 
			lowerMessage.includes('timeout') || 
			lowerMessage.includes('connection') ||
			error.code === 'ECONNRESET' || 
			error.code === 'ETIMEDOUT' || 
			error.code === 'ENOTFOUND') {
			return {
				category: ErrorCategory.NETWORK,
				message,
				userMessage: '🌐 Network error occurred. Please check your connection and try again.',
				originalError: error,
				isRetryable: true
			};
		}

		// GitHub API specific errors
		if (error.status >= 500 || lowerMessage.includes('github api')) {
			return {
				category: ErrorCategory.GITHUB_API,
				message,
				userMessage: '🐙 GitHub API is experiencing issues. Please try again in a few minutes.',
				originalError: error,
				isRetryable: true
			};
		}

		// Session errors
		if (lowerMessage.includes('session') || lowerMessage.includes('expired')) {
			return {
				category: ErrorCategory.SESSION,
				message,
				userMessage: '⏰ Your session has expired. Please start over with the /claude command.',
				originalError: error,
				isRetryable: false
			};
		}

		// Unknown errors
		return {
			category: ErrorCategory.UNKNOWN,
			message,
			userMessage: '❓ An unexpected error occurred. Please try again or contact support if the problem persists.',
			originalError: error,
			isRetryable: false
		};
	}

	/**
	 * Get appropriate log level for error category
	 */
	static getLogLevel(category: ErrorCategory): 'error' | 'warn' | 'info' {
		switch (category) {
			case ErrorCategory.RATE_LIMIT:
			case ErrorCategory.NETWORK:
				return 'warn';
			case ErrorCategory.SESSION:
			case ErrorCategory.VALIDATION:
				return 'info';
			default:
				return 'error';
		}
	}

	/**
	 * Determine if an error should trigger retry logic
	 */
	static shouldRetry(category: ErrorCategory): boolean {
		return [
			ErrorCategory.NETWORK,
			ErrorCategory.RATE_LIMIT,
			ErrorCategory.GITHUB_API
		].includes(category);
	}
}