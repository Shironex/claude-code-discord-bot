/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
  requestId: string;
}

/**
 * Pagination options for list operations
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Rate limiting types
 */
export type RateLimitAction = 'upload' | 'batch_upload' | 'delete';

export interface RateLimitResult {
  allowed: boolean;
  remainingQuota: number;
  resetTime: Date;
  reason?: string;
}

export interface RateLimitStatus {
  userId: string;
  currentUsage: number;
  maxQuota: number;
  resetTime: Date;
  actions: Record<RateLimitAction, number>;
}

/**
 * Authentication context
 */
export interface AuthContext {
  source: 'discord-bot' | 'claude-code';
  userId?: string;
  permissions: string[];
  timestamp: Date;
}

/**
 * API key configuration
 */
export interface AuthConfig {
  hasDiscordBotKey: boolean;
  hasClaudeCodeKey: boolean;
  hasHmacSecret: boolean;
  requireHmac: boolean;
}

/**
 * Delete operation response
 */
export interface DeleteResponse {
  success: boolean;
  message: string;
  id?: string;
}