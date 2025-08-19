import { Repository, PaginatedRepositories } from './repository.interface';
import { UserWorkflowRun } from './workflow.interface';

export interface UserSession {
	userId: string;
	repository: Repository | null;
	paginatedData: PaginatedRepositories | null;
	searchQuery: string | null;
	action: string | null;
	workflowRuns?: UserWorkflowRun[];
	createdAt: Date;
}
