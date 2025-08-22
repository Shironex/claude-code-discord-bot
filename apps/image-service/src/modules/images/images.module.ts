import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '../redis/redis.module';
import { ImagesService } from './images.service';
import { ImagesController } from './images.controller';
import { CleanupScheduler } from './schedulers/cleanup.scheduler';

@Module({
	imports: [ConfigModule, ScheduleModule.forRoot(), RedisModule],
	controllers: [ImagesController],
	providers: [ImagesService, CleanupScheduler],
	exports: [ImagesService, CleanupScheduler],
})
export class ImagesModule {}
