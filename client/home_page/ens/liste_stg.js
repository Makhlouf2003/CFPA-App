console.log('Liste des Stagiaires - Version Simple');

// ---------- CONFIG API ----------
const API_BASE_URL = 'http://localhost:8080/api';
let authToken = localStorage.getItem('accessToken') || null;

let allStudents = [];
let filteredStudents = [];
let selectedStudent = null;

// ---------- HELPERS API ----------
function getAuthHeaders(isForm = false) {
    const headers = {};
    if (!isForm) headers['Content-Type'] = 'application/json';
    authToken = localStorage.getItem('accessToken') || authToken;
    if (authToken) headers['x-access-token'] = authToken;
    return headers;
}

async function apiRequest(path, options = {}) {
    const { isForm = false, headers: customHeaders = {}, ...rest } = options;
    const headers = { ...getAuthHeaders(isForm), ...customHeaders };
    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...rest,
            headers,
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Session expirée — veuillez vous reconnecter', 'error');
                localStorage.removeItem('accessToken');
                window.location.href = 'index.html';
                return null;
            }
            let errData = null;
            try { errData = await response.json(); } catch (e) { /* ignore */ }
            throw new Error((errData && errData.message) ? errData.message : `Erreur (${response.status})`);
        }
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (err) {
        console.error('apiRequest error', err);
        throw err;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

async function initializePage() {
    console.log('Initialisation de la page - Chargement des stagiaires');
    showLoading(true);
    
    await displayUserInfo();
    setupEventListeners();
    
    try {
        await loadAllStudents();
    } catch (err) {
        console.warn('Impossible de charger les stagiaires depuis l\'API:', err.message);
        showNotification('Erreur lors du chargement des stagiaires', 'error');
        allStudents = [];
    }
    
    filteredStudents = [...allStudents];
    renderStudents();
    updateStudentsSummary();
    updateNotificationBadge();
    showLoading(false);
}

// ---------- CHARGEMENT DES STAGIAIRES DEPUIS L'API ----------

function getCurrentUserId() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            return user.id || user.userId || user.id_user;
        } catch (e) {
            console.error('Erreur parsing currentUser:', e);
        }
    }
    return null;
}

async function loadAllStudents() {
    // Récupérer l'ID de l'enseignant depuis le localStorage
    const savedCurrent = localStorage.getItem('currentUser') || localStorage.getItem('teacherProfile');
    if (!savedCurrent) {
        throw new Error('Aucun utilisateur trouvé dans localStorage');
    }

    let user = {};
    try { 
        user = JSON.parse(savedCurrent); 
    } catch (e) { 
        throw new Error('Erreur parsing user data'); 
    }
    
    const teacherId = user.id || user.userId || user.id_user;
    if (!teacherId) {
        throw new Error('Impossible de déterminer l\'ID de l\'enseignant');
    }

    console.log('Chargement des stagiaires pour l\'enseignant ID:', teacherId);

    allStudents = [];
    const addedStudentIds = new Set();

    // 1. Récupérer les modules de l'enseignant
    let teacherModules = [];
    try {
        teacherModules = await apiRequest(`/utilisateur-modules/teacher/${teacherId}`, { method: 'GET' });
    } catch (err) {
        console.warn('Endpoint utilisateur-modules indisponible, essai alternatif');
        try {
            teacherModules = await apiRequest(`/modules/enseignant/${teacherId}`, { method: 'GET' });
        } catch (err2) {
            throw new Error('Impossible de récupérer les modules de l\'enseignant');
        }
    }

    if (!teacherModules || teacherModules.length === 0) {
        console.log('Aucun module assigné à cet enseignant');
        return;
    }

    // 1.b - Tenter de récupérer tous les profils d'un coup (plus efficace)
    let profilsMap = {};
    try {
        const profilsList = await apiRequest(`/profil/`, { method: 'GET' }); // nécessite rôle enseignant/admin
        if (Array.isArray(profilsList)) {
            profilsList.forEach(p => {
                if (p && p.utilisateurId) profilsMap[p.utilisateurId] = p;
            });
        }
    } catch (err) {
        console.warn('Impossible de récupérer la liste des profils globalement:', err.message);
        // On ne throw pas : on fera des requêtes individuelles plus bas en fallback
    }

    // 2. Pour chaque module, récupérer les stagiaires associés
    for (const moduleInfo of teacherModules) {
        const moduleId = moduleInfo.moduleId ?? moduleInfo.id ?? moduleInfo.module_id;
        const moduleName = moduleInfo.moduleNom ?? moduleInfo.nom ?? moduleInfo.moduleName ?? `Module ${moduleId}`;
        const groupeId = moduleInfo.groupeId ?? moduleInfo.groupe_id;

        if (!moduleId) continue;

        // Essayer de récupérer les stagiaires du module
        let moduleStudents = [];
        try {
            moduleStudents = await apiRequest(`/utilisateur-modules/students/${moduleId}`, { method: 'GET' });
        } catch (err) {
            console.warn(`Endpoint students/${moduleId} non disponible, essai par groupe`);
            
            // Fallback: récupérer par groupe
            if (groupeId) {
                try {
                    moduleStudents = await apiRequest(`/utilisateur-groupes/group/${groupeId}`, { method: 'GET' });
                } catch (err2) {
                    console.warn(`Erreur chargement groupe ${groupeId}:`, err2.message);
                    continue;
                }
            }
        }

        // Traiter les stagiaires de ce module
        for (const studentRow of moduleStudents) {
            const studentId = studentRow.stagiaireId || studentRow.utilisateurId || studentRow.id;
            const studentNom = studentRow.stagiaireNom || studentRow.nom || 'Nom inconnu';
            const studentEmail = studentRow.email || studentRow.utilisateur?.email || '';
            const groupeNom = studentRow.groupeNom || studentRow.groupe?.nom || 'Non assigné';

            // Éviter les doublons
            if (!studentId || addedStudentIds.has(studentId)) continue;
            addedStudentIds.add(studentId);

            // Séparer prénom et nom
            const nameParts = studentNom.split(' ');
            const firstName = nameParts[0] || 'Prénom';
            const lastName = nameParts.slice(1).join(' ') || 'Nom';

            // Defaults
            let matricule = `STG${studentId.toString().padStart(4, '0')}`; // fallback
            let photo = null;

            // Récupérer le profil (preferer la map si dispo)
            let profil = profilsMap[studentId];
            if (!profil) {
                try {
                    profil = await apiRequest(`/profil/${studentId}`, { method: 'GET' });
                } catch (err) {
                    // profil peut ne pas être accessible (403) => on garde fallback
                    console.warn(`Impossible de charger le profil du stagiaire ${studentId}:`, err.message);
                }
            }

            if (profil) {
                if (profil.numero_carte_identite) {
                    matricule = profil.numero_carte_identite;
                }
                if (profil.photo) {
                    photo = profil.photo;
                }
            }

            const newStudent = {
                id: studentId,
                serverId: studentId,
                firstName: firstName,
                lastName: lastName,
                fullName: `${firstName} ${lastName}`,
                matricule: matricule,
                email: studentEmail,
                photo: photo,
                groupe: groupeNom,
                module: moduleName,
                moduleId: moduleId
            };

            allStudents.push(newStudent);
        }
    }

    console.log(`Total de ${allStudents.length} stagiaires chargés`);
}

