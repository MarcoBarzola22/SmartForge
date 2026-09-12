import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  authenticate,
  signToken,
  type AuthenticatedAthlete
} from '../../src/middleware/auth.middleware.js';
import { UnauthorizedError } from '../../src/errors/app-error.js';

describe('TASK-20: Auth Middleware (backend/src/middleware/auth.middleware.ts)', () => {
  const TEST_SECRET = 'test-jwt-secret-for-smartforge-auth-testing-key';
  process.env.JWT_SECRET = TEST_SECRET;

  const mockAthlete: AuthenticatedAthlete = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'atleta@example.com',
    google_id: 'google_oauth_123456789',
    name: 'Juan Pérez'
  };

  it('should reject request without Authorization header with 401 UnauthorizedError', async () => {
    const req = { headers: {} } as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should reject request with malformed or non-Bearer authorization header', async () => {
    const res = {} as Response;
    const next1 = vi.fn() as unknown as NextFunction;
    const next2 = vi.fn() as unknown as NextFunction;

    const reqBasic = { headers: { authorization: 'Basic dXNlcjpwYXNz' } } as Request;
    authenticate(reqBasic, res, next1);
    expect(next1).toHaveBeenCalledWith(expect.any(UnauthorizedError));

    const reqEmptyBearer = { headers: { authorization: 'Bearer ' } } as Request;
    authenticate(reqEmptyBearer, res, next2);
    expect(next2).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should reject request with invalid or tampered JWT token', async () => {
    const req = { headers: { authorization: 'Bearer invalid.token.payload' } } as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should reject expired JWT token with 401 UnauthorizedError', async () => {
    const expiredToken = jwt.sign(
      {
        id: mockAthlete.id,
        email: mockAthlete.email,
        google_id: mockAthlete.google_id
      },
      TEST_SECRET,
      { expiresIn: '-1s' }
    );

    const req = { headers: { authorization: `Bearer ${expiredToken}` } } as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should authenticate valid JWT and attach athlete context to req.athlete', async () => {
    const validToken = signToken(mockAthlete);

    const req = { headers: { authorization: `Bearer ${validToken}` } } as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.athlete).toBeDefined();
    expect(req.athlete?.id).toBe(mockAthlete.id);
    expect(req.athlete?.email).toBe(mockAthlete.email);
    expect(req.athlete?.google_id).toBe(mockAthlete.google_id);
    expect(req.athlete?.name).toBe(mockAthlete.name);
  });
});
