import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

export class AppError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode = 400, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If headers already sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || (err.status ? err.status : 500);

  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    res.status(409).json({
      success: false,
      error: 'Conflict: A resource with this key already exists.',
    });
    return;
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    res.status(400).json({
      success: false,
      error: 'Invalid reference: The referenced resource does not exist.',
    });
    return;
  }

  // PostgreSQL check constraint violation
  if (err.code === '23514') {
    res.status(400).json({
      success: false,
      error: 'Validation failed: Check constraint violation on data.',
    });
    return;
  }

  const responseMessage =
    statusCode >= 500 && config.nodeEnv === 'production'
      ? 'An internal server error occurred. Please try again later.'
      : err.message || 'An error occurred';

  if (statusCode >= 500) {
    console.error(`[Internal Error] ${req.method} ${req.url}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    error: responseMessage,
    ...(err.details && { details: err.details }),
  });
}
