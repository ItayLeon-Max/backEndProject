import { GoogleUser } from '../GoogleUser'; 

declare global {
  namespace Express {
    interface User extends GoogleUser {}
  }
}