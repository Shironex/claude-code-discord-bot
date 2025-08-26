/**
 * Redis mock utilities for testing
 */

/**
 * Create a mock Redis client
 */
export const createMockRedisClient = () => {
	const mockData = new Map<string, any>();

	return {
		// Basic operations
		get: jest.fn((key: string) => Promise.resolve(mockData.get(key) || null)),
		set: jest.fn((key: string, value: any, ...args: any[]) => {
			mockData.set(key, value);
			return Promise.resolve('OK');
		}),
		del: jest.fn((key: string) => {
			const existed = mockData.has(key);
			mockData.delete(key);
			return Promise.resolve(existed ? 1 : 0);
		}),
		exists: jest.fn((key: string) => Promise.resolve(mockData.has(key) ? 1 : 0)),

		// TTL operations
		expire: jest.fn((key: string, seconds: number) => Promise.resolve(1)),
		ttl: jest.fn((key: string) => Promise.resolve(-1)),
		pexpire: jest.fn((key: string, milliseconds: number) => Promise.resolve(1)),
		pttl: jest.fn((key: string) => Promise.resolve(-1)),

		// Batch operations
		keys: jest.fn((pattern: string) => {
			const keys = Array.from(mockData.keys());
			if (pattern === '*') return Promise.resolve(keys);
			// Simple pattern matching for tests
			const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
			return Promise.resolve(keys.filter((k) => regex.test(k)));
		}),
		scan: jest.fn(() => Promise.resolve(['0', []])),
		mget: jest.fn((...keys: string[]) => Promise.resolve(keys.map((k) => mockData.get(k) || null))),
		mset: jest.fn((keyValues: any) => {
			Object.entries(keyValues).forEach(([k, v]) => mockData.set(k, v));
			return Promise.resolve('OK');
		}),

		// Hash operations
		hget: jest.fn(),
		hset: jest.fn(),
		hdel: jest.fn(),
		hgetall: jest.fn(),

		// List operations
		lpush: jest.fn(),
		rpush: jest.fn(),
		lpop: jest.fn(),
		rpop: jest.fn(),
		lrange: jest.fn(),

		// Set operations
		sadd: jest.fn(),
		srem: jest.fn(),
		smembers: jest.fn(),
		sismember: jest.fn(),

		// Connection management
		ping: jest.fn(() => Promise.resolve('PONG')),
		quit: jest.fn(() => Promise.resolve('OK')),
		disconnect: jest.fn(() => Promise.resolve()),
		connect: jest.fn(() => Promise.resolve()),

		// Event emitters
		on: jest.fn(),
		once: jest.fn(),
		off: jest.fn(),
		emit: jest.fn(),

		// Status
		status: 'ready',

		// Clear mock data (for testing)
		__clearMockData: () => mockData.clear(),
		__getMockData: () => mockData,
	};
};

/**
 * Create a mock Redis module (IoRedis)
 */
export const createMockRedisModule = () => {
	const mockClient = createMockRedisClient();

	const Redis = jest.fn().mockImplementation(() => mockClient) as any;

	// Add static methods
	Redis.Cluster = jest.fn();
	Redis.Command = jest.fn();

	return Redis;
};

/**
 * Mock Redis service
 */
export const createMockRedisService = () => {
	const client = createMockRedisClient();

	return {
		client,
		get: client.get,
		getBuffer: jest.fn().mockResolvedValue(null),
		set: client.set,
		del: client.del,
		exists: client.exists,
		expire: client.expire,
		ttl: client.ttl,
		keys: client.keys,
		ping: client.ping,
		isConnected: jest.fn(() => true),
		onModuleDestroy: jest.fn(),
	};
};

/**
 * Mock cache manager
 */
export const createMockCacheManager = () => {
	const cache = new Map<string, any>();

	return {
		get: jest.fn((key: string) => Promise.resolve(cache.get(key))),
		set: jest.fn((key: string, value: any, ttl?: number) => {
			cache.set(key, value);
			return Promise.resolve();
		}),
		del: jest.fn((key: string) => {
			cache.delete(key);
			return Promise.resolve();
		}),
		reset: jest.fn(() => {
			cache.clear();
			return Promise.resolve();
		}),
		store: {
			client: createMockRedisClient(),
		},
	};
};
