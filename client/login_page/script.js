const API_BASE_URL = "http://localhost:8080/api";

//---------- Éléments DOM ----------//
const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

//---------- Gestionnaires d'événements pour la bascule entre login/register ----------//
registerBtn.addEventListener("click", () => {
  container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
  container.classList.remove("active");
});

//---------- Fonction pour afficher/masquer les mots de passe ----------//
function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);

  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}

//---------- Validation des mots de passe ----------//
document
  .getElementById("register-confirm-password")
  .addEventListener("input", function () {
    const password = document.getElementById("register-password").value;
    const confirmPassword = this.value;

    if (password !== confirmPassword) {
      this.style.borderColor = "red";
      this.setCustomValidity("mot de passe de confirmation incorrect");
    } else {
      this.style.borderColor = "";
      this.setCustomValidity("");
    }
  });

document
  .getElementById("register-password")
  .addEventListener("input", function () {
    const confirmPassword = document.getElementById(
      "register-confirm-password"
    );
    if (confirmPassword.value) {
      confirmPassword.dispatchEvent(new Event("input"));
    }
  });

//---------- Fonctions d'API ----------//
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Une erreur est survenue");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

function makeAuthenticatedRequest(url, options = {}) {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    logout();
    return Promise.reject(new Error("No authentication token"));
  }

  return apiRequest(url, {
    ...options,
    headers: {
      "x-access-token": token,
      ...options.headers,
    },
  });
}

//---------- Gestion de l'inscription ----------//
document
  .getElementById("register-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("register-name").value.trim();
    const firstName = document
      .getElementById("register-firstName")
      .value.trim();
    const matricule = document
      .getElementById("register-matricule")
      .value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const role = document.getElementById("register-role").value;

    if (!name || !firstName || !matricule || !email || !password || !role) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Veuillez entrer un email valide.");
      return;
    }

    if (password.length < 6) {
      alert("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      const roleMapping = {
        Enseignant: "enseignant",
        Stagiaire: "stagiaire",
        Admin: "admin",
      };

      const userData = {
        nom: `${name} ${firstName}`,
        email: email,
        mot_de_passe: password,
        roles: [roleMapping[role]],
        informations_supplementaires: JSON.stringify({
          matricule: matricule
        })
      };

      const result = await apiRequest(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        body: JSON.stringify(userData),
      });

      alert("Inscription réussie ! Vous pouvez maintenant vous connecter.");
      document.getElementById("register-form").reset();
      container.classList.remove("active");
    } catch (error) {
      alert(`Erreur lors de l'inscription: ${error.message}`);
    }
  });

//---------- Gestion de la connexion ----------//
document
  .getElementById("login-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    try {
      const loginData = {
        email: email,
        mot_de_passe: password,
      };

      const result = await apiRequest(`${API_BASE_URL}/auth/signin`, {
        method: "POST",
        body: JSON.stringify(loginData),
      });

      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          id: result.id,
          nom: result.nom,
          email: result.email,
          roles: result.roles,
        })
      );

      const userRole = result.roles[0];

      switch (userRole) {
        case "ROLE_ENSEIGNANT":
          window.location.href = "/client/home_page/ens/ens.html";
          break;
        case "ROLE_STAGIAIRE":
          window.location.href = "/client/home_page/stg/stg.html";
          break;
        case "ROLE_ADMIN":
          window.location.href = "/client/home_page/admin/admin.html";
          break;
        default:
          alert("Rôle non reconnu");
          break;
      }
    } catch (error) {
      alert(`Erreur de connexion: ${error.message}`);
    }
  });

//---------- Gestion de la session utilisateur ----------//
function checkExistingSession() {
  const token = localStorage.getItem("accessToken");
  const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
}

function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("currentUser");
  window.location.href = "/client/login_page/index.html";
}

//---------- Événements au chargement de la page ----------//
window.addEventListener("load", checkExistingSession);

//---------- Utilitaires d'authentification exposés globalement ----------//
window.authUtils = {
  makeAuthenticatedRequest,
  logout,
  API_BASE_URL,
};