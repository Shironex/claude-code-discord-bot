import { LoggerService } from '../../logger/logger.service';

export abstract class BaseService {
	protected readonly logger: LoggerService;

	constructor(serviceName: string) {
		this.logger = new LoggerService(serviceName);
	}
}
