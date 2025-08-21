import { registerAs, ConfigService } from '@nestjs/config';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { IMAGE_CONSTANTS } from '../common/constants';
import { FileValidationUtil } from '../common/utils';

/**
 * Creates Multer configuration with file validation and storage options
 * Supports environment-based configuration for file limits and validation
 */
export const createMulterConfig = (configService: ConfigService): MulterOptions => {
	return {
		storage: memoryStorage(), // Store files in memory for processing

		limits: {
			fileSize: configService.get<number>('imageService.upload.maxFileSize', IMAGE_CONSTANTS.MAX_FILE_SIZE),
			files: configService.get<number>('imageService.upload.maxFiles', IMAGE_CONSTANTS.MAX_FILES_PER_REQUEST),
			fields: 10, // Maximum number of non-file fields
			fieldNameSize: 100, // Maximum field name size
			fieldSize: 1024 * 1024, // Maximum field value size (1MB)
		},

		fileFilter: (_req, file, callback) => {
			// Validate file type
			if (!FileValidationUtil.isAllowedMimeType(file.mimetype)) {
				const error = new Error(`${IMAGE_CONSTANTS.ERRORS.INVALID_FILE_TYPE}: ${file.mimetype}`);
				error.name = 'INVALID_FILE_TYPE';
				return callback(error, false);
			}

			// Validate file extension
			const extension = file.originalname.split('.').pop()?.toLowerCase();

			if (!extension || !FileValidationUtil.isAllowedExtension(`.${extension}`)) {
				const error = new Error(`${IMAGE_CONSTANTS.ERRORS.INVALID_FILE_EXTENSION}: .${extension}`);
				error.name = 'INVALID_FILE_EXTENSION';
				return callback(error, false);
			}

			// Validate filename
			if (!FileValidationUtil.isValidFilename(file.originalname)) {
				const error = new Error('Invalid filename');
				error.name = 'INVALID_FILENAME';
				return callback(error, false);
			}

			callback(null, true);
		},

		// Preserve original filename case and encoding
		preservePath: false,
	};
};

// Export registerAs version for ConfigModule compatibility
export default registerAs('multer', (): MulterOptions => {
	// Create a minimal config for registerAs - this will be overridden by the function version
	return {
		storage: memoryStorage(),
		limits: {
			fileSize: IMAGE_CONSTANTS.MAX_FILE_SIZE,
			files: IMAGE_CONSTANTS.MAX_FILES_PER_REQUEST,
			fields: 10,
			fieldNameSize: 100,
			fieldSize: 1024 * 1024,
		},
		preservePath: false,
	};
});
