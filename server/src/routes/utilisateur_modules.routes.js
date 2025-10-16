import express from "express";
import * as utilisateurModulesController from "../controllers/utilisateur_modules.controller.js";
import { authJwt } from "../middlewares/index.js";

const router = express.Router();


router.post('/', [authJwt.verifyToken, authJwt.isAdmin], utilisateurModulesController.createAssociation);
router.get('/', [authJwt.verifyToken], utilisateurModulesController.getAllAssociations);
router.get('/teacher/:teacherId', [authJwt.verifyToken], utilisateurModulesController.getAssociationsByTeacherId);
router.get('/module/:moduleId', [authJwt.verifyToken], utilisateurModulesController.getAssociationsByModuleId);
router.get('/group/:groupId', [authJwt.verifyToken], utilisateurModulesController.getAssociationsByGroupId);
router.get('/teacher/:teacherId/groups', [authJwt.verifyToken], utilisateurModulesController.getGroupsByTeacherId);
router.delete('/:id', [authJwt.verifyToken, authJwt.isAdmin], utilisateurModulesController.deleteAssociation);
router.delete('/teacher/:teacherId/module/:moduleId/group/:groupId', [authJwt.verifyToken, authJwt.isAdmin], utilisateurModulesController.deleteAssociationByTeacherModuleGroup);
router.get('/students/:moduleId',[authJwt.verifyToken],utilisateurModulesController.getStudentsByModuleId);

export default router;