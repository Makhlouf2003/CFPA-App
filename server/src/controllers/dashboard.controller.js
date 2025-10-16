import pool from "../config/db.js";

export const getDashboardData = async (req, res) => {
  const { id: userId, role } = req.user;

  try {
    let data = {};

    if (role === "stagiaire") {
      const [notesRows] = await pool.execute(
        "SELECT * FROM notes WHERE stagiaireId = ?",
        [userId]
      );
      const modulesWithNotes = [...new Set(notesRows.map((n) => n.moduleId))];
      const averageGrade =
        notesRows.length > 0
          ? notesRows.reduce((acc, n) => acc + n.note, 0) / notesRows.length
          : 0;

      const [userGroupesRows] = await pool.execute(
        `SELECT g.id FROM utilisateurs u
         JOIN utilisateur_groupes sg ON u.id = sg.stagiaireId
         JOIN groupes g ON sg.groupeId = g.id
         WHERE u.id = ?`,
        [userId]
      );

      if (userGroupesRows.length === 0) {
        return res
          .status(404)
          .json({ message: "Stagiaire is not assigned to any groupe." });
      }
      const groupeId = userGroupesRows[0].id;

      const [assignedModulesRows] = await pool.execute(
        "SELECT moduleId FROM utilisateur_modules WHERE groupeId = ?",
        [groupeId]
      );
      const assignedModuleIds = assignedModulesRows.map((am) => am.moduleId);

      let availableCourses = 0;
      if (assignedModuleIds.length > 0) {
        const [coursesCountRows] = await pool.execute(
          `SELECT COUNT(*) AS count FROM cours WHERE moduleId IN (${assignedModuleIds
            .map(() => "?")
            .join(",")})`,
          assignedModuleIds
        );
        availableCourses = coursesCountRows[0].count;
      }

      data = {
        modulesWithNotes: modulesWithNotes.length,
        averageGrade,
        availableCourses,
      };
    } else if (role === "enseignant") {
      const [assignedModulesRows] = await pool.execute(
        "SELECT COUNT(*) AS count FROM utilisateur_modules WHERE enseignantId = ?",
        [userId]
      );
      const assignedModules = assignedModulesRows[0].count;

      const [uploadedCoursesRows] = await pool.execute(
        "SELECT COUNT(*) AS count FROM cours WHERE enseignantId = ?",
        [userId]
      );
      const uploadedCourses = uploadedCoursesRows[0].count;

      const [givenNotesRows] = await pool.execute(
        "SELECT COUNT(*) AS count FROM notes WHERE enseignantId = ?",
        [userId]
      );
      const givenNotes = givenNotesRows[0].count;

      data = {
        assignedModules,
        uploadedCourses,
        givenNotes,
      };
    } else if (role === "admin") {
      const [stagiairesRows] = await pool.execute(
        `SELECT COUNT(DISTINCT u.id) AS count FROM utilisateurs u
         JOIN utilisateur_roles ur ON u.id = ur.utilisateurId
         JOIN roles r ON ur.roleId = r.id
         WHERE r.nom = 'stagiaire'`
      );
      const stagiaires = stagiairesRows[0].count;

      const [enseignantsRows] = await pool.execute(
        `SELECT COUNT(DISTINCT u.id) AS count FROM utilisateurs u
         JOIN utilisateur_roles ur ON u.id = ur.utilisateurId
         JOIN roles r ON ur.roleId = r.id
         WHERE r.nom = 'enseignant'`
      );
      const enseignants = enseignantsRows[0].count;

      const [modulesRows] = await pool.execute(
        "SELECT COUNT(*) AS count FROM modules"
      );
      const modules = modulesRows[0].count;

      const [coursesRows] = await pool.execute(
        "SELECT COUNT(*) AS count FROM cours"
      );
      const courses = coursesRows[0].count;

      data = {
        stagiaires,
        enseignants,
        modules,
        courses,
      };
    } else {
      return res.status(403).json({ message: "Invalid role" });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
