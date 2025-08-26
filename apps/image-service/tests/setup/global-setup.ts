/**
 * Global setup for all tests
 * Runs once before all test suites
 */

import * as fs from 'fs';

export default function globalSetup(): void {
	console.log('\n🚀 Starting global test setup...');

	// Create test upload directory
	const testUploadPath = process.env.UPLOAD_PATH || '/tmp/test-uploads';
	if (!fs.existsSync(testUploadPath)) {
		fs.mkdirSync(testUploadPath, { recursive: true });
		console.log(`✓ Created test upload directory: ${testUploadPath}`);
	}

	// Set test environment variables if not already set
	process.env.NODE_ENV = 'test';
	process.env.CI = 'true'; // Simulate CI environment for consistent behavior

	// Initialize test database connection (if needed in future)
	// await initializeTestDatabase();

	console.log('✓ Global test setup complete\n');
}
