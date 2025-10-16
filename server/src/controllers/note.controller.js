import pool from "../config/db.js";

// Assign a note to a student
export const assignNote = async (req, res) => {
  try {
    const { stagiaireId, moduleId, note } = req.body;
    const enseignantId = req.userId;

    // Check if the student exists and has stagiaire role
    const [studentRows] = await pool.execute(
      `SELECT u.id, r.nom as roleName
       FROM utilisateurs u
       JOIN utilisateur_roles ur ON u.id = ur.utilisateurId
       JOIN roles r ON ur.roleId = r.id
       WHERE u.id = ?`,
      [stagiaireId]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const hasStagiaireRole = studentRows.some(
      (row) => row.roleName === "stagiaire"
    );
    if (!hasStagiaireRole) {
      return res
        .status(403)
        .json({ message: "User does not have the 'stagiaire' role" });
    }

    // Check if module exists
    const [moduleRows] = await pool.execute(
      "SELECT id, nom FROM modules WHERE id = ?",
      [moduleId]
    );
    if (moduleRows.length === 0) {
      return res.status(404).json({ message: "Module not found" });
    }
    const moduleName = moduleRows[0].nom;

    // Verify if the teacher is assigned to the module
    const [teacherModuleRows] = await pool.execute(
      "SELECT * FROM utilisateur_modules WHERE enseignantId = ? AND moduleId = ?",
      [enseignantId, moduleId]
    );

    if (teacherModuleRows.length === 0) {
      return res
        .status(403)
        .json({ message: "Teacher is not assigned to this module" });
    }

    const [result] = await pool.execute(
      "INSERT INTO notes (stagiaireId, moduleId, enseignantId, note, informations_supplementaires, cree_a, mis_a_jour_a) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
      [stagiaireId, moduleId, enseignantId, note, req.body.informations_supplementaires]
    );

    const newNoteId = result.insertId;

    await pool.execute(
      "INSERT INTO notifications (utilisateurId, type, titre, message, informations_supplementaires, cree_a, mis_a_jour_a) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
      [
        stagiaireId,
        "note",
        `Nouvelle note en ${moduleName}`,
        `Vous avez reçu une nouvelle note de ${note}`,
        req.body.informations_supplementaires,
      ]
    );

    res
      .status(201)
      .json({ id: newNoteId, stagiaireId, moduleId, enseignantId, note });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all notes for a student
export const getNotesByStagiaire = async (req, res) => {
  try {
    const { stagiaireId } = req.params;
    const [rows] = await pool.execute(
      `SELECT
        n.id, n.note, n.informations_supplementaires, n.cree_a, n.mis_a_jour_a,
        s.id AS stagiaireId, s.nom AS stagiaireNom,
        e.id AS enseignantId, e.nom AS enseignantNom, e.email AS enseignantEmail, e.informations_supplementaires AS enseignantInfos,
        p.photo AS enseignantPhoto,
        m.id AS moduleId, m.nom AS moduleNom
      FROM
        notes n
      JOIN
        utilisateurs s ON n.stagiaireId = s.id
      JOIN
        utilisateurs e ON n.enseignantId = e.id
      LEFT JOIN
        profils p ON p.utilisateurId = e.id
      JOIN
        modules m ON n.moduleId = m.id
      WHERE
        n.stagiaireId = ?`,
      [stagiaireId]
    );

    const notes = rows.map((row) => {
      let tel = null;
      try {
        if (row.enseignantInfos) {
          const infos = JSON.parse(row.enseignantInfos);
          tel = infos.telephone || null;
        }
      } catch (e) {
        console.warn("Impossible de parser infos enseignant:", row.enseignantInfos);
      }

      return {
        id: row.id,
        note: row.note,
        informations_supplementaires: row.informations_supplementaires,
        cree_a: row.cree_a,
        mis_a_jour_a: row.mis_a_jour_a,
        stagiaire: { id: row.stagiaireId, nom: row.stagiaireNom },
        enseignant: {
          id: row.enseignantId,
          nom: row.enseignantNom,
          email: row.enseignantEmail,
          photo: row.enseignantPhoto,
          telephone: tel
        },
        module: { id: row.moduleId, nom: row.moduleNom }
      };
    });

    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all notes for a module
export const getNotesByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const [rows] = await pool.execute(
      `SELECT
        n.id, n.note, n.informations_supplementaires, n.cree_a, n.mis_a_jour_a,
        s.id AS stagiaireId, s.nom AS stagiaireNom,
        e.id AS enseignantId, e.nom AS enseignantNom,
        m.id AS moduleId, m.nom AS moduleNom
      FROM
        notes n
      JOIN
        utilisateurs s ON n.stagiaireId = s.id
      JOIN
        utilisateurs e ON n.enseignantId = e.id
      JOIN
        modules m ON n.moduleId = m.id
      WHERE
        n.moduleId = ?`,
      [moduleId]
    );

    const notes = rows.map((row) => ({
      id: row.id,
      note: row.note,
      informations_supplementaires: row.informations_supplementaires, 
      cree_a: row.cree_a,
      mis_a_jour_a: row.mis_a_jour_a,
      stagiaire: { id: row.stagiaireId, nom: row.stagiaireNom },
      enseignant: { id: row.enseignantId, nom: row.enseignantNom },
      module: { id: row.moduleId, nom: row.moduleNom },
    }));

    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a note
export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const enseignantId = req.userId;

    const [existingNoteRows] = await pool.execute(
      "SELECT * FROM notes WHERE id = ?",
      [id]
    );

    if (existingNoteRows.length === 0) {
      return res.status(404).json({ message: "Note not found" });
    }

    const { moduleId } = existingNoteRows[0];

    const [teacherModuleRows] = await pool.execute(
      "SELECT * FROM utilisateur_modules WHERE enseignantId = ? AND moduleId = ?",
      [enseignantId, moduleId]
    );

    if (teacherModuleRows.length === 0) {
      return res
        .status(403)
        .json({ message: "Teacher is not assigned to this module" });
    }

    await pool.execute(
      "UPDATE notes SET note = ?, informations_supplementaires = ?, mis_a_jour_a = NOW() WHERE id = ?",
      [note, req.body.informations_supplementaires || null, id]
    );

    const [updatedNoteRows] = await pool.execute(
      "SELECT * FROM notes WHERE id = ?",
      [id]
    );

    res.json(updatedNoteRows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a note
export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const enseignantId = req.userId;
    const [noteRows] = await pool.execute("SELECT * FROM notes WHERE id = ?", [
      id,
    ]);

    if (noteRows.length === 0) {
      return res.status(404).json({ message: "Note not found" });
    }

    const { moduleId } = noteRows[0];

    const [teacherModuleRows] = await pool.execute(
      "SELECT * FROM utilisateur_modules WHERE enseignantId = ? AND moduleId = ?",
      [enseignantId, moduleId]
    );

    if (teacherModuleRows.length === 0) {
      return res
        .status(403)
        .json({ message: "Teacher is not assigned to this module" });
    }

    await pool.execute("DELETE FROM notes WHERE id = ?", [id]);
    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
