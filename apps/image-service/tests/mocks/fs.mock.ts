/**
 * File system mock utilities for testing
 */

import * as path from 'path';

interface MockFile {
	path: string;
	content: Buffer | string;
	stats: {
		size: number;
		isFile: boolean;
		isDirectory: boolean;
		mtime: Date;
		atime: Date;
		ctime: Date;
	};
}

/**
 * Create a mock file system
 */
export const createMockFileSystem = () => {
	const files = new Map<string, MockFile>();

	return {
		files,

		// Add a file to the mock filesystem
		addFile: (filePath: string, content: Buffer | string = '') => {
			files.set(filePath, {
				path: filePath,
				content,
				stats: {
					size: Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content),
					isFile: true,
					isDirectory: false,
					mtime: new Date(),
					atime: new Date(),
					ctime: new Date(),
				},
			});
		},

		// Add a directory to the mock filesystem
		addDirectory: (dirPath: string) => {
			files.set(dirPath, {
				path: dirPath,
				content: '',
				stats: {
					size: 0,
					isFile: false,
					isDirectory: true,
					mtime: new Date(),
					atime: new Date(),
					ctime: new Date(),
				},
			});
		},

		// Clear all files
		clear: () => files.clear(),
	};
};

/**
 * Create mock fs promises
 */
export const createMockFsPromises = (mockFs = createMockFileSystem()) => {
	return {
		readFile: jest.fn(async (filePath: string) => {
			const file = mockFs.files.get(filePath);
			if (!file) {
				throw new Error('ENOENT: no such file or directory');
			}
			return file.content;
		}),

		writeFile: jest.fn(async (filePath: string, content: Buffer | string) => {
			mockFs.addFile(filePath, content);
			return undefined;
		}),

		unlink: jest.fn(async (filePath: string) => {
			if (!mockFs.files.has(filePath)) {
				throw new Error('ENOENT: no such file or directory');
			}
			mockFs.files.delete(filePath);
			return undefined;
		}),

		stat: jest.fn(async (filePath: string) => {
			const file = mockFs.files.get(filePath);
			if (!file) {
				throw new Error('ENOENT: no such file or directory');
			}
			return {
				...file.stats,
				isFile: () => file.stats.isFile,
				isDirectory: () => file.stats.isDirectory,
			};
		}),

		access: jest.fn(async (filePath: string) => {
			if (!mockFs.files.has(filePath)) {
				throw new Error('ENOENT: no such file or directory');
			}
			return undefined;
		}),

		mkdir: jest.fn(async (dirPath: string, options?: any) => {
			mockFs.addDirectory(dirPath);
			return undefined;
		}),

		rmdir: jest.fn(async (dirPath: string) => {
			const dir = mockFs.files.get(dirPath);
			if (!dir || !dir.stats.isDirectory) {
				throw new Error('ENOTDIR: not a directory');
			}
			mockFs.files.delete(dirPath);
			return undefined;
		}),

		readdir: jest.fn(async (dirPath: string) => {
			const files = Array.from(mockFs.files.keys())
				.filter((f) => path.dirname(f) === dirPath)
				.map((f) => path.basename(f));
			return files;
		}),

		rename: jest.fn(async (oldPath: string, newPath: string) => {
			const file = mockFs.files.get(oldPath);
			if (!file) {
				throw new Error('ENOENT: no such file or directory');
			}
			mockFs.files.delete(oldPath);
			file.path = newPath;
			mockFs.files.set(newPath, file);
			return undefined;
		}),

		copyFile: jest.fn(async (src: string, dest: string) => {
			const file = mockFs.files.get(src);
			if (!file) {
				throw new Error('ENOENT: no such file or directory');
			}
			mockFs.addFile(dest, file.content);
			return undefined;
		}),
	};
};

/**
 * Create mock fs module
 */
export const createMockFs = (mockFs = createMockFileSystem()) => {
	const promises = createMockFsPromises(mockFs);

	return {
		promises,

		existsSync: jest.fn((filePath: string) => mockFs.files.has(filePath)),

		readFileSync: jest.fn((filePath: string) => {
			const file = mockFs.files.get(filePath);
			if (!file) {
				throw new Error('ENOENT: no such file or directory');
			}
			return file.content;
		}),

		writeFileSync: jest.fn((filePath: string, content: Buffer | string) => {
			mockFs.addFile(filePath, content);
		}),

		unlinkSync: jest.fn((filePath: string) => {
			if (!mockFs.files.has(filePath)) {
				throw new Error('ENOENT: no such file or directory');
			}
			mockFs.files.delete(filePath);
		}),

		statSync: jest.fn((filePath: string) => {
			const file = mockFs.files.get(filePath);
			if (!file) {
				throw new Error('ENOENT: no such file or directory');
			}
			return {
				...file.stats,
				isFile: () => file.stats.isFile,
				isDirectory: () => file.stats.isDirectory,
			};
		}),

		mkdirSync: jest.fn((dirPath: string, options?: any) => {
			mockFs.addDirectory(dirPath);
		}),

		rmdirSync: jest.fn((dirPath: string) => {
			const dir = mockFs.files.get(dirPath);
			if (!dir || !dir.stats.isDirectory) {
				throw new Error('ENOTDIR: not a directory');
			}
			mockFs.files.delete(dirPath);
		}),

		readdirSync: jest.fn((dirPath: string) => {
			const files = Array.from(mockFs.files.keys())
				.filter((f) => path.dirname(f) === dirPath)
				.map((f) => path.basename(f));
			return files;
		}),

		createReadStream: jest.fn(),
		createWriteStream: jest.fn(),

		// Utility to access mock filesystem
		__getMockFs: () => mockFs,
	};
};

/**
 * Mock file stats
 */
export const createMockStats = (overrides: any = {}) => ({
	dev: 16777220,
	mode: 33188,
	nlink: 1,
	uid: 501,
	gid: 20,
	rdev: 0,
	blksize: 4096,
	ino: 8675309,
	size: 1024,
	blocks: 8,
	atimeMs: 1609459200000,
	mtimeMs: 1609459200000,
	ctimeMs: 1609459200000,
	birthtimeMs: 1609459200000,
	atime: new Date('2021-01-01'),
	mtime: new Date('2021-01-01'),
	ctime: new Date('2021-01-01'),
	birthtime: new Date('2021-01-01'),
	isFile: () => true,
	isDirectory: () => false,
	isBlockDevice: () => false,
	isCharacterDevice: () => false,
	isSymbolicLink: () => false,
	isFIFO: () => false,
	isSocket: () => false,
	...overrides,
});
