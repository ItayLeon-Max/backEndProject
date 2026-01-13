import type { Role } from "./role";
export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
        name?: string;
        [key: string]: unknown;
      };
    }
  }
}