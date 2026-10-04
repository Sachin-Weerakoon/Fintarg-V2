import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { HttpError } from '../middleware/errors';
import { authenticateUser, getUserProfile, registerUser } from '../services/authService';
import { applyPasswordReset, requestPasswordReset } from '../services/passwordResetService';
import { createAccessToken } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';

function setSessionCookie(response: Parameters<RequestHandler>[1], userId: string) {
  response.cookie(env.COOKIE_NAME, createAccessToken(userId), {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export const register: RequestHandler = asyncHandler(async (request, response) => {
  const { user, profile } = await registerUser(request.body);
  setSessionCookie(response, user.id);
  response.status(201).json({ ok: true, user: { id: user.id, name: user.name, email: user.email, plan: user.plan, workMode: user.workMode, profile } });
});

export const login: RequestHandler = asyncHandler(async (request, response) => {
  const { user, profile } = await authenticateUser(request.body.email, request.body.password);
  setSessionCookie(response, user.id);
  response.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, plan: user.plan, workMode: user.workMode, profile } });
});

export const currentUser: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.auth) throw new HttpError(401, 'Authentication required');
  const result = await getUserProfile(request.auth.userId);
  response.json({
    userId: result.user._id.toString(),
    name: result.user.name,
    email: result.user.email,
    plan: result.user.plan,
    workMode: result.user.workMode,
    profile: result.profile,
  });
});

export const logout: RequestHandler = (_request, response) => {
  response.clearCookie(env.COOKIE_NAME, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  response.json({ ok: true });
};

export const forgotPassword: RequestHandler = asyncHandler(async (request, response) => {
  await requestPasswordReset(request.body.email);
  response.json({ ok: true });
});

export const resetPassword: RequestHandler = asyncHandler(async (request, response) => {
  await applyPasswordReset(request.body.token, request.body.newPassword);
  response.json({ ok: true });
});
