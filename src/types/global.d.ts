import { JwtDTO } from './auth.types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      MONGO_URI: string;
      JWT_SECRET: string;
    }
  }
  namespace Express {
    interface Request {
      user?: JwtPayload | JwtDTO;
    }
  }
}

export {};
