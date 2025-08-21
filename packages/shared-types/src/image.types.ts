/**
 * Core image metadata interface
 */
export interface ImageMetadata {
  id: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  expiresAt: Date;
  originalName?: string;
  userId?: string;
}

/**
 * Extended image metadata for advanced operations
 */
export interface ImageMetadataExtended extends ImageMetadata {
  width?: number;
  height?: number;
  checksum?: string;
  compressed?: boolean;
  compressionRatio?: number;
}

/**
 * Stored image with data and metadata
 */
export interface StoredImage {
  data: Buffer;
  metadata: ImageMetadata;
}

/**
 * Image upload response
 */
export interface ImageUploadResponse {
  id: string;
  url: string;
  expires: string;
  size: number;
  originalName?: string;
  mimeType: string;
}

/**
 * Batch upload response
 */
export interface BatchUploadResponse {
  images: ImageUploadResponse[];
  totalCount: number;
  successCount: number;
  errors?: Array<{
    index: number;
    error: string;
    filename?: string;
  }>;
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
 * Upload configuration
 */
export interface UploadConfig {
  maxFileSize: number;
  maxFiles: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  defaultTtl: number;
  maxTtl: number;
  minTtl: number;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  totalImages: number;
  totalSize: number;
  expiredImages: number;
  oldestImage: Date | null;
  newestImage: Date | null;
  averageSize: number;
}