import { Router } from 'express';
import { contribute, create, createTransfer, getLoanPayoff, list, payFinancePayment, payPawnInterest, remove, repayLoan, transactionHistory, undoContribution, undoFinancePayment, undoLoanRepayment, undoPawnPayment, undoTransfer, update } from '../controllers/recordController';
import { requireAuth, requireBusinessPlan } from '../middleware/auth';

export const recordRoutes = Router();

recordRoutes.use(requireAuth);
recordRoutes.get('/transactions/history', transactionHistory);
recordRoutes.post('/transfers', createTransfer);
recordRoutes.delete('/transfers/:transferGroupId', undoTransfer);
recordRoutes.use('/:kind', requireBusinessPlan);
recordRoutes.post('/goals/:id/contributions', contribute);
recordRoutes.delete('/goals/:id/contributions/:contributionId', undoContribution);
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