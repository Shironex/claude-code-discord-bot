import { WorkflowDispatchRequest, WorkflowRun, WorkflowFile } from '../models/workflow.interface';

export interface IWorkflowService {
	checkWorkflowExists(owner: string, repo: string, workflowFile?: string): Promise<boolean>;
	dispatchWorkflow(request: WorkflowDispatchRequest): Promise<void>;
	getWorkflowRuns(owner: string, repo: string, workflowId: string, limit?: number): Promise<WorkflowRun[]>;
	getWorkflowRunStatus(owner: string, repo: string, runId: number): Promise<WorkflowRun>;
	getLatestWorkflowRun(owner: string, repo: string, workflowId: string): Promise<WorkflowRun | null>;
	findWorkflowRunByTrackingId(
		owner: string,
		repo: string,
		workflowId: string,
		trackingId: string,
		dispatchTime: number,
		maxAttempts?: number
	): Promise<WorkflowRun | null>;
	listWorkflows(owner: string, repo: string): Promise<WorkflowFile[]>;
	isConfigured(): boolean;
}
