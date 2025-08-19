import { NecordModule } from 'necord';
import { Module } from '@nestjs/common';
import { IntentsBitField } from 'discord.js';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Services
import { GitHubService } from './services/github.service';
import { SessionService } from './services/session.service';
import { EmbedService } from './services/embed.service';
import { ContainerService } from './services/container.service';

// Commands
import { RunCommand } from './commands/repository/run.command';
import { SearchCommand } from './commands/repository/search.command';

// Interaction Handlers
import { RepositorySelectHandler } from './interactions/selects/repository.select';
import { PaginationButtonsHandler } from './interactions/buttons/pagination.buttons';
import { CancelButtonHandler } from './interactions/buttons/cancel.button';

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
		ContainerService,
		// Commands
		RunCommand,
		SearchCommand,
		// Interaction Handlers
		RepositorySelectHandler,
		PaginationButtonsHandler,
		CancelButtonHandler
	]
})
export class AppModule {}
