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

	getOctokit(): Octokit | null {
		return this.octokit;
	}

	isConfigured(): boolean {
		return this.octokit !== null;
	}
}