//---------- Fonctions d'affichage et d'interface utilisateur ----------//
async function displayUserInfo() {
    const savedCurrent = localStorage.getItem('currentUser') || localStorage.getItem('teacherProfile');
    let currentUser = { name: 'Enseignant' };

    if (savedCurrent) {
        try {
            const profile = JSON.parse(savedCurrent);
            currentUser.id = profile.id || profile.userId || profile.id_user;
            currentUser.name = profile.nom || profile.firstName || profile.name || 'Enseignant';
        } catch (e) {
            console.warn('displayUserInfo parse error', e);
        }
    }

    // Appel API profil
    if (currentUser.id) {
        try {
            const profil = await apiRequest(`/profil/${currentUser.id}`, { method: 'GET' });
            if (profil && profil.photo) {
                currentUser.photo = profil.photo;
            }
        } catch (err) {
            console.warn('Impossible de charger le profil:', err.message);
        }
    }

    // Mise à jour UI
    const elName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    if (elName) elName.textContent = currentUser.name;

    if (userAvatar) {
        if (currentUser.photo) {
            userAvatar.innerHTML = `<img src="${currentUser.photo}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
            userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
        }
    }
}

function setupEventListeners() {
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

function showLoading(show) {
    const container = document.getElementById('studentsList');
    if (show) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <h3>Chargement des stagiaires...</h3>
                <p>Veuillez patienter</p>
            </div>
        `;
    }
}

//---------- Rendu des stagiaires ----------//
function renderStudents() {
    const container = document.getElementById('studentsList');
    
    if (filteredStudents.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-graduate"></i>
                <h3>Aucun stagiaire trouvé</h3>
                <p>Aucun stagiaire ne correspond à vos critères de recherche.</p>
            </div>
        `;
        return;
    }

    const studentsHTML = filteredStudents.map(student => `
        <div class="student-card">
            <div class="student-photo">
                ${student.photo ? 
                    `<img src="${student.photo}" alt="Photo de ${student.firstName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : 
                    `<div class="student-initials">${student.firstName.charAt(0).toUpperCase()}${student.lastName.charAt(0).toUpperCase()}</div>`
                }
            </div>
            <div class="student-info">
                <h4>${student.firstName} ${student.lastName}</h4>
                <div class="student-matricule">Matricule: ${student.matricule}</div>
                ${student.groupe ? `<div class="student-group">Groupe: ${student.groupe}</div>` : ''}
                <a href="mailto:${student.email}" class="student-email">
                    <i class="fas fa-envelope"></i> ${student.email}
                </a>
            </div>
            <div class="student-actions">
                <button class="contact-btn" onclick="showContactModal(${student.id})">
                    <i class="fas fa-envelope"></i> Contact
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = studentsHTML;
}

function updateStudentsSummary() {
    const totalElement = document.getElementById('totalStudents');
    if (totalElement) {
        totalElement.textContent = allStudents.length;
    }
}

//---------- Fonctions de contact ----------//
function showContactModal(studentId) {
    selectedStudent = allStudents.find(s => s.id === studentId);
    if (selectedStudent) {
        const contactInfo = document.getElementById('contactInfo');
        contactInfo.innerHTML = `
            <div class="student-photo">
                ${selectedStudent.photo ? 
                    `<img src="${selectedStudent.photo}" alt="Photo de ${selectedStudent.firstName}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;margin-bottom:1rem;">` : 
                    `<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(45deg,#007bff,#0056b3);color:white;display:flex;align-items:center;justify-content:center;font-size:2rem;margin-bottom:1rem;">${selectedStudent.firstName.charAt(0).toUpperCase()}${selectedStudent.lastName.charAt(0).toUpperCase()}</div>`
                }
            </div>
            <h4>${selectedStudent.firstName} ${selectedStudent.lastName}</h4>
            <p><strong>Matricule:</strong> ${selectedStudent.matricule}</p>
            <p><strong>Email:</strong> ${selectedStudent.email}</p>
            ${selectedStudent.groupe ? `<p><strong>Groupe:</strong> ${selectedStudent.groupe}</p>` : ''}
        `;
        document.getElementById('contactModal').style.display = 'block';
    }
}

function closeContactModal() {
    document.getElementById('contactModal').style.display = 'none';
    selectedStudent = null;
}

function sendEmail() {
    if (selectedStudent) {
        const subject = encodeURIComponent(`Contact depuis CFPA - ${selectedStudent.firstName} ${selectedStudent.lastName}`);
        const body = encodeURIComponent(`Bonjour ${selectedStudent.firstName},\n\n`);
        window.open(`mailto:${selectedStudent.email}?subject=${subject}&body=${body}`);
        closeContactModal();
    }
}

function sendMessage() {
    if (selectedStudent) {
        showNotification(`Message envoyé à ${selectedStudent.firstName} ${selectedStudent.lastName}`, 'success');
        closeContactModal();
    }
}

//---------- Fonction de recherche ----------//
function searchStudents() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredStudents = [...allStudents];
    } else {
        filteredStudents = allStudents.filter(student => {
            const fullName = student.fullName.toLowerCase();
            const matricule = student.matricule.toLowerCase();
            const email = student.email.toLowerCase();
            const groupe = (student.groupe || '').toLowerCase();
            
            return fullName.includes(searchTerm) || 
                   matricule.includes(searchTerm) || 
                   email.includes(searchTerm) ||
                   groupe.includes(searchTerm);
        });
    }
    
    renderStudents();
}

// Fonction pour rafraîchir les données depuis l'API
async function refreshData() {
    try {
        showNotification('Actualisation des données...', 'info');
        showLoading(true);
        await loadAllStudents();
        filteredStudents = [...allStudents];
        renderStudents();
        updateStudentsSummary();
        showNotification('Données actualisées avec succès', 'success');
        showLoading(false);
    } catch (err) {
        console.error('Erreur lors de l\'actualisation:', err);
        showNotification('Erreur lors de l\'actualisation des données', 'error');
        showLoading(false);
    }
}

async function loadNotificationsFromAPI() {
    const userId = getCurrentUserId();
    if (!userId) return [];
    try {
        const notifications = await apiRequest(`/notifications/${userId}`, { method: 'GET' });
        return notifications || [];
    } catch (error) {
        console.error('Erreur chargement notifications API:', error);
        return [];
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(45deg, #28a745, #20c997)' : 
                    type === 'error' ? 'linear-gradient(45deg, #dc3545, #c82333)' : 
                    'linear-gradient(45deg, #007bff, #0056b3)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
        max-width: 350px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

function goBack() {
    window.history.back();
}

function showProfile() {
    window.location.href = 'profile.html';
}

function showNotifications() {
    window.location.href = 'notification.html';
}

//---------- Fonction pour mettre à jour le badge de notification ----------//
async function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    try {
        const notifications = await loadNotificationsFromAPI();
        const unreadCount = notifications.filter(n => !n.lu).length; 
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    } catch (error) {
        console.error('Erreur mise à jour badge notifications:', error);
        badge.style.display = 'none';
    }
}

console.log('Liste des Stagiaires - Version Simple chargée avec succès');