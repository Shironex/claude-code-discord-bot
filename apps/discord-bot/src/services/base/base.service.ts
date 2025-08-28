import { LoggerService, LoggerFactory } from '@claude-code/shared';

export abstract class BaseService {
	protected readonly logger: LoggerService;

	constructor(serviceName: string, loggerFactory?: LoggerFactory, configService?: any) {
		// Use dependency injection if LoggerFactory is provided, otherwise fallback to direct instantiation
		if (loggerFactory) {
			this.logger = loggerFactory.createLogger(serviceName);
		} else {
			// Backward compatibility - direct instantiation with ConfigService if available
			this.logger = new LoggerService(serviceName, {}, configService);
		}
	}
}
