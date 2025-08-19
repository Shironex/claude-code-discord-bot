import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { BaseService } from './base/base.service';

export interface FileTreeItem {
	readonly path: string;
	readonly type: 'file' | 'dir';
	readonly name: string;
	readonly size?: number;
	readonly isCommon: boolean;
}

export interface FileTreeResponse {
	readonly items: ReadonlyArray<FileTreeItem>;
	readonly truncated: boolean;
	readonly totalItems: number;
}

@Injectable()
export class FileExplorerService extends BaseService {
	private octokit: Octokit | null = null;
	private readonly fileTreeCache = new Map<string, { data: FileTreeResponse; timestamp: number }>();
	private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
	private readonly MAX_ITEMS = 100; // Limit items to avoid overwhelming the select menu

	// Common important directories and files that should be prioritized
	private readonly COMMON_PATHS = [
		'src/',
		'lib/',
		'app/',
		'components/',
		'pages/',
		'utils/',
		'services/',
		'hooks/',
		'types/',
		'interfaces/',
		'tests/',
		'__tests__/',
		'spec/',
		'docs/',
		'README.md',
		'package.json',
		'tsconfig.json',
		'next.config.js',
		'tailwind.config.js',
		'.env.example'
	];

	constructor(private configService: ConfigService) {
		super(FileExplorerService.name);
		const token = this.configService.get<string>('GITHUB_TOKEN');

		if (token) {
			this.octokit = new Octokit({
				auth: token
			});
			this.logger.log('File explorer service initialized with GitHub token');
		} else {
			this.logger.warn('GitHub token not found - file explorer functionality will be disabled');
		}
	}

	async getFileTree(owner: string, repo: string, ref = 'main'): Promise<FileTreeResponse> {
		const cacheKey = `${owner}/${repo}:${ref}`;
		const cached = this.fileTreeCache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
			this.logger.log(`Using cached file tree for ${cacheKey}`);
			return cached.data;
		}

