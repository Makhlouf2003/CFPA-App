import pool from "../config/db.js";

const ROLES = ["stagiaire", "enseignant", "admin"]; // Assuming these are the fixed roles

const checkDuplicateNomOrEmail = async (req, res, next) => {
  try {
    // Check for duplicate nom
    const [userByNom] = await pool.execute(
      "SELECT id FROM utilisateurs WHERE nom = ?",
      [req.body.nom]
    );
    if (userByNom.length > 0) {
      return res
        .status(400)
        .json({ message: "Failed! Username is already in use!" });
    }

    // Check for duplicate email
    const [userByEmail] = await pool.execute(
      "SELECT id FROM utilisateurs WHERE email = ?",
      [req.body.email]
    );
    if (userByEmail.length > 0) {
      return res
        .status(400)
        .json({ message: "Failed! Email is already in use!" });
    }

    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const checkRolesExisted = (req, res, next) => {
  if (req.body.roles) {
    const invalidRoles = req.body.roles.filter((role) => !ROLES.includes(role));
    if (invalidRoles.length > 0) {
      return res.status(400).json({
        message: `Failed! Roles [${invalidRoles.join(", ")}] do not exist!`,
      });
    }
  }
  next();
};

const verifySignUp = {
  checkDuplicateNomOrEmail,
  checkRolesExisted,
};

export default verifySignUp;
