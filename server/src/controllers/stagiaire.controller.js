import pool from "../config/db.js";

export const getCours = async (req, res) => {
  try {
    const stagiaireId = req.params.id;
    const [stagiaireGroupeRows] = await pool.execute(
      "SELECT groupeId FROM utilisateur_groupes WHERE stagiaireId = ?",
      [stagiaireId]
    );

    if (stagiaireGroupeRows.length === 0) {
      return res
        .status(404)
        .send({ message: "Stagiaire not found in any group." });
    }

    const groupeId = stagiaireGroupeRows[0].groupeId;

    const [cours] = await pool.execute(
      `SELECT
        c.id AS coursId,
        c.moduleId,
        c.enseignantId,
        e.nom AS enseignantNom,
        g.nom AS groupeNom,
        c.titre,
        c.description,
        f.id AS fichierId,
        f.nom_fichier AS fichierNom,      
        f.fichier_url AS fichierUrl,
        f.type_fichier AS fichierType,
        m.nom AS nomModule
      FROM cours c
      JOIN modules m ON c.moduleId = m.id
      JOIN utilisateur_modules em ON m.id = em.moduleId
      JOIN utilisateurs e ON c.enseignantId = e.id
      JOIN groupes g ON em.groupeId = g.id
      LEFT JOIN cours_fichiers f ON f.coursId = c.id   
      WHERE em.groupeId = ?
      `,
      [groupeId]
    );

    res.status(200).send(cours);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

export const getHoraires = async (req, res) => {
  try {
    const stagiaireId = req.params.id;
    const [stagiaireGroupeRows] = await pool.execute(
      "SELECT groupeId FROM utilisateur_groupes WHERE stagiaireId = ?",
      [stagiaireId]
    );

    if (stagiaireGroupeRows.length === 0) {
      return res
        .status(404)
        .send({ message: "Stagiaire not found in any group." });
    }

    const groupeId = stagiaireGroupeRows[0].groupeId;

    const [horaires] = await pool.execute(
      "SELECT * FROM horaires WHERE groupeId = ?",
      [groupeId]
    );

    res.status(200).send(horaires);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

export const getReleveNotes = async (req, res) => {
  try {
    const stagiaireId = req.params.id;
    const [notes] = await pool.execute(
      `SELECT
        n.note,
        m.nom AS nomModule
      FROM
        notes n
      JOIN
        modules m ON n.moduleId = m.id
      WHERE
        n.stagiaireId = ?`,
      [stagiaireId]
    );

    const releve = notes.map((note) => ({
      module: note.moduleName,
      note: note.note,
    }));

    res.status(200).send(releve);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
