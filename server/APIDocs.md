# API Documentation

This document provides detailed information about the API endpoints.

## Authentication

All protected endpoints require a JSON Web Token (JWT) in the `x-access-token` header.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

---

## Auth Routes

### `POST /api/auth/signup`

Registers a new user.

**Body:**

```json
{
  "nom": "testuser",
  "email": "test@example.com",
  "mot_de_passe": "password123",
  "roles": ["stagiaire"],
  "informations_supplementaires": "Some additional info"
}
```

**Response (201):**

```json
{
  "message": "User was registered successfully!"
}
```

### `POST /api/auth/signin`

Logs in a user.

**Body:**

```json
{
  "email": "test@example.com",
  "mot_de_passe": "password123"
}
```

**Response (200):**

```json
{
  "id": 1,
  "nom": "testuser",
  "email": "test@example.com",
  "roles": ["ROLE_STAGIAIRE"],
  "accessToken": "your-jwt-token"
}
```

---

## Profil Routes

### `POST /api/profil/:utilisateurId`

Creates a new profil for a user. This endpoint handles file uploads for the profile photo using `multipart/form-data`.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Body (`multipart/form-data`):**

- `photo`: (file) The user's profile picture.
- `specialite`: (text) The user's specialty (e.g., "Web Development").
- `numero_carte_identite`: (text) The user's identity card number.
- `informations_supplementaires`: (text) Additional information.

**Response (201):**

```json
{
  "message": "Profil created successfully.",
  "profil": {
    "id": 1,
    "utilisateurId": 1,
    "photo": "url-to-photo",
    "specialite": "Web Development",
    "numero_carte_identite": "123456789",
    "informations_supplementaires": "Additional information here",
    "cree_a": "2025-07-31T12:00:00.000Z",
    "mis_a_jour_a": "2025-07-31T12:00:00.000Z"
  }
}
```

### `GET /api/profil/`

Retrieves all profils.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
[
  {
    "id": 1,
    "utilisateurId": 1,
    "photo": "url-to-photo",
    "specialite": "Web Development",
    "numero_carte_identite": "123456789",
    "informations_supplementaires": "Additional information here",
    "cree_a": "2025-07-31T12:00:00.000Z",
    "mis_a_jour_a": "2025-07-31T12:00:00.000Z"
  }
]
```

### `GET /api/profil/:utilisateurId`

Retrieves a specific profil.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
{
  "id": 1,
  "utilisateurId": 1,
  "photo": "url-to-photo",
  "specialite": "Web Development",
  "numero_carte_identite": "123456789",
  "informations_supplementaires": "Additional information here",
  "cree_a": "2025-07-31T12:00:00.000Z",
  "mis_a_jour_a": "2025-07-31T12:00:00.000Z"
}
```

**Response (404):**

```json
{
  "message": "User not found"
}
```

### `PUT /api/profil/:utilisateurId`

Updates a profil. This endpoint handles file uploads for the profile photo using `multipart/form-data`.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Body (`multipart/form-data`):**

- `photo`: (file, optional) A new profile picture to upload.
- `specialite`: (text, optional) The user's specialty.
- `numero_carte_identite`: (text, optional) The user's identity card number.
- `informations_supplementaires`: (text, optional) Additional information.

**Response (200):**

```json
{
  "message": "Profil updated successfully.",
  "profil": {
    "id": 1,
    "utilisateurId": 1,
    "photo": "new-url-to-photo",
    "specialite": "Full Stack Development",
    "numero_carte_identite": "123456789",
    "informations_supplementaires": "Additional information here",
    "cree_a": "2025-07-31T12:00:00.000Z",
    "mis_a_jour_a": "2025-07-31T12:00:00.000Z"
  }
}
```

### `DELETE /api/profil/:utilisateurId`

Deletes a profil.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
{
  "message": "Profil deleted successfully."
}
```

---

## User Management Routes (Admin Only)

These endpoints are restricted to users with the `admin` role and require a valid JWT.

### `GET /api/users`

Retrieves a list of all users.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
[
  {
    "id": 1,
    "nom": "testuser",
    "email": "test@example.com",
    "roles": [
      {
        "nom": "stagiaire"
      }
    ]
  },
  {
    "id": 2,
    "nom": "adminuser",
    "email": "admin@example.com",
    "roles": [
      {
        "nom": "admin"
      }
    ]
  }
]
```

### `GET /api/users/:id`

Retrieves a single user by their ID.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
{
  "id": 1,
  "nom": "testuser",
  "email": "test@example.com",
  "roles": [
    {
      "nom": "stagiaire"
    }
  ]
}
```

**Response (404):**

```json
{
  "message": "User not found"
}
```

### `PUT /api/users/:id`

Updates a user's information (nom, email, roles).

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Body:**

```json
{
  "nom": "updateduser",
  "email": "updated@example.com",
  "roles": ["stagiaire", "enseignant"],
  "informations_supplementaires": "Some additional info"
}
```

**Response (200):**

```json
{
  "message": "User updated successfully"
}
```

### `DELETE /api/users/:id`

Deletes a user.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
{
  "message": "User deleted successfully"
}
```

---

## Module Management Routes

These endpoints are for managing modules and assigning them to teachers.

### `POST /api/modules` (admin only)

Adds a new module.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Body:**

```json
{
  "nom": "Mathematics",
  "informations_supplementaires": "Some additional info"
}
```

**Response (201):**

```json
{
  "id": 1,
  "nom": "Mathematics",
  "cree_a": "2025-08-01T12:00:00.000Z",
  "mis_a_jour_a": "2025-08-01T12:00:00.000Z"
}
```

### `GET /api/modules`

Retrieves all available modules.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
[
  {
    "id": 1,
    "nom": "Mathematics",
    "cree_a": "2025-08-01T12:00:00.000Z",
    "mis_a_jour_a": "2025-08-01T12:00:00.000Z"
  },
  {
    "id": 2,
    "nom": "Physics",
    "cree_a": "2025-08-01T12:05:00.000Z",
    "mis_a_jour_a": "2025-08-01T12:05:00.000Z"
  }
]
```

### `POST /api/modules/assign` (Admin Only)

Assigns a teacher to a module for a specific group. This endpoint is restricted to users with the `admin` role.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Body:**

```json
{
  "enseignantId": 1,
  "moduleId": 1,
  "groupeId": 1,
  "informations_supplementaires": "Some additional info"
}
```

**Response (200):**

```json
{
  "message": "Module assigned successfully to group"
}
```

**Response (404):**

```json
{
  "message": "User not found"
}
```

**Response (404):**

```json
{
  "message": "Module not found"
}
```

**Response (404):**

```json
{
  "message": "Groupe not found"
}
```

### `GET /api/modules/enseignant/:enseignantId`

Retrieves all modules assigned to a specific teacher.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
[
  {
    "id": 1,
    "nom": "Mathematics"
  },
  {
    "id": 2,
    "nom": "Physics"
  }
]
```

**Response (404):**

```json
{
  "message": "User not found"
}
```

---

## Groupes Routes

### `POST /api/groupes` (Admin Only)

Creates a new group.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Body:**

```json
{
  "nom": "Group A",
  "informations_supplementaires": "Some additional info"
}
```

**Response (201):**

```json
{
  "id": 1,
  "nom": "Group A",
  "cree_a": "2025-08-03T10:00:00.000Z",
  "mis_a_jour_a": "2025-08-03T10:00:00.000Z"
}
```

### `GET /api/groupes`

Retrieves all groups.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
[
  {
    "id": 1,
    "nom": "Group A",
    "cree_a": "2025-08-03T10:00:00.000Z",
    "mis_a_jour_a": "2025-08-03T10:00:00.000Z"
  }
]
```

### `POST /api/groupes/assigner-stagiaire`

Assigns a student (stagiaire) to a group.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Body:**

```json
{
  "stagiaireId": 1,
  "groupeId": 1,
  "informations_supplementaires": "Some additional info"
}
```

**Response (200):**

```json
{
  "message": "Stagiaire assigned to groupe successfully"
}
```

**Response (404):**

```json
{
  "message": "Groupe not found"
}
```

**Response (404):**

```json
{
  "message": "User not found"
}
```

---

## Horaires Routes

### `POST /api/horaires` (Admin Only)

Creates a new schedule entry for a group.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Body:**

```json
{
  "groupeId": 1,
  "enseignantId": 1,
  "moduleId": 1,
  "salle": "Salle 101",
  "jour": "Lundi",
  "heure_debut": "09:00:00",
  "heure_fin": "10:00:00",
  "informations_supplementaires": "Some additional info"
}
```

**Response (201):**

```json
{
  "id": 1,
  "groupeId": 1,
  "enseignantId": 1,
  "moduleId": 1,
  "salle": "Room 101",
  "jour": "Monday",
  "heure_debut": "09:00:00",
  "heure_fin": "10:00:00",
  "cree_a": "2025-08-03T10:00:00.000Z",
  "mis_a_jour_a": "2025-08-03T10:00:00.000Z"
}
```

### `PUT /api/horaires/:id` (Admin Only)

Updates a schedule entry.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Body:**

```json
{
  "groupeId": 1,
  "enseignantId": 1,
  "moduleId": 1,
  "salle": "Salle 102",
  "jour": "Mardi",
  "heure_debut": "10:00:00",
  "heure_fin": "11:00:00",
  "informations_supplementaires": "Some additional info"
}
```

**Response (200):**

```json
{
  "id": 1,
  "groupeId": 1,
  "enseignantId": 1,
  "moduleId": 1,
  "salle": "Salle 102",
  "jour": "Mardi",
  "heure_debut": "10:00:00",
  "heure_fin": "11:00:00",
  "cree_a": "2025-08-03T10:00:00.000Z",
  "mis_a_jour_a": "2025-08-03T10:05:00.000Z"
}
```

### `GET /api/horaires/groupe/:groupeId`

Retrieves the schedule for a specific group.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
[
  {
    "id": 1,
    "groupeId": 1,
    "enseignantId": 1,
    "moduleId": 1,
    "salle": "Salle 101",
    "jour": "Lundi",
    "heure_debut": "09:00:00",
    "heure_fin": "10:00:00",
    "cree_a": "2025-08-03T10:00:00.000Z",
    "mis_a_jour_a": "2025-08-03T10:00:00.000Z",
    "groupe": {
      "id": 1,
      "nom": "Group A"
    },
    "utilisateur": {
      "id": 1,
      "nom": "enseignant 1"
    },
    "module": {
      "id": 1,
      "nom": "Mathematics"
    }
  }
]
```

---

## Cours Routes

These endpoints are for managing course materials.

### `POST /api/cours` (Enseignant Only)

Uploads a new course document. This endpoint handles file uploads using `multipart/form-data`.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Body (`multipart/form-data`):**

- `fichier`: (file) The course file (e.g., PDF, video, Word document).
- `moduleId`: (text) The ID of the module this course belongs to.
- `titre`: (text) The title of the course.
- `description`: (text) A description of the course.
- `informations_supplementaires`: (text) Some additional info.

**Response (201):**

```json
{
  "message": "Cours uploaded successfully.",
  "cours": {
    "id": 1,
    "moduleId": 1,
    "enseignantId": 1,
    "titre": "Introduction to Algebra",
    "description": "A comprehensive introduction to algebraic concepts.",
    "fichier_url": "url-to-file",
    "fichier_public_id": "public-id-for-deletion",
    "type_fichier": "application/pdf",
    "cree_a": "2025-08-04T10:00:00.000Z",
    "mis_a_jour_a": "2025-08-04T10:00:00.000Z"
  }
}
```

### `GET /api/cours/module/:moduleId`

Retrieves all courses for a specific module.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
[
  {
    "id": 1,
    "moduleId": 1,
    "enseignantId": 1,
    "titre": "Introduction to Algebra",
    "description": "A comprehensive introduction to algebraic concepts.",
    "fichier_url": "url-to-file",
    "fichier_public_id": "public-id-for-deletion",
    "type_fichier": "application/pdf",
    "cree_a": "2025-08-04T10:00:00.000Z",
    "mis_a_jour_a": "2025-08-04T10:00:00.000Z",
    "enseignant": {
      "id": 1,
      "nom": "teacher1"
    }
  }
]
```

### `DELETE /api/cours/:id` (Enseignant Only)

Deletes a course. Only the teacher who uploaded the course can delete it.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
{
  "message": "Cours deleted successfully."
}
```

**Response (403):**

```json
{
  "message": "Forbidden: You can only delete your own cours!"
}
```

**Response (404):**

```json
{
  "message": "Cours not found!"
}
```

---

## Stagiaire Routes

These endpoints are for students to access their educational resources.

### `GET /api/stagiaires/:id/cours`

Retrieves all courses assigned to the student's group.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
[
  {
    "id": 1,
    "moduleId": 1,
    "enseignantId": 1,
    "titre": "Introduction to Algebra",
    "description": "A comprehensive introduction to algebraic concepts.",
    "fichier_url": "url-to-file",
    "fichier_public_id": "public-id-for-deletion",
    "type_fichier": "application/pdf",
    "cree_a": "2025-08-04T10:00:00.000Z",
    "mis_a_jour_a": "2025-08-04T10:00:00.000Z",
    "module": {
      "id": 1,
      "nom": "Mathematics"
    }
  }
]
```

### `GET /api/stagiaires/:id/horaires`

Retrieves the student's full schedule.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
[
  {
    "id": 1,
    "groupeId": 1,
    "enseignantId": 1,
    "moduleId": 1,
    "salle": "Salle 101",
    "jour": "Lundi",
    "heure_debut": "09:00:00",
    "heure_fin": "10:00:00",
    "cree_a": "2025-08-03T10:00:00.000Z",
    "mis_a_jour_a": "2025-08-03T10:00:00.000Z"
  }
]
```

### `GET /api/stagiaires/:id/releve-notes`

Retrieves the student's transcript.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
[
  {
    "module": "Mathematics",
    "note": "17.50"
  }
]
```

---

## Notes Routes

These endpoints are for managing student grades.

### `POST /api/notes` (Enseignant Only)

Assigns a new note to a student for a specific module.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Body:**

```json
{
  "stagiaireId": 1,
  "moduleId": 1,
  "note": 17.5,
  "informations_supplementaires": "Some additional info"
}
```

**Response (201):**

```json
{
  "id": 1,
  "stagiaireId": 1,
  "moduleId": 1,
  "enseignantId": 1,
  "note": "17.50",
  "cree_a": "2025-08-04T12:00:00.000Z",
  "mis_a_jour_a": "2025-08-04T12:00:00.000Z"
}
```

**Response (404):**

```json
{
  "message": "Student or Module not found"
}
```

---

### `GET /api/notes/module/:moduleId`

Retrieves all notes for a specific module.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
[
  {
    "id": 1,
    "stagiaireId": 1,
    "moduleId": 1,
    "enseignantId": 1,
    "note": "17.50",
    "cree_a": "2025-08-04T12:00:00.000Z",
    "mis_a_jour_a": "2025-08-04T12:00:00.000Z",
    "stagiaire": {
      "id": 1,
      "nom": "student1"
    },
    "enseignant": {
      "id": 1,
      "nom": "teacher1"
    },
    "module": {
      "id": 1,
      "nom": "Mathematics"
    }
  }
]
```

### `PUT /api/notes/:id` (Enseignant Only)

Updates an existing note.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Body:**

```json
{
  "note": 18.0,
  "informations_supplementaires": "Some additional info"
}
```

**Response (200):**

```json
{
  "id": 1,
  "stagiaireId": 1,
  "moduleId": 1,
  "enseignantId": 1,
  "note": "18.00",
  "cree_a": "2025-08-04T12:00:00.000Z",
  "mis_a_jour_a": "2025-08-04T12:00:00.000Z"
}
```

**Response (404):**

```json
{
  "message": "Note not found"
}
```

### `DELETE /api/notes/:id` (Enseignant Only)

Deletes a note.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
{
  "message": "Note deleted successfully"
}
```

**Response (404):**

```json
{
  "message": "Note not found"
}
```

---

## Dashboard Route

### `GET /api/dashboard`

Retrieves summarized data based on the logged-in user's role.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200) for `stagiaire`:**

```json
{
  "modulesWithNotes": 5,
  "averageGrade": 15.75,
  "availableCourses": 12
}
```

**Response (200) for `enseignant`:**

```json
{
  "assignedModules": 3,
  "uploadedCourses": 25,
  "givenNotes": 80
}
```

**Response (200) for `admin`:**

```json
{
  "stagiaires": 50,
  "enseignants": 10,
  "modules": 15,
  "courses": 120
}
```

---

## Notification Routes

### `POST /api/notifications`

Creates a new notification.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Body:**

```json
{
  "utilisateurId": 1,
  "type": "course",
  "titre": "Nouveau cours disponible",
  "message": "Un nouveau cours de mathématiques est disponible.",
  "informations_supplementaires": "Some additional info"
}
```

**Response (201):**

```json
{
    "id": 1,
    "utilisateurId": 1,
    "type": "course",
    "titre": "Nouveau cours disponible",
    "message": "Un nouveau cours de mathématiques est disponible.",
    "lu": false,
    "cree_a": "2025-08-06T10:00:00.000Z",
    "mis_a_jour_a": "2025-08-06T10:00:00.000Z"
}
```

### `GET /api/notifications/:userId`

Retrieves all notifications for a specific user.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
[
    {
        "id": 1,
        "utilisateurId": 1,
        "type": "course",
        "titre": "Nouveau cours disponible",
        "message": "Un nouveau cours de mathématiques est disponible.",
        "lu": false,
        "cree_a": "2025-08-06T10:00:00.000Z",
        "mis_a_jour_a": "2025-08-06T10:00:00.000Z"
    }
]
```

### `PUT /api/notifications/:id/lu`

Marks a notification as read.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (200):**

```json
{
    "id": 1,
    "utilisateurId": 1,
    "type": "course",
    "titre": "Nouveau cours disponible",
    "message": "Un nouveau cours de mathématiques est disponible.",
    "lu": true,
    "cree_a": "2025-08-06T10:00:00.000Z",
    "mis_a_jour_a": "2025-08-06T10:00:00.000Z"
}
```

**Response (404):**

```json
{
  "message": "Notification not found"
}
```

### `DELETE /api/notifications/:id`

Deletes a notification.

**Header:**

```json
{
  "x-access-token": "your-jwt-token"
}
```

**Response (204):** (No content)

**Response (404):**

```json
{
  "message": "Notification not found"
}
```
## Utilisateur-Groupes Routes (Associations stagiaires/enseignants ↔ groupes)

### `POST /api/utilisateur-groupes` (Admin Only)

Crée une nouvelle association entre un utilisateur (stagiaire/enseignant) et un groupe.

**Header:**
```json
{ "x-access-token": "your-jwt-token" }
Body:

json
Copier le code
{
  "utilisateurId": 1,
  "groupeId": 2,
  "informations_supplementaires": "Some additional info"
}
Response (201):

json
Copier le code
{
  "message": "Association créée avec succès",
  "association": {
    "id": 1,
    "stagiaireId": 1,
    "groupeId": 2,
    "informations_supplementaires": "Some additional info"
  }
}
GET /api/utilisateur-groupes
Récupère toutes les associations.

Response (200):

json
Copier le code
[
  {
    "id": 1,
    "stagiaire": { "id": 1, "nom": "student1", "email": "test@example.com" },
    "groupe": { "id": 2, "nom": "Group A" }
  }
]
GET /api/utilisateur-groupes/user/:userId
Récupère toutes les associations pour un utilisateur donné.

GET /api/utilisateur-groupes/group/:groupId
Récupère toutes les associations pour un groupe donné.

DELETE /api/utilisateur-groupes/:id (Admin Only)
Supprime une association par son ID.

Response (200):

json
Copier le code
{ "message": "Association supprimée avec succès" }
DELETE /api/utilisateur-groupes/user/:userId/group/:groupId (Admin Only)
Supprime une association en fonction de l’utilisateur et du groupe.

Utilisateur-Modules Routes (Associations enseignants ↔ modules ↔ groupes)
POST /api/utilisateur-modules (Admin Only)
Crée une nouvelle association enseignant-module-groupe.

Body:

json
Copier le code
{
  "enseignantId": 1,
  "moduleId": 2,
  "groupeId": 3,
  "informations_supplementaires": "Some additional info"
}
Response (201):

json
Copier le code
{
  "message": "Association enseignant-module-groupe créée avec succès",
  "association": {
    "id": 1,
    "enseignantId": 1,
    "moduleId": 2,
    "groupeId": 3
  }
}
GET /api/utilisateur-modules
Récupère toutes les associations.

GET /api/utilisateur-modules/teacher/:teacherId
Récupère toutes les associations d’un enseignant.

GET /api/utilisateur-modules/module/:moduleId
Récupère toutes les associations pour un module donné.

GET /api/utilisateur-modules/group/:groupId
Récupère toutes les associations pour un groupe donné.

GET /api/utilisateur-modules/teacher/:teacherId/groups
Récupère uniquement les groupes associés à un enseignant.

DELETE /api/utilisateur-modules/:id (Admin Only)
Supprime une association par ID.

DELETE /api/utilisateur-modules/teacher/:teacherId/module/:moduleId/group/:groupId (Admin Only)
Supprime une association enseignant-module-groupe précise.

Response (200):

json
Copier le code
{ "message": "Association supprimée avec succès" }