import { Injectable } from '@nestjs/common';
import { Context, Button, ButtonContext } from 'necord';
import { SessionService } from '../../services/session.service';
import { CUSTOM_IDS, MESSAGES } from '../../utils/constants';

@Injectable()
export class CancelButtonHandler {
	constructor(private readonly sessionService: SessionService) {}

	@Button(CUSTOM_IDS.CANCEL)
	public async onCancel(@Context() [interaction]: ButtonContext) {
		// Only handle custom IDs that start with 'cancel'
		if (!interaction.customId.startsWith(CUSTOM_IDS.CANCEL)) {
			return;
		}

		console.log('❌ Cancel button handler triggered:', interaction.customId);

		const userId = interaction.user.id;
		this.sessionService.deleteSession(userId);

		await interaction.update({
			content: MESSAGES.OPERATION_CANCELLED,
			embeds: [],
			components: []
		});
	}
}
