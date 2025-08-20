import { Module, Global, Provider } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { LoggerService } from './logger.service';
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
		{
			provide: CUSTOM_LOGGER,
			useFactory: () => new LoggerService('Application')
		}
	],
	exports: [CUSTOM_LOGGER, WinstonModule]
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
 */
export const InjectLogger = (context: string = 'Application') => {
	const token = context === 'Application' ? CUSTOM_LOGGER : `${CUSTOM_LOGGER}_${context}`;
	return function (target: any, key: string | symbol | undefined, index?: number) {
		// This is a parameter decorator for dependency injection
		if (typeof index === 'number') {
			// Store metadata for NestJS dependency injection
			const existingTokens = Reflect.getMetadata('custom:logger_tokens', target) || [];
			existingTokens[index] = token;
			Reflect.defineMetadata('custom:logger_tokens', existingTokens, target);
		}
	};
};
