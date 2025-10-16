import pool from "../config/db.js";
import cloudinary from "../config/cloudinary.config.js";
import { Readable } from "stream";

export const uploadCours = async (req, res) => {
  try {
    const { moduleId, titre, description } = req.body;
    const enseignantId = req.userId;

    let fileUrl = null, filePublicId = null, fileType = null;

    // 👉 Déclarer uploadStream AVANT l'utilisation
    const uploadStream = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "cours" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);
        readableStream.pipe(stream);
      });
    };

    // 👉 Uploader seulement si un fichier est fourni
    if (req.file) {
      const result = await uploadStream(req.file.buffer);
      fileUrl = result.secure_url;
      filePublicId = result.public_id;
      fileType = req.file.mimetype;
    }

    // Vérifier module existe
    const [moduleRows] = await pool.execute(
      "SELECT id, nom FROM modules WHERE id = ?",
      [moduleId]
    );
    if (moduleRows.length === 0) {
      return res.status(404).json({ message: "Module not found!" });
    }

    // Vérifier que l’enseignant est assigné
    const [enseignantModuleRows] = await pool.execute(
      "SELECT * FROM utilisateur_modules WHERE enseignantId = ? AND moduleId = ?",
      [enseignantId, moduleId]
    );

    if (enseignantModuleRows.length === 0) {
      return res.status(403).json({ message: "You are not assigned to this module!" });
    }

    // Création du cours
    const [coursResult] = await pool.execute(
      `INSERT INTO cours 
        (moduleId, enseignantId, titre, description, fichier_url, fichier_public_id, type_fichier, informations_supplementaires, cree_a, mis_a_jour_a) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        moduleId,
        enseignantId,
        titre,
        description,
        fileUrl,          // peut être null
        filePublicId,     // peut être null
        fileType,         // peut être null
        req.body.informations_supplementaires || null
      ]
    );
    const coursId = coursResult.insertId;

    res.status(201).json({
      message: "Cours uploaded successfully.",
      cours: {
        id: coursId,
        moduleId,
        enseignantId,
        titre,
        description,
        fichier_url: fileUrl,
        fichier_public_id: filePublicId,
        type_fichier: fileType,
      },
    });
  } catch (err) {
    console.error("Error in uploadCours:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getCoursByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;

    // Vérifier que le module existe
    const [moduleExists] = await pool.execute(
      "SELECT id FROM modules WHERE id = ?",
      [moduleId]
    );
    if (moduleExists.length === 0) {
      return res.status(404).json({ message: "Module not found" });
    }

    // Récupérer tous les cours
    const [rows] = await pool.execute(
      `SELECT
        c.id,
        c.moduleId,
        c.enseignantId,
        c.titre,
        c.description,
        u.nom AS enseignantNom
      FROM cours c
      JOIN utilisateurs u ON c.enseignantId = u.id
      WHERE c.moduleId = ?
      ORDER BY c.cree_a DESC`,
      [moduleId]
    );

    // Pour chaque cours, récupérer ses fichiers
    const cours = [];
    for (const row of rows) {
      const [files] = await pool.execute(
        `SELECT id, fichier_url AS url, type_fichier AS type, nom_fichier AS name
         FROM cours_fichiers WHERE coursId = ?`,
        [row.id]
      );

      cours.push({
        id: row.id,
        moduleId: row.moduleId,
        enseignantId: row.enseignantId,
        titre: row.titre,
        description: row.description,
        enseignant: { id: row.enseignantId, nom: row.enseignantNom },
        files // tableau des fichiers
      });
    }

    res.status(200).json(cours);
  } catch (err) {
    console.error("Error in getCoursByModule:", err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteCoursFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const enseignantId = req.userId;

    // récupérer l'enregistrement du fichier
    const [fileRows] = await pool.execute(
      "SELECT id, coursId, fichier_public_id FROM cours_fichiers WHERE id = ?",
      [fileId]
    );
    if (fileRows.length === 0) {
      return res.status(404).json({ message: "File not found!" });
    }
    const fileRow = fileRows[0];

    // vérifier que l'enseignant propriétaire du cours est bien celui connecté
    const [coursRows] = await pool.execute(
      "SELECT enseignantId FROM cours WHERE id = ?",
      [fileRow.coursId]
    );
    if (coursRows.length === 0) {
      return res.status(404).json({ message: "Cours not found!" });
    }
    if (coursRows[0].enseignantId !== enseignantId) {
      return res.status(403).json({ message: "Forbidden: You can only delete files from your own cours" });
    }

    // supprimer le fichier Cloudinary si présent
    if (fileRow.fichier_public_id) {
      try {
        await cloudinary.uploader.destroy(fileRow.fichier_public_id);
      } catch (cloudErr) {
        console.warn("Cloudinary destroy failed:", cloudErr);
        // on continue même si la suppression Cloudinary échoue
      }
    }

    // supprimer l'entrée en base (cours_fichiers)
    await pool.execute("DELETE FROM cours_fichiers WHERE id = ?", [fileId]);

    res.status(200).json({ message: "File deleted successfully", fileId: fileRow.id, coursId: fileRow.coursId });
  } catch (err) {
    console.error("Error in deleteCoursFile:", err);
    res.status(500).json({ message: err.message });
  }
};


export const deleteCours = async (req, res) => {
  try {
    const { id } = req.params;
    const enseignantId = req.userId;

    const [coursRows] = await pool.execute(
      "SELECT fichier_public_id, enseignantId FROM cours WHERE id = ?",
      [id]
    );

    if (coursRows.length === 0) {
      return res.status(404).json({ message: "Cours not found!" });
    }

    const cours = coursRows[0];

    if (cours.enseignantId !== enseignantId) {
      return res
        .status(403)
        .json({ message: "Forbidden: You can only delete your own cours!" });
    }

    if (cours.fichier_public_id) {
      await cloudinary.uploader.destroy(cours.fichier_public_id);
    }

    await pool.execute("DELETE FROM cours WHERE id = ?", [id]);

    res.status(200).json({ message: "Cours deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addFileToCours = async (req, res) => {
  try {
    const { coursId } = req.params;
    const enseignantId = req.userId;

    const [coursRows] = await pool.execute(
      "SELECT id, enseignantId, titre, description FROM cours WHERE id = ?",
      [coursId]
    );
    if (coursRows.length === 0) {
      return res.status(404).json({ message: "Cours not found!" });
    }
    const cours = coursRows[0];
    if (cours.enseignantId !== enseignantId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    let fileUrl = null, filePublicId = null, fileType = null;
    if (req.file) {
      const uploadStream = (buffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "cours" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          const readableStream = new Readable();
          readableStream.push(buffer);
          readableStream.push(null);
          readableStream.pipe(stream);
        });
      };
      const result = await uploadStream(req.file.buffer);
      fileUrl = result.secure_url;
      filePublicId = result.public_id;
      fileType = req.file.mimetype;
    }

    const [insertResult] = await pool.execute(
      `INSERT INTO cours_fichiers (coursId, fichier_url, fichier_public_id, type_fichier, nom_fichier, cree_a, mis_a_jour_a)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [coursId, fileUrl, filePublicId, fileType, req.file.originalname]
    );

    res.status(201).json({
      message: "File added to cours successfully",
      cours: {
        id: cours.id,
        titre: cours.titre,
        description: cours.description,
      },
      file: {
        id: insertResult.insertId,
        name: req.file.originalname,
        url: fileUrl,
        type: fileType,
      }
    });
  } catch (err) {
    console.error("Error in addFileToCours:", err);
    res.status(500).json({ message: err.message });
  }
};