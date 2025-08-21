import { Injectable, Logger } from '@nestjs/common';
import { Attachment } from 'discord.js';
import axios from 'axios';
import { ImageServiceClient } from './image-service.client';
import { ImageUploadResponse, BatchUploadResponse, SHARED_IMAGE_CONSTANTS } from '@claude-code/shared-types';

export interface DiscordImageUploadOptions {
	ttl?: number;
	userId?: string;
	generateUrls?: boolean;
}

export interface DiscordImageUploadResult extends ImageUploadResponse {
	originalAttachment: Attachment;
	discordUrl: string;
}

export interface DiscordBatchUploadResult extends BatchUploadResponse {
	results: Array<{
		success: boolean;
		result?: DiscordImageUploadResult;
		error?: string;
		originalAttachment: Attachment;
	}>;
}

@Injectable()
export class ImageUploadService {
	private readonly logger = new Logger(ImageUploadService.name);

	constructor(private readonly imageServiceClient: ImageServiceClient) {}

	/**
	 * Upload a single Discord attachment to the image service
	 */
	async uploadDiscordAttachment(
		attachment: Attachment,
		options: DiscordImageUploadOptions = {}
	): Promise<DiscordImageUploadResult> {
		if (!this.imageServiceClient.isAvailable()) {
			throw new Error('Image service is not available');
		}

		// Validate attachment
		if (!this.isImageAttachment(attachment)) {
			throw new Error(`Attachment is not a supported image type: ${attachment.contentType}`);
		}

		if (attachment.size > SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE) {
			throw new Error(
				`Image too large: ${attachment.size} bytes. Maximum: ${SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE} bytes`
			);
		}

		this.logger.debug(`Uploading Discord attachment: ${attachment.name}`, {
			id: attachment.id,
			size: attachment.size,
			contentType: attachment.contentType,
			url: attachment.url
		});

		try {
			// Download the image from Discord
			const buffer = await this.downloadDiscordImage(attachment.url);

			// Upload to image service
			const uploadResult = await this.imageServiceClient.uploadImage(
				buffer,
				attachment.name || `discord-image-${attachment.id}`,
				{
					ttl: options.ttl,
					userId: options.userId,
					contentType: attachment.contentType || undefined
				}
			);

			const result: DiscordImageUploadResult = {
				...uploadResult,
				originalAttachment: attachment,
				discordUrl: attachment.url
			};

			this.logger.log(`Successfully uploaded Discord attachment: ${attachment.name}`, {
				originalId: attachment.id,
				imageServiceId: uploadResult.id,
				size: uploadResult.size,
				expires: uploadResult.expires
			});

			return result;
		} catch (error) {
			this.logger.error(`Failed to upload Discord attachment: ${attachment.name}`, {
				attachmentId: attachment.id,
				attachmentUrl: attachment.url,
				attachmentSize: attachment.size,
				attachmentType: attachment.contentType,
				error: error.message,
				errorStack: error.stack,
				errorDetails: (error as any).details || 'No additional details',
				cause: (error as any).cause || 'No cause information'
			});
			throw error;
		}
	}

