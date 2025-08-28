/**
 * Global teardown for all tests
 * Runs once after all test suites complete
 */

import * as fs from 'fs';
import * as path from 'path';

export default async function globalTeardown(): Promise<void> {
	console.log('\n🧹 Starting global test teardown...');

	// Clean up test upload directory
	const testUploadPath = process.env.UPLOAD_PATH || '/tmp/test-uploads';
	if (fs.existsSync(testUploadPath)) {
		try {
			fs.rmSync(testUploadPath, { recursive: true, force: true });
			console.log(`✓ Cleaned up test upload directory: ${testUploadPath}`);
		} catch (error) {
			console.warn(`⚠ Failed to clean up test directory: ${error}`);
		}
	}

	// Close any open database connections (if needed in future)
	// await closeTestDatabase();

	// Clear any remaining environment variables
	delete process.env.CI;

	console.log('✓ Global test teardown complete\n');
}
