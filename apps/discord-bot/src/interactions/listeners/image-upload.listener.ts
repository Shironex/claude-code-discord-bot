import { Injectable } from '@nestjs/common';
import { Context, On, ContextOf } from 'necord';
import { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { BaseService } from '../../services/base/base.service';
import { SessionService } from '../../services/session.service';
import { ImageUploadService } from '../../services/image-service/image-upload.service';
import { CUSTOM_IDS } from '../../utils/discord.constants';

@Injectable()
export class ImageUploadListener extends BaseService {
	constructor(
		private readonly sessionService: SessionService,
		private readonly imageUploadService: ImageUploadService
	) {
		super(ImageUploadListener.name);
	}

	@On('messageCreate')
	public async onMessage(@Context() [message]: ContextOf<'messageCreate'>) {
		// Ignore bot messages and messages without attachments
		if (message.author.bot || message.attachments.size === 0) {
			return;
		}

		const userId = message.author.id;
		const session = this.sessionService.getSession(userId);

		// Check if this user is waiting for image uploads
		if (!session || !session.awaitingImages || session.action !== 'claude_awaiting_images') {
			return;
		}

		// Check if this message has image attachments
		const attachments = Array.from(message.attachments.values());
		const imageAttachments = attachments.filter(
			attachment => this.imageUploadService.validateAttachments([attachment]).valid.length > 0
		);

		if (imageAttachments.length === 0) {
			// No valid images found
			await message.reply({
				content:
					'❌ No valid images found. Please upload image files (PNG, JPG, GIF, WebP, BMP, TIFF) and try again.'
			});
			return;
		}

		try {
			// Log diagnostic information
			const diagnosticInfo = this.imageUploadService['imageServiceClient'].getDiagnosticInfo();
			this.logger.log(
				`Processing ${imageAttachments.length} images from user ${message.author.tag} (${userId})`,
				{
					diagnosticInfo,
					imageCount: imageAttachments.length,
					attachmentSummary: imageAttachments.map(att => ({
						id: att.id,
						name: att.name,
						size: att.size,
						contentType: att.contentType
					}))
				}
			);

			// Send initial processing message
			const processingMessage = await message.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle('🔄 Processing Images...')
						.setColor(Colors.Yellow)
						.setDescription(`Uploading ${imageAttachments.length} images to the image service...`)
						.setTimestamp()
				]
			});

			// Upload images to the image service
			const uploadResult = await this.imageUploadService.uploadDiscordAttachments(imageAttachments, {
				ttl: 3600, // 1 hour TTL for analysis images
				userId: userId
			});

			this.logger.debug('Upload result', 'ImageUploadListener', { uploadResult });

			// Check if any uploads were successful
			if (uploadResult.successCount === 0) {
				await processingMessage.edit({
					embeds: [
						new EmbedBuilder()
							.setTitle('❌ Image Upload Failed')
							.setColor(Colors.Red)
							.setDescription('Failed to upload any images. Please try again with different images.')
							.addFields([
								{
									name: 'Errors',
									value:
										uploadResult.errors?.map(e => `• ${e.error}`).join('\n') ||
										'Unknown errors occurred'
								}
							])
							.setTimestamp()
					]
				});
				return;
			}

			// Store successful uploads in session
			const uploadedImages = uploadResult.results
				.filter(r => r.success && r.result)
				.map(r => ({
					id: r.result!.id,
					url: r.result!.url,
					originalName: r.result!.originalName || 'unknown',
					size: r.result!.size,
					expires: r.result!.expires
				}));

			this.sessionService.updateSession(userId, {
				uploadedImages,
				action: 'claude_prompt_input',
				awaitingImages: false
			});

			// Create success embed
			const successEmbed = new EmbedBuilder()
				.setTitle('✅ Images Uploaded Successfully')
				.setColor(Colors.Green)
				.setDescription(
					`**${uploadResult.successCount}** out of **${uploadResult.totalCount}** images uploaded successfully.\n\n` +
						'Images have been processed and are ready to be included in your analysis prompt.'
				)
				.addFields([
					{
						name: '📋 Uploaded Images',
						value: uploadedImages
							.map(
								(img, index) => `${index + 1}. ${img.originalName} (${(img.size / 1024).toFixed(1)} KB)`
							)
							.join('\n'),
						inline: false
					}
				])
				.setFooter({
					text: 'Opening prompt modal with image URLs pre-filled...'
				})
				.setTimestamp();

			// Add error information if some uploads failed
			if (uploadResult.errors && uploadResult.errors.length > 0) {
				successEmbed.addFields([
					{
						name: '⚠️ Failed Uploads',
						value: uploadResult.errors.map(e => `• ${e.filename}: ${e.error}`).join('\n'),
						inline: false
					}
				]);
			}

			await processingMessage.edit({ embeds: [successEmbed] });

			// Create a button to open the prompt modal directly
			const openPromptButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(CUSTOM_IDS.OPEN_CLAUDE_PROMPT)
					.setLabel('📝 Open Analysis Prompt')
					.setStyle(ButtonStyle.Primary)
					.setEmoji('🚀')
			);

			await message.reply({
				content: '🎯 **Ready for Analysis!** Your images are uploaded and ready.',
				embeds: [
					new EmbedBuilder()
						.setTitle('📝 Next Steps')
						.setColor(Colors.Blue)
						.setDescription(
							'Your images have been uploaded and are ready for analysis.\n\n' +
								'**Click the button below to open the analysis prompt with your uploaded images pre-filled.**\n\n' +
								'**Your uploaded images:**\n' +
								uploadedImages.map(img => `• [${img.originalName}](${img.url})`).join('\n')
						)
						.setFooter({
							text: 'Images expire in 1 hour'
						})
						.setTimestamp()
				],
				components: [openPromptButton]
			});

			this.logger.log(
				`Successfully processed ${uploadResult.successCount} images for user ${message.author.tag}`
			);
		} catch (error) {
			this.logger.error(`Failed to process image uploads: ${error.message}`, error);

			await message.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle('❌ Image Processing Failed')
						.setColor(Colors.Red)
						.setDescription(`An error occurred while processing your images: ${error.message}`)
						.addFields([
							{
								name: '💡 What to do',
								value: '• Check if the image service is running\n• Try uploading fewer or smaller images\n• Use the `/claude` command to restart'
							}
						])
						.setTimestamp()
				]
			});

			// Reset session state
			this.sessionService.updateSession(userId, {
				awaitingImages: false,
				action: 'claude_repository_search'
			});
		}
	}
}
