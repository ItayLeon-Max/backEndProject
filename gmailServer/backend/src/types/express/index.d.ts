// types/express/index.d.ts
import { User } from '../../models/user';

declare global {
  namespace Express {
    interface Request {
      user?: Partial<User>;
    }
  }
}

export {};