import {
	Controller,
	Post,
	Get,
	UploadedFile,
	UploadedFiles,
	UseInterceptors,
	UseGuards,
	Body,
	BadRequestException,
	Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiSecurity, ApiQuery, ApiBody } from '@nestjs/swagger';
import type { Express } from 'express';
import { UploadService } from './upload.service';
import { FileValidator } from './validators/file.validator';
import { ApiKeyGuard } from '../../common/guards';
import { ImageUploadResponseDto, BatchUploadResponseDto, BatchUploadOptionsDto } from '../../common/dto';
import { IMAGE_CONSTANTS } from '../../common/constants';

@ApiTags('upload')
@Controller('upload')
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
export class UploadController {
	constructor(
		private readonly uploadService: UploadService,
		private readonly fileValidator: FileValidator,
		private readonly configService: ConfigService,
	) {}

	/**
	 * Upload a single image
	 */
	@Post()
	@UseInterceptors(FileInterceptor('image'))
	@ApiOperation({
		summary: 'Upload a single image',
		description: 'Upload a single image file. The image will be stored temporarily with configurable TTL.',
	})
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		description: 'Image file to upload',
		schema: {
			type: 'object',
			properties: {
				image: {
					type: 'string',
					format: 'binary',
					description: 'Image file (JPEG, PNG, GIF, WebP, BMP, TIFF)',
				},
			},
			required: ['image'],
		},
	})
	@ApiResponse({
		status: 201,
		description: 'Image uploaded successfully',
		type: ImageUploadResponseDto,
	})
	@ApiResponse({
		status: 400,
		description: 'Invalid file or validation error',
	})
	@ApiQuery({
		name: 'ttl',
		required: false,
		type: Number,
		description: 'Time to live in seconds (default: 1800)',
		example: 3600,
	})
	@ApiQuery({
		name: 'userId',
		required: false,
		type: String,
		description: 'User identifier for tracking',
		example: 'user_123',
	})
	async uploadSingle(
		@UploadedFile() file: Express.Multer.File,
		@Query('ttl') ttl?: string,
		@Query('userId') userId?: string,
	): Promise<ImageUploadResponseDto> {
		// Validate file
		if (!file) {
			throw new BadRequestException('No file provided');
		}

		this.fileValidator.validateSingleFile(file);

		// Parse TTL
		const parsedTtl = ttl ? parseInt(ttl, 10) : undefined;
		if (ttl && isNaN(parsedTtl!)) {
			throw new BadRequestException('Invalid TTL value');
		}

		// Check upload limits
		const limitsCheck = this.uploadService.checkUploadLimits(userId, 1, file.size);
		if (!limitsCheck.allowed) {
			throw new BadRequestException(limitsCheck.reason);
		}

		return await this.uploadService.uploadSingle(file, {
			ttl: parsedTtl,
			userId,
		});
	}

	/**
	 * Upload multiple images in batch
	 */
	@Post('batch')
	@UseInterceptors(
		FilesInterceptor(
			'images',
			IMAGE_CONSTANTS.MAX_FILES_PER_REQUEST, // Use config constant instead of hardcoded value
		),
	)
	@ApiOperation({
		summary: 'Upload multiple images',
		description: 'Upload multiple image files in a single request. All images will have the same TTL.',
	})
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		description: 'Multiple image files to upload',
		schema: {
			type: 'object',
			properties: {
				images: {
					type: 'array',
					items: {
						type: 'string',
						format: 'binary',
					},
					description: `Array of image files (max ${IMAGE_CONSTANTS.MAX_FILES_PER_REQUEST} files)`,
				},
				ttl: {
					type: 'number',
					description: 'Time to live in seconds for all images',
					example: 3600,
				},
				userId: {
					type: 'string',
					description: 'User identifier for tracking',
					example: 'user_123',
				},
			},
			required: ['images'],
		},
	})
	@ApiResponse({
		status: 201,
		description: 'Batch upload completed',
		type: BatchUploadResponseDto,
	})
	@ApiResponse({
		status: 400,
		description: 'Invalid files or validation error',
	})
	async uploadBatch(
		@UploadedFiles() files: Express.Multer.File[],
		@Body() options?: BatchUploadOptionsDto,
	): Promise<BatchUploadResponseDto> {
		// Validate files
		if (!files || files.length === 0) {
			throw new BadRequestException('No files provided');
		}

		this.fileValidator.validateMultipleFiles(files);

		// Check upload limits
		const totalSize = files.reduce((sum, file) => sum + file.size, 0);
		const limitsCheck = this.uploadService.checkUploadLimits(options?.userId, files.length, totalSize);
		if (!limitsCheck.allowed) {
			throw new BadRequestException(limitsCheck.reason);
		}

		return await this.uploadService.uploadBatch(files, options);
	}

	/**
	 * Get upload statistics and limits
	 */
	@Get('stats')
	@ApiOperation({
		summary: 'Get upload statistics',
		description: 'Retrieve upload statistics and current service limits.',
	})
	@ApiResponse({
		status: 200,
		description: 'Upload statistics',
		schema: {
			type: 'object',
			properties: {
				totalUploads: { type: 'number', example: 1234 },
				totalSize: { type: 'number', example: 52428800 },
				averageFileSize: { type: 'number', example: 349525 },
				supportedFormats: {
					type: 'array',
					items: { type: 'string' },
					example: ['image/jpeg', 'image/png', 'image/gif'],
				},
				limits: {
					type: 'object',
					properties: {
						maxFileSize: { type: 'number', example: 10485760 },
						maxFiles: { type: 'number', example: 10 },
						maxTotalSize: { type: 'number', example: 52428800 },
						maxFilesPerHour: { type: 'number', example: 50 },
					},
				},
			},
		},
	})
	async getUploadStats(): Promise<{
		totalUploads: number;
		totalSize: number;
		averageFileSize: number;
		supportedFormats: string[];
		limits: {
			maxFileSize: number;
			maxFiles: number;
			maxTotalSize: number;
			maxFilesPerHour: number;
		};
	}> {
		return await this.uploadService.getUploadStats();
	}

	/**
	 * Get upload limits and configuration
	 */
	@Get('limits')
	@ApiOperation({
		summary: 'Get upload limits',
		description: 'Get current upload limits and file size restrictions.',
	})
	@ApiResponse({
		status: 200,
		description: 'Upload limits',
		schema: {
			type: 'object',
			properties: {
				maxFileSize: { type: 'number', example: 10485760 },
				maxFiles: { type: 'number', example: 10 },
				maxTotalSize: { type: 'number', example: 52428800 },
				maxFilesPerHour: { type: 'number', example: 50 },
				supportedFormats: {
					type: 'array',
					items: { type: 'string' },
					example: ['image/jpeg', 'image/png'],
				},
				supportedExtensions: {
					type: 'array',
					items: { type: 'string' },
					example: ['.jpg', '.png'],
				},
				ttlLimits: {
					type: 'object',
					properties: {
						default: { type: 'number', example: 1800 },
						min: { type: 'number', example: 300 },
						max: { type: 'number', example: 7200 },
					},
				},
			},
		},
	})
	getUploadLimits(): {
		maxFileSize: number;
		maxFiles: number;
		maxTotalSize: number;
		maxFilesPerHour: number;
		supportedFormats: string[];
		supportedExtensions: string[];
		ttlLimits: {
			default: number;
			min: number;
			max: number;
		};
	} {
		return {
			maxFileSize: this.configService.get<number>('imageService.upload.maxFileSize', IMAGE_CONSTANTS.MAX_FILE_SIZE),
			maxFiles: this.configService.get<number>('imageService.upload.maxFiles', IMAGE_CONSTANTS.MAX_FILES_PER_REQUEST),
			maxTotalSize: this.configService.get<number>(
				'imageService.rateLimit.maxTotalSizePerRequest',
				IMAGE_CONSTANTS.MAX_TOTAL_SIZE_PER_REQUEST,
			),
			maxFilesPerHour: this.configService.get<number>(
				'imageService.rateLimit.maxFilesPerHour',
				IMAGE_CONSTANTS.MAX_FILES_PER_USER_PER_HOUR,
			),
			supportedFormats: [...IMAGE_CONSTANTS.ALLOWED_MIMETYPES],
			supportedExtensions: [...IMAGE_CONSTANTS.ALLOWED_EXTENSIONS],
			ttlLimits: {
				default: this.configService.get<number>('imageService.upload.defaultTtl', IMAGE_CONSTANTS.DEFAULT_TTL_SECONDS),
				min: this.configService.get<number>('imageService.upload.minTtl', IMAGE_CONSTANTS.MIN_TTL_SECONDS),
				max: this.configService.get<number>('imageService.upload.maxTtl', IMAGE_CONSTANTS.MAX_TTL_SECONDS),
			},
		};
	}

	/**
	 * Validate file without uploading (test endpoint)
	 */
	@Post('validate')
	@UseInterceptors(FileInterceptor('image'))
	@ApiOperation({
		summary: 'Validate file without uploading',
		description: 'Test endpoint to validate a file without actually uploading it.',
	})
	@ApiConsumes('multipart/form-data')
	@ApiResponse({
		status: 200,
		description: 'File validation result',
		schema: {
			type: 'object',
			properties: {
				isValid: { type: 'boolean' },
				warnings: { type: 'array', items: { type: 'string' } },
				metadata: {
					type: 'object',
					properties: {
						detectedType: { type: 'string', nullable: true },
						declaredType: { type: 'string' },
						size: { type: 'number' },
						filename: { type: 'string' },
					},
				},
			},
		},
	})
	validateFile(@UploadedFile() file: Express.Multer.File): {
		isValid: boolean;
		warnings: string[];
		metadata: {
			detectedType: string | null;
			declaredType: string;
			size: number;
			filename: string;
		};
	} {
		if (!file) {
			throw new BadRequestException('No file provided');
		}

		return this.fileValidator.validateComprehensive(file);
	}
}
