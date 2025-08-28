import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { redisConfig } from '../../config';
import { RedisService } from './redis.service';
import { redisProviders } from './redis.providers';

@Global()
@Module({
	imports: [ConfigModule.forFeature(redisConfig)],
	providers: [RedisService, ...redisProviders],
	exports: [RedisService, ...redisProviders],
})
export class RedisModule {}
