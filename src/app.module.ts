import { NecordModule } from 'necord';
import { Module } from '@nestjs/common';
import { IntentsBitField } from 'discord.js';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Services
import { GitHubService } from './services/github.service';
import { SessionService } from './services/session.service';
import { EmbedService } from './services/embed.service';
import { WorkflowService } from './services/workflow.service';
import { WorkflowMonitorService } from './services/workflow-monitor.service';

// Commands
import { ClaudeCommand } from './commands/repository/claude.command';

// Interaction Handlers
import { RepositorySelectHandler } from './interactions/selects/repository.select';
import { CancelButtonHandler } from './interactions/buttons/cancel.button';
import { WorkflowStatusButtonHandler } from './interactions/buttons/workflow-status.button';
import { ClaudePromptModalHandler } from './interactions/modals/claude-prompt.modal';
import { ClaudeRepoSearchModalHandler } from './interactions/modals/claude-repo-search.modal';

@Module({
	imports: [
		ConfigModule.forRoot(), // Load .env file
		NecordModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => ({
				token: configService.get('DISCORD_TOKEN'),
				development: [configService.get('DEV_GUILD')],
				intents: [
					IntentsBitField.Flags.Guilds,
					IntentsBitField.Flags.GuildMessages,
					IntentsBitField.Flags.DirectMessages
				]
			}),
			inject: [ConfigService]
		})
	],
	providers: [
		// Services
		GitHubService,
		SessionService,
		EmbedService,
		WorkflowService,
		WorkflowMonitorService,
		// Commands
		ClaudeCommand,
		// Interaction Handlers
		RepositorySelectHandler,
		CancelButtonHandler,
		WorkflowStatusButtonHandler,
		ClaudePromptModalHandler,
		ClaudeRepoSearchModalHandler
	]
})
export class AppModule {}
