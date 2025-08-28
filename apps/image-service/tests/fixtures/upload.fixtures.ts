/**
 * Upload-related test fixtures
 */

import { Express } from 'express';
import { BatchUploadOptionsDto } from '../../src/common/dto';

/**
 * Single upload options fixtures (for uploadSingle)
 */
export const UPLOAD_OPTIONS_FIXTURES = {
  default: {
    ttl: 3600,
    userId: 'test-user-123'
  } as { ttl?: number; userId?: string },
  
  shortTtl: {
    ttl: 300, // 5 minutes
    userId: 'test-user-456'
  } as { ttl?: number; userId?: string },
  
  longTtl: {
    ttl: 86400, // 24 hours
    userId: 'test-user-789'
  } as { ttl?: number; userId?: string },
  
  noUser: {
    ttl: 3600,
    userId: undefined
  } as { ttl?: number; userId?: string },
  
  invalidTtl: {
    ttl: -1,
    userId: 'test-user'
  } as { ttl?: number; userId?: string },
  
  zeroTtl: {
    ttl: 0,
    userId: 'test-user'
  } as { ttl?: number; userId?: string }
};

/**
 * Batch upload options fixtures (for uploadBatch)
 */
export const BATCH_UPLOAD_OPTIONS_FIXTURES = {
  default: {
    ttl: 3600,
    userId: 'test-user-123'
  } as BatchUploadOptionsDto,
  
  shortTtl: {
    ttl: 300,
    userId: 'test-user-456'
  } as BatchUploadOptionsDto,
  
  longTtl: {
    ttl: 86400,
    userId: 'test-user-789'
  } as BatchUploadOptionsDto
};

/**
 * Batch upload fixtures
 */
export const BATCH_UPLOAD_FIXTURES = {
  twoFiles: {
    files: [
      {
        fieldname: 'images',
        originalname: 'image1.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 102400,
        buffer: Buffer.from('image1 data')
      },
      {
        fieldname: 'images',
        originalname: 'image2.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 204800,
        buffer: Buffer.from('image2 data')
      }
    ] as Express.Multer.File[],
    options: BATCH_UPLOAD_OPTIONS_FIXTURES.default
  },
  
  mixedTypes: {
    files: [
      {
        fieldname: 'images',
        originalname: 'valid.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 102400,
        buffer: Buffer.from('valid image')
      },
      {
        fieldname: 'images',
        originalname: 'invalid.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 204800,
        buffer: Buffer.from('pdf data')
      },
      {
        fieldname: 'images',
        originalname: 'valid2.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 153600,
        buffer: Buffer.from('png data')
      }
    ] as Express.Multer.File[],
    options: BATCH_UPLOAD_OPTIONS_FIXTURES.default
  },
  
  largeFiles: {
    files: [
      {
        fieldname: 'images',
        originalname: 'large1.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 9 * 1024 * 1024, // 9MB
        buffer: Buffer.alloc(9 * 1024 * 1024)
      },
      {
        fieldname: 'images',
        originalname: 'too-large.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 11 * 1024 * 1024, // 11MB - over limit
        buffer: Buffer.alloc(11 * 1024 * 1024)
      }
    ] as Express.Multer.File[],
    options: BATCH_UPLOAD_OPTIONS_FIXTURES.default
  },
  
  emptyBatch: {
    files: [] as Express.Multer.File[],
    options: BATCH_UPLOAD_OPTIONS_FIXTURES.default
  },
  
  tenFiles: {
    files: Array.from({ length: 10 }, (_, i) => ({
      fieldname: 'images',
      originalname: 'image' + (i + 1) + '.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 102400 + (i * 1024),
      buffer: Buffer.from('image' + (i + 1) + ' data')
    })) as Express.Multer.File[],
    options: BATCH_UPLOAD_OPTIONS_FIXTURES.default
  }
};

/**
 * File path test cases
 */
export const FILE_PATH_CASES = {
  valid: [
    'image.jpg',
    'my-photo.png',
    'file_name.gif',
    '123456.jpeg',
    'image (1).jpg'
  ],
  
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\windows\\system32',
    'images/../../../secret.txt',
    './././../config.json',
    '.../.../.../.../etc/shadow'
  ],
  
  specialChars: [
    'file<script>.jpg',
    'image;rm -rf.png',
    'photo|echo.gif',
    'pic&command.jpeg',
    'img>redirect.jpg'
  ],
  
  unicode: [
    '图片.jpg',
    'фото.png',
    '画像.gif',
    'εικόνα.jpeg',
    '🎨artwork.jpg'
  ]
};

/**
 * Upload error scenarios
 */
export const UPLOAD_ERROR_SCENARIOS = {
  fileValidationError: {
    error: 'File validation failed',
    details: ['Invalid file type', 'File size exceeds limit']
  },
  
  storageError: {
    error: 'Storage error',
    details: ['Failed to write file to disk']
  },
  
  metadataError: {
    error: 'Metadata generation failed',
    details: ['Invalid metadata format']
  },
  
  redisError: {
    error: 'Cache error',
    details: ['Failed to store metadata in cache']
  },
  
  quotaExceeded: {
    error: 'Quota exceeded',
    details: ['User has exceeded upload quota']
  }
};

/**
 * Upload response test cases
 */
export const UPLOAD_RESPONSE_CASES = {
  successSingle: {
    statusCode: 201,
    body: {
      success: true,
      data: {
        id: 'uploaded-123',
        url: '/images/uploaded-123',
        metadata: {
          size: 102400,
          mimeType: 'image/jpeg',
          originalName: 'test.jpg'
        }
      }
    }
  },
  
  successBatch: {
    statusCode: 201,
    body: {
      success: true,
      data: {
        uploaded: 3,
        failed: 0,
        total: 3,
        files: [
          { id: 'file-1', url: '/images/file-1' },
          { id: 'file-2', url: '/images/file-2' },
          { id: 'file-3', url: '/images/file-3' }
        ]
      }
    }
  },
  
  partialSuccess: {
    statusCode: 207, // Multi-status
    body: {
      success: true,
      data: {
        uploaded: 2,
        failed: 1,
        total: 3,
        files: [
          { id: 'file-1', url: '/images/file-1' },
          { id: 'file-2', url: '/images/file-2' }
        ],
        errors: [
          { file: 'file-3', error: 'Invalid file type' }
        ]
      }
    }
  },
  
  validationError: {
    statusCode: 400,
    body: {
      success: false,
      error: 'Validation failed',
      details: ['File type not allowed']
    }
  },
  
  authError: {
    statusCode: 401,
    body: {
      success: false,
      error: 'Unauthorized',
      message: 'Invalid API key'
    }
  },
  
  serverError: {
    statusCode: 500,
    body: {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    }
  }
};
