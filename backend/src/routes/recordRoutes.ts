import { Router } from 'express';
import { contribute, create, list, payPawnInterest, remove, repayLoan, transactionHistory, update } from '../controllers/recordController';
import { requireAuth, requireBusinessPlan } from '../middleware/auth';

export const recordRoutes = Router();

recordRoutes.use(requireAuth);
recordRoutes.get('/transactions/history', transactionHistory);
recordRoutes.use('/:kind', requireBusinessPlan);
recordRoutes.post('/goals/:id/contributions', contribute);
recordRoutes.post('/loans/:id/repay', repayLoan);
recordRoutes.post('/pawnedItems/:id/payment', payPawnInterest);
recordRoutes.get('/:kind', list);
recordRoutes.post('/:kind', create);
recordRoutes.patch('/:kind/:id', update);
recordRoutes.delete('/:kind/:id', remove);