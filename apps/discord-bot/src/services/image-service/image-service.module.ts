import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImageServiceClient } from './image-service.client';
import { ImageUploadService } from './image-upload.service';

@Module({
	imports: [ConfigModule],
	providers: [ImageServiceClient, ImageUploadService],
	exports: [ImageServiceClient, ImageUploadService]
})
export class ImageServiceModule {}
