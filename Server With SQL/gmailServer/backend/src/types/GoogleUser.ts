export interface GoogleUser {
    googleId: string;
    name: string;
    email?: string;
    accessToken: string;
    refreshToken: string;
  }