import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AuthenticatedUser, UserRole } from '../types/index.js';
import { pool } from '../database/db.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    // Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // Check HTTP-only cookie
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.',
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // Verify user still exists in DB and get organization IDs
    const userRes = await pool.query(
      `SELECT u.id, u.email, u.role,
              d.id AS donor_id,
              n.id AS ngo_id
       FROM users u
       LEFT JOIN donors d ON d.user_id = u.id
       LEFT JOIN ngos n ON n.user_id = u.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (userRes.rowCount === 0) {
      res.status(401).json({
        success: false,
        error: 'User account not found or has been removed.',
      });
      return;
    }

    const row = userRes.rows[0];
    req.user = {
      id: row.id,
      email: row.email,
      role: row.role as UserRole,
      donorId: row.donor_id || undefined,
      ngoId: row.ngo_id || undefined,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: 'Session expired. Please log in again.',
      });
      return;
    }
    res.status(401).json({
      success: false,
      error: 'Invalid authentication token.',
    });
  }
}

export function authorizeRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Requires one of roles: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

