import { Router } from 'express';
import { getPersonalBudget, setPersonalBudget, updateProfile } from '../controllers/profileController';
import { requireAuth } from '../middleware/auth';

export const profileRoutes = Router();

profileRoutes.use(requireAuth);
profileRoutes.patch('/', updateProfile);
profileRoutes.get('/personal-budget', getPersonalBudget);
profileRoutes.put('/personal-budget', setPersonalBudget);