/**
 * NestJS mock utilities for testing
 */

import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

/**
 * Create a mock ConfigService with predefined values
 */
export const createMockConfigService = (configValues: Record<string, any> = {}): Partial<ConfigService> => {
	const defaultConfig = {
		'imageService.upload.path': '/tmp/test-uploads',
		'imageService.upload.maxFileSize': 10485760,
		'imageService.upload.defaultTTL': 3600,
		'imageService.upload.allowedMimeTypes': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
		'imageService.auth.discordBotApiKey': 'test-discord-key',
		'imageService.auth.claudeCodeApiKey': 'test-claude-key',
		'imageService.auth.hmacSecret': 'test-hmac-secret',
		'imageService.auth.requireHmac': false,
		'imageService.redis.host': 'localhost',
		'imageService.redis.port': 6379,
		'imageService.redis.password': '',
		'imageService.redis.db': 1,
		'imageService.cleanup.interval': 300,
		...configValues,
	};

	return {
		get: jest.fn((key: string, defaultValue?: any) => {
			// First try direct key access (for dot-notation keys)
			if (defaultConfig.hasOwnProperty(key)) {
				return defaultConfig[key];
			}

			// Support nested path access
			const keys = key.split('.');
			let value: any = defaultConfig;

			for (const k of keys) {
				value = value?.[k];
				if (value === undefined) {
					return defaultValue;
				}
			}

			return value !== undefined ? value : defaultValue;
		}),
		getOrThrow: jest.fn((key: string) => {
			const value = defaultConfig[key];
			if (value === undefined) {
				throw new Error(`Configuration key "${key}" is not defined`);
			}
			return value;
		}),
	};
};

/**
 * Create a mock Logger
 */
export const createMockLogger = (): jest.Mocked<Logger> => {
	return {
		log: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn(),
		verbose: jest.fn(),
		setLogLevels: jest.fn(),
		localInstance: jest.fn(),
		fatal: jest.fn(),
	} as any;
};

/**
 * Create a mock repository
 */
export const createMockRepository = <T = any>() => ({
	find: jest.fn(),
	findOne: jest.fn(),
	findOneBy: jest.fn(),
	save: jest.fn(),
	remove: jest.fn(),
	create: jest.fn(),
	update: jest.fn(),
	delete: jest.fn(),
	count: jest.fn(),
	query: jest.fn(),
});

/**
 * Create a mock HTTP service
 */
export const createMockHttpService = () => ({
	get: jest.fn(),
	post: jest.fn(),
	put: jest.fn(),
	patch: jest.fn(),
	delete: jest.fn(),
	head: jest.fn(),
	request: jest.fn(),
	axiosRef: {
		defaults: {
			headers: {
				common: {},
			},
		},
	},
});

/**
 * Create mock ExecutionContext for guards
 */
export const createMockExecutionContext = (request: any = {}) => ({
	switchToHttp: jest.fn().mockReturnValue({
		getRequest: jest.fn().mockReturnValue({
			headers: {},
			body: {},
			query: {},
			params: {},
			...request,
		}),
		getResponse: jest.fn().mockReturnValue({
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		}),
	}),
	getClass: jest.fn(),
	getHandler: jest.fn(),
	getArgs: jest.fn(),
	getArgByIndex: jest.fn(),
	switchToRpc: jest.fn(),
	switchToWs: jest.fn(),
	getType: jest.fn(),
});
