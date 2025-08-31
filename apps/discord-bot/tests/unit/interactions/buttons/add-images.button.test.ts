import { AddImagesButtonHandler } from '@/interactions/buttons/add-images.button';
import { SessionService } from '@/services/session.service';
import { ImageServiceClient } from '@/services/image-service/image-service.client';
import { CUSTOM_IDS } from '@/utils/discord.constants';
import { MESSAGES } from '@/utils/messages.constants';
import { Repository } from '@/interfaces/models/repository.interface';
import { MessageFlags, EmbedBuilder, Colors } from 'discord.js';

// Mock Necord
jest.mock('necord', () => ({
  Context: () => () => ({}),
  Button: () => () => ({}),
  ButtonContext: {}
}));

// Mock Discord.js components
const mockEmbedBuilder = {
  setTitle: jest.fn().mockReturnThis(),
  setColor: jest.fn().mockReturnThis(),
  setDescription: jest.fn().mockReturnThis(),
  addFields: jest.fn().mockReturnThis(),
  setFooter: jest.fn().mockReturnThis(),
  setTimestamp: jest.fn().mockReturnThis()
};

jest.mock('discord.js', () => ({
  ...jest.requireActual('discord.js'),
  EmbedBuilder: jest.fn().mockImplementation(() => mockEmbedBuilder),
  MessageFlags: {
    Ephemeral: 64
  },
  Colors: {
    Green: 0x00ff00,
    Red: 0xff0000,
    Yellow: 0xffff00
  }
}));

// Mock button interaction
const createMockInteraction = (options: {
  userId?: string;
  userTag?: string;
  customId?: string;
} = {}) => ({
  user: {
    id: options.userId || 'user123',
    tag: options.userTag || 'testuser#1234'
  },
  customId: options.customId || CUSTOM_IDS.ADD_IMAGES,
  reply: jest.fn(),
  update: jest.fn()
});

// Mock repository data
const createMockRepository = (fullName: string = 'owner/repo'): Repository => ({
  id: 1,
  fullName,
  name: fullName.split('/')[1],
  description: 'Test repository',
  private: false,
  language: 'TypeScript',
  stargazersCount: 100,
  forksCount: 10,
  updatedAt: '2023-01-01T00:00:00Z',
  htmlUrl: `https://github.com/${fullName}`
});

// Mock Services
const mockSessionService = {
  getSession: jest.fn(),
  updateSession: jest.fn()
} as unknown as jest.Mocked<SessionService>;

const mockImageServiceClient = {
  isAvailable: jest.fn()
} as unknown as jest.Mocked<ImageServiceClient>;

describe('AddImagesButtonHandler', () => {
  let handler: AddImagesButtonHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    handler = new AddImagesButtonHandler(
      mockSessionService,
      mockImageServiceClient
    );

    // Mock the logger to prevent actual logging
    Object.defineProperty(handler, 'logger', {
      value: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn()
      },
      writable: true
    });

    // Reset all mock builder methods to default behavior
    Object.values(mockEmbedBuilder).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockReturnThis();
      }
    });

    // Reset sessionService to default behavior
    mockSessionService.updateSession.mockImplementation(() => {});
  });

  describe('Constructor', () => {
    it('should initialize with correct service name and dependencies', () => {
      expect(handler).toBeDefined();
      expect(handler['sessionService']).toBe(mockSessionService);
      expect(handler['imageServiceClient']).toBe(mockImageServiceClient);
    });

    it('should extend BaseService', () => {
      expect(handler).toBeDefined();
      expect(typeof handler['logger']).toBe('object');
    });
  });

  describe('onAddImages', () => {
    describe('Session Validation', () => {
      it('should reply with session expired when no session exists', async () => {
        const interaction = createMockInteraction() as any;
        mockSessionService.getSession.mockReturnValue(null);

        await handler.onAddImages([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user123');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.update).not.toHaveBeenCalled();
      });

      it('should reply with session expired when session has no repository', async () => {
        const interaction = createMockInteraction() as any;
        const sessionWithoutRepo = {
          userId: 'user123',
          repository: null
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithoutRepo);

        await handler.onAddImages([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.update).not.toHaveBeenCalled();
      });

      it('should reply with session expired when session has undefined repository', async () => {
        const interaction = createMockInteraction() as any;
        const sessionWithUndefinedRepo = {
          userId: 'user123'
          // repository is undefined
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithUndefinedRepo);

        await handler.onAddImages([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.update).not.toHaveBeenCalled();
      });
    });

    describe('Image Service Validation', () => {
      const repository = createMockRepository('owner/repo');
      const validSession = {
        userId: 'user123',
        repository
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should reply with error when image service is not available', async () => {
        const interaction = createMockInteraction() as any;
        mockImageServiceClient.isAvailable.mockReturnValue(false);

        await handler.onAddImages([interaction]);

        expect(mockImageServiceClient.isAvailable).toHaveBeenCalled();
        expect(interaction.reply).toHaveBeenCalledWith({
          content: '❌ Image service is not available. Please check the configuration.',
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.update).not.toHaveBeenCalled();
      });

      it('should proceed when image service is available', async () => {
        const interaction = createMockInteraction() as any;
        mockImageServiceClient.isAvailable.mockReturnValue(true);
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(mockImageServiceClient.isAvailable).toHaveBeenCalled();
        expect(interaction.update).toHaveBeenCalled();
        expect(interaction.reply).not.toHaveBeenCalled();
      });
    });

    describe('Successful Image Upload Initialization', () => {
      const repository = createMockRepository('owner/test-repo');
      const validSession = {
        userId: 'user123',
        repository
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
        mockImageServiceClient.isAvailable.mockReturnValue(true);
      });

      it('should log user action', async () => {
        const interaction = createMockInteraction({
          userId: 'user456',
          userTag: 'developer#1234'
        }) as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('User developer#1234 (user456) chose to add images');
      });

      it('should update session with correct action and state', async () => {
        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          action: 'claude_awaiting_images',
          awaitingImages: true,
          uploadedImages: []
        });
      });

      it('should create waiting embed with correct properties', async () => {
        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(EmbedBuilder).toHaveBeenCalled();
        expect(mockEmbedBuilder.setTitle).toHaveBeenCalledWith('🖼️ Ready for Image Upload');
        expect(mockEmbedBuilder.setColor).toHaveBeenCalledWith(Colors.Green);
        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(
          expect.stringContaining('**Repository:** test-repo')
        );
        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(
          expect.stringContaining('**Next Step:** Upload your images in the next message')
        );
        expect(mockEmbedBuilder.setTimestamp).toHaveBeenCalled();
      });

      it('should add tips field to embed', async () => {
        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith([
          {
            name: '💡 Tips',
            value: expect.stringContaining('Upload all images at once for best results'),
            inline: false
          }
        ]);
      });

      it('should set footer with waiting message', async () => {
        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(mockEmbedBuilder.setFooter).toHaveBeenCalledWith({
          text: 'Waiting for your image upload...'
        });
      });

      it('should update interaction with embed and cancel button', async () => {
        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(interaction.update).toHaveBeenCalledWith({
          embeds: [mockEmbedBuilder],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 4,
                  label: 'Cancel',
                  custom_id: CUSTOM_IDS.CANCEL,
                  emoji: { name: '❌' }
                }
              ]
            }
          ]
        });
      });

      it('should log successful initialization', async () => {
        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('Image upload waiting state set for owner/test-repo');
      });

      it('should include upload instructions in description', async () => {
        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(
          expect.stringContaining('📋 **Upload Instructions:**')
        );
        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(
          expect.stringContaining('• Attach up to 10 images in your next message')
        );
        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(
          expect.stringContaining('• Supported: PNG, JPG, GIF, WebP, BMP, TIFF')
        );
        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(
          expect.stringContaining('• Max size: 10MB per image')
        );
      });

      it('should include bot process steps in description', async () => {
        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(
          expect.stringContaining('⏱️ **The bot will:**')
        );
        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(
          expect.stringContaining('1. Process your uploaded images')
        );
        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(
          expect.stringContaining('2. Store them temporarily')
        );
        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(
          expect.stringContaining('3. Open the analysis prompt with image URLs included')
        );
      });
    });

    describe('Error Handling', () => {
      const repository = createMockRepository('owner/repo');
      const validSession = {
        userId: 'user123',
        repository
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
        mockImageServiceClient.isAvailable.mockReturnValue(true);
      });

      it('should handle session service update errors', async () => {
        const interaction = createMockInteraction() as any;
        const updateError = new Error('Session update failed');

        mockSessionService.updateSession.mockImplementation(() => {
          throw updateError;
        });

        await handler.onAddImages([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle add images: Session update failed', updateError);
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to initialize image upload. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.update).not.toHaveBeenCalled();
      });

      it('should handle embed creation errors', async () => {
        const interaction = createMockInteraction() as any;
        const embedError = new Error('Embed creation failed');

        // Mock setTitle to throw an error during embed creation
        mockEmbedBuilder.setTitle.mockImplementation(() => {
          throw embedError;
        });

        await handler.onAddImages([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle add images: Embed creation failed', embedError);
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to initialize image upload. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should handle interaction update errors', async () => {
        const interaction = createMockInteraction() as any;
        const updateError = new Error('Interaction update failed');

        // Ensure other operations succeed but update fails
        mockEmbedBuilder.setTitle.mockReturnThis();
        interaction.update.mockRejectedValue(updateError);

        await handler.onAddImages([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle add images: Interaction update failed', updateError);
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to initialize image upload. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should handle general unexpected errors', async () => {
        const interaction = createMockInteraction() as any;
        const unexpectedError = new Error('Unexpected error');

        // Mock logger to throw during the first log call
        handler['logger'].log = jest.fn().mockImplementation(() => {
          throw unexpectedError;
        });

        await handler.onAddImages([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle add images: Unexpected error', unexpectedError);
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to initialize image upload. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
      });
    });

    describe('Different Repository Configurations', () => {
      beforeEach(() => {
        mockImageServiceClient.isAvailable.mockReturnValue(true);
        // Reset all mock builder methods
        Object.values(mockEmbedBuilder).forEach(mock => {
          if (typeof mock === 'function') {
            mock.mockReturnThis();
          }
        });
      });

      it('should handle repository with different names', async () => {
        const repository = createMockRepository('facebook/react');
        const validSession = {
          userId: 'user123',
          repository
        } as any;

        mockSessionService.getSession.mockReturnValue(validSession);

        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(
          expect.stringContaining('**Repository:** react')
        );
        expect(handler['logger'].log).toHaveBeenCalledWith('Image upload waiting state set for facebook/react');
      });

      it('should handle repository with complex names', async () => {
        const repository = createMockRepository('microsoft/typescript-eslint-config');
        const validSession = {
          userId: 'user123',
          repository
        } as any;

        mockSessionService.getSession.mockReturnValue(validSession);

        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(
          expect.stringContaining('**Repository:** typescript-eslint-config')
        );
        expect(handler['logger'].log).toHaveBeenCalledWith('Image upload waiting state set for microsoft/typescript-eslint-config');
      });
    });

    describe('User Information Variations', () => {
      const repository = createMockRepository('owner/repo');
      const validSession = {
        userId: 'user123',
        repository
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
        mockImageServiceClient.isAvailable.mockReturnValue(true);
      });

      it('should handle different user IDs correctly', async () => {
        const interaction = createMockInteraction({
          userId: 'user789',
          userTag: 'newuser#9999'
        }) as any;

        const userSession = {
          userId: 'user789',
          repository
        } as any;

        mockSessionService.getSession.mockReturnValue(userSession);
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user789');
        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user789', expect.any(Object));
        expect(handler['logger'].log).toHaveBeenCalledWith('User newuser#9999 (user789) chose to add images');
      });

      it('should handle user without discriminator', async () => {
        const interaction = createMockInteraction({
          userId: 'user456',
          userTag: 'simpleuser'
        }) as any;

        const userSession = {
          userId: 'user456',
          repository
        } as any;

        mockSessionService.getSession.mockReturnValue(userSession);
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('User simpleuser (user456) chose to add images');
      });
    });

    describe('State Reset Behavior', () => {
      const repository = createMockRepository('owner/repo');
      const validSession = {
        userId: 'user123',
        repository,
        uploadedImages: [
          { id: 'img1', url: 'https://example.com/img1.png' },
          { id: 'img2', url: 'https://example.com/img2.png' }
        ]
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
        mockImageServiceClient.isAvailable.mockReturnValue(true);
      });

      it('should reset uploaded images when initializing new upload', async () => {
        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onAddImages([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          action: 'claude_awaiting_images',
          awaitingImages: true,
          uploadedImages: [] // Should be reset to empty array
        });
      });
    });
  });
});