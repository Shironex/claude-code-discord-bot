import { FileTreeItem } from '../services/file-explorer.service';

export class FileTreeUtils {
	/**
	 * Format file paths from comma-separated string to array, removing empty entries
	 */
	static parseFilePathsString(pathsString: string): string[] {
		if (!pathsString?.trim()) {
			return [];
		}

		return pathsString
			.split(',')
			.map(path => path.trim())
			.filter(path => path.length > 0)
			.filter((path, index, array) => array.indexOf(path) === index); // Remove duplicates
	}

	/**
	 * Format array of file paths to comma-separated string
	 */
	static formatFilePathsString(paths: string[]): string {
		if (!paths || paths.length === 0) {
			return '';
		}

		return paths
			.filter(path => path && path.trim())
			.map(path => path.trim())
			.join(', ');
	}

	/**
	 * Validate that file paths exist in the provided file tree
	 */
	static validateFilePaths(
		paths: string[],
		fileTree: FileTreeItem[]
	): {
		valid: string[];
		invalid: string[];
		warnings: string[];
	} {
		const valid: string[] = [];
		const invalid: string[] = [];
		const warnings: string[] = [];

		const treePaths = new Set(fileTree.map(item => item.path));

		for (const path of paths) {
			const cleanPath = path.trim();
			if (!cleanPath) continue;

			// Check exact match
			if (treePaths.has(cleanPath)) {
				valid.push(cleanPath);
				continue;
			}

			// Check if it's a directory reference without trailing slash
			if (treePaths.has(cleanPath + '/')) {
				valid.push(cleanPath);
				warnings.push(`Path "${cleanPath}" interpreted as directory "${cleanPath}/"`);
				continue;
			}

			// Check if it's a partial directory match (user might have specified a subdirectory)
			const partialMatches = Array.from(treePaths).filter(
				treePath =>
					treePath.startsWith(cleanPath + '/') || (cleanPath.endsWith('/') && treePath.startsWith(cleanPath))
			);

			if (partialMatches.length > 0) {
				valid.push(cleanPath);
				if (partialMatches.length > 10) {
					warnings.push(
						`Path "${cleanPath}" matches ${partialMatches.length} items (showing first 10 in context)`
					);
				}
				continue;
			}

			// No match found
			invalid.push(cleanPath);
		}

		return { valid, invalid, warnings };
	}

	/**
	 * Get file tree items that match the specified paths
	 */
	static getMatchingItems(paths: string[], fileTree: FileTreeItem[]): FileTreeItem[] {
		if (!paths || paths.length === 0) {
			return [];
		}

		const matchingItems: FileTreeItem[] = [];
		const addedPaths = new Set<string>();

		for (const targetPath of paths) {
			const cleanPath = targetPath.trim();
			if (!cleanPath || addedPaths.has(cleanPath)) continue;

			// Find exact matches
			const exactMatch = fileTree.find(item => item.path === cleanPath);
			if (exactMatch) {
				matchingItems.push(exactMatch);
				addedPaths.add(cleanPath);
				continue;
			}

			// Find directory matches (with or without trailing slash)
			const dirMatch = fileTree.find(
				item =>
					item.path === cleanPath + '/' || (cleanPath.endsWith('/') && item.path === cleanPath.slice(0, -1))
			);
			if (dirMatch) {
				matchingItems.push(dirMatch);
				addedPaths.add(cleanPath);
				continue;
			}

			// Find items within specified directories
			const childItems = fileTree.filter(item => {
				const itemPath = item.path;
				return (
					itemPath.startsWith(cleanPath + '/') || (cleanPath.endsWith('/') && itemPath.startsWith(cleanPath))
				);
			});

			if (childItems.length > 0) {
				// Add a virtual directory item if it doesn't exist
				if (!fileTree.some(item => item.path === cleanPath || item.path === cleanPath + '/')) {
					matchingItems.push({
						path: cleanPath.endsWith('/') ? cleanPath.slice(0, -1) : cleanPath,
						type: 'dir',
						name: cleanPath.split('/').pop() || cleanPath,
						isCommon: false
					});
					addedPaths.add(cleanPath);
				}

				// Add first few child items for context (limit to avoid overwhelming)
				childItems.slice(0, 5).forEach(item => {
					if (!addedPaths.has(item.path)) {
						matchingItems.push(item);
						addedPaths.add(item.path);
					}
				});
			}
		}

		return matchingItems;
	}

	/**
	 * Create a description for file tree items (for Discord select menu descriptions)
	 */
	static createItemDescription(item: FileTreeItem, matchingPaths?: string[]): string {
		const parts: string[] = [];

		// Type indicator
		parts.push(item.type === 'dir' ? '📁' : '📄');

		// File size for files
		if (item.type === 'file' && item.size !== undefined) {
			parts.push(this.formatFileSize(item.size));
		}

		// Common indicator
		if (item.isCommon) {
			parts.push('⭐');
		}

		// Path depth
		const depth = item.path.split('/').length;
		if (depth > 1) {
			parts.push(`${depth} levels deep`);
		}

		// If this item matches user selection
		if (
			matchingPaths &&
			matchingPaths.some(
				path => item.path === path || item.path.startsWith(path + '/') || path.startsWith(item.path + '/')
			)
		) {
			parts.push('✓ Selected');
		}

		return parts.join(' | ').substring(0, 100); // Discord limit
	}

	/**
	 * Format file size in human readable format
	 */
	private static formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B';

		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	/**
	 * Generate context prompt section for Claude Code
	 */
	static generateContextPrompt(paths: string[]): string {
		if (!paths || paths.length === 0) {
			return '';
		}

		const cleanPaths = paths.filter(path => path && path.trim()).map(path => path.trim());
		if (cleanPaths.length === 0) {
			return '';
		}

		return `Context files/folders to focus on:\n${cleanPaths.map(path => `- ${path}`).join('\n')}\n\n`;
	}

	/**
	 * Get emoji for file type based on path/extension
	 */
	static getFileEmoji(item: FileTreeItem): string {
		if (item.type === 'dir') {
			return '📁';
		}

		const path = item.path.toLowerCase();

		// JavaScript/TypeScript
		if (path.endsWith('.js') || path.endsWith('.jsx')) return '🟨';
		if (path.endsWith('.ts') || path.endsWith('.tsx')) return '🔷';

		// Python
		if (path.endsWith('.py')) return '🐍';

		// Java
		if (path.endsWith('.java')) return '☕';

		// C/C++
		if (path.endsWith('.c') || path.endsWith('.cpp') || path.endsWith('.h')) return '🔧';

		// Go
		if (path.endsWith('.go')) return '🐹';

		// Rust
		if (path.endsWith('.rs')) return '🦀';

		// PHP
		if (path.endsWith('.php')) return '🐘';

		// Ruby
		if (path.endsWith('.rb')) return '💎';

		// Configuration files
		if (
			path.endsWith('.json') ||
			path.endsWith('.yaml') ||
			path.endsWith('.yml') ||
			path.endsWith('.toml') ||
			path.endsWith('.xml')
		)
			return '⚙️';

		// Documentation
		if (path.endsWith('.md') || path.endsWith('.txt') || path.endsWith('.rst')) return '📝';

		// Database
		if (path.endsWith('.sql') || path.endsWith('.db')) return '🗃️';

		// Docker
		if (path.includes('dockerfile') || path.endsWith('.dockerfile')) return '🐳';

		// Environment
		if (path.includes('.env')) return '🌐';

		// Default
		return '📄';
	}

	/**
	 * Sort file tree items for display in select menu
	 */
	static sortItemsForDisplay(items: FileTreeItem[]): FileTreeItem[] {
		return [...items].sort((a, b) => {
			// Common paths first
			if (a.isCommon && !b.isCommon) return -1;
			if (!a.isCommon && b.isCommon) return 1;

			// Directories before files
			if (a.type !== b.type) {
				if (a.type === 'dir') return -1;
				if (b.type === 'dir') return 1;
			}

			// Alphabetical
			return a.path.localeCompare(b.path);
		});
	}
}
