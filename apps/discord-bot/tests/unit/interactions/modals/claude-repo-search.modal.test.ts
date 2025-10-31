import { ClaudeRepoSearchModalHandler } from '@/interactions/modals/claude-repo-search.modal';
import { GitHubService } from '@/services/github.service';
import { WorkflowService } from '@/services/workflow.service';
import { SessionService } from '@/services/session.service';
import { EmbedService } from '@/services/embed.service';
import { CUSTOM_IDS } from '@/utils/discord.constants';
import { MESSAGES } from '@/utils/messages.constants';
import { Repository, PaginatedRepositories } from '@/interfaces/models/repository.interface';
import { MessageFlags, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

// Mock Necord
jest.mock('necord', () => ({
  Context: () => () => ({}),
  Modal: () => () => ({}),
  ModalContext: {}
}));

// Mock Discord.js components
const mockEmbedBuilder = {
  setTitle: jest.fn().mockReturnThis(),
  setColor: jest.fn().mockReturnThis(),
  setDescription: jest.fn().mockReturnThis(),
  setTimestamp: jest.fn().mockReturnThis(),
  addFields: jest.fn().mockReturnThis(),
  setFooter: jest.fn().mockReturnThis()
};

const mockActionRowBuilder = {
  addComponents: jest.fn().mockReturnThis()
};

const mockStringSelectMenuBuilder = {
  setCustomId: jest.fn().mockReturnThis(),
  setPlaceholder: jest.fn().mockReturnThis(),
  addOptions: jest.fn().mockReturnThis()
};

jest.mock('discord.js', () => ({
  ...jest.requireActual('discord.js'),
  EmbedBuilder: jest.fn().mockImplementation(() => mockEmbedBuilder),
  ActionRowBuilder: jest.fn().mockImplementation(() => mockActionRowBuilder),
  StringSelectMenuBuilder: jest.fn().mockImplementation(() => mockStringSelectMenuBuilder),
  MessageFlags: {
    Ephemeral: 64
  }
}));

// Mock utilities
jest.mock('@/utils/discord.utils', () => ({
  DiscordUtils: {
    createRepositorySelectMenu: jest.fn()
  }
}));

// Mock modal interaction
const createMockInteraction = (options: {
  userId?: string;
  userTag?: string;
  searchInput?: string;
} = {}) => ({
  user: {
    id: options.userId || 'user123',
    tag: options.userTag || 'testuser#1234'
  },
  fields: {
    getTextInputValue: jest.fn((fieldId: string) => {
      if (fieldId === CUSTOM_IDS.CLAUDE_REPO_SEARCH_INPUT) {
        return options.searchInput || 'test repo';
      }
      return '';
    })
  },
  reply: jest.fn(),
  deferReply: jest.fn(),
  editReply: jest.fn()
});

// Mock repository data
const createMockRepository = (fullName: string = 'owner/repo'): Repository => ({
  id: Math.floor(Math.random() * 1000),
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
const mockGitHubService = {
  searchRepositories: jest.fn(),
  getRepository: jest.fn()
} as unknown as jest.Mocked<GitHubService>;

const mockWorkflowService = {
  checkWorkflowExists: jest.fn()
} as unknown as jest.Mocked<WorkflowService>;

const mockSessionService = {
  getSession: jest.fn(),
  updateSession: jest.fn()
} as unknown as jest.Mocked<SessionService>;

const mockEmbedService = {
  createErrorEmbed: jest.fn(),
  createNoSearchResultsEmbed: jest.fn(),
  createWarningEmbed: jest.fn(),
  createRepositorySelectionEmbed: jest.fn()
} as unknown as jest.Mocked<EmbedService>;

describe('ClaudeRepoSearchModalHandler', () => {
  let handler: ClaudeRepoSearchModalHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    handler = new ClaudeRepoSearchModalHandler(
      mockGitHubService,
      mockWorkflowService,
      mockSessionService,
      mockEmbedService
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
  });

  describe('Constructor', () => {
    it('should initialize with correct service name and dependencies', () => {
      expect(handler).toBeDefined();
      expect(handler['githubService']).toBe(mockGitHubService);
      expect(handler['workflowService']).toBe(mockWorkflowService);
      expect(handler['sessionService']).toBe(mockSessionService);
      expect(handler['embedService']).toBe(mockEmbedService);
    });

    it('should extend BaseService', () => {
      expect(handler).toBeDefined();
      expect(typeof handler['logger']).toBe('object');
    });
  });

  describe('onClaudeRepoSearchModal', () => {
    describe('Session Validation', () => {
      it('should reply with session expired when no session exists', async () => {
        const interaction = createMockInteraction() as any;
        mockSessionService.getSession.mockReturnValue(null);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user123');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.deferReply).not.toHaveBeenCalled();
      });
    });

    describe('Direct Repository Search', () => {
      const validSession = {
        userId: 'user123'
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should find direct repository match with owner/repo format', async () => {
        const interaction = createMockInteraction({
          searchInput: 'facebook/react'
        }) as any;
        
        const directRepo = createMockRepository('facebook/react');
        mockGitHubService.getRepository.mockResolvedValue(directRepo);
        mockWorkflowService.checkWorkflowExists.mockResolvedValue(true);
        mockEmbedService.createRepositorySelectionEmbed.mockReturnValue(new EmbedBuilder() as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        DiscordUtils.createRepositorySelectMenu.mockReturnValue(mockStringSelectMenuBuilder);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(mockGitHubService.getRepository).toHaveBeenCalledWith('facebook', 'react');
        expect(handler['logger'].log).toHaveBeenCalledWith('Direct repository found: facebook/react');
        expect(mockGitHubService.searchRepositories).not.toHaveBeenCalled();
      });

      it('should fall back to search when direct repository not found', async () => {
        const interaction = createMockInteraction({
          searchInput: 'nonexistent/repo'
        }) as any;

        mockGitHubService.getRepository.mockRejectedValue(new Error('Repository not found'));
        
        const searchResults: PaginatedRepositories = {
          repositories: [createMockRepository('other/repo')],
          totalCount: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        };
        mockGitHubService.searchRepositories.mockResolvedValue(searchResults);
        mockWorkflowService.checkWorkflowExists.mockResolvedValue(true);
        mockEmbedService.createRepositorySelectionEmbed.mockReturnValue(new EmbedBuilder() as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        DiscordUtils.createRepositorySelectMenu.mockReturnValue(mockStringSelectMenuBuilder);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(mockGitHubService.getRepository).toHaveBeenCalledWith('nonexistent', 'repo');
        expect(handler['logger'].log).toHaveBeenCalledWith('Direct repository not found: nonexistent/repo');
        expect(mockGitHubService.searchRepositories).toHaveBeenCalledWith('nonexistent/repo', 1, 25);
      });

      it('should not attempt direct repository match for non-owner/repo format', async () => {
        const interaction = createMockInteraction({
          searchInput: 'react components'
        }) as any;

        const searchResults: PaginatedRepositories = {
          repositories: [createMockRepository('facebook/react')],
          totalCount: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        };
        mockGitHubService.searchRepositories.mockResolvedValue(searchResults);
        mockWorkflowService.checkWorkflowExists.mockResolvedValue(true);
        mockEmbedService.createRepositorySelectionEmbed.mockReturnValue(new EmbedBuilder() as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        DiscordUtils.createRepositorySelectMenu.mockReturnValue(mockStringSelectMenuBuilder);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(mockGitHubService.getRepository).not.toHaveBeenCalled();
        expect(mockGitHubService.searchRepositories).toHaveBeenCalledWith('react components', 1, 25);
      });
    });

    describe('Repository Search', () => {
      const validSession = {
        userId: 'user123'
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should search repositories successfully', async () => {
        const interaction = createMockInteraction({
          searchInput: 'typescript'
        }) as any;

        const searchResults: PaginatedRepositories = {
          repositories: [
            createMockRepository('microsoft/typescript'),
            createMockRepository('user/typescript-project')
          ],
          totalCount: 2,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        };
        mockGitHubService.searchRepositories.mockResolvedValue(searchResults);
        mockWorkflowService.checkWorkflowExists.mockResolvedValue(true);
        mockEmbedService.createRepositorySelectionEmbed.mockReturnValue(new EmbedBuilder() as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        DiscordUtils.createRepositorySelectMenu.mockReturnValue(mockStringSelectMenuBuilder);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(mockGitHubService.searchRepositories).toHaveBeenCalledWith('typescript', 1, 25);
        expect(handler['logger'].log).toHaveBeenCalledWith('Search found 2 repositories for term: "typescript"');
      });

      it('should handle search failures', async () => {
        const interaction = createMockInteraction() as any;
        const searchError = new Error('GitHub API error');

        mockGitHubService.searchRepositories.mockRejectedValue(searchError);
        mockEmbedService.createErrorEmbed.mockReturnValue(new EmbedBuilder() as any);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Repository search failed: GitHub API error', searchError);
        expect(mockEmbedService.createErrorEmbed).toHaveBeenCalledWith(
          'Search Failed',
          'Failed to search repositories. Please try again.'
        );
        expect(interaction.editReply).toHaveBeenCalledWith({ embeds: [expect.any(Object)] });
      });

      it('should handle no search results', async () => {
        const interaction = createMockInteraction({
          searchInput: 'nonexistent-search-term'
        }) as any;

        const searchResults: PaginatedRepositories = {
          repositories: [],
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        };
        mockGitHubService.searchRepositories.mockResolvedValue(searchResults);
        mockEmbedService.createNoSearchResultsEmbed.mockReturnValue(new EmbedBuilder() as any);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(mockEmbedService.createNoSearchResultsEmbed).toHaveBeenCalledWith('nonexistent-search-term');
        expect(interaction.editReply).toHaveBeenCalledWith({ embeds: [expect.any(Object)] });
      });
    });

    describe('Workflow Checking', () => {
      const validSession = {
        userId: 'user123'
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should check workflow exists for all repositories', async () => {
        const interaction = createMockInteraction() as any;
        const repositories = [
          createMockRepository('repo1/test'),
          createMockRepository('repo2/test'),
          createMockRepository('repo3/test')
        ];

        const searchResults: PaginatedRepositories = {
          repositories,
          totalCount: 3,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        };
        mockGitHubService.searchRepositories.mockResolvedValue(searchResults);
        mockWorkflowService.checkWorkflowExists.mockImplementation(async (owner, repo) => {
          return repo === 'repo1' || repo === 'repo3'; // Only repo1 and repo3 have workflows
        });
        mockEmbedService.createRepositorySelectionEmbed.mockReturnValue(new EmbedBuilder() as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        DiscordUtils.createRepositorySelectMenu.mockReturnValue(mockStringSelectMenuBuilder);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(mockWorkflowService.checkWorkflowExists).toHaveBeenCalledTimes(3);
        expect(mockWorkflowService.checkWorkflowExists).toHaveBeenCalledWith('repo1', 'test', 'claude.yml');
        expect(mockWorkflowService.checkWorkflowExists).toHaveBeenCalledWith('repo2', 'test', 'claude.yml');
        expect(mockWorkflowService.checkWorkflowExists).toHaveBeenCalledWith('repo3', 'test', 'claude.yml');
      });

      it('should handle workflow check failures', async () => {
        const interaction = createMockInteraction() as any;
        const repositories = [
          createMockRepository('owner/repo')
        ];

        const searchResults: PaginatedRepositories = {
          repositories,
          totalCount: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        };
        mockGitHubService.searchRepositories.mockResolvedValue(searchResults);
        mockWorkflowService.checkWorkflowExists.mockRejectedValue(new Error('Workflow check failed'));
        mockEmbedService.createWarningEmbed.mockReturnValue(new EmbedBuilder() as any);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to check workflow for owner/repo: Workflow check failed');
        expect(mockEmbedService.createWarningEmbed).toHaveBeenCalled();
      });
    });

    describe('Session Update and Display', () => {
      const validSession = {
        userId: 'user123'
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should update session with repositories that have workflows', async () => {
        const interaction = createMockInteraction({
          searchInput: 'react'
        }) as any;
        
        const repositoriesWithWorkflow = [
          createMockRepository('facebook/react'),
          createMockRepository('user/react-app')
        ];

        const searchResults: PaginatedRepositories = {
          repositories: repositoriesWithWorkflow,
          totalCount: 2,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        };
        mockGitHubService.searchRepositories.mockResolvedValue(searchResults);
        mockWorkflowService.checkWorkflowExists.mockResolvedValue(true);
        mockEmbedService.createRepositorySelectionEmbed.mockReturnValue(new EmbedBuilder() as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        DiscordUtils.createRepositorySelectMenu.mockReturnValue(mockStringSelectMenuBuilder);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          action: 'claude_repository_selection',
          paginatedData: {
            repositories: repositoriesWithWorkflow,
            totalCount: 2,
            hasNextPage: false,
            hasPreviousPage: false,
            currentPage: 1,
            totalPages: 1
          },
          searchQuery: 'react'
        });
      });

      it('should show repositories with workflow selection interface', async () => {
        const interaction = createMockInteraction() as any;
        const repositoriesWithWorkflow = [createMockRepository('owner/repo')];

        const searchResults: PaginatedRepositories = {
          repositories: repositoriesWithWorkflow,
          totalCount: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        };
        mockGitHubService.searchRepositories.mockResolvedValue(searchResults);
        mockWorkflowService.checkWorkflowExists.mockResolvedValue(true);
        mockEmbedService.createRepositorySelectionEmbed.mockReturnValue(mockEmbedBuilder as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        DiscordUtils.createRepositorySelectMenu.mockReturnValue(mockStringSelectMenuBuilder);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(mockEmbedService.createRepositorySelectionEmbed).toHaveBeenCalledWith(
          expect.objectContaining({
            repositories: repositoriesWithWorkflow,
            totalCount: 1
          }),
          'test repo'
        );

        expect(DiscordUtils.createRepositorySelectMenu).toHaveBeenCalledWith(repositoriesWithWorkflow);
        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith('Found **1** repositories with Claude Code workflow:');
        expect(interaction.editReply).toHaveBeenCalledWith({
          embeds: [mockEmbedBuilder],
          components: [expect.any(Object)]
        });
      });

      it('should limit select menu options to 25', async () => {
        const interaction = createMockInteraction() as any;
        const repositoriesWithWorkflow = Array.from({ length: 30 }, (_, i) => 
          createMockRepository(`owner/repo${i + 1}`)
        );

        const searchResults: PaginatedRepositories = {
          repositories: repositoriesWithWorkflow,
          totalCount: 30,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        };
        mockGitHubService.searchRepositories.mockResolvedValue(searchResults);
        mockWorkflowService.checkWorkflowExists.mockResolvedValue(true);
        mockEmbedService.createRepositorySelectionEmbed.mockReturnValue(mockEmbedBuilder as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        DiscordUtils.createRepositorySelectMenu.mockReturnValue(mockStringSelectMenuBuilder);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(DiscordUtils.createRepositorySelectMenu).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ fullName: 'owner/repo1' }),
            expect.objectContaining({ fullName: 'owner/repo25' })
          ])
        );
        expect(DiscordUtils.createRepositorySelectMenu).toHaveBeenCalledWith(
          expect.not.arrayContaining([
            expect.objectContaining({ fullName: 'owner/repo26' })
          ])
        );
      });
    });

    describe('No Workflow Repositories Handling', () => {
      const validSession = {
        userId: 'user123'
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should show warning when no repositories with workflow found', async () => {
        const interaction = createMockInteraction({
          searchInput: 'test'
        }) as any;

        const repositoriesWithoutWorkflow = [
          createMockRepository('owner/repo1'),
          createMockRepository('owner/repo2')
        ];

        const searchResults: PaginatedRepositories = {
          repositories: repositoriesWithoutWorkflow,
          totalCount: 2,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        };
        mockGitHubService.searchRepositories.mockResolvedValue(searchResults);
        mockWorkflowService.checkWorkflowExists.mockResolvedValue(false);
        mockEmbedService.createWarningEmbed.mockReturnValue(new EmbedBuilder() as any);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(mockEmbedService.createWarningEmbed).toHaveBeenCalledWith(
          'No Claude Code Repositories Found',
          expect.stringContaining('No repositories found matching "test" with Claude Code workflow configured.')
        );
      });

      it('should list repositories without workflow in warning message', async () => {
        const interaction = createMockInteraction({
          searchInput: 'test'
        }) as any;

        const repositoriesWithoutWorkflow = [
          createMockRepository('owner/repo1'),
          createMockRepository('owner/repo2'),
          createMockRepository('owner/repo3')
        ];

        const searchResults: PaginatedRepositories = {
          repositories: repositoriesWithoutWorkflow,
          totalCount: 3,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        };
        mockGitHubService.searchRepositories.mockResolvedValue(searchResults);
        mockWorkflowService.checkWorkflowExists.mockResolvedValue(false);
        mockEmbedService.createWarningEmbed.mockReturnValue(new EmbedBuilder() as any);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(mockEmbedService.createWarningEmbed).toHaveBeenCalledWith(
          'No Claude Code Repositories Found',
          expect.stringMatching(/.*Found repositories without Claude Code.*owner\/repo1.*owner\/repo2.*owner\/repo3.*/s)
        );
      });

      it('should limit repositories without workflow list to 5 and show "and X more"', async () => {
        const interaction = createMockInteraction() as any;

        const repositoriesWithoutWorkflow = Array.from({ length: 8 }, (_, i) => 
          createMockRepository(`owner/repo${i + 1}`)
        );

        const searchResults: PaginatedRepositories = {
          repositories: repositoriesWithoutWorkflow,
          totalCount: 8,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        };
        mockGitHubService.searchRepositories.mockResolvedValue(searchResults);
        mockWorkflowService.checkWorkflowExists.mockResolvedValue(false);
        mockEmbedService.createWarningEmbed.mockReturnValue(new EmbedBuilder() as any);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(mockEmbedService.createWarningEmbed).toHaveBeenCalledWith(
          'No Claude Code Repositories Found',
          expect.stringMatching(/.*owner\/repo5.*and 3 more.*/s)
        );
      });
    });

    describe('Mixed Repository Results', () => {
      const validSession = {
        userId: 'user123'
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should handle mix of repositories with and without workflow', async () => {
        const interaction = createMockInteraction() as any;
        const allRepositories = [
          createMockRepository('with/workflow1'),
          createMockRepository('without/workflow1'),
          createMockRepository('with/workflow2'),
          createMockRepository('without/workflow2')
        ];

        const searchResults: PaginatedRepositories = {
          repositories: allRepositories,
          totalCount: 4,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        };
        mockGitHubService.searchRepositories.mockResolvedValue(searchResults);
        mockWorkflowService.checkWorkflowExists.mockImplementation(async (owner) => {
          return owner === 'with';
        });
        mockEmbedService.createRepositorySelectionEmbed.mockReturnValue(mockEmbedBuilder as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        DiscordUtils.createRepositorySelectMenu.mockReturnValue(mockStringSelectMenuBuilder);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith(
          'Found **2** repositories with Claude Code workflow:\n\n*2 additional repositories found without Claude Code workflow.*'
        );
      });
    });

    describe('Error Handling', () => {
      const validSession = {
        userId: 'user123'
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should handle general unexpected errors', async () => {
        const interaction = createMockInteraction() as any;
        const unexpectedError = new Error('Unexpected error');

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.fields.getTextInputValue.mockImplementation(() => {
          throw unexpectedError;
        });
        mockEmbedService.createErrorEmbed.mockReturnValue(new EmbedBuilder() as any);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Claude repository search modal error: Unexpected error', unexpectedError);
        expect(mockEmbedService.createErrorEmbed).toHaveBeenCalledWith(
          'Search Error',
          'An unexpected error occurred while searching repositories. Please try again.'
        );
        expect(interaction.editReply).toHaveBeenCalledWith({ embeds: [expect.any(Object)] });
      });

      it('should handle session service errors', async () => {
        const interaction = createMockInteraction() as any;
        const sessionError = new Error('Session service failed');

        // getSession succeeds but updateSession fails
        mockSessionService.getSession.mockReturnValue(validSession);
        mockSessionService.updateSession.mockImplementation(() => {
          throw sessionError;
        });

        interaction.deferReply.mockResolvedValue(undefined);
        mockGitHubService.searchRepositories.mockResolvedValue({
          repositories: [createMockRepository('test/repo')],
          totalCount: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        });
        mockWorkflowService.checkWorkflowExists.mockResolvedValue(true);
        mockEmbedService.createErrorEmbed.mockReturnValue(new EmbedBuilder() as any);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Claude repository search modal error: Session service failed', sessionError);
        expect(interaction.editReply).toHaveBeenCalledWith({ embeds: [expect.any(Object)] });
      });
    });

    describe('User Information and Logging', () => {
      it('should log repository search with user information', async () => {
        const userValidSession = {
          userId: 'user456'
        } as any;

        mockSessionService.getSession.mockReturnValue(userValidSession);

        const interaction = createMockInteraction({
          userId: 'user456',
          userTag: 'developer#1234',
          searchInput: 'my-project'
        }) as any;

        const searchResults: PaginatedRepositories = {
          repositories: [createMockRepository('user/project')],
          totalCount: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1
        };
        mockGitHubService.searchRepositories.mockResolvedValue(searchResults);
        mockWorkflowService.checkWorkflowExists.mockResolvedValue(true);
        mockEmbedService.createRepositorySelectionEmbed.mockReturnValue(new EmbedBuilder() as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        DiscordUtils.createRepositorySelectMenu.mockReturnValue(mockStringSelectMenuBuilder);

        interaction.deferReply.mockResolvedValue(undefined);
        interaction.editReply.mockResolvedValue(undefined);

        await handler.onClaudeRepoSearchModal([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('Repository search: "my-project" by user: developer#1234 (user456)');
        expect(handler['logger'].log).toHaveBeenCalledWith('Search found 1 repositories for term: "my-project"');
        // The final log "Repository selection presented" happens after editReply completes
        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user456', expect.objectContaining({
          action: 'claude_repository_selection'
        }));
      });
    });
  });
});