import jwt from "jsonwebtoken";
import config from "../config/auth.config.js";
import pool from "../config/db.js";

const verifyToken = async (req, res, next) => {
  let token = req.headers["x-access-token"] || req.headers["authorization"];

  if (!token) {
    return res.status(403).json({ message: "No token provided!" });
  }

  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }

  try {
    const decoded = jwt.verify(token, config.secret);
    req.userId = decoded.id;
    const [userRows] = await pool.execute(
      `SELECT
        u.id,
        u.nom,
        u.email,
        GROUP_CONCAT(r.nom SEPARATOR ',') AS roles
      FROM
        utilisateurs u
      LEFT JOIN
        utilisateur_roles ur ON u.id = ur.utilisateurId
      LEFT JOIN
        roles r ON ur.roleId = r.id
      WHERE
        u.id = ?
      GROUP BY
        u.id`,
      [req.userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found!" });
    }

    const user = userRows[0];
    user.roles = user.roles ? user.roles.split(",") : [];

    if (user.roles && user.roles.length > 0) {
      user.role = user.roles[0];
    } else {
      user.role = null;
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized!" });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.roles || !req.user.roles.includes("admin")) {
      return res.status(403).json({ message: "Require Admin Role!" });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const isEnseignant = async (req, res, next) => {
  try {
    if (
      !req.user ||
      !req.user.roles ||
      !req.user.roles.includes("enseignant")
    ) {
      return res.status(403).json({ message: "Require Enseignant Role!" });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const authJwt = {
  verifyToken,
  isAdmin,
  isEnseignant,
};

export default authJwt;
