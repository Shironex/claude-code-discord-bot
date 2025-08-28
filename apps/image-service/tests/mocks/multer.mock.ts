/**
 * Multer mock utilities for file upload testing
 */

import { Express } from 'express';

/**
 * Create a mock Multer file object
 */
export const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => {
	return {
		fieldname: 'image',
		originalname: 'test-image.jpg',
		encoding: '7bit',
		mimetype: 'image/jpeg',
		destination: '/tmp/test-uploads',
		filename: 'test-image-123456.jpg',
		path: '/tmp/test-uploads/test-image-123456.jpg',
		size: 1024 * 100, // 100KB
		stream: {} as any,
		buffer: Buffer.from('fake image data'),
		...overrides,
	};
};

/**
 * Create multiple mock files
 */
export const createMockFiles = (count: number, overrides: Partial<Express.Multer.File> = {}): Express.Multer.File[] => {
	const files: Express.Multer.File[] = [];
	for (let i = 0; i < count; i++) {
		files.push(
			createMockFile({
				originalname: 'test-image-' + (i + 1) + '.jpg',
				filename: 'test-image-' + Date.now() + '-' + (i + 1) + '.jpg',
				...overrides,
			}),
		);
	}
	return files;
};

/**
 * Create mock file with specific MIME type
 */
export const createMockFileWithType = (mimeType: string, extension: string): Express.Multer.File => {
	const filename = 'test-file.' + extension;
	return createMockFile({
		originalname: filename,
		filename: 'test-file-' + Date.now() + '.' + extension,
		mimetype: mimeType,
	});
};

/**
 * Create an invalid file (for testing validation)
 */
export const createInvalidMockFile = (invalidType: 'size' | 'type' | 'name' = 'type'): Express.Multer.File => {
	switch (invalidType) {
		case 'size':
			return createMockFile({
				size: 1024 * 1024 * 20, // 20MB - over typical limit
			});
		case 'type':
			return createMockFile({
				mimetype: 'application/pdf',
				originalname: 'document.pdf',
				filename: 'document.pdf',
			});
		case 'name':
			return createMockFile({
				originalname: '../../../etc/passwd', // Path traversal attempt
				filename: 'passwd',
			});
		default:
			return createMockFile({
				mimetype: 'text/plain',
				originalname: 'invalid.txt',
			});
	}
};

/**
 * Create mock Multer options
 */
export const createMockMulterOptions = () => ({
	dest: '/tmp/test-uploads',
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB
		files: 10,
	},
	fileFilter: jest.fn((req, file, cb) => cb(null, true)),
});

/**
 * Mock file validation result
 */
export const mockFileValidationResult = (isValid: boolean = true) => ({
	isValid,
	errors: isValid ? [] : ['Invalid file type'],
	warnings: [],
	sanitizedName: 'test-image.jpg',
});
