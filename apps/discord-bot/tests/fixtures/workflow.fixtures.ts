// Workflow-related test fixtures and data scenarios

export const workflowTemplates = {
  singleStep: `name: Claude Code Integration - Single Step
on:
  workflow_dispatch:
    inputs:
      prompt:
        description: 'Instructions for Claude'
        required: true
        type: string
      files:
        description: 'Files to include (JSON array)'
        required: false
        type: string
        default: '[]'

jobs:
  claude_integration:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Run Claude
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          echo "Running Claude with prompt: \${{ github.event.inputs.prompt }}"
          echo "Files: \${{ github.event.inputs.files }}"`,

  twoStep: `name: Claude Code Integration - Two Step
on:
  workflow_dispatch:
    inputs:
      prompt:
        description: 'Instructions for Claude'
        required: true
        type: string
      files:
        description: 'Files to include (JSON array)'
        required: false
        type: string
        default: '[]'

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install

  claude_integration:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Run Claude
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          echo "Running Claude with prompt: \${{ github.event.inputs.prompt }}"
          echo "Files: \${{ github.event.inputs.files }}"`,

  selfHosted: `name: Claude Code Integration - Self Hosted
on:
  workflow_dispatch:
    inputs:
      prompt:
        description: 'Instructions for Claude'
        required: true
        type: string
      files:
        description: 'Files to include (JSON array)'
        required: false
        type: string
        default: '[]'

jobs:
  claude_integration:
    runs-on: self-hosted
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Run Claude
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          echo "Running Claude with prompt: \${{ github.event.inputs.prompt }}"
          echo "Files: \${{ github.event.inputs.files }}"`,
};

export const workflowInputs = {
  basic: {
    prompt: 'Please add comprehensive unit tests for the GitHub service.',
    files: JSON.stringify([
      'src/services/github.service.ts',
      'src/interfaces/services/github.interface.ts',
    ]),
  },

  withImages: {
    prompt: 'Implement the UI design shown in the uploaded images.',
    files: JSON.stringify([]),
    images: JSON.stringify([
      { id: 'img-123', url: 'https://example.com/images/img-123.png' },
      { id: 'img-456', url: 'https://example.com/images/img-456.jpg' },
    ]),
  },

  multipleFiles: {
    prompt: 'Refactor these services to follow the latest design patterns.',
    files: JSON.stringify([
      'src/services/github.service.ts',
      'src/services/session.service.ts',
      'src/services/workflow.service.ts',
      'src/services/embed.service.ts',
    ]),
  },

  documentationOnly: {
    prompt: 'Update the documentation to reflect recent API changes.',
    files: JSON.stringify([
      'README.md',
      'docs/api.md',
      'docs/setup.md',
    ]),
  },

  emptyFiles: {
    prompt: 'Create a new microservice for handling user preferences.',
    files: JSON.stringify([]),
  },

  longPrompt: {
    prompt: `Please implement a comprehensive authentication system with the following requirements:
    
    1. JWT-based authentication with refresh tokens
    2. Role-based access control (RBAC)
    3. Multi-factor authentication (MFA) support
    4. OAuth integration with GitHub, Google, and Microsoft
    5. Password strength validation and hashing
    6. Account lockout after failed attempts
    7. Email verification and password reset flows
    8. Audit logging for all authentication events
    9. Rate limiting for authentication endpoints
    10. Comprehensive unit and integration tests
    
    The system should be scalable, secure, and follow industry best practices.
    Please also include proper error handling and documentation.`,
    files: JSON.stringify([
      'src/auth/',
      'src/middleware/auth.middleware.ts',
      'src/guards/',
    ]),
  },
};

