import express from "express";
import {
  createProfil,
  getProfil,
  getAllProfils,
  updateProfil,
  deleteProfil,
} from "../controllers/profil.controller.js";
import { authJwt } from "../middlewares/index.js";
import upload from "../middlewares/multer.config.js";

const router = express.Router();

router.post(
  "/:utilisateurId",
  [authJwt.verifyToken, upload.single("photo")],
  createProfil
);
router.get("/", [authJwt.verifyToken], getAllProfils);
router.get("/:utilisateurId", [authJwt.verifyToken], getProfil);
router.put(
  "/:utilisateurId",
  [authJwt.verifyToken, upload.single("photo")],
  updateProfil
);
router.delete("/:utilisateurId", [authJwt.verifyToken], deleteProfil);

export default router;
