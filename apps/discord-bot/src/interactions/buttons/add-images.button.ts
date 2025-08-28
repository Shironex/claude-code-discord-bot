import { Injectable } from '@nestjs/common';
import { Context, Button, ButtonContext } from 'necord';
import { MessageFlags, EmbedBuilder, Colors } from 'discord.js';
import { BaseService } from '../../services/base/base.service';
import { SessionService } from '../../services/session.service';
import { ImageServiceClient } from '../../services/image-service/image-service.client';
import { CUSTOM_IDS } from '../../utils/discord.constants';
import { MESSAGES } from '../../utils/messages.constants';

@Injectable()
export class AddImagesButtonHandler extends BaseService {
	constructor(
		private readonly sessionService: SessionService,
		private readonly imageServiceClient: ImageServiceClient
	) {
		super(AddImagesButtonHandler.name);
	}

	@Button(CUSTOM_IDS.ADD_IMAGES)
	public async onAddImages(@Context() [interaction]: ButtonContext) {
		const userId = interaction.user.id;
		const session = this.sessionService.getSession(userId);

		if (!session || !session.repository) {
			return interaction.reply({
				content: MESSAGES.SESSION_EXPIRED,
				flags: [MessageFlags.Ephemeral]
			});
		}

		if (!this.imageServiceClient.isAvailable()) {
			return interaction.reply({
				content: '❌ Image service is not available. Please check the configuration.',
				flags: [MessageFlags.Ephemeral]
			});
		}

		try {
			this.logger.log(`User ${interaction.user.tag} (${userId}) chose to add images`);

			// Update session to wait for image uploads
			this.sessionService.updateSession(userId, {
				action: 'claude_awaiting_images',
				awaitingImages: true,
				uploadedImages: [] // Reset any previously uploaded images
			});

			// Create waiting embed
			const waitingEmbed = new EmbedBuilder()
				.setTitle('🖼️ Ready for Image Upload')
				.setColor(Colors.Green)
				.setDescription(
					`**Repository:** ${session.repository.name}\n\n` +
						'**Next Step:** Upload your images in the next message\n\n' +
						'📋 **Upload Instructions:**\n' +
						'• Attach up to 10 images in your next message\n' +
						'• Supported: PNG, JPG, GIF, WebP, BMP, TIFF\n' +
						'• Max size: 10MB per image\n' +
						'• Just send the images - no text needed\n\n' +
						'⏱️ **The bot will:**\n' +
						'1. Process your uploaded images\n' +
						'2. Store them temporarily\n' +
						'3. Open the analysis prompt with image URLs included'
				)
				.addFields([
					{
						name: '💡 Tips',
						value:
							'• Upload all images at once for best results\n' +
							'• Images will be automatically organized\n' +
							'• You can still cancel with the button below',
						inline: false
					}
				])
				.setFooter({
					text: 'Waiting for your image upload...'
				})
				.setTimestamp();

			// Remove previous components and show waiting state
			await interaction.update({
				embeds: [waitingEmbed],
				components: [
					{
						type: 1,
						components: [
							{
								type: 2,
								style: 4, // Danger style
								label: 'Cancel',
								custom_id: CUSTOM_IDS.CANCEL,
								emoji: { name: '❌' }
							}
						]
					}
				]
			});

			this.logger.log(`Image upload waiting state set for ${session.repository.fullName}`);
		} catch (error) {
			this.logger.error(`Failed to handle add images: ${error.message}`, error);
			return interaction.reply({
				content: 'Failed to initialize image upload. Please try again.',
				flags: [MessageFlags.Ephemeral]
			});
		}
	}
}
