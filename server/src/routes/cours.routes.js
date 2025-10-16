
import express from "express";
import { uploadCours, getCoursByModule, deleteCours, addFileToCours, deleteCoursFile } from "../controllers/cours.controller.js";
import { authJwt } from "../middlewares/index.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", [authJwt.verifyToken, authJwt.isEnseignant, upload.single('fichier')], uploadCours);
router.get("/module/:moduleId", [authJwt.verifyToken], getCoursByModule);
router.delete("/:id", [authJwt.verifyToken, authJwt.isEnseignant], deleteCours);
router.post("/:coursId/files", [authJwt.verifyToken, authJwt.isEnseignant, upload.single('fichier')], addFileToCours);
router.delete("/files/:fileId", [authJwt.verifyToken, authJwt.isEnseignant], deleteCoursFile);

export default router;
