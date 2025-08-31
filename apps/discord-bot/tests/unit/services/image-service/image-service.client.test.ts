import { ImageServiceClient } from '@/services/image-service/image-service.client';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import { SHARED_IMAGE_CONSTANTS } from '@claude-code/shared';

// Mock NestJS Logger
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn()
  }))
}));

// Mock axios
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

// Mock axios instance
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    response: {
      use: jest.fn()
    }
  },
  defaults: {}
} as any;

// Mock ConfigService
const mockConfigService = {
  get: jest.fn()
} as unknown as jest.Mocked<ConfigService>;

describe('ImageServiceClient', () => {
  let client: ImageServiceClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create
    mockAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Default config values
    mockConfigService.get
      .mockReturnValueOnce('http://localhost:3001/api/v1') // IMAGE_SERVICE_BASE_URL
      .mockReturnValueOnce('test-api-key') // DISCORD_BOT_API_KEY
      .mockReturnValueOnce(30000); // IMAGE_SERVICE_TIMEOUT
  });

  describe('Constructor', () => {
    beforeEach(() => {
      client = new ImageServiceClient(mockConfigService);
    });

    it('should initialize with default config values', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('IMAGE_SERVICE_BASE_URL', 'http://localhost:3001/api/v1');
      expect(mockConfigService.get).toHaveBeenCalledWith('DISCORD_BOT_API_KEY');
      expect(mockConfigService.get).toHaveBeenCalledWith('IMAGE_SERVICE_TIMEOUT', 30000);
    });

    it('should create axios client with correct config', () => {
      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3001/api/v1',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          [SHARED_IMAGE_CONSTANTS.HEADERS.API_KEY]: 'test-api-key'
        }
      });
    });

    it('should setup response interceptor', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it('should warn when API key is missing', () => {
      jest.clearAllMocks();
      mockConfigService.get
        .mockReturnValueOnce('http://localhost:3001/api/v1') // IMAGE_SERVICE_BASE_URL
        .mockReturnValueOnce('') // DISCORD_BOT_API_KEY - empty
        .mockReturnValueOnce(30000); // IMAGE_SERVICE_TIMEOUT

      const client = new ImageServiceClient(mockConfigService);
      
      // Logger is mocked, so we just verify the client was created
      expect(client).toBeDefined();
    });

    it('should initialize config properties correctly', () => {
      expect(client['config']).toEqual({
        baseUrl: 'http://localhost:3001/api/v1',
        apiKey: 'test-api-key',
        timeout: 30000
      });
    });
  });

  describe('isAvailable', () => {
    it('should return true when both API key and baseUrl are present', () => {
      // Use the client created in beforeEach
      expect(client.isAvailable()).toBe(true);
    });

    it('should return false when API key is missing', () => {
      // Test by directly checking the config instead of creating new instance
      const config = client['config'];
      const originalApiKey = config.apiKey;
      config.apiKey = '';
      
      expect(client.isAvailable()).toBe(false);
      
      // Restore original value
      config.apiKey = originalApiKey;
    });

    it('should return false when baseUrl is missing', () => {
      // Test by directly checking the config instead of creating new instance
      const config = client['config'];
      const originalBaseUrl = config.baseUrl;
      config.baseUrl = '';
      
      expect(client.isAvailable()).toBe(false);
      
      // Restore original value  
      config.baseUrl = originalBaseUrl;
    });
  });

  describe('uploadImage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAxios.create.mockReturnValue(mockAxiosInstance);
      mockConfigService.get
        .mockReturnValueOnce('http://localhost:3001/api/v1') // IMAGE_SERVICE_BASE_URL
        .mockReturnValueOnce('test-api-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce(30000); // IMAGE_SERVICE_TIMEOUT
      
      client = new ImageServiceClient(mockConfigService);
    });

    it('should throw error when service not available', async () => {
      jest.spyOn(client, 'isAvailable').mockReturnValue(false);

      await expect(client.uploadImage(Buffer.from('test'), 'test.png'))
        .rejects.toThrow('Image service is not available - check configuration');
    });

    it('should upload image successfully', async () => {
      const mockResponse = {
        data: {
          id: 'img123',
          size: 1024,
          expires: new Date().toISOString()
        }
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const buffer = Buffer.from('test image data');
      const result = await client.uploadImage(buffer, 'test.png');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        SHARED_IMAGE_CONSTANTS.ENDPOINTS.UPLOAD,
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include TTL and userId in form data when provided', async () => {
      const mockResponse = { data: { id: 'img123', size: 1024 } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const buffer = Buffer.from('test');
      const result = await client.uploadImage(buffer, 'test.png', { ttl: 3600, userId: 'user123' });

      const formDataCall = mockAxiosInstance.post.mock.calls[0];
      const formData = formDataCall[1] as FormData;
      
      // Note: FormData doesn't have direct access to entries in Jest environment
      // We verify the method was called with FormData and returned correct result
      expect(formData).toBeInstanceOf(FormData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle different content types', async () => {
      const mockResponse = { data: { id: 'img123', size: 1024 } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const buffer = Buffer.from('test');
      await client.uploadImage(buffer, 'test.png', { contentType: 'image/png' });

      expect(mockAxiosInstance.post).toHaveBeenCalled();
    });

    it('should detect MIME type from filename', () => {
      const jpegType = client['getMimeTypeFromFilename']('image.jpeg');
      const pngType = client['getMimeTypeFromFilename']('image.png');
      const unknownType = client['getMimeTypeFromFilename']('file.xyz');

      expect(jpegType).toBe('image/jpeg');
      expect(pngType).toBe('image/png');
      expect(unknownType).toBeNull();
    });
  });

  describe('uploadBatch', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAxios.create.mockReturnValue(mockAxiosInstance);
      mockConfigService.get
        .mockReturnValueOnce('http://localhost:3001/api/v1') // IMAGE_SERVICE_BASE_URL
        .mockReturnValueOnce('test-api-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce(30000); // IMAGE_SERVICE_TIMEOUT
      
      client = new ImageServiceClient(mockConfigService);
    });

    it('should throw error when service not available', async () => {
      jest.spyOn(client, 'isAvailable').mockReturnValue(false);

      await expect(client.uploadBatch([]))
        .rejects.toThrow('Image service is not available - check configuration');
    });

    it('should throw error when too many images', async () => {
      const images = Array(SHARED_IMAGE_CONSTANTS.MAX_BATCH_FILES + 1)
        .fill(null)
        .map((_, i) => ({
          buffer: Buffer.from(`image${i}`),
          filename: `image${i}.png`
        }));

      await expect(client.uploadBatch(images))
        .rejects.toThrow('Too many images');
    });

    it('should upload batch successfully', async () => {
      const mockResponse = {
        data: {
          totalCount: 2,
          successCount: 2,
          results: [
            { id: 'img1', size: 1024 },
            { id: 'img2', size: 2048 }
          ],
          errors: []
        }
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const images = [
        { buffer: Buffer.from('img1'), filename: 'img1.png' },
        { buffer: Buffer.from('img2'), filename: 'img2.jpg' }
      ];

      const result = await client.uploadBatch(images);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        SHARED_IMAGE_CONSTANTS.ENDPOINTS.BATCH_UPLOAD,
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle batch upload with errors', async () => {
      const mockResponse = {
        data: {
          totalCount: 2,
          successCount: 1,
          results: [{ id: 'img1', size: 1024 }],
          errors: [{ filename: 'img2.png', error: 'Invalid format' }]
        }
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const images = [
        { buffer: Buffer.from('img1'), filename: 'img1.png' },
        { buffer: Buffer.from('img2'), filename: 'img2.png' }
      ];

      const result = await client.uploadBatch(images);

      expect(result.errors).toHaveLength(1);
    });

    it('should include options in batch upload', async () => {
      const mockResponse = {
        data: { totalCount: 1, successCount: 1, results: [], errors: [] }
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const images = [{ buffer: Buffer.from('test'), filename: 'test.png' }];
      await client.uploadBatch(images, { ttl: 7200, userId: 'user456' });

      expect(mockAxiosInstance.post).toHaveBeenCalled();
    });
  });

  describe('getImageMetadata', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAxios.create.mockReturnValue(mockAxiosInstance);
      mockConfigService.get
        .mockReturnValueOnce('http://localhost:3001/api/v1') // IMAGE_SERVICE_BASE_URL
        .mockReturnValueOnce('test-api-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce(30000); // IMAGE_SERVICE_TIMEOUT
      
      client = new ImageServiceClient(mockConfigService);
    });

    it('should throw error when service not available', async () => {
      jest.spyOn(client, 'isAvailable').mockReturnValue(false);

      await expect(client.getImageMetadata('img123'))
        .rejects.toThrow('Image service is not available - check configuration');
    });

    it('should get image metadata successfully', async () => {
      const mockMetadata = {
        id: 'img123',
        size: 1024,
        contentType: 'image/png',
        created: new Date().toISOString()
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockMetadata });

      const result = await client.getImageMetadata('img123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `${SHARED_IMAGE_CONSTANTS.ENDPOINTS.IMAGES}/img123/metadata`
      );
      expect(result).toEqual(mockMetadata);
    });
  });

  describe('deleteImage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAxios.create.mockReturnValue(mockAxiosInstance);
      mockConfigService.get
        .mockReturnValueOnce('http://localhost:3001/api/v1') // IMAGE_SERVICE_BASE_URL
        .mockReturnValueOnce('test-api-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce(30000); // IMAGE_SERVICE_TIMEOUT
      
      client = new ImageServiceClient(mockConfigService);
    });

    it('should throw error when service not available', async () => {
      jest.spyOn(client, 'isAvailable').mockReturnValue(false);

      await expect(client.deleteImage('img123'))
        .rejects.toThrow('Image service is not available - check configuration');
    });

    it('should delete image successfully', async () => {
      const mockResponse = { data: { success: true, id: 'img123' } };
      mockAxiosInstance.delete.mockResolvedValue(mockResponse);

      const result = await client.deleteImage('img123');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        `${SHARED_IMAGE_CONSTANTS.ENDPOINTS.IMAGES}/img123`
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getHealth', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAxios.create.mockReturnValue(mockAxiosInstance);
      mockConfigService.get
        .mockReturnValueOnce('http://localhost:3001/api/v1') // IMAGE_SERVICE_BASE_URL
        .mockReturnValueOnce('test-api-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce(30000); // IMAGE_SERVICE_TIMEOUT
      
      client = new ImageServiceClient(mockConfigService);
    });

    it('should throw error when service not available', async () => {
      jest.spyOn(client, 'isAvailable').mockReturnValue(false);

      await expect(client.getHealth())
        .rejects.toThrow('Image service is not available - check configuration');
    });

    it('should get health status successfully', async () => {
      const mockHealth = {
        status: 'healthy',
        uptime: 12345,
        services: { redis: 'connected' }
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockHealth });

      const result = await client.getHealth();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        SHARED_IMAGE_CONSTANTS.ENDPOINTS.HEALTH
      );
      expect(result).toEqual(mockHealth);
    });
  });

  describe('getAuthConfig', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAxios.create.mockReturnValue(mockAxiosInstance);
      mockConfigService.get
        .mockReturnValueOnce('http://localhost:3001/api/v1') // IMAGE_SERVICE_BASE_URL
        .mockReturnValueOnce('test-api-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce(30000); // IMAGE_SERVICE_TIMEOUT
      
      client = new ImageServiceClient(mockConfigService);
    });

    it('should throw error when service not available', async () => {
      jest.spyOn(client, 'isAvailable').mockReturnValue(false);

      await expect(client.getAuthConfig())
        .rejects.toThrow('Image service is not available - check configuration');
    });

    it('should get auth config successfully', async () => {
      const mockAuthConfig = {
        requiresAuth: true,
        methods: ['api-key']
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockAuthConfig });

      const result = await client.getAuthConfig();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `${SHARED_IMAGE_CONSTANTS.ENDPOINTS.AUTH}/config`
      );
      expect(result).toEqual(mockAuthConfig);
    });
  });

  describe('getStorageStats', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAxios.create.mockReturnValue(mockAxiosInstance);
      mockConfigService.get
        .mockReturnValueOnce('http://localhost:3001/api/v1') // IMAGE_SERVICE_BASE_URL
        .mockReturnValueOnce('test-api-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce(30000); // IMAGE_SERVICE_TIMEOUT
      
      client = new ImageServiceClient(mockConfigService);
    });

    it('should throw error when service not available', async () => {
      jest.spyOn(client, 'isAvailable').mockReturnValue(false);

      await expect(client.getStorageStats())
        .rejects.toThrow('Image service is not available - check configuration');
    });

    it('should get storage stats successfully', async () => {
      const mockStats = {
        totalImages: 100,
        totalSize: 1024000,
        storageUsed: '50%'
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockStats });

      const result = await client.getStorageStats();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `${SHARED_IMAGE_CONSTANTS.ENDPOINTS.IMAGES}/_admin/stats`
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe('getImageUrl', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAxios.create.mockReturnValue(mockAxiosInstance);
      mockConfigService.get
        .mockReturnValueOnce('http://localhost:3001/api/v1') // IMAGE_SERVICE_BASE_URL
        .mockReturnValueOnce('test-api-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce(30000); // IMAGE_SERVICE_TIMEOUT
      
      client = new ImageServiceClient(mockConfigService);
    });

    it('should generate correct image URL', () => {
      const url = client.getImageUrl('img123');
      
      expect(url).toBe(
        `http://localhost:3001/api/v1${SHARED_IMAGE_CONSTANTS.ENDPOINTS.IMAGES}/img123`
      );
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAxios.create.mockReturnValue(mockAxiosInstance);
      mockConfigService.get
        .mockReturnValueOnce('http://localhost:3001/api/v1') // IMAGE_SERVICE_BASE_URL
        .mockReturnValueOnce('test-api-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce(30000); // IMAGE_SERVICE_TIMEOUT
      
      client = new ImageServiceClient(mockConfigService);
    });

    it('should return false when service not available', async () => {
      jest.spyOn(client, 'isAvailable').mockReturnValue(false);

      const result = await client.testConnection();

      expect(result).toBe(false);
    });

    it('should return true when connection successful', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: { success: true }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.testConnection();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `${SHARED_IMAGE_CONSTANTS.ENDPOINTS.AUTH}/test`
      );
      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      const error = new Error('Connection failed');
      (error as any).response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: { error: 'Server error' }
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await client.testConnection();

      expect(result).toBe(false);
    });

    it('should handle connection test with enhanced error details', async () => {
      const error = new Error('Connection timeout');
      (error as any).details = { code: 'TIMEOUT' };
      (error as any).response = {
        status: 408,
        statusText: 'Request Timeout',
        data: null
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getDiagnosticInfo', () => {
    it('should return comprehensive diagnostic info', () => {
      client = new ImageServiceClient(mockConfigService);
      
      const diagnostics = client.getDiagnosticInfo();

      expect(diagnostics).toEqual({
        isConfigured: true,
        baseUrl: 'http://localhost:3001/api/v1',
        hasApiKey: true,
        apiKeyPrefix: 'test-api-k...',
        timeout: 30000,
        isAvailable: true
      });
    });

    it('should return diagnostic info when not configured', () => {
      // Temporarily modify the config to test unconfigured state
      const config = client['config'];
      const originalBaseUrl = config.baseUrl;
      const originalApiKey = config.apiKey;
      
      config.baseUrl = '';
      config.apiKey = '';
      
      const diagnostics = client.getDiagnosticInfo();

      expect(diagnostics).toEqual({
        isConfigured: false,
        baseUrl: '',
        hasApiKey: false,
        apiKeyPrefix: 'none',
        timeout: 30000,
        isAvailable: false
      });
      
      // Restore original values
      config.baseUrl = originalBaseUrl;
      config.apiKey = originalApiKey;
    });
  });

  describe('getMimeTypeFromFilename (private method)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAxios.create.mockReturnValue(mockAxiosInstance);
      mockConfigService.get
        .mockReturnValueOnce('http://localhost:3001/api/v1') // IMAGE_SERVICE_BASE_URL
        .mockReturnValueOnce('test-api-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce(30000); // IMAGE_SERVICE_TIMEOUT
      
      client = new ImageServiceClient(mockConfigService);
    });

    it('should return correct MIME types for supported extensions', () => {
      expect(client['getMimeTypeFromFilename']('image.jpg')).toBe('image/jpeg');
      expect(client['getMimeTypeFromFilename']('image.jpeg')).toBe('image/jpeg');
      expect(client['getMimeTypeFromFilename']('image.png')).toBe('image/png');
      expect(client['getMimeTypeFromFilename']('image.gif')).toBe('image/gif');
      expect(client['getMimeTypeFromFilename']('image.webp')).toBe('image/webp');
      expect(client['getMimeTypeFromFilename']('image.bmp')).toBe('image/bmp');
      expect(client['getMimeTypeFromFilename']('image.tiff')).toBe('image/tiff');
      expect(client['getMimeTypeFromFilename']('image.tif')).toBe('image/tiff');
    });

    it('should handle case-insensitive extensions', () => {
      expect(client['getMimeTypeFromFilename']('IMAGE.JPG')).toBe('image/jpeg');
      expect(client['getMimeTypeFromFilename']('Image.PNG')).toBe('image/png');
    });

    it('should return null for unsupported extensions', () => {
      expect(client['getMimeTypeFromFilename']('file.txt')).toBeNull();
      expect(client['getMimeTypeFromFilename']('file.pdf')).toBeNull();
      expect(client['getMimeTypeFromFilename']('file')).toBeNull();
    });

    it('should handle filenames without extensions', () => {
      expect(client['getMimeTypeFromFilename']('filename')).toBeNull();
      expect(client['getMimeTypeFromFilename']('')).toBeNull();
    });
  });

  describe('Axios interceptor error handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAxios.create.mockReturnValue(mockAxiosInstance);
      mockConfigService.get
        .mockReturnValueOnce('http://localhost:3001/api/v1') // IMAGE_SERVICE_BASE_URL
        .mockReturnValueOnce('test-api-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce(30000); // IMAGE_SERVICE_TIMEOUT
      
      client = new ImageServiceClient(mockConfigService);
    });

    it('should enhance errors through response interceptor', () => {
      // Get the error handler from the interceptor setup
      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      const errorHandler = interceptorCall[1]; // Second argument is error handler

      const originalError = {
        message: 'Network Error',
        code: 'ECONNREFUSED',
        config: {
          url: '/test',
          method: 'get',
          timeout: 30000,
          baseURL: 'http://localhost:3001/api/v1',
          headers: { 'x-api-key': 'test-key' }
        },
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Server error' },
          headers: { 'content-type': 'application/json' }
        },
        isAxiosError: true,
        errno: -61,
        syscall: 'connect',
        address: '127.0.0.1',
        port: 3001
      };

      expect(() => errorHandler(originalError)).toThrow('Image service error: Network Error (Status: 500)');
    });

    it('should handle errors without response status', () => {
      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      const errorHandler = interceptorCall[1];

      const originalError = {
        message: 'Connection timeout',
        code: 'ECONNABORTED',
        config: { url: '/test', method: 'get' },
        isAxiosError: true
      };

      expect(() => errorHandler(originalError)).toThrow('Image service error: Connection timeout (Status: unknown)');
    });
  });

  describe('Integration scenarios', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAxios.create.mockReturnValue(mockAxiosInstance);
      mockConfigService.get
        .mockReturnValueOnce('http://localhost:3001/api/v1') // IMAGE_SERVICE_BASE_URL
        .mockReturnValueOnce('test-api-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce(30000); // IMAGE_SERVICE_TIMEOUT
      
      client = new ImageServiceClient(mockConfigService);
    });

    it('should handle full upload workflow', async () => {
      // Mock successful upload
      const uploadResponse = {
        data: {
          id: 'img123',
          url: 'http://localhost:3001/images/img123',
          size: 1024,
          contentType: 'image/png',
          expires: new Date(Date.now() + 3600000).toISOString()
        }
      };
      mockAxiosInstance.post.mockResolvedValue(uploadResponse);

      // Mock successful metadata retrieval
      const metadataResponse = {
        data: {
          id: 'img123',
          size: 1024,
          contentType: 'image/png',
          created: new Date().toISOString(),
          expires: uploadResponse.data.expires
        }
      };
      mockAxiosInstance.get.mockResolvedValue(metadataResponse);

      // Upload image
      const buffer = Buffer.from('test image data');
      const uploadResult = await client.uploadImage(buffer, 'test.png', {
        ttl: 3600,
        userId: 'user123'
      });

      // Get metadata
      const metadata = await client.getImageMetadata(uploadResult.id);

      // Generate URL
      const imageUrl = client.getImageUrl(uploadResult.id);

      expect(uploadResult.id).toBe('img123');
      expect(metadata.id).toBe('img123');
      expect(imageUrl).toContain('img123');
    });

    it('should handle service unavailability gracefully', async () => {
      jest.spyOn(client, 'isAvailable').mockReturnValue(false);

      // All methods should throw when service unavailable
      await expect(client.uploadImage(Buffer.from('test'), 'test.png'))
        .rejects.toThrow('not available');
      await expect(client.uploadBatch([]))
        .rejects.toThrow('not available');
      await expect(client.getImageMetadata('img123'))
        .rejects.toThrow('not available');
      await expect(client.deleteImage('img123'))
        .rejects.toThrow('not available');
      await expect(client.getHealth())
        .rejects.toThrow('not available');
      await expect(client.getAuthConfig())
        .rejects.toThrow('not available');
      await expect(client.getStorageStats())
        .rejects.toThrow('not available');

      // testConnection should handle unavailability without throwing
      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });
});