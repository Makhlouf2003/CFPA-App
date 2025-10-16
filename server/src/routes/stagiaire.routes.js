import { authJwt } from "../middlewares/index.js";
import * as controller from "../controllers/stagiaire.controller.js";
import express from "express";

const router = express.Router();

router.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Headers",
    "x-access-token, Origin, Content-Type, Accept"
  );
  next();
});

router.get("/:id/cours", [authJwt.verifyToken], controller.getCours);

router.get("/:id/horaires", [authJwt.verifyToken], controller.getHoraires);

router.get(
  "/:id/releve-notes",
  [authJwt.verifyToken],
  controller.getReleveNotes
);

export default router;
