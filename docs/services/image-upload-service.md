# Image Upload Service

**Location**: `apps/discord-bot/src/services/image-service/image-upload.service.ts`

## Purpose
Discord attachment processing and integration with the standalone image service API.

## Key Methods

### `uploadDiscordAttachment(attachment: Attachment): Promise<ImageUploadResponse>`
Upload single Discord attachment to image service with validation.

### `uploadDiscordAttachments(attachments: Attachment[]): Promise<BatchUploadResponse>`
Batch upload multiple Discord attachments with parallel processing.

### `isImageAttachment(attachment: Attachment): boolean`
Validate attachment as supported image type (JPEG, PNG, GIF, WebP).

## Features
- Discord attachment validation and processing
- Integration with standalone image service API
- Batch upload support for multiple attachments
- Automatic file type detection and validation
- HMAC signature authentication
- Error handling and retry logic

## Supported File Types
- JPEG/JPG images
- PNG images
- GIF animations
- WebP images
- File size limit: 10MB per image

## Upload Process
1. **Validation**: Check file type and size limits
2. **Download**: Fetch attachment data from Discord
3. **Authentication**: Generate HMAC signature
4. **Upload**: Send to image service API
5. **Response**: Return temporary image URL

## Integration
- Image Service Client for API communication
- Session Service for upload state management
- Discord attachment handling
- Workflow Service for image context passing

## Error Handling
- File type validation errors
- Size limit exceeded errors
- Network and API errors
- Authentication failures
- Graceful degradation

## Related Documentation
- [Image Service Architecture](../architecture/image-service.md) - Service design
- [Image Processing Features](../features/image-processing.md) - User features
- [Discord Commands](../features/discord-commands.md) - Upload workflow

[← Back to Services](./README.md)