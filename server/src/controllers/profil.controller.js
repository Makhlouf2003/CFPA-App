import pool from "../config/db.js";
import cloudinary from "../config/cloudinary.config.js";

// Helper function to get user roles
const getUserRoles = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT r.nom FROM utilisateurs u
     JOIN utilisateur_roles ur ON u.id = ur.utilisateurId
     JOIN roles r ON ur.roleId = r.id
     WHERE u.id = ?`,
    [userId]
  );
  return rows.map((row) => row.nom);
};

export const createProfil = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const { specialite, numero_carte_identite, informations_supplementaires } =
      req.body;

    const requestUserRoles = await getUserRoles(req.user.id);

    // Check if the user is an admin or is creating their own profile
    if (
      req.user.id !== parseInt(utilisateurId) &&
      !requestUserRoles.includes("admin")
    ) {
      return res
        .status(403)
        .json({ message: "Forbidden: You can only create your own profile!" });
    }

    const [userRows] = await pool.execute(
      "SELECT id FROM utilisateurs WHERE id = ?",
      [utilisateurId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found!" });
    }

    const [existingProfilRows] = await pool.execute(
      "SELECT id FROM profils WHERE utilisateurId = ?",
      [utilisateurId]
    );
    if (existingProfilRows.length > 0) {
      return res
        .status(400)
        .json({ message: "Profil already exists for this user." });
    }

    const photo = req.file ? req.file.path : null;
    const photo_public_id = req.file ? req.file.filename : null;

    const [result] = await pool.execute(
      "INSERT INTO profils (utilisateurId, photo, photo_public_id, specialite, numero_carte_identite, informations_supplementaires, cree_a, mis_a_jour_a) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [
        utilisateurId,
        photo,
        photo_public_id,
        specialite,
        numero_carte_identite,
        informations_supplementaires,
      ]
    );

    res.status(201).json({
      message: "Profil created successfully.",
      profil: {
        id: result.insertId,
        utilisateurId,
        photo,
        photo_public_id,
        specialite,
        numero_carte_identite,
        informations_supplementaires,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getProfil = async (req, res) => {
  try {
    const { utilisateurId } = req.params;

    const requestUserRoles = await getUserRoles(req.user.id);

    // Check if the user is an admin, an enseignant, or is viewing their own profile
    if (
      req.user.id !== parseInt(utilisateurId) &&
      !requestUserRoles.includes("admin") &&
      !requestUserRoles.includes("enseignant")
    ) {
      return res
        .status(403)
        .json({ message: "Forbidden: You can only view your own profile!" });
    }

    const [profilRows] = await pool.execute(
      "SELECT * FROM profils WHERE utilisateurId = ?",
      [utilisateurId]
    );

    if (profilRows.length === 0) {
      return res.status(404).json({ message: "Profil not found!" });
    }

    res.status(200).json(profilRows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllProfils = async (req, res) => {
  try {
    const requestUserRoles = await getUserRoles(req.user.id);

    // Only admins and enseignants can view all profiles
    if (
      !requestUserRoles.includes("admin") &&
      !requestUserRoles.includes("enseignant")
    ) {
      return res.status(403).json({
        message: "Forbidden: You do not have access to this resource.",
      });
    }

    const [profils] = await pool.execute("SELECT * FROM profils");
    res.status(200).json(profils);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProfil = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const { specialite, numero_carte_identite, informations_supplementaires } =
      req.body;

    const requestUserRoles = await getUserRoles(req.user.id);

    // Check if the user is an admin or is modifying their own profile
    if (
      req.user.id !== parseInt(utilisateurId) &&
      !requestUserRoles.includes("admin")
    ) {
      return res
        .status(403)
        .json({ message: "Forbidden: You can only update your own profile!" });
    }

    const [profilRows] = await pool.execute(
      "SELECT * FROM profils WHERE utilisateurId = ?",
      [utilisateurId]
    );

    if (profilRows.length === 0) {
      return res.status(404).json({ message: "Profil not found!" });
    }

    const profil = profilRows[0];

    let photo = profil.photo;
    let photo_public_id = profil.photo_public_id;

    if (req.file) {
      if (profil.photo_public_id) {
        await cloudinary.uploader.destroy(profil.photo_public_id);
      }
      photo = req.file.path;
      photo_public_id = req.file.filename;
    }

    await pool.execute(
      "UPDATE profils SET photo = ?, photo_public_id = ?, specialite = ?, numero_carte_identite = ?, informations_supplementaires = ?, mis_a_jour_a = NOW() WHERE utilisateurId = ?",
      [
        photo,
        photo_public_id,
        specialite,
        numero_carte_identite,
        informations_supplementaires,
        utilisateurId,
      ]
    );

    const [updatedProfilRows] = await pool.execute(
      "SELECT * FROM profils WHERE utilisateurId = ?",
      [utilisateurId]
    );

    res.status(200).json({
      message: "Profil updated successfully.",
      profil: updatedProfilRows[0],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteProfil = async (req, res) => {
  try {
    const { utilisateurId } = req.params;

    const requestUserRoles = await getUserRoles(req.user.id);

    // Check if the user is an admin or is deleting their own profile
    if (
      req.user.id !== parseInt(utilisateurId) &&
      !requestUserRoles.includes("admin")
    ) {
      return res
        .status(403)
        .json({ message: "Forbidden: You can only delete your own profile!" });
    }

    const [profilRows] = await pool.execute(
      "SELECT * FROM profils WHERE utilisateurId = ?",
      [utilisateurId]
    );

    if (profilRows.length === 0) {
      return res.status(404).json({ message: "Profil not found!" });
    }

    const profil = profilRows[0];

    if (profil.photo_public_id) {
      await cloudinary.uploader.destroy(profil.photo_public_id);
    }

    await pool.execute("DELETE FROM profils WHERE utilisateurId = ?", [
      utilisateurId,
    ]);

    res.status(200).json({ message: "Profil deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