export const workflowStates = {
  queued: {
    id: 1234567890,
    status: 'queued',
    conclusion: null,
    htmlUrl: 'https://github.com/testuser/test-repo/actions/runs/1234567890',
    createdAt: new Date(),
    completedAt: null,
    displayTitle: 'feat: add authentication system',
    runNumber: 42,
    headBranch: 'main',
    event: 'workflow_dispatch',
    actor: 'testuser',
  },

  inProgress: {
    id: 2345678901,
    status: 'in_progress',
    conclusion: null,
    htmlUrl: 'https://github.com/testuser/test-repo/actions/runs/2345678901',
    createdAt: new Date(Date.now() - 5 * 60 * 1000), // Started 5 minutes ago
    completedAt: null,
    displayTitle: 'fix: resolve session timeout issue',
    runNumber: 43,
    headBranch: 'bugfix/session-timeout',
    event: 'workflow_dispatch',
    actor: 'testuser',
  },

  completed: {
    id: 3456789012,
    status: 'completed',
    conclusion: 'success',
    htmlUrl: 'https://github.com/testuser/test-repo/actions/runs/3456789012',
    createdAt: new Date(Date.now() - 15 * 60 * 1000), // Started 15 minutes ago
    completedAt: new Date(Date.now() - 5 * 60 * 1000), // Completed 5 minutes ago
    displayTitle: 'docs: update API documentation',
    runNumber: 44,
    headBranch: 'main',
    event: 'workflow_dispatch',
    actor: 'testuser',
  },

  failed: {
    id: 4567890123,
    status: 'completed',
    conclusion: 'failure',
    htmlUrl: 'https://github.com/testuser/test-repo/actions/runs/4567890123',
    createdAt: new Date(Date.now() - 20 * 60 * 1000), // Started 20 minutes ago
    completedAt: new Date(Date.now() - 10 * 60 * 1000), // Failed 10 minutes ago
    displayTitle: 'test: add failing test case',
    runNumber: 45,
    headBranch: 'test/failing-case',
    event: 'workflow_dispatch',
    actor: 'testuser',
  },

  cancelled: {
    id: 5678901234,
    status: 'completed',
    conclusion: 'cancelled',
    htmlUrl: 'https://github.com/testuser/test-repo/actions/runs/5678901234',
    createdAt: new Date(Date.now() - 10 * 60 * 1000), // Started 10 minutes ago
    completedAt: new Date(Date.now() - 8 * 60 * 1000), // Cancelled 8 minutes ago
    displayTitle: 'refactor: large code restructuring',
    runNumber: 46,
    headBranch: 'refactor/restructure',
    event: 'workflow_dispatch',
    actor: 'testuser',
  },

  timedOut: {
    id: 6789012345,
    status: 'completed',
    conclusion: 'timed_out',
    htmlUrl: 'https://github.com/testuser/test-repo/actions/runs/6789012345',
    createdAt: new Date(Date.now() - 60 * 60 * 1000), // Started 1 hour ago
    completedAt: new Date(Date.now() - 10 * 60 * 1000), // Timed out 10 minutes ago
    displayTitle: 'perf: optimize database queries',
    runNumber: 47,
    headBranch: 'perf/db-optimization',
    event: 'workflow_dispatch',
    actor: 'testuser',
  },
};

export const workflowMonitoringData = {
  activeWorkflows: [
    {
      userId: 'test-user-id',
      workflowRunId: workflowStates.inProgress.id,
      repository: 'testuser/test-repo',
      messageId: 'discord-message-123',
      channelId: 'test-channel-id',
      startedAt: new Date(Date.now() - 5 * 60 * 1000),
      lastCheck: new Date(Date.now() - 1 * 60 * 1000),
      status: 'in_progress',
    },
    {
      userId: 'test-user-2',
      workflowRunId: workflowStates.queued.id,
      repository: 'testuser2/another-repo',
      messageId: 'discord-message-456',
      channelId: 'test-channel-2',
      startedAt: new Date(Date.now() - 2 * 60 * 1000),
      lastCheck: new Date(Date.now() - 30 * 1000),
      status: 'queued',
    },
  ],

  completedWorkflows: [
    {
      userId: 'test-user-id',
      workflowRunId: workflowStates.completed.id,
      repository: 'testuser/test-repo',
      messageId: 'discord-message-789',
      channelId: 'test-channel-id',
      startedAt: new Date(Date.now() - 15 * 60 * 1000),
      completedAt: new Date(Date.now() - 5 * 60 * 1000),
      status: 'completed',
      conclusion: 'success',
    },
    {
      userId: 'test-user-id',
      workflowRunId: workflowStates.failed.id,
      repository: 'testuser/test-repo',
      messageId: 'discord-message-012',
      channelId: 'test-channel-id',
      startedAt: new Date(Date.now() - 20 * 60 * 1000),
      completedAt: new Date(Date.now() - 10 * 60 * 1000),
      status: 'completed',
      conclusion: 'failure',
    },
  ],
};

export const workflowDispatchRequests = {
  successful: {
    owner: 'testuser',
    repo: 'test-repo',
    workflow_id: 'claude-code.yml',
    ref: 'main',
    inputs: workflowInputs.basic,
  },

  withImages: {
    owner: 'testuser',
    repo: 'test-repo',
    workflow_id: 'claude-code.yml',
    ref: 'feature/ui-implementation',
    inputs: workflowInputs.withImages,
  },

  invalidWorkflow: {
    owner: 'testuser',
    repo: 'test-repo',
    workflow_id: 'non-existent-workflow.yml',
    ref: 'main',
    inputs: workflowInputs.basic,
  },

  unauthorizedRepo: {
    owner: 'someoneelse',
    repo: 'private-repo',
    workflow_id: 'claude-code.yml',
    ref: 'main',
    inputs: workflowInputs.basic,
  },
};

