import { Router } from 'express';
import { maintenance, reminders } from '../controllers/cronController';

export const cronRoutes = Router();

cronRoutes.get('/maintenance', maintenance);
cronRoutes.get('/reminders', reminders);