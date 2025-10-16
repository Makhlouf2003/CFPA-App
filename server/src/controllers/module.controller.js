import pool from "../config/db.js";

export const createModule = async (req, res) => {
  try {
    const [result] = await pool.execute(
      "INSERT INTO modules (nom, informations_supplementaires, cree_a, mis_a_jour_a) VALUES (?, ?, NOW(), NOW())",
      [req.body.nom, req.body.informations_supplementaires]
    );

    res.status(201).send({ id: result.insertId, nom: req.body.nom });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

export const getAllModules = async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM modules");
    res.status(200).send(rows);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

export const assignModuleToEnseignantAndGroupe = async (req, res) => {
  try {
    const { enseignantId, moduleId, groupeId } = req.body;

    const [userRows] = await pool.execute(
      `SELECT u.id, r.nom as roleName
       FROM utilisateurs u
       JOIN utilisateur_roles ur ON u.id = ur.utilisateurId
       JOIN roles r ON ur.roleId = r.id
       WHERE u.id = ?`,
      [enseignantId]
    );

    if (userRows.length === 0) {
      return res.status(404).send({ message: "User not found" });
    }

    const hasEnseignantRole = userRows.some((row) => row.roleName === "enseignant");
    if (!hasEnseignantRole) {
      return res
        .status(403)
        .send({ message: "User does not have the 'enseignant' role" });
    }

    const [moduleRows] = await pool.execute("SELECT id FROM modules WHERE id = ?", [moduleId]);
    if (moduleRows.length === 0) {
      return res.status(404).send({ message: "Module not found" });
    }

    const [groupeRows] = await pool.execute("SELECT id FROM groupes WHERE id = ?", [groupeId]);
    if (groupeRows.length === 0) {
      return res.status(404).send({ message: "Groupe not found" });
    }

    const [existingAssignment] = await pool.execute(
      "SELECT * FROM utilisateur_modules WHERE enseignantId = ? AND moduleId = ? AND groupeId = ?",
      [enseignantId, moduleId, groupeId]
    );

    if (existingAssignment.length > 0) {
      return res.status(400).send({
        message:
          "This module is already assigned to this teacher in this group.",
        data: existingAssignment[0],
      });
    }

    const [result] = await pool.execute(
      "INSERT INTO utilisateur_modules (enseignantId, moduleId, groupeId, informations_supplementaires, cree_a, mis_a_jour_a) VALUES (?, ?, ?, ?, NOW(), NOW())",
      [enseignantId, moduleId, groupeId, req.body.informations_supplementaires]
    );

    res.status(200).send({
      message: "Module assigned successfully to group",
      data: { id: result.insertId, enseignantId, moduleId, groupeId },
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

export const getEnseignantModules = async (req, res) => {
  try {
    const { enseignantId } = req.params;

    const [userRows] = await pool.execute("SELECT id FROM utilisateurs WHERE id = ?", [enseignantId]);
    if (userRows.length === 0) {
      return res.status(404).send({ message: "User not found" });
    }

    const [rows] = await pool.execute(
      `SELECT
        m.id,
        m.nom,
        g.id as groupeId,
        g.nom as groupeNom
      FROM
        modules m
      JOIN
        utilisateur_modules um ON m.id = um.moduleId
      JOIN
        groupes g ON um.groupeId = g.id
      WHERE
        um.enseignantId = ?`,
      [enseignantId]
    );

    res.status(200).send(rows);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

export const updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, informations_supplementaires } = req.body;

    const [result] = await pool.execute(
      "UPDATE modules SET nom = ?, informations_supplementaires = ?, mis_a_jour_a = NOW() WHERE id = ?",
      [nom, informations_supplementaires, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).send({ message: "Module not found" });
    }

    res.status(200).send({ message: "Module updated successfully" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

export const deleteModule = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute("DELETE FROM modules WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).send({ message: "Module not found" });
    }

    res.status(200).send({ message: "Module deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

