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
import { ApiTags } from '@nestjs/swagger';
import type { Express } from 'express';
import { UploadService } from './upload.service';
import { FileValidator } from './validators/file.validator';
import { ApiKeyGuard } from '../../common/guards';
import { ImageUploadResponseDto, BatchUploadResponseDto, BatchUploadOptionsDto } from '../../common/dto';
import { IMAGE_CONSTANTS } from '../../common/constants';
import { ApiUploadSingle, ApiUploadBatch, ApiUploadStats, ApiUploadLimits, ApiValidateFile } from './upload.swagger';

@ApiTags('upload')
@Controller('upload')
@UseGuards(ApiKeyGuard)
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
	@ApiUploadSingle()
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
	@ApiUploadBatch()
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
	@ApiUploadStats()
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
	@ApiUploadLimits()
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
	@ApiValidateFile()
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
