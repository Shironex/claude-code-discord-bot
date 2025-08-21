import { NecordModule } from 'necord';
import { Module } from '@nestjs/common';
import { IntentsBitField } from 'discord.js';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Logger
import { LoggerModule } from './logger/logger.module';

// Services
import { GitHubService } from './services/github.service';
import { SessionService } from './services/session.service';
import { EmbedService } from './services/embed.service';
import { WorkflowService } from './services/workflow.service';
import { WorkflowMonitorService } from './services/workflow-monitor.service';
import { FileExplorerService } from './services/file-explorer.service';
import { StartupService } from './services/startup.service';
import { ImageServiceModule } from './services/image-service/image-service.module';

// Commands
import { ClaudeCommand } from './commands/repository/claude.command';
import { ImageServiceCommand } from './commands/debug/image-service.command';

// Interaction Handlers
import { RepositorySelectHandler } from './interactions/selects/repository.select';
import { FilePathSelectHandler } from './interactions/selects/file-path.select';
import { CancelButtonHandler } from './interactions/buttons/cancel.button';
import { WorkflowStatusButtonHandler } from './interactions/buttons/workflow-status.button';
import { SkipFileSelectionButtonHandler } from './interactions/buttons/skip-file-selection.button';
import { ClaudePromptTriggerButtonHandler } from './interactions/buttons/claude-prompt-trigger.button';
import { AddImagesButtonHandler } from './interactions/buttons/add-images.button';
import { SkipImagesButtonHandler } from './interactions/buttons/skip-images.button';
import { OpenClaudePromptButtonHandler } from './interactions/buttons/open-claude-prompt.button';
import { ClaudePromptModalHandler } from './interactions/modals/claude-prompt.modal';
import { ClaudeRepoSearchModalHandler } from './interactions/modals/claude-repo-search.modal';
import { ImageUploadListener } from './interactions/listeners/image-upload.listener';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true
		}), // Load .env file
		LoggerModule, // Global logger configuration
		ImageServiceModule, // Image service integration
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
		StartupService,
		GitHubService,
		SessionService,
		EmbedService,
		WorkflowService,
		WorkflowMonitorService,
		FileExplorerService,
		// Commands
		ClaudeCommand,
		ImageServiceCommand,
		// Interaction Handlers
		RepositorySelectHandler,
		FilePathSelectHandler,
		CancelButtonHandler,
		WorkflowStatusButtonHandler,
		SkipFileSelectionButtonHandler,
		ClaudePromptTriggerButtonHandler,
		AddImagesButtonHandler,
		SkipImagesButtonHandler,
		OpenClaudePromptButtonHandler,
		ClaudePromptModalHandler,
		ClaudeRepoSearchModalHandler,
		// Listeners
		ImageUploadListener
	]
})
export class AppModule {}
