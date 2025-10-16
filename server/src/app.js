import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import pool from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import profilRoutes from "./routes/profil.routes.js";
import moduleRoutes from "./routes/module.routes.js";
import groupeRoutes from "./routes/groupe.routes.js";
import horaireRoutes from "./routes/horaire.routes.js";
import coursRoutes from "./routes/cours.routes.js";
import noteRoutes from "./routes/note.routes.js";
import stagiaireRoutes from "./routes/stagiaire.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import utilisateurGroupesRoutes from "./routes/utilisateur_groupes.routes.js";
import utilisateurModulesRoutes from "./routes/utilisateur_modules.routes.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Initialize roles if not present
const initializeRoles = async () => {
  try {
    const [rows] = await pool.execute("SELECT COUNT(*) as count FROM roles");
    if (rows[0].count === 0) {
      await pool.execute(
        "INSERT INTO roles (nom, cree_a, mis_a_jour_a) VALUES (?, now(), now())",
        ["stagiaire"]
      );
      await pool.execute(
        "INSERT INTO roles (nom, cree_a, mis_a_jour_a) VALUES (?, now(), now())",
        ["enseignant"]
      );
      await pool.execute(
        "INSERT INTO roles (nom, cree_a, mis_a_jour_a) VALUES (?, now(), now())",
        ["admin"]
      );
      console.log("Roles added.");
    }
  } catch (err) {
    console.error("Failed to initialize roles:", err);
  }
};

initializeRoles();

// Routes

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profil", profilRoutes);
app.use("/api/groupes", groupeRoutes);
app.use("/api/horaires", horaireRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/cours", coursRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/stagiaires", stagiaireRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/utilisateur-groupes", utilisateurGroupesRoutes);
app.use("/api/utilisateur-modules", utilisateurModulesRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the application." });
});

export default app;