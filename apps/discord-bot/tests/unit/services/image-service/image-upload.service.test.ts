import { ImageUploadService } from '@/services/image-service/image-upload.service';
import { ImageServiceClient } from '@/services/image-service/image-service.client';
import { Logger } from '@nestjs/common';
import { Attachment } from 'discord.js';
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

// Mock ImageServiceClient
const mockImageServiceClient = {
  isAvailable: jest.fn(),
  uploadImage: jest.fn(),
  uploadBatch: jest.fn()
} as unknown as jest.Mocked<ImageServiceClient>;

// Helper to create mock Discord attachments
const createMockAttachment = (overrides: Partial<Attachment> = {}): Attachment => ({
  id: 'attachment123',
  name: 'test-image.png',
  size: 1024,
  contentType: 'image/png',
  url: 'https://cdn.discordapp.com/attachments/123/456/test-image.png',
  proxyURL: 'https://media.discordapp.net/attachments/123/456/test-image.png',
  width: 100,
  height: 100,
  ephemeral: false,
  description: null,
  duration: null,
  waveform: null,
  flags: 0,
  ...overrides
} as Attachment);

describe('ImageUploadService', () => {
  let service: ImageUploadService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ImageUploadService(mockImageServiceClient);
  });

  describe('Constructor', () => {
    it('should initialize with ImageServiceClient', () => {
      expect(service).toBeDefined();
      expect(service['imageServiceClient']).toBe(mockImageServiceClient);
    });
  });

  describe('uploadDiscordAttachment', () => {
    const mockAttachment = createMockAttachment();

    beforeEach(() => {
      mockImageServiceClient.isAvailable.mockReturnValue(true);
      mockAxios.get.mockResolvedValue({ data: Buffer.from('fake image data') });
      mockImageServiceClient.uploadImage.mockResolvedValue({
        id: 'img123',
        size: 1024,
        url: 'http://localhost:3001/images/img123',
        expires: new Date(Date.now() + 3600000).toISOString(),
        mimeType: 'image/png'
      });
    });

    it('should throw error when image service not available', async () => {
      mockImageServiceClient.isAvailable.mockReturnValue(false);

      await expect(service.uploadDiscordAttachment(mockAttachment))
        .rejects.toThrow('Image service is not available');
    });

    it('should throw error for non-image attachments', async () => {
      const nonImageAttachment = createMockAttachment({
        contentType: 'text/plain',
        name: 'document.txt'
      });

      await expect(service.uploadDiscordAttachment(nonImageAttachment))
        .rejects.toThrow('Attachment is not a supported image type: text/plain');
    });

    it('should throw error for oversized attachments', async () => {
      const oversizedAttachment = createMockAttachment({
        size: SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE + 1
      });

      await expect(service.uploadDiscordAttachment(oversizedAttachment))
        .rejects.toThrow('Image too large');
    });

    it('should successfully upload valid attachment', async () => {
      const result = await service.uploadDiscordAttachment(mockAttachment);

      expect(mockAxios.get).toHaveBeenCalledWith(mockAttachment.url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Claude Code Discord Bot/1.0'
        }
      });

      expect(mockImageServiceClient.uploadImage).toHaveBeenCalledWith(
        expect.any(Buffer),
        'test-image.png',
        {
          ttl: undefined,
          userId: undefined,
          contentType: 'image/png'
        }
      );

      expect(result).toEqual({
        id: 'img123',
        size: 1024,
        url: 'http://localhost:3001/images/img123',
        expires: expect.any(String),
        mimeType: 'image/png',
        originalAttachment: mockAttachment,
        discordUrl: mockAttachment.url
      });
    });

    it('should handle attachment without name', async () => {
      const attachmentWithoutName = createMockAttachment({ name: null });

      await service.uploadDiscordAttachment(attachmentWithoutName);

      expect(mockImageServiceClient.uploadImage).toHaveBeenCalledWith(
        expect.any(Buffer),
        'discord-image-attachment123',
        expect.any(Object)
      );
    });

    it('should pass through upload options', async () => {
      const options = {
        ttl: 7200,
        userId: 'user456',
        generateUrls: true
      };

      await service.uploadDiscordAttachment(mockAttachment, options);

      expect(mockImageServiceClient.uploadImage).toHaveBeenCalledWith(
        expect.any(Buffer),
        'test-image.png',
        {
          ttl: 7200,
          userId: 'user456',
          contentType: 'image/png'
        }
      );
    });

    it('should handle download errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network timeout'));

      await expect(service.uploadDiscordAttachment(mockAttachment))
        .rejects.toThrow('Network timeout');
    });

    it('should handle upload service errors', async () => {
      mockImageServiceClient.uploadImage.mockRejectedValue(new Error('Upload failed'));

      await expect(service.uploadDiscordAttachment(mockAttachment))
        .rejects.toThrow('Upload failed');
    });

    it('should handle attachment without contentType', async () => {
      const attachment = createMockAttachment({
        contentType: null,
        name: 'image.jpg'
      });

      await service.uploadDiscordAttachment(attachment);

      expect(mockImageServiceClient.uploadImage).toHaveBeenCalledWith(
        expect.any(Buffer),
        'image.jpg',
        {
          ttl: undefined,
          userId: undefined,
          contentType: undefined
        }
      );
    });
  });

  describe('uploadDiscordAttachments', () => {
    const mockAttachment1 = createMockAttachment({ id: 'att1', name: 'image1.png' });
    const mockAttachment2 = createMockAttachment({ id: 'att2', name: 'image2.jpg', contentType: 'image/jpeg' });

    beforeEach(() => {
      mockImageServiceClient.isAvailable.mockReturnValue(true);
      mockAxios.get.mockResolvedValue({ data: Buffer.from('fake image data') });
      mockImageServiceClient.uploadBatch.mockResolvedValue({
        images: [
          { id: 'img1', size: 1024, url: 'http://localhost:3001/images/img1', expires: new Date().toISOString(), mimeType: 'image/png' },
          { id: 'img2', size: 2048, url: 'http://localhost:3001/images/img2', expires: new Date().toISOString(), mimeType: 'image/jpeg' }
        ],
        totalCount: 2,
        successCount: 2,
        errors: []
      });
    });

    it('should throw error when image service not available', async () => {
      mockImageServiceClient.isAvailable.mockReturnValue(false);

      await expect(service.uploadDiscordAttachments([mockAttachment1]))
        .rejects.toThrow('Image service is not available');
    });

    it('should throw error for empty attachments array', async () => {
      await expect(service.uploadDiscordAttachments([]))
        .rejects.toThrow('No attachments provided');
    });

    it('should throw error for too many attachments', async () => {
      const manyAttachments = Array(SHARED_IMAGE_CONSTANTS.MAX_BATCH_FILES + 1)
        .fill(null)
        .map((_, i) => createMockAttachment({ id: `att${i}` }));

      await expect(service.uploadDiscordAttachments(manyAttachments))
        .rejects.toThrow('Too many attachments');
    });

    it('should successfully upload multiple valid attachments', async () => {
      const result = await service.uploadDiscordAttachments([mockAttachment1, mockAttachment2]);

      expect(mockImageServiceClient.uploadBatch).toHaveBeenCalledWith([
        {
          buffer: expect.any(Buffer),
          filename: 'image1.png',
          contentType: 'image/png'
        },
        {
          buffer: expect.any(Buffer),
          filename: 'image2.jpg',
          contentType: 'image/jpeg'
        }
      ], {
        ttl: undefined,
        userId: undefined
      });

      expect(result).toEqual({
        images: [
          {
            id: 'img1',
            size: 1024,
            url: 'http://localhost:3001/images/img1',
            expires: expect.any(String),
            mimeType: 'image/png',
            originalAttachment: mockAttachment1,
            discordUrl: mockAttachment1.url
          },
          {
            id: 'img2',
            size: 2048,
            url: 'http://localhost:3001/images/img2',
            expires: expect.any(String),
            mimeType: 'image/jpeg',
            originalAttachment: mockAttachment2,
            discordUrl: mockAttachment2.url
          }
        ],
        totalCount: 2,
        successCount: 2,
        errors: [],
        results: [
          {
            success: true,
            result: expect.any(Object),
            originalAttachment: mockAttachment1
          },
          {
            success: true,
            result: expect.any(Object),
            originalAttachment: mockAttachment2
          }
        ]
      });
    });

    it('should handle mixed valid and invalid attachments', async () => {
      const validAttachment = mockAttachment1;
      const invalidAttachment = createMockAttachment({
        id: 'invalid',
        contentType: 'text/plain',
        name: 'document.txt'
      });

      mockImageServiceClient.uploadBatch.mockResolvedValue({
        images: [{ id: 'img1', size: 1024, url: 'http://localhost:3001/images/img1', expires: new Date().toISOString(), mimeType: 'image/png' }],
        totalCount: 1,
        successCount: 1,
        errors: []
      });

      const result = await service.uploadDiscordAttachments([validAttachment, invalidAttachment]);

      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.results).toHaveLength(2);
      
      // Find the invalid result
      const invalidResult = result.results.find(r => r.originalAttachment === invalidAttachment);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toContain('Not a supported image type');
    });

    it('should handle oversized attachments', async () => {
      const oversizedAttachment = createMockAttachment({
        size: SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE + 1
      });

      const result = await service.uploadDiscordAttachments([oversizedAttachment]);

      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('Image too large');
    });

    it('should handle download failures for individual attachments', async () => {
      mockAxios.get
        .mockResolvedValueOnce({ data: Buffer.from('image1') })
        .mockRejectedValueOnce(new Error('Download failed'));

      const result = await service.uploadDiscordAttachments([mockAttachment1, mockAttachment2]);

      expect(result.results).toHaveLength(2);
      
      // Find the failed download result
      const failedResult = result.results.find(r => r.originalAttachment === mockAttachment2);
      expect(failedResult.success).toBe(false);
      expect(failedResult.error).toBe('Failed to download image: Download failed');
    });

    it('should handle batch upload service errors', async () => {
      mockImageServiceClient.uploadBatch.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.uploadDiscordAttachments([mockAttachment1, mockAttachment2]);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(false);
      expect(result.results[1].success).toBe(false);
      expect(result.results[0].error).toContain('Batch upload failed');
    });

    it('should handle batch upload with individual errors', async () => {
      mockImageServiceClient.uploadBatch.mockResolvedValue({
        images: [{ id: 'img1', size: 1024, url: 'http://localhost:3001/images/img1', expires: new Date().toISOString(), mimeType: 'image/png' }],
        totalCount: 2,
        successCount: 1,
        errors: [
          { index: 1, error: 'Processing failed', filename: 'image2.jpg' }
        ]
      });

      const result = await service.uploadDiscordAttachments([mockAttachment1, mockAttachment2]);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('Processing failed');
    });

    it('should pass through batch upload options', async () => {
      const options = {
        ttl: 3600,
        userId: 'user123'
      };

      await service.uploadDiscordAttachments([mockAttachment1], options);

      expect(mockImageServiceClient.uploadBatch).toHaveBeenCalledWith(
        expect.any(Array),
        {
          ttl: 3600,
          userId: 'user123'
        }
      );
    });
  });

  describe('isImageAttachment (private method)', () => {
    it('should return true for supported image MIME types', () => {
      const pngAttachment = createMockAttachment({ contentType: 'image/png' });
      const jpegAttachment = createMockAttachment({ contentType: 'image/jpeg' });
      const webpAttachment = createMockAttachment({ contentType: 'image/webp' });

      expect(service['isImageAttachment'](pngAttachment)).toBe(true);
      expect(service['isImageAttachment'](jpegAttachment)).toBe(true);
      expect(service['isImageAttachment'](webpAttachment)).toBe(true);
    });

    it('should return false for unsupported MIME types', () => {
      const textAttachment = createMockAttachment({ contentType: 'text/plain' });
      const videoAttachment = createMockAttachment({ contentType: 'video/mp4' });

      expect(service['isImageAttachment'](textAttachment)).toBe(false);
      expect(service['isImageAttachment'](videoAttachment)).toBe(false);
    });

    it('should fallback to file extension when no contentType', () => {
      const pngByExtension = createMockAttachment({
        contentType: null,
        name: 'image.png'
      });
      const txtByExtension = createMockAttachment({
        contentType: null,
        name: 'document.txt'
      });

      expect(service['isImageAttachment'](pngByExtension)).toBe(true);
      expect(service['isImageAttachment'](txtByExtension)).toBe(false);
    });

    it('should handle attachment without name and contentType', () => {
      const unknownAttachment = createMockAttachment({
        contentType: null,
        name: null
      });

      expect(service['isImageAttachment'](unknownAttachment)).toBe(false);
    });
  });

  describe('downloadDiscordImage (private method)', () => {
    const testUrl = 'https://cdn.discordapp.com/attachments/123/456/image.png';

    it('should successfully download image', async () => {
      const mockImageData = Buffer.from('fake image data');
      mockAxios.get.mockResolvedValue({ data: mockImageData });

      const result = await service['downloadDiscordImage'](testUrl);

      expect(mockAxios.get).toHaveBeenCalledWith(testUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Claude Code Discord Bot/1.0'
        }
      });
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle download errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network timeout'));

      await expect(service['downloadDiscordImage'](testUrl))
        .rejects.toThrow('Failed to download image: Network timeout');
    });

    it('should handle axios errors with response', async () => {
      const axiosError = {
        message: 'Request failed',
        response: { status: 404, statusText: 'Not Found' }
      };
      mockAxios.get.mockRejectedValue(axiosError);

      await expect(service['downloadDiscordImage'](testUrl))
        .rejects.toThrow('Failed to download image: Request failed');
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported formats info', () => {
      const result = service.getSupportedFormats();

      expect(result).toEqual({
        mimeTypes: SHARED_IMAGE_CONSTANTS.SUPPORTED_MIME_TYPES,
        extensions: SHARED_IMAGE_CONSTANTS.SUPPORTED_EXTENSIONS,
        maxSize: SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE,
        maxBatchSize: SHARED_IMAGE_CONSTANTS.MAX_BATCH_FILES
      });
    });

    it('should return readonly arrays', () => {
      const result = service.getSupportedFormats();

      expect(Array.isArray(result.mimeTypes)).toBe(true);
      expect(Array.isArray(result.extensions)).toBe(true);
      expect(typeof result.maxSize).toBe('number');
      expect(typeof result.maxBatchSize).toBe('number');
    });
  });

  describe('validateAttachments', () => {
    it('should validate all valid attachments', () => {
      const validAttachments = [
        createMockAttachment({ id: 'att1', contentType: 'image/png' }),
        createMockAttachment({ id: 'att2', contentType: 'image/jpeg' })
      ];

      const result = service.validateAttachments(validAttachments);

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(0);
      expect(result.valid).toEqual(validAttachments);
    });

    it('should identify invalid attachments by content type', () => {
      const invalidAttachment = createMockAttachment({
        contentType: 'application/pdf',
        name: 'document.pdf'
      });

      const result = service.validateAttachments([invalidAttachment]);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0]).toEqual({
        attachment: invalidAttachment,
        reason: 'Unsupported file type: application/pdf'
      });
    });

    it('should identify oversized attachments', () => {
      const oversizedAttachment = createMockAttachment({
        size: SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE + 1
      });

      const result = service.validateAttachments([oversizedAttachment]);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].reason).toContain('File too large');
    });

    it('should handle mixed valid and invalid attachments', () => {
      const validAttachment = createMockAttachment({ id: 'valid' });
      const invalidTypeAttachment = createMockAttachment({
        id: 'invalid-type',
        contentType: 'text/plain'
      });
      const oversizedAttachment = createMockAttachment({
        id: 'oversized',
        size: SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE + 1
      });

      const result = service.validateAttachments([
        validAttachment,
        invalidTypeAttachment,
        oversizedAttachment
      ]);

      expect(result.valid).toHaveLength(1);
      expect(result.valid[0]).toBe(validAttachment);
      expect(result.invalid).toHaveLength(2);
    });

    it('should handle empty attachments array', () => {
      const result = service.validateAttachments([]);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
    });

    it('should handle attachment without contentType', () => {
      const attachment = createMockAttachment({
        contentType: null,
        name: 'unknown-file'
      });

      const result = service.validateAttachments([attachment]);

      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].reason).toBe('Unsupported file type: unknown');
    });
  });

  describe('Error handling and logging', () => {
    it('should log debug info for single upload', async () => {
      const mockAttachment = createMockAttachment();
      mockImageServiceClient.isAvailable.mockReturnValue(true);
      mockAxios.get.mockResolvedValue({ data: Buffer.from('fake image data') });
      mockImageServiceClient.uploadImage.mockResolvedValue({
        id: 'img123',
        size: 1024,
        url: 'http://localhost:3001/images/img123',
        expires: new Date().toISOString(),
        mimeType: 'image/png'
      });

      await service.uploadDiscordAttachment(mockAttachment);

      // Check if logger debug was called
      expect(service['logger'].debug).toHaveBeenCalledWith(
        expect.stringContaining('Uploading Discord attachment'),
        expect.objectContaining({
          id: mockAttachment.id,
          size: mockAttachment.size,
          contentType: mockAttachment.contentType,
          url: mockAttachment.url
        })
      );
    });

    it('should log success for single upload', async () => {
      const mockAttachment = createMockAttachment();
      mockImageServiceClient.isAvailable.mockReturnValue(true);
      mockAxios.get.mockResolvedValue({ data: Buffer.from('fake image data') });
      mockImageServiceClient.uploadImage.mockResolvedValue({
        id: 'img123',
        size: 1024,
        url: 'http://localhost:3001/images/img123',
        expires: new Date().toISOString(),
        mimeType: 'image/png'
      });

      await service.uploadDiscordAttachment(mockAttachment);

      expect(service['logger'].log).toHaveBeenCalledWith(
        expect.stringContaining('Successfully uploaded Discord attachment'),
        expect.any(Object)
      );
    });

    it('should log errors with detailed context', async () => {
      const mockAttachment = createMockAttachment();
      mockImageServiceClient.isAvailable.mockReturnValue(true);
      const uploadError = new Error('Upload failed');
      (uploadError as any).stack = 'Error stack trace';
      (uploadError as any).details = { code: 'UPLOAD_ERROR' };
      (uploadError as any).cause = 'Network issue';
      
      mockAxios.get.mockResolvedValue({ data: Buffer.from('fake image data') });
      mockImageServiceClient.uploadImage.mockRejectedValue(uploadError);

      await expect(service.uploadDiscordAttachment(mockAttachment))
        .rejects.toThrow('Upload failed');

      expect(service['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to upload Discord attachment'),
        expect.objectContaining({
          attachmentId: mockAttachment.id,
          error: 'Upload failed',
          errorStack: 'Error stack trace',
          errorDetails: { code: 'UPLOAD_ERROR' },
          cause: 'Network issue'
        })
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete upload workflow', async () => {
      const attachment = createMockAttachment({
        name: 'photo.jpg',
        contentType: 'image/jpeg',
        size: 2048
      });

      mockImageServiceClient.isAvailable.mockReturnValue(true);
      mockAxios.get.mockResolvedValue({ data: Buffer.from('jpeg image data') });
      mockImageServiceClient.uploadImage.mockResolvedValue({
        id: 'uploaded-123',
        size: 2048,
        url: 'http://localhost:3001/images/uploaded-123',
        expires: new Date(Date.now() + 7200000).toISOString(),
        mimeType: 'image/jpeg'
      });

      const result = await service.uploadDiscordAttachment(attachment, {
        ttl: 7200,
        userId: 'user-456'
      });

      expect(result).toEqual({
        id: 'uploaded-123',
        size: 2048,
        url: 'http://localhost:3001/images/uploaded-123',
        expires: expect.any(String),
        mimeType: 'image/jpeg',
        originalAttachment: attachment,
        discordUrl: attachment.url
      });

      // Verify the full flow was called
      expect(mockAxios.get).toHaveBeenCalled();
      expect(mockImageServiceClient.uploadImage).toHaveBeenCalledWith(
        expect.any(Buffer),
        'photo.jpg',
        {
          ttl: 7200,
          userId: 'user-456',
          contentType: 'image/jpeg'
        }
      );
    });

    it('should handle batch upload with mixed results', async () => {
      const validAttachment = createMockAttachment({ id: 'valid', name: 'good.png' });
      const invalidAttachment = createMockAttachment({
        id: 'invalid',
        name: 'bad.txt',
        contentType: 'text/plain'
      });

      mockImageServiceClient.isAvailable.mockReturnValue(true);
      mockAxios.get.mockResolvedValue({ data: Buffer.from('image data') });
      mockImageServiceClient.uploadBatch.mockResolvedValue({
        images: [{ id: 'uploaded', size: 1024, url: 'http://localhost:3001/images/uploaded', expires: new Date().toISOString(), mimeType: 'image/png' }],
        totalCount: 1,
        successCount: 1,
        errors: []
      });

      const result = await service.uploadDiscordAttachments([validAttachment, invalidAttachment]);

      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.results).toHaveLength(2);
      
      // Find success and failure by attachment
      const validResult = result.results.find(r => r.originalAttachment === validAttachment);
      const invalidResult = result.results.find(r => r.originalAttachment === invalidAttachment);
      
      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toContain('Not a supported image type');
    });
  });
});