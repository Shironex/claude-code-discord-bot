import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

NestFactory.createApplicationContext(AppModule, {
	logger: ['error', 'warn', 'log', 'debug', 'verbose']
});
