/* ens.js — version API */
/* Remplace l'ancien ens.js. */
console.log('ens.js - API integrated');

const API_BASE_URL = 'http://localhost:8080/api'; // adapte si nécessaire
const authToken = localStorage.getItem('accessToken') || null;

let currentUser = null; // { id, nom, email, ... }

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initTeacher();
});

async function initTeacher() {
    loadCurrentUserFromStorage();
    await Promise.all([
        loadAndDisplayProfileInfo(),    // charge nom + avatar
        loadAndDisplayStatistics(),     // charge stats (dashboard / endpoints)
        updateNotificationBadgeFromAPI()// charge notifications
    ]);
    // autre initialisation si besoin
}

/* ------------ Helpers API ------------- */
function getAuthHeaders(contentType = 'application/json') {
    const headers = {};
    if (authToken) headers['x-access-token'] = authToken;
    if (contentType && contentType !== 'multipart/form-data') headers['Content-Type'] = contentType;
    return headers;
}

function loadCurrentUserFromStorage() {
    try {
        const saved = localStorage.getItem('currentUser');
        if (saved) currentUser = JSON.parse(saved);
    } catch (e) {
        console.warn('Impossible de parser currentUser depuis localStorage', e);
    }
}

/* ------------ Profile info (nom + avatar) ------------- */
/* Utilise /api/profil/:userId (comme dans profile.js) */
async function loadAndDisplayProfileInfo() {
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    if (!currentUser || !currentUser.id) {
        // fallback: info depuis localStorage teacherProfile (hérité de profile.js)
        const savedProfile = localStorage.getItem('teacherProfile');
        if (savedProfile) {
            try {
                const p = JSON.parse(savedProfile);
                if (userNameEl) userNameEl.textContent = (p.firstName && p.lastName) ? `${p.firstName} ${p.lastName}` : (currentUser?.nom || 'Enseignant');
                if (userAvatarEl) {
                    if (p.photo) userAvatarEl.innerHTML = `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
                    else userAvatarEl.textContent = ((p.firstName||p.lastName) ? (p.firstName||p.lastName).charAt(0).toUpperCase() : 'E');
                }
            } catch (e) { console.warn(e); }
        }
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/profil/${currentUser.id}`, {
            method: 'GET',
            headers: getAuthHeaders(null) // pas de content-type pour GET
        });

        if (res.ok) {
            const profil = await res.json();
            // profil peut contenir photo, specialite, informations_supplementaires...
            const infos = profil || {};
            const extra = (typeof infos.informations_supplementaires === 'string') ? (() => {
                try { return JSON.parse(infos.informations_supplementaires); } catch(e){ return {}; }
            })() : (infos.informations_supplementaires || {});

            const displayName = (extra.firstName && extra.lastName) ? `${extra.firstName} ${extra.lastName}` : (currentUser.nom || 'Enseignant');
            if (userNameEl) userNameEl.textContent = displayName;

            if (userAvatarEl) {
                if (infos.photo) {
                    userAvatarEl.innerHTML = `<img src="${infos.photo}" alt="Photo de profil" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
                } else {
                    userAvatarEl.textContent = displayName.charAt(0).toUpperCase();
                }
            }

            // sauvegarde locale en backup (optionnel)
            try {
                localStorage.setItem('teacherProfile', JSON.stringify({
                    firstName: extra.firstName || '',
                    lastName: extra.lastName || '',
                    photo: infos.photo || null
                }));
            } catch(e) { /* ignore */ }

        } else {
            // 404 ou autre -> fallback
            console.warn('Profil non trouvé ou erreur', res.status);
        }
    } catch (error) {
        console.error('Erreur chargement profil:', error);
    }
}

/* ------------ Statistiques (dashboard) ------------- */
/* GET /api/dashboard retourne des champs par rôle (APIDocs) — pour enseignant attendu: { assignedModules, uploadedCourses, givenNotes } */
/* ------------ Statistiques (dashboard) ------------- */
async function loadAndDisplayStatistics() {
    const totalModulesEl = document.getElementById('totalCourses'); // garder l'id existant
    const totalStudentsEl = document.getElementById('totalStudents');
    const todayClassesEl = document.getElementById('todayClasses');
    const pendingAssignmentsEl = document.getElementById('pendingAssignments');

    if (!totalModulesEl || !totalStudentsEl || !todayClassesEl || !pendingAssignmentsEl) {
        console.warn('Un ou plusieurs éléments stats manquent dans le DOM');
        return;
    }

    // valeurs par défaut visibles pendant chargement
    totalModulesEl.textContent = '...';
    totalStudentsEl.textContent = '...';
    todayClassesEl.textContent = '...';
    pendingAssignmentsEl.textContent = '...';

    try {
        const saved = localStorage.getItem('currentUser') || localStorage.getItem('teacherProfile');
        if (!saved) return;
        const user = JSON.parse(saved);
        const teacherId = user.id || user.userId || user.id_user;

        /* --- Modules assignés (corrigé : unique) --- */
        let assoc = [];
        try {
            const res = await fetch(`${API_BASE_URL}/utilisateur-modules/teacher/${teacherId}`, {
                headers: getAuthHeaders(null)
            });
            if (res.ok) {
                assoc = await res.json();
            }
        } catch (e) {
            console.warn('Erreur récupération modules assignés:', e);
        }

        if (Array.isArray(assoc)) {
            const uniqueModules = new Set(assoc.map(m => m.moduleId || m.id || m.module_id));
            totalModulesEl.textContent = uniqueModules.size;
        } else {
            totalModulesEl.textContent = 0;
        }

        /* --- Stagiaires (même logique que liste_stg.js) --- */
        const studentsCount = await getStudentCountForTeacher();
        totalStudentsEl.textContent = studentsCount;

        /* --- Cours d’aujourd’hui --- */
        const today = await getTodayClassesFromAPI();
        todayClassesEl.textContent = today ?? 0;

        /* --- Devoirs à corriger --- */
        try {
            const res = await fetch(`${API_BASE_URL}/devoirs/enseignant/${teacherId}`, {
                headers: getAuthHeaders(null)
            });
            if (res.ok) {
                const devoirs = await res.json();
                const toCorrect = Array.isArray(devoirs) ? devoirs.filter(d => !d.corrige).length : 0;
                pendingAssignmentsEl.textContent = toCorrect;
            } else {
                pendingAssignmentsEl.textContent = 0;
            }
        } catch (e) {
            pendingAssignmentsEl.textContent = 0;
        }

    } catch (error) {
        console.error('Erreur chargement statistiques:', error);
        totalModulesEl.textContent = 0;
        totalStudentsEl.textContent = 0;
        todayClassesEl.textContent = 0;
        pendingAssignmentsEl.textContent = 0;
    }
}

/* Helper pour récupérer le nombre de cours aujourd'hui via API horaires */
async function getTodayClassesFromAPI() {
    try {
        // Si tu connais le groupe de l'enseignant il vaut mieux appeler /api/horaires/groupe/:groupeId
        // Sinon on peut appeler /api/horaires/enseignant/:enseignantId (si existant) ou /api/horaires et filtrer.
        if (!currentUser || !currentUser.id) return 0;

        // Exemple d'appel possible, adapte selon ton backend :
        const res = await fetch(`${API_BASE_URL}/horaires/enseignant/${currentUser.id}`, {
            method: 'GET',
            headers: getAuthHeaders(null)
        });

        if (!res.ok) return 0;
        const horaires = await res.json(); // tableau d'horaires
        // comparation du jour courant (en français) avec champ 'jour' dans DB
        const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' });
        const todayFrench = today.charAt(0).toUpperCase() + today.slice(1);
        return Array.isArray(horaires) ? horaires.filter(h => h.jour === todayFrench).length : 0;
    } catch (e) {
        console.warn('Erreur getTodayClassesFromAPI', e);
        return 0;
    }
}

async function getStudentCountForTeacher() {
    try {
        const saved = localStorage.getItem('currentUser') || localStorage.getItem('teacherProfile');
        if (!saved) return 0;
        const user = JSON.parse(saved);
        const teacherId = user.id || user.userId || user.id_user;
        if (!teacherId) return 0;

        // récupérer modules assignés
        let teacherModules = [];
        try {
            teacherModules = await (await fetch(`${API_BASE_URL}/utilisateur-modules/teacher/${teacherId}`, { headers: getAuthHeaders(null)})).json();
        } catch (e) {
            try {
                teacherModules = await (await fetch(`${API_BASE_URL}/modules/enseignant/${teacherId}`, { headers: getAuthHeaders(null)})).json();
            } catch (e2) {
                teacherModules = [];
            }
        }

        const studentIds = new Set();
        if (!Array.isArray(teacherModules) || teacherModules.length === 0) return 0;

        for (const mod of teacherModules) {
            const moduleId = mod.moduleId ?? mod.id ?? mod.module_id;
            if (!moduleId) continue;
            try {
                const res = await fetch(`${API_BASE_URL}/utilisateur-modules/students/${moduleId}`, { headers: getAuthHeaders(null) });
                if (!res.ok) continue;
                const list = await res.json();
                if (Array.isArray(list)) {
                    list.forEach(r => {
                        const sid = r.stagiaireId || r.utilisateurId || r.id;
                        if (sid) studentIds.add(sid);
                    });
                }
            } catch (e) {
                // fallback par groupe si endpoint précédent indisponible
                const groupeId = mod.groupeId ?? mod.groupe_id;
                if (groupeId) {
                    try {
                        const res2 = await fetch(`${API_BASE_URL}/utilisateur-groupes/group/${groupeId}`, { headers: getAuthHeaders(null) });
                        if (!res2.ok) continue;
                        const list2 = await res2.json();
                        if (Array.isArray(list2)) {
                            list2.forEach(r => {
                                const sid = r.stagiaireId || r.utilisateurId || r.id;
                                if (sid) studentIds.add(sid);
                            });
                        }
                    } catch (e2) { /* ignore */ }
                }
            }
        }

        return studentIds.size;
    } catch (err) {
        console.warn('getStudentCountForTeacher error', err);
        return 0;
    }
}

/* ------------ Notifications ------------- */
/* GET /api/notifications/:userId (profile.js utilise cette route) */
async function updateNotificationBadgeFromAPI() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    try {
        if (!currentUser || !currentUser.id) {
            badge.style.display = 'none';
            return;
        }

        const res = await fetch(`${API_BASE_URL}/notifications/${currentUser.id}`, {
            method: 'GET',
            headers: getAuthHeaders(null)
        });

        if (res.ok) {
            const notifications = await res.json();
            const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.lu && n.lu !== true).length : 0;
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
            return;
        } else {
            console.warn('Erreur notifications API', res.status);
        }
    } catch (error) {
        console.error('Erreur updateNotificationBadgeFromAPI', error);
    }

    // fallback si erreur: essayer localStorage (compatible avec ton ancien comportement)
    try {
        const savedNotifications = localStorage.getItem('teacherNotifications');
        let notifications = savedNotifications ? JSON.parse(savedNotifications) : [];
        const unreadCount = notifications.filter(n => !n.read && n.lu !== true).length;
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    } catch (e) {
        badge.style.display = 'none';
    }
}

/* ------------ Navigation & actions existantes ------------- */
function showProfile() { window.location.href = 'profile.html'; }
function showCourses() { window.location.href = 'courses.html'; }
function showGrades() { window.location.href = 'notes.html'; }
function showStudents() { window.location.href = 'liste_stg.html'; }
function showSchedule() { window.location.href = 'planning.html'; }
function showNotifications() { window.location.href = 'notification.html'; }

/* ------------ logout modal / confirm (laisser comme avant) ------------- */
function logout() {
    document.getElementById('logoutModal').style.display = 'block';
}
function closeModal() { document.getElementById('logoutModal').style.display = 'none'; }
function confirmLogout() {
    document.body.style.opacity = '0';
    setTimeout(() => { window.location.href = '/client/login_page/index.html'; }, 500);
}
