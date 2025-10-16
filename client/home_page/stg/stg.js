console.log('Espace Stagiaire - Version 2.0 (API Integration)');

// Configuration API
const API_BASE_URL = 'http://localhost:8080/api';

// Variables globales
let currentUser = null;
let userProfile = null;
let dashboardStats = null;

//---------- Initialiser la page au chargement ----------//
document.addEventListener('DOMContentLoaded', function() {
    initStudent();
});

//---------- Initialiser l'interface stagiaire ----------//
async function initStudent() {
    try {
        // Charger l'utilisateur connecté
        await loadCurrentUser();
        
        if (!currentUser) {
            showError('Utilisateur non connecté. Redirection vers la page de connexion...');
            setTimeout(() => {
                window.location.href = '/client/login_page/index.html';
            }, 2000);
            return;
        }

        // Charger les données en parallèle
        await Promise.all([
            loadUserProfile(),
            loadDashboardStats(),
            updateNotificationBadge()
        ]);
        
        // Afficher les informations
        displayUserInfo();
        updateDashboardStats();
        recalcAverageFromModules();
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showError(`Erreur de chargement: ${error.message}`);
    }
}

//---------- Fonctions de chargement des données ----------//
async function loadCurrentUser() {
    // Récupérer depuis localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
        } catch (e) {
            console.error('Erreur parsing currentUser:', e);
        }
    }
    
    // Vérifier le token
    const token = localStorage.getItem('accessToken');
    if (!token || !currentUser || !currentUser.id) {
        throw new Error('Utilisateur non connecté');
    }
}

async function loadUserProfile() {
    try {
        userProfile = await apiCall(`/profil/${currentUser.id}`, 'GET');
    } catch (error) {
        console.warn('Impossible de charger le profil:', error.message);
        // Continuer sans profil
        userProfile = null;
    }
}

async function loadDashboardStats() {
    try {
        dashboardStats = await apiCall('/dashboard', 'GET');
    } catch (error) {
        console.warn('Impossible de charger les statistiques:', error.message);
        // Utiliser des valeurs par défaut
        dashboardStats = {
            modulesWithNotes: 0,
            averageGrade: 0,
            availableCourses: 0
        };
    }
}

//---------- Afficher les informations de l'utilisateur ----------//
function displayUserInfo() {
    // Nom utilisateur
    let displayName = currentUser.nom || 'Stagiaire';
    
    // Si on a un profil avec plus d'informations
    if (userProfile) {
        // Utiliser le nom du profil s'il est disponible
        if (userProfile.prenom && userProfile.nom) {
            displayName = `${userProfile.prenom} ${userProfile.nom}`;
        }
    }
    
    // Mettre à jour le nom dans l'interface
    const userNameElements = document.querySelectorAll('#userName, #welcomeName');
    userNameElements.forEach(el => {
        if (el) el.textContent = displayName;
    });
    
    // Avatar utilisateur
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        if (userProfile && userProfile.photo) {
            userAvatar.innerHTML = `<img src="${userProfile.photo}" alt="Photo de profil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            userAvatar.textContent = displayName.charAt(0).toUpperCase();
        }
    }
    
    // Spécialité (si disponible sur la page)
    const specialityElement = document.getElementById('specialityName');
    if (specialityElement && userProfile && userProfile.specialite) {
        specialityElement.textContent = `Spécialité: ${userProfile.specialite}`;
        specialityElement.style.display = 'block';
    }
}

//---------- Mettre à jour les statistiques du dashboard ----------//
function updateDashboardStats() {
    if (!dashboardStats) return;
    
    // Modules avec notes
    const totalModulesElement = document.getElementById('totalModules');
    if (totalModulesElement) {
        totalModulesElement.textContent = dashboardStats.modulesWithNotes || 0;
    }
    
    // Cours disponibles
    const completedModulesElement = document.getElementById('completedModules');
    if (completedModulesElement) {
        completedModulesElement.textContent = dashboardStats.availableCourses || 0;
    }
    
    // Modules en cours (estimation basée sur les données disponibles)
    const inProgressModulesElement = document.getElementById('inProgressModules');
    if (inProgressModulesElement) {
        const inProgress = Math.max(0, (dashboardStats.availableCourses || 0) - (dashboardStats.modulesWithNotes || 0));
        inProgressModulesElement.textContent = inProgress;
    }
    
    // Moyenne générale
    const averageGradeElement = document.getElementById('averageGrade');
    if (averageGradeElement) {
        if (dashboardStats.averageGrade && dashboardStats.averageGrade > 0) {
            averageGradeElement.textContent = `${dashboardStats.averageGrade.toFixed(1)}/20`;
        } else {
            averageGradeElement.textContent = '--';
        }
    }
    
    // Progression globale
    const globalProgressElement = document.getElementById('globalProgress');
    if (globalProgressElement && dashboardStats.modulesWithNotes && dashboardStats.availableCourses) {
        const progress = Math.round((dashboardStats.modulesWithNotes / Math.max(dashboardStats.availableCourses, 1)) * 100);
        globalProgressElement.textContent = `${progress}%`;
    }
    
    // Mettre à jour les cours récents
    updateRecentCourses();
    
    // Mettre à jour le planning d'aujourd'hui
    updateTodaySchedule();
    
    // Mettre à jour les notes récentes
    updateRecentGrades();
}

async function recalcAverageFromModules() {
    if (!currentUser) return;

    try {
        const notes = await apiCall(`/notes/stagiaire/${currentUser.id}`, 'GET');
        if (!notes || notes.length === 0) return;

        // Regrouper les notes par module
        const moduleGroups = {};
        notes.forEach(n => {
            const moduleId = n.module.id;
            if (!moduleGroups[moduleId]) moduleGroups[moduleId] = [];
            moduleGroups[moduleId].push(parseFloat(n.note));
        });

        // Calcul des moyennes par module
        const moduleAverages = Object.values(moduleGroups).map(moduleNotes => {
            return moduleNotes.reduce((a, b) => a + b, 0) / moduleNotes.length;
        });

        // Moyenne générale = moyenne des moyennes
        const generalAverage = moduleAverages.reduce((a, b) => a + b, 0) / moduleAverages.length;

        // Mise à jour de l'affichage
        const averageGradeElement = document.getElementById('averageGrade');
        if (averageGradeElement) {
            averageGradeElement.textContent = `${generalAverage.toFixed(1)}/20`;
        }
    } catch (error) {
        console.error('Erreur lors du recalcul des moyennes:', error);
    }
}


//---------- Mettre à jour les cours récents ----------//
async function updateRecentCourses() {
    const recentCoursesElement = document.getElementById('recentCourses');
    if (!recentCoursesElement || !currentUser) return;
    
    try {
        const courses = await apiCall(`/stagiaires/${currentUser.id}/cours`, 'GET');
        
        if (courses && courses.length > 0) {
            // Prendre les 3 cours les plus récents
            const recentCourses = courses.slice(0, 3);
            
            recentCoursesElement.innerHTML = recentCourses.map(course => `
                <div class="recent-item">
                    <div class="item-icon">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="item-info">
                        <h4>${escapeHtml(course.titre || course.nomModule)}</h4>
                        <p>${escapeHtml(course.enseignantNom || 'Enseignant')}</p>
                    </div>
                </div>
            `).join('');
        } else {
            recentCoursesElement.innerHTML = '<p class="no-data">Aucun cours disponible</p>';
        }
    } catch (error) {
        console.warn('Erreur lors du chargement des cours:', error);
        recentCoursesElement.innerHTML = '<p class="error-data">Erreur de chargement</p>';
    }
}

//---------- Mettre à jour le planning d'aujourd'hui ----------//
async function updateTodaySchedule() {
    const todayScheduleElement = document.getElementById('todaySchedule');
    if (!todayScheduleElement || !currentUser) return;
    
    try {
        const schedule = await apiCall(`/horaires/stagiaire/${currentUser.id}`, 'GET');
        
        if (schedule && schedule.length > 0) {
            // Filtrer pour aujourd'hui
            const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
            const todayClasses = schedule.filter(item => 
                item.jour && item.jour.toLowerCase().includes(today.substring(0, 3))
            );
            
            if (todayClasses.length > 0) {
                todayScheduleElement.innerHTML = todayClasses.map(item => `
                    <div class="schedule-item">
                        <div class="schedule-time">
                            <i class="fas fa-clock"></i>
                            <span>${item.heure_debut} - ${item.heure_fin}</span>
                        </div>
                        <div class="schedule-info">
                            <h4>${escapeHtml(item.module ? item.module.nom : 'Module')}</h4>
                            <p>${escapeHtml(item.salle || 'Salle non définie')}</p>
                        </div>
                    </div>
                `).join('');
            } else {
                todayScheduleElement.innerHTML = '<p class="no-data">Aucun cours aujourd\'hui</p>';
            }
        } else {
            todayScheduleElement.innerHTML = '<p class="no-data">Planning non disponible</p>';
        }
    } catch (error) {
        console.warn('Erreur lors du chargement du planning:', error);
        todayScheduleElement.innerHTML = '<p class="error-data">Erreur de chargement</p>';
    }
}

//---------- Mettre à jour les notes récentes ----------//
async function updateRecentGrades() {
    const recentGradesElement = document.getElementById('recentGrades');
    if (!recentGradesElement || !currentUser) return;
    
    try {
        const notes = await apiCall(`/notes/stagiaire/${currentUser.id}`, 'GET');
        
        if (notes && notes.length > 0) {
            // Prendre les 3 notes les plus récentes
            const recentNotes = notes.slice(-3).reverse();
            
            recentGradesElement.innerHTML = recentNotes.map(note => {
                const gradeClass = note.note >= 10 ? 'good' : 'bad';
                return `
                    <div class="grade-item">
                        <div class="grade-module">
                            <h4>${escapeHtml(note.module ? note.module.nom : 'Module')}</h4>
                            <p>${formatDate(note.cree_a)}</p>
                        </div>
                        <div class="grade-value ${gradeClass}">
                            <span>${note.note}/20</span>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            recentGradesElement.innerHTML = '<p class="no-data">Aucune note disponible</p>';
        }
    } catch (error) {
        console.warn('Erreur lors du chargement des notes:', error);
        recentGradesElement.innerHTML = '<p class="error-data">Erreur de chargement</p>';
    }
}

//---------- Fonction de mise à jour des notifications ----------//
async function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge || !currentUser) return;
    
    try {
        const notifications = await apiCall(`/notifications/${currentUser.id}`, 'GET');
        const unreadCount = notifications.filter(n => !n.lu).length;
        
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    } catch (error) {
        console.warn('Impossible de charger les notifications:', error.message);
        badge.style.display = 'none';
    }
}

//---------- Fonctions pour les actions principales ----------//
function showProfile() {
    window.location.href = 'profile.html';
}

function showNotifications() {
    window.location.href = 'notification.html';
}

function showModules() {
    window.location.href = 'module.html';
}

function showGrades() {
    window.location.href = 'notes.html';
}

function showSchedule() {
    window.location.href = 'planning.html';
}

function showResources() {
    // À implémenter
    showAlert('Info', 'Fonctionnalité en cours de développement', 'info');
}

function showCommunication() {
    // À implémenter
    showAlert('Info', 'Fonctionnalité en cours de développement', 'info');
}

//---------- Fonction de déconnexion ----------//
function logout() {
    // Créer le modal de déconnexion s'il n'existe pas
    let logoutModal = document.getElementById('logoutModal');
    if (!logoutModal) {
        logoutModal = document.createElement('div');
        logoutModal.id = 'logoutModal';
        logoutModal.className = 'modal';
        logoutModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Confirmation de déconnexion</h3>
                </div>
                <div class="modal-body">
                    <p>Êtes-vous sûr de vouloir vous déconnecter ?</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal()">Annuler</button>
                    <button class="btn-primary" onclick="confirmLogout()">Se déconnecter</button>
                </div>
            </div>
        `;
        document.body.appendChild(logoutModal);
    }
    
    logoutModal.style.display = 'block';
}

function closeModal() {
    const logoutModal = document.getElementById('logoutModal');
    if (logoutModal) {
        logoutModal.style.display = 'none';
    }
}

function confirmLogout() {
    // Nettoyer le localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('studentProfile');
    
    // Animation de sortie
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        window.location.href = '/client/login_page/index.html';
    }, 500);
}

//---------- Fonction d'appel API ----------//
async function apiCall(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('accessToken');
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['x-access-token'] = token;
    }
    
    const config = {
        method: method,
        headers: headers
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(API_BASE_URL + endpoint, config);
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token expiré, rediriger vers login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
                return;
            }
            
            let errorMessage = `Erreur ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // Ignore les erreurs de parsing JSON
            }
            
            throw new Error(errorMessage);
        }
        
        const text = await response.text();
        return text ? JSON.parse(text) : null;
        
    } catch (error) {
        console.error('Erreur API:', error);
        throw error;
    }
}

//---------- Fonctions utilitaires ----------//
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return 'Date inconnue';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    showAlert('Erreur', message, 'error');
}

function showAlert(title, message, type = 'info') {
    // Créer une notification toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">
                <i class="fas ${getAlertIcon(type)}"></i>
            </div>
            <div class="toast-text">
                <strong>${title}</strong>
                <p>${message}</p>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Styles pour le toast
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getAlertColor(type)};
        color: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Auto-suppression après 5 secondes
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }, 5000);
}

function getAlertIcon(type) {
    const icons = {
        'error': 'fa-exclamation-circle',
        'success': 'fa-check-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

function getAlertColor(type) {
    const colors = {
        'error': '#e74c3c',
        'success': '#27ae60',
        'warning': '#f39c12',
        'info': '#3498db'
    };
    return colors[type] || '#3498db';
}

//---------- Fonctions de navigation (pour compatibilité) ----------//
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// Ajouter les styles CSS pour les animations
if (!document.getElementById('dynamicStyles')) {
    const styles = document.createElement('style');
    styles.id = 'dynamicStyles';
    styles.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .toast {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .toast-content {
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }
        
        .toast-icon {
            font-size: 1.2rem;
            margin-top: 2px;
        }
        
        .toast-text h4 {
            margin: 0 0 4px 0;
            font-size: 1rem;
            font-weight: 600;
        }
        
        .toast-text p {
            margin: 0;
            font-size: 0.9rem;
            opacity: 0.9;
        }
        
        .toast-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 4px;
            margin-left: auto;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        
        .toast-close:hover {
            opacity: 1;
        }
        
    `;
    document.head.appendChild(styles);
}