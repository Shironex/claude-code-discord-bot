import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import { redisProviders } from './redis.providers';

@Global()
@Module({
	imports: [ConfigModule],
	providers: [RedisService, ...redisProviders],
	exports: [RedisService, ...redisProviders],
})
export class RedisModule {}
