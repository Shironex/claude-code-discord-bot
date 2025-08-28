# Session Service

**Location**: `apps/discord-bot/src/services/session.service.ts`

## Purpose
Manage user sessions across Discord interactions, providing stateful user experience and automatic session lifecycle management.

## Features

### Session Lifecycle Management
- Session creation and initialization
- Session updates and state management
- Automatic session expiration (30 minutes)
- Manual session cleanup and termination

### State Persistence
- Type-safe session data storage
- In-memory session storage with cleanup
- Session data serialization and validation
- Concurrent session handling per user

### Automatic Cleanup
- Background cleanup of expired sessions
- Memory leak prevention
- Configurable cleanup intervals
- Graceful shutdown support

## Core Methods

### `createSession(userId: string, initialData?: Partial<SessionData>): Promise<UserSession>`
Create a new user session with optional initial data.

**Parameters**:
- `userId`: Discord user ID (snowflake)
- `initialData`: Optional partial session data to initialize with

**Returns**: Created session object with metadata

**Usage**:
```typescript
const session = await sessionService.createSession('123456789', {
  command: 'claude',
  step: 'repository-search'
});
```

**Features**:
- Automatically sets creation timestamp and expiry
- Overwrites existing sessions for the same user
- Validates user ID format
- Initializes session with provided data

### `getSession(userId: string): Promise<UserSession | null>`
Retrieve active session for a user.

**Parameters**:
- `userId`: Discord user ID

**Returns**: Session object if exists and not expired, null otherwise

**Usage**:
```typescript
const session = await sessionService.getSession('123456789');
if (session) {
  // User has active session
  console.log(`Current step: ${session.data.step}`);
}
```

**Features**:
- Checks session expiration automatically
- Returns null for expired sessions
- Type-safe session data access
- Handles non-existent sessions gracefully

### `updateSession(userId: string, updates: Partial<SessionData>): Promise<UserSession>`
Update session data for a user.

**Parameters**:
- `userId`: Discord user ID
- `updates`: Partial session data to merge with existing data

**Returns**: Updated session object

**Usage**:
```typescript
const updatedSession = await sessionService.updateSession('123456789', {
  selectedRepository: { owner: 'user', repo: 'project' },
  step: 'file-selection'
});
```

**Features**:
- Merges updates with existing session data
- Updates lastActivity timestamp
- Creates session if it doesn't exist
- Validates update data structure

### `deleteSession(userId: string): Promise<boolean>`
Delete a user's session.

**Parameters**:
- `userId`: Discord user ID

**Returns**: Boolean indicating if session was deleted

**Usage**:
```typescript
const deleted = await sessionService.deleteSession('123456789');
if (deleted) {
  console.log('Session successfully removed');
}
```

**Features**:
- Immediately removes session from memory
- Returns false if session didn't exist
- Cleans up all associated session data
- Prevents memory leaks

### `cleanupExpiredSessions(): Promise<number>`
Clean up all expired sessions (automatic cleanup).

**Returns**: Number of sessions cleaned up

**Usage**:
```typescript
// Automatic cleanup runs every 5 minutes
const cleanedCount = await sessionService.cleanupExpiredSessions();
console.log(`Cleaned up ${cleanedCount} expired sessions`);
```

**Features**:
- Runs automatically on configurable interval
- Removes all expired sessions from memory
- Returns count of cleaned sessions
- Prevents memory accumulation

### `getActiveSessions(): Promise<number>`
Get count of currently active sessions.

**Returns**: Number of active (non-expired) sessions

**Usage**:
```typescript
const activeCount = await sessionService.getActiveSessions();
console.log(`Currently ${activeCount} active sessions`);
```

## Session Data Structure

### UserSession Interface
```typescript
interface UserSession {
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  data: SessionData;
}
```

### SessionData Interface
```typescript
interface SessionData {
  // Command context
  command?: string;
  step?: string;
  
  // Repository selection
  selectedRepository?: {
    owner: string;
    repo: string;
    branch?: string;
  };
  
  // File selection
  selectedFiles?: string[];
  currentPath?: string;
  fileTree?: any;
  
  // Image upload
  uploadedImages?: Array<{
    id: string;
    filename: string;
    url: string;
  }>;
  
  // Workflow context
  workflowRunId?: number;
  workflowStatus?: string;
  
  // UI state
  messageId?: string;
  interactionToken?: string;
  
  // Custom data
  [key: string]: any;
}
```

## Configuration

### Session Settings
```typescript
const SESSION_CONFIG = {
  SESSION_TIMEOUT: 30 * 60 * 1000,    // 30 minutes
  CLEANUP_INTERVAL: 5 * 60 * 1000,    // 5 minutes
  MAX_SESSIONS: 1000,                  // Memory limit
  WARN_THRESHOLD: 800                  // Warning threshold
};
```

### Memory Management
- Maximum concurrent sessions: 1000
- Warning threshold: 800 sessions
- Automatic cleanup prevents memory issues
- Session size monitoring and optimization

## Usage Patterns

### Command Initialization
```typescript
@SlashCommand({ name: 'claude', description: 'Start Claude workflow' })
public async onClaude(@Context() [interaction]: SlashCommandContext) {
  const userId = interaction.user.id;
  
  // Create new session for workflow
  const session = await this.sessionService.createSession(userId, {
    command: 'claude',
    step: 'repository-search',
    messageId: interaction.id
  });
  
  // Show repository search modal
  await this.showRepositorySearchModal(interaction);
}
```

### Interaction Handling
```typescript
@Button('repository-select')
public async onRepositorySelect(@Context() [interaction]: ButtonContext) {
  const userId = interaction.user.id;
  const session = await this.sessionService.getSession(userId);
  
  if (!session) {
    await interaction.reply({
      content: 'Session expired. Please start over with `/claude`.',
      ephemeral: true
    });
    return;
  }
  
  // Update session with repository selection
  await this.sessionService.updateSession(userId, {
    selectedRepository: { 
      owner: interaction.values[0].split('/')[0],
      repo: interaction.values[0].split('/')[1]
    },
    step: 'file-selection'
  });
  
  // Continue workflow
  await this.showFileSelection(interaction);
}
```

### Multi-Step Workflow Management
```typescript
@Injectable()
export class WorkflowProgressService {
  constructor(private readonly sessionService: SessionService) {}

  async advanceWorkflowStep(userId: string, step: string, data?: any): Promise<void> {
    const session = await this.sessionService.getSession(userId);
    
    if (!session) {
      throw new Error('No active session found');
    }
    
    await this.sessionService.updateSession(userId, {
      step,
      ...data,
      lastActivity: new Date()
    });
  }
  
  async getWorkflowContext(userId: string): Promise<SessionData | null> {
    const session = await this.sessionService.getSession(userId);
    return session?.data || null;
  }
}
```

### Error Handling and Recovery
```typescript
@Injectable()
export class InteractionHandler {
  async handleInteractionError(interaction: any, error: Error): Promise<void> {
    const userId = interaction.user.id;
    
    // Log error with session context
    const session = await this.sessionService.getSession(userId);
    this.logger.error('Interaction failed', error, {
      userId,
      step: session?.data.step,
      command: session?.data.command
    });
    
    // Clear problematic session
    await this.sessionService.deleteSession(userId);
    
    // Inform user
    await interaction.reply({
      content: 'An error occurred. Your session has been reset. Please try again.',
      ephemeral: true
    });
  }
}
```

## Performance Considerations

### Memory Usage
- In-memory storage for fast access
- Automatic cleanup prevents memory leaks
- Session size monitoring and alerts
- Configurable memory limits

### Concurrent Access
- Thread-safe session operations
- Atomic session updates
- Lock-free read operations
- Efficient cleanup algorithms

### Scaling Considerations
- Single-instance in-memory storage
- Could be extended to Redis for multi-instance
- Session data serialization ready
- Database-free design for simplicity

## Error Handling

### Session Errors
```typescript
// Session not found
const session = await sessionService.getSession('invalid-user');
// Returns null, doesn't throw

// Session expired
const expiredSession = await sessionService.getSession('user-with-expired-session');
// Returns null, automatically cleaned up

// Update non-existent session
const updated = await sessionService.updateSession('new-user', { step: 'test' });
// Creates new session automatically
```

### Error Recovery
- Graceful handling of expired sessions
- Automatic session recreation when needed
- User-friendly error messages
- Session state validation

## Monitoring and Debugging

### Session Statistics
```typescript
// Get active session count
const activeCount = await sessionService.getActiveSessions();

// Manual cleanup for debugging
const cleanedCount = await sessionService.cleanupExpiredSessions();

// Session data inspection
const session = await sessionService.getSession(userId);
console.log('Session state:', session?.data);
```

### Logging Integration
- All session operations are logged
- Session lifecycle events tracked
- Error conditions logged with context
- Performance metrics collected

## Integration Points

### Command Handlers
All Discord commands that require multi-step interactions use SessionService to maintain state between user interactions.

### Interaction Handlers
Button, modal, and select menu handlers retrieve and update session state to provide contextual responses.

### Workflow Services
Workflow operations store progress and context in sessions for real-time status updates and recovery.

## Testing

### Unit Tests
```typescript
describe('SessionService', () => {
  it('should create and retrieve sessions', async () => {
    const session = await sessionService.createSession('user123', { step: 'test' });
    const retrieved = await sessionService.getSession('user123');
    
    expect(retrieved).toBeDefined();
    expect(retrieved.data.step).toBe('test');
  });
  
  it('should handle expired sessions', async () => {
    // Create session with past expiry
    const expiredSession = await sessionService.createSession('user456');
    expiredSession.expiresAt = new Date(Date.now() - 1000);
    
    const retrieved = await sessionService.getSession('user456');
    expect(retrieved).toBeNull();
  });
});
```

### Integration Tests
- Multi-step workflow session persistence
- Concurrent user session handling
- Session cleanup and memory management
- Error recovery and session recreation

## Related Documentation

- [GitHub Service](./github-service.md) - Repository data storage in sessions
- [Workflow Service](./workflow-service.md) - Workflow state management
- [Discord Commands](../features/discord-commands.md) - Command session usage
- [Development Patterns](../development/patterns.md) - Session patterns

[← Back to Services](./README.md)