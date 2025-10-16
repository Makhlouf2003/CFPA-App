import { Router } from "express";
import * as controller from "../controllers/horaire.controller.js";
import { authJwt } from "../middlewares/index.js";

const router = Router();

router.post("/", [authJwt.verifyToken, authJwt.isAdmin], controller.createHoraire);
router.get("/groupe/:groupeId", controller.getHoraireByGroupe);
router.get("/stagiaire/:stagiaireId", controller.getHoraireByStagiaire);
router.get("/:id", controller.getHoraireById);
router.put("/:id", [authJwt.verifyToken, authJwt.isAdmin], controller.updateHoraire);
router.delete(
  "/:id",
  [authJwt.verifyToken, authJwt.isAdmin],
  controller.deleteHoraire
);

export default router;