	/**
	 * Upload multiple Discord attachments to the image service
	 */
	async uploadDiscordAttachments(
		attachments: Attachment[],
		options: DiscordImageUploadOptions = {}
	): Promise<DiscordBatchUploadResult> {
		if (!this.imageServiceClient.isAvailable()) {
			throw new Error('Image service is not available');
		}

		if (attachments.length === 0) {
			throw new Error('No attachments provided');
		}

		if (attachments.length > SHARED_IMAGE_CONSTANTS.MAX_BATCH_FILES) {
			throw new Error(
				`Too many attachments: ${attachments.length}. Maximum: ${SHARED_IMAGE_CONSTANTS.MAX_BATCH_FILES}`
			);
		}

		this.logger.debug('Starting batch upload with detailed info:', {
			attachmentCount: attachments.length,
			attachments: attachments.map(att => ({
				id: att.id,
				name: att.name,
				size: att.size,
				contentType: att.contentType,
				url: att.url
			})),
			options
		});

		const results: DiscordBatchUploadResult['results'] = [];
		const validImages: Array<{ buffer: Buffer; filename: string; attachment: Attachment }> = [];

		// Process each attachment
		for (const attachment of attachments) {
			try {
				// Validate attachment
				if (!this.isImageAttachment(attachment)) {
					results.push({
						success: false,
						error: `Not a supported image type: ${attachment.contentType}`,
						originalAttachment: attachment
					});
					continue;
				}

				if (attachment.size > SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE) {
					results.push({
						success: false,
						error: `Image too large: ${attachment.size} bytes`,
						originalAttachment: attachment
					});
					continue;
				}

				// Download image
				const buffer = await this.downloadDiscordImage(attachment.url);
				validImages.push({
					buffer,
					filename: attachment.name || `discord-image-${attachment.id}`,
					attachment
				});
			} catch (error) {
				results.push({
					success: false,
					error: error.message,
					originalAttachment: attachment
				});
			}
		}

		// Upload valid images in batch
		if (validImages.length > 0) {
			try {
				const batchResult = await this.imageServiceClient.uploadBatch(
					validImages.map(({ buffer, filename, attachment }) => ({
						buffer,
						filename,
						contentType: attachment.contentType || undefined
					})),
					{
						ttl: options.ttl,
						userId: options.userId
					}
				);

				// Map batch results back to Discord attachments
				batchResult.images.forEach((uploadResult, index) => {
					const validImage = validImages[index];
					if (validImage) {
						results.push({
							success: true,
							result: {
								...uploadResult,
								originalAttachment: validImage.attachment,
								discordUrl: validImage.attachment.url
							},
							originalAttachment: validImage.attachment
						});
					}
				});

				// Handle batch errors
				batchResult.errors?.forEach(error => {
					const validImage = validImages[error.index];
					if (validImage) {
						results.push({
							success: false,
							error: error.error,
							originalAttachment: validImage.attachment
						});
					}
				});
			} catch (error) {
				this.logger.error('Batch upload failed with details:', {
					error: error.message,
					errorStack: error.stack,
					errorDetails: (error as any).details || 'No additional details',
					cause: (error as any).cause || 'No cause information',
					validImagesCount: validImages.length,
					validImagesSummary: validImages.map(img => ({
						filename: img.filename,
						size: img.buffer.length,
						attachmentId: img.attachment.id
					}))
				});

				// If batch upload fails, mark all valid images as failed
				validImages.forEach(({ attachment }) => {
					results.push({
						success: false,
						error: `Batch upload failed: ${error.message}`,
						originalAttachment: attachment
					});
				});
			}
		}

		const successCount = results.filter(r => r.success).length;
		const totalCount = attachments.length;

		this.logger.log(`Batch upload completed: ${successCount}/${totalCount} successful`, {
			totalCount,
			successCount,
			failedCount: totalCount - successCount
		});

		// Create response in the same format as BatchUploadResponse
		const batchResponse: DiscordBatchUploadResult = {
			images: results.filter(r => r.success).map(r => r.result!),
			totalCount,
			successCount,
			errors: results
				.filter(r => !r.success)
				.map(r => ({
					index: attachments.indexOf(r.originalAttachment),
					error: r.error!,
					filename: r.originalAttachment.name
				})),
			results
		};

		return batchResponse;
	}

	/**
	 * Check if Discord attachment is a supported image
	 */
	private isImageAttachment(attachment: Attachment): boolean {
		if (!attachment.contentType) {
			// Fallback to checking file extension
			const extension = attachment.name?.toLowerCase().split('.').pop();
			return extension ? SHARED_IMAGE_CONSTANTS.SUPPORTED_EXTENSIONS.includes(`.${extension}` as any) : false;
		}

		return SHARED_IMAGE_CONSTANTS.SUPPORTED_MIME_TYPES.includes(attachment.contentType as any);
	}

	/**
	 * Download image from Discord CDN
	 */
	private async downloadDiscordImage(url: string): Promise<Buffer> {
		try {
			const response = await axios.get(url, {
				responseType: 'arraybuffer',
				timeout: 30000,
				headers: {
					'User-Agent': 'Claude Code Discord Bot/1.0'
				}
			});

			return Buffer.from(response.data);
		} catch (error) {
			this.logger.error(`Failed to download image from Discord: ${url}`, error);
			throw new Error(`Failed to download image: ${error.message}`);
		}
	}

	/**
	 * Get supported image formats info
	 */
	getSupportedFormats(): {
		mimeTypes: readonly string[];
		extensions: readonly string[];
		maxSize: number;
		maxBatchSize: number;
	} {
		return {
			mimeTypes: SHARED_IMAGE_CONSTANTS.SUPPORTED_MIME_TYPES,
			extensions: SHARED_IMAGE_CONSTANTS.SUPPORTED_EXTENSIONS,
			maxSize: SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE,
			maxBatchSize: SHARED_IMAGE_CONSTANTS.MAX_BATCH_FILES
		};
	}

	/**
	 * Validate Discord attachments before upload
	 */
	validateAttachments(attachments: Attachment[]): {
		valid: Attachment[];
		invalid: Array<{ attachment: Attachment; reason: string }>;
	} {
		const valid: Attachment[] = [];
		const invalid: Array<{ attachment: Attachment; reason: string }> = [];

		attachments.forEach(attachment => {
			if (!this.isImageAttachment(attachment)) {
				invalid.push({
					attachment,
					reason: `Unsupported file type: ${attachment.contentType || 'unknown'}`
				});
			} else if (attachment.size > SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE) {
				invalid.push({
					attachment,
					reason: `File too large: ${attachment.size} bytes (max: ${SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE})`
				});
			} else {
				valid.push(attachment);
			}
		});

		return { valid, invalid };
	}
}
