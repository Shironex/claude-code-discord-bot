import { UserSession } from '../models/session.interface';

export interface ISessionService {
	createSession(userId: string): void;
	getSession(userId: string): UserSession | null;
	updateSession(userId: string, updates: Partial<UserSession>): void;
	deleteSession(userId: string): void;
	hasSession(userId: string): boolean;
}
