import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageModule } from '../storage/storage.module';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { FileValidator } from './validators/file.validator';
import { createMulterConfig } from '../../config';

@Module({
	imports: [
		ConfigModule,
		StorageModule,
		MulterModule.registerAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => {
				return createMulterConfig(configService);
			},
			inject: [ConfigService],
		}),
	],
	controllers: [UploadController],
	providers: [UploadService, FileValidator],
	exports: [UploadService, FileValidator],
})
export class UploadModule {}
