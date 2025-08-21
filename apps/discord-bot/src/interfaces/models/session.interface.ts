import { Repository, PaginatedRepositories } from './repository.interface';
import { UserWorkflowRun } from './workflow.interface';

export interface UploadedImage {
	id: string;
	url: string;
	originalName: string;
	size: number;
	expires: string;
}

export interface UserSession {
	userId: string;
	repository: Repository | null;
	paginatedData: PaginatedRepositories | null;
	searchQuery: string | null;
	action: string | null;
	selectedFilePaths?: string[];
	workflowRuns?: UserWorkflowRun[];
	awaitingImages?: boolean;
	uploadedImages?: UploadedImage[];
	createdAt: Date;
}
