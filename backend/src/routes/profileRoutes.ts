import { Router } from 'express';
import { setPersonalBudget, updateProfile } from '../controllers/profileController';
import { requireAuth } from '../middleware/auth';

export const profileRoutes = Router();

profileRoutes.use(requireAuth);
profileRoutes.patch('/', updateProfile);
profileRoutes.put('/personal-budget', setPersonalBudget);