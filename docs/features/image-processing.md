# Image Processing Features

Image processing capabilities and integration with the standalone image service.

## Overview

### Discord Attachment Processing
- **Automatic Validation**: Validates Discord attachments as supported image types
- **Secure Upload**: Processes and uploads images to temporary storage
- **Batch Support**: Handles multiple image uploads in a single workflow
- **Integration Security**: HMAC-signed requests between bot and image service

### Supported File Types
- **JPEG/JPG**: Standard JPEG images with quality preservation
- **PNG**: Lossless PNG images with transparency support
- **GIF**: Animated and static GIF images
- **WebP**: Modern WebP format with compression benefits
- **Size Limit**: 10MB maximum per image file

## Image Upload Workflow

### Step-by-Step Process
1. **User Upload**: User attaches images to Discord message or interaction
2. **Validation**: Bot validates file type, size, and accessibility
3. **Processing**: Image data is fetched from Discord CDN
4. **Authentication**: HMAC signature generated for secure upload
5. **Storage**: Image uploaded to temporary storage service
6. **Integration**: Image URL provided to Claude Code workflow

### Upload Interface
- **Add Images Button**: Trigger image upload interface
- **Drag & Drop Support**: Discord native attachment handling
- **Batch Processing**: Multiple images processed concurrently
- **Progress Indicators**: Upload status and progress display
- **Skip Option**: Optional step for workflows without visual context

## Integration with Workflows

### Claude Code Context
```yaml
# Workflow receives image URLs as input
inputs:
  images:
    description: 'Image URLs JSON array'
    required: false
    type: string

# Example usage in workflow
- name: Process Images
  run: |
    echo 'Images: ${{ github.event.inputs.images }}'
    # Parse JSON array and download images for analysis
```

### Image Context Types
- **Screenshots**: Error messages, UI issues, console outputs
- **Diagrams**: Architecture diagrams, flowcharts, design mockups
- **Documentation**: Visual documentation, API schemas
- **Performance Data**: Graphs, charts, monitoring dashboards

## Image Service Integration

### Secure Storage
- **Temporary Storage**: Images stored with configurable TTL (default: 1 hour)
- **Automatic Cleanup**: Expired images automatically removed
- **Access Control**: Secure API key and HMAC authentication
- **Storage Isolation**: Each upload gets unique ID and secure access

### API Integration
```typescript
// Image upload process
const uploadResult = await imageUploadService.uploadDiscordAttachments(attachments);

// Response format
interface ImageUploadResponse {
  id: string;
  filename: string;
  size: number;
  contentType: string;
  url: string;           // Temporary access URL
  expiresAt: string;     // TTL expiration
}
```

### Batch Upload Support
```typescript
// Multiple image processing
interface BatchUploadResponse {
  uploads: ImageUploadResponse[];   // Successful uploads
  failed: Array<{                 // Failed uploads
    filename: string;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}
```

## Security Features

### Authentication
- **Dual Authentication**: API key + HMAC signature validation
- **Request Signing**: Each request cryptographically signed
- **Token Rotation**: Support for API key rotation without downtime
- **Access Logging**: All image access logged for security audit

### Content Validation
- **File Type Verification**: MIME type and file header validation
- **Size Limits**: Configurable maximum file size (default 10MB)
- **Content Scanning**: Basic malicious content detection
- **Upload Quotas**: Rate limiting per user/session

### Privacy Protection
- **Temporary Storage**: Images automatically deleted after TTL
- **No Permanent Storage**: No long-term image retention
- **Secure Access**: Images only accessible via signed URLs
- **Audit Trail**: Upload and access logging for compliance

## Performance Optimization

### Upload Performance
- **Parallel Processing**: Multiple images uploaded concurrently
- **Stream Processing**: Large files streamed to avoid memory issues
- **Compression**: Automatic compression for large images (optional)
- **CDN Integration**: Fast global image delivery (if configured)

### Caching Strategy
- **Metadata Caching**: Image metadata cached in Redis
- **Upload Deduplication**: Identical images detected and reused
- **Bandwidth Optimization**: Progressive loading for large images
- **Connection Pooling**: HTTP connection reuse for efficiency

## Error Handling

### Common Error Scenarios

#### File Too Large
```
❌ File Too Large
Image "screenshot.png" (15MB) exceeds the 10MB limit.
• Resize image to reduce file size
• Use image compression tools
• Upload image to external service and share URL
```

#### Invalid File Type
```
❌ Unsupported File Type
File "document.pdf" is not a supported image format.
• Supported formats: JPEG, PNG, GIF, WebP
• Convert file to supported format
• Use screenshot of document content
```

#### Upload Service Unavailable
```
⚠️ Image Service Unavailable
Image upload service is temporarily unavailable.
• Try again in a few moments
• Skip image upload for now
• Contact support if problem persists
```

### Recovery Mechanisms
- **Automatic Retry**: Failed uploads automatically retried
- **Fallback Options**: Graceful degradation when service unavailable
- **User Notification**: Clear error messages with actionable solutions
- **Skip Options**: Workflows can continue without images if needed

## Usage Examples

### Bug Report with Screenshots
```
Workflow: Debug authentication issue
Images: 
  - login_error.png (error message screenshot)
  - network_tab.png (browser dev tools)
  - console_output.png (JavaScript console errors)
Prompt: "Fix the authentication errors shown in the screenshots"
```

### UI Implementation Request
```
Workflow: Implement new dashboard design
Images:
  - dashboard_mockup.png (Figma design)
  - current_dashboard.png (existing implementation)
  - mobile_version.png (responsive design)
Prompt: "Implement the new dashboard design shown in the mockup"
```

### Performance Analysis
```
Workflow: Optimize application performance
Images:
  - performance_graph.png (loading time metrics)
  - memory_usage.png (heap usage over time)
  - network_waterfall.png (request timing)
Prompt: "Analyze performance issues and suggest optimizations"
```

## Development and Testing

### Local Development
```bash
# Start image service locally
cd apps/image-service
pnpm dev

# Generate test API keys
bash scripts/generate-keys.sh

# Test image upload
curl -X POST http://localhost:3001/upload \
  -H "Authorization: Bearer test-key" \
  -F "file=@test-image.png"
```

### Testing Features
- **Unit Tests**: Image validation and processing logic
- **Integration Tests**: End-to-end upload workflow
- **Load Testing**: Concurrent upload performance
- **Security Testing**: Authentication and authorization

## Related Documentation

- [Image Service Architecture](../architecture/image-service.md) - Service design
- [Image Upload Service](../services/image-upload-service.md) - Service implementation
- [Discord Commands](./discord-commands.md) - Image upload workflow
- [Deployment](../deployment/docker.md) - Image service deployment

[← Back to Features](./README.md)