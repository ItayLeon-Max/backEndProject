import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "config";

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Access token missing" });
    return;
  }

  const secret = config.get<string>("app.jwtSecret"); 

  jwt.verify(token, secret, (err, decoded) => {
    if (err || !decoded) {
      res.status(403).json({ message: "Invalid or expired token" });
      return;
    }

    (req as AuthenticatedRequest).user = decoded;
    next();
  });
};