import { Router } from 'express';
import { exportUserData, getPersonalBudget, setPersonalBudget, updateProfile } from '../controllers/profileController';
import { requireAuth } from '../middleware/auth';

export const profileRoutes = Router();

profileRoutes.use(requireAuth);
profileRoutes.patch('/', updateProfile);
profileRoutes.get('/export', exportUserData);
profileRoutes.get('/personal-budget', getPersonalBudget);
profileRoutes.put('/personal-budget', setPersonalBudget);