import { IsOptional, IsString, IsNumber, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IMAGE_CONSTANTS } from '../constants';

/**
 * DTO for single image upload response
 */
export class ImageUploadResponseDto {
	@ApiProperty({
		description: 'Unique identifier for the uploaded image',
		example: 'abc123def456',
	})
	@IsString()
	id: string;

	@ApiProperty({
		description: 'Direct URL to access the image',
		example: 'http://localhost:3001/images/abc123def456',
	})
	@IsString()
	url: string;

	@ApiProperty({
		description: 'When the image will expire (ISO timestamp)',
		example: '2024-01-20T15:30:00.000Z',
	})
	@IsString()
	expires: string;

	@ApiProperty({
		description: 'File size in bytes',
		example: 1024000,
	})
	@IsNumber()
	size: number;

	@ApiPropertyOptional({
		description: 'Original filename if provided',
		example: 'screenshot.png',
	})
	@IsOptional()
	@IsString()
	originalName?: string;

	@ApiProperty({
		description: 'MIME type of the uploaded image',
		example: 'image/png',
	})
	@IsString()
	mimeType: string;
}

/**
 * DTO for batch upload request options
 */
export class BatchUploadOptionsDto {
	@ApiPropertyOptional({
		description: 'Custom TTL in seconds for all images in this batch',
		minimum: IMAGE_CONSTANTS.MIN_TTL_SECONDS,
		maximum: IMAGE_CONSTANTS.MAX_TTL_SECONDS,
		example: 1800,
	})
	@IsOptional()
	@IsNumber()
	@Min(IMAGE_CONSTANTS.MIN_TTL_SECONDS)
	@Max(IMAGE_CONSTANTS.MAX_TTL_SECONDS)
	ttl?: number;

	@ApiPropertyOptional({
		description: 'User identifier for rate limiting',
		example: 'user_123',
	})
	@IsOptional()
	@IsString()
	userId?: string;
}

/**
 * DTO for batch upload response
 */
export class BatchUploadResponseDto {
	@ApiProperty({
		description: 'Array of successfully uploaded images',
		type: [ImageUploadResponseDto],
	})
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ImageUploadResponseDto)
	images: ImageUploadResponseDto[];

	@ApiProperty({
		description: 'Total number of images processed',
		example: 5,
	})
	@IsNumber()
	totalCount: number;

	@ApiProperty({
		description: 'Number of successfully uploaded images',
		example: 4,
	})
	@IsNumber()
	successCount: number;

	@ApiPropertyOptional({
		description: 'Array of errors for failed uploads',
		example: [{ index: 2, error: 'File too large' }],
	})
	@IsOptional()
	@IsArray()
	errors?: Array<{
		index: number;
		error: string;
		filename?: string;
	}>;
}

/**
 * DTO for image metadata
 */
export class ImageMetadataDto {
	@ApiProperty({
		description: 'Image ID',
		example: 'abc123def456',
	})
	@IsString()
	id: string;

	@ApiProperty({
		description: 'File size in bytes',
		example: 1024000,
	})
	@IsNumber()
	size: number;

	@ApiProperty({
		description: 'MIME type',
		example: 'image/png',
	})
	@IsString()
	mimeType: string;

	@ApiProperty({
		description: 'Upload timestamp (ISO format)',
		example: '2024-01-20T14:30:00.000Z',
	})
	@IsString()
	uploadedAt: string;

	@ApiProperty({
		description: 'Expiration timestamp (ISO format)',
		example: '2024-01-20T15:30:00.000Z',
	})
	@IsString()
	expiresAt: string;

	@ApiPropertyOptional({
		description: 'Original filename',
		example: 'screenshot.png',
	})
	@IsOptional()
	@IsString()
	originalName?: string;
}

/**
 * DTO for delete response
 */
export class DeleteImageResponseDto {
	@ApiProperty({
		description: 'Whether the deletion was successful',
		example: true,
	})
	success: boolean;

	@ApiProperty({
		description: 'Status message',
		example: 'Image deleted successfully',
	})
	@IsString()
	message: string;

	@ApiPropertyOptional({
		description: 'Image ID that was deleted',
		example: 'abc123def456',
	})
	@IsOptional()
	@IsString()
	id?: string;
}
