import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ApiKeyGuard, HmacGuard, CombinedAuthGuard } from '../../common/guards';

@Module({
	imports: [ConfigModule],
	controllers: [AuthController],
	providers: [AuthService, ApiKeyGuard, HmacGuard, CombinedAuthGuard],
	exports: [AuthService, ApiKeyGuard, HmacGuard, CombinedAuthGuard],
})
export class AuthModule {}
