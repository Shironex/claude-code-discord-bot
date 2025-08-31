import 'reflect-metadata';

// Global test setup for Discord Bot testing

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DISCORD_TOKEN = 'test-discord-token';
process.env.GITHUB_TOKEN = 'test-github-token';
process.env.GITHUB_USERNAME = 'test-user';
process.env.LOG_LEVEL = 'error'; // Reduce logging noise in tests

// Global mocks for external dependencies
jest.mock('discord.js', () => {
  const mockClient = {
    login: jest.fn(),
    on: jest.fn(),
    channels: {
      fetch: jest.fn(),
    },
    destroy: jest.fn(),
  };

  const mockInteraction = {
    user: { id: 'test-user-id' },
    reply: jest.fn(),
    editReply: jest.fn(),
    followUp: jest.fn(),
    deferReply: jest.fn(),
    isRepliable: () => true,
  };

  return {
    Client: jest.fn(() => mockClient),
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
      MessageContent: 4,
    },
    EmbedBuilder: jest.fn().mockImplementation(() => ({
      setTitle: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setColor: jest.fn().mockReturnThis(),
      setAuthor: jest.fn().mockReturnThis(),
      addFields: jest.fn().mockReturnThis(),
      setTimestamp: jest.fn().mockReturnThis(),
    })),
    ButtonBuilder: jest.fn().mockImplementation(() => ({
      setCustomId: jest.fn().mockReturnThis(),
      setLabel: jest.fn().mockReturnThis(),
      setStyle: jest.fn().mockReturnThis(),
      setEmoji: jest.fn().mockReturnThis(),
      setDisabled: jest.fn().mockReturnThis(),
    })),
    ActionRowBuilder: jest.fn().mockImplementation(() => ({
      addComponents: jest.fn().mockReturnThis(),
    })),
    StringSelectMenuBuilder: jest.fn().mockImplementation(() => ({
      setCustomId: jest.fn().mockReturnThis(),
      setPlaceholder: jest.fn().mockReturnThis(),
      addOptions: jest.fn().mockReturnThis(),
      setMaxValues: jest.fn().mockReturnThis(),
      setMinValues: jest.fn().mockReturnThis(),
    })),
    ModalBuilder: jest.fn().mockImplementation(() => ({
      setCustomId: jest.fn().mockReturnThis(),
      setTitle: jest.fn().mockReturnThis(),
      addComponents: jest.fn().mockReturnThis(),
    })),
    TextInputBuilder: jest.fn().mockImplementation(() => ({
      setCustomId: jest.fn().mockReturnThis(),
      setLabel: jest.fn().mockReturnThis(),
      setStyle: jest.fn().mockReturnThis(),
      setRequired: jest.fn().mockReturnThis(),
      setValue: jest.fn().mockReturnThis(),
    })),
    ButtonStyle: {
      Primary: 1,
      Secondary: 2,
      Success: 3,
      Danger: 4,
      Link: 5,
    },
    TextInputStyle: {
      Short: 1,
      Paragraph: 2,
    },
  };
});

// Mock @octokit/rest
jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn(),
          get: jest.fn(),
          getContent: jest.fn(),
        },
        actions: {
          createWorkflowDispatch: jest.fn(),
          listWorkflowRuns: jest.fn(),
          getWorkflowRun: jest.fn(),
        },
        pulls: {
          list: jest.fn(),
        },
        search: {
          repos: jest.fn(),
        },
        users: {
          getAuthenticated: jest.fn(),
        },
      },
    })),
  };
});

// Mock winston-daily-rotate-file
jest.mock('winston-daily-rotate-file', () => {
  return jest.fn().mockImplementation(() => ({
    write: jest.fn(),
  }));
});

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global test utilities
global.createMockDate = (dateString: string) => {
  const mockDate = new Date(dateString);
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
  return mockDate;
};

// Test timeout configuration
jest.setTimeout(30000);