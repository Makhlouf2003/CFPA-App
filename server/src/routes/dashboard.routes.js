import { Router } from 'express';
import * as controller from '../controllers/dashboard.controller.js';
import { authJwt } from '../middlewares/index.js';

const router = Router();

router.get('/', [authJwt.verifyToken], controller.getDashboardData);

export default router;
