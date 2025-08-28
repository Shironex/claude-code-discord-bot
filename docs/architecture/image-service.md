# Image Service Architecture

The image service is a standalone NestJS API that provides secure, temporary image storage for Discord attachments and other image processing needs.

## Architecture Overview

The image service follows a modular NestJS architecture with security-first design principles:

- **Dual Authentication**: API key + HMAC signature validation
- **Temporary Storage**: Automatic file cleanup with configurable TTL
- **Scalable Design**: Redis caching and horizontal scaling support
- **Security Focus**: Request validation, file type checking, and rate limiting

## Core Modules

### Upload Module
**Purpose**: Handles file uploads with validation and metadata extraction

**Features**:
- Multi-file upload support
- File type and size validation
- Metadata extraction (size, type, dimensions)
- Temporary storage with TTL management

### Storage Module  
**Purpose**: Manages temporary file storage with automatic cleanup

**Features**:
- File system storage with configurable paths
- Automatic cleanup based on TTL
- File access logging and monitoring
- Storage quota management

### Auth Module
**Purpose**: Provides API key and HMAC signature authentication

**Features**:
- Dual authentication (API key + HMAC)
- Request signature validation
- Token-based access control
- Rate limiting and abuse protection

### Health Module
**Purpose**: Health checks and service monitoring

**Features**:
- Service health endpoints
- Dependency health checks (Redis, file system)
- Performance metrics
- Uptime monitoring

### Redis Module
**Purpose**: Caching and session management

**Features**:
- File metadata caching
- Session management
- Rate limiting storage
- Performance optimization

## Security Features

### Dual Authentication System

#### API Key Authentication
```typescript
@UseGuards(ApiKeyGuard)
@Controller('upload')
export class UploadController {
  // Protected endpoints
}
```

#### HMAC Signature Validation
```typescript
@UseGuards(HmacGuard)
async upload(@Body() data: any) {
  // Signature verified request
}
```

### Request Validation
- Content type validation for image files
- File size limits (configurable, default 10MB)
- Request rate limiting per client
- Malicious file detection

### Secure Storage
- Temporary file storage with automatic cleanup
- Configurable TTL (default 1 hour)
- Secure file access patterns
- No direct file system exposure

## API Design

### Core Endpoints

#### Upload Endpoint
```http
POST /upload
Content-Type: multipart/form-data
Authorization: Bearer <api-key>
X-HMAC-Signature: <signature>

Response:
{
  "success": true,
  "data": {
    "id": "unique-file-id",
    "filename": "original-filename.jpg",
    "size": 1234567,
    "contentType": "image/jpeg",
    "url": "/files/unique-file-id",
    "expiresAt": "2023-12-01T12:00:00Z"
  }
}
```

#### File Retrieval
```http
GET /files/:id
Authorization: Bearer <api-key>

Response: Binary file data or 404 if expired/not found
```

#### File Deletion
```http
DELETE /files/:id  
Authorization: Bearer <api-key>

Response:
{
  "success": true,
  "message": "File deleted successfully"
}
```

#### Health Check
```http
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2023-12-01T12:00:00Z",
  "uptime": 3600,
  "memory": {
    "used": "50MB",
    "total": "100MB"
  },
  "dependencies": {
    "redis": "connected",
    "filesystem": "accessible"
  }
}
```

### API Documentation
- Interactive Swagger documentation at `/api-docs`
- Complete endpoint documentation
- Request/response schemas
- Authentication examples

## Configuration Architecture

### Environment Variables

#### Core Service Configuration
```bash
PORT=3001                           # Service port
NODE_ENV=production                 # Environment mode
```

#### Security Configuration
```bash
API_KEY="generated-api-key"         # API authentication key
SECRET_KEY="generated-secret-key"   # HMAC signature secret
```

#### Storage Configuration
```bash
UPLOAD_PATH=./uploads               # File storage directory
MAX_FILE_SIZE=10485760             # Maximum file size (10MB)
DEFAULT_TTL=3600                   # Default file TTL (1 hour)
CLEANUP_INTERVAL=300               # Cleanup check interval (5 minutes)
```

#### Redis Configuration
```bash
REDIS_HOST=localhost                # Redis server host
REDIS_PORT=6379                     # Redis server port
REDIS_PASSWORD=""                   # Redis authentication
```

### Configuration Validation
- Environment variable validation at startup
- Type-safe configuration objects
- Required vs optional configuration
- Default value handling

## Integration Architecture

### Discord Bot Integration

#### Client Architecture
```typescript
@Injectable()
export class ImageServiceClient {
  constructor(private readonly httpService: HttpService) {}

  async uploadFile(file: Buffer, metadata: FileMetadata): Promise<UploadResponse> {
    const signature = this.generateHmacSignature(file);
    return this.httpService.post('/upload', formData, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-HMAC-Signature': signature
      }
    });
  }
}
```

#### Upload Service Integration
```typescript
@Injectable() 
export class ImageUploadService {
  constructor(private readonly imageClient: ImageServiceClient) {}

  async uploadDiscordAttachments(attachments: Attachment[]): Promise<ImageUrl[]> {
    const uploads = await Promise.all(
      attachments.map(attachment => this.imageClient.uploadFile(attachment))
    );
    return uploads.map(upload => upload.data.url);
  }
}
```

### Authentication Flow
1. **Request Preparation**: Discord bot prepares file upload
2. **Signature Generation**: HMAC signature created from request data
3. **Request Submission**: API key + signature sent with request
4. **Dual Validation**: Image service validates both API key and signature
5. **File Processing**: Upload processed and temporary URL returned

## Performance Architecture

### Caching Strategy
- **Redis Caching**: File metadata cached for fast retrieval
- **Memory Optimization**: Streaming uploads for large files
- **Cleanup Optimization**: Background cleanup processes

### Scalability Features
- **Stateless Design**: No server-side session dependencies
- **Horizontal Scaling**: Multiple service instances supported
- **Load Balancing**: Ready for load balancer integration
- **Database-Free**: File system + Redis only

### Monitoring and Metrics
- **Health Checks**: Comprehensive service health monitoring
- **Performance Metrics**: Upload speeds, error rates, memory usage
- **Cleanup Metrics**: File cleanup statistics and efficiency

## Development Architecture

### Docker Support
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  image-service:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - REDIS_HOST=redis
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - redis
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### Testing Architecture
- **Unit Tests**: Service and utility testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Complete workflow testing
- **Security Tests**: Authentication and validation testing

## Related Documentation

- [Image Processing Features](../features/image-processing.md) - Usage and features
- [Deployment](../deployment/docker.md) - Docker deployment
- [Configuration](../configuration/environment-vars.md) - Environment setup
- [Discord Bot Integration](./discord-bot.md) - Integration details

[← Back to Architecture](./README.md)