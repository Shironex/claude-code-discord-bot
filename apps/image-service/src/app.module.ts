import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './modules/redis/redis.module';
import { StorageModule } from './modules/storage/storage.module';
import { UploadModule } from './modules/upload/upload.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import configuration from './config/configuration.config';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
		}),
		RedisModule,
		StorageModule,
		UploadModule,
		AuthModule,
		HealthModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
