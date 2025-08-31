import { FileTreeUtils } from '@/utils/file-tree.utils';
import { FileTreeItem } from '@/services/file-explorer.service';

describe('FileTreeUtils', () => {
  const sampleFileTree: FileTreeItem[] = [
    { path: 'src/index.ts', type: 'file', name: 'index.ts', size: 1024, isCommon: true },
    { path: 'src/utils/helper.ts', type: 'file', name: 'helper.ts', size: 512, isCommon: false },
    { path: 'src/components', type: 'dir', name: 'components', isCommon: true },
    { path: 'src/components/Button.tsx', type: 'file', name: 'Button.tsx', size: 2048, isCommon: false },
    { path: 'docs', type: 'dir', name: 'docs', isCommon: false },
    { path: 'docs/README.md', type: 'file', name: 'README.md', size: 4096, isCommon: false },
    { path: 'package.json', type: 'file', name: 'package.json', size: 1536, isCommon: true },
    { path: '.github/workflows/ci.yml', type: 'file', name: 'ci.yml', size: 800, isCommon: false },
  ];

  describe('parseFilePathsString', () => {
    it('should parse comma-separated paths', () => {
      const input = 'src/index.ts, docs/README.md, package.json';
      const result = FileTreeUtils.parseFilePathsString(input);
      
      expect(result).toEqual(['src/index.ts', 'docs/README.md', 'package.json']);
    });

    it('should handle empty string', () => {
      const result = FileTreeUtils.parseFilePathsString('');
      expect(result).toEqual([]);
    });

    it('should handle whitespace-only string', () => {
      const result = FileTreeUtils.parseFilePathsString('   ');
      expect(result).toEqual([]);
    });

    it('should handle null/undefined input', () => {
      expect(FileTreeUtils.parseFilePathsString(null as any)).toEqual([]);
      expect(FileTreeUtils.parseFilePathsString(undefined as any)).toEqual([]);
    });

    it('should trim whitespace from paths', () => {
      const input = ' src/index.ts , docs/README.md  ,  package.json ';
      const result = FileTreeUtils.parseFilePathsString(input);
      
      expect(result).toEqual(['src/index.ts', 'docs/README.md', 'package.json']);
    });

    it('should remove empty entries', () => {
      const input = 'src/index.ts, , docs/README.md, ,';
      const result = FileTreeUtils.parseFilePathsString(input);
      
      expect(result).toEqual(['src/index.ts', 'docs/README.md']);
    });

    it('should remove duplicates', () => {
      const input = 'src/index.ts, docs/README.md, src/index.ts, package.json, docs/README.md';
      const result = FileTreeUtils.parseFilePathsString(input);
      
      expect(result).toEqual(['src/index.ts', 'docs/README.md', 'package.json']);
    });

    it('should handle single path', () => {
      const result = FileTreeUtils.parseFilePathsString('src/index.ts');
      expect(result).toEqual(['src/index.ts']);
    });
  });

  describe('formatFilePathsString', () => {
    it('should format array to comma-separated string', () => {
      const input = ['src/index.ts', 'docs/README.md', 'package.json'];
      const result = FileTreeUtils.formatFilePathsString(input);
      
      expect(result).toBe('src/index.ts, docs/README.md, package.json');
    });

    it('should handle empty array', () => {
      const result = FileTreeUtils.formatFilePathsString([]);
      expect(result).toBe('');
    });

    it('should handle null/undefined input', () => {
      expect(FileTreeUtils.formatFilePathsString(null as any)).toBe('');
      expect(FileTreeUtils.formatFilePathsString(undefined as any)).toBe('');
    });

    it('should filter out empty/whitespace paths', () => {
      const input = ['src/index.ts', '', '  ', 'docs/README.md', null as any, undefined as any];
      const result = FileTreeUtils.formatFilePathsString(input);
      
      expect(result).toBe('src/index.ts, docs/README.md');
    });

    it('should trim paths', () => {
      const input = [' src/index.ts ', '  docs/README.md  '];
      const result = FileTreeUtils.formatFilePathsString(input);
      
      expect(result).toBe('src/index.ts, docs/README.md');
    });

    it('should handle single path', () => {
      const result = FileTreeUtils.formatFilePathsString(['src/index.ts']);
      expect(result).toBe('src/index.ts');
    });
  });

  describe('validateFilePaths', () => {
    it('should validate existing paths', () => {
      const paths = ['src/index.ts', 'package.json'];
      const result = FileTreeUtils.validateFilePaths(paths, sampleFileTree);
      
      expect(result.valid).toEqual(['src/index.ts', 'package.json']);
      expect(result.invalid).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should identify non-existing paths as invalid', () => {
      const paths = ['src/index.ts', 'nonexistent.ts'];
      const result = FileTreeUtils.validateFilePaths(paths, sampleFileTree);
      
      expect(result.valid).toEqual(['src/index.ts']);
      expect(result.invalid).toEqual(['nonexistent.ts']);
    });

    it('should handle directory references without trailing slash', () => {
      const paths = ['src/components'];
      const result = FileTreeUtils.validateFilePaths(paths, sampleFileTree);
      
      expect(result.valid).toEqual(['src/components']);
      expect(result.invalid).toEqual([]);
    });

    it('should detect path traversal attempts', () => {
      const paths = ['../../../etc/passwd', 'src/../../../secret.txt'];
      const result = FileTreeUtils.validateFilePaths(paths, sampleFileTree);
      
      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual(['../../../etc/passwd', 'src/../../../secret.txt']);
      expect(result.warnings).toEqual([
        'Path "../../../etc/passwd" contains path traversal sequences (../)',
        'Path "src/../../../secret.txt" contains path traversal sequences (../)'
      ]);
    });

    it('should detect absolute paths', () => {
      const paths = ['/etc/passwd', 'C:\\Windows\\System32'];
      const result = FileTreeUtils.validateFilePaths(paths, sampleFileTree);
      
      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual(['/etc/passwd', 'C:\\Windows\\System32']);
      expect(result.warnings.some(w => w.includes('absolute path'))).toBe(true);
    });

    it('should detect invalid characters', () => {
      const paths = ['file<>name.txt', 'file|name.txt'];
      const result = FileTreeUtils.validateFilePaths(paths, sampleFileTree);
      
      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual(['file<>name.txt', 'file|name.txt']);
      expect(result.warnings.some(w => w.includes('invalid characters'))).toBe(true);
    });

    it('should allow legitimate hidden files', () => {
      const paths = ['.github/workflows/ci.yml'];
      const result = FileTreeUtils.validateFilePaths(paths, sampleFileTree);
      
      expect(result.valid).toEqual(['.github/workflows/ci.yml']);
      expect(result.invalid).toEqual([]);
    });

    it('should handle partial directory matches', () => {
      const paths = ['src/'];
      // Create a file tree with subdirectories under src
      const extendedTree = [
        ...sampleFileTree,
        { path: 'src/subdirA/file.ts', type: 'file' as const, name: 'file.ts', isCommon: false },
        { path: 'src/subdirB/file.ts', type: 'file' as const, name: 'file.ts', isCommon: false },
      ];
      const result = FileTreeUtils.validateFilePaths(paths, extendedTree);
      
      expect(result.valid).toContain('src/');
      expect(result.invalid).not.toContain('src/');
    });

    it('should skip empty/whitespace paths', () => {
      const paths = ['src/index.ts', '', '  ', 'package.json'];
      const result = FileTreeUtils.validateFilePaths(paths, sampleFileTree);
      
      expect(result.valid).toEqual(['src/index.ts', 'package.json']);
    });
  });

  describe('getMatchingItems', () => {
    it('should return exact matches', () => {
      const paths = ['src/index.ts', 'package.json'];
      const result = FileTreeUtils.getMatchingItems(paths, sampleFileTree);
      
      expect(result).toHaveLength(2);
      expect(result.map(item => item.path)).toEqual(['src/index.ts', 'package.json']);
    });

    it('should handle directory matches', () => {
      const paths = ['docs'];
      const result = FileTreeUtils.getMatchingItems(paths, sampleFileTree);
      
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('docs');
    });

    it('should find child items and create virtual directories', () => {
      const paths = ['src/nonexistent'];
      // This should find items that start with 'src/nonexistent/' but won't find any
      const result = FileTreeUtils.getMatchingItems(paths, sampleFileTree);
      
      // Should return empty since no matches exist
      expect(result).toHaveLength(0);
    });

    it('should handle empty paths array', () => {
      const result = FileTreeUtils.getMatchingItems([], sampleFileTree);
      expect(result).toEqual([]);
    });

    it('should handle null/undefined paths', () => {
      expect(FileTreeUtils.getMatchingItems(null as any, sampleFileTree)).toEqual([]);
      expect(FileTreeUtils.getMatchingItems(undefined as any, sampleFileTree)).toEqual([]);
    });

    it('should avoid duplicate items', () => {
      const paths = ['src/index.ts', 'src/index.ts'];
      const result = FileTreeUtils.getMatchingItems(paths, sampleFileTree);
      
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('src/index.ts');
    });

    it('should handle directory with trailing slash', () => {
      const paths = ['docs/'];
      const result = FileTreeUtils.getMatchingItems(paths, sampleFileTree);
      
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('docs');
    });
  });

  describe('createItemDescription', () => {
    it('should create description for file with size', () => {
      const item = sampleFileTree[0]; // src/index.ts
      const result = FileTreeUtils.createItemDescription(item);
      
      expect(result).toContain('📄'); // File indicator
      expect(result).toContain('1 KB'); // File size
      expect(result).toContain('⭐'); // Common indicator
      expect(result).toContain('2 levels deep'); // Path depth
    });

    it('should create description for directory', () => {
      const item = sampleFileTree[2]; // src/components
      const result = FileTreeUtils.createItemDescription(item);
      
      expect(result).toContain('📁'); // Directory indicator
      expect(result).toContain('⭐'); // Common indicator
      expect(result).toContain('2 levels deep'); // Path depth
      expect(result).not.toContain('KB'); // No file size for directories
    });

    it('should indicate selected items', () => {
      const item = sampleFileTree[0];
      const matchingPaths = ['src/index.ts'];
      const result = FileTreeUtils.createItemDescription(item, matchingPaths);
      
      expect(result).toContain('✓ Selected');
    });

    it('should handle items without size', () => {
      const itemWithoutSize = { ...sampleFileTree[0] };
      delete (itemWithoutSize as any).size;
      const result = FileTreeUtils.createItemDescription(itemWithoutSize);
      
      expect(result).toContain('📄');
      expect(result).not.toContain('KB');
    });

    it('should truncate long descriptions', () => {
      // Create an item with a very long path to test truncation
      const longPathItem: FileTreeItem = {
        path: 'very/long/path/with/many/segments/that/should/be/truncated/because/it/exceeds/the/limit/file.ts',
        type: 'file',
        name: 'file.ts',
        size: 1024,
        isCommon: true
      };
      const result = FileTreeUtils.createItemDescription(longPathItem);
      
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should handle root level files', () => {
      const rootItem = sampleFileTree.find(item => item.path === 'package.json')!;
      const result = FileTreeUtils.createItemDescription(rootItem);
      
      expect(result).toContain('📄');
      expect(result).toContain('⭐');
      expect(result).not.toContain('levels deep'); // Root level, so no depth info
    });
  });

  describe('generateContextPrompt', () => {
    it('should generate context prompt for multiple paths', () => {
      const paths = ['src/index.ts', 'docs/README.md', 'package.json'];
      const result = FileTreeUtils.generateContextPrompt(paths);
      
      expect(result).toContain('Context files/folders to focus on:');
      expect(result).toContain('- src/index.ts');
      expect(result).toContain('- docs/README.md');
      expect(result).toContain('- package.json');
      expect(result.endsWith('\n\n')).toBe(true);
    });

    it('should handle empty paths array', () => {
      const result = FileTreeUtils.generateContextPrompt([]);
      expect(result).toBe('');
    });

    it('should handle null/undefined paths', () => {
      expect(FileTreeUtils.generateContextPrompt(null as any)).toBe('');
      expect(FileTreeUtils.generateContextPrompt(undefined as any)).toBe('');
    });

    it('should filter out empty/whitespace paths', () => {
      const paths = ['src/index.ts', '', '  ', 'docs/README.md'];
      const result = FileTreeUtils.generateContextPrompt(paths);
      
      expect(result).toContain('- src/index.ts');
      expect(result).toContain('- docs/README.md');
      expect(result).not.toContain('- \n'); // Should not contain empty bullet points
    });

    it('should truncate when exceeding length limit', () => {
      // Create many long paths to exceed the limit
      const longPaths = Array.from({ length: 50 }, (_, i) => `very/long/path/number/${i}/that/will/exceed/limit.ts`);
      const result = FileTreeUtils.generateContextPrompt(longPaths);
      
      expect(result).toContain('... and');
      expect(result).toContain('more files');
      expect(result.length).toBeLessThan(1200); // Should be under limit + some buffer
    });

    it('should handle single path', () => {
      const result = FileTreeUtils.generateContextPrompt(['src/index.ts']);
      
      expect(result).toContain('Context files/folders to focus on:');
      expect(result).toContain('- src/index.ts');
    });
  });

  describe('getFileEmoji', () => {
    it('should return correct emoji for directories', () => {
      const dirItem: FileTreeItem = { path: 'src', type: 'dir', name: 'src', isCommon: false };
      expect(FileTreeUtils.getFileEmoji(dirItem)).toBe('📁');
    });

    it('should return correct emoji for JavaScript files', () => {
      const jsItem: FileTreeItem = { path: 'app.js', type: 'file', name: 'app.js', isCommon: false };
      expect(FileTreeUtils.getFileEmoji(jsItem)).toBe('🟨');
    });

    it('should return correct emoji for TypeScript files', () => {
      const tsItem: FileTreeItem = { path: 'app.ts', type: 'file', name: 'app.ts', isCommon: false };
      expect(FileTreeUtils.getFileEmoji(tsItem)).toBe('🔷');
    });

    it('should return correct emoji for Python files', () => {
      const pyItem: FileTreeItem = { path: 'script.py', type: 'file', name: 'script.py', isCommon: false };
      expect(FileTreeUtils.getFileEmoji(pyItem)).toBe('🐍');
    });

    it('should return correct emoji for Java files', () => {
      const javaItem: FileTreeItem = { path: 'App.java', type: 'file', name: 'App.java', isCommon: false };
      expect(FileTreeUtils.getFileEmoji(javaItem)).toBe('☕');
    });

    it('should return correct emoji for configuration files', () => {
      const jsonItem: FileTreeItem = { path: 'config.json', type: 'file', name: 'config.json', isCommon: false };
      expect(FileTreeUtils.getFileEmoji(jsonItem)).toBe('⚙️');
    });

    it('should return correct emoji for markdown files', () => {
      const mdItem: FileTreeItem = { path: 'README.md', type: 'file', name: 'README.md', isCommon: false };
      expect(FileTreeUtils.getFileEmoji(mdItem)).toBe('📝');
    });

    it('should return correct emoji for Docker files', () => {
      const dockerItem: FileTreeItem = { path: 'Dockerfile', type: 'file', name: 'Dockerfile', isCommon: false };
      expect(FileTreeUtils.getFileEmoji(dockerItem)).toBe('🐳');
    });

    it('should return correct emoji for environment files', () => {
      const envItem: FileTreeItem = { path: '.env', type: 'file', name: '.env', isCommon: false };
      expect(FileTreeUtils.getFileEmoji(envItem)).toBe('🌐');
    });

    it('should return default emoji for unknown file types', () => {
      const unknownItem: FileTreeItem = { path: 'file.unknown', type: 'file', name: 'file.unknown', isCommon: false };
      expect(FileTreeUtils.getFileEmoji(unknownItem)).toBe('📄');
    });

    it('should handle case insensitive file extensions', () => {
      const upperCaseItem: FileTreeItem = { path: 'APP.JS', type: 'file', name: 'APP.JS', isCommon: false };
      expect(FileTreeUtils.getFileEmoji(upperCaseItem)).toBe('🟨');
    });
  });

  describe('sortItemsForDisplay', () => {
    it('should sort common items first', () => {
      const items: FileTreeItem[] = [
        { path: 'b.ts', type: 'file', name: 'b.ts', isCommon: false },
        { path: 'a.ts', type: 'file', name: 'a.ts', isCommon: true },
        { path: 'c.ts', type: 'file', name: 'c.ts', isCommon: false },
      ];
      
      const result = FileTreeUtils.sortItemsForDisplay(items);
      
      expect(result[0].isCommon).toBe(true);
      expect(result[0].path).toBe('a.ts');
    });

    it('should sort directories before files within same common status', () => {
      const items: FileTreeItem[] = [
        { path: 'file.ts', type: 'file', name: 'file.ts', isCommon: true },
        { path: 'dir', type: 'dir', name: 'dir', isCommon: true },
      ];
      
      const result = FileTreeUtils.sortItemsForDisplay(items);
      
      expect(result[0].type).toBe('dir');
      expect(result[1].type).toBe('file');
    });

    it('should sort alphabetically within same type and common status', () => {
      const items: FileTreeItem[] = [
        { path: 'z.ts', type: 'file', name: 'z.ts', isCommon: false },
        { path: 'a.ts', type: 'file', name: 'a.ts', isCommon: false },
        { path: 'm.ts', type: 'file', name: 'm.ts', isCommon: false },
      ];
      
      const result = FileTreeUtils.sortItemsForDisplay(items);
      
      expect(result.map(item => item.path)).toEqual(['a.ts', 'm.ts', 'z.ts']);
    });

    it('should not mutate the original array', () => {
      const items: FileTreeItem[] = [
        { path: 'b.ts', type: 'file', name: 'b.ts', isCommon: false },
        { path: 'a.ts', type: 'file', name: 'a.ts', isCommon: false },
      ];
      const originalOrder = [...items];
      
      FileTreeUtils.sortItemsForDisplay(items);
      
      expect(items).toEqual(originalOrder);
    });

    it('should handle empty array', () => {
      const result = FileTreeUtils.sortItemsForDisplay([]);
      expect(result).toEqual([]);
    });
  });

  describe('integration tests', () => {
    it('should handle full workflow: parse -> validate -> get matching -> format', () => {
      const input = 'src/index.ts, package.json, nonexistent.ts';
      
      // Parse
      const parsed = FileTreeUtils.parseFilePathsString(input);
      expect(parsed).toHaveLength(3);
      
      // Validate
      const validation = FileTreeUtils.validateFilePaths(parsed, sampleFileTree);
      expect(validation.valid).toContain('src/index.ts');
      expect(validation.valid).toContain('package.json');
      expect(validation.invalid).toContain('nonexistent.ts');
      
      // Get matching items
      const matchingItems = FileTreeUtils.getMatchingItems(validation.valid, sampleFileTree);
      expect(matchingItems).toHaveLength(2);
      
      // Format back
      const formatted = FileTreeUtils.formatFilePathsString(validation.valid);
      expect(formatted).toBe('src/index.ts, package.json');
    });
  });
});