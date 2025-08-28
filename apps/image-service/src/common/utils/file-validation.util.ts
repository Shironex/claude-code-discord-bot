import { IMAGE_CONSTANTS, AllowedMimeType, AllowedExtension } from '../constants';
import { FileValidationResult } from '../interfaces';
import * as path from 'path';

/**
 * Utility class for file validation
 */
export class FileValidationUtil {
	/**
	 * Validate a single file
	 * @param file Express.Multer.File object
	 * @returns FileValidationResult
	 */
	static validateFile(file: Express.Multer.File): FileValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Check if file exists
		if (!file) {
			errors.push('No file provided');
			return { isValid: false, errors, warnings };
		}

		// Validate file size
		if (file.size < IMAGE_CONSTANTS.MIN_FILE_SIZE) {
			errors.push(IMAGE_CONSTANTS.ERRORS.FILE_TOO_SMALL);
		}

		if (file.size > IMAGE_CONSTANTS.MAX_FILE_SIZE) {
			errors.push(IMAGE_CONSTANTS.ERRORS.FILE_TOO_LARGE);
		}

		// Validate MIME type
		if (!this.isAllowedMimeType(file.mimetype)) {
			errors.push(`${IMAGE_CONSTANTS.ERRORS.INVALID_FILE_TYPE}: ${file.mimetype}`);
		}

		// Validate file extension
		const extension = path.extname(file.originalname).toLowerCase();
		if (!this.isAllowedExtension(extension)) {
			errors.push(`${IMAGE_CONSTANTS.ERRORS.INVALID_FILE_EXTENSION}: ${extension}`);
		}

		// Check for MIME type and extension mismatch
		if (!this.mimeTypeMatchesExtension(file.mimetype, extension)) {
			warnings.push(`MIME type ${file.mimetype} may not match extension ${extension}`);
		}

		// Validate filename
		if (!this.isValidFilename(file.originalname)) {
			warnings.push('Filename contains potentially unsafe characters');
		}

		const metadata = {
			size: file.size,
			mimeType: file.mimetype,
			extension,
		};

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			metadata,
		};
	}

	/**
	 * Validate multiple files for batch upload
	 * @param files Array of Express.Multer.File objects
	 * @returns FileValidationResult
	 */
	static validateFiles(files: Express.Multer.File[]): FileValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!files || files.length === 0) {
			errors.push('No files provided');
			return { isValid: false, errors, warnings };
		}

		// Check file count
		if (files.length > IMAGE_CONSTANTS.MAX_FILES_PER_REQUEST) {
			errors.push(`${IMAGE_CONSTANTS.ERRORS.TOO_MANY_FILES}. Maximum: ${IMAGE_CONSTANTS.MAX_FILES_PER_REQUEST}`);
		}

		// Check total size
		const totalSize = files.reduce((sum, file) => sum + file.size, 0);
		if (totalSize > IMAGE_CONSTANTS.MAX_TOTAL_SIZE_PER_REQUEST) {
			errors.push(IMAGE_CONSTANTS.ERRORS.TOTAL_SIZE_EXCEEDED);
		}

		// Validate each file
		const fileErrors: string[] = [];
		files.forEach((file, index) => {
			const result = this.validateFile(file);
			if (!result.isValid) {
				fileErrors.push(`File ${index + 1} (${file.originalname}): ${result.errors.join(', ')}`);
			}
			warnings.push(...result.warnings.map((w) => `File ${index + 1}: ${w}`));
		});

		errors.push(...fileErrors);

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Check if MIME type is allowed
	 * @param mimeType MIME type to check
	 * @returns boolean
	 */
	static isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
		return IMAGE_CONSTANTS.ALLOWED_MIMETYPES.includes(mimeType as AllowedMimeType);
	}

	/**
	 * Check if file extension is allowed
	 * @param extension File extension to check
	 * @returns boolean
	 */
	static isAllowedExtension(extension: string): extension is AllowedExtension {
		return IMAGE_CONSTANTS.ALLOWED_EXTENSIONS.includes(extension.toLowerCase() as AllowedExtension);
	}

	/**
	 * Check if MIME type matches file extension
	 * @param mimeType MIME type
	 * @param extension File extension
	 * @returns boolean
	 */
	static mimeTypeMatchesExtension(mimeType: string, extension: string): boolean {
		const mimeToExtension: Record<string, string[]> = {
			'image/jpeg': ['.jpg', '.jpeg'],
			'image/png': ['.png'],
			'image/gif': ['.gif'],
			'image/webp': ['.webp'],
			'image/bmp': ['.bmp'],
			'image/tiff': ['.tiff', '.tif'],
		};

		const expectedExtensions = mimeToExtension[mimeType];
		return expectedExtensions ? expectedExtensions.includes(extension.toLowerCase()) : false;
	}

	/**
	 * Validate filename for security
	 * @param filename Original filename
	 * @returns boolean
	 */
	static isValidFilename(filename: string): boolean {
		// Check for null bytes and control characters
		// eslint-disable-next-line no-control-regex
		if (/[\x00-\x1f\x7f-\x9f]/.test(filename)) {
			return false;
		}

		// Check for path traversal attempts
		if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
			return false;
		}

		// Check for reserved names (Windows)
		const reservedNames = [
			'CON',
			'PRN',
			'AUX',
			'NUL',
			'COM1',
			'COM2',
			'COM3',
			'COM4',
			'COM5',
			'COM6',
			'COM7',
			'COM8',
			'COM9',
			'LPT1',
			'LPT2',
			'LPT3',
			'LPT4',
			'LPT5',
			'LPT6',
			'LPT7',
			'LPT8',
			'LPT9',
		];
		const nameWithoutExt = path.parse(filename).name.toUpperCase();
		if (reservedNames.includes(nameWithoutExt)) {
			return false;
		}

		// Check filename length
		if (filename.length > 255) {
			return false;
		}

		return true;
	}

	/**
	 * Sanitize filename for safe storage
	 * @param filename Original filename
	 * @returns Sanitized filename
	 */
	static sanitizeFilename(filename: string): string {
		// Remove or replace dangerous characters
		let sanitized = filename
			// eslint-disable-next-line no-control-regex
			.replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
			.replace(/[<>:"/\\|?*]/g, '_') // Replace filesystem-unsafe characters
			.replace(/\.\./g, '_') // Replace path traversal attempts
			.trim();

		// Ensure filename doesn't start with a dot (hidden file)
		if (sanitized.startsWith('.')) {
			sanitized = '_' + sanitized.substring(1);
		}

		// Limit length
		if (sanitized.length > 100) {
			const ext = path.extname(sanitized);
			const name = path.parse(sanitized).name.substring(0, 100 - ext.length);
			sanitized = name + ext;
		}

		return sanitized || 'unnamed_file';
	}
}
