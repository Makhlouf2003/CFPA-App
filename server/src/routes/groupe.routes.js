import { Router } from 'express';
import * as controller from '../controllers/groupe.controller.js';
import { authJwt } from '../middlewares/index.js';

const router = Router();

router.post('/', [authJwt.verifyToken, authJwt.isAdmin], controller.createGroupe);
router.get('/', controller.getAllGroupes);
router.post('/assigner-stagiaire', controller.assignStagiaireToGroupe);
router.put('/:id', [authJwt.verifyToken, authJwt.isAdmin], controller.updateGroupe);
router.delete('/:id', [authJwt.verifyToken, authJwt.isAdmin], controller.deleteGroupe);

export default router;
