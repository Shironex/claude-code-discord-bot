import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './modules/redis/redis.module';
import { StorageModule } from './modules/storage/storage.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
	imports: [RedisModule, StorageModule, UploadModule],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
