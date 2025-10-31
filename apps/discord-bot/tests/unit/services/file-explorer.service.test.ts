import { ConfigService } from '@nestjs/config';
import { FileExplorerService, FileTreeItem, FileTreeResponse } from '@/services/file-explorer.service';
import { LoggerFactory } from '@claude-code/shared';

describe('FileExplorerService', () => {
  let fileExplorerService: FileExplorerService;
  let mockConfigService: any;
  let mockLoggerFactory: any;
  let mockLogger: any;
  let mockOctokit: any;

  const mockGitHubTreeData = [
    {
      path: 'src/services/file-explorer.service.ts',
      type: 'blob',
      size: 1234,
    },
    {
      path: 'src/components',
      type: 'tree',
    },
    {
      path: 'package.json',
      type: 'blob',
      size: 567,
    },
    {
      path: 'node_modules/react',
      type: 'tree',
    },
    {
      path: 'dist/bundle.js',
      type: 'blob',
      size: 98765,
    },
    {
      path: 'README.md',
      type: 'blob',
      size: 890,
    },
    {
      path: 'tests/unit',
      type: 'tree',
    },
  ];

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

    fileExplorerService = new FileExplorerService(mockConfigService, mockLoggerFactory);

    // Mock the Octokit instance
    mockOctokit = {
      rest: {
        git: {
          getTree: jest.fn(),
        },
      },
    };

    (fileExplorerService as any).octokit = mockOctokit;
    (fileExplorerService as any).hasGitHubAccess = true;
  });

  afterEach(() => {
    // Clear cache after each test
    fileExplorerService.clearCache();
  });

  describe('Constructor', () => {
    it('should initialize with required GitHub access', () => {
      expect(fileExplorerService).toBeInstanceOf(FileExplorerService);
      expect(mockConfigService.get).toHaveBeenCalledWith('GITHUB_TOKEN');
    });

    it('should throw error when GitHub token is missing', () => {
      mockConfigService.get.mockReturnValue(null);
      
      expect(() => {
        new FileExplorerService(mockConfigService, mockLoggerFactory);
      }).toThrow();
    });
  });

  describe('getFileTree', () => {
    it('should fetch and process file tree with default ref', async () => {
      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: {
          tree: mockGitHubTreeData,
        },
      });

      const result = await fileExplorerService.getFileTree('testuser', 'test-repo');

      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledWith({
        owner: 'testuser',
        repo: 'test-repo',
        tree_sha: 'main',
        recursive: 'true',
      });

      expect(result).toEqual({
        items: expect.arrayContaining([
          expect.objectContaining({
            path: 'package.json',
            type: 'file',
            name: 'package.json',
            size: 567,
            isCommon: true,
          }),
          expect.objectContaining({
            path: 'README.md',
            type: 'file',
            name: 'README.md',
            size: 890,
            isCommon: true,
          }),
          expect.objectContaining({
            path: 'src/components',
            type: 'dir',
            name: 'components',
            isCommon: true,
          }),
          expect.objectContaining({
            path: 'tests/unit',
            type: 'dir',
            name: 'unit',
            isCommon: true,
          }),
          expect.objectContaining({
            path: 'src/services/file-explorer.service.ts',
            type: 'file',
            name: 'file-explorer.service.ts',
            size: 1234,
            isCommon: true,
          }),
        ]),
        truncated: false,
        totalItems: 5, // Excludes node_modules and dist items
      });

      expect(mockLogger.log).toHaveBeenCalledWith('Fetching file tree for testuser/test-repo (main)');
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Retrieved 5 file tree items for testuser/test-repo:main')
      );
    });

    it('should fetch and process file tree with custom ref', async () => {
      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: {
          tree: mockGitHubTreeData,
        },
      });

      await fileExplorerService.getFileTree('testuser', 'test-repo', 'develop');

      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledWith({
        owner: 'testuser',
        repo: 'test-repo',
        tree_sha: 'develop',
        recursive: 'true',
      });

      expect(mockLogger.log).toHaveBeenCalledWith('Fetching file tree for testuser/test-repo (develop)');
    });

    it('should return cached result when cache is valid', async () => {
      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: {
          tree: mockGitHubTreeData,
        },
      });

      // First call
      const result1 = await fileExplorerService.getFileTree('testuser', 'test-repo');
      
      // Second call should use cache
      const result2 = await fileExplorerService.getFileTree('testuser', 'test-repo');

      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
      expect(mockLogger.log).toHaveBeenCalledWith('Using cached file tree for testuser/test-repo:main');
    });

    it('should handle truncation when too many items', async () => {
      // Create mock data with more than MAX_ITEMS (100)
      const manyItems = Array.from({ length: 150 }, (_, i) => ({
        path: `src/file${i}.ts`,
        type: 'blob',
        size: 100,
      }));

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: {
          tree: manyItems,
        },
      });

      const result = await fileExplorerService.getFileTree('testuser', 'test-repo');

      expect(result.items).toHaveLength(100);
      expect(result.truncated).toBe(true);
      expect(result.totalItems).toBe(150);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('truncated from 150')
      );
    });

    it('should handle empty tree data', async () => {
      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: {
          tree: [],
        },
      });

      const result = await fileExplorerService.getFileTree('testuser', 'test-repo');

      expect(result).toEqual({
        items: [],
        truncated: false,
        totalItems: 0,
      });
    });

    it('should throw error when no tree data received', async () => {
      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: {},
      });

      await expect(fileExplorerService.getFileTree('testuser', 'test-repo')).rejects.toThrow(
        'No tree data received from GitHub'
      );
    });

    it('should throw error when GitHub access is not configured', async () => {
      (fileExplorerService as any).hasGitHubAccess = false;

      await expect(fileExplorerService.getFileTree('testuser', 'test-repo')).rejects.toThrow();
    });

    it('should handle API errors and preserve status codes', async () => {
      // For errors with status codes that don't get handled by makeGitHubRequest specifically,
      // the status should be preserved
      const apiError = new Error('Internal Server Error');
      (apiError as any).status = 500;
      (apiError as any).response = { headers: {} };

      mockOctokit.rest.git.getTree.mockRejectedValue(apiError);

      try {
        await fileExplorerService.getFileTree('testuser', 'test-repo');
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toContain('Failed to fetch repository file tree');
        expect(error.status).toBe(500);
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch file tree for testuser/test-repo'),
        apiError
      );
    });

    it('should handle generic API errors', async () => {
      const genericError = new Error('Network error');
      mockOctokit.rest.git.getTree.mockRejectedValue(genericError);

      await expect(fileExplorerService.getFileTree('testuser', 'test-repo')).rejects.toThrow(
        'Failed to fetch repository file tree: Network error'
      );
    });
  });

  describe('makeGitHubRequest', () => {
    it('should handle rate limiting with proper error message', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 403;
      (rateLimitError as any).response = {
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': Math.floor((Date.now() + 60000) / 1000).toString(), // 1 minute from now
        },
      };

      mockOctokit.rest.git.getTree.mockRejectedValue(rateLimitError);

      await expect(fileExplorerService.getFileTree('testuser', 'test-repo')).rejects.toThrow(
        /GitHub API rate limit exceeded/
      );
    });

    it('should retry on 403 errors that are not rate limits', async () => {
      const forbiddenError = new Error('Forbidden');
      (forbiddenError as any).status = 403;
      (forbiddenError as any).response = { headers: {} };

      // Fail first 3 times, succeed on 4th (should give up after 3 retries)
      mockOctokit.rest.git.getTree
        .mockRejectedValueOnce(forbiddenError)
        .mockRejectedValueOnce(forbiddenError)
        .mockRejectedValueOnce(forbiddenError)
        .mockRejectedValueOnce(forbiddenError);

      await expect(fileExplorerService.getFileTree('testuser', 'test-repo')).rejects.toThrow(
        'Forbidden'
      );

      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(mockLogger.warn).toHaveBeenCalledTimes(3); // 3 retry warnings
    });

    it('should retry on 500 errors with exponential backoff', async () => {
      const serverError = new Error('Internal Server Error');
      (serverError as any).status = 500;

      // Fail first 2 times, succeed on 3rd
      mockOctokit.rest.git.getTree
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          data: { tree: [] },
        });

      const result = await fileExplorerService.getFileTree('testuser', 'test-repo');

      expect(result).toBeDefined();
      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });

    it('should handle 401 authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;

      mockOctokit.rest.git.getTree.mockRejectedValue(authError);

      await expect(fileExplorerService.getFileTree('testuser', 'test-repo')).rejects.toThrow(
        'GitHub API authentication failed. Please check your GitHub token.'
      );
    });

    it('should handle 404 not found errors', async () => {
      const notFoundError = new Error('Not Found');
      (notFoundError as any).status = 404;
      (notFoundError as any).request = { path: '/repos/testuser/test-repo/git/trees/main' };

      mockOctokit.rest.git.getTree.mockRejectedValue(notFoundError);

      await expect(fileExplorerService.getFileTree('testuser', 'test-repo')).rejects.toThrow(
        /Repository.*Please check the repository exists and you have access/
      );
    });

    it('should handle 422 validation errors', async () => {
      const validationError = new Error('Validation failed');
      (validationError as any).status = 422;

      mockOctokit.rest.git.getTree.mockRejectedValue(validationError);

      await expect(fileExplorerService.getFileTree('testuser', 'test-repo')).rejects.toThrow(
        /Invalid request to GitHub API.*Validation failed/
      );
    });

    it('should retry on ECONNRESET errors', async () => {
      const connectionError = new Error('Connection reset');
      (connectionError as any).code = 'ECONNRESET';

      mockOctokit.rest.git.getTree
        .mockRejectedValueOnce(connectionError)
        .mockResolvedValueOnce({
          data: { tree: [] },
        });

      const result = await fileExplorerService.getFileTree('testuser', 'test-repo');

      expect(result).toBeDefined();
      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('extractFileName', () => {
    it('should extract file name from simple path', () => {
      const result = (fileExplorerService as any).extractFileName('package.json');
      expect(result).toBe('package.json');
    });

    it('should extract file name from nested path', () => {
      const result = (fileExplorerService as any).extractFileName('src/services/github.service.ts');
      expect(result).toBe('github.service.ts');
    });

    it('should extract directory name with trailing slash', () => {
      const result = (fileExplorerService as any).extractFileName('src/components/');
      expect(result).toBe('components/');
    });

    it('should extract directory name without trailing slash', () => {
      const result = (fileExplorerService as any).extractFileName('src/components');
      expect(result).toBe('components');
    });

    it('should handle empty or invalid paths', () => {
      expect((fileExplorerService as any).extractFileName('')).toBe('');
      expect((fileExplorerService as any).extractFileName('   ')).toBe('');
    });

    it('should handle root path', () => {
      const result = (fileExplorerService as any).extractFileName('/');
      expect(result).toBe('');
    });

    it('should normalize multiple slashes', () => {
      const result = (fileExplorerService as any).extractFileName('src//services///github.service.ts');
      expect(result).toBe('github.service.ts');
    });

    it('should handle Windows-style path separators', () => {
      const result = (fileExplorerService as any).extractFileName('src\\services\\github.service.ts');
      expect(result).toBe('github.service.ts');
    });
  });

  describe('isCommonPath', () => {
    it('should identify common files', () => {
      expect((fileExplorerService as any).isCommonPath('package.json')).toBe(true);
      expect((fileExplorerService as any).isCommonPath('README.md')).toBe(true);
      expect((fileExplorerService as any).isCommonPath('tsconfig.json')).toBe(true);
    });

    it('should identify common directories', () => {
      expect((fileExplorerService as any).isCommonPath('src')).toBe(true);
      expect((fileExplorerService as any).isCommonPath('src/components')).toBe(true);
      expect((fileExplorerService as any).isCommonPath('tests/unit')).toBe(true);
    });

    it('should identify non-common paths', () => {
      expect((fileExplorerService as any).isCommonPath('random-file.txt')).toBe(false);
      expect((fileExplorerService as any).isCommonPath('some/random/path')).toBe(false);
    });

    it('should handle exact matches for common paths', () => {
      expect((fileExplorerService as any).isCommonPath('src')).toBe(true);
      expect((fileExplorerService as any).isCommonPath('src/nested/file.ts')).toBe(true);
    });
  });

  describe('shouldIncludeItem', () => {
    it('should exclude build and dependency directories', () => {
      const excludedItems: FileTreeItem[] = [
        { path: 'node_modules/react', type: 'dir', name: 'react', isCommon: false },
        { path: 'dist/bundle.js', type: 'file', name: 'bundle.js', isCommon: false },
        { path: '.git/config', type: 'file', name: 'config', isCommon: false },
        { path: 'coverage/index.html', type: 'file', name: 'index.html', isCommon: false },
      ];

      excludedItems.forEach(item => {
        expect((fileExplorerService as any).shouldIncludeItem(item)).toBe(false);
      });
    });

    it('should include common paths regardless of other filters', () => {
      const commonItem: FileTreeItem = {
        path: 'src/uncommon.xyz',
        type: 'file',
        name: 'uncommon.xyz',
        isCommon: true,
      };

      expect((fileExplorerService as any).shouldIncludeItem(commonItem)).toBe(true);
    });

    it('should include files with important extensions', () => {
      const importantFiles: FileTreeItem[] = [
        { path: 'app.ts', type: 'file', name: 'app.ts', isCommon: false },
        { path: 'component.jsx', type: 'file', name: 'component.jsx', isCommon: false },
        { path: 'script.py', type: 'file', name: 'script.py', isCommon: false },
        { path: 'config.yaml', type: 'file', name: 'config.yaml', isCommon: false },
        { path: 'Dockerfile', type: 'file', name: 'Dockerfile', isCommon: false },
      ];

      importantFiles.forEach(item => {
        expect((fileExplorerService as any).shouldIncludeItem(item)).toBe(true);
      });
    });

    it('should exclude files with unimportant extensions', () => {
      const unimportantFiles: FileTreeItem[] = [
        { path: 'image.png', type: 'file', name: 'image.png', isCommon: false },
        { path: 'video.mp4', type: 'file', name: 'video.mp4', isCommon: false },
        { path: 'archive.zip', type: 'file', name: 'archive.zip', isCommon: false },
      ];

      unimportantFiles.forEach(item => {
        expect((fileExplorerService as any).shouldIncludeItem(item)).toBe(false);
      });
    });

    it('should include files without extensions', () => {
      const noExtensionFile: FileTreeItem = {
        path: 'Makefile',
        type: 'file',
        name: 'Makefile',
        isCommon: false,
      };

      expect((fileExplorerService as any).shouldIncludeItem(noExtensionFile)).toBe(true);
    });

    it('should include shallow directories', () => {
      const shallowDirs: FileTreeItem[] = [
        { path: 'level1', type: 'dir', name: 'level1', isCommon: false },
        { path: 'level1/level2', type: 'dir', name: 'level2', isCommon: false },
        { path: 'level1/level2/level3', type: 'dir', name: 'level3', isCommon: false },
      ];

      shallowDirs.forEach(item => {
        expect((fileExplorerService as any).shouldIncludeItem(item)).toBe(true);
      });
    });

    it('should be selective with deep directories', () => {
      const deepImportantDir: FileTreeItem = {
        path: 'very/deep/src/components',
        type: 'dir',
        name: 'components',
        isCommon: false,
      };

      const deepUnimportantDir: FileTreeItem = {
        path: 'very/deep/random/stuff',
        type: 'dir',
        name: 'stuff',
        isCommon: false,
      };

      expect((fileExplorerService as any).shouldIncludeItem(deepImportantDir)).toBe(true);
      expect((fileExplorerService as any).shouldIncludeItem(deepUnimportantDir)).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: { tree: [] },
      });

      // Populate cache
      await fileExplorerService.getFileTree('testuser', 'test-repo');
      
      const statsBefore = fileExplorerService.getCacheStats();
      expect(statsBefore.size).toBe(1);

      fileExplorerService.clearCache();

      const statsAfter = fileExplorerService.getCacheStats();
      expect(statsAfter.size).toBe(0);
      expect(mockLogger.log).toHaveBeenCalledWith('File tree cache cleared');
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: { tree: [] },
      });

      // Initially empty
      let stats = fileExplorerService.getCacheStats();
      expect(stats).toEqual({
        size: 0,
        keys: [],
      });

      // Populate cache
      await fileExplorerService.getFileTree('testuser', 'test-repo');
      await fileExplorerService.getFileTree('testuser', 'other-repo');

      stats = fileExplorerService.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('testuser/test-repo:main');
      expect(stats.keys).toContain('testuser/other-repo:main');
    });
  });

  describe('Sorting Logic', () => {
    it('should sort items with common paths first', async () => {
      const mixedTreeData = [
        { path: 'uncommon-file.xyz', type: 'blob', size: 100 },
        { path: 'package.json', type: 'blob', size: 200 },
        { path: 'random-dir', type: 'tree' },
        { path: 'src', type: 'tree' },
      ];

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: { tree: mixedTreeData },
      });

      const result = await fileExplorerService.getFileTree('testuser', 'test-repo');

      // Common items should come first
      const commonItems = result.items.filter(item => item.isCommon);
      const nonCommonItems = result.items.filter(item => !item.isCommon);

      // All common items should come before non-common items
      const firstNonCommonIndex = result.items.findIndex(item => !item.isCommon);
      const lastCommonIndex = result.items.map((item, index) => ({ item, index }))
        .filter(({ item }) => item.isCommon)
        .pop()?.index ?? -1;

      if (firstNonCommonIndex !== -1 && lastCommonIndex !== -1) {
        expect(firstNonCommonIndex).toBeGreaterThan(lastCommonIndex);
      }
    });

    it('should sort directories before files within same common status', async () => {
      const treeData = [
        { path: 'file1.txt', type: 'blob', size: 100 },
        { path: 'dir1', type: 'tree' },
        { path: 'file2.txt', type: 'blob', size: 200 },
        { path: 'dir2', type: 'tree' },
      ];

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: { tree: treeData },
      });

      const result = await fileExplorerService.getFileTree('testuser', 'test-repo');

      // Find groups of common/non-common items
      const nonCommonItems = result.items.filter(item => !item.isCommon);
      
      // Within non-common items, directories should come before files
      let lastDirIndex = -1;
      let firstFileIndex = -1;

      nonCommonItems.forEach((item, index) => {
        if (item.type === 'dir') lastDirIndex = index;
        if (item.type === 'file' && firstFileIndex === -1) firstFileIndex = index;
      });

      if (lastDirIndex !== -1 && firstFileIndex !== -1) {
        expect(lastDirIndex).toBeLessThan(firstFileIndex);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed tree items', async () => {
      const malformedTreeData = [
        { path: null, type: 'blob' }, // Missing path
        { path: 'valid-file.txt', type: null }, // Missing type
        { path: 'valid-file2.txt', type: 'unknown' }, // Unknown type
        { path: 'valid-file3.txt', type: 'blob', size: 100 }, // Valid item
      ];

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: { tree: malformedTreeData },
      });

      const result = await fileExplorerService.getFileTree('testuser', 'test-repo');

      // Should only include the valid item
      expect(result.items).toHaveLength(1);
      expect(result.items[0].path).toBe('valid-file3.txt');
    });

    it('should handle very long file paths', async () => {
      const longPath = 'very/'.repeat(50) + 'deep/file.txt';
      const treeData = [
        { path: longPath, type: 'blob', size: 100 },
      ];

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: { tree: treeData },
      });

      const result = await fileExplorerService.getFileTree('testuser', 'test-repo');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].path).toBe(longPath);
      expect(result.items[0].name).toBe('file.txt');
    });

    it('should handle cache expiration', async () => {
      // Mock Date.now to control cache timing
      const originalDateNow = Date.now;
      const mockTime = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTime);

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: { tree: [] },
      });

      // First call
      await fileExplorerService.getFileTree('testuser', 'test-repo');
      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledTimes(1);

      // Second call within cache duration (5 minutes = 300,000ms)
      Date.now = jest.fn().mockReturnValue(mockTime + 200000); // 200 seconds later
      await fileExplorerService.getFileTree('testuser', 'test-repo');
      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledTimes(1); // Should use cache

      // Third call after cache expiration
      Date.now = jest.fn().mockReturnValue(mockTime + 400000); // 400 seconds later
      await fileExplorerService.getFileTree('testuser', 'test-repo');
      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledTimes(2); // Should fetch again

      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });
});