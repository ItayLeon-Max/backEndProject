import { Request } from 'express';
import { Profile } from 'passport-google-oauth20';

export interface AuthRequest extends Request {
  user: Profile;
}