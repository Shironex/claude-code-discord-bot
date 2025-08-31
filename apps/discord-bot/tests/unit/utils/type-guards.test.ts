import { TypeGuards } from '@/utils/type-guards';
import { FileTreeItem } from '@/services/file-explorer.service';

describe('TypeGuards', () => {
  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(TypeGuards.isNonEmptyString('hello')).toBe(true);
      expect(TypeGuards.isNonEmptyString('a')).toBe(true);
      expect(TypeGuards.isNonEmptyString(' text ')).toBe(true);
    });

    it('should return false for empty or whitespace strings', () => {
      expect(TypeGuards.isNonEmptyString('')).toBe(false);
      expect(TypeGuards.isNonEmptyString(' ')).toBe(false);
      expect(TypeGuards.isNonEmptyString('\t\n')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(TypeGuards.isNonEmptyString(null)).toBe(false);
      expect(TypeGuards.isNonEmptyString(undefined)).toBe(false);
      expect(TypeGuards.isNonEmptyString(123)).toBe(false);
      expect(TypeGuards.isNonEmptyString({})).toBe(false);
      expect(TypeGuards.isNonEmptyString([])).toBe(false);
      expect(TypeGuards.isNonEmptyString(true)).toBe(false);
    });
  });

  describe('isValidFilePath', () => {
    it('should return true for valid file paths', () => {
      expect(TypeGuards.isValidFilePath('src/index.ts')).toBe(true);
      expect(TypeGuards.isValidFilePath('docs/README.md')).toBe(true);
      expect(TypeGuards.isValidFilePath('package.json')).toBe(true);
      expect(TypeGuards.isValidFilePath('path/with spaces/file.txt')).toBe(true);
    });

    it('should return false for paths with invalid characters', () => {
      expect(TypeGuards.isValidFilePath('file<name.txt')).toBe(false);
      expect(TypeGuards.isValidFilePath('file>name.txt')).toBe(false);
      expect(TypeGuards.isValidFilePath('file:name.txt')).toBe(false);
      expect(TypeGuards.isValidFilePath('file"name.txt')).toBe(false);
      expect(TypeGuards.isValidFilePath('file|name.txt')).toBe(false);
      expect(TypeGuards.isValidFilePath('file?name.txt')).toBe(false);
      expect(TypeGuards.isValidFilePath('file*name.txt')).toBe(false);
      expect(TypeGuards.isValidFilePath('file\x01name.txt')).toBe(false); // Control character
    });

    it('should return false for paths with null bytes', () => {
      expect(TypeGuards.isValidFilePath('file\0name.txt')).toBe(false);
    });

    it('should return false for empty or whitespace paths', () => {
      expect(TypeGuards.isValidFilePath('')).toBe(false);
      expect(TypeGuards.isValidFilePath(' ')).toBe(false);
      expect(TypeGuards.isValidFilePath('\t')).toBe(false);
    });

    it('should return false for very long paths', () => {
      const longPath = 'a'.repeat(4097);
      expect(TypeGuards.isValidFilePath(longPath)).toBe(false);
    });

    it('should return true for paths at the length limit', () => {
      const maxLengthPath = 'a'.repeat(4096);
      expect(TypeGuards.isValidFilePath(maxLengthPath)).toBe(true);
    });

    it('should return false for non-string values', () => {
      expect(TypeGuards.isValidFilePath(null)).toBe(false);
      expect(TypeGuards.isValidFilePath(undefined)).toBe(false);
      expect(TypeGuards.isValidFilePath(123)).toBe(false);
      expect(TypeGuards.isValidFilePath({})).toBe(false);
    });
  });

  describe('isValidFileTreeItem', () => {
    const validFileItem: FileTreeItem = {
      path: 'src/index.ts',
      type: 'file',
      name: 'index.ts',
      size: 1024,
      isCommon: true
    };

    const validDirItem: FileTreeItem = {
      path: 'src/components',
      type: 'dir',
      name: 'components',
      isCommon: false
    };

    it('should return true for valid file items', () => {
      expect(TypeGuards.isValidFileTreeItem(validFileItem)).toBe(true);
    });

    it('should return true for valid directory items', () => {
      expect(TypeGuards.isValidFileTreeItem(validDirItem)).toBe(true);
    });

    it('should return true for items without size property', () => {
      const itemWithoutSize = {
        path: 'src/index.ts',
        type: 'file',
        name: 'index.ts',
        isCommon: true
      };
      expect(TypeGuards.isValidFileTreeItem(itemWithoutSize)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(TypeGuards.isValidFileTreeItem(null)).toBe(false);
      expect(TypeGuards.isValidFileTreeItem(undefined)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(TypeGuards.isValidFileTreeItem('string')).toBe(false);
      expect(TypeGuards.isValidFileTreeItem(123)).toBe(false);
      expect(TypeGuards.isValidFileTreeItem([])).toBe(false);
    });

    it('should return false for objects missing required properties', () => {
      expect(TypeGuards.isValidFileTreeItem({})).toBe(false);
      expect(TypeGuards.isValidFileTreeItem({ path: 'test' })).toBe(false);
      expect(TypeGuards.isValidFileTreeItem({ path: 'test', type: 'file' })).toBe(false);
    });

    it('should return false for invalid path property', () => {
      const invalidPath = { ...validFileItem, path: '' };
      expect(TypeGuards.isValidFileTreeItem(invalidPath)).toBe(false);
    });

    it('should return false for invalid type property', () => {
      const invalidType = { ...validFileItem, type: 'invalid' };
      expect(TypeGuards.isValidFileTreeItem(invalidType)).toBe(false);
    });

    it('should return false for invalid name property', () => {
      const invalidName = { ...validFileItem, name: '' };
      expect(TypeGuards.isValidFileTreeItem(invalidName)).toBe(false);
    });

    it('should return false for non-boolean isCommon property', () => {
      const invalidCommon = { ...validFileItem, isCommon: 'true' };
      expect(TypeGuards.isValidFileTreeItem(invalidCommon)).toBe(false);
    });

    it('should return false for invalid size property', () => {
      const invalidSize = { ...validFileItem, size: 'large' };
      expect(TypeGuards.isValidFileTreeItem(invalidSize)).toBe(false);
    });
  });

  describe('isValidFilePathArray', () => {
    it('should return true for valid file path arrays', () => {
      const validPaths = ['src/index.ts', 'docs/README.md', 'package.json'];
      expect(TypeGuards.isValidFilePathArray(validPaths)).toBe(true);
    });

    it('should return true for empty arrays', () => {
      expect(TypeGuards.isValidFilePathArray([])).toBe(true);
    });

    it('should return false for non-arrays', () => {
      expect(TypeGuards.isValidFilePathArray('not an array')).toBe(false);
      expect(TypeGuards.isValidFilePathArray({})).toBe(false);
      expect(TypeGuards.isValidFilePathArray(null)).toBe(false);
    });

    it('should return false for arrays with invalid paths', () => {
      const invalidPaths = ['valid/path.txt', 'invalid<path.txt'];
      expect(TypeGuards.isValidFilePathArray(invalidPaths)).toBe(false);
    });

    it('should return false for arrays exceeding length limit', () => {
      const tooManyPaths = Array.from({ length: 101 }, (_, i) => `file${i}.txt`);
      expect(TypeGuards.isValidFilePathArray(tooManyPaths)).toBe(false);
    });

    it('should return true for arrays at the length limit', () => {
      const maxPaths = Array.from({ length: 100 }, (_, i) => `file${i}.txt`);
      expect(TypeGuards.isValidFilePathArray(maxPaths)).toBe(true);
    });

    it('should return false for arrays with mixed types', () => {
      const mixedArray = ['valid/path.txt', 123, 'another/path.txt'];
      expect(TypeGuards.isValidFilePathArray(mixedArray)).toBe(false);
    });
  });

  describe('isValidFileTreeItemArray', () => {
    const validItems: FileTreeItem[] = [
      { path: 'src/index.ts', type: 'file', name: 'index.ts', isCommon: true },
      { path: 'src/utils', type: 'dir', name: 'utils', isCommon: false }
    ];

    it('should return true for valid file tree item arrays', () => {
      expect(TypeGuards.isValidFileTreeItemArray(validItems)).toBe(true);
    });

    it('should return true for empty arrays', () => {
      expect(TypeGuards.isValidFileTreeItemArray([])).toBe(true);
    });

    it('should return false for non-arrays', () => {
      expect(TypeGuards.isValidFileTreeItemArray('not an array')).toBe(false);
      expect(TypeGuards.isValidFileTreeItemArray({})).toBe(false);
    });

    it('should return false for arrays with invalid items', () => {
      const invalidItems = [validItems[0], { invalid: 'item' }];
      expect(TypeGuards.isValidFileTreeItemArray(invalidItems)).toBe(false);
    });

    it('should return false for arrays exceeding length limit', () => {
      const tooManyItems = Array.from({ length: 1001 }, (_, i) => ({
        path: `file${i}.txt`,
        type: 'file' as const,
        name: `file${i}.txt`,
        isCommon: false
      }));
      expect(TypeGuards.isValidFileTreeItemArray(tooManyItems)).toBe(false);
    });

    it('should return true for arrays at the length limit', () => {
      const maxItems = Array.from({ length: 1000 }, (_, i) => ({
        path: `file${i}.txt`,
        type: 'file' as const,
        name: `file${i}.txt`,
        isCommon: false
      }));
      expect(TypeGuards.isValidFileTreeItemArray(maxItems)).toBe(true);
    });
  });

  describe('isValidBranchName', () => {
    it('should return true for valid branch names', () => {
      expect(TypeGuards.isValidBranchName('main')).toBe(true);
      expect(TypeGuards.isValidBranchName('feature/new-feature')).toBe(true);
      expect(TypeGuards.isValidBranchName('bugfix-123')).toBe(true);
      expect(TypeGuards.isValidBranchName('v1.0.0')).toBe(true);
      expect(TypeGuards.isValidBranchName('develop')).toBe(true);
    });

    it('should return false for branches with invalid characters', () => {
      expect(TypeGuards.isValidBranchName('branch name')).toBe(false); // space
      expect(TypeGuards.isValidBranchName('branch~name')).toBe(false);
      expect(TypeGuards.isValidBranchName('branch^name')).toBe(false);
      expect(TypeGuards.isValidBranchName('branch:name')).toBe(false);
      expect(TypeGuards.isValidBranchName('branch\\name')).toBe(false);
      expect(TypeGuards.isValidBranchName('branch?name')).toBe(false);
      expect(TypeGuards.isValidBranchName('branch*name')).toBe(false);
      expect(TypeGuards.isValidBranchName('branch[name')).toBe(false);
    });

    it('should return false for branches starting with dash', () => {
      expect(TypeGuards.isValidBranchName('-branch')).toBe(false);
    });

    it('should return false for branches ending with dot', () => {
      expect(TypeGuards.isValidBranchName('branch.')).toBe(false);
    });

    it('should return false for branches containing double dots', () => {
      expect(TypeGuards.isValidBranchName('branch..name')).toBe(false);
    });

    it('should return false for empty or whitespace branch names', () => {
      expect(TypeGuards.isValidBranchName('')).toBe(false);
      expect(TypeGuards.isValidBranchName(' ')).toBe(false);
    });

    it('should return false for very long branch names', () => {
      const longName = 'a'.repeat(256);
      expect(TypeGuards.isValidBranchName(longName)).toBe(false);
    });

    it('should return true for branch names at the length limit', () => {
      const maxLengthName = 'a'.repeat(255);
      expect(TypeGuards.isValidBranchName(maxLengthName)).toBe(true);
    });

    it('should return false for non-string values', () => {
      expect(TypeGuards.isValidBranchName(null)).toBe(false);
      expect(TypeGuards.isValidBranchName(123)).toBe(false);
      expect(TypeGuards.isValidBranchName({})).toBe(false);
    });
  });

  describe('isValidPrompt', () => {
    it('should return true for valid prompts', () => {
      expect(TypeGuards.isValidPrompt('This is a valid prompt for Claude analysis')).toBe(true);
      expect(TypeGuards.isValidPrompt('Help me refactor this code to be more maintainable')).toBe(true);
    });

    it('should return false for short prompts', () => {
      expect(TypeGuards.isValidPrompt('short')).toBe(false);
      expect(TypeGuards.isValidPrompt('too short')).toBe(false);
    });

    it('should return false for very long prompts', () => {
      const longPrompt = 'a'.repeat(6001);
      expect(TypeGuards.isValidPrompt(longPrompt)).toBe(false);
    });

    it('should return true for prompts at the length limits', () => {
      const minPrompt = 'a'.repeat(10);
      const maxPrompt = 'a'.repeat(6000);
      
      expect(TypeGuards.isValidPrompt(minPrompt)).toBe(true);
      expect(TypeGuards.isValidPrompt(maxPrompt)).toBe(true);
    });

    it('should return false for prompts with null bytes', () => {
      expect(TypeGuards.isValidPrompt('Valid prompt\0with null byte')).toBe(false);
    });

    it('should return false for empty or whitespace prompts', () => {
      expect(TypeGuards.isValidPrompt('')).toBe(false);
      expect(TypeGuards.isValidPrompt('   ')).toBe(false);
    });

    it('should handle trimming when checking length', () => {
      const paddedPrompt = '  This is exactly 10 chars  '; // 'This is exactly 10 chars' = 26 chars
      expect(TypeGuards.isValidPrompt(paddedPrompt)).toBe(true);
    });

    it('should return false for non-string values', () => {
      expect(TypeGuards.isValidPrompt(null)).toBe(false);
      expect(TypeGuards.isValidPrompt(123)).toBe(false);
      expect(TypeGuards.isValidPrompt({})).toBe(false);
    });
  });

  describe('assert', () => {
    it('should not throw for valid values', () => {
      expect(() => {
        TypeGuards.assert('hello', TypeGuards.isNonEmptyString, 'Should be non-empty string');
      }).not.toThrow();
    });

    it('should throw for invalid values with custom message', () => {
      expect(() => {
        TypeGuards.assert('', TypeGuards.isNonEmptyString, 'Value must be non-empty string');
      }).toThrow('Value must be non-empty string');
    });

    it('should properly narrow types after assertion', () => {
      const value: unknown = 'hello';
      TypeGuards.assert(value, TypeGuards.isNonEmptyString, 'Must be string');
      
      // TypeScript should now know value is a string
      expect(value.toUpperCase()).toBe('HELLO');
    });

    it('should work with custom type guards', () => {
      const isNumber = (value: unknown): value is number => typeof value === 'number';
      
      expect(() => {
        TypeGuards.assert(42, isNumber, 'Must be number');
      }).not.toThrow();

      expect(() => {
        TypeGuards.assert('not a number', isNumber, 'Must be number');
      }).toThrow('Must be number');
    });
  });

  describe('getString', () => {
    it('should return string for valid strings', () => {
      expect(TypeGuards.getString('hello')).toBe('hello');
      expect(TypeGuards.getString(' world ')).toBe(' world ');
    });

    it('should return fallback for invalid strings', () => {
      expect(TypeGuards.getString('')).toBe('');
      expect(TypeGuards.getString('', 'fallback')).toBe('fallback');
      expect(TypeGuards.getString(null, 'fallback')).toBe('fallback');
      expect(TypeGuards.getString(undefined, 'fallback')).toBe('fallback');
      expect(TypeGuards.getString(123, 'fallback')).toBe('fallback');
    });

    it('should use empty string as default fallback', () => {
      expect(TypeGuards.getString(null)).toBe('');
      expect(TypeGuards.getString(123)).toBe('');
    });

    it('should return fallback for whitespace-only strings', () => {
      expect(TypeGuards.getString(' ', 'fallback')).toBe('fallback');
      expect(TypeGuards.getString('\t\n', 'fallback')).toBe('fallback');
    });
  });

  describe('getFilePathArray', () => {
    it('should return valid file path arrays unchanged', () => {
      const validPaths = ['src/index.ts', 'docs/README.md'];
      expect(TypeGuards.getFilePathArray(validPaths)).toEqual(validPaths);
    });

    it('should return empty array for invalid input', () => {
      expect(TypeGuards.getFilePathArray(null)).toEqual([]);
      expect(TypeGuards.getFilePathArray(undefined)).toEqual([]);
      expect(TypeGuards.getFilePathArray('not an array')).toEqual([]);
      expect(TypeGuards.getFilePathArray({})).toEqual([]);
    });

    it('should return empty array for arrays with invalid paths', () => {
      const invalidPaths = ['valid/path.txt', 'invalid<path.txt'];
      expect(TypeGuards.getFilePathArray(invalidPaths)).toEqual([]);
    });

    it('should return empty array for arrays exceeding length limit', () => {
      const tooManyPaths = Array.from({ length: 101 }, (_, i) => `file${i}.txt`);
      expect(TypeGuards.getFilePathArray(tooManyPaths)).toEqual([]);
    });

    it('should return the array for valid inputs', () => {
      const validPaths = ['src/components/Button.tsx', 'package.json'];
      const result = TypeGuards.getFilePathArray(validPaths);
      
      expect(result).toBe(validPaths); // Same reference
      expect(result).toEqual(validPaths);
    });
  });

  describe('integration tests', () => {
    it('should work together in validation pipeline', () => {
      const userInput: unknown = ['src/index.ts', 'package.json'];
      
      // Validate and get safe array
      const safePaths = TypeGuards.getFilePathArray(userInput);
      expect(safePaths).toHaveLength(2);
      
      // Use assertion for type narrowing
      TypeGuards.assert(safePaths[0], TypeGuards.isValidFilePath, 'Invalid path');
      expect(safePaths[0]).toBe('src/index.ts');
    });

    it('should handle complex FileTreeItem validation', () => {
      const userInput: unknown = {
        path: 'src/components/Button.tsx',
        type: 'file',
        name: 'Button.tsx',
        size: 2048,
        isCommon: true
      };
      
      if (TypeGuards.isValidFileTreeItem(userInput)) {
        // TypeScript knows this is a FileTreeItem now
        expect(userInput.path).toBe('src/components/Button.tsx');
        expect(userInput.type).toBe('file');
        expect(userInput.size).toBe(2048);
      }
    });
  });
});