import { Repository, PaginatedRepositories } from '../services/github.service';

export interface UserSession {
	userId: string;
	repository: Repository | null;
	paginatedData: PaginatedRepositories | null;
	searchQuery: string | null;
	action: string | null;
	createdAt: Date;
}

export interface SessionManager {
	createSession(userId: string): void;
	getSession(userId: string): UserSession | null;
	updateSession(userId: string, updates: Partial<UserSession>): void;
	deleteSession(userId: string): void;
	hasSession(userId: string): boolean;
}