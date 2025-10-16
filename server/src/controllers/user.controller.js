import pool from "../config/db.js";

export const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
        u.id,
        u.nom,
        u.email,
        GROUP_CONCAT(r.nom SEPARATOR ', ') AS roles
      FROM
        utilisateurs u
      LEFT JOIN
        utilisateur_roles ur ON u.id = ur.utilisateurId
      LEFT JOIN
        roles r ON ur.roleId = r.id
      GROUP BY
        u.id`
    );
    const users = rows.map(row => ({
      id: row.id,
      nom: row.nom,
      email: row.email,
      roles: row.roles ? row.roles.split(', ').map(nom => ({ nom })) : []
    }));
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
        u.id,
        u.nom,
        u.email,
        GROUP_CONCAT(r.nom SEPARATOR ', ') AS roles
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
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = {
      id: rows[0].id,
      nom: rows[0].nom,
      email: rows[0].email,
      roles: rows[0].roles ? rows[0].roles.split(', ').map(nom => ({ nom })) : []
    };

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { nom, email, roles } = req.body;
    const utilisateurId = req.params.id;

    // Check if user exists
    const [userRows] = await pool.execute("SELECT id FROM utilisateurs WHERE id = ?", [utilisateurId]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user details
    await pool.execute(
      "UPDATE utilisateurs SET nom = ?, email = ?, informations_supplementaires = ? WHERE id = ?",
      [nom, email, req.body.informations_supplementaires, utilisateurId]
    );

    // Update user roles
    if (roles) {
      // Delete existing roles for the user
      await pool.execute("DELETE FROM utilisateur_roles WHERE utilisateurId = ?", [utilisateurId]);

      // Insert new roles
      for (const roleName of roles) {
        const [roleRows] = await pool.execute("SELECT id FROM roles WHERE nom = ?", [roleName]);
        if (roleRows.length > 0) {
          const roleId = roleRows[0].id;
          await pool.execute("INSERT INTO utilisateur_roles (utilisateurId, roleId, informations_supplementaires) VALUES (?, ?, ?)", [utilisateurId, roleId, req.body.informations_supplementaires]);
        }
      }
    }

    res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const utilisateurId = req.params.id;
    const [userRows] = await pool.execute("SELECT id FROM utilisateurs WHERE id = ?", [utilisateurId]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    await pool.execute("DELETE FROM utilisateurs WHERE id = ?", [utilisateurId]);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