export const workflowErrors = {
  workflowNotFound: {
    message: 'Workflow not found',
    status: 404,
    documentation_url: 'https://docs.github.com/rest/reference/actions#create-a-workflow-dispatch-event',
  },

  noPermission: {
    message: 'Must have admin access to repository.',
    status: 422,
    documentation_url: 'https://docs.github.com/rest/reference/actions#create-a-workflow-dispatch-event',
  },

  rateLimitExceeded: {
    message: 'API rate limit exceeded',
    status: 403,
    documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting',
  },

  invalidInputs: {
    message: 'Invalid workflow inputs',
    status: 422,
    errors: [
      {
        resource: 'workflow_dispatch',
        field: 'inputs',
        code: 'invalid',
      },
    ],
  },
};

export const workflowJobStatuses = {
  pending: {
    id: 123456789,
    run_id: 1234567890,
    name: 'claude_integration',
    status: 'queued',
    conclusion: null,
    started_at: null,
    completed_at: null,
    url: 'https://api.github.com/repos/testuser/test-repo/actions/jobs/123456789',
    html_url: 'https://github.com/testuser/test-repo/runs/123456789',
    steps: [],
  },

  running: {
    id: 234567890,
    run_id: 2345678901,
    name: 'claude_integration',
    status: 'in_progress',
    conclusion: null,
    started_at: '2024-01-01T10:00:00Z',
    completed_at: null,
    url: 'https://api.github.com/repos/testuser/test-repo/actions/jobs/234567890',
    html_url: 'https://github.com/testuser/test-repo/runs/234567890',
    steps: [
      {
        name: 'Set up job',
        status: 'completed',
        conclusion: 'success',
        number: 1,
        started_at: '2024-01-01T10:00:00Z',
        completed_at: '2024-01-01T10:00:30Z',
      },
      {
        name: 'Checkout',
        status: 'in_progress',
        conclusion: null,
        number: 2,
        started_at: '2024-01-01T10:00:30Z',
        completed_at: null,
      },
    ],
  },

  completed: {
    id: 345678901,
    run_id: 3456789012,
    name: 'claude_integration',
    status: 'completed',
    conclusion: 'success',
    started_at: '2024-01-01T09:00:00Z',
    completed_at: '2024-01-01T09:05:30Z',
    url: 'https://api.github.com/repos/testuser/test-repo/actions/jobs/345678901',
    html_url: 'https://github.com/testuser/test-repo/runs/345678901',
    steps: [
      {
        name: 'Set up job',
        status: 'completed',
        conclusion: 'success',
        number: 1,
        started_at: '2024-01-01T09:00:00Z',
        completed_at: '2024-01-01T09:00:30Z',
      },
      {
        name: 'Checkout',
        status: 'completed',
        conclusion: 'success',
        number: 2,
        started_at: '2024-01-01T09:00:30Z',
        completed_at: '2024-01-01T09:01:00Z',
      },
      {
        name: 'Run Claude',
        status: 'completed',
        conclusion: 'success',
        number: 3,
        started_at: '2024-01-01T09:01:00Z',
        completed_at: '2024-01-01T09:05:30Z',
      },
    ],
  },

  failed: {
    id: 456789012,
    run_id: 4567890123,
    name: 'claude_integration',
    status: 'completed',
    conclusion: 'failure',
    started_at: '2024-01-01T08:00:00Z',
    completed_at: '2024-01-01T08:02:15Z',
    url: 'https://api.github.com/repos/testuser/test-repo/actions/jobs/456789012',
    html_url: 'https://github.com/testuser/test-repo/runs/456789012',
    steps: [
      {
        name: 'Set up job',
        status: 'completed',
        conclusion: 'success',
        number: 1,
        started_at: '2024-01-01T08:00:00Z',
        completed_at: '2024-01-01T08:00:30Z',
      },
      {
        name: 'Checkout',
        status: 'completed',
        conclusion: 'failure',
        number: 2,
        started_at: '2024-01-01T08:00:30Z',
        completed_at: '2024-01-01T08:02:15Z',
      },
    ],
  },
};

export const pullRequestsFromWorkflow = [
  {
    number: 1,
    title: 'feat: implement authentication system',
    html_url: 'https://github.com/testuser/test-repo/pull/1',
    state: 'open',
    draft: false,
    created_at: '2024-01-01T10:05:00Z',
    user: {
      login: 'claude-code[bot]',
      type: 'Bot',
    },
    head: {
      ref: 'claude-code/auth-system-123',
      sha: 'abc123def456',
    },
    base: {
      ref: 'main',
      sha: 'main123base456',
    },
    body: 'This PR was created by Claude Code to implement the authentication system as requested.',
  },
  {
    number: 2,
    title: 'docs: update API documentation',
    html_url: 'https://github.com/testuser/test-repo/pull/2',
    state: 'open',
    draft: true,
    created_at: '2024-01-01T09:30:00Z',
    user: {
      login: 'claude-code[bot]',
      type: 'Bot',
    },
    head: {
      ref: 'claude-code/docs-update-456',
      sha: 'def456ghi789',
    },
    base: {
      ref: 'main',
      sha: 'main456base789',
    },
    body: 'Draft PR: Documentation updates in progress.',
  },
];