// Session-related test fixtures and data scenarios

import type { UserSession } from '@/interfaces/models/session.interface';

export const sessionUsers = {
  testUser: 'test-user-id',
  botUser: 'bot-user-id',
  expiredUser: 'expired-user-id',
  nonExistentUser: 'non-existent-user-id',
};

export const sessionData = {
  initial: {
    command: 'claude',
    step: 'initial',
    selectedRepository: null,
    selectedFiles: [],
    workflowRun: null,
    prompt: null,
    images: [],
    timestamp: new Date(),
  } as any, // Simplified for testing

  repositorySelected: {
    command: 'claude',
    step: 'repository-selection',
    selectedRepository: {
      name: 'test-repo',
      fullName: 'testuser/test-repo',
      description: 'A test repository',
      language: 'TypeScript',
      isPrivate: false,
    },
    selectedFiles: [],
    workflowRun: null,
    prompt: null,
    images: [],
    timestamp: new Date(),
  } as any, // Simplified for testing

  filesSelected: {
    command: 'claude',
    step: 'file-selection',
    selectedRepository: {
      name: 'test-repo',
      fullName: 'testuser/test-repo',
      description: 'A test repository',
      language: 'TypeScript',
      isPrivate: false,
    },
    selectedFiles: [
      'src/services/github.service.ts',
      'src/services/session.service.ts',
      'README.md',
    ],
    workflowRun: null,
    prompt: null,
    images: [],
    timestamp: new Date(),
  } as any, // Simplified for testing

  promptReceived: {
    command: 'claude',
    step: 'prompt-received',
    selectedRepository: {
      name: 'test-repo',
      fullName: 'testuser/test-repo',
      description: 'A test repository',
      language: 'TypeScript',
      isPrivate: false,
    },
    selectedFiles: [
      'src/services/github.service.ts',
      'src/services/session.service.ts',
    ],
    workflowRun: null,
    prompt: 'Please add comprehensive unit tests for these services.',
    images: [],
    timestamp: new Date(),
  } as any, // Simplified for testing

  withImages: {
    command: 'claude',
    step: 'image-collection',
    selectedRepository: {
      name: 'test-repo',
      fullName: 'testuser/test-repo',
      description: 'A test repository',
      language: 'TypeScript',
      isPrivate: false,
    },
    selectedFiles: [],
    workflowRun: null,
    prompt: 'Please help me implement this UI design.',
    images: [
      {
        id: 'img-123',
        filename: 'design-mockup.png',
        url: 'https://example.com/images/img-123.png',
        size: 1024000,
        uploadedAt: new Date(),
      },
      {
        id: 'img-456',
        filename: 'user-flow.jpg',
        url: 'https://example.com/images/img-456.jpg',
        size: 512000,
        uploadedAt: new Date(),
      },
    ],
    timestamp: new Date(),
  } as any, // Simplified for testing

  workflowDispatched: {
    command: 'claude',
    step: 'workflow-dispatched',
    selectedRepository: {
      name: 'test-repo',
      fullName: 'testuser/test-repo',
      description: 'A test repository',
      language: 'TypeScript',
      isPrivate: false,
    },
    selectedFiles: [
      'src/services/github.service.ts',
    ],
    workflowRun: {
      id: 1234567890,
      status: 'queued',
      conclusion: null,
      htmlUrl: 'https://github.com/testuser/test-repo/actions/runs/1234567890',
      createdAt: new Date(),
    },
    prompt: 'Add error handling to this service.',
    images: [],
    timestamp: new Date(),
  } as any, // Simplified for testing

  workflowCompleted: {
    command: 'claude',
    step: 'workflow-completed',
    selectedRepository: {
      name: 'test-repo',
      fullName: 'testuser/test-repo',
      description: 'A test repository',
      language: 'TypeScript',
      isPrivate: false,
    },
    selectedFiles: [
      'src/services/github.service.ts',
    ],
    workflowRun: {
      id: 1234567890,
      status: 'completed',
      conclusion: 'success',
      htmlUrl: 'https://github.com/testuser/test-repo/actions/runs/1234567890',
      createdAt: new Date(),
      completedAt: new Date(),
    },
    prompt: 'Add error handling to this service.',
    images: [],
    timestamp: new Date(),
  } as any, // Simplified for testing

  workflowFailed: {
    command: 'claude',
    step: 'workflow-failed',
    selectedRepository: {
      name: 'test-repo',
      fullName: 'testuser/test-repo',
      description: 'A test repository',
      language: 'TypeScript',
      isPrivate: false,
    },
    selectedFiles: [
      'src/services/broken.service.ts',
    ],
    workflowRun: {
      id: 2345678901,
      status: 'completed',
      conclusion: 'failure',
      htmlUrl: 'https://github.com/testuser/test-repo/actions/runs/2345678901',
      createdAt: new Date(),
      completedAt: new Date(),
    },
    prompt: 'Fix the syntax errors in this service.',
    images: [],
    timestamp: new Date(),
  } as any, // Simplified for testing
};

export const sessionStates = {
  fresh: {
    userId: sessionUsers.testUser,
    data: sessionData.initial,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  active: {
    userId: sessionUsers.testUser,
    data: sessionData.repositorySelected,
    expiresAt: new Date(Date.now() + 25 * 60 * 1000), // 25 minutes from now
    createdAt: new Date(Date.now() - 5 * 60 * 1000), // Created 5 minutes ago
    updatedAt: new Date(),
  },

  aboutToExpire: {
    userId: sessionUsers.testUser,
    data: sessionData.filesSelected,
    expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
    createdAt: new Date(Date.now() - 28 * 60 * 1000), // Created 28 minutes ago
    updatedAt: new Date(Date.now() - 1 * 60 * 1000), // Updated 1 minute ago
  },

  expired: {
    userId: sessionUsers.expiredUser,
    data: sessionData.promptReceived,
    expiresAt: new Date(Date.now() - 5 * 60 * 1000), // Expired 5 minutes ago
    createdAt: new Date(Date.now() - 35 * 60 * 1000), // Created 35 minutes ago
    updatedAt: new Date(Date.now() - 5 * 60 * 1000), // Updated when it expired
  },

  withWorkflow: {
    userId: sessionUsers.testUser,
    data: sessionData.workflowDispatched,
    expiresAt: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes from now
    createdAt: new Date(Date.now() - 10 * 60 * 1000), // Created 10 minutes ago
    updatedAt: new Date(Date.now() - 1 * 60 * 1000), // Updated 1 minute ago
  },

  withImages: {
    userId: sessionUsers.testUser,
    data: sessionData.withImages,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    createdAt: new Date(Date.now() - 15 * 60 * 1000), // Created 15 minutes ago
    updatedAt: new Date(Date.now() - 2 * 60 * 1000), // Updated 2 minutes ago
  },
};

export const sessionUpdates = {
  addRepository: {
    selectedRepository: {
      name: 'new-repo',
      fullName: 'testuser/new-repo',
      description: 'A new test repository',
      language: 'JavaScript',
      isPrivate: true,
    },
    step: 'repository-selected',
  },

  addFiles: {
    selectedFiles: [
      'src/index.js',
      'package.json',
      'README.md',
    ],
    step: 'files-selected',
  },

  addPrompt: {
    prompt: 'Please refactor this code to use modern ES6+ features.',
    step: 'prompt-received',
  },

  addWorkflow: {
    workflowRun: {
      id: 9876543210,
      status: 'in_progress',
      conclusion: null,
      htmlUrl: 'https://github.com/testuser/new-repo/actions/runs/9876543210',
      createdAt: new Date(),
    },
    step: 'workflow-dispatched',
  },

  completeWorkflow: {
    'workflowRun.status': 'completed',
    'workflowRun.conclusion': 'success',
    'workflowRun.completedAt': new Date(),
    step: 'workflow-completed',
  },

  addSingleFile: {
    selectedFiles: ['src/new-service.ts'],
    step: 'file-added',
  },
};

export const sessionOperations = {
  create: (userId: string, data: any = {}) => ({
    userId,
    data: { ...sessionData.initial, ...data },
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  update: (existingSession: any, updates: any) => ({
    ...existingSession,
    data: { ...existingSession.data, ...updates },
    updatedAt: new Date(),
  }),

  expire: (session: any) => ({
    ...session,
    expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
  }),

  extend: (session: any, minutesToAdd = 30) => ({
    ...session,
    expiresAt: new Date(Date.now() + minutesToAdd * 60 * 1000),
    updatedAt: new Date(),
  }),
};

export const sessionValidationScenarios = {
  validSession: sessionStates.active,
  expiredSession: sessionStates.expired,
  missingSession: null,
  corruptedSession: {
    userId: sessionUsers.testUser,
    data: null, // Corrupted data
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  invalidExpirySession: {
    userId: sessionUsers.testUser,
    data: sessionData.initial,
    expiresAt: 'invalid-date', // Invalid expiry date
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};