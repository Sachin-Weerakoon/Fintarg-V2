import express, { Router } from 'express';
import { downloadFile, uploadFile } from '../controllers/fileController';
import { requireAuth } from '../middleware/auth';

export const fileRoutes = Router();

fileRoutes.post('/', requireAuth, express.raw({ type: '*/*', limit: '10mb' }), uploadFile);
fileRoutes.get('/:id', requireAuth, downloadFile);