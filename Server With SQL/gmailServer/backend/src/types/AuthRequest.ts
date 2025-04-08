import { Request } from 'express';

export interface GoogleUser {
  googleId: string;
  name: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export interface AuthRequest extends Request {
  user?: GoogleUser;
}