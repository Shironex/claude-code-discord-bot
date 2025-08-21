import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
	ImageUploadResponse,
	BatchUploadResponse,
	ImageMetadata as SharedImageMetadata,
	DeleteResponse,
	AuthConfig,
	StorageStats,
	SHARED_IMAGE_CONSTANTS
} from '@claude-code/shared';

export interface ImageServiceConfig {
	baseUrl: string;
	apiKey: string;
	timeout: number;
}

export interface UploadImageOptions {
	ttl?: number;
	userId?: string;
}

// # Can convert to interface to extends the types
export type BatchUploadOptions = UploadImageOptions;

@Injectable()
export class ImageServiceClient {
	private readonly logger = new Logger(ImageServiceClient.name);
	private readonly httpClient: AxiosInstance;
	private readonly config: ImageServiceConfig;

	constructor(private readonly configService: ConfigService) {
		this.config = {
			baseUrl: this.configService.get<string>('IMAGE_SERVICE_BASE_URL', 'http://localhost:3001/api/v1'),
			apiKey: this.configService.get<string>('DISCORD_BOT_API_KEY') || '',
			timeout: this.configService.get<number>('IMAGE_SERVICE_TIMEOUT', 30000)
		};

		if (!this.config.apiKey) {
			this.logger.warn('DISCORD_BOT_API_KEY not configured - image service will not be available');
		}

		this.httpClient = axios.create({
			baseURL: this.config.baseUrl,
			timeout: this.config.timeout,
			headers: {
				'Content-Type': 'application/json',
				[SHARED_IMAGE_CONSTANTS.HEADERS.API_KEY]: this.config.apiKey
			}
		});

		// Add response interceptor for enhanced error handling
		this.httpClient.interceptors.response.use(
			response => response,
			error => {
				const errorDetails = {
					message: error.message,
					code: error.code,
					url: error.config?.url,
					method: error.config?.method,
					status: error.response?.status,
					statusText: error.response?.statusText,
					data: error.response?.data,
					headers: error.response?.headers,
					requestHeaders: error.config?.headers,
					timeout: error.config?.timeout,
					baseURL: error.config?.baseURL,
					isAxiosError: error.isAxiosError,
					errno: error.errno,
					syscall: error.syscall,
					address: error.address,
					port: error.port
				};

				this.logger.error('Image service request failed with detailed info:', 'httpClient', errorDetails);

				// Add more context to the error
				const enhancedError = new Error(
					`Image service error: ${error.message} (Status: ${error.response?.status || 'unknown'})`
				);
				(enhancedError as any).cause = error;
				(enhancedError as any).details = errorDetails;

				throw enhancedError;
			}
		);

		this.logger.log('Image service client initialized with config:', {
			baseUrl: this.config.baseUrl,
			hasApiKey: !!this.config.apiKey,
			apiKeyPrefix: this.config.apiKey ? this.config.apiKey.substring(0, 10) + '...' : 'none',
			timeout: this.config.timeout,
			isAvailable: this.isAvailable()
		});
	}

	/**
	 * Check if image service is configured and available
	 */
	isAvailable(): boolean {
		return !!this.config.apiKey && !!this.config.baseUrl;
	}

	/**
	 * Upload a single image from buffer
	 */
	async uploadImage(
		buffer: Buffer,
		filename: string,
		options: UploadImageOptions & { contentType?: string } = {}
	): Promise<ImageUploadResponse> {
		if (!this.isAvailable()) {
			throw new Error('Image service is not available - check configuration');
		}

		this.logger.debug(`Uploading image: ${filename}`, {
			size: buffer.length,
			ttl: options.ttl,
			userId: options.userId
		});

		const formData = new FormData();
		const contentType = options.contentType || this.getMimeTypeFromFilename(filename) || 'application/octet-stream';
		const blob = new Blob([buffer], { type: contentType });
		formData.append('image', blob, filename);

		if (options.ttl) {
			formData.append('ttl', options.ttl.toString());
		}
		if (options.userId) {
			formData.append('userId', options.userId);
		}

		const response: AxiosResponse<ImageUploadResponse> = await this.httpClient.post(
			SHARED_IMAGE_CONSTANTS.ENDPOINTS.UPLOAD,
			formData,
			{
				headers: {
					'Content-Type': 'multipart/form-data'
				}
			}
		);

		this.logger.log(`Image uploaded successfully: ${response.data.id}`, {
			id: response.data.id,
			size: response.data.size,
			expires: response.data.expires
		});

		return response.data;
	}

	/**
	 * Upload multiple images
	 */
	async uploadBatch(
		images: Array<{ buffer: Buffer; filename: string; contentType?: string }>,
		options: BatchUploadOptions = {}
	): Promise<BatchUploadResponse> {
		if (!this.isAvailable()) {
			throw new Error('Image service is not available - check configuration');
		}

		if (images.length > SHARED_IMAGE_CONSTANTS.MAX_BATCH_FILES) {
			throw new Error(
				`Too many images: ${images.length}. Maximum allowed: ${SHARED_IMAGE_CONSTANTS.MAX_BATCH_FILES}`
			);
		}

		this.logger.debug(`Uploading batch of ${images.length} images`, {
			count: images.length,
			ttl: options.ttl,
			userId: options.userId
		});

		const formData = new FormData();

		images.forEach(image => {
			// Use provided content type or detect from filename
			const contentType =
				image.contentType || this.getMimeTypeFromFilename(image.filename) || 'application/octet-stream';
			const blob = new Blob([image.buffer], { type: contentType });
			formData.append(`images`, blob, image.filename);
		});

		if (options.ttl) {
			formData.append('ttl', options.ttl.toString());
		}
		if (options.userId) {
			formData.append('userId', options.userId);
		}

		const url = SHARED_IMAGE_CONSTANTS.ENDPOINTS.BATCH_UPLOAD;

		this.logger.debug('Batch upload form data', {
			formData: JSON.stringify(formData, null, 2),
			url
		});

		const response: AxiosResponse<BatchUploadResponse> = await this.httpClient.post(
			SHARED_IMAGE_CONSTANTS.ENDPOINTS.BATCH_UPLOAD,
			formData,
			{
				headers: {
					'Content-Type': 'multipart/form-data'
				}
			}
		);

		if (response.data.errors?.length) {
			this.logger.error('Batch upload errors', {
				errors: response.data.errors
			});
		}

		this.logger.log(
			`Batch upload completed: ${response.data.successCount}/${response.data.totalCount} successful`,
			{
				totalCount: response.data.totalCount,
				successCount: response.data.successCount,
				errors: response.data.errors?.length || 0
			}
		);

		return response.data;
	}

	/**
	 * Get image metadata
	 */
	async getImageMetadata(imageId: string): Promise<SharedImageMetadata> {
		if (!this.isAvailable()) {
			throw new Error('Image service is not available - check configuration');
		}

		this.logger.debug(`Getting metadata for image: ${imageId}`);

		const response: AxiosResponse<SharedImageMetadata> = await this.httpClient.get(
			`${SHARED_IMAGE_CONSTANTS.ENDPOINTS.IMAGES}/${imageId}/metadata`
		);

		return response.data;
	}

	/**
	 * Delete an image
	 */
	async deleteImage(imageId: string): Promise<DeleteResponse> {
		if (!this.isAvailable()) {
			throw new Error('Image service is not available - check configuration');
		}

		this.logger.debug(`Deleting image: ${imageId}`);

		const response: AxiosResponse<DeleteResponse> = await this.httpClient.delete(
			`${SHARED_IMAGE_CONSTANTS.ENDPOINTS.IMAGES}/${imageId}`
		);

		this.logger.log(`Image deleted: ${imageId}`);

		return response.data;
	}

