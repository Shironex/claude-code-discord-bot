/**
 * Image-related test fixtures
 */

import { ImageMetadata } from '../../src/common/interfaces';

/**
 * Sample image metadata
 */
export const IMAGE_METADATA_FIXTURES = {
  basic: {
    id: 'test-image-id-123456789',
    size: 102400, // 100KB
    mimeType: 'image/jpeg',
    uploadedAt: new Date('2024-01-01T00:00:00Z'),
    expiresAt: new Date('2024-01-01T01:00:00Z'),
    originalName: 'test-image.jpg',
    userId: 'user-123'
  } as ImageMetadata,

  png: {
    id: 'png-image-id-987654321',
    size: 204800, // 200KB
    mimeType: 'image/png',
    uploadedAt: new Date('2024-01-01T00:00:00Z'),
    expiresAt: new Date('2024-01-01T02:00:00Z'),
    originalName: 'test-image.png',
    userId: 'user-456'
  } as ImageMetadata,

  gif: {
    id: 'gif-image-id-111222333',
    size: 512000, // 500KB
    mimeType: 'image/gif',
    uploadedAt: new Date('2024-01-01T00:00:00Z'),
    expiresAt: new Date('2024-01-01T03:00:00Z'),
    originalName: 'animated.gif',
    userId: 'user-789'
  } as ImageMetadata,

  noUser: {
    id: 'no-user-image-id-444555',
    size: 51200, // 50KB
    mimeType: 'image/jpeg',
    uploadedAt: new Date('2024-01-01T00:00:00Z'),
    expiresAt: new Date('2024-01-01T00:30:00Z'),
    originalName: 'anonymous.jpg',
    userId: undefined
  } as ImageMetadata
};

/**
 * Image upload response fixtures
 */
export const IMAGE_UPLOAD_RESPONSE_FIXTURES = {
  success: {
    id: 'uploaded-image-123',
    url: '/images/uploaded-image-123',
    expires: '2024-01-01T01:00:00.000Z',
    size: 102400,
    originalName: 'test-image.jpg',
    mimeType: 'image/jpeg'
  },

  batchSuccess: {
    images: [
      {
        id: 'batch-image-1',
        url: '/images/batch-image-1',
        expires: '2024-01-01T01:00:00.000Z',
        size: 102400,
        originalName: 'image1.jpg',
        mimeType: 'image/jpeg'
      },
      {
        id: 'batch-image-2',
        url: '/images/batch-image-2',
        expires: '2024-01-01T01:00:00.000Z',
        size: 204800,
        originalName: 'image2.jpg',
        mimeType: 'image/jpeg'
      }
    ],
    totalCount: 2,
    successCount: 2
  },

  partialBatchSuccess: {
    images: [
      {
        id: 'batch-image-1',
        url: '/images/batch-image-1',
        expires: '2024-01-01T01:00:00.000Z',
        size: 102400,
        originalName: 'image1.jpg',
        mimeType: 'image/jpeg'
      }
    ],
    totalCount: 2,
    successCount: 1,
    errors: [
      {
        index: 1,
        error: 'Invalid file type',
        filename: 'image2.pdf'
      }
    ]
  },

  error: {
    success: false,
    error: 'File validation failed',
    message: 'The uploaded file is not a valid image'
  }
};

/**
 * Sample image file data
 */
export const IMAGE_FILE_DATA = {
  jpeg: Buffer.from('FFD8FFE0', 'hex'), // JPEG magic bytes
  png: Buffer.from('89504E47', 'hex'),  // PNG magic bytes
  gif: Buffer.from('47494638', 'hex'),  // GIF magic bytes
  invalid: Buffer.from('25504446', 'hex') // PDF magic bytes
};

/**
 * Image validation test cases
 */
export const IMAGE_VALIDATION_CASES = {
  validTypes: [
    { mimeType: 'image/jpeg', extension: 'jpg' },
    { mimeType: 'image/jpeg', extension: 'jpeg' },
    { mimeType: 'image/png', extension: 'png' },
    { mimeType: 'image/gif', extension: 'gif' },
    { mimeType: 'image/webp', extension: 'webp' },
    { mimeType: 'image/svg+xml', extension: 'svg' }
  ],
  
  invalidTypes: [
    { mimeType: 'application/pdf', extension: 'pdf' },
    { mimeType: 'text/plain', extension: 'txt' },
    { mimeType: 'application/json', extension: 'json' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'audio/mpeg', extension: 'mp3' }
  ],
  
  edgeCases: [
    { mimeType: 'image/jpeg', extension: 'JPG' }, // Uppercase extension
    { mimeType: 'image/png', extension: '.png' }, // Leading dot
    { mimeType: 'image/gif', extension: '' }, // No extension
  ]
};

/**
 * File size test cases
 */
export const FILE_SIZE_CASES = {
  valid: [
    { size: 100, description: '100 bytes' },
    { size: 1024, description: '1KB' },
    { size: 1024 * 1024, description: '1MB' },
    { size: 10 * 1024 * 1024, description: '10MB (max)' }
  ],
  
  invalid: [
    { size: 0, description: 'Empty file' },
    { size: -1, description: 'Negative size' },
    { size: 10 * 1024 * 1024 + 1, description: 'Over 10MB' },
    { size: 100 * 1024 * 1024, description: '100MB' }
  ]
};
