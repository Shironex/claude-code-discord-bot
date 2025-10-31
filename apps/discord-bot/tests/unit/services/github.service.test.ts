import { ConfigService } from '@nestjs/config';
import { GitHubService } from '@/services/github.service';
import { Repository, PaginatedRepositories } from '@/interfaces/models/repository.interface';
import { LoggerFactory } from '@claude-code/shared';

describe('GitHubService', () => {
  let githubService: GitHubService;
  let mockConfigService: any;
  let mockLoggerFactory: any;
  let mockLogger: any;
  let mockOctokit: any;

  const mockRepoData = {
    id: 123456789,
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    description: 'A test repository',
    language: 'TypeScript',
    stargazers_count: 42,
    forks_count: 7,
    updated_at: '2023-06-15T10:00:00Z',
    private: false,
    html_url: 'https://github.com/testuser/test-repo',
  };

  const mockRepository: Repository = {
    id: 123456789,
    name: 'test-repo',
    fullName: 'testuser/test-repo',
    description: 'A test repository',
    language: 'TypeScript',
    stargazersCount: 42,
    forksCount: 7,
    updatedAt: '2023-06-15T10:00:00Z',
    private: false,
    htmlUrl: 'https://github.com/testuser/test-repo',
  };

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockLoggerFactory = {
      createLogger: jest.fn().mockReturnValue(mockLogger),
      getAllLoggers: jest.fn(),
      flushAll: jest.fn(),
      clear: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn().mockReturnValue('mock-github-token'),
      getOrThrow: jest.fn(),
      set: jest.fn(),
      setEnvFilePaths: jest.fn(),
      changes$: {} as any,
    } as any;

    githubService = new GitHubService(mockConfigService, mockLoggerFactory);

    // Mock the Octokit instance
    mockOctokit = {
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn(),
          get: jest.fn(),
        },
        search: {
          repos: jest.fn(),
        },
        users: {
          getAuthenticated: jest.fn(),
        },
      },
    };

    (githubService as any).octokit = mockOctokit;
    (githubService as any).hasGitHubAccess = true;
  });

  describe('Constructor', () => {
    it('should initialize with required GitHub access', () => {
      expect(githubService).toBeInstanceOf(GitHubService);
      expect(mockConfigService.get).toHaveBeenCalledWith('GITHUB_TOKEN');
    });

    it('should throw error when GitHub token is missing', () => {
      mockConfigService.get.mockReturnValue(null);
      
      expect(() => {
        new GitHubService(mockConfigService, mockLoggerFactory);
      }).toThrow();
    });
  });

  describe('getUserRepositories', () => {
    it('should fetch user repositories with default limit', async () => {
      const mockRepos = [mockRepoData];
      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
      });

      const result = await githubService.getUserRepositories();

      expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        sort: 'updated',
        direction: 'desc',
        per_page: 25,
        type: 'all',
      });

      expect(result).toEqual([mockRepository]);
      expect(mockLogger.log).toHaveBeenCalledWith('Fetching user repositories (limit: 25)');
      expect(mockLogger.log).toHaveBeenCalledWith('Successfully fetched 1 repositories');
    });

    it('should fetch user repositories with custom limit', async () => {
      const mockRepos = [mockRepoData];
      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
      });

      await githubService.getUserRepositories(10);

      expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        sort: 'updated',
        direction: 'desc',
        per_page: 10,
        type: 'all',
      });

      expect(mockLogger.log).toHaveBeenCalledWith('Fetching user repositories (limit: 10)');
    });

    it('should map repository data correctly', async () => {
      const mockRepoWithNulls = {
        ...mockRepoData,
        description: null,
        language: null,
      };

      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: [mockRepoWithNulls],
      });

      const result = await githubService.getUserRepositories();

      expect(result[0]).toEqual({
        id: 123456789,
        name: 'test-repo',
        fullName: 'testuser/test-repo',
        description: null,
        language: null,
        stargazersCount: 42,
        forksCount: 7,
        updatedAt: '2023-06-15T10:00:00Z',
        private: false,
        htmlUrl: 'https://github.com/testuser/test-repo',
      });
    });

    it('should handle empty repository list', async () => {
      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: [],
      });

      const result = await githubService.getUserRepositories();

      expect(result).toEqual([]);
      expect(mockLogger.log).toHaveBeenCalledWith('Successfully fetched 0 repositories');
    });

    it('should throw error when API call fails', async () => {
      const error = new Error('API Error');
      mockOctokit.rest.repos.listForAuthenticatedUser.mockRejectedValue(error);

      await expect(githubService.getUserRepositories()).rejects.toThrow('Failed to fetch GitHub repositories');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch repositories', error);
    });

    it('should throw error when GitHub access is not configured', async () => {
      (githubService as any).hasGitHubAccess = false;

      await expect(githubService.getUserRepositories()).rejects.toThrow();
    });
  });

  describe('getUserRepositoriesPaginated', () => {
    it('should fetch paginated repositories with default parameters', async () => {
      const mockRepos = [mockRepoData];
      const mockHeaders = {
        link: '<https://api.github.com/user/repos?page=2>; rel="next"',
      };

      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
        headers: mockHeaders,
      });

      const result = await githubService.getUserRepositoriesPaginated();

      expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        sort: 'updated',
        direction: 'desc',
        per_page: 25,
        page: 1,
        type: 'all',
      });

      expect(result).toEqual({
        repositories: [mockRepository],
        totalCount: 1, // data.length < perPage ? (page - 1) * perPage + data.length : page * perPage + (hasNextPage ? 1 : 0)
        hasNextPage: true,
        hasPreviousPage: false,
        currentPage: 1,
        totalPages: 1,
      });
    });

    it('should fetch paginated repositories with custom parameters', async () => {
      const mockRepos = [mockRepoData, { ...mockRepoData, id: 987654321 }];
      const mockHeaders = { link: null };

      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
        headers: mockHeaders,
      });

      const result = await githubService.getUserRepositoriesPaginated(2, 10);

      expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        sort: 'updated',
        direction: 'desc',
        per_page: 10,
        page: 2,
        type: 'all',
      });

      expect(result).toEqual({
        repositories: expect.any(Array),
        totalCount: 12, // (page - 1) * perPage + data.length
        hasNextPage: false,
        hasPreviousPage: true,
        currentPage: 2,
        totalPages: 2,
      });

      expect(mockLogger.log).toHaveBeenCalledWith('Fetching user repositories (page: 2, per_page: 10)');
    });

    it('should handle pagination with next page', async () => {
      const mockRepos = Array.from({ length: 25 }, (_, i) => ({ ...mockRepoData, id: i }));
      const mockHeaders = {
        link: '<https://api.github.com/user/repos?page=2>; rel="next"',
      };

      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
        headers: mockHeaders,
      });

      const result = await githubService.getUserRepositoriesPaginated(1, 25);

      expect(result.hasNextPage).toBe(true);
      expect(result.totalCount).toBe(26); // 1 * 25 + 1 (because hasNextPage)
      expect(result.totalPages).toBe(2);
    });

    it('should handle pagination without next page', async () => {
      const mockRepos = Array.from({ length: 10 }, (_, i) => ({ ...mockRepoData, id: i }));
      const mockHeaders = { link: null };

      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
        headers: mockHeaders,
      });

      const result = await githubService.getUserRepositoriesPaginated(2, 25);

      expect(result.hasNextPage).toBe(false);
      expect(result.totalCount).toBe(35); // (2 - 1) * 25 + 10
      expect(result.totalPages).toBe(2);
    });

    it('should throw error when API call fails', async () => {
      const error = new Error('Pagination API Error');
      mockOctokit.rest.repos.listForAuthenticatedUser.mockRejectedValue(error);

      await expect(githubService.getUserRepositoriesPaginated()).rejects.toThrow('Failed to fetch GitHub repositories');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch repositories', error);
    });

    it('should throw error when GitHub access is not configured', async () => {
      (githubService as any).hasGitHubAccess = false;

      await expect(githubService.getUserRepositoriesPaginated()).rejects.toThrow();
    });
  });

  describe('searchRepositories', () => {
    beforeEach(() => {
      // Mock getAuthenticatedUsername for search
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser' },
      });
    });

    it('should search repositories with default parameters', async () => {
      const query = 'react';
      const mockSearchData = {
        total_count: 15,
        items: [mockRepoData],
      };

      mockOctokit.rest.search.repos.mockResolvedValue({
        data: mockSearchData,
      });

      const result = await githubService.searchRepositories(query);

      expect(mockOctokit.rest.search.repos).toHaveBeenCalledWith({
        q: 'user:testuser react',
        sort: 'updated',
        order: 'desc',
        per_page: 25,
        page: 1,
      });

      expect(result).toEqual({
        repositories: [mockRepository],
        totalCount: 15,
        hasNextPage: false, // page 1 < totalPages 1
        hasPreviousPage: false,
        currentPage: 1,
        totalPages: 1,
      });

      expect(mockLogger.log).toHaveBeenCalledWith('Searching repositories: "react" (page: 1, per_page: 25)');
      expect(mockLogger.log).toHaveBeenCalledWith('Successfully found 1 repositories for query "react"');
    });

    it('should search repositories with custom parameters', async () => {
      const query = 'typescript';
      const mockSearchData = {
        total_count: 100,
        items: Array.from({ length: 10 }, (_, i) => ({ ...mockRepoData, id: i })),
      };

      mockOctokit.rest.search.repos.mockResolvedValue({
        data: mockSearchData,
      });

      const result = await githubService.searchRepositories(query, 3, 10);

      expect(mockOctokit.rest.search.repos).toHaveBeenCalledWith({
        q: 'user:testuser typescript',
        sort: 'updated',
        order: 'desc',
        per_page: 10,
        page: 3,
      });

      expect(result).toEqual({
        repositories: expect.any(Array),
        totalCount: 100,
        hasNextPage: true, // page 3 < totalPages 10
        hasPreviousPage: true,
        currentPage: 3,
        totalPages: 10,
      });
    });

    it('should handle repositories with missing forks_count', async () => {
      const mockRepoWithoutForks = {
        ...mockRepoData,
        forks_count: undefined, // GitHub API sometimes doesn't include this
      };

      const mockSearchData = {
        total_count: 1,
        items: [mockRepoWithoutForks],
      };

      mockOctokit.rest.search.repos.mockResolvedValue({
        data: mockSearchData,
      });

      const result = await githubService.searchRepositories('test');

      expect(result.repositories[0].forksCount).toBe(0);
    });

    it('should handle empty search results', async () => {
      const mockSearchData = {
        total_count: 0,
        items: [],
      };

      mockOctokit.rest.search.repos.mockResolvedValue({
        data: mockSearchData,
      });

      const result = await githubService.searchRepositories('nonexistent');

      expect(result).toEqual({
        repositories: [],
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        currentPage: 1,
        totalPages: 0,
      });
    });

    it('should throw error when search API call fails', async () => {
      const error = new Error('Search API Error');
      mockOctokit.rest.search.repos.mockRejectedValue(error);

      await expect(githubService.searchRepositories('test')).rejects.toThrow('Failed to search GitHub repositories');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to search repositories for query "test"', error);
    });

    it('should throw error when getAuthenticatedUsername fails', async () => {
      const error = new Error('Auth error');
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(error);

      await expect(githubService.searchRepositories('test')).rejects.toThrow('Failed to search GitHub repositories');
    });

    it('should throw error when GitHub access is not configured', async () => {
      (githubService as any).hasGitHubAccess = false;

      await expect(githubService.searchRepositories('test')).rejects.toThrow();
    });
  });

  describe('getAuthenticatedUsername', () => {
    it('should return authenticated username', async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser' },
      });

      const result = await (githubService as any).getAuthenticatedUsername();

      expect(result).toBe('testuser');
      expect(mockOctokit.rest.users.getAuthenticated).toHaveBeenCalled();
    });

    it('should throw error when API call fails', async () => {
      const error = new Error('Auth API Error');
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(error);

      await expect((githubService as any).getAuthenticatedUsername()).rejects.toThrow('Failed to get authenticated user');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get authenticated user', error);
    });

    it('should throw error when GitHub access is not configured', async () => {
      (githubService as any).hasGitHubAccess = false;

      await expect((githubService as any).getAuthenticatedUsername()).rejects.toThrow();
    });
  });

  describe('getRepository', () => {
    it('should fetch specific repository', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: mockRepoData,
      });

      const result = await githubService.getRepository('testuser', 'test-repo');

      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'testuser',
        repo: 'test-repo',
      });

      expect(result).toEqual(mockRepository);
      expect(mockLogger.log).toHaveBeenCalledWith('Fetching repository: testuser/test-repo');
    });

    it('should handle repository with null values', async () => {
      const mockRepoWithNulls = {
        ...mockRepoData,
        description: null,
        language: null,
      };

      mockOctokit.rest.repos.get.mockResolvedValue({
        data: mockRepoWithNulls,
      });

      const result = await githubService.getRepository('testuser', 'test-repo');

      expect(result.description).toBeNull();
      expect(result.language).toBeNull();
    });

    it('should throw error when repository is not found', async () => {
      const error = new Error('Not Found');
      (error as any).status = 404;
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      await expect(githubService.getRepository('testuser', 'nonexistent')).rejects.toThrow('Failed to fetch repository testuser/nonexistent');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch repository testuser/nonexistent', error);
    });

    it('should throw error when API call fails', async () => {
      const error = new Error('API Error');
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      await expect(githubService.getRepository('testuser', 'test-repo')).rejects.toThrow('Failed to fetch repository testuser/test-repo');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch repository testuser/test-repo', error);
    });

    it('should throw error when GitHub access is not configured', async () => {
      (githubService as any).hasGitHubAccess = false;

      await expect(githubService.getRepository('testuser', 'test-repo')).rejects.toThrow();
    });
  });

  describe('isConfigured', () => {
    it('should return true when GitHub access is available', () => {
      (githubService as any).hasGitHubAccess = true;

      const result = githubService.isConfigured();

      expect(result).toBe(true);
    });

    it('should return false when GitHub access is not available', () => {
      (githubService as any).hasGitHubAccess = false;

      const result = githubService.isConfigured();

      expect(result).toBe(false);
    });
  });
});