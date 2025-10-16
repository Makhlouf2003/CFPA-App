import pool from "../config/db.js";

// Créer une association utilisateur-groupe (stagiaire ou enseignant)
export const createAssociation = async (req, res) => {
  try {
    const { utilisateurId, groupeId, informations_supplementaires } = req.body;

    if (!utilisateurId || !groupeId) {
      return res.status(400).json({ message: "L'ID utilisateur et l'ID groupe sont requis" });
    }

    // Vérifier que l'utilisateur existe
    const [userRows] = await pool.execute(
      `SELECT u.id 
       FROM utilisateurs u 
       WHERE u.id = ?`,
      [utilisateurId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
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
      `SELECT id FROM utilisateur_groupes WHERE stagiaireId = ? AND groupeId = ?`,
      [utilisateurId, groupeId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "Cette association existe déjà" });
    }

    // Créer l'association
    const [result] = await pool.execute(
      `INSERT INTO utilisateur_groupes (stagiaireId, groupeId, informations_supplementaires)
       VALUES (?, ?, ?)`,
      [utilisateurId, groupeId, informations_supplementaires || null]
    );

    res.status(201).json({
      message: "Association créée avec succès",
      id: result.insertId
    });
  } catch (error) {
    console.error("Erreur lors de la création de l'association:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};

// Récupérer toutes les associations utilisateur-groupe
export const getAllAssociations = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ug.id, u.id as stagiaireId, u.nom as stagiaireNom, u.email as stagiaireEmail,
              g.id as groupeId, g.nom as groupeNom
       FROM utilisateur_groupes ug
       JOIN utilisateurs u ON ug.stagiaireId = u.id
       JOIN groupes g ON ug.groupeId = g.id`
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des associations:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};

// Récupérer les associations par utilisateur
export const getAssociationsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.execute(
      `SELECT ug.id, g.id as groupeId, g.nom as groupeNom
       FROM utilisateur_groupes ug
       JOIN groupes g ON ug.groupeId = g.id
       WHERE ug.stagiaireId = ?`,
      [userId]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération par utilisateur:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};

// Récupérer les associations par groupe
export const getAssociationsByGroupId = async (req, res) => {
  try {
    const { groupId } = req.params;
    const [rows] = await pool.execute(
      `SELECT ug.id, u.id as stagiaireId, u.nom as stagiaireNom, u.email as stagiaireEmail
       FROM utilisateur_groupes ug
       JOIN utilisateurs u ON ug.stagiaireId = u.id
       WHERE ug.groupeId = ?`,
      [groupId]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération par groupe:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};

// Supprimer une association par ID
export const deleteAssociation = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      `DELETE FROM utilisateur_groupes WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Association non trouvée" });
    }
    res.status(200).json({ message: "Association supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};

// Supprimer une association par utilisateur et groupe
export const deleteAssociationByUserAndGroup = async (req, res) => {
  try {
    const { userId, groupId } = req.params;
    const [result] = await pool.execute(
      `DELETE FROM utilisateur_groupes WHERE stagiaireId = ? AND groupeId = ?`,
      [userId, groupId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Association non trouvée" });
    }
    res.status(200).json({ message: "Association supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression par utilisateur/groupe:", error);
    res.status(500).json({ message: "Erreur interne du serveur", error: error.message });
  }
};
