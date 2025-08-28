import { Module, Global, Provider, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { LoggerService } from './logger.service';
import { LoggerFactory } from './logger.factory';
import { createLoggerConfig } from './logger.config';
import { CUSTOM_LOGGER } from './constants';
import { LogLevel } from './interfaces/logger.interface';

/**
 * Factory function to create a logger service for a specific context
 */
export const createLoggerProvider = (context: string): Provider => ({
	provide: `${CUSTOM_LOGGER}_${context}`,
	useFactory: (configService?: ConfigService) => new LoggerService(context, {}, configService as any),
	inject: [{ token: ConfigService, optional: true }]
});

/**
 * Global logger module that provides Winston logging throughout the application
 */
@Global()
@Module({
	imports: [
		WinstonModule.forRootAsync({
			useFactory: (configService?: ConfigService) => {
				const logLevel = configService?.get('LOG_LEVEL') || process.env.LOG_LEVEL || 'info';
				return createLoggerConfig({
					serviceName: 'Application',
					enableFileLogging: true,
					logLevel: logLevel as LogLevel,
					configService: configService as any
				});
			},
			inject: [{ token: ConfigService, optional: true }]
		})
	],
	providers: [
		{
			provide: LoggerFactory,
			useFactory: (configService?: ConfigService) => new LoggerFactory(configService),
			inject: [{ token: ConfigService, optional: true }]
		},
		{
			provide: CUSTOM_LOGGER,
			useFactory: (configService?: ConfigService) => new LoggerService('Application', {}, configService as any),
			inject: [{ token: ConfigService, optional: true }]
		}
	],
	exports: [CUSTOM_LOGGER, LoggerFactory, WinstonModule]
})
export class LoggerModule {
	/**
	 * Create a logger module for a specific service context
	 */
	static forFeature(context: string) {
		return {
			module: LoggerModule,
			providers: [createLoggerProvider(context)],
			exports: [`${CUSTOM_LOGGER}_${context}`]
		};
	}
}

/**
 * Decorator to inject a logger service for a specific context
 * Properly integrates with NestJS dependency injection system
 */
export const InjectLogger = (context: string = 'Application') => {
	const token = context === 'Application' ? CUSTOM_LOGGER : `${CUSTOM_LOGGER}_${context}`;
	return Inject(token);
};

/**
 * Factory to create a logger service provider for a specific context
 */
export const createLoggerServiceProvider = (context: string): Provider => ({
	provide: `${CUSTOM_LOGGER}_${context}`,
	useFactory: (configService?: ConfigService) => new LoggerService(context, {}, configService as any),
	inject: [{ token: ConfigService, optional: true }]
});