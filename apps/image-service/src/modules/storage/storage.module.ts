import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '../redis/redis.module';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { CleanupScheduler } from './schedulers/cleanup.scheduler';

@Module({
	imports: [ConfigModule, ScheduleModule.forRoot(), RedisModule],
	controllers: [StorageController],
	providers: [StorageService, CleanupScheduler],
	exports: [StorageService, CleanupScheduler],
})
export class StorageModule {}
