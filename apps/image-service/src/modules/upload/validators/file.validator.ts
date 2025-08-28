import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileValidationUtil } from '../../../common/utils';
import { IMAGE_CONSTANTS } from '../../../common/constants';

@Injectable()
export class FileValidator {
	constructor(private readonly configService: ConfigService) {}

	/**
	 * Validate a single uploaded file
	 */
	validateSingleFile(file: Express.Multer.File): void {
		if (!file) {
			throw new BadRequestException('No file provided');
		}

		const result = FileValidationUtil.validateFile(file);
		if (!result.isValid) {
			throw new BadRequestException(`File validation failed: ${result.errors.join(', ')}`);
		}

		// Additional server-side validations
		this.validateFileSize(file);
		this.validateMimeType(file);
		this.validateFileContent(file);
	}

	/**
	 * Validate multiple uploaded files
	 */
	validateMultipleFiles(files: Express.Multer.File[]): void {
		if (!files || files.length === 0) {
			throw new BadRequestException('No files provided');
		}

		// Check file count limit
		const maxFiles = this.configService.get<number>('imageService.upload.maxFiles', IMAGE_CONSTANTS.MAX_FILES_PER_REQUEST);

		if (files.length > maxFiles) {
			throw new BadRequestException(`Too many files. Maximum ${maxFiles} files allowed per request.`);
		}

		// Check total size
		const totalSize = files.reduce((sum, file) => sum + file.size, 0);
		const maxTotalSize = this.configService.get<number>(
			'imageService.rateLimit.maxTotalSizePerRequest',
			IMAGE_CONSTANTS.MAX_TOTAL_SIZE_PER_REQUEST,
		);

		if (totalSize > maxTotalSize) {
			const maxSizeMB = Math.round(maxTotalSize / 1024 / 1024);
			const actualSizeMB = Math.round((totalSize / 1024 / 1024) * 100) / 100;
			throw new BadRequestException(`Total file size ${actualSizeMB}MB exceeds limit of ${maxSizeMB}MB.`);
		}

		// Validate each file individually
		files.forEach((file, index) => {
			try {
				this.validateSingleFile(file);
			} catch (error) {
				throw new BadRequestException(`File ${index + 1} (${file.originalname}): ${error.message}`);
			}
		});
	}

	/**
	 * Validate file size
	 */
	private validateFileSize(file: Express.Multer.File): void {
		const maxSize = this.configService.get<number>('imageService.upload.maxFileSize', IMAGE_CONSTANTS.MAX_FILE_SIZE);

		if (file.size > maxSize) {
			const maxSizeMB = Math.round(maxSize / 1024 / 1024);
			const actualSizeMB = Math.round((file.size / 1024 / 1024) * 100) / 100;
			throw new BadRequestException(`File size ${actualSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB.`);
		}

		if (file.size < IMAGE_CONSTANTS.MIN_FILE_SIZE) {
			throw new BadRequestException('File is too small to be a valid image.');
		}
	}

	/**
	 * Validate MIME type
	 */
	private validateMimeType(file: Express.Multer.File): void {
		const allowedTypes = this.configService.get<string[]>('imageService.upload.allowedMimeTypes', [
			...IMAGE_CONSTANTS.ALLOWED_MIMETYPES,
		]);

		if (!allowedTypes.includes(file.mimetype)) {
			throw new BadRequestException(`File type ${file.mimetype} is not allowed. Supported types: ${allowedTypes.join(', ')}.`);
		}
	}

	/**
	 * Validate file content (basic magic number checking)
	 */
	private validateFileContent(file: Express.Multer.File): void {
		if (!file.buffer || file.buffer.length < 4) {
			throw new BadRequestException('File appears to be empty or corrupted.');
		}

		// Check magic numbers for common image formats
		const magicNumbers = this.getImageMagicNumbers(file.buffer);
		const detectedType = this.detectFileType(magicNumbers);

		if (!detectedType) {
			throw new BadRequestException('File does not appear to be a valid image.');
		}

		// Check if detected type matches declared MIME type
		const expectedTypes = this.getMimeTypesForDetectedType(detectedType);
		if (!expectedTypes.includes(file.mimetype)) {
			throw new BadRequestException(`File content (${detectedType}) does not match declared type (${file.mimetype}).`);
		}
	}

	/**
	 * Extract magic numbers from file buffer
	 */
	private getImageMagicNumbers(buffer: Buffer): string {
		// Get first 8 bytes as hex string
		return buffer.subarray(0, 8).toString('hex').toLowerCase();
	}

	/**
	 * Detect file type from magic numbers
	 */
	private detectFileType(magicNumbers: string): string | null {
		// Common image magic numbers
		if (magicNumbers.startsWith('ffd8ff')) return 'jpeg';
		if (magicNumbers.startsWith('89504e47')) return 'png';
		if (magicNumbers.startsWith('47494638')) return 'gif';
		if (magicNumbers.startsWith('52494646') && magicNumbers.includes('57454250')) return 'webp';
		if (magicNumbers.startsWith('424d')) return 'bmp';
		if (magicNumbers.startsWith('49492a00') || magicNumbers.startsWith('4d4d002a')) return 'tiff';

		return null;
	}

	/**
	 * Get possible MIME types for detected file type
	 */
	private getMimeTypesForDetectedType(detectedType: string): string[] {
		const typeMap: Record<string, string[]> = {
			jpeg: ['image/jpeg', 'image/jpg'],
			png: ['image/png'],
			gif: ['image/gif'],
			webp: ['image/webp'],
			bmp: ['image/bmp'],
			tiff: ['image/tiff'],
		};

		return typeMap[detectedType] || [];
	}

	/**
	 * Check if file extension matches content
	 */
	private validateFileExtension(file: Express.Multer.File): void {
		const filename = file.originalname.toLowerCase();
		const extension = filename.split('.').pop();

		if (!extension) {
			throw new BadRequestException('File must have a valid extension.');
		}

		const allowedExtensions = IMAGE_CONSTANTS.ALLOWED_EXTENSIONS.map((ext) => ext.replace('.', ''));

		if (!allowedExtensions.includes(extension)) {
			throw new BadRequestException(
				`File extension .${extension} is not allowed. Supported extensions: ${IMAGE_CONSTANTS.ALLOWED_EXTENSIONS.join(', ')}.`,
			);
		}
	}

	/**
	 * Perform comprehensive file validation
	 */
	validateComprehensive(file: Express.Multer.File): {
		isValid: boolean;
		warnings: string[];
		metadata: {
			detectedType: string | null;
			declaredType: string;
			size: number;
			filename: string;
		};
	} {
		const warnings: string[] = [];
		let detectedType: string | null = null;

		try {
			// Basic validations
			this.validateSingleFile(file);
			this.validateFileExtension(file);

			// Content validation
			const magicNumbers = this.getImageMagicNumbers(file.buffer);
			detectedType = this.detectFileType(magicNumbers);

			// Check for potential issues
			if (file.size > IMAGE_CONSTANTS.MAX_FILE_SIZE * 0.8) {
				warnings.push('File size is close to the maximum limit');
			}

			if (file.originalname.length > 100) {
				warnings.push('Filename is very long and will be truncated');
			}

			return {
				isValid: true,
				warnings,
				metadata: {
					detectedType,
					declaredType: file.mimetype,
					size: file.size,
					filename: file.originalname,
				},
			};
		} catch (error) {
			return {
				isValid: false,
				warnings: [error.message],
				metadata: {
					detectedType,
					declaredType: file.mimetype,
					size: file.size,
					filename: file.originalname,
				},
			};
		}
	}
}