	/**
	 * Get image service health status
	 */
	async getHealth(): Promise<any> {
		if (!this.isAvailable()) {
			throw new Error('Image service is not available - check configuration');
		}

		const response = await this.httpClient.get(SHARED_IMAGE_CONSTANTS.ENDPOINTS.HEALTH);
		return response.data;
	}

	/**
	 * Get authentication configuration
	 */
	async getAuthConfig(): Promise<AuthConfig> {
		if (!this.isAvailable()) {
			throw new Error('Image service is not available - check configuration');
		}

		const response: AxiosResponse<AuthConfig> = await this.httpClient.get(
			`${SHARED_IMAGE_CONSTANTS.ENDPOINTS.AUTH}/config`
		);

		return response.data;
	}

	/**
	 * Get storage statistics (admin)
	 */
	async getStorageStats(): Promise<StorageStats> {
		if (!this.isAvailable()) {
			throw new Error('Image service is not available - check configuration');
		}

		const response: AxiosResponse<StorageStats> = await this.httpClient.get(
			`${SHARED_IMAGE_CONSTANTS.ENDPOINTS.IMAGES}/_admin/stats`
		);

		return response.data;
	}

	/**
	 * Generate image URL for direct access
	 */
	getImageUrl(imageId: string): string {
		return `${this.config.baseUrl}${SHARED_IMAGE_CONSTANTS.ENDPOINTS.IMAGES}/${imageId}`;
	}

	/**
	 * Test connection to image service with detailed logging
	 */
	async testConnection(): Promise<boolean> {
		this.logger.debug('Testing connection to image service...', {
			baseUrl: this.config.baseUrl,
			hasApiKey: !!this.config.apiKey,
			apiKeyPrefix: this.config.apiKey ? this.config.apiKey.substring(0, 10) + '...' : 'none',
			testEndpoint: `${SHARED_IMAGE_CONSTANTS.ENDPOINTS.AUTH}/test`
		});

		if (!this.isAvailable()) {
			this.logger.error('Image service not available for connection test', {
				baseUrl: this.config.baseUrl,
				hasApiKey: !!this.config.apiKey
			});
			return false;
		}

		try {
			const response = await this.httpClient.get(`${SHARED_IMAGE_CONSTANTS.ENDPOINTS.AUTH}/test`);
			this.logger.log('Image service connection test successful', {
				status: response.status,
				statusText: response.statusText,
				data: response.data
			});
			return true;
		} catch (error) {
			this.logger.error('Image service connection test failed with details:', 'testConnection', {
				error: error.message,
				status: (error as any).response?.status,
				statusText: (error as any).response?.statusText,
				data: (error as any).response?.data,
				errorDetails: (error as any).details || 'No additional details'
			});
			return false;
		}
	}

	/**
	 * Get detailed diagnostic information about the client configuration
	 */
	getDiagnosticInfo(): {
		isConfigured: boolean;
		baseUrl: string;
		hasApiKey: boolean;
		apiKeyPrefix: string;
		timeout: number;
		isAvailable: boolean;
	} {
		return {
			isConfigured: this.isAvailable(),
			baseUrl: this.config.baseUrl,
			hasApiKey: !!this.config.apiKey,
			apiKeyPrefix: this.config.apiKey ? this.config.apiKey.substring(0, 10) + '...' : 'none',
			timeout: this.config.timeout,
			isAvailable: this.isAvailable()
		};
	}

	/**
	 * Get MIME type from filename extension
	 */
	private getMimeTypeFromFilename(filename: string): string | null {
		const extension = filename.toLowerCase().split('.').pop();

		const mimeTypeMap: Record<string, string> = {
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			png: 'image/png',
			gif: 'image/gif',
			webp: 'image/webp',
			bmp: 'image/bmp',
			tiff: 'image/tiff',
			tif: 'image/tiff'
		};

		return extension ? mimeTypeMap[extension] || null : null;
	}
}
