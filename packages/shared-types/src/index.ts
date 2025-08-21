// Re-export all types and interfaces
export * from './image.types';
export * from './api.types';
export * from './health.types';
export * from './constants';

// Type utilities
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Utility type for API responses
export type SuccessResponse<T> = {
  success: true;
  data: T;
  error?: never;
  timestamp: Date;
  requestId: string;
};

export type ErrorResponse = {
  success: false;
  data?: never;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
  requestId: string;
};

export type ApiResult<T> = SuccessResponse<T> | ErrorResponse;