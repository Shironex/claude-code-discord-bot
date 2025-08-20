import { Module, Global, Provider, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { LoggerService } from './logger.service';
import { LoggerFactory } from './logger.factory';
import { createLoggerConfig } from './logger.config';

/**
 * Token for injecting the custom logger service
 */
export const CUSTOM_LOGGER = 'CUSTOM_LOGGER';

/**
 * Factory function to create a logger service for a specific context
 */
export const createLoggerProvider = (context: string): Provider => ({
	provide: `${CUSTOM_LOGGER}_${context}`,
	useFactory: () => new LoggerService(context)
});

/**
 * Global logger module that provides Winston logging throughout the application
 */
@Global()
@Module({
	imports: [
		WinstonModule.forRoot(
			createLoggerConfig({
				serviceName: 'Application',
				enableFileLogging: true,
				logLevel: process.env.LOG_LEVEL || 'info'
			})
		)
	],
	providers: [
		LoggerFactory,
		{
			provide: CUSTOM_LOGGER,
			useFactory: (configService: ConfigService) => new LoggerService('Application', {}, configService),
			inject: [ConfigService]
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
	useFactory: (configService: ConfigService) => new LoggerService(context, {}, configService),
	inject: [ConfigService]
});
