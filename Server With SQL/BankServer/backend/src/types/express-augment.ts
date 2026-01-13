import "express";

export type UserPayload = {
  id: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
};

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}