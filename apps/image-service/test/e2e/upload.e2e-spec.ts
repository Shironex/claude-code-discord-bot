/**
 * Upload E2E Integration Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { API_KEY_FIXTURES, HMAC_FIXTURES } from '../../tests/fixtures';

describe('Upload E2E', () => {
	let app: INestApplication;

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	describe('POST /upload', () => {
		it('should upload file with valid authentication', () => {
			return request(app.getHttpServer())
				.post('/upload')
				.set('X-API-Key', API_KEY_FIXTURES.discord)
				.attach('file', Buffer.from('test image'), 'test.jpg')
				.field('ttl', '3600')
				.expect(201)
				.expect((res) => {
					expect(res.body.success).toBe(true);
					expect(res.body.data).toHaveProperty('id');
					expect(res.body.data).toHaveProperty('url');
				});
		});

		it('should reject request without authentication', () => {
			return request(app.getHttpServer()).post('/upload').attach('file', Buffer.from('test image'), 'test.jpg').expect(401);
		});

		it('should reject invalid file types', () => {
			return request(app.getHttpServer())
				.post('/upload')
				.set('X-API-Key', API_KEY_FIXTURES.discord)
				.attach('file', Buffer.from('not an image'), 'test.pdf')
				.expect(400)
				.expect((res) => {
					expect(res.body.success).toBe(false);
					expect(res.body.error).toContain('validation');
				});
		});

		it('should handle HMAC authentication', () => {
			const timestamp = Date.now().toString();
			const payload = JSON.stringify({ test: 'data' });
			const signature = HMAC_FIXTURES.generateSignature(timestamp + payload);

			return request(app.getHttpServer())
				.post('/upload')
				.set('X-API-Key', API_KEY_FIXTURES.discord)
				.set('X-Signature', signature)
				.set('X-Timestamp', timestamp)
				.attach('file', Buffer.from('test image'), 'test.jpg')
				.send(payload)
				.expect(201);
		});
	});

	describe('POST /upload/batch', () => {
		it('should upload multiple files', () => {
			return request(app.getHttpServer())
				.post('/upload/batch')
				.set('X-API-Key', API_KEY_FIXTURES.discord)
				.attach('files', Buffer.from('image1'), 'image1.jpg')
				.attach('files', Buffer.from('image2'), 'image2.jpg')
				.attach('files', Buffer.from('image3'), 'image3.jpg')
				.expect(201)
				.expect((res) => {
					expect(res.body.success).toBe(true);
					expect(res.body.data.total).toBe(3);
					expect(res.body.data.uploaded).toHaveLength(3);
				});
		});

		it('should handle partial batch failures', () => {
			return request(app.getHttpServer())
				.post('/upload/batch')
				.set('X-API-Key', API_KEY_FIXTURES.discord)
				.attach('files', Buffer.from('image1'), 'image1.jpg')
				.attach('files', Buffer.from('not image'), 'document.pdf')
				.attach('files', Buffer.from('image3'), 'image3.png')
				.expect(207) // Multi-status
				.expect((res) => {
					expect(res.body.success).toBe(true);
					expect(res.body.data.successful).toBe(2);
					expect(res.body.data.failed).toHaveLength(1);
				});
		});
	});

	describe('GET /images/:id', () => {
		let uploadedImageId: string;

		beforeEach(async () => {
			// Upload an image first
			const uploadRes = await request(app.getHttpServer())
				.post('/upload')
				.set('X-API-Key', API_KEY_FIXTURES.discord)
				.attach('file', Buffer.from('test image data'), 'test.jpg')
				.expect(201);

			uploadedImageId = uploadRes.body.data.id;
		});

		it('should retrieve uploaded image', () => {
			return request(app.getHttpServer())
				.get(`/images/${uploadedImageId}`)
				.set('X-API-Key', API_KEY_FIXTURES.discord)
				.expect(200)
				.expect('Content-Type', /image/)
				.expect((res) => {
					expect(res.body).toBeDefined();
				});
		});

		it('should return 404 for non-existent image', () => {
			return request(app.getHttpServer()).get('/images/non-existent-id').set('X-API-Key', API_KEY_FIXTURES.discord).expect(404);
		});

		it('should require authentication for image retrieval', () => {
			return request(app.getHttpServer()).get(`/images/${uploadedImageId}`).expect(401);
		});
	});

	describe('DELETE /images/:id', () => {
		let uploadedImageId: string;

		beforeEach(async () => {
			// Upload an image first
			const uploadRes = await request(app.getHttpServer())
				.post('/upload')
				.set('X-API-Key', API_KEY_FIXTURES.discord)
				.attach('file', Buffer.from('test image data'), 'test.jpg')
				.expect(201);

			uploadedImageId = uploadRes.body.data.id;
		});

		it('should delete uploaded image', () => {
			return request(app.getHttpServer())
				.delete(`/images/${uploadedImageId}`)
				.set('X-API-Key', API_KEY_FIXTURES.discord)
				.expect(200)
				.expect((res) => {
					expect(res.body.success).toBe(true);
					expect(res.body.message).toContain('deleted');
				});
		});

		it('should return 404 when deleting non-existent image', () => {
			return request(app.getHttpServer()).delete('/images/non-existent-id').set('X-API-Key', API_KEY_FIXTURES.discord).expect(404);
		});

		it('should prevent double deletion', async () => {
			// First deletion
			await request(app.getHttpServer()).delete(`/images/${uploadedImageId}`).set('X-API-Key', API_KEY_FIXTURES.discord).expect(200);

			// Second deletion should fail
			return request(app.getHttpServer()).delete(`/images/${uploadedImageId}`).set('X-API-Key', API_KEY_FIXTURES.discord).expect(404);
		});
	});

	describe('Health Check', () => {
		it('should return healthy status', () => {
			return request(app.getHttpServer())
				.get('/health')
				.expect(200)
				.expect((res) => {
					expect(res.body.status).toBe('healthy');
					expect(res.body.uptime).toBeGreaterThan(0);
				});
		});
	});
});
