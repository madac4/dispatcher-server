import { Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  settingsId: string;
  comparePassword(password: string): Promise<boolean>;
  signAccessToken(): string;
  signRefreshToken(): string;
}

export type RegisterRequest = {
  email: string;
  password: string;
  role?: UserRole;
  //   inviteCode: string
};

export type LoginRequest = {
  email: string;
  password: string;
};

export enum UserRole {
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  USER = 'user',
}

export type ForgotPasswordRequest = {
  email: string;
};

export interface RefreshTokenRequest {
  refreshToken: string;
}

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export type JwtDTO = {
  id: string;
  userId: string;
  role: UserRole;
  email: string;
};
