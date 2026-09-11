import { type Request, type Response, type NextFunction, type ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code
    });
    return;
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.') || 'body',
      message: e.message
    }));

    res.status(400).json({
      error: 'Los datos enviados no son válidos.',
      code: 'VALIDATION_ERROR',
      details
    });
    return;
  }

  // Generic fallback for unhandled exceptions
  console.error('[Unhandled Error]', err);

  res.status(500).json({
    error: 'Error interno del servidor.',
    code: 'INTERNAL_SERVER_ERROR'
  });
};
