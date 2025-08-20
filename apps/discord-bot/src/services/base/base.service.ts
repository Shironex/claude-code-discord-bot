import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../logger/logger.service';
import { LoggerFactory } from '../../logger/logger.factory';

export abstract class BaseService {
	protected readonly logger: LoggerService;

	constructor(serviceName: string, loggerFactory?: LoggerFactory, configService?: ConfigService) {
		// Use dependency injection if LoggerFactory is provided, otherwise fallback to direct instantiation
		if (loggerFactory) {
			this.logger = loggerFactory.createLogger(serviceName);
		} else {
			// Backward compatibility - direct instantiation with ConfigService if available
			this.logger = new LoggerService(serviceName, {}, configService);
		}
	}
}
