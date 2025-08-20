import { randomBytes } from 'crypto';

export class TrackingUtils {
	/**
	 * Generate a unique tracking ID for workflow dispatch
	 * Format: bot_TIMESTAMP_RANDOM
	 * Example: bot_1704067200000_a3f2b1c4
	 */
	static generateTrackingId(): string {
		const timestamp = Date.now();
		const random = randomBytes(4).toString('hex');
		return `bot_${timestamp}_${random}`;
	}

	/**
	 * Extract tracking ID from workflow run name or description
	 * Looks for pattern: bot_TIMESTAMP_RANDOM
	 */
	static extractTrackingId(text: string): string | null {
		const pattern = /bot_\d+_[a-f0-9]{8}/;
		const match = text.match(pattern);
		return match ? match[0] : null;
	}

	/**
	 * Check if a tracking ID matches
	 */
	static isMatchingTrackingId(text: string, trackingId: string): boolean {
		return text.includes(trackingId);
	}

	/**
	 * Parse tracking ID to get timestamp
	 */
	static getTimestampFromTrackingId(trackingId: string): number | null {
		const parts = trackingId.split('_');
		if (parts.length === 3 && parts[0] === 'bot') {
			const timestamp = parseInt(parts[1], 10);
			return isNaN(timestamp) ? null : timestamp;
		}
		return null;
	}
}