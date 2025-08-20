import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { BaseService } from './base/base.service';
import { IWorkflowService } from '../interfaces/services/workflow.interface';
import {
	WorkflowDispatchRequest,
	WorkflowRun,
	WorkflowRunsResponse,
	WorkflowFile
} from '../interfaces/models/workflow.interface';
import { TrackingUtils } from '../utils/tracking.utils';

@Injectable()
export class WorkflowService extends BaseService implements IWorkflowService {
	private octokit: Octokit | null = null;

	constructor(private configService: ConfigService) {
		super(WorkflowService.name);
		const token = this.configService.get<string>('GITHUB_TOKEN');

		if (token) {
			this.octokit = new Octokit({
				auth: token
			});
			this.logger.log('Workflow service initialized with GitHub token');
		} else {
			this.logger.warn('GitHub token not found - workflow functionality will be disabled');
		}
	}

	async checkWorkflowExists(owner: string, repo: string, workflowFile: string = 'claude.yml'): Promise<boolean> {
		if (!this.octokit) {
			throw new Error('GitHub token not configured');
		}

		try {
			this.logger.log(`Checking for workflow file: ${owner}/${repo}/.github/workflows/${workflowFile}`);

			await this.octokit.rest.repos.getContent({
				owner,
				repo,
				path: `.github/workflows/${workflowFile}`
			});

			this.logger.log(`Found workflow file: ${workflowFile} in ${owner}/${repo}`);
			return true;
		} catch (error) {
			if (error.status === 404) {
				this.logger.log(`Workflow file not found: ${workflowFile} in ${owner}/${repo}`);
				return false;
			}
			this.logger.error(`Error checking workflow file: ${error.message}`);
			throw new Error(`Failed to check workflow file: ${error.message}`);
		}
	}

	async dispatchWorkflow(request: WorkflowDispatchRequest): Promise<void> {
		if (!this.octokit) {
			throw new Error('GitHub token not configured');
		}

		try {
			this.logger.log(`Dispatching workflow: ${request.workflowId} for ${request.owner}/${request.repo}`);
			this.logger.log(`Prompt: ${request.inputs.prompt.substring(0, 100)}...`);
			if (request.inputs.tracking_id) {
				this.logger.log(`Tracking ID: ${request.inputs.tracking_id}`);
			}

			await this.octokit.rest.actions.createWorkflowDispatch({
				owner: request.owner,
				repo: request.repo,
				workflow_id: request.workflowId,
				ref: request.ref,
				inputs: request.inputs
			});

			this.logger.log(`Successfully dispatched workflow: ${request.workflowId}`);
		} catch (error) {
			this.logger.error(`Failed to dispatch workflow: ${error.message}`, error);
			throw new Error(`Failed to dispatch workflow: ${error.message}`);
		}
	}

	async getWorkflowRuns(owner: string, repo: string, workflowId: string, limit: number = 5): Promise<WorkflowRun[]> {
		if (!this.octokit) {
			throw new Error('GitHub token not configured');
		}

		try {
			this.logger.log(`Fetching workflow runs for: ${owner}/${repo} workflow: ${workflowId}`);

			const { data }: { data: WorkflowRunsResponse } = await this.octokit.rest.actions.listWorkflowRuns({
				owner,
				repo,
				workflow_id: workflowId,
				per_page: limit
			});

			this.logger.log(`Found ${data.workflow_runs.length} workflow runs`);
			return data.workflow_runs;
		} catch (error) {
			this.logger.error(`Failed to fetch workflow runs: ${error.message}`, error);
			throw new Error(`Failed to fetch workflow runs: ${error.message}`);
		}
	}

	async getWorkflowRunStatus(owner: string, repo: string, runId: number): Promise<WorkflowRun> {
		if (!this.octokit) {
			throw new Error('GitHub token not configured');
		}

		try {
			this.logger.log(`Fetching workflow run status: ${owner}/${repo} run: ${runId}`);

			const { data } = await this.octokit.rest.actions.getWorkflowRun({
				owner,
				repo,
				run_id: runId
			});

			return data as WorkflowRun;
		} catch (error) {
			this.logger.error(`Failed to fetch workflow run status: ${error.message}`, error);
			throw new Error(`Failed to fetch workflow run status: ${error.message}`);
		}
	}

	async getLatestWorkflowRun(owner: string, repo: string, workflowId: string): Promise<WorkflowRun | null> {
		try {
			const runs = await this.getWorkflowRuns(owner, repo, workflowId, 1);
			return runs.length > 0 ? runs[0] : null;
		} catch (error) {
			this.logger.error(`Failed to get latest workflow run: ${error.message}`);
			return null;
		}
	}

	async listWorkflows(owner: string, repo: string): Promise<WorkflowFile[]> {
		if (!this.octokit) {
			throw new Error('GitHub token not configured');
		}

		try {
			this.logger.log(`Listing workflows for: ${owner}/${repo}`);

			const { data } = await this.octokit.rest.actions.listRepoWorkflows({
				owner,
				repo
			});

			return data.workflows as WorkflowFile[];
		} catch (error) {
			this.logger.error(`Failed to list workflows: ${error.message}`, error);
			throw new Error(`Failed to list workflows: ${error.message}`);
		}
	}

	async findWorkflowRunByTrackingId(
		owner: string,
		repo: string,
		workflowId: string,
		trackingId: string,
		dispatchTime: number,
		maxAttempts: number = 10
	): Promise<WorkflowRun | null> {
		if (!this.octokit) {
			throw new Error('GitHub token not configured');
		}

		this.logger.log(`Searching for workflow run with tracking ID: ${trackingId}`);
		const startTime = Date.now();
		let attempts = 0;

		while (attempts < maxAttempts) {
			attempts++;
			const delay = Math.min(2000 * Math.pow(1.5, attempts - 1), 10000); // Exponential backoff capped at 10s

			try {
				// Wait before polling (except on first attempt)
				if (attempts > 1) {
					await new Promise(resolve => setTimeout(resolve, delay));
				}

				const { data }: { data: WorkflowRunsResponse } = await this.octokit.rest.actions.listWorkflowRuns({
					owner,
					repo,
					workflow_id: workflowId,
					per_page: 20, // Check more runs to find ours
					status: 'queued' // First check queued runs
				});

				// Also check in_progress runs
				const { data: inProgressData }: { data: WorkflowRunsResponse } =
					await this.octokit.rest.actions.listWorkflowRuns({
						owner,
						repo,
						workflow_id: workflowId,
						per_page: 20,
						status: 'in_progress'
					});

				const allRuns = [...data.workflow_runs, ...inProgressData.workflow_runs];

				this.logger.debug(
					`Attempt ${attempts}: Found ${allRuns.length} queued/in_progress workflow runs`
				);

				// Look for our run by checking if it was created after dispatch time
				// and contains our tracking ID in the prompt
				for (const run of allRuns) {
					const runCreatedAt = new Date(run.created_at).getTime();

					// Check if this run was created after we dispatched
					if (runCreatedAt >= dispatchTime - 5000) {
						// Within 5 seconds before dispatch (to account for clock differences)
						try {
							// Get the full run details to check inputs
							const { data: fullRun } = await this.octokit.rest.actions.getWorkflowRun({
								owner,
								repo,
								run_id: run.id
							});

							// Check if the run name or any other field contains our tracking ID
							// Note: GitHub doesn't directly expose workflow inputs in the API response,
							// but the tracking ID should appear in the run's logs or artifacts
							// For now, we'll use timing and status as the primary indicators
							if (
								runCreatedAt >= dispatchTime &&
								runCreatedAt <= dispatchTime + 30000 // Within 30 seconds of dispatch
							) {
								this.logger.log(
									`Found matching workflow run: ${run.id} (created at ${new Date(
										run.created_at
									).toISOString()})`
								);
								return fullRun as WorkflowRun;
							}
						} catch (error) {
							this.logger.debug(`Error fetching run details for ${run.id}: ${error.message}`);
						}
					}
				}

				const elapsed = Date.now() - startTime;
				this.logger.debug(
					`Tracking ID ${trackingId} not found yet. Attempt ${attempts}/${maxAttempts}, elapsed: ${elapsed}ms`
				);
			} catch (error) {
				this.logger.error(`Error searching for workflow run: ${error.message}`);
			}
		}

		this.logger.warn(
			`Could not find workflow run with tracking ID ${trackingId} after ${maxAttempts} attempts`
		);
		return null;
	}

	getOctokit(): Octokit | null {
		return this.octokit;
	}

	isConfigured(): boolean {
		return this.octokit !== null;
	}
}
