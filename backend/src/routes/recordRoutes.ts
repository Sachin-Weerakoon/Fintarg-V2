import { Router } from 'express';
import { contribute, create, getLoanPayoff, list, payFinancePayment, payPawnInterest, remove, repayLoan, transactionHistory, undoFinancePayment, undoLoanRepayment, undoPawnPayment, update } from '../controllers/recordController';
import { requireAuth, requireBusinessPlan } from '../middleware/auth';

export const recordRoutes = Router();

recordRoutes.use(requireAuth);
recordRoutes.get('/transactions/history', transactionHistory);
recordRoutes.use('/:kind', requireBusinessPlan);
recordRoutes.post('/goals/:id/contributions', contribute);
recordRoutes.get('/loans/:id/payoff', getLoanPayoff);
recordRoutes.post('/loans/:id/repay', repayLoan);
recordRoutes.delete('/loans/:id/repayments/:repaymentId', undoLoanRepayment);
recordRoutes.post('/pawnedItems/:id/payment', payPawnInterest);
recordRoutes.delete('/pawnedItems/:id/payments/:paymentId', undoPawnPayment);
recordRoutes.post('/financePayments/:id/pay', payFinancePayment);
recordRoutes.delete('/financePayments/:id/payments/:paymentId', undoFinancePayment);
recordRoutes.get('/:kind', list);
recordRoutes.post('/:kind', create);
recordRoutes.patch('/:kind/:id', update);
recordRoutes.delete('/:kind/:id', remove);