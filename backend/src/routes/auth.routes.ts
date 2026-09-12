import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const authRoutes: Router = Router();

authRoutes.get('/google', authController.googleAuth);
authRoutes.get('/google/callback', authController.googleAuthCallback);
authRoutes.get('/me', authenticate, authController.me);
