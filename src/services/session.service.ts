import { Injectable, Logger } from '@nestjs/common';
import { UserSession, SessionManager } from '../interfaces/session.interface';
import { Repository, PaginatedRepositories } from './github.service';
import { UserWorkflowRun } from '../interfaces/workflow.interface';

@Injectable()
export class SessionService implements SessionManager {
	private readonly logger = new Logger(SessionService.name);
	private readonly sessions = new Map<string, UserSession>();

	createSession(userId: string): void {
		const session: UserSession = {
			userId,
			repository: null,
			paginatedData: null,
			searchQuery: null,
			action: null,
			workflowRuns: [],
			createdAt: new Date()
		};

		this.sessions.set(userId, session);
		this.logger.log(`Created session for user ${userId}`);
	}

	getSession(userId: string): UserSession | null {
		return this.sessions.get(userId) || null;
	}

	updateSession(userId: string, updates: Partial<UserSession>): void {
		const session = this.sessions.get(userId);
		if (!session) {
			this.logger.warn(`Attempted to update non-existent session for user ${userId}`);
			return;
		}

		Object.assign(session, updates);
		this.sessions.set(userId, session);
		this.logger.debug(`Updated session for user ${userId}`, updates);
	}

	deleteSession(userId: string): void {
		const deleted = this.sessions.delete(userId);
		if (deleted) {
			this.logger.log(`Deleted session for user ${userId}`);
		}
	}

	hasSession(userId: string): boolean {
		return this.sessions.has(userId);
	}

	// Convenience methods for common operations
	setRepository(userId: string, repository: Repository): void {
		this.updateSession(userId, { repository });
	}

	setPaginatedData(userId: string, paginatedData: PaginatedRepositories): void {
		this.updateSession(userId, { paginatedData });
	}

	setSearchQuery(userId: string, searchQuery: string | null): void {
		this.updateSession(userId, { searchQuery });
	}

	setAction(userId: string, action: string): void {
		this.updateSession(userId, { action });
	}

	addWorkflowRun(userId: string, workflowRun: UserWorkflowRun): void {
		const session = this.getSession(userId);
		if (session) {
			const workflowRuns = session.workflowRuns || [];
			workflowRuns.push(workflowRun);
			this.updateSession(userId, { workflowRuns });
			this.logger.debug(`Added workflow run ${workflowRun.runId} for user ${userId}`);
		}
	}

	updateWorkflowRun(userId: string, runId: number, updates: Partial<UserWorkflowRun>): void {
		const session = this.getSession(userId);
		if (session && session.workflowRuns) {
			const workflowIndex = session.workflowRuns.findIndex(run => run.runId === runId);
			if (workflowIndex !== -1) {
				session.workflowRuns[workflowIndex] = { ...session.workflowRuns[workflowIndex], ...updates };
				this.updateSession(userId, { workflowRuns: session.workflowRuns });
				this.logger.debug(`Updated workflow run ${runId} for user ${userId}`);
			}
		}
	}

	getWorkflowRuns(userId: string): UserWorkflowRun[] {
		const session = this.getSession(userId);
		return session?.workflowRuns || [];
	}

	// Session cleanup methods
	getSessionAge(userId: string): number | null {
		const session = this.getSession(userId);
		if (!session) return null;

		return Date.now() - session.createdAt.getTime();
	}

	cleanupExpiredSessions(maxAgeMs: number = 30 * 60 * 1000): number {
		// Default: 30 minutes
		let cleanedCount = 0;
		const now = Date.now();

		for (const [userId, session] of this.sessions.entries()) {
			if (now - session.createdAt.getTime() > maxAgeMs) {
				this.deleteSession(userId);
				cleanedCount++;
			}
		}

		if (cleanedCount > 0) {
			this.logger.log(`Cleaned up ${cleanedCount} expired sessions`);
		}

		return cleanedCount;
	}

	getSessionCount(): number {
		return this.sessions.size;
	}
}
