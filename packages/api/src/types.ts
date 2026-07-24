export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface ApiHandler {
  handle(request: ApiRequest): Promise<ApiResponse>;
}

export interface ApiRouter {
  get(path: string, handler: ApiHandler): void;
  post(path: string, handler: ApiHandler): void;
  put(path: string, handler: ApiHandler): void;
  delete(path: string, handler: ApiHandler): void;
  route(request: ApiRequest): Promise<ApiResponse>;
}