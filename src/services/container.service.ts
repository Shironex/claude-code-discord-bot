import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Docker from 'dockerode';
import {
	ContainerExecutionRequest,
	ContainerExecutionResult,
	ContainerStatus,
	ContainerLogEntry,
	ContainerCreateOptions,
	ContainerManager,
	RepositoryCloneInfo,
	ContainerResourceLimits
} from '../interfaces/container.interface';

@Injectable()
export class ContainerService implements ContainerManager {
	private readonly logger = new Logger(ContainerService.name);
	private docker: Docker;
	private readonly containers = new Map<string, ContainerStatus>();
	private readonly defaultResourceLimits: ContainerResourceLimits = {
		memory: 1024 * 1024 * 1024, // 1GB
		cpu: 512, // 0.5 CPU
		timeout: 30 * 60 * 1000 // 30 minutes
	};

	constructor(private configService: ConfigService) {
		// Initialize Docker client
		this.docker = new Docker();
		this.logger.log('Docker service initialized');

		// Start cleanup interval (every 5 minutes)
		setInterval(() => {
			this.cleanupExpiredContainers().catch(error => {
				this.logger.error('Error during container cleanup', error);
			});
		}, 5 * 60 * 1000);
	}

	async createContainer(options: ContainerCreateOptions): Promise<string> {
		const { executionRequest, resourceLimits, autoRemove = true, networkMode = 'bridge' } = options;
		const limits = { ...this.defaultResourceLimits, ...resourceLimits };

		try {
			this.logger.log(`Creating container for repository: ${executionRequest.repositoryFullName}`);

			// Generate unique container name
			const containerName = `claude-runner-${executionRequest.requestId}`;

			// Prepare environment variables
			const env = [
				`GITHUB_TOKEN=${executionRequest.githubToken}`,
				`REPO_FULL_NAME=${executionRequest.repositoryFullName}`,
				`USER_ID=${executionRequest.userId}`,
				`REQUEST_ID=${executionRequest.requestId}`
			];

			// Create container configuration
			const containerConfig = {
				Image: 'claude-runner:latest',
				name: containerName,
				Env: env,
				WorkingDir: '/workspace',
				HostConfig: {
					Memory: limits.memory,
					CpuShares: limits.cpu,
					AutoRemove: autoRemove,
					NetworkMode: networkMode,
					// Remove tmpfs to avoid permission issues - container is temporary anyway
				},
				Labels: {
					'claude-bot.service': 'runner',
					'claude-bot.managed': 'true',
					'claude-bot.user-id': executionRequest.userId,
					'claude-bot.request-id': executionRequest.requestId,
					'claude-bot.repository': executionRequest.repositoryFullName,
					'claude-bot.created': new Date().toISOString()
				}
			};

			// Create the container
			const container = await this.docker.createContainer(containerConfig);
			const containerId = container.id;

			// Store container status
			const containerStatus: ContainerStatus = {
				containerId,
				status: 'created',
				createdAt: new Date(),
				repositoryFullName: executionRequest.repositoryFullName,
				userId: executionRequest.userId,
				requestId: executionRequest.requestId,
				logs: []
			};

			this.containers.set(containerId, containerStatus);

			this.logger.log(`Container created successfully: ${containerId}`);
			return containerId;
		} catch (error) {
			this.logger.error(`Failed to create container for ${executionRequest.repositoryFullName}`, error);
			throw new Error(`Failed to create container: ${error.message}`);
		}
	}

	async startContainer(containerId: string): Promise<void> {
		try {
			this.logger.log(`Starting container: ${containerId}`);

			const container = this.docker.getContainer(containerId);
			await container.start();

			// Update container status
			const containerStatus = this.containers.get(containerId);
			if (containerStatus) {
				containerStatus.status = 'running';
				containerStatus.startedAt = new Date();
				this.containers.set(containerId, containerStatus);
			}

			this.logger.log(`Container started successfully: ${containerId}`);

			// Set up timeout handling
			if (containerStatus) {
				setTimeout(() => {
					this.handleContainerTimeout(containerId);
				}, this.defaultResourceLimits.timeout);
			}

			// Monitor container execution and stream logs
			this.monitorContainer(containerId);
			this.streamContainerLogs(containerId);
		} catch (error) {
			this.logger.error(`Failed to start container: ${containerId}`, error);
			throw new Error(`Failed to start container: ${error.message}`);
		}
	}

	async stopContainer(containerId: string): Promise<void> {
		try {
			this.logger.log(`Stopping container: ${containerId}`);

			const container = this.docker.getContainer(containerId);
			await container.stop({ t: 10 }); // 10 second grace period

			// Update container status
			const containerStatus = this.containers.get(containerId);
			if (containerStatus) {
				containerStatus.status = 'completed';
				containerStatus.finishedAt = new Date();
				this.containers.set(containerId, containerStatus);
			}

			this.logger.log(`Container stopped successfully: ${containerId}`);
		} catch (error) {
			this.logger.error(`Failed to stop container: ${containerId}`, error);
			throw new Error(`Failed to stop container: ${error.message}`);
		}
	}

	async removeContainer(containerId: string): Promise<void> {
		try {
			this.logger.log(`Removing container: ${containerId}`);

			const container = this.docker.getContainer(containerId);
			await container.remove({ force: true });

			// Remove from our tracking
			this.containers.delete(containerId);

			this.logger.log(`Container removed successfully: ${containerId}`);
		} catch (error) {
			this.logger.error(`Failed to remove container: ${containerId}`, error);
			throw new Error(`Failed to remove container: ${error.message}`);
		}
	}

	async getContainerStatus(containerId: string): Promise<ContainerStatus> {
		const status = this.containers.get(containerId);
		if (!status) {
			throw new Error(`Container not found: ${containerId}`);
		}
		return { ...status };
	}

	async getContainerLogs(containerId: string): Promise<ContainerLogEntry[]> {
		try {
			const container = this.docker.getContainer(containerId);
			const logStream = await container.logs({
				stdout: true,
				stderr: true,
				timestamps: true,
				follow: false
			});

			// Parse Docker logs format
			const logs: ContainerLogEntry[] = [];
			const logString = logStream.toString();
			const lines = logString.split('\n').filter(line => line.trim());

			for (const line of lines) {
				// Docker log format includes 8-byte header, skip it
				const cleanLine = line.slice(8);
				if (cleanLine.trim()) {
					// Try to parse structured logs from our script
					const logMatch = cleanLine.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+\[(\w+)\]\s+(.+)/);
					if (logMatch) {
						logs.push({
							timestamp: new Date(logMatch[1]),
							level: logMatch[2].toLowerCase() as 'info' | 'success' | 'warning' | 'error',
							message: logMatch[3],
							containerId
						});
					} else {
						logs.push({
							timestamp: new Date(),
							level: 'info',
							message: cleanLine,
							containerId
						});
					}
				}
			}

			return logs;
		} catch (error) {
			this.logger.error(`Failed to get logs for container: ${containerId}`, error);
			return [];
		}
	}

	async listActiveContainers(): Promise<ContainerStatus[]> {
		return Array.from(this.containers.values()).filter(
			status => status.status === 'running' || status.status === 'created'
		);
	}

	async cleanupExpiredContainers(maxAgeMs: number = 2 * 60 * 60 * 1000): Promise<number> {
		// Default: 2 hours
		let cleanedCount = 0;
		const now = Date.now();

		for (const [containerId, status] of this.containers.entries()) {
			const age = now - status.createdAt.getTime();
			
			if (age > maxAgeMs || status.status === 'completed' || status.status === 'failed') {
				try {
					await this.removeContainer(containerId);
					cleanedCount++;
				} catch (error) {
					this.logger.warn(`Failed to cleanup container ${containerId}`, error);
				}
			}
		}

		if (cleanedCount > 0) {
			this.logger.log(`Cleaned up ${cleanedCount} expired containers`);
		}

		return cleanedCount;
	}

	async executeRepository(request: ContainerExecutionRequest): Promise<ContainerExecutionResult> {
		const startTime = Date.now();
		let containerId: string;

		try {
			this.logger.log(`Starting repository execution for: ${request.repositoryFullName}`);

			// Create and start container
			containerId = await this.createContainer({
				executionRequest: request,
				autoRemove: false // Don't auto-remove so we can get logs
			});

			await this.startContainer(containerId);

			// Wait for container to complete
			const result = await this.waitForCompletion(containerId);
			const executionTime = Date.now() - startTime;

			// Get final logs
			const logs = await this.getContainerLogs(containerId);
			const logMessages = logs.map(log => `[${log.level.toUpperCase()}] ${log.message}`);

			// Log execution details for debugging
			if (result.success) {
				this.logger.log(`Repository execution completed successfully for ${request.repositoryFullName}`);
				// Show successful execution logs
				this.logger.log('Container execution logs:');
				logMessages.slice(-10).forEach((logLine, index) => {
					this.logger.log(`  [${index + 1}] ${logLine}`);
				});
			} else {
				this.logger.error(`Repository execution failed for ${request.repositoryFullName}`);
				this.logger.error('Full container execution logs:');
				logMessages.forEach((logLine, index) => {
					this.logger.error(`  [${index + 1}] ${logLine}`);
				});
			}

			// Keep container for inspection - don't remove automatically
			this.logger.log(`Container preserved for inspection: ${containerId}`);

			return {
				success: result.success,
				containerId,
				repositoryInfo: result.repositoryInfo,
				logs: logMessages,
				error: result.error,
				executionTime
			};
		} catch (error) {
			this.logger.error(`Repository execution failed for ${request.repositoryFullName}`, error);

			// Keep failed container for inspection too
			if (containerId) {
				this.logger.log(`Failed container preserved for inspection: ${containerId}`);
			}

			return {
				success: false,
				containerId: containerId || 'unknown',
				logs: [`Execution failed: ${error.message}`],
				error: error.message,
				executionTime: Date.now() - startTime
			};
		}
	}

	private async monitorContainer(containerId: string): Promise<void> {
		try {
			const container = this.docker.getContainer(containerId);
			
			this.logger.log(`Monitoring container: ${containerId}`);
			
			// Wait for container to exit
			const data = await container.wait();
			
			this.logger.log(`Container ${containerId} exited with status code: ${data.StatusCode}`);
			
			const status = this.containers.get(containerId);
			if (status) {
				status.finishedAt = new Date();
				
				if (data.StatusCode === 0) {
					status.status = 'completed';
					this.logger.log(`Container completed successfully: ${containerId}`);
				} else {
					status.status = 'failed';
					status.error = `Container exited with code: ${data.StatusCode}`;
					this.logger.error(`Container failed: ${containerId}, exit code: ${data.StatusCode}`);
					
					// Get immediate logs on failure
					try {
						const failureLogs = await this.getContainerLogs(containerId);
						this.logger.debug(`Container failure logs for ${containerId}:`);
						failureLogs.slice(-10).forEach((log, index) => {
							this.logger.debug(`  [${index + 1}] ${log.message}`);
						});
					} catch (logError) {
						this.logger.error(`Failed to get failure logs: ${logError.message}`);
					}
				}
				
				this.containers.set(containerId, status);
			}
		} catch (error) {
			this.logger.error(`Error monitoring container: ${containerId}`, error);
		}
	}

	private async handleContainerTimeout(containerId: string): Promise<void> {
		const status = this.containers.get(containerId);
		if (status && (status.status === 'running' || status.status === 'created')) {
			this.logger.warn(`Container timeout: ${containerId}`);
			
			status.status = 'timeout';
			status.error = 'Container execution timed out';
			status.finishedAt = new Date();
			this.containers.set(containerId, status);

			try {
				await this.stopContainer(containerId);
			} catch (error) {
				this.logger.error(`Failed to stop timed out container: ${containerId}`, error);
			}
		}
	}

	private async streamContainerLogs(containerId: string): Promise<void> {
		try {
			const container = this.docker.getContainer(containerId);
			
			this.logger.log(`Starting log stream for container: ${containerId}`);
			
			const stream = await container.logs({
				stdout: true,
				stderr: true,
				follow: true,
				timestamps: true,
				since: Math.floor(Date.now() / 1000)
			});

			stream.on('data', (chunk) => {
				// Docker logs have an 8-byte header, remove it
				const logLine = chunk.toString().slice(8).trim();
				if (logLine) {
					this.logger.debug(`[CONTAINER ${containerId.slice(0, 12)}] ${logLine}`);
					
					// Check if this is the completion message
					if (logLine.includes('GitHub repository cloning pipeline completed successfully!')) {
						this.logger.log(`Container script completed successfully: ${containerId}`);
					}
				}
			});

			stream.on('end', () => {
				this.logger.log(`Log stream ended for container: ${containerId}`);
			});

			stream.on('error', (error) => {
				this.logger.error(`Log stream error for container ${containerId}: ${error.message}`);
			});

		} catch (error) {
			this.logger.error(`Failed to start log stream for container ${containerId}: ${error.message}`);
		}
	}

	private async waitForCompletion(containerId: string): Promise<{ success: boolean; repositoryInfo?: RepositoryCloneInfo; error?: string }> {
		return new Promise((resolve) => {
			const checkStatus = async () => {
				const status = this.containers.get(containerId);
				if (!status) {
					resolve({ success: false, error: 'Container status not found' });
					return;
				}

				if (status.status === 'completed') {
					// Parse repository info from logs if available
					const repositoryInfo = await this.parseRepositoryInfoFromLogs(containerId);
					resolve({ success: true, repositoryInfo });
				} else if (status.status === 'failed' || status.status === 'timeout') {
					resolve({ success: false, error: status.error });
				} else {
					// Still running, check again in 2 seconds
					setTimeout(checkStatus, 2000);
				}
			};

			checkStatus();
		});
	}

	private async parseRepositoryInfoFromLogs(containerId: string): Promise<RepositoryCloneInfo | undefined> {
		try {
			const logs = await this.getContainerLogs(containerId);
			const repositoryInfo: Partial<RepositoryCloneInfo> = {};

			for (const log of logs) {
				if (log.message.includes('Repository size:')) {
					const sizeMatch = log.message.match(/Repository size: ([^,]+)/);
					if (sizeMatch) repositoryInfo.size = sizeMatch[1].trim();
				}
				
				if (log.message.includes('Files:')) {
					const fileMatch = log.message.match(/Files: (\d+)/);
					if (fileMatch) repositoryInfo.fileCount = parseInt(fileMatch[1]);
				}

				if (log.message.includes('Current branch:')) {
					const branchMatch = log.message.match(/Current branch: (.+)/);
					if (branchMatch) repositoryInfo.currentBranch = branchMatch[1].trim();
				}

				if (log.message.includes('Latest commit:')) {
					const commitMatch = log.message.match(/Latest commit: (.+)/);
					if (commitMatch) repositoryInfo.latestCommit = commitMatch[1].trim();
				}

				if (log.message.includes('Commit message:')) {
					const messageMatch = log.message.match(/Commit message: (.+)/);
					if (messageMatch) repositoryInfo.commitMessage = messageMatch[1].trim();
				}
			}

			// Only return if we have some repository info
			if (Object.keys(repositoryInfo).length > 0) {
				return {
					fullName: this.containers.get(containerId)?.repositoryFullName || '',
					size: repositoryInfo.size || 'Unknown',
					fileCount: repositoryInfo.fileCount || 0,
					currentBranch: repositoryInfo.currentBranch || 'Unknown',
					latestCommit: repositoryInfo.latestCommit || 'Unknown',
					commitMessage: repositoryInfo.commitMessage || 'Unknown'
				};
			}
		} catch (error) {
			this.logger.warn(`Failed to parse repository info from logs: ${containerId}`, error);
		}

		return undefined;
	}

	async isDockerAvailable(): Promise<boolean> {
		try {
			await this.docker.ping();
			return true;
		} catch (error) {
			this.logger.error('Docker is not available', error);
			return false;
		}
	}

	async buildClaudeRunnerImage(): Promise<void> {
		this.logger.log('Building Claude Runner Docker image...');
		
		try {
			const stream = await this.docker.buildImage(
				{
					context: process.cwd(),
					src: ['docker/Dockerfile.claude-runner', 'docker/scripts/']
				},
				{
					t: 'claude-runner:latest',
					dockerfile: 'docker/Dockerfile.claude-runner'
				}
			);

			// Follow the build stream
			await new Promise<void>((resolve, reject) => {
				this.docker.modem.followProgress(stream, (err, res) => {
					if (err) {
						reject(err);
					} else {
						this.logger.log('Claude Runner image built successfully');
						resolve();
					}
				}, (event) => {
					if (event.stream) {
						this.logger.log(`Build: ${event.stream.trim()}`);
					}
				});
			});
		} catch (error) {
			this.logger.error('Failed to build Claude Runner image', error);
			throw error;
		}
	}
}