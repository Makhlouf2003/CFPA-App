-- Table des utilisateurs
CREATE TABLE utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    informations_supplementaires TEXT,
    cree_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des roles
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL UNIQUE,
    informations_supplementaires TEXT,
    cree_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table de relation utilisateurs-roles
CREATE TABLE utilisateur_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateurId INT NOT NULL,
    roleId INT NOT NULL,
    informations_supplementaires TEXT,
    cree_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateurId) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_utilisateur_role (utilisateurId, roleId)
);

-- Table des profils
CREATE TABLE profils (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateurId INT NOT NULL,
    photo VARCHAR(255),
    specialite VARCHAR(100),
    numero_carte_identite VARCHAR(100),
    informations_supplementaires TEXT,
    photo_public_id VARCHAR(255),
    cree_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateurId) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- Table des modules
CREATE TABLE modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    informations_supplementaires TEXT,
    cree_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des groupes
CREATE TABLE groupes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    informations_supplementaires TEXT,
    cree_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table de relation utilisateurs-modules
CREATE TABLE utilisateur_modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enseignantId INT NOT NULL,
    moduleId INT NOT NULL,
    groupeId INT NOT NULL,
    informations_supplementaires TEXT,
    cree_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enseignantId) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (moduleId) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (groupeId) REFERENCES groupes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enseignant_module_groupe (enseignantId, moduleId, groupeId)
);

-- Table de relation stagiaires-groupes
CREATE TABLE utilisateur_groupes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stagiaireId INT NOT NULL,
    groupeId INT NOT NULL,
    informations_supplementaires TEXT,
    cree_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (stagiaireId) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (groupeId) REFERENCES groupes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_stagiaire_groupe (stagiaireId, groupeId)
);

-- Table des horaires (emploi du temps)
CREATE TABLE horaires (
    id INT AUTO_INCREMENT PRIMARY KEY,
    groupeId INT NOT NULL,
    enseignantId INT NOT NULL,
    moduleId INT NOT NULL,
    salle VARCHAR(50),
    jour VARCHAR(20),
    heure_debut TIME,
    heure_fin TIME,
    informations_supplementaires TEXT,
    cree_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (groupeId) REFERENCES groupes(id) ON DELETE CASCADE,
    FOREIGN KEY (enseignantId) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (moduleId) REFERENCES modules(id) ON DELETE CASCADE
);

-- Table des cours
CREATE TABLE cours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    moduleId INT NOT NULL,
    enseignantId INT NOT NULL,
    titre VARCHAR(100),
    description TEXT,
    fichier_url VARCHAR(255),
    fichier_public_id VARCHAR(255),
    type_fichier VARCHAR(50),
    informations_supplementaires TEXT,
    cree_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (moduleId) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (enseignantId) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

CREATE TABLE cours_fichiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coursId INT NOT NULL,
    fichier_url VARCHAR(255),
    fichier_public_id VARCHAR(255),
    type_fichier VARCHAR(50),
    nom_fichier VARCHAR(255),
    cree_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (coursId) REFERENCES cours(id) ON DELETE CASCADE
);

-- Table des notes
CREATE TABLE notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stagiaireId INT NOT NULL,
    moduleId INT NOT NULL,
    enseignantId INT NOT NULL,
    note DECIMAL(5,2) NOT NULL,
    informations_supplementaires TEXT,
    cree_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (stagiaireId) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (moduleId) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (enseignantId) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- Table des notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateurId INT NOT NULL,
    type VARCHAR(50),
    titre VARCHAR(100),
    message TEXT,
    lu BOOLEAN DEFAULT FALSE,
    informations_supplementaires TEXT,
    cree_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mis_a_jour_a DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateurId) REFERENCES utilisateurs(id) ON DELETE CASCADE
);
