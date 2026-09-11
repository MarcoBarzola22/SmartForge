import { type Request, type Response, type NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.') || 'body',
          message: err.message
        }));

        res.status(400).json({
          error: 'Los datos enviados no son válidos.',
          code: 'VALIDATION_ERROR',
          details
        });
        return;
      }
      next(error);
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.') || 'query',
          message: err.message
        }));

        res.status(400).json({
          error: 'Los parámetros de consulta no son válidos.',
          code: 'VALIDATION_ERROR',
          details
        });
        return;
      }
      next(error);
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.') || 'params',
          message: err.message
        }));

        res.status(400).json({
          error: 'Los parámetros de ruta no son válidos.',
          code: 'VALIDATION_ERROR',
          details
        });
        return;
      }
      next(error);
    }
  };
}
