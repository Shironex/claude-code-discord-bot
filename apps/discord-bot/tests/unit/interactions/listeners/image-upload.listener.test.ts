import { ImageUploadListener } from '@/interactions/listeners/image-upload.listener';
import { SessionService } from '@/services/session.service';
import { ImageUploadService, DiscordBatchUploadResult } from '@/services/image-service/image-upload.service';
import { CUSTOM_IDS } from '@/utils/discord.constants';
import { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle, Attachment } from 'discord.js';

// Mock Necord
jest.mock('necord', () => ({
  Context: () => () => ({}),
  On: () => () => ({}),
  ContextOf: {}
}));

// Mock Discord.js components
const mockActionRowBuilder = {
  addComponents: jest.fn().mockReturnThis()
};

const mockButtonBuilder = {
  setCustomId: jest.fn().mockReturnThis(),
  setLabel: jest.fn().mockReturnThis(),
  setStyle: jest.fn().mockReturnThis(),
  setEmoji: jest.fn().mockReturnThis()
};

jest.mock('discord.js', () => ({
  ...jest.requireActual('discord.js'),
  EmbedBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis(),
    setFooter: jest.fn().mockReturnThis()
  })),
  ActionRowBuilder: jest.fn().mockImplementation(() => mockActionRowBuilder),
  ButtonBuilder: jest.fn().mockImplementation(() => mockButtonBuilder),
  Colors: {
    Yellow: 0xffff00,
    Red: 0xff0000,
    Green: 0x00ff00,
    Blue: 0x0000ff
  },
  ButtonStyle: {
    Primary: 1,
    Secondary: 2,
    Success: 3,
    Danger: 4
  }
}));

// Create mock Discord attachment
const createMockAttachment = (id: string, name: string, options?: Partial<Attachment>): Attachment => ({
  id,
  name,
  size: 1024,
  contentType: 'image/jpeg',
  url: `https://cdn.discordapp.com/attachments/${id}`,
  proxyURL: `https://media.discordapp.net/attachments/${id}`,
  width: 800,
  height: 600,
  ephemeral: false,
  description: null,
  duration: null,
  waveform: null,
  flags: null,
  ...options
} as Attachment);

// Mock message with attachments
const createMockMessage = (options: {
  userId?: string;
  userTag?: string;
  botUser?: boolean;
  attachments?: Attachment[];
}) => {
  const attachmentsMap = new Map();
  if (options.attachments) {
    options.attachments.forEach((att, index) => {
      attachmentsMap.set(att.id, att);
    });
  }

  return {
    author: {
      id: options.userId || 'user123',
      tag: options.userTag || 'testuser#1234',
      bot: options.botUser || false
    },
    attachments: attachmentsMap,
    reply: jest.fn()
  } as any;
};

// Mock Services
const mockSessionService = {
  getSession: jest.fn(),
  updateSession: jest.fn()
} as unknown as jest.Mocked<SessionService>;

const mockImageUploadService = {
  validateAttachments: jest.fn(),
  uploadDiscordAttachments: jest.fn(),
  imageServiceClient: {
    getDiagnosticInfo: jest.fn()
  }
} as unknown as jest.Mocked<ImageUploadService>;

describe('ImageUploadListener', () => {
  let listener: ImageUploadListener;

  beforeEach(() => {
    jest.clearAllMocks();
    
    listener = new ImageUploadListener(mockSessionService, mockImageUploadService);

    // Mock the logger to prevent actual logging
    Object.defineProperty(listener, 'logger', {
      value: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn()
      },
      writable: true
    });

    // Reset mocks to default behavior
    (mockImageUploadService as any).imageServiceClient = {
      getDiagnosticInfo: jest.fn().mockReturnValue({ status: 'healthy' })
    };
  });

  describe('Constructor', () => {
    it('should initialize with correct service name and dependencies', () => {
      expect(listener).toBeDefined();
      expect(listener['sessionService']).toBe(mockSessionService);
      expect(listener['imageUploadService']).toBe(mockImageUploadService);
    });

    it('should extend BaseService', () => {
      expect(listener).toBeDefined();
      expect(typeof listener['logger']).toBe('object');
    });
  });

  describe('onMessage', () => {
    describe('Message Filtering', () => {
      it('should ignore bot messages', async () => {
        const attachment = createMockAttachment('1', 'test.jpg');
        const botMessage = createMockMessage({
          botUser: true,
          attachments: [attachment]
        });

        await listener.onMessage([botMessage]);

        expect(mockSessionService.getSession).not.toHaveBeenCalled();
        expect(botMessage.reply).not.toHaveBeenCalled();
      });

      it('should ignore messages without attachments', async () => {
        const messageWithoutAttachments = createMockMessage({
          attachments: []
        });

        await listener.onMessage([messageWithoutAttachments]);

        expect(mockSessionService.getSession).not.toHaveBeenCalled();
        expect(messageWithoutAttachments.reply).not.toHaveBeenCalled();
      });

      it('should ignore messages from users without active session', async () => {
        const attachment = createMockAttachment('1', 'test.jpg');
        const message = createMockMessage({
          attachments: [attachment]
        });

        mockSessionService.getSession.mockReturnValue(null);

        await listener.onMessage([message]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user123');
        expect(message.reply).not.toHaveBeenCalled();
      });

      it('should ignore messages from users not awaiting images', async () => {
        const attachment = createMockAttachment('1', 'test.jpg');
        const message = createMockMessage({
          attachments: [attachment]
        });

        const sessionNotAwaitingImages = {
          userId: 'user123',
          awaitingImages: false,
          action: 'claude_repository_search'
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionNotAwaitingImages);

        await listener.onMessage([message]);

        expect(message.reply).not.toHaveBeenCalled();
      });

      it('should ignore messages from users with wrong action', async () => {
        const attachment = createMockAttachment('1', 'test.jpg');
        const message = createMockMessage({
          attachments: [attachment]
        });

        const sessionWrongAction = {
          userId: 'user123',
          awaitingImages: true,
          action: 'claude_repository_search'
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWrongAction);

        await listener.onMessage([message]);

        expect(message.reply).not.toHaveBeenCalled();
      });
    });

    describe('Image Validation', () => {
      const validSession = {
        userId: 'user123',
        awaitingImages: true,
        action: 'claude_awaiting_images'
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should handle messages with no valid images', async () => {
        const attachment = createMockAttachment('1', 'test.txt', { contentType: 'text/plain' });
        const message = createMockMessage({
          attachments: [attachment]
        });

        mockImageUploadService.validateAttachments.mockReturnValue({
          valid: [],
          invalid: [{ attachment, reason: 'Invalid file type' }]
        });

        message.reply.mockResolvedValue(undefined);

        await listener.onMessage([message]);

        expect(message.reply).toHaveBeenCalledWith({
          content: '❌ No valid images found. Please upload image files (PNG, JPG, GIF, WebP, BMP, TIFF) and try again.'
        });
      });

      it('should process messages with valid images', async () => {
        const attachment = createMockAttachment('1', 'test.jpg');
        const message = createMockMessage({
          attachments: [attachment]
        });

        mockImageUploadService.validateAttachments.mockReturnValue({
          valid: [attachment],
          invalid: []
        });

        const uploadResult: DiscordBatchUploadResult = {
          images: [],
          successCount: 1,
          totalCount: 1,
          results: [{
            success: true,
            result: {
              id: 'img123',
              url: 'https://example.com/img123',
              originalName: 'test.jpg',
              size: 1024,
              expires: '2024-01-01T01:00:00Z',
              mimeType: 'image/jpeg',
              originalAttachment: attachment,
              discordUrl: attachment.url
            },
            originalAttachment: attachment
          }],
          errors: []
        };

        mockImageUploadService.uploadDiscordAttachments.mockResolvedValue(uploadResult);
        message.reply.mockResolvedValue({ edit: jest.fn() });

        await listener.onMessage([message]);

        expect(mockImageUploadService.uploadDiscordAttachments).toHaveBeenCalledWith([attachment], {
          ttl: 3600,
          userId: 'user123'
        });
      });
    });

    describe('Upload Processing', () => {
      const validSession = {
        userId: 'user123',
        awaitingImages: true,
        action: 'claude_awaiting_images'
      } as any;

      const validAttachment = createMockAttachment('1', 'test.jpg');

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
        mockImageUploadService.validateAttachments.mockReturnValue({
          valid: [validAttachment],
          invalid: []
        });
      });

      it('should handle successful upload process', async () => {
        const message = createMockMessage({
          attachments: [validAttachment]
        });

        const processingMessage = { edit: jest.fn() };
        message.reply.mockResolvedValueOnce(processingMessage)
                   .mockResolvedValueOnce(undefined);

        const uploadResult: DiscordBatchUploadResult = {
          images: [],
          successCount: 1,
          totalCount: 1,
          results: [{
            success: true,
            result: {
              id: 'img123',
              url: 'https://example.com/img123',
              originalName: 'test.jpg',
              size: 1024,
              expires: '2024-01-01T01:00:00Z',
              mimeType: 'image/jpeg',
              originalAttachment: validAttachment,
              discordUrl: validAttachment.url
            },
            originalAttachment: validAttachment
          }],
          errors: []
        };

        mockImageUploadService.uploadDiscordAttachments.mockResolvedValue(uploadResult);

        await listener.onMessage([message]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          uploadedImages: [{
            id: 'img123',
            url: 'https://example.com/img123',
            originalName: 'test.jpg',
            size: 1024,
            expires: '2024-01-01T01:00:00Z'
          }],
          action: 'claude_prompt_input',
          awaitingImages: false
        });

        expect(listener['logger'].log).toHaveBeenCalledWith(
          'Successfully processed 1 images for user testuser#1234'
        );
      });

      it('should handle complete upload failure', async () => {
        const message = createMockMessage({
          attachments: [validAttachment]
        });

        const processingMessage = { edit: jest.fn() };
        message.reply.mockResolvedValue(processingMessage);

        const uploadResult: DiscordBatchUploadResult = {
          images: [],
          successCount: 0,
          totalCount: 1,
          results: [{
            success: false,
            error: 'Upload failed',
            originalAttachment: validAttachment
          }],
          errors: [{ index: 0, filename: 'test.jpg', error: 'Network error' }]
        };

        mockImageUploadService.uploadDiscordAttachments.mockResolvedValue(uploadResult);

        await listener.onMessage([message]);

        expect(processingMessage.edit).toHaveBeenCalledWith({
          embeds: [expect.any(Object)]
        });
        
        expect(mockSessionService.updateSession).not.toHaveBeenCalled();
      });

      it('should handle partial upload success with errors', async () => {
        const attachment2 = createMockAttachment('2', 'test2.jpg');
        const message = createMockMessage({
          attachments: [validAttachment, attachment2]
        });

        const processingMessage = { edit: jest.fn() };
        message.reply.mockResolvedValueOnce(processingMessage)
                   .mockResolvedValueOnce(undefined);

        const uploadResult: DiscordBatchUploadResult = {
          images: [],
          successCount: 1,
          totalCount: 2,
          results: [
            {
              success: true,
              result: {
                id: 'img123',
                url: 'https://example.com/img123',
                originalName: 'test.jpg',
                size: 1024,
                expires: '2024-01-01T01:00:00Z',
                mimeType: 'image/jpeg',
                originalAttachment: validAttachment,
                discordUrl: validAttachment.url
              },
              originalAttachment: validAttachment
            },
            {
              success: false,
              error: 'Failed to upload',
              originalAttachment: attachment2
            }
          ],
          errors: [{ index: 1, filename: 'test2.jpg', error: 'File too large' }]
        };

        mockImageUploadService.uploadDiscordAttachments.mockResolvedValue(uploadResult);

        await listener.onMessage([message]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', expect.objectContaining({
          uploadedImages: expect.arrayContaining([
            expect.objectContaining({ id: 'img123' })
          ]),
          awaitingImages: false
        }));
      });
    });

    describe('UI Components', () => {
      const validSession = {
        userId: 'user123',
        awaitingImages: true,
        action: 'claude_awaiting_images'
      } as any;

      const validAttachment = createMockAttachment('1', 'test.jpg');

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
        mockImageUploadService.validateAttachments.mockReturnValue({
          valid: [validAttachment],
          invalid: []
        });
      });

      it('should create processing embed initially', async () => {
        const message = createMockMessage({
          attachments: [validAttachment]
        });

        const processingMessage = { edit: jest.fn() };
        message.reply.mockResolvedValueOnce(processingMessage)
                   .mockResolvedValueOnce(undefined);

        const uploadResult: DiscordBatchUploadResult = {
          images: [],
          successCount: 1,
          totalCount: 1,
          results: [{
            success: true,
            result: {
              id: 'img123',
              url: 'https://example.com/img123',
              originalName: 'test.jpg',
              size: 1024,
              expires: '2024-01-01T01:00:00Z',
              mimeType: 'image/jpeg',
              originalAttachment: validAttachment,
              discordUrl: validAttachment.url
            },
            originalAttachment: validAttachment
          }],
          errors: []
        };

        mockImageUploadService.uploadDiscordAttachments.mockResolvedValue(uploadResult);

        await listener.onMessage([message]);

        expect(EmbedBuilder).toHaveBeenCalled();
        expect(message.reply).toHaveBeenCalledWith({
          embeds: [expect.any(Object)]
        });
      });

      it('should create action button for opening prompt', async () => {
        const message = createMockMessage({
          attachments: [validAttachment]
        });

        const processingMessage = { edit: jest.fn() };
        message.reply.mockResolvedValueOnce(processingMessage)
                   .mockResolvedValueOnce(undefined);

        const uploadResult: DiscordBatchUploadResult = {
          images: [],
          successCount: 1,
          totalCount: 1,
          results: [{
            success: true,
            result: {
              id: 'img123',
              url: 'https://example.com/img123',
              originalName: 'test.jpg',
              size: 1024,
              expires: '2024-01-01T01:00:00Z',
              mimeType: 'image/jpeg',
              originalAttachment: validAttachment,
              discordUrl: validAttachment.url
            },
            originalAttachment: validAttachment
          }],
          errors: []
        };

        mockImageUploadService.uploadDiscordAttachments.mockResolvedValue(uploadResult);

        await listener.onMessage([message]);

        expect(ButtonBuilder).toHaveBeenCalled();
        expect(mockButtonBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.OPEN_CLAUDE_PROMPT);
        expect(mockButtonBuilder.setLabel).toHaveBeenCalledWith('📝 Open Analysis Prompt');
        expect(mockButtonBuilder.setStyle).toHaveBeenCalledWith(ButtonStyle.Primary);
        expect(mockButtonBuilder.setEmoji).toHaveBeenCalledWith('🚀');
      });
    });

    describe('Error Handling', () => {
      const validSession = {
        userId: 'user123',
        awaitingImages: true,
        action: 'claude_awaiting_images'
      } as any;

      const validAttachment = createMockAttachment('1', 'test.jpg');

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
        mockImageUploadService.validateAttachments.mockReturnValue({
          valid: [validAttachment],
          invalid: []
        });
      });

      it('should handle upload service errors', async () => {
        const message = createMockMessage({
          attachments: [validAttachment]
        });

        const processingMessage = { edit: jest.fn() };
        message.reply.mockResolvedValue(processingMessage);

        const uploadError = new Error('Service unavailable');
        mockImageUploadService.uploadDiscordAttachments.mockRejectedValue(uploadError);

        await listener.onMessage([message]);

        expect(listener['logger'].error).toHaveBeenCalledWith(
          'Failed to process image uploads: Service unavailable',
          uploadError
        );

        expect(message.reply).toHaveBeenCalledWith({
          embeds: [expect.any(Object)]
        });

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          awaitingImages: false,
          action: 'claude_repository_search'
        });
      });

      it('should handle session service errors', async () => {
        const sessionError = new Error('Session service failed');
        mockSessionService.getSession.mockImplementation(() => {
          throw sessionError;
        });

        const message = createMockMessage({
          attachments: [validAttachment]
        });

        await expect(listener.onMessage([message])).rejects.toThrow('Session service failed');
      });
    });

    describe('Diagnostic Logging', () => {
      const validSession = {
        userId: 'user123',
        awaitingImages: true,
        action: 'claude_awaiting_images'
      } as any;

      const validAttachment = createMockAttachment('1', 'test.jpg');

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
        mockImageUploadService.validateAttachments.mockReturnValue({
          valid: [validAttachment],
          invalid: []
        });
      });

      it('should log diagnostic information during processing', async () => {
        const message = createMockMessage({
          attachments: [validAttachment]
        });

        const processingMessage = { edit: jest.fn() };
        message.reply.mockResolvedValueOnce(processingMessage)
                   .mockResolvedValueOnce(undefined);

        const diagnosticInfo = { status: 'healthy', version: '1.0.0' };
        (mockImageUploadService as any).imageServiceClient.getDiagnosticInfo.mockReturnValue(diagnosticInfo);

        const uploadResult: DiscordBatchUploadResult = {
          images: [],
          successCount: 1,
          totalCount: 1,
          results: [{
            success: true,
            result: {
              id: 'img123',
              url: 'https://example.com/img123',
              originalName: 'test.jpg',
              size: 1024,
              expires: '2024-01-01T01:00:00Z',
              mimeType: 'image/jpeg',
              originalAttachment: validAttachment,
              discordUrl: validAttachment.url
            },
            originalAttachment: validAttachment
          }],
          errors: []
        };

        mockImageUploadService.uploadDiscordAttachments.mockResolvedValue(uploadResult);

        await listener.onMessage([message]);

        expect(listener['logger'].log).toHaveBeenCalledWith(
          'Processing 1 images from user testuser#1234 (user123)',
          expect.objectContaining({
            diagnosticInfo,
            imageCount: 1,
            attachmentSummary: expect.arrayContaining([
              expect.objectContaining({
                id: '1',
                name: 'test.jpg',
                size: 1024,
                contentType: 'image/jpeg'
              })
            ])
          })
        );

        expect(listener['logger'].debug).toHaveBeenCalledWith(
          'Upload result',
          'ImageUploadListener',
          { uploadResult }
        );
      });
    });

    describe('Multiple Images', () => {
      const validSession = {
        userId: 'user123',
        awaitingImages: true,
        action: 'claude_awaiting_images'
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should handle multiple image uploads', async () => {
        const attachments = [
          createMockAttachment('1', 'image1.jpg', { contentType: 'image/jpeg' }),
          createMockAttachment('2', 'image2.png', { contentType: 'image/png' }),
          createMockAttachment('3', 'image3.gif', { contentType: 'image/gif' })
        ];

        const message = createMockMessage({ attachments });

        mockImageUploadService.validateAttachments.mockReturnValue({
          valid: attachments,
          invalid: []
        });

        const processingMessage = { edit: jest.fn() };
        message.reply.mockResolvedValueOnce(processingMessage)
                   .mockResolvedValueOnce(undefined);

        const uploadResult: DiscordBatchUploadResult = {
          images: [],
          successCount: 3,
          totalCount: 3,
          results: attachments.map((att, index) => ({
            success: true,
            result: {
              id: `img${index + 1}`,
              url: `https://example.com/img${index + 1}`,
              originalName: att.name,
              size: att.size,
              expires: '2024-01-01T01:00:00Z',
              mimeType: att.contentType!,
              originalAttachment: att,
              discordUrl: att.url
            },
            originalAttachment: att
          })),
          errors: []
        };

        mockImageUploadService.uploadDiscordAttachments.mockResolvedValue(uploadResult);

        await listener.onMessage([message]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', 
          expect.objectContaining({
            uploadedImages: expect.arrayContaining([
              expect.objectContaining({ id: 'img1' }),
              expect.objectContaining({ id: 'img2' }),
              expect.objectContaining({ id: 'img3' })
            ])
          })
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty attachment validation results', async () => {
        const validSession = {
          userId: 'user123',
          awaitingImages: true,
          action: 'claude_awaiting_images'
        } as any;

        mockSessionService.getSession.mockReturnValue(validSession);

        const attachment = createMockAttachment('1', 'test.txt');
        const message = createMockMessage({
          attachments: [attachment]
        });

        mockImageUploadService.validateAttachments.mockReturnValue({
          valid: [],
          invalid: [{ attachment, reason: 'Invalid file type' }]
        });

        message.reply.mockResolvedValue(undefined);

        await listener.onMessage([message]);

        expect(message.reply).toHaveBeenCalledWith({
          content: '❌ No valid images found. Please upload image files (PNG, JPG, GIF, WebP, BMP, TIFF) and try again.'
        });
      });

      it('should handle upload results with null result objects', async () => {
        const validSession = {
          userId: 'user123',
          awaitingImages: true,
          action: 'claude_awaiting_images'
        } as any;

        const validAttachment = createMockAttachment('1', 'test.jpg');

        mockSessionService.getSession.mockReturnValue(validSession);
        mockImageUploadService.validateAttachments.mockReturnValue({
          valid: [validAttachment],
          invalid: []
        });

        const message = createMockMessage({
          attachments: [validAttachment]
        });

        const processingMessage = { edit: jest.fn() };
        message.reply.mockResolvedValue(processingMessage);

        const uploadResult: DiscordBatchUploadResult = {
          images: [],
          successCount: 0,
          totalCount: 1,
          results: [{
            success: true,
            result: undefined, // Null result
            originalAttachment: validAttachment
          }],
          errors: []
        };

        mockImageUploadService.uploadDiscordAttachments.mockResolvedValue(uploadResult);

        await listener.onMessage([message]);

        expect(mockSessionService.updateSession).not.toHaveBeenCalled();
      });
    });
  });
});