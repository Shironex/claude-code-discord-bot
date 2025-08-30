import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { BaseService } from './base/base.service';
import { WorkflowService } from './workflow.service';
import { SessionService } from './session.service';
import { EmbedService } from './embed.service';
import { Client, TextChannel, Message, ActionRowBuilder, ButtonBuilder } from 'discord.js';
import { DiscordUtils } from '../utils/discord.utils';

interface MonitoredWorkflow {
	userId: string;
	repository: string;
	runId: number;
	messageId: string;
	channelId: string;
	startTime: Date;
	lastChecked: Date;
}

@Injectable()
export class WorkflowMonitorService extends BaseService implements OnModuleInit, OnModuleDestroy {
	private monitoredWorkflows: Map<string, MonitoredWorkflow> = new Map();
	private monitorInterval: NodeJS.Timeout | null = null;
	private readonly POLL_INTERVAL = 30000; // 30 seconds
	private readonly MAX_MONITOR_TIME = 3600000; // 1 hour

	constructor(
		private readonly workflowService: WorkflowService,
		private readonly sessionService: SessionService,
		private readonly embedService: EmbedService,
		private readonly client: Client
	) {
		super(WorkflowMonitorService.name);
	}

	onModuleInit() {
		this.startMonitoring();
		this.logger.log('Workflow monitor service started');
	}

	onModuleDestroy() {
		this.stopMonitoring();
		this.logger.log('Workflow monitor service stopped');
	}

	addWorkflowToMonitor(
		userId: string,
		repository: string,
		runId: number,
		messageId: string,
		channelId: string
	): void {
		const key = `${userId}-${runId}`;
		const monitoredWorkflow: MonitoredWorkflow = {
			userId,
			repository,
			runId,
			messageId,
			channelId,
			startTime: new Date(),
			lastChecked: new Date()
		};

		this.monitoredWorkflows.set(key, monitoredWorkflow);
		this.logger.log(`Added workflow ${runId} for monitoring (User: ${userId}, Repository: ${repository})`);
	}

	removeWorkflowFromMonitor(userId: string, runId: number): void {
		const key = `${userId}-${runId}`;
		if (this.monitoredWorkflows.delete(key)) {
			this.logger.log(`Removed workflow ${runId} from monitoring (User: ${userId})`);
		}
	}

	private startMonitoring(): void {
		this.monitorInterval = setInterval(async () => {
			await this.checkAllWorkflows();
		}, this.POLL_INTERVAL);
	}

	private stopMonitoring(): void {
		if (this.monitorInterval) {
			clearInterval(this.monitorInterval);
			this.monitorInterval = null;
		}
	}

	private async checkAllWorkflows(): Promise<void> {
		const workflowsToCheck = Array.from(this.monitoredWorkflows.values());

		if (workflowsToCheck.length === 0) {
			return;
		}

		this.logger.debug(`Checking ${workflowsToCheck.length} monitored workflows`);

		for (const workflow of workflowsToCheck) {
			try {
				await this.checkWorkflowStatus(workflow);
			} catch (error) {
				this.logger.error(`Error checking workflow ${workflow.runId}: ${error.message}`, error);
			}
		}

		// Clean up old workflows
		this.cleanupOldWorkflows();
	}

	private async checkWorkflowStatus(workflow: MonitoredWorkflow): Promise<void> {
		const [owner, repo] = workflow.repository.split('/');

		try {
			const workflowRun = await this.workflowService.getWorkflowRunStatus(owner, repo, workflow.runId);

			// Update last checked time
			workflow.lastChecked = new Date();

			// Check if status changed to completed
			if (workflowRun.status === 'completed') {
				await this.handleWorkflowCompletion(workflow, workflowRun);
				this.removeWorkflowFromMonitor(workflow.userId, workflow.runId);
			} else if (workflowRun.status === 'in_progress') {
				// Optionally update with "Running" status
				await this.updateDiscordMessage(workflow, workflowRun, false);
			}
		} catch (error) {
			this.logger.error(`Failed to check workflow ${workflow.runId}: ${error.message}`);
		}
	}

	private async handleWorkflowCompletion(workflow: MonitoredWorkflow, workflowRun: any): Promise<void> {
		this.logger.log(`Workflow ${workflow.runId} completed with status: ${workflowRun.conclusion}`);

		// Update session
		this.sessionService.updateWorkflowRun(workflow.userId, workflow.runId, {
			status: workflowRun.status
		});

		// Update Discord message
		await this.updateDiscordMessage(workflow, workflowRun, true);
	}

	private async updateDiscordMessage(
		workflow: MonitoredWorkflow,
		workflowRun: any,
		isCompleted: boolean
	): Promise<void> {
		try {
			const channel = (await this.client.channels.fetch(workflow.channelId)) as TextChannel;
			if (!channel) {
				this.logger.warn(`Channel ${workflow.channelId} not found`);
				return;
			}

			const message = (await channel.messages.fetch(workflow.messageId)) as Message;
			if (!message) {
				this.logger.warn(`Message ${workflow.messageId} not found`);
				return;
			}

			// Create updated embed
			let embed;
			if (isCompleted) {
				embed = this.embedService.createWorkflowCompletedEmbed(
					workflow.repository,
					workflowRun,
					workflow.startTime
				);
			} else {
				embed = this.embedService.createWorkflowStatusEmbed(workflowRun, workflow.repository);
			}

			// Create action buttons
			const components: ActionRowBuilder<ButtonBuilder>[] = [];
			const viewButton = DiscordUtils.createViewWorkflowButton(workflowRun.html_url);

			if (isCompleted && workflowRun.conclusion === 'success') {
				// Try to get PR URL if workflow created one
				const prButton = await this.tryGetPRButton(workflow.repository, workflowRun);
				if (prButton) {
					const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(viewButton, prButton);
					components.push(actionRow);
				} else {
					const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(viewButton);
					components.push(actionRow);
				}
			} else {
				const statusButton = DiscordUtils.createWorkflowStatusButton();
				const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(viewButton, statusButton);
				components.push(actionRow);
			}

			await message.edit({
				embeds: [embed],
				components
			});

			this.logger.log(`Updated Discord message for workflow ${workflow.runId}`);
		} catch (error) {
			this.logger.error(`Failed to update Discord message: ${error.message}`, error);
		}
	}

	private async tryGetPRButton(repository: string, workflowRun: any): Promise<ButtonBuilder | null> {
		try {
			const [owner, repo] = repository.split('/');

			// Try to find recent PRs that might be from this workflow
			// This is a best-effort attempt since we don't have direct PR link from workflow
			if (!this.workflowService.isConfigured()) return null;

			const prs = await this.workflowService.getRecentPullRequests(owner, repo, 5);

			// Look for PRs created around the workflow time
			const workflowTime = new Date(workflowRun.created_at);
			const recentPR = prs.find(pr => {
				const prTime = new Date(pr.created_at);
				const timeDiff = Math.abs(prTime.getTime() - workflowTime.getTime());
				return timeDiff < 300000; // Within 5 minutes
			});

			if (recentPR) {
				return new ButtonBuilder()
					.setURL(recentPR.html_url)
					.setLabel('View Pull Request')
					.setStyle(5) // Link style
					.setEmoji('🔗');
			}

			return null;
		} catch (error) {
			this.logger.debug(`Could not find PR for workflow: ${error.message}`);
			return null;
		}
	}

	private cleanupOldWorkflows(): void {
		const now = new Date();
		const workflowsToRemove: string[] = [];

		for (const [key, workflow] of this.monitoredWorkflows.entries()) {
			const age = now.getTime() - workflow.startTime.getTime();
			if (age > this.MAX_MONITOR_TIME) {
				workflowsToRemove.push(key);
				this.logger.log(
					`Removing old workflow ${workflow.runId} from monitoring (age: ${Math.round(age / 60000)} minutes)`
				);
			}
		}

		workflowsToRemove.forEach(key => this.monitoredWorkflows.delete(key));
	}

	getMonitoredWorkflowsCount(): number {
		return this.monitoredWorkflows.size;
	}

	getMonitoredWorkflows(): MonitoredWorkflow[] {
		return Array.from(this.monitoredWorkflows.values());
	}
}
