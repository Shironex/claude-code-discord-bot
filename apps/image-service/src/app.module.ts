import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@claude-code/shared';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './modules/redis/redis.module';
import { ImagesModule } from './modules/images/images.module';
import { UploadModule } from './modules/upload/upload.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import configuration from './config/configuration.config';
import multerConfig from './config/multer.config';
import { validationSchema } from './config/validation.schema';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration, multerConfig],
			validationSchema,
			validationOptions: {
				allowUnknown: true, // Allow system environment variables
				abortEarly: false, // Show all validation errors, not just the first one
			},
		}),
		LoggerModule, // Global logger configuration
		RedisModule,
		ImagesModule,
		UploadModule,
		AuthModule,
		HealthModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
