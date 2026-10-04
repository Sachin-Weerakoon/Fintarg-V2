import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { HttpError } from './errors';
import { readAccessToken } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string };
    }
  }
}

export const requireAuth: RequestHandler = (request, _response, next) => {
  const cookieToken = request.cookies?.[env.COOKIE_NAME] as string | undefined;
  const bearer = request.header('authorization')?.replace(/^Bearer\s+/i, '');
  const token = cookieToken || bearer;
  if (!token) return next(new HttpError(401, 'Authentication required'));

  try {
    request.auth = readAccessToken(token);
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired session'));
  }
};

const businessRecordKinds = new Set(['companies', 'businessBranches', 'ownerDraws', 'agreements']);

export const requireBusinessPlan: RequestHandler = asyncHandler(async (request, _response, next) => {
  if (!businessRecordKinds.has(request.params.kind)) return next();
  const user = await UserModel.findById(request.auth?.userId).select('plan');
  if (!user || user.plan !== 'business') return next(new HttpError(403, 'This feature requires the Business edition'));
  next();
});