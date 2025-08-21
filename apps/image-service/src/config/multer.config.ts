import { registerAs } from '@nestjs/config';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { IMAGE_CONSTANTS } from '../common/constants';
import { FileValidationUtil } from '../common/utils';

export default registerAs('multer', (): MulterOptions => {
	return {
		storage: memoryStorage(), // Store files in memory for processing

		limits: {
			fileSize: parseInt(process.env.MAX_FILE_SIZE || IMAGE_CONSTANTS.MAX_FILE_SIZE.toString(), 10),
			files: parseInt(process.env.MAX_FILES_PER_REQUEST || IMAGE_CONSTANTS.MAX_FILES_PER_REQUEST.toString(), 10),
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
});
