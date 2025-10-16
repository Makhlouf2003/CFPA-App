import { Router } from 'express';
import { authJwt } from "../middlewares/index.js";
import {
  createModule,
  getAllModules,
  assignModuleToEnseignantAndGroupe,
  getEnseignantModules,
  updateModule,
  deleteModule,
} from "../controllers/module.controller.js";

const router = Router();

router.post(
  "/",
  [authJwt.verifyToken, authJwt.isAdmin],
  createModule
);
router.get("/", [authJwt.verifyToken], getAllModules);
router.post(
  "/assign",
  [authJwt.verifyToken, authJwt.isAdmin],
  assignModuleToEnseignantAndGroupe
);
router.get(
  "/enseignant/:enseignantId",
  [authJwt.verifyToken],
  getEnseignantModules
);
router.put(
  "/:id",
  [authJwt.verifyToken, authJwt.isAdmin],
  updateModule
);

router.delete(
  "/:id",
  [authJwt.verifyToken, authJwt.isAdmin],
  deleteModule
);

export default router;
