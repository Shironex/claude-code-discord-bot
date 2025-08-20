import { Injectable } from '@nestjs/common';
import { Context, Button, ButtonContext } from 'necord';
import { BaseService } from '../../services/base/base.service';
import { SessionService } from '../../services/session.service';
import { CUSTOM_IDS } from '../../utils/discord.constants';
import { MESSAGES } from '../../utils/messages.constants';

@Injectable()
export class CancelButtonHandler extends BaseService {
	constructor(private readonly sessionService: SessionService) {
		super(CancelButtonHandler.name);
	}

	@Button(CUSTOM_IDS.CANCEL)
	public async onCancel(@Context() [interaction]: ButtonContext) {
		// Only handle custom IDs that start with 'cancel'
		if (!interaction.customId.startsWith(CUSTOM_IDS.CANCEL)) {
			return;
		}

		this.logger.log(
			`Cancel button handler triggered: ${interaction.customId} by user: ${interaction.user.tag} (${interaction.user.id})`
		);

		const userId = interaction.user.id;
		this.sessionService.deleteSession(userId);

		await interaction.update({
			content: MESSAGES.OPERATION_CANCELLED,
			embeds: [],
			components: []
		});
	}
}
