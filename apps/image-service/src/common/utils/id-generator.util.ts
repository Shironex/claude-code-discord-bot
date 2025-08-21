import { nanoid, customAlphabet } from 'nanoid';

/**
 * Utility class for generating unique IDs
 */
export class IdGeneratorUtil {
	// Use URL-safe characters excluding similar looking ones (0, O, I, l)
	private static readonly SAFE_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
	private static readonly DEFAULT_LENGTH = 12;
	private static readonly SHORT_LENGTH = 8;
	private static readonly LONG_LENGTH = 16;

	/**
	 * Generate a standard image ID
	 * @returns string - 12 character URL-safe ID
	 */
	static generateImageId(): string {
		const generate = customAlphabet(this.SAFE_ALPHABET, this.DEFAULT_LENGTH);
		return generate();
	}

	/**
	 * Generate a short ID for temporary use
	 * @returns string - 8 character URL-safe ID
	 */
	static generateShortId(): string {
		const generate = customAlphabet(this.SAFE_ALPHABET, this.SHORT_LENGTH);
		return generate();
	}

	/**
	 * Generate a long ID for enhanced security
	 * @returns string - 16 character URL-safe ID
	 */
	static generateLongId(): string {
		const generate = customAlphabet(this.SAFE_ALPHABET, this.LONG_LENGTH);
		return generate();
	}

	/**
	 * Generate a custom length ID
	 * @param length Desired length
	 * @returns string - Custom length URL-safe ID
	 */
	static generateCustomId(length: number): string {
		if (length < 4 || length > 32) {
			throw new Error('ID length must be between 4 and 32 characters');
		}
		const generate = customAlphabet(this.SAFE_ALPHABET, length);
		return generate();
	}

	/**
	 * Generate a prefixed ID (e.g., img_abc123def456)
	 * @param prefix Prefix to add
	 * @param length Length of the random part (default: 12)
	 * @returns string - Prefixed ID
	 */
	static generatePrefixedId(prefix: string, length: number = this.DEFAULT_LENGTH): string {
		if (!prefix || prefix.length > 10) {
			throw new Error('Prefix must be provided and not exceed 10 characters');
		}
		const generate = customAlphabet(this.SAFE_ALPHABET, length);
		return `${prefix}_${generate()}`;
	}

	/**
	 * Generate a timestamp-based ID for sorting
	 * @returns string - Timestamp + random ID
	 */
	static generateTimestampId(): string {
		const timestamp = Date.now().toString(36); // Base36 encoding of timestamp
		const random = customAlphabet(this.SAFE_ALPHABET, 8)();
		return `${timestamp}${random}`;
	}

	/**
	 * Generate a request ID for tracking
	 * @returns string - Request tracking ID
	 */
	static generateRequestId(): string {
		return this.generatePrefixedId('req', 10);
	}

	/**
	 * Generate a user session ID
	 * @returns string - User session ID
	 */
	static generateSessionId(): string {
		return this.generatePrefixedId('ses', 16);
	}

	/**
	 * Generate a cleanup job ID
	 * @returns string - Cleanup job ID
	 */
	static generateCleanupId(): string {
		return this.generatePrefixedId('cleanup', 8);
	}

	/**
	 * Validate if an ID follows our format
	 * @param id ID to validate
	 * @returns boolean
	 */
	static isValidId(id: string): boolean {
		if (!id || typeof id !== 'string') {
			return false;
		}

		// Check if it's a prefixed ID
		if (id.includes('_')) {
			const parts = id.split('_');
			if (parts.length !== 2) {
				return false;
			}
			const [prefix, randomPart] = parts;
			return prefix.length <= 10 && this.isValidRandomPart(randomPart);
		}

		// Check if it's a plain ID
		return this.isValidRandomPart(id);
	}

	/**
	 * Extract prefix from a prefixed ID
	 * @param id Prefixed ID
	 * @returns string | null - Prefix or null if not prefixed
	 */
	static extractPrefix(id: string): string | null {
		if (!id.includes('_')) {
			return null;
		}
		const parts = id.split('_');
		return parts.length === 2 ? parts[0] : null;
	}

	/**
	 * Extract random part from an ID
	 * @param id ID (prefixed or not)
	 * @returns string - Random part
	 */
	static extractRandomPart(id: string): string {
		if (!id.includes('_')) {
			return id;
		}
		const parts = id.split('_');
		return parts.length === 2 ? parts[1] : id;
	}

	/**
	 * Check if a string is a valid random part
	 * @param randomPart String to check
	 * @returns boolean
	 */
	private static isValidRandomPart(randomPart: string): boolean {
		if (!randomPart || randomPart.length < 4 || randomPart.length > 32) {
			return false;
		}

		// Check if all characters are from our safe alphabet
		return randomPart.split('').every((char) => this.SAFE_ALPHABET.includes(char));
	}

	/**
	 * Generate a standard nanoid (for compatibility)
	 * @param length Optional length (default: 21)
	 * @returns string - Standard nanoid
	 */
	static generateNanoId(length: number = 21): string {
		return nanoid(length);
	}
}
