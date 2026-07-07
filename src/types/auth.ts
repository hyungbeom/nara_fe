export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface LoginUser {
  userSeq: number;
  userId: string;
  userName: string;
}

export interface LoginRequest {
  userId: string;
  password: string;
}
