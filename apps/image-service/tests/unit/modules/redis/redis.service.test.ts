/**
 * Redis Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { RedisService } from '../../../../src/modules/redis/redis.service';
import { createMockConfigService } from '../../../mocks';

// Mock ioredis
const mockRedisClient = {
  status: 'ready',
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  getBuffer: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(0),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(0),
  ttl: jest.fn().mockResolvedValue(-1),
  keys: jest.fn().mockResolvedValue([]),
  scan: jest.fn().mockResolvedValue(['0', []]),
  incr: jest.fn().mockResolvedValue(1),
  incrby: jest.fn().mockResolvedValue(1),
  hset: jest.fn().mockResolvedValue(1),
  hget: jest.fn().mockResolvedValue(null),
  hgetall: jest.fn().mockResolvedValue({}),
  hdel: jest.fn().mockResolvedValue(0),
  disconnect: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  once: jest.fn(),
  removeAllListeners: jest.fn(),
  _eventHandlers: {} as Record<string, Function[]>,
};

// Mock the event handlers to simulate proper connection state
mockRedisClient.on.mockImplementation((event: string, handler: Function) => {
  if (!mockRedisClient._eventHandlers[event]) {
    mockRedisClient._eventHandlers[event] = [];
  }
  mockRedisClient._eventHandlers[event].push(handler);
  return mockRedisClient;
});

mockRedisClient.once.mockImplementation((event: string, handler: Function) => {
  if (event === 'ready' && mockRedisClient.status === 'ready') {
    // Immediately call the handler if already ready
    setTimeout(handler, 0);
  }
  return mockRedisClient;
});

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisClient);
});

describe('RedisService', () => {
  let service: RedisService;
  let configService: ConfigService;
  let loggerSpy: jest.SpyInstance;

  // Helper function to simulate successful connection
  const simulateConnection = async () => {
    await service.onModuleInit();
    // Trigger the ready event to simulate connection
    if (mockRedisClient._eventHandlers.ready) {
      mockRedisClient._eventHandlers.ready.forEach(handler => handler());
    }
    // Also trigger connect event
    if (mockRedisClient._eventHandlers.connect) {
      mockRedisClient._eventHandlers.connect.forEach(handler => handler());
    }
  };

  const mockRedisConfig = {
    host: 'localhost',
    port: 6379,
    username: undefined,
    password: undefined,
    db: 0,
    keyPrefix: 'test:',
    connectionName: 'image-service',
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    commandTimeout: 2000,
    family: 4,
    keepAlive: 30000,
    lazyConnect: true,
  };

  beforeEach(async () => {
    // Reset all mocks and their implementations
    jest.clearAllMocks();
    mockRedisClient.status = 'ready';
    mockRedisClient._eventHandlers = {};
    
    // Reset all mock functions to their default implementations
    mockRedisClient.connect.mockResolvedValue(undefined);
    mockRedisClient.quit.mockResolvedValue(undefined);
    mockRedisClient.ping.mockResolvedValue('PONG');
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.setex.mockResolvedValue('OK');
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.getBuffer.mockResolvedValue(null);
    mockRedisClient.del.mockResolvedValue(0);
    mockRedisClient.exists.mockResolvedValue(0);
    mockRedisClient.expire.mockResolvedValue(0);
    mockRedisClient.ttl.mockResolvedValue(-1);
    mockRedisClient.keys.mockResolvedValue([]);
    mockRedisClient.scan.mockResolvedValue(['0', []]);
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.incrby.mockResolvedValue(1);
    mockRedisClient.hset.mockResolvedValue(1);
    mockRedisClient.hget.mockResolvedValue(null);
    mockRedisClient.hgetall.mockResolvedValue({});
    mockRedisClient.hdel.mockResolvedValue(0);
    mockRedisClient.disconnect.mockResolvedValue(undefined);

    // Create mock services
    const mockConfig = createMockConfigService({
      redis: mockRedisConfig
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfig
        }
      ]
    }).compile();

    service = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);

    // Spy on logger to suppress logs during tests
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('should establish Redis connection on module init', async () => {
      // Act
      await simulateConnection();

      // Assert
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should throw error when Redis config is missing', async () => {
      // Arrange
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow('Redis configuration not found');
    });

    it('should handle connection errors', async () => {
      // Arrange
      const connectionError = new Error('Connection failed');
      mockRedisClient.connect.mockRejectedValue(connectionError);

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from Redis on module destroy', async () => {
      // Arrange
      await simulateConnection();

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });

    it('should handle case when client is not initialized', async () => {
      // Act & Assert - should not throw
      await service.onModuleDestroy();
    });
  });

  describe('getClient', () => {
    it('should return client when connected', async () => {
      // Arrange
      await simulateConnection();

      // Act
      const client = service.getClient();

      // Assert
      expect(client).toBeDefined();
      expect(client).toBe(mockRedisClient);
    });

    it('should throw error when client not initialized', () => {
      // Act & Assert
      expect(() => service.getClient()).toThrow('Redis client not initialized');
    });

    it('should throw error when client not connected', async () => {
      // Arrange
      await simulateConnection();
      mockRedisClient.status = 'disconnected';
      // Simulate disconnection by triggering error event
      if (mockRedisClient._eventHandlers.error) {
        mockRedisClient._eventHandlers.error.forEach(handler => handler(new Error('Connection lost')));
      }

      // Act & Assert
      expect(() => service.getClient()).toThrow('Redis client not connected');
    });
  });

  describe('isHealthy', () => {
    it('should return true when Redis responds to ping', async () => {
      // Arrange
      await simulateConnection();
      mockRedisClient.ping.mockResolvedValue('PONG');

      // Act
      const result = await service.isHealthy();

      // Assert
      expect(result).toBe(true);
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('should return false when client not connected', async () => {
      // Act
      const result = await service.isHealthy();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when ping fails', async () => {
      // Arrange
      await simulateConnection();
      mockRedisClient.ping.mockRejectedValue(new Error('Ping failed'));

      // Act
      const result = await service.isHealthy();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return status when client connected', async () => {
      // Arrange
      await simulateConnection();

      // Act
      const status = service.getStatus();

      // Assert
      expect(status).toEqual({
        connected: true,
        status: 'ready',
        reconnectAttempts: 0,
        uptime: expect.any(Number)
      });
    });

    it('should return disconnected status when client not initialized', () => {
      // Act
      const status = service.getStatus();

      // Assert
      expect(status).toEqual({
        connected: false,
        status: 'disconnected',
        reconnectAttempts: 0,
        uptime: undefined
      });
    });
  });

  describe('execute', () => {
    it('should execute Redis command successfully', async () => {
      // Arrange
      await simulateConnection();
      mockRedisClient.ping.mockResolvedValue('PONG');

      // Act
      const result = await service.execute('ping');

      // Assert
      expect(result).toBe('PONG');
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('should throw error when command fails', async () => {
      // Arrange
      await simulateConnection();
      mockRedisClient.ping.mockRejectedValue(new Error('Command failed'));

      // Act & Assert
      await expect(service.execute('ping')).rejects.toThrow('Command failed');
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await simulateConnection();
    });

    it('should set key-value without TTL', async () => {
      // Act
      await service.set('testkey', 'testvalue');

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledWith('testkey', 'testvalue');
    });

    it('should set key-value with TTL', async () => {
      // Act
      await service.set('testkey', 'testvalue', 3600);

      // Assert
      expect(mockRedisClient.setex).toHaveBeenCalledWith('testkey', 3600, 'testvalue');
    });

    it('should set buffer value', async () => {
      // Arrange
      const buffer = Buffer.from('test data');

      // Act
      await service.set('testkey', buffer, 1800);

      // Assert
      expect(mockRedisClient.setex).toHaveBeenCalledWith('testkey', 1800, buffer);
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await simulateConnection();
    });

    it('should get string value', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue('testvalue');

      // Act
      const result = await service.get('testkey');

      // Assert
      expect(result).toBe('testvalue');
      expect(mockRedisClient.get).toHaveBeenCalledWith('testkey');
    });

    it('should return null for non-existent key', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);

      // Act
      const result = await service.get('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getBuffer', () => {
    beforeEach(async () => {
      await simulateConnection();
    });

    it('should get buffer value', async () => {
      // Arrange
      const buffer = Buffer.from('test data');
      mockRedisClient.getBuffer.mockResolvedValue(buffer);

      // Act
      const result = await service.getBuffer('testkey');

      // Assert
      expect(result).toEqual(buffer);
      expect(mockRedisClient.getBuffer).toHaveBeenCalledWith('testkey');
    });

    it('should return null for non-existent key', async () => {
      // Arrange
      mockRedisClient.getBuffer.mockResolvedValue(null);

      // Act
      const result = await service.getBuffer('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    beforeEach(async () => {
      await simulateConnection();
    });

    it('should delete key and return count', async () => {
      // Arrange
      mockRedisClient.del.mockResolvedValue(1);

      // Act
      const result = await service.del('testkey');

      // Assert
      expect(result).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith('testkey');
    });

    it('should return 0 for non-existent key', async () => {
      // Arrange
      mockRedisClient.del.mockResolvedValue(0);

      // Act
      const result = await service.del('nonexistent');

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      await simulateConnection();
    });

    it('should return true when key exists', async () => {
      // Arrange
      mockRedisClient.exists.mockResolvedValue(1);

      // Act
      const result = await service.exists('testkey');

      // Assert
      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('testkey');
    });

    it('should return false when key does not exist', async () => {
      // Arrange
      mockRedisClient.exists.mockResolvedValue(0);

      // Act
      const result = await service.exists('nonexistent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('expire', () => {
    beforeEach(async () => {
      await simulateConnection();
    });

    it('should set TTL and return true when successful', async () => {
      // Arrange
      mockRedisClient.expire.mockResolvedValue(1);

      // Act
      const result = await service.expire('testkey', 3600);

      // Assert
      expect(result).toBe(true);
      expect(mockRedisClient.expire).toHaveBeenCalledWith('testkey', 3600);
    });

    it('should return false when key does not exist', async () => {
      // Arrange
      mockRedisClient.expire.mockResolvedValue(0);

      // Act
      const result = await service.expire('nonexistent', 3600);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('ttl', () => {
    beforeEach(async () => {
      await simulateConnection();
    });

    it('should return TTL value', async () => {
      // Arrange
      mockRedisClient.ttl.mockResolvedValue(1800);

      // Act
      const result = await service.ttl('testkey');

      // Assert
      expect(result).toBe(1800);
      expect(mockRedisClient.ttl).toHaveBeenCalledWith('testkey');
    });

    it('should return -1 for key without TTL', async () => {
      // Arrange
      mockRedisClient.ttl.mockResolvedValue(-1);

      // Act
      const result = await service.ttl('persistent');

      // Assert
      expect(result).toBe(-1);
    });
  });

  describe('keys', () => {
    beforeEach(async () => {
      await simulateConnection();
    });

    it('should return matching keys', async () => {
      // Arrange
      const keys = ['test:key1', 'test:key2'];
      mockRedisClient.keys.mockResolvedValue(keys);

      // Act
      const result = await service.keys('test:*');

      // Assert
      expect(result).toEqual(keys);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('test:*');
    });

    it('should return empty array when no keys match', async () => {
      // Arrange
      mockRedisClient.keys.mockResolvedValue([]);

      // Act
      const result = await service.keys('nonexistent:*');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('scan', () => {
    beforeEach(async () => {
      await simulateConnection();
    });

    it('should scan keys with cursor only', async () => {
      // Arrange
      const scanResult: [string, string[]] = ['10', ['key1', 'key2']];
      mockRedisClient.scan.mockResolvedValue(scanResult);

      // Act
      const result = await service.scan('0');

      // Assert
      expect(result).toEqual(scanResult);
      expect(mockRedisClient.scan).toHaveBeenCalledWith(['0']);
    });

    it('should scan keys with pattern', async () => {
      // Arrange
      const scanResult: [string, string[]] = ['20', ['test:key1']];
      mockRedisClient.scan.mockResolvedValue(scanResult);

      // Act
      const result = await service.scan('0', 'test:*');

      // Assert
      expect(result).toEqual(scanResult);
      expect(mockRedisClient.scan).toHaveBeenCalledWith(['0', 'MATCH', 'test:*']);
    });

    it('should scan keys with pattern and count', async () => {
      // Arrange
      const scanResult: [string, string[]] = ['30', ['test:key1', 'test:key2']];
      mockRedisClient.scan.mockResolvedValue(scanResult);

      // Act
      const result = await service.scan('0', 'test:*', 100);

      // Assert
      expect(result).toEqual(scanResult);
      expect(mockRedisClient.scan).toHaveBeenCalledWith(['0', 'MATCH', 'test:*', 'COUNT', 100]);
    });
  });

  describe('incr', () => {
    beforeEach(async () => {
      await simulateConnection();
    });

    it('should increment counter', async () => {
      // Arrange
      mockRedisClient.incr.mockResolvedValue(5);

      // Act
      const result = await service.incr('counter');

      // Assert
      expect(result).toBe(5);
      expect(mockRedisClient.incr).toHaveBeenCalledWith('counter');
    });
  });

  describe('incrby', () => {
    beforeEach(async () => {
      await simulateConnection();
    });

    it('should increment counter by amount', async () => {
      // Arrange
      mockRedisClient.incrby.mockResolvedValue(15);

      // Act
      const result = await service.incrby('counter', 10);

      // Assert
      expect(result).toBe(15);
      expect(mockRedisClient.incrby).toHaveBeenCalledWith('counter', 10);
    });
  });

  describe('hash operations', () => {
    beforeEach(async () => {
      await simulateConnection();
    });

    describe('hset', () => {
      it('should set hash field', async () => {
        // Arrange
        mockRedisClient.hset.mockResolvedValue(1);

        // Act
        const result = await service.hset('hash:key', 'field', 'value');

        // Assert
        expect(result).toBe(1);
        expect(mockRedisClient.hset).toHaveBeenCalledWith('hash:key', 'field', 'value');
      });
    });

    describe('hget', () => {
      it('should get hash field value', async () => {
        // Arrange
        mockRedisClient.hget.mockResolvedValue('fieldvalue');

        // Act
        const result = await service.hget('hash:key', 'field');

        // Assert
        expect(result).toBe('fieldvalue');
        expect(mockRedisClient.hget).toHaveBeenCalledWith('hash:key', 'field');
      });

      it('should return null for non-existent field', async () => {
        // Arrange
        mockRedisClient.hget.mockResolvedValue(null);

        // Act
        const result = await service.hget('hash:key', 'nonexistent');

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('hgetall', () => {
      it('should get all hash fields', async () => {
        // Arrange
        const hashData = { field1: 'value1', field2: 'value2' };
        mockRedisClient.hgetall.mockResolvedValue(hashData);

        // Act
        const result = await service.hgetall('hash:key');

        // Assert
        expect(result).toEqual(hashData);
        expect(mockRedisClient.hgetall).toHaveBeenCalledWith('hash:key');
      });
    });

    describe('hdel', () => {
      it('should delete hash fields', async () => {
        // Arrange
        mockRedisClient.hdel.mockResolvedValue(2);

        // Act
        const result = await service.hdel('hash:key', 'field1', 'field2');

        // Assert
        expect(result).toBe(2);
        expect(mockRedisClient.hdel).toHaveBeenCalledWith('hash:key', 'field1', 'field2');
      });
    });
  });

  describe('connection event handling', () => {
    it('should set up event handlers', async () => {
      // Act
      await simulateConnection();

      // Assert
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('end', expect.any(Function));
    });

    it('should handle connect event', async () => {
      // Arrange
      await simulateConnection();
      const connectHandler = mockRedisClient.on.mock.calls.find(call => call[0] === 'connect')[1];

      // Act
      connectHandler();

      // Assert - should not throw and internal state should be updated
      expect(loggerSpy).toHaveBeenCalledWith('Redis client connected');
    });

    it('should handle error event', async () => {
      // Arrange  
      await simulateConnection();
      const errorHandler = mockRedisClient.on.mock.calls.find(call => call[0] === 'error')[1];
      const error = new Error('Connection error');

      // Act
      errorHandler(error);

      // Assert - should log error and update connection state
      // The exact assertion depends on internal implementation
      expect(() => service.getClient()).toThrow('Redis client not connected');
    });

    it('should handle reconnecting event with max attempts', async () => {
      // Arrange
      await simulateConnection();
      const reconnectingHandler = mockRedisClient.on.mock.calls.find(call => call[0] === 'reconnecting')[1];

      // Act - simulate multiple reconnect attempts
      for (let i = 0; i < 11; i++) {
        reconnectingHandler(1000);
      }

      // Assert
      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('waitForConnection', () => {
    it('should resolve immediately when client is ready', async () => {
      // Arrange
      mockRedisClient.status = 'ready';
      await simulateConnection();

      // Act & Assert - should not timeout
      const waitPromise = (service as any).waitForConnection(1000);
      await expect(waitPromise).resolves.toBeUndefined();
    });

    it('should reject when client not initialized', async () => {
      // Act & Assert
      const waitPromise = (service as any).waitForConnection(1000);
      await expect(waitPromise).rejects.toThrow('Redis client not initialized');
    });
  });
});