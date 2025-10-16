import { Router } from 'express';
import * as controller from '../controllers/notification.controller.js';
import { authJwt } from '../middlewares/index.js';

const router = Router();

router.post('/', [authJwt.verifyToken], controller.createNotification);
router.get('/:userId', [authJwt.verifyToken], controller.getNotificationsForUser);
router.put('/:id/lu', [authJwt.verifyToken], controller.markAsRead);
router.delete('/:id', [authJwt.verifyToken], controller.deleteNotification);

export default router;
