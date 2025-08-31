import { ImageServiceCommand } from '@/commands/debug/image-service.command';
import { ImageServiceClient } from '@/services/image-service/image-service.client';
import { LoggerFactory } from '@claude-code/shared';
import { EmbedBuilder, Colors } from 'discord.js';

// Mock Discord.js components
const mockInteraction = {
  user: {
    id: 'user123',
    tag: 'testuser#1234'
  },
  deferReply: jest.fn(),
  editReply: jest.fn()
} as any;

// Mock LoggerFactory
const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn()
};

const mockLoggerFactory = {
  createLogger: jest.fn().mockReturnValue(mockLogger)
} as unknown as jest.Mocked<LoggerFactory>;

// Mock ImageServiceClient
const mockImageServiceClient = {
  getDiagnosticInfo: jest.fn(),
  testConnection: jest.fn(),
  getHealth: jest.fn()
} as unknown as jest.Mocked<ImageServiceClient>;

// Mock EmbedBuilder
const mockEmbedBuilder = {
  setTitle: jest.fn().mockReturnThis(),
  setColor: jest.fn().mockReturnThis(),
  setTimestamp: jest.fn().mockReturnThis(),
  addFields: jest.fn().mockReturnThis(),
  spliceFields: jest.fn().mockReturnThis(),
  setDescription: jest.fn().mockReturnThis()
};

jest.mock('discord.js', () => ({
  ...jest.requireActual('discord.js'),
  EmbedBuilder: jest.fn().mockImplementation(() => mockEmbedBuilder),
  Colors: {
    Green: 0x00ff00,
    Red: 0xff0000
  }
}));

describe('ImageServiceCommand', () => {
  let command: ImageServiceCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock embed builder calls
    mockEmbedBuilder.setTitle.mockClear();
    mockEmbedBuilder.setColor.mockClear();
    mockEmbedBuilder.setTimestamp.mockClear();
    mockEmbedBuilder.addFields.mockClear();
    mockEmbedBuilder.spliceFields.mockClear();
    mockEmbedBuilder.setDescription.mockClear();
    
    // Reset interaction mock
    mockInteraction.deferReply.mockClear();
    mockInteraction.editReply.mockClear();
    
    // Reset service mocks to default behavior
    mockInteraction.deferReply.mockResolvedValue(undefined);
    mockInteraction.editReply.mockResolvedValue(undefined);
    
    command = new ImageServiceCommand(mockLoggerFactory, mockImageServiceClient);
  });

  describe('Constructor', () => {
    it('should initialize with correct service name and dependencies', () => {
      expect(command).toBeDefined();
      expect(command['imageServiceClient']).toBe(mockImageServiceClient);
    });

    it('should extend BaseService', () => {
      expect(command).toBeDefined();
      // Check if it has BaseService properties/methods
      expect(typeof command['logger']).toBe('object');
    });

    it('should initialize logger through LoggerFactory', () => {
      expect(mockLoggerFactory.createLogger).toHaveBeenCalledWith('ImageServiceCommand');
    });
  });

  describe('onDebugImageService', () => {
    describe('Initial Setup', () => {
      it('should log user information', async () => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          isAvailable: true,
          baseUrl: 'http://localhost:3001',
          hasApiKey: true,
          apiKeyPrefix: 'test-key-***',
          timeout: 5000
        });

        await command.onDebugImageService([mockInteraction]);

        expect(mockLogger.log).toHaveBeenCalledWith(
          'User testuser#1234 (user123) testing image service',
          'onDebugImageService'
        );
      });

      it('should defer reply with ephemeral flag', async () => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          isAvailable: true,
          baseUrl: 'http://localhost:3001',
          hasApiKey: true,
          apiKeyPrefix: 'test-key-***',
          timeout: 5000
        });

        await command.onDebugImageService([mockInteraction]);

        expect(mockInteraction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
      });

      it('should call getDiagnosticInfo to get service status', async () => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          isAvailable: true,
          baseUrl: 'http://localhost:3001',
          hasApiKey: true,
          apiKeyPrefix: 'test-key-***',
          timeout: 5000
        });

        await command.onDebugImageService([mockInteraction]);

        expect(mockImageServiceClient.getDiagnosticInfo).toHaveBeenCalledTimes(1);
      });
    });

    describe('Service Available - Configuration Display', () => {
      beforeEach(() => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          isAvailable: true,
          baseUrl: 'http://localhost:3001',
          hasApiKey: true,
          apiKeyPrefix: 'test-key-***',
          timeout: 5000
        });
      });

      it('should create embed with correct title and green color when service is available', async () => {
        await command.onDebugImageService([mockInteraction]);

        expect(EmbedBuilder).toHaveBeenCalledTimes(1);
        expect(mockEmbedBuilder.setTitle).toHaveBeenCalledWith('🔍 Image Service Diagnostics');
        expect(mockEmbedBuilder.setColor).toHaveBeenCalledWith(Colors.Green);
        expect(mockEmbedBuilder.setTimestamp).toHaveBeenCalledTimes(1);
      });

      it('should add configuration field with diagnostic information', async () => {
        await command.onDebugImageService([mockInteraction]);

        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith([
          {
            name: '⚙️ Configuration',
            value: [
              '**Base URL:** http://localhost:3001',
              '**Has API Key:** ✅',
              '**API Key Preview:** test-key-***',
              '**Timeout:** 5000ms',
              '**Is Available:** ✅'
            ].join('\n'),
            inline: false
          }
        ]);
      });

      it('should handle missing API key in configuration display', async () => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: false,
          isAvailable: false,
          baseUrl: 'http://localhost:3001',
          hasApiKey: false,
          apiKeyPrefix: 'none',
          timeout: 5000
        });

        await command.onDebugImageService([mockInteraction]);

        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith([
          {
            name: '⚙️ Configuration',
            value: expect.stringContaining('**Has API Key:** ❌'),
            inline: false
          }
        ]);
      });
    });

    describe('Service Not Available', () => {
      beforeEach(() => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: false,
          isAvailable: false,
          baseUrl: 'http://localhost:3001',
          hasApiKey: false,
          apiKeyPrefix: 'none',
          timeout: 5000
        });
      });

      it('should create embed with red color when service is not available', async () => {
        await command.onDebugImageService([mockInteraction]);

        expect(mockEmbedBuilder.setColor).toHaveBeenCalledWith(Colors.Red);
      });

      it('should add service not available field with troubleshooting info', async () => {
        await command.onDebugImageService([mockInteraction]);

        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith([
          {
            name: '❌ Service Not Available',
            value: [
              'The image service is not properly configured.',
              '**Possible issues:**',
              '• Missing DISCORD_BOT_API_KEY environment variable',
              '• Missing IMAGE_SERVICE_BASE_URL environment variable',
              '• Image service is not running'
            ].join('\n'),
            inline: false
          }
        ]);
      });

      it('should not test connection when service is not available', async () => {
        await command.onDebugImageService([mockInteraction]);

        expect(mockImageServiceClient.testConnection).not.toHaveBeenCalled();
        expect(mockImageServiceClient.getHealth).not.toHaveBeenCalled();
      });

      it('should edit reply only once when service is not available', async () => {
        await command.onDebugImageService([mockInteraction]);

        expect(mockInteraction.editReply).toHaveBeenCalledTimes(1);
        expect(mockInteraction.editReply).toHaveBeenCalledWith({
          embeds: [mockEmbedBuilder]
        });
      });
    });

    describe('Service Available - Connection Testing', () => {
      beforeEach(() => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          isAvailable: true,
          baseUrl: 'http://localhost:3001',
          hasApiKey: true,
          apiKeyPrefix: 'test-key-***',
          timeout: 5000
        });
      });

      it('should add testing connection field initially', async () => {
        mockImageServiceClient.testConnection.mockResolvedValue(true);
        mockImageServiceClient.getHealth.mockResolvedValue({
          status: 'healthy',
          uptime: 123456,
          version: '1.0.0',
          environment: 'production'
        });

        await command.onDebugImageService([mockInteraction]);

        // Should be called twice: once for adding "Testing Connection..." and later for other fields
        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith([
          {
            name: '🔄 Testing Connection...',
            value: 'Attempting to connect to image service...',
            inline: false
          }
        ]);
      });

      it('should edit reply twice when testing connection (progress + final)', async () => {
        mockImageServiceClient.testConnection.mockResolvedValue(true);
        mockImageServiceClient.getHealth.mockResolvedValue({
          status: 'healthy',
          uptime: 123456,
          version: '1.0.0',
          environment: 'production'
        });

        await command.onDebugImageService([mockInteraction]);

        expect(mockInteraction.editReply).toHaveBeenCalledTimes(2);
      });
    });

    describe('Connection Test Successful', () => {
      beforeEach(() => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          isAvailable: true,
          baseUrl: 'http://localhost:3001',
          hasApiKey: true,
          apiKeyPrefix: 'test-key-***',
          timeout: 5000
        });
        mockImageServiceClient.testConnection.mockResolvedValue(true);
      });

      it('should remove testing connection field and add success field', async () => {
        mockImageServiceClient.getHealth.mockResolvedValue({
          status: 'healthy',
          uptime: 123456,
          version: '1.0.0',
          environment: 'production'
        });

        await command.onDebugImageService([mockInteraction]);

        expect(mockEmbedBuilder.spliceFields).toHaveBeenCalledWith(-1, 1);
        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith([
          {
            name: '✅ Connection Test',
            value: 'Successfully connected to image service!',
            inline: false
          }
        ]);
      });

      it('should add health status when health check succeeds', async () => {
        const mockHealth = {
          status: 'healthy',
          uptime: 123456,
          version: '1.0.0',
          environment: 'production'
        };
        mockImageServiceClient.getHealth.mockResolvedValue(mockHealth);

        await command.onDebugImageService([mockInteraction]);

        expect(mockImageServiceClient.getHealth).toHaveBeenCalledTimes(1);
        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith([
          {
            name: '💚 Health Status',
            value: [
              '**Status:** healthy',
              '**Uptime:** 123s',
              '**Version:** 1.0.0',
              '**Environment:** production'
            ].join('\n'),
            inline: false
          }
        ]);
      });

      it('should handle health check with missing properties', async () => {
        const mockHealth = {
          status: 'healthy'
          // Missing uptime, version, environment
        };
        mockImageServiceClient.getHealth.mockResolvedValue(mockHealth);

        await command.onDebugImageService([mockInteraction]);

        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith([
          {
            name: '💚 Health Status',
            value: [
              '**Status:** healthy',
              '**Uptime:** unknown',
              '**Version:** unknown',
              '**Environment:** unknown'
            ].join('\n'),
            inline: false
          }
        ]);
      });

      it('should handle health check failure', async () => {
        const healthError = new Error('Health check failed');
        mockImageServiceClient.getHealth.mockRejectedValue(healthError);

        await command.onDebugImageService([mockInteraction]);

        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith([
          {
            name: '⚠️ Health Check',
            value: 'Could not retrieve health info: Health check failed',
            inline: false
          }
        ]);
      });
    });

    describe('Connection Test Failed', () => {
      beforeEach(() => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          isAvailable: true,
          baseUrl: 'http://localhost:3001',
          hasApiKey: true,
          apiKeyPrefix: 'test-key-***',
          timeout: 5000
        });
        mockImageServiceClient.testConnection.mockResolvedValue(false);
      });

      it('should remove testing field and add failure field when connection test fails', async () => {
        await command.onDebugImageService([mockInteraction]);

        expect(mockEmbedBuilder.spliceFields).toHaveBeenCalledWith(-1, 1);
        expect(mockEmbedBuilder.setColor).toHaveBeenCalledWith(Colors.Red);
        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith([
          {
            name: '❌ Connection Test Failed',
            value: [
              'Could not connect to image service.',
              '**Possible causes:**',
              '• Image service is not running',
              '• Wrong base URL configuration',
              '• Network connectivity issues',
              '• Authentication problems'
            ].join('\n'),
            inline: false
          }
        ]);
      });

      it('should not attempt health check when connection test fails', async () => {
        await command.onDebugImageService([mockInteraction]);

        expect(mockImageServiceClient.getHealth).not.toHaveBeenCalled();
      });
    });

    describe('Connection Test Error', () => {
      beforeEach(() => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          isAvailable: true,
          baseUrl: 'http://localhost:3001',
          hasApiKey: true,
          apiKeyPrefix: 'test-key-***',
          timeout: 5000
        });
      });

      it('should handle connection test throwing an error', async () => {
        const connectionError = new Error('Network timeout');
        mockImageServiceClient.testConnection.mockRejectedValue(connectionError);

        await command.onDebugImageService([mockInteraction]);

        expect(mockEmbedBuilder.spliceFields).toHaveBeenCalledWith(-1, 1);
        expect(mockEmbedBuilder.setColor).toHaveBeenCalledWith(Colors.Red);
        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith([
          {
            name: '💥 Connection Error',
            value: [
              '**Error:** Network timeout',
              '**Possible causes:**',
              '• Invalid API key',
              '• Authentication failure (401)',
              '• Service unavailable (503)',
              '• Network timeout'
            ].join('\n'),
            inline: false
          }
        ]);
      });

      it('should log detailed error information for connection failures', async () => {
        const connectionError = new Error('Network timeout');
        (connectionError as any).stack = 'Error stack trace';
        (connectionError as any).details = { code: 'NETWORK_ERROR' };
        (connectionError as any).cause = 'DNS resolution failed';
        
        mockImageServiceClient.testConnection.mockRejectedValue(connectionError);

        await command.onDebugImageService([mockInteraction]);

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Image service connection test failed during debug command:',
          {
            error: 'Network timeout',
            stack: 'Error stack trace',
            details: { code: 'NETWORK_ERROR' },
            cause: 'DNS resolution failed'
          }
        );
      });
    });

    describe('General Error Handling', () => {
      it('should handle getDiagnosticInfo throwing an error', async () => {
        const diagnosticError = new Error('Diagnostic failed');
        mockImageServiceClient.getDiagnosticInfo.mockImplementation(() => {
          throw diagnosticError;
        });

        await command.onDebugImageService([mockInteraction]);

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error during image service debug command:',
          diagnosticError
        );

        expect(EmbedBuilder).toHaveBeenCalledTimes(1); // Only error embed since diagnostic failed
        expect(mockEmbedBuilder.setTitle).toHaveBeenCalledWith('💥 Debug Command Error');
        expect(mockEmbedBuilder.setColor).toHaveBeenCalledWith(Colors.Red);
        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(
          'An error occurred while testing the image service: Diagnostic failed'
        );
        expect(mockEmbedBuilder.setTimestamp).toHaveBeenCalledTimes(1);
      });

      it('should handle interaction.deferReply throwing an error', async () => {
        const deferError = new Error('Defer failed');
        mockInteraction.deferReply.mockRejectedValue(deferError);

        await expect(command.onDebugImageService([mockInteraction])).rejects.toThrow('Defer failed');
      });

      it('should handle interaction.editReply throwing an error during success flow', async () => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          isAvailable: true,
          baseUrl: 'http://localhost:3001',
          hasApiKey: true,
          apiKeyPrefix: 'test-key-***',
          timeout: 5000
        });
        
        const editError = new Error('Edit failed');
        mockInteraction.editReply.mockRejectedValue(editError);

        await expect(command.onDebugImageService([mockInteraction])).rejects.toThrow('Edit failed');
      });
    });

    describe('User Information Variations', () => {
      beforeEach(() => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          isAvailable: true,
          baseUrl: 'http://localhost:3001',
          hasApiKey: true,
          apiKeyPrefix: 'test-key-***',
          timeout: 5000
        });
      });

      it('should handle different user information', async () => {
        const differentUser = {
          user: {
            id: 'user456',
            tag: 'anotheruser#5678'
          },
          deferReply: jest.fn().mockResolvedValue(undefined),
          editReply: jest.fn().mockResolvedValue(undefined)
        } as any;

        await command.onDebugImageService([differentUser]);

        expect(mockLogger.log).toHaveBeenCalledWith(
          'User anotheruser#5678 (user456) testing image service',
          'onDebugImageService'
        );
      });

      it('should handle user without tag', async () => {
        const userWithoutTag = {
          user: {
            id: 'user789',
            tag: null
          },
          deferReply: jest.fn().mockResolvedValue(undefined),
          editReply: jest.fn().mockResolvedValue(undefined)
        } as any;

        await command.onDebugImageService([userWithoutTag]);

        expect(mockLogger.log).toHaveBeenCalledWith(
          'User null (user789) testing image service',
          'onDebugImageService'
        );
      });
    });

    describe('Integration Scenarios', () => {
      it('should handle complete successful workflow', async () => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          isAvailable: true,
          baseUrl: 'http://localhost:3001',
          hasApiKey: true,
          apiKeyPrefix: 'test-key-***',
          timeout: 5000
        });
        mockImageServiceClient.testConnection.mockResolvedValue(true);
        mockImageServiceClient.getHealth.mockResolvedValue({
          status: 'healthy',
          uptime: 123456,
          version: '1.0.0',
          environment: 'production'
        });

        await command.onDebugImageService([mockInteraction]);

        // Verify complete flow
        expect(mockLogger.log).toHaveBeenCalledTimes(1);
        expect(mockInteraction.deferReply).toHaveBeenCalledTimes(1);
        expect(mockImageServiceClient.getDiagnosticInfo).toHaveBeenCalledTimes(1);
        expect(mockImageServiceClient.testConnection).toHaveBeenCalledTimes(1);
        expect(mockImageServiceClient.getHealth).toHaveBeenCalledTimes(1);
        expect(mockInteraction.editReply).toHaveBeenCalledTimes(2);
      });

      it('should handle service not available workflow', async () => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: false,
          isAvailable: false,
          baseUrl: 'http://localhost:3001',
          hasApiKey: false,
          apiKeyPrefix: 'none',
          timeout: 5000
        });

        await command.onDebugImageService([mockInteraction]);

        // Verify flow for unavailable service
        expect(mockLogger.log).toHaveBeenCalledTimes(1);
        expect(mockInteraction.deferReply).toHaveBeenCalledTimes(1);
        expect(mockImageServiceClient.getDiagnosticInfo).toHaveBeenCalledTimes(1);
        expect(mockImageServiceClient.testConnection).not.toHaveBeenCalled();
        expect(mockImageServiceClient.getHealth).not.toHaveBeenCalled();
        expect(mockInteraction.editReply).toHaveBeenCalledTimes(1);
        expect(mockEmbedBuilder.setColor).toHaveBeenCalledWith(Colors.Red);
      });

      it('should handle connection test failure workflow', async () => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          isAvailable: true,
          baseUrl: 'http://localhost:3001',
          hasApiKey: true,
          apiKeyPrefix: 'test-key-***',
          timeout: 5000
        });
        mockImageServiceClient.testConnection.mockResolvedValue(false);

        await command.onDebugImageService([mockInteraction]);

        // Verify flow for failed connection
        expect(mockImageServiceClient.testConnection).toHaveBeenCalledTimes(1);
        expect(mockImageServiceClient.getHealth).not.toHaveBeenCalled();
        expect(mockEmbedBuilder.setColor).toHaveBeenCalledWith(Colors.Red);
        expect(mockEmbedBuilder.spliceFields).toHaveBeenCalledWith(-1, 1);
      });
    });
  });
});