export interface ContainerExecutionRequest {
	repositoryFullName: string;
	githubToken: string;
	userId: string;
	requestId: string;
}

export interface ContainerExecutionResult {
	success: boolean;
	containerId: string;
	repositoryInfo?: RepositoryCloneInfo;
	logs: string[];
	error?: string;
	executionTime: number;
}

export interface RepositoryCloneInfo {
	fullName: string;
	size: string;
	fileCount: number;
	currentBranch: string;
	latestCommit: string;
	commitMessage: string;
}

export interface ContainerStatus {
	containerId: string;
	status: 'created' | 'running' | 'completed' | 'failed' | 'timeout';
	createdAt: Date;
	startedAt?: Date;
	finishedAt?: Date;
	repositoryFullName: string;
	userId: string;
	requestId: string;
	logs: string[];
	error?: string;
}

export interface ContainerLogEntry {
	timestamp: Date;
	level: 'info' | 'success' | 'warning' | 'error';
	message: string;
	containerId: string;
}

export interface ContainerResourceLimits {
	memory?: number; // in bytes
	cpu?: number; // CPU shares
	timeout?: number; // in milliseconds
}

export interface ContainerCreateOptions {
	executionRequest: ContainerExecutionRequest;
	resourceLimits?: ContainerResourceLimits;
	autoRemove?: boolean;
	networkMode?: string;
}

export interface ContainerManager {
	createContainer(options: ContainerCreateOptions): Promise<string>;
	startContainer(containerId: string): Promise<void>;
	stopContainer(containerId: string): Promise<void>;
	removeContainer(containerId: string): Promise<void>;
	getContainerStatus(containerId: string): Promise<ContainerStatus>;
	getContainerLogs(containerId: string): Promise<ContainerLogEntry[]>;
	listActiveContainers(): Promise<ContainerStatus[]>;
	cleanupExpiredContainers(maxAgeMs?: number): Promise<number>;
}