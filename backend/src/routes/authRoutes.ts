import { Router } from 'express';
import { changePasswordController, currentUser, forgotPassword, login, logout, logoutAllController, register, resetPassword } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../validations/auth';

export const authRoutes = Router();

authRoutes.post('/register', validateBody(registerSchema), register);
authRoutes.post('/login', validateBody(loginSchema), login);
authRoutes.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword);
authRoutes.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);
authRoutes.get('/me', requireAuth, currentUser);
authRoutes.post('/logout', logout);
authRoutes.post('/change-password', requireAuth, validateBody(changePasswordSchema), changePasswordController);
authRoutes.post('/logout-all', requireAuth, logoutAllController);