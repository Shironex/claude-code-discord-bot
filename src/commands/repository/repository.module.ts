import { Module } from '@nestjs/common';
import { RunCommand } from './run.command';
import { SearchCommand } from './search.command';
import { GitHubService } from '../../services/github.service';
import { SessionService } from '../../services/session.service';
import { EmbedService } from '../../services/embed.service';

@Module({
	providers: [
		RunCommand,
		SearchCommand,
		GitHubService,
		SessionService,
		EmbedService
	],
	exports: [
		RunCommand,
		SearchCommand
	]
})
export class RepositoryModule {}