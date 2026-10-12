import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { HttpError } from './errors';
import { readAccessToken, type JwtPayload } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
      userRecord?: { _id: any; tokenVersion: number; plan: 'basic' | 'business' };
    }
  }
}

export const requireAuth: RequestHandler = asyncHandler(async (request, _response, next) => {
  const cookieToken = request.cookies?.[env.COOKIE_NAME] as string | undefined;
  const bearer = request.header('authorization')?.replace(/^Bearer\s+/i, '');
  const token = cookieToken || bearer;
  if (!token) return next(new HttpError(401, 'Authentication required'));

  let payload: JwtPayload;
  try {
    payload = readAccessToken(token);
  } catch {
    return next(new HttpError(401, 'Invalid or expired session'));
  }

  const user = await UserModel.findById(payload.userId).select('tokenVersion plan').lean();
  if (!user) return next(new HttpError(401, 'Account no longer exists'));

  const userTokenVersion = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0;
  if (payload.tokenVersion !== userTokenVersion) {
    return next(new HttpError(401, 'Session revoked. Please sign in again.'));
  }

  request.auth = payload;
  request.userRecord = user as any;
  next();
});

const businessRecordKinds = new Set(['companies', 'businessBranches', 'ownerDraws', 'agreements']);

export const requireBusinessPlan: RequestHandler = asyncHandler(async (request, _response, next) => {
  if (!businessRecordKinds.has(request.params.kind)) return next();
  const user = request.userRecord || (await UserModel.findById(request.auth?.userId).select('plan').lean());
  if (!user || user.plan !== 'business') return next(new HttpError(403, 'This feature requires the Business edition'));
  next();
});