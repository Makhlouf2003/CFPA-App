import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import config from "../config/auth.config.js";
import pool from "../config/db.js";

export const signup = async (req, res) => {
  try {
    const { nom, email, mot_de_passe, roles } = req.body;

    // Check for required fields
    if (!nom || !email || !mot_de_passe) {
      return res.status(400).json({
        message: "Content can not be empty! Please provide nom, email, and mot_de_passe.",
      });
    }

    const hashedPassword = await bcrypt.hash(mot_de_passe, 8);

    const [result] = await pool.execute(
      "INSERT INTO utilisateurs (nom, email, mot_de_passe, informations_supplementaires, cree_a, mis_a_jour_a) VALUES (?, ?, ?, ?, NOW(), NOW())",
      [nom, email, hashedPassword, req.body.informations_supplementaires]
    );
    const utilisateurId = result.insertId;

    if (roles && roles.length > 0) {
      for (const roleName of roles) {
        const [roleRows] = await pool.execute(
          "SELECT id FROM roles WHERE nom = ?",
          [roleName]
        );
        if (roleRows.length > 0) {
          const roleId = roleRows[0].id;
          await pool.execute(
            "INSERT INTO utilisateur_roles (utilisateurId, roleId, informations_supplementaires, cree_a, mis_a_jour_a) VALUES (?, ?, ?, NOW(), NOW())",
            [utilisateurId, roleId, req.body.informations_supplementaires]
          );
        }
      }
    } else {
      const [defaultRoleRows] = await pool.execute(
        "SELECT id FROM roles WHERE nom = ?",
        ["stagiaire"]
      );
      if (defaultRoleRows.length > 0) {
        const defaultRoleId = defaultRoleRows[0].id;
        await pool.execute(
          "INSERT INTO utilisateur_roles (utilisateurId, roleId, informations_supplementaires, cree_a, mis_a_jour_a) VALUES (?, ?, ?, NOW(), NOW())",
          [utilisateurId, defaultRoleId, req.body.informations_supplementaires]
        );
      }
    }

    res.status(201).json({ message: "User was registered successfully!" });
  } catch (err) {
    res.status(500).json({ message: err.message, body: req.body });
  }
};

export const signin = async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    const [rows] = await pool.execute(
      `SELECT
        u.id,
        u.nom,
        u.email,
        u.mot_de_passe,
        GROUP_CONCAT(r.nom SEPARATOR ', ') AS roles
      FROM
        utilisateurs u
      LEFT JOIN
        utilisateur_roles ur ON u.id = ur.utilisateurId
      LEFT JOIN
        roles r ON ur.roleId = r.id
      WHERE
        u.email = ?
      GROUP BY
        u.id`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found!" });
    }

    const user = rows[0];

    const passwordIsValid = bcrypt.compareSync(mot_de_passe, user.mot_de_passe);

    if (!passwordIsValid) {
      return res
        .status(401)
        .json({ accessToken: null, message: "Invalid Password!" });
    }

    const token = jwt.sign({ id: user.id }, config.secret, {
      expiresIn: 86400, // 24 hours
    });

    const authorities = user.roles
      ? user.roles
          .split(", ")
          .map((roleName) => "ROLE_" + roleName.toUpperCase())
      : [];

    res.status(200).json({
      id: user.id,
      nom: user.nom,
      email: user.email,
      roles: authorities,
      accessToken: token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
