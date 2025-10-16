import pool from "../config/db.js";

export const createGroupe = async (req, res) => {
  try {
    const [result] = await pool.execute(
      "INSERT INTO groupes (nom, informations_supplementaires, cree_a, mis_a_jour_a) VALUES (?, ?, NOW(), NOW())",
      [req.body.nom, req.body.informations_supplementaires]
    );
    res.status(201).send({ id: result.insertId, nom: req.body.nom });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

export const getAllGroupes = async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM groupes");
    res.status(200).send(rows);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

export const assignStagiaireToGroupe = async (req, res) => {
  try {
    const { stagiaireId, groupeId } = req.body;

    const [groupeRows] = await pool.execute("SELECT id FROM groupes WHERE id = ?", [groupeId]);
    if (groupeRows.length === 0) {
      return res.status(404).send({ message: "Groupe not found" });
    }

    const [userRows] = await pool.execute(
      `SELECT u.id, r.nom as roleName
       FROM utilisateurs u
       JOIN utilisateur_roles ur ON u.id = ur.utilisateurId
       JOIN roles r ON ur.roleId = r.id
       WHERE u.id = ?`,
      [stagiaireId]
    );

    if (userRows.length === 0) {
      return res.status(404).send({ message: "User not found" });
    }

    const hasStagiaireRole = userRows.some((row) => row.roleName === "stagiaire");
    if (!hasStagiaireRole) {
      return res
        .status(403)
        .send({ message: "User does not have the 'stagiaire' role" });
    }

    // Check if already assigned
    const [existingAssignment] = await pool.execute(
      "SELECT * FROM utilisateur_groupes WHERE stagiaireId = ? AND groupeId = ?",
      [stagiaireId, groupeId]
    );

    if (existingAssignment.length > 0) {
      return res.status(409).send({ message: "Stagiaire already assigned to this groupe" });
    }

    await pool.execute(
      "INSERT INTO utilisateur_groupes (stagiaireId, groupeId, informations_supplementaires, cree_a, mis_a_jour_a) VALUES (?, ?, ?, NOW(), NOW())",
      [stagiaireId, groupeId, req.body.informations_supplementaires]
    );

    res
      .status(200)
      .send({ message: "Stagiaire assigned to groupe successfully" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// Modifier un groupe
export const updateGroupe = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, informations_supplementaires } = req.body;

    const [result] = await pool.execute(
      "UPDATE groupes SET nom = ?, informations_supplementaires = ?, mis_a_jour_a = NOW() WHERE id = ?",
      [nom, informations_supplementaires, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).send({ message: "Groupe non trouvé" });
    }

    res.status(200).send({ message: "Groupe mis à jour avec succès" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// Supprimer un groupe
export const deleteGroupe = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute("DELETE FROM groupes WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).send({ message: "Groupe non trouvé" });
    }

    res.status(200).send({ message: "Groupe supprimé avec succès" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
