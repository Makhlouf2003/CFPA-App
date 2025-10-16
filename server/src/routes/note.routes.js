import { Router } from 'express';
import * as controller from '../controllers/note.controller.js';
import { authJwt } from '../middlewares/index.js';

const router = Router();

// Assign a note (only teachers allowed)
router.post('/', [authJwt.verifyToken, authJwt.isEnseignant], controller.assignNote);

// Get notes for a student
router.get('/stagiaire/:stagiaireId', [authJwt.verifyToken], controller.getNotesByStagiaire);

// Get notes for a module
router.get('/module/:moduleId', [authJwt.verifyToken], controller.getNotesByModule);

// Update a note (only teachers allowed)
router.put('/:id', [authJwt.verifyToken, authJwt.isEnseignant], controller.updateNote);

// Delete a note (only teachers allowed)
router.delete('/:id', [authJwt.verifyToken, authJwt.isEnseignant], controller.deleteNote);

export default router;