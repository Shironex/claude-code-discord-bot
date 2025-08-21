/**
 * Health check status values
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
export type ServiceStatus = 'up' | 'down' | 'degraded';

/**
 * Individual service health status
 */
export interface ServiceHealthStatus {
  status: ServiceStatus;
  responseTime?: number;
  error?: string;
  lastCheck: Date;
  details?: Record<string, any>;
}

/**
 * Complete health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
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
 * Cleanup operation result
 */
export interface CleanupResult {
  cleanedCount: number;
  totalSize: number;
  errors: string[];
  duration: number;
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