import { CancelButtonHandler } from '@/interactions/buttons/cancel.button';
import { SessionService } from '@/services/session.service';
import { CUSTOM_IDS } from '@/utils/discord.constants';
import { MESSAGES } from '@/utils/messages.constants';

// Mock Necord
jest.mock('necord', () => ({
  Context: () => () => ({}),
  Button: () => () => ({}),
  ButtonContext: {}
}));

// Mock Discord.js
jest.mock('discord.js', () => ({
  // Mock any Discord.js exports that might be needed
}));

// Mock Discord.js components
const mockInteraction = {
  user: {
    id: 'user123',
    tag: 'testuser#1234'
  },
  customId: CUSTOM_IDS.CANCEL,
  update: jest.fn()
} as any;

// Mock SessionService
const mockSessionService = {
  deleteSession: jest.fn()
} as unknown as jest.Mocked<SessionService>;

describe('CancelButtonHandler', () => {
  let handler: CancelButtonHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset interaction mock
    mockInteraction.update.mockClear();
    mockInteraction.customId = CUSTOM_IDS.CANCEL;
    
    // Reset service mock
    mockSessionService.deleteSession.mockImplementation(() => {});
    mockInteraction.update.mockResolvedValue(undefined);
    
    handler = new CancelButtonHandler(mockSessionService);

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
  });

  describe('Constructor', () => {
    it('should initialize with correct service name and dependencies', () => {
      expect(handler).toBeDefined();
      expect(handler['sessionService']).toBe(mockSessionService);
    });

    it('should extend BaseService', () => {
      expect(handler).toBeDefined();
      // Check if it has BaseService properties/methods
      expect(typeof handler['logger']).toBe('object');
    });
  });

  describe('onCancel', () => {
    describe('Valid Cancel Operations', () => {
      it('should handle basic cancel button interaction', async () => {
        await handler.onCancel([mockInteraction]);

        expect(handler['logger'].log).toHaveBeenCalledWith(
          `Cancel button handler triggered: ${CUSTOM_IDS.CANCEL} by user: testuser#1234 (user123)`
        );
        expect(mockSessionService.deleteSession).toHaveBeenCalledWith('user123');
        expect(mockInteraction.update).toHaveBeenCalledWith({
          content: MESSAGES.OPERATION_CANCELLED,
          embeds: [],
          components: []
        });
      });

      it('should handle cancel with custom ID that starts with cancel', async () => {
        mockInteraction.customId = 'cancel-workflow';

        await handler.onCancel([mockInteraction]);

        expect(handler['logger'].log).toHaveBeenCalledWith(
          'Cancel button handler triggered: cancel-workflow by user: testuser#1234 (user123)'
        );
        expect(mockSessionService.deleteSession).toHaveBeenCalledWith('user123');
        expect(mockInteraction.update).toHaveBeenCalledWith({
          content: MESSAGES.OPERATION_CANCELLED,
          embeds: [],
          components: []
        });
      });

      it('should handle cancel with extended custom ID', async () => {
        mockInteraction.customId = 'cancel-claude-prompt';

        await handler.onCancel([mockInteraction]);

        expect(handler['logger'].log).toHaveBeenCalledWith(
          'Cancel button handler triggered: cancel-claude-prompt by user: testuser#1234 (user123)'
        );
        expect(mockSessionService.deleteSession).toHaveBeenCalledWith('user123');
        expect(mockInteraction.update).toHaveBeenCalledTimes(1);
      });

      it('should extract correct user ID from interaction', async () => {
        const differentUser = {
          user: {
            id: 'user456',
            tag: 'anotheruser#5678'
          },
          customId: CUSTOM_IDS.CANCEL,
          update: jest.fn().mockResolvedValue(undefined)
        } as any;

        await handler.onCancel([differentUser]);

        expect(mockSessionService.deleteSession).toHaveBeenCalledWith('user456');
        expect(handler['logger'].log).toHaveBeenCalledWith(
          `Cancel button handler triggered: ${CUSTOM_IDS.CANCEL} by user: anotheruser#5678 (user456)`
        );
      });
    });

    describe('Invalid Custom IDs', () => {
      it('should return early when custom ID does not start with cancel', async () => {
        mockInteraction.customId = 'workflow-status';

        await handler.onCancel([mockInteraction]);

        expect(handler['logger'].log).not.toHaveBeenCalled();
        expect(mockSessionService.deleteSession).not.toHaveBeenCalled();
        expect(mockInteraction.update).not.toHaveBeenCalled();
      });

      it('should return early when custom ID is empty', async () => {
        mockInteraction.customId = '';

        await handler.onCancel([mockInteraction]);

        expect(handler['logger'].log).not.toHaveBeenCalled();
        expect(mockSessionService.deleteSession).not.toHaveBeenCalled();
        expect(mockInteraction.update).not.toHaveBeenCalled();
      });

      it('should throw error when custom ID is null', async () => {
        mockInteraction.customId = null;

        await expect(handler.onCancel([mockInteraction])).rejects.toThrow();

        expect(handler['logger'].log).not.toHaveBeenCalled();
        expect(mockSessionService.deleteSession).not.toHaveBeenCalled();
        expect(mockInteraction.update).not.toHaveBeenCalled();
      });

      it('should return early when custom ID partially matches but does not start with cancel', async () => {
        mockInteraction.customId = 'some-cancel-action';

        await handler.onCancel([mockInteraction]);

        expect(handler['logger'].log).not.toHaveBeenCalled();
        expect(mockSessionService.deleteSession).not.toHaveBeenCalled();
        expect(mockInteraction.update).not.toHaveBeenCalled();
      });
    });

    describe('User Information Variations', () => {
      it('should handle user without tag', async () => {
        const userWithoutTag = {
          user: {
            id: 'user789',
            tag: null
          },
          customId: CUSTOM_IDS.CANCEL,
          update: jest.fn().mockResolvedValue(undefined)
        } as any;

        await handler.onCancel([userWithoutTag]);

        expect(handler['logger'].log).toHaveBeenCalledWith(
          `Cancel button handler triggered: ${CUSTOM_IDS.CANCEL} by user: null (user789)`
        );
        expect(mockSessionService.deleteSession).toHaveBeenCalledWith('user789');
      });

      it('should handle user with undefined tag', async () => {
        const userWithUndefinedTag = {
          user: {
            id: 'user999',
            tag: undefined
          },
          customId: CUSTOM_IDS.CANCEL,
          update: jest.fn().mockResolvedValue(undefined)
        } as any;

        await handler.onCancel([userWithUndefinedTag]);

        expect(handler['logger'].log).toHaveBeenCalledWith(
          `Cancel button handler triggered: ${CUSTOM_IDS.CANCEL} by user: undefined (user999)`
        );
      });

      it('should handle user with special characters in tag', async () => {
        const specialUser = {
          user: {
            id: 'user111',
            tag: 'special@user#1234'
          },
          customId: CUSTOM_IDS.CANCEL,
          update: jest.fn().mockResolvedValue(undefined)
        } as any;

        await handler.onCancel([specialUser]);

        expect(handler['logger'].log).toHaveBeenCalledWith(
          `Cancel button handler triggered: ${CUSTOM_IDS.CANCEL} by user: special@user#1234 (user111)`
        );
      });
    });

    describe('Update Response Verification', () => {
      it('should clear all embeds and components in response', async () => {
        await handler.onCancel([mockInteraction]);

        expect(mockInteraction.update).toHaveBeenCalledWith({
          content: MESSAGES.OPERATION_CANCELLED,
          embeds: [],
          components: []
        });
      });

      it('should use the correct cancellation message', async () => {
        await handler.onCancel([mockInteraction]);

        const updateCall = mockInteraction.update.mock.calls[0][0];
        expect(updateCall.content).toBe(MESSAGES.OPERATION_CANCELLED);
        expect(updateCall.embeds).toEqual([]);
        expect(updateCall.components).toEqual([]);
      });

      it('should call update exactly once for valid interactions', async () => {
        await handler.onCancel([mockInteraction]);

        expect(mockInteraction.update).toHaveBeenCalledTimes(1);
      });
    });

    describe('Error Handling', () => {
      it('should handle session service throwing an error', async () => {
        const sessionError = new Error('Session deletion failed');
        mockSessionService.deleteSession.mockImplementation(() => {
          throw sessionError;
        });

        await expect(handler.onCancel([mockInteraction])).rejects.toThrow('Session deletion failed');
        
        // Verify that logging still occurred before the error
        expect(handler['logger'].log).toHaveBeenCalledWith(
          `Cancel button handler triggered: ${CUSTOM_IDS.CANCEL} by user: testuser#1234 (user123)`
        );
        
        // Verify that update was not called due to the error
        expect(mockInteraction.update).not.toHaveBeenCalled();
      });

      it('should handle interaction update throwing an error', async () => {
        const updateError = new Error('Discord API error');
        mockInteraction.update.mockRejectedValue(updateError);

        await expect(handler.onCancel([mockInteraction])).rejects.toThrow('Discord API error');

        // Verify that session was still deleted
        expect(mockSessionService.deleteSession).toHaveBeenCalledWith('user123');
        expect(handler['logger'].log).toHaveBeenCalledWith(
          `Cancel button handler triggered: ${CUSTOM_IDS.CANCEL} by user: testuser#1234 (user123)`
        );
      });

      it('should handle interaction with missing user id', async () => {
        const incompleteInteraction = {
          user: {
            // Missing id
            tag: 'testuser#1234'
          },
          customId: CUSTOM_IDS.CANCEL,
          update: jest.fn().mockResolvedValue(undefined)
        } as any;

        // The code will try to use undefined as userId
        await handler.onCancel([incompleteInteraction]);
        
        expect(mockSessionService.deleteSession).toHaveBeenCalledWith(undefined);
        expect(handler['logger'].log).toHaveBeenCalledWith(
          `Cancel button handler triggered: ${CUSTOM_IDS.CANCEL} by user: testuser#1234 (undefined)`
        );
      });
    });

    describe('Service Method Call Verification', () => {
      it('should call each service method exactly once', async () => {
        await handler.onCancel([mockInteraction]);

        expect(handler['logger'].log).toHaveBeenCalledTimes(1);
        expect(mockSessionService.deleteSession).toHaveBeenCalledTimes(1);
        expect(mockInteraction.update).toHaveBeenCalledTimes(1);
      });

      it('should call all required methods for valid interactions', async () => {
        await handler.onCancel([mockInteraction]);

        expect(handler['logger'].log).toHaveBeenCalled();
        expect(mockSessionService.deleteSession).toHaveBeenCalled();
        expect(mockInteraction.update).toHaveBeenCalled();
      });
    });

    describe('Custom ID Pattern Matching', () => {
      it('should match exact cancel custom ID', async () => {
        mockInteraction.customId = 'cancel';

        await handler.onCancel([mockInteraction]);

        expect(mockSessionService.deleteSession).toHaveBeenCalled();
      });

      it('should match cancel with hyphen prefix', async () => {
        mockInteraction.customId = 'cancel-something';

        await handler.onCancel([mockInteraction]);

        expect(mockSessionService.deleteSession).toHaveBeenCalled();
      });

      it('should match cancel with underscore prefix', async () => {
        mockInteraction.customId = 'cancel_operation';

        await handler.onCancel([mockInteraction]);

        expect(mockSessionService.deleteSession).toHaveBeenCalled();
      });

      it('should not match custom IDs that contain cancel but do not start with it', async () => {
        const nonMatchingIds = [
          'operation-cancel',
          'pre-cancel-action',
          'workflow-cancel-button',
          'some-cancel',
          'xcancelaction'
        ];

        for (const customId of nonMatchingIds) {
          mockInteraction.customId = customId;
          mockSessionService.deleteSession.mockClear();
          mockInteraction.update.mockClear();

          await handler.onCancel([mockInteraction]);

          expect(mockSessionService.deleteSession).not.toHaveBeenCalled();
          expect(mockInteraction.update).not.toHaveBeenCalled();
        }
      });
    });

    describe('Integration Scenarios', () => {
      it('should handle complete cancellation workflow', async () => {
        await handler.onCancel([mockInteraction]);

        // Verify complete flow
        expect(handler['logger'].log).toHaveBeenCalledWith(
          `Cancel button handler triggered: ${CUSTOM_IDS.CANCEL} by user: testuser#1234 (user123)`
        );
        expect(mockSessionService.deleteSession).toHaveBeenCalledWith('user123');
        expect(mockInteraction.update).toHaveBeenCalledWith({
          content: MESSAGES.OPERATION_CANCELLED,
          embeds: [],
          components: []
        });
      });

      it('should handle multiple sequential cancel operations', async () => {
        const user1 = { ...mockInteraction, user: { id: 'user1', tag: 'user1#1' } };
        const user2 = { ...mockInteraction, user: { id: 'user2', tag: 'user2#2' } };

        await handler.onCancel([user1]);
        await handler.onCancel([user2]);

        expect(mockSessionService.deleteSession).toHaveBeenCalledTimes(2);
        expect(mockSessionService.deleteSession).toHaveBeenCalledWith('user1');
        expect(mockSessionService.deleteSession).toHaveBeenCalledWith('user2');
      });

      it('should handle rapid consecutive cancellations from same user', async () => {
        await handler.onCancel([mockInteraction]);
        await handler.onCancel([mockInteraction]);

        expect(mockSessionService.deleteSession).toHaveBeenCalledTimes(2);
        expect(mockSessionService.deleteSession).toHaveBeenNthCalledWith(1, 'user123');
        expect(mockSessionService.deleteSession).toHaveBeenNthCalledWith(2, 'user123');
      });
    });
  });
});