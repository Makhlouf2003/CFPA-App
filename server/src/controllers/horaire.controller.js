import pool from "../config/db.js";


export const createHoraire = async (req, res) => {
  const { enseignantId, moduleId, groupeId, ...rest } = req.body;
  try {
    const [userRows] = await pool.execute(
      `SELECT u.id, r.nom as roleName
       FROM utilisateurs u
       JOIN utilisateur_roles ur ON u.id = ur.utilisateurId
       JOIN roles r ON ur.roleId = r.id
       WHERE u.id = ?`,
      [enseignantId]
    );

    if (userRows.length === 0) {
      return res.status(404).send({ message: "Enseignant user not found" });
    }

    const hasEnseignantRole = userRows.some((row) => row.roleName === "enseignant");
    if (!hasEnseignantRole) {
      return res
        .status(403)
        .send({ message: "User does not have the 'enseignant' role" });
    }

    const [isModuleInGroupRows] = await pool.execute(
      "SELECT * FROM utilisateur_modules WHERE moduleId = ? AND groupeId = ?",
      [moduleId, groupeId]
    );

    if (isModuleInGroupRows.length === 0) {
      return res.status(400).send({
        message: "This module is not assigned to the specified group.",
      });
    }

    const [result] = await pool.execute(
      "INSERT INTO horaires (enseignantId, moduleId, groupeId, jour, heure_debut, heure_fin, salle, informations_supplementaires, cree_a, mis_a_jour_a) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [enseignantId, moduleId, groupeId, rest.jour, rest.heure_debut, rest.heure_fin, rest.salle, req.body.informations_supplementaires]
    );

    res.status(201).send({ id: result.insertId, enseignantId, moduleId, groupeId, ...rest });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

export const getHoraireByGroupe = async (req, res) => {
  try {
    const { groupeId } = req.params;
    const [rows] = await pool.execute(
      `SELECT
        h.id, h.jour, h.heure_debut, h.heure_fin, h.salle, h.informations_supplementaires,
        h.enseignantId, h.moduleId, h.groupeId,
        g.nom AS groupeNom,
        u.nom AS enseignantNom,
        m.nom AS moduleNom
      FROM horaires h
      JOIN groupes g ON h.groupeId = g.id
      JOIN utilisateurs u ON h.enseignantId = u.id
      JOIN modules m ON h.moduleId = m.id
      WHERE h.groupeId = ?`,
      [groupeId]
    );

    const horaires = rows.map(row => {
      let type = 'Cours';
      try {
        if (row.informations_supplementaires) {
          const info = typeof row.informations_supplementaires === 'string'
            ? JSON.parse(row.informations_supplementaires)
            : row.informations_supplementaires;
          type = info.type || 'Cours';
        }
      } catch (e) {
        console.warn('Could not parse informations_supplementaires:', row.informations_supplementaires);
      }

      return {
        id: row.id,
        jour: row.jour,
        heure_debut: row.heure_debut,
        heure_fin: row.heure_fin,
        salle: row.salle,
        type,
        informations_supplementaires: row.informations_supplementaires,
        groupe: { id: row.groupeId, nom: row.groupeNom },
        enseignant: { id: row.enseignantId, nom: row.enseignantNom },
        module: { id: row.moduleId, nom: row.moduleNom },
      };
    });

    res.status(200).send(horaires);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

export const getHoraireByStagiaire = async (req, res) => {
  try {
    const { stagiaireId } = req.params;
    const [userGroupesRows] = await pool.execute(
      `SELECT g.id, g.nom 
       FROM utilisateurs u
       JOIN utilisateur_groupes ug ON u.id = ug.stagiaireId
       JOIN groupes g ON ug.groupeId = g.id
       WHERE u.id = ?`,
      [stagiaireId]
    );

    if (userGroupesRows.length === 0) {
      return res.status(404).send({ message: "Stagiaire or groupe not found" });
    }
    const groupeId = userGroupesRows[0].id;

    const [rows] = await pool.execute(
      `SELECT
        h.id, h.jour, h.heure_debut, h.heure_fin, h.salle, h.informations_supplementaires,
        h.enseignantId, h.moduleId, h.groupeId,
        g.nom AS groupeNom,
        u.nom AS enseignantNom,
        m.nom AS moduleNom
      FROM horaires h
      JOIN groupes g ON h.groupeId = g.id
      JOIN utilisateurs u ON h.enseignantId = u.id
      JOIN modules m ON h.moduleId = m.id
      WHERE h.groupeId = ?`,
      [groupeId]
    );

    const horaires = rows.map(row => {
      let type = 'Cours';
      try {
        if (row.informations_supplementaires) {
          const info = typeof row.informations_supplementaires === 'string'
            ? JSON.parse(row.informations_supplementaires)
            : row.informations_supplementaires;
          type = info.type || 'Cours';
        }
      } catch (e) {
        console.warn('Could not parse informations_supplementaires:', row.informations_supplementaires);
      }

      return {
        id: row.id,
        jour: row.jour,
        heure_debut: row.heure_debut,
        heure_fin: row.heure_fin,
        salle: row.salle,
        type,
        informations_supplementaires: row.informations_supplementaires,
        groupe: { id: row.groupeId, nom: row.groupeNom },
        enseignant: { id: row.enseignantId, nom: row.enseignantNom },
        module: { id: row.moduleId, nom: row.moduleNom },
      };
    });

    res.status(200).send(horaires);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

export const getHoraireById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT
        h.id, h.jour, h.heure_debut, h.heure_fin, h.salle, h.informations_supplementaires,
        h.enseignantId, h.moduleId, h.groupeId,
        g.nom AS groupeNom,
        u.nom AS enseignantNom,
        m.nom AS moduleNom
      FROM horaires h
      JOIN groupes g ON h.groupeId = g.id
      JOIN utilisateurs u ON h.enseignantId = u.id
      JOIN modules m ON h.moduleId = m.id
      WHERE h.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).send({ message: "Horaire not found" });
    }

    let type = 'Cours';
    try {
      if (rows[0].informations_supplementaires) {
        const info = typeof rows[0].informations_supplementaires === 'string'
          ? JSON.parse(rows[0].informations_supplementaires)
          : rows[0].informations_supplementaires;
        type = info.type || 'Cours';
      }
    } catch (e) {
      console.warn('Could not parse informations_supplementaires:', rows[0].informations_supplementaires);
    }

    const horaire = {
      id: rows[0].id,
      jour: rows[0].jour,
      heure_debut: rows[0].heure_debut,
      heure_fin: rows[0].heure_fin,
      salle: rows[0].salle,
      type,
      informations_supplementaires: rows[0].informations_supplementaires,
      groupe: { id: rows[0].groupeId, nom: rows[0].groupeNom },
      enseignant: { id: rows[0].enseignantId, nom: rows[0].enseignantNom },
      module: { id: rows[0].moduleId, nom: rows[0].moduleNom },
    };

    res.status(200).send(horaire);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

export const updateHoraire = async (req, res) => {
  const { id } = req.params;
  const { enseignantId, moduleId, groupeId, ...rest } = req.body;

  try {
    const [horaireRows] = await pool.execute("SELECT * FROM horaires WHERE id = ?", [id]);
    if (horaireRows.length === 0) {
      return res.status(404).send({ message: "Horaire not found" });
    }

    const currentHoraire = horaireRows[0];

    const newEnseignantId = enseignantId || currentHoraire.enseignantId;
    const newModuleId = moduleId || currentHoraire.moduleId;
    const newGroupeId = groupeId || currentHoraire.groupeId;

    if (newEnseignantId) {
      const [userRows] = await pool.execute(
        `SELECT u.id, r.nom as roleName
         FROM utilisateurs u
         JOIN utilisateur_roles ur ON u.id = ur.utilisateurId
         JOIN roles r ON ur.roleId = r.id
         WHERE u.id = ?`,
        [newEnseignantId]
      );
      if (userRows.length === 0) {
        return res.status(404).send({ message: "Enseignant user not found" });
      }
      const hasEnseignantRole = userRows.some((row) => row.roleName === "enseignant");
      if (!hasEnseignantRole) {
        return res
          .status(403)
          .send({ message: "User does not have the 'enseignant' role" });
      }
    }

    const [isModuleInGroupRows] = await pool.execute(
      "SELECT * FROM utilisateur_modules WHERE moduleId = ? AND groupeId = ?",
      [newModuleId, newGroupeId]
    );

    if (isModuleInGroupRows.length === 0) {
      return res.status(400).send({
        message: "This module is not assigned to the specified group.",
      });
    }

    await pool.execute(
      "UPDATE horaires SET enseignantId = ?, moduleId = ?, groupeId = ?, jour = ?, heure_debut = ?, heure_fin = ?, salle = ?, informations_supplementaires = ?, mis_a_jour_a = NOW() WHERE id = ?",
      [newEnseignantId, newModuleId, newGroupeId, rest.jour || currentHoraire.jour, rest.heure_debut || currentHoraire.heure_debut, rest.heure_fin || currentHoraire.heure_fin, rest.salle || currentHoraire.salle, req.body.informations_supplementaires, id]
    );

    const [updatedHoraireRows] = await pool.execute("SELECT * FROM horaires WHERE id = ?", [id]);

    res.status(200).send(updatedHoraireRows[0]);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

export const deleteHoraire = async (req, res) => {
  const { id } = req.params;
  try {
    const [horaireRows] = await pool.execute("SELECT * FROM horaires WHERE id = ?", [id]);
    if (horaireRows.length === 0) {
      return res.status(404).send({ message: "Horaire not found" });
    }
    await pool.execute("DELETE FROM horaires WHERE id = ?", [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};