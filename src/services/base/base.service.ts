import { Logger } from '@nestjs/common';

export abstract class BaseService {
	protected readonly logger: Logger;

	constructor(serviceName: string) {
		this.logger = new Logger(serviceName);
	}
}