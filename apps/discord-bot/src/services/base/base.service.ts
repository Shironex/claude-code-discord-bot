import { LoggerService, LoggerFactory } from '@claude-code/shared';
import { Octokit } from '@octokit/rest';
import { ConfigService } from '@nestjs/config';

export abstract class BaseService {
	protected readonly logger: LoggerService;
	protected octokit: Octokit | null = null;
	protected hasGitHubAccess: boolean = false;

	constructor(
		serviceName: string,
		loggerFactory?: LoggerFactory,
		configService?: ConfigService,
		requireGitHub: boolean = false
	) {
		// Use dependency injection if LoggerFactory is provided, otherwise fallback to direct instantiation
		if (loggerFactory) {
			this.logger = loggerFactory.createLogger(serviceName);
		} else {
			// Backward compatibility - direct instantiation with ConfigService if available
			this.logger = new LoggerService(serviceName, {}, configService);
		}

		// GitHub client initialization
		if (configService) {
			this.initializeGitHubClient(configService, serviceName, requireGitHub);
		}
	}

	private initializeGitHubClient(configService: ConfigService, serviceName: string, requireGitHub: boolean): void {
		const token = configService.get<string>('GITHUB_TOKEN');

		if (token) {
			this.octokit = new Octokit({ auth: token });
			this.hasGitHubAccess = true;
			this.logger.log(`${serviceName} initialized with GitHub token`);
		} else {
			if (requireGitHub) {
				throw new Error(`GitHub token required for ${serviceName} but not configured`);
			}
			this.logger.warn(`GitHub token not found - GitHub functionality disabled for ${serviceName}`);
		}
	}

	protected validateGitHubAccess(): void {
		if (!this.octokit) {
			throw new Error('GitHub token not configured - operation requires GitHub access');
		}
	}
}
