/**
 * Extended image metadata for various operations
 */
export interface ImageMetadataExtended {
	id: string;
	size: number;
	mimeType: string;
	uploadedAt: Date;
	expiresAt: Date;
	originalName?: string;
	userId?: string;
	width?: number;
	height?: number;
	checksum?: string;
	compressed?: boolean;
	compressionRatio?: number;
}

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
	resize?: {
		width?: number;
		height?: number;
		maintainAspectRatio?: boolean;
	};
	compress?: {
		quality?: number;
		format?: 'jpeg' | 'webp' | 'png';
	};
	thumbnail?: {
		size: number;
	};
}

/**
 * File validation result
 */
export interface FileValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	metadata?: {
		size: number;
		mimeType: string;
		extension: string;
		dimensions?: {
			width: number;
			height: number;
		};
	};
}

/**
 * Upload progress tracking
 */
export interface UploadProgress {
	uploadId: string;
	userId?: string;
	totalFiles: number;
	processedFiles: number;
	successfulUploads: number;
	failedUploads: number;
	errors: Array<{
		filename: string;
		error: string;
	}>;
	startTime: Date;
	estimatedCompletion?: Date;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
	status: 'healthy' | 'degraded' | 'unhealthy';
	services: {
		redis: ServiceHealthStatus;
		storage: ServiceHealthStatus;
		rateLimit: ServiceHealthStatus;
	};
	timestamp: Date;
	uptime: number;
	version: string;
}

/**
 * Individual service health status
 */
export interface ServiceHealthStatus {
	status: 'up' | 'down' | 'degraded';
	responseTime?: number;
	error?: string;
	lastCheck: Date;
	details?: Record<string, any>;
}

/**
 * API response wrapper interface
 */
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
		details?: any;
	};
	timestamp: Date;
	requestId: string;
}

/**
 * Pagination interface for list operations
 */
export interface PaginationOptions {
	page: number;
	limit: number;
	sortBy?: string;
	sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrevious: boolean;
	};
}
