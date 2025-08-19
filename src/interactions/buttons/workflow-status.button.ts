import { Injectable, Logger } from '@nestjs/common';
import { Context, Button, ButtonContext } from 'necord';
import { ActionRowBuilder, ButtonBuilder, MessageFlags } from 'discord.js';
import { SessionService } from '../../services/session.service';
import { WorkflowService } from '../../services/workflow.service';
import { EmbedService } from '../../services/embed.service';
import { CUSTOM_IDS, MESSAGES } from '../../utils/constants';
import { DiscordUtils } from '../../utils/discord.utils';

@Injectable()
export class WorkflowStatusButtonHandler {
	private readonly logger = new Logger(WorkflowStatusButtonHandler.name);

	constructor(
		private readonly sessionService: SessionService,
		private readonly workflowService: WorkflowService,
		private readonly embedService: EmbedService
	) {}

	@Button(CUSTOM_IDS.WORKFLOW_STATUS)
	public async onWorkflowStatus(@Context() [interaction]: ButtonContext) {
		const userId = interaction.user.id;
		const session = this.sessionService.getSession(userId);

		if (!session || !session.repository) {
			return interaction.reply({
				content: MESSAGES.SESSION_EXPIRED,
				flags: [MessageFlags.Ephemeral]
			});
		}

		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		try {
			const [owner, repo] = session.repository.fullName.split('/');
			const workflowRuns = await this.workflowService.getWorkflowRuns(owner, repo, 'claude.yml', 5);

			if (workflowRuns.length === 0) {
				const embed = this.embedService.createWarningEmbed(
					'No Workflow Runs',
					`No Claude Code workflow runs found for \`${session.repository.fullName}\`.`
				);
				return interaction.editReply({ embeds: [embed] });
			}

			// Get the latest run
			const latestRun = workflowRuns[0];
			const embed = this.embedService.createWorkflowStatusEmbed(latestRun, session.repository.fullName);

			// Create buttons for actions
			const components: ActionRowBuilder<ButtonBuilder>[] = [];
			const viewButton = DiscordUtils.createViewWorkflowButton(latestRun.html_url);
			const refreshButton = DiscordUtils.createWorkflowStatusButton();

			const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(viewButton, refreshButton);
			components.push(actionRow);

			await interaction.editReply({
				embeds: [embed],
				components
			});

			this.logger.log(
				`Displayed workflow status for ${session.repository.fullName} - Run ${latestRun.id}: ${latestRun.status}`
			);
		} catch (error) {
			this.logger.error(`Failed to get workflow status: ${error.message}`, error);
			const embed = this.embedService.createErrorEmbed(
				'Status Check Failed',
				`Failed to check workflow status:\n\`${error.message}\``
			);
			return interaction.editReply({ embeds: [embed] });
		}
	}
}
