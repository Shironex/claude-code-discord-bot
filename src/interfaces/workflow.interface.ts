export interface WorkflowDispatchRequest {
	owner: string;
	repo: string;
	workflowId: string;
	ref: string;
	inputs: {
		prompt: string;
	};
}

export interface WorkflowRun {
	id: number;
	status: string;
	conclusion: string | null;
	html_url: string;
	created_at: string;
	updated_at: string;
	run_number: number;
	head_branch: string;
}

export interface WorkflowRunsResponse {
	total_count: number;
	workflow_runs: WorkflowRun[];
}

export interface WorkflowFile {
	name: string;
	path: string;
	state: string;
	created_at: string;
	updated_at: string;
	url: string;
	html_url: string;
	badge_url: string;
}

export interface UserWorkflowRun {
	runId: number;
	repository: string;
	status: string;
	startedAt: Date;
	workflowUrl: string;
}
