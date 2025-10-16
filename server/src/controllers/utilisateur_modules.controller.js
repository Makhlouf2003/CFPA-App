import pool from "../config/db.js";

// Créer une association utilisateur-module-groupe (enseignant)
export const createAssociation = async (req, res) => {
  try {
    const { enseignantId, moduleId, groupeId, informations_supplementaires } = req.body;

    if (!enseignantId || !moduleId || !groupeId) {
      return res.status(400).json({
        message: "L'ID enseignant, l'ID module et l'ID groupe sont requis"
      });
    }

    // Vérifier si l'enseignant a le rôle "enseignant"
    const [enseignantRows] = await pool.execute(
      `SELECT u.id 
       FROM utilisateurs u
       JOIN utilisateur_roles ur ON u.id = ur.utilisateurId
       JOIN roles r ON ur.roleId = r.id
       WHERE u.id = ? AND r.nom = 'enseignant'`,
      [enseignantId]
    );
    if (enseignantRows.length === 0) {
      return res.status(404).json({ message: "Enseignant non trouvé ou utilisateur sans rôle enseignant" });
    }

    // Vérifier que le module existe
    const [moduleRows] = await pool.execute(
      `SELECT id FROM modules WHERE id = ?`,
      [moduleId]
    );
    if (moduleRows.length === 0) {
      return res.status(404).json({ message: "Module non trouvé" });
    }

    // Vérifier que le groupe existe
    const [groupeRows] = await pool.execute(
      `SELECT id FROM groupes WHERE id = ?`,
      [groupeId]
    );
    if (groupeRows.length === 0) {
      return res.status(404).json({ message: "Groupe non trouvé" });
    }

    // Vérifier si l'association existe déjà
    const [existing] = await pool.execute(
      `SELECT id FROM utilisateur_modules WHERE enseignantId = ? AND moduleId = ? AND groupeId = ?`,
      [enseignantId, moduleId, groupeId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "Cette association existe déjà" });
    }

    // Créer l'association
    const [result] = await pool.execute(
      `INSERT INTO utilisateur_modules (enseignantId, moduleId, groupeId, informations_supplementaires) 
       VALUES (?, ?, ?, ?)`,
      [enseignantId, moduleId, groupeId, informations_supplementaires || null]
    );

    res.status(201).json({
      message: "Association enseignant-module-groupe créée avec succès",
      id: result.insertId
    });

  } catch (error) {
    console.error("Erreur lors de la création de l'association:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};

// Récupérer toutes les associations
export const getAllAssociations = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT um.id, u.id as enseignantId, u.nom as enseignantNom, u.email as enseignantEmail,
              m.id as moduleId, m.nom as moduleNom,
              g.id as groupeId, g.nom as groupeNom
       FROM utilisateur_modules um
       JOIN utilisateurs u ON um.enseignantId = u.id
       JOIN modules m ON um.moduleId = m.id
       JOIN groupes g ON um.groupeId = g.id`
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des associations:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};

// Récupérer par enseignant
export const getAssociationsByTeacherId = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const [rows] = await pool.execute(
      `SELECT um.id, m.id as moduleId, m.nom as moduleNom, g.id as groupeId, g.nom as groupeNom
       FROM utilisateur_modules um
       JOIN modules m ON um.moduleId = m.id
       JOIN groupes g ON um.groupeId = g.id
       WHERE um.enseignantId = ?`,
      [teacherId]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};

// Récupérer par module
export const getAssociationsByModuleId = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const [rows] = await pool.execute(
      `SELECT um.id, u.id as enseignantId, u.nom as enseignantNom, u.email as enseignantEmail,
              g.id as groupeId, g.nom as groupeNom
       FROM utilisateur_modules um
       JOIN utilisateurs u ON um.enseignantId = u.id
       JOIN groupes g ON um.groupeId = g.id
       WHERE um.moduleId = ?`,
      [moduleId]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};

// Récupérer par groupe
export const getAssociationsByGroupId = async (req, res) => {
  try {
    const { groupId } = req.params;
    const [rows] = await pool.execute(
      `SELECT um.id, u.id as enseignantId, u.nom as enseignantNom, u.email as enseignantEmail,
              m.id as moduleId, m.nom as moduleNom
       FROM utilisateur_modules um
       JOIN utilisateurs u ON um.enseignantId = u.id
       JOIN modules m ON um.moduleId = m.id
       WHERE um.groupeId = ?`,
      [groupId]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};

export const getStudentsByModuleId = async (req, res) => {
  try {
    const { moduleId } = req.params;

    const [rows] = await pool.execute(
      `SELECT s.id as stagiaireId, s.nom as stagiaireNom, s.email, g.id as groupeId, g.nom as groupeNom
       FROM utilisateur_groupes ug
       JOIN utilisateurs s ON ug.stagiaireId = s.id
       JOIN groupes g ON ug.groupeId = g.id
       JOIN utilisateur_modules um ON um.groupeId = g.id
       WHERE um.moduleId = ?`,
      [moduleId]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des stagiaires du module:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};

// Supprimer une association par ID
export const deleteAssociation = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      `DELETE FROM utilisateur_modules WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Association non trouvée" });
    }
    res.status(200).json({ message: "Association supprimée avec succès" });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};

// Supprimer une association par enseignant, module et groupe
export const deleteAssociationByTeacherModuleGroup = async (req, res) => {
  try {
    const { teacherId, moduleId, groupId } = req.params;
    const [result] = await pool.execute(
      `DELETE FROM utilisateur_modules WHERE enseignantId = ? AND moduleId = ? AND groupeId = ?`,
      [teacherId, moduleId, groupId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Association non trouvée" });
    }
    res.status(200).json({ message: "Association supprimée avec succès" });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};

// Récupérer les groupes assignés à un enseignant
export const getGroupsByTeacherId = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const [rows] = await pool.execute(
      `SELECT DISTINCT g.id, g.nom
       FROM utilisateur_modules um
       JOIN groupes g ON um.groupeId = g.id
       WHERE um.enseignantId = ?`,
      [teacherId]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};
