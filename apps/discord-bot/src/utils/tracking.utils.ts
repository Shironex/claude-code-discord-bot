import { randomBytes } from 'crypto';

/**
 * Utility class for managing workflow tracking IDs.
 *
 * Tracking IDs are used to identify specific workflow runs across Discord bot interactions
 * and GitHub Actions workflow executions. They help match dispatched workflows with their
 * corresponding runs when multiple workflows may be running concurrently.
 */
export class TrackingUtils {
	/**
	 * Generate a unique tracking ID for workflow dispatch.
	 *
	 * The tracking ID format ensures uniqueness and allows timestamp extraction:
	 * - Prefix: 'bot_' to identify Discord bot-generated IDs
	 * - Timestamp: Unix timestamp in milliseconds for temporal ordering
	 * - Random: 8-character hex string for collision avoidance
	 *
	 * @returns A unique tracking ID string
	 * @example
	 * ```typescript
	 * const id = TrackingUtils.generateTrackingId();
	 * console.log(id); // "bot_1704067200000_a3f2b1c4"
	 * ```
	 */
	static generateTrackingId(): string {
		const timestamp = Date.now();
		const random = randomBytes(4).toString('hex');
		return `bot_${timestamp}_${random}`;
	}

	/**
	 * Extract tracking ID from text content.
	 *
	 * Searches for the first occurrence of a valid tracking ID pattern within the given text.
	 * Commonly used to find tracking IDs in workflow run names, descriptions, or logs.
	 *
	 * @param text - The text to search for tracking ID patterns
	 * @returns The first tracking ID found, or null if none found or invalid input
	 *
	 * @example
	 * ```typescript
	 * const text = "Workflow run for bot_1704067200000_a3f2b1c4 analysis";
	 * const id = TrackingUtils.extractTrackingId(text);
	 * console.log(id); // "bot_1704067200000_a3f2b1c4"
	 *
	 * const invalid = TrackingUtils.extractTrackingId("");
	 * console.log(invalid); // null
	 * ```
	 */
	static extractTrackingId(text: string): string | null {
		if (!text || typeof text !== 'string') {
			return null;
		}

		const pattern = /bot_\d+_[a-f0-9]{8}/;
		const match = text.match(pattern);
		return match ? match[0] : null;
	}

	/**
	 * Check if text contains a specific tracking ID.
	 *
	 * Performs a simple string inclusion check to determine if the given text
	 * contains the specified tracking ID. Both inputs are validated for safety.
	 *
	 * @param text - The text to search within
	 * @param trackingId - The tracking ID to search for
	 * @returns True if the tracking ID is found in the text, false otherwise
	 *
	 * @example
	 * ```typescript
	 * const text = "Analysis for bot_1704067200000_a3f2b1c4 completed";
	 * const id = "bot_1704067200000_a3f2b1c4";
	 * const matches = TrackingUtils.isMatchingTrackingId(text, id);
	 * console.log(matches); // true
	 *
	 * const noMatch = TrackingUtils.isMatchingTrackingId(text, "bot_9999999999_xxxxxxxx");
	 * console.log(noMatch); // false
	 * ```
	 */
	static isMatchingTrackingId(text: string, trackingId: string): boolean {
		if (!text || typeof text !== 'string' || !trackingId || typeof trackingId !== 'string') {
			return false;
		}
		return text.includes(trackingId);
	}

	/**
	 * Extract timestamp from a tracking ID.
	 *
	 * Parses the tracking ID to extract the embedded timestamp component.
	 * The timestamp represents when the tracking ID was generated (Unix milliseconds).
	 * Useful for temporal analysis and debugging workflow timing issues.
	 *
	 * @param trackingId - The tracking ID to parse
	 * @returns The timestamp in milliseconds, or null if invalid/malformed
	 *
	 * @example
	 * ```typescript
	 * const id = "bot_1704067200000_a3f2b1c4";
	 * const timestamp = TrackingUtils.getTimestampFromTrackingId(id);
	 * console.log(timestamp); // 1704067200000
	 * console.log(new Date(timestamp)); // 2024-01-01T00:00:00.000Z
	 *
	 * const invalid = TrackingUtils.getTimestampFromTrackingId("invalid_id");
	 * console.log(invalid); // null
	 * ```
	 */
	static getTimestampFromTrackingId(trackingId: string): number | null {
		if (!trackingId || typeof trackingId !== 'string') {
			return null;
		}

		const parts = trackingId.split('_');
		if (parts.length === 3 && parts[0] === 'bot') {
			const timestamp = parseInt(parts[1], 10);
			return isNaN(timestamp) ? null : timestamp;
		}
		return null;
	}
}