		try {
			if (!this.octokit) {
				throw new Error('GitHub token not configured');
			}

			this.logger.log(`Fetching file tree for ${owner}/${repo} (${ref})`);

			// Get the repository tree from GitHub API with rate limiting
			const response = await this.makeGitHubRequest(() =>
				this.octokit!.rest.git.getTree({
					owner,
					repo,
					tree_sha: ref,
					recursive: 'true'
				})
			);

			if (!response.data.tree) {
				throw new Error('No tree data received from GitHub');
			}

			// Process and filter the tree items
			const allItems: FileTreeItem[] = response.data.tree
				.filter(item => item.path && item.type && (item.type === 'blob' || item.type === 'tree'))
				.map(item => ({
					path: item.path!,
					type: (item.type === 'tree' ? 'dir' : 'file') as 'file' | 'dir',
					name: this.extractFileName(item.path!),
					size: item.size || undefined,
					isCommon: this.isCommonPath(item.path!)
				}))
				.filter(item => this.shouldIncludeItem(item));

			// Sort items: common paths first, then directories, then files
			allItems.sort((a, b) => {
				// Common paths first
				if (a.isCommon && !b.isCommon) return -1;
				if (!a.isCommon && b.isCommon) return 1;

				// Within same common status, directories before files
				if (a.type !== b.type) {
					if (a.type === 'dir') return -1;
					if (b.type === 'dir') return 1;
				}

				// Alphabetical within same type
				return a.path.localeCompare(b.path);
			});

			// Limit items to prevent overwhelming the UI
			const items = allItems.slice(0, this.MAX_ITEMS);
			const truncated = allItems.length > this.MAX_ITEMS;

			const result: FileTreeResponse = {
				items,
				truncated,
				totalItems: allItems.length
			};

			// Cache the result
			this.fileTreeCache.set(cacheKey, {
				data: result,
				timestamp: Date.now()
			});

			this.logger.log(
				`Retrieved ${items.length} file tree items for ${cacheKey} ` +
					`(${truncated ? 'truncated from ' + allItems.length : 'complete'})`
			);

			return result;
		} catch (error: any) {
			this.logger.error(`Failed to fetch file tree for ${owner}/${repo}: ${error.message}`, error);

			// Preserve original error details for better debugging and user messages
			if (error.status) {
				// Re-throw with status code preserved for proper categorization
				const enhancedError = new Error(`Failed to fetch repository file tree: ${error.message}`);
				(enhancedError as any).status = error.status;
				(enhancedError as any).response = error.response;
				(enhancedError as any).code = error.code;
				throw enhancedError;
			}

			throw new Error(`Failed to fetch repository file tree: ${error.message}`);
		}
	}

	/**
	 * Wrapper for GitHub API requests with rate limiting and retry logic
	 */
	private async makeGitHubRequest<T>(request: () => Promise<T>, retryCount = 0): Promise<T> {
		const MAX_RETRIES = 3;
		const BASE_DELAY = 1000; // 1 second base delay

		try {
			return await request();
		} catch (error: any) {
			// Handle rate limiting specifically
			if (error.status === 403) {
				const rateLimitRemaining = error.response?.headers?.['x-ratelimit-remaining'];
				const rateLimitReset = error.response?.headers?.['x-ratelimit-reset'];

				if (rateLimitRemaining === '0' && rateLimitReset) {
					const resetTime = new Date(parseInt(rateLimitReset) * 1000);
					const waitTime = Math.max(resetTime.getTime() - Date.now(), 0);

					throw new Error(
						`GitHub API rate limit exceeded. ` +
							`Rate limit resets at ${resetTime.toISOString()}. ` +
							`Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`
					);
				}

				// If it's a different 403 error (not rate limit), check if we should retry
				if (retryCount < MAX_RETRIES) {
					const delay = BASE_DELAY * Math.pow(2, retryCount); // Exponential backoff
					this.logger.warn(
						`GitHub API request failed (403), retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
					);

					await new Promise(resolve => setTimeout(resolve, delay));
					return this.makeGitHubRequest(request, retryCount + 1);
				}
			}

			// Handle other temporary errors with retry
			if (
				(error.status >= 500 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') &&
				retryCount < MAX_RETRIES
			) {
				const delay = BASE_DELAY * Math.pow(2, retryCount); // Exponential backoff
				this.logger.warn(
					`GitHub API request failed (${error.status || error.code}), retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
				);

				await new Promise(resolve => setTimeout(resolve, delay));
				return this.makeGitHubRequest(request, retryCount + 1);
			}

			// Handle client errors with more specific messages
			if (error.status === 401) {
				throw new Error('GitHub API authentication failed. Please check your GitHub token.');
			}

			if (error.status === 404) {
				throw new Error(
					`Repository ${error.request?.path || 'not found'}. Please check the repository exists and you have access.`
				);
			}

			if (error.status === 422) {
				throw new Error(
					`Invalid request to GitHub API. ${error.message || 'Please check the repository and branch names.'}`
				);
			}

			// Re-throw original error if we can't handle it
			throw error;
		}
	}

	private extractFileName(filePath: string): string {
		if (!filePath || filePath.trim().length === 0) {
			return '';
		}

		// Normalize path separators and remove trailing slashes for processing
		const normalizedPath = filePath.replace(/[\\\/]+/g, '/').replace(/\/+$/, '');

		if (!normalizedPath) {
			return '';
		}

		const parts = normalizedPath.split('/').filter(part => part.length > 0);

		if (parts.length === 0) {
			return filePath.endsWith('/') ? '/' : filePath;
		}

		const lastPart = parts[parts.length - 1];

		// If original path ended with '/', treat as directory
		if (filePath.endsWith('/')) {
			return lastPart + '/';
		}

		return lastPart;
	}

	private isCommonPath(path: string): boolean {
		return this.COMMON_PATHS.some(commonPath => {
			if (commonPath.endsWith('/')) {
				// Directory path
				return path === commonPath.slice(0, -1) || path.startsWith(commonPath);
			}
			// Exact file match
			return path === commonPath;
		});
	}

	private shouldIncludeItem(item: FileTreeItem): boolean {
		const path = item.path;

		// Exclude common build/dependency directories
		const excludePatterns = [
			'node_modules/',
			'.git/',
			'dist/',
			'build/',
			'.next/',
			'.nuxt/',
			'coverage/',
			'.nyc_output/',
			'.vscode/',
			'.idea/',
			'__pycache__/',
			'.pytest_cache/',
			'target/',
			'bin/',
			'obj/'
		];

		// Exclude if path starts with any exclude pattern
		if (excludePatterns.some(pattern => path.startsWith(pattern))) {
			return false;
		}

		// Include if it's a common path
		if (item.isCommon) {
			return true;
		}

		// For non-common paths, apply additional filters
		// Include important file types
		if (item.type === 'file') {
			const importantExtensions = [
				'.ts',
				'.tsx',
				'.js',
				'.jsx',
				'.py',
				'.java',
				'.cs',
				'.cpp',
				'.c',
				'.h',
				'.go',
				'.rs',
				'.php',
				'.rb',
				'.vue',
				'.svelte',
				'.json',
				'.yaml',
				'.yml',
				'.toml',
				'.md',
				'.txt',
				'.sql',
				'.dockerfile',
				'Dockerfile',
				'.env'
			];

			const hasImportantExtension = importantExtensions.some(ext =>
				path.toLowerCase().endsWith(ext.toLowerCase())
			);

			if (!hasImportantExtension && !path.includes('.')) {
				// Include files without extensions (might be important scripts)
				return true;
			}

			return hasImportantExtension;
		}

		// For directories, be more selective for deeper paths
		const pathDepth = path.split('/').length;
		if (pathDepth > 3) {
			// Only include deeper directories if they seem important
			const importantDirNames = [
				'src',
				'lib',
				'app',
				'components',
				'pages',
				'utils',
				'services',
				'hooks',
				'types',
				'interfaces',
				'models',
				'controllers',
				'tests',
				'__tests__',
				'spec',
				'e2e',
				'docs',
				'documentation',
				'config',
				'configs',
				'settings'
			];

			return importantDirNames.some(name => path.toLowerCase().includes(name.toLowerCase()));
		}

		// Include all directories up to depth 3
		return true;
	}

	clearCache(): void {
		this.fileTreeCache.clear();
		this.logger.log('File tree cache cleared');
	}

	getCacheStats(): { size: number; keys: string[] } {
		return {
			size: this.fileTreeCache.size,
			keys: Array.from(this.fileTreeCache.keys())
		};
	}
}
