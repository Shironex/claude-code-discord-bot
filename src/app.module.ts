import { NecordModule } from 'necord';
import { Module } from '@nestjs/common';
import { AppCommands } from './app.commands';
import { IntentsBitField } from 'discord.js';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
			inject: [ConfigService],
		  }),
	],
	providers: [AppCommands]
})
export class AppModule {}
