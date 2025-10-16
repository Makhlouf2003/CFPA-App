import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";
import { authJwt } from "../middlewares/index.js";

const router = express.Router();

router.get("/", [authJwt.verifyToken, authJwt.isAdmin], getAllUsers);

router.get("/:id", [authJwt.verifyToken, authJwt.isAdmin], getUserById);

router.put("/:id", [authJwt.verifyToken, authJwt.isAdmin], updateUser);

// router.put("/:id/validate", [authJwt.verifyToken, authJwt.isAdmin], validateUser);

router.delete("/:id", [authJwt.verifyToken, authJwt.isAdmin], deleteUser);

export default router;
