export interface ApiError {
  error: string;
  details?: { path: string; message: string }[];
}

export interface ApiListResponse<T> {
  data: T[];
}

export interface ApiRecordResponse<T> {
  data: T;
}

export interface SessionUser {
  userId: string;
  name: string;
  email: string;
  plan: 'basic' | 'business';
  workMode: 'salary' | 'business' | 'both';
  profile: Record<string, unknown> | null;
}