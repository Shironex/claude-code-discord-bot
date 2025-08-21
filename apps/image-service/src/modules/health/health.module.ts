import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../redis/redis.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
	imports: [TerminusModule, ConfigModule, RedisModule],
	controllers: [HealthController],
	providers: [HealthService],
	exports: [HealthService],
})
export class HealthModule {}
