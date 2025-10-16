import express from "express";
import * as utilisateurGroupesController from "../controllers/utilisateur_groupes.controller.js";
import { authJwt } from "../middlewares/index.js";

const router = express.Router();

// Routes
router.post("/", [authJwt.verifyToken, authJwt.isAdmin], utilisateurGroupesController.createAssociation);
router.get("/", [authJwt.verifyToken], utilisateurGroupesController.getAllAssociations);
router.get("/user/:userId", [authJwt.verifyToken], utilisateurGroupesController.getAssociationsByUserId);
router.get("/group/:groupId", [authJwt.verifyToken], utilisateurGroupesController.getAssociationsByGroupId);
router.delete("/:id", [authJwt.verifyToken, authJwt.isAdmin], utilisateurGroupesController.deleteAssociation);
router.delete("/user/:userId/group/:groupId", [authJwt.verifyToken, authJwt.isAdmin], utilisateurGroupesController.deleteAssociationByUserAndGroup);

export default router;
