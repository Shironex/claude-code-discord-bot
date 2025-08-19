/**
 * Type guard utilities for runtime validation and stricter type checking
 */

import { FileTreeItem } from '../services/file-explorer.service';

export class TypeGuards {
	/**
	 * Check if a value is a non-empty string
	 */
	static isNonEmptyString(value: unknown): value is string {
		return typeof value === 'string' && value.trim().length > 0;
	}

	/**
	 * Check if a value is a valid file path string
	 */
	static isValidFilePath(value: unknown): value is string {
		return (
			typeof value === 'string' &&
			value.trim().length > 0 &&
			!value.includes('\0') && // No null bytes
			value.length <= 4096 && // Reasonable path length limit
			!/[<>:"|?*\x00-\x1f]/.test(value) // No invalid characters
		);
	}

	/**
	 * Check if a value is a valid FileTreeItem
	 */
	static isValidFileTreeItem(value: unknown): value is FileTreeItem {
		return (
			typeof value === 'object' &&
			value !== null &&
			'path' in value &&
			'type' in value &&
			'name' in value &&
			'isCommon' in value &&
			this.isValidFilePath((value as any).path) &&
			((value as any).type === 'file' || (value as any).type === 'dir') &&
			this.isNonEmptyString((value as any).name) &&
			typeof (value as any).isCommon === 'boolean' &&
			(typeof (value as any).size === 'undefined' || typeof (value as any).size === 'number')
		);
	}

	/**
	 * Check if a value is a valid array of file paths
	 */
	static isValidFilePathArray(value: unknown): value is readonly string[] {
		return (
			Array.isArray(value) &&
			value.length <= 100 && // Reasonable limit
			value.every(item => this.isValidFilePath(item))
		);
	}

	/**
	 * Check if a value is a valid array of FileTreeItems
	 */
	static isValidFileTreeItemArray(value: unknown): value is readonly FileTreeItem[] {
		return (
			Array.isArray(value) &&
			value.length <= 1000 && // Reasonable limit
			value.every(item => this.isValidFileTreeItem(item))
		);
	}

	/**
	 * Check if a value is a valid branch name
	 */
	static isValidBranchName(value: unknown): value is string {
		return (
			typeof value === 'string' &&
			value.trim().length > 0 &&
			value.length <= 255 && // Git branch name limit
			!/[\s~\^:\\?\*\[]/.test(value) && // Invalid git ref characters
			!value.startsWith('-') &&
			!value.endsWith('.') &&
			!value.includes('..')
		);
	}

	/**
	 * Check if a value is a valid prompt string
	 */
	static isValidPrompt(value: unknown): value is string {
		return (
			typeof value === 'string' &&
			value.trim().length >= 10 &&
			value.trim().length <= 6000 && // Conservative limit including context
			!value.includes('\0') // No null bytes
		);
	}

	/**
	 * Assert that a value matches a type guard, throwing if not
	 */
	static assert<T>(
		value: unknown,
		guard: (value: unknown) => value is T,
		message: string
	): asserts value is T {
		if (!guard(value)) {
			throw new Error(message);
		}
	}

	/**
	 * Safely get string value with fallback
	 */
	static getString(value: unknown, fallback = ''): string {
		return this.isNonEmptyString(value) ? value : fallback;
	}

	/**
	 * Safely get file path array with validation
	 */
	static getFilePathArray(value: unknown): readonly string[] {
		if (this.isValidFilePathArray(value)) {
			return value;
		}
		return [];
	}
}