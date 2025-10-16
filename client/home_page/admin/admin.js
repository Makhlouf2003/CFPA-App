console.log('CFPA Admin Dashboard - Version 2.0');

const API_BASE_URL = 'http://localhost:8080/api';

// Données de base (peuvent être remplacées par des données réelles)
let users = Array.isArray(JSON.parse(localStorage.getItem('users') || '[]'))
    ? JSON.parse(localStorage.getItem('users') || '[]')
    : [];
    
let formations = Array.isArray(JSON.parse(localStorage.getItem('formations') || '[]'))
    ? JSON.parse(localStorage.getItem('formations') || '[]')
    : ['Informatique', 'Électronique', 'Mécanique', 'Couture', 'Coiffure', 'Comptabilité', 'Langues'];

// ========== FONCTIONS DE NAVIGATION ==========
function showDashboard() {
    location.reload();
}

function showUserManagement() {
    window.location.href = 'gestion_utilisateurs.html';
}

function showGroupManagement() {
    window.location.href = 'groupes_classes.html';
}

function showScheduleManagement() {
    window.location.href = 'emploi_tmp.html';
}

function showStatistics() {
    // Fonction à implémenter
    console.log('Affichage des statistiques');
}

function showSettings() {
    // Fonction à implémenter
    console.log('Affichage des paramètres');
}

function showNotifications() {
    const saved = localStorage.getItem('cfpa_notifications');
    if (saved) {
        try {
            const notifications = JSON.parse(saved);
            notifications.forEach(n => n.isRead = true);
            localStorage.setItem('cfpa_notifications', JSON.stringify(notifications));
            updateNotificationBadge();
        } catch (error) {
            console.warn('Erreur lors de la mise à jour des notifications:', error);
        }
    }
    window.location.href = 'notification.html';
}

// ========== FONCTIONS DE GESTION DES DONNÉES ==========
function updateStatistics() {
    const totalUsers = Array.isArray(users) ? users.length : 0;
    const totalTeachers = Array.isArray(users) ? users.filter(u => u.role === 'Enseignant').length : 0;
    const totalTrainees = Array.isArray(users) ? users.filter(u => u.role === 'Stagiaire').length : 0;

    const totalUsersEl = document.getElementById('totalUsers');
    const totalTeachersEl = document.getElementById('totalTeachers');
    const totalTraineesEl = document.getElementById('totalTrainees');

    if (totalUsersEl) totalUsersEl.textContent = totalUsers;
    if (totalTeachersEl) totalTeachersEl.textContent = totalTeachers;
    if (totalTraineesEl) totalTraineesEl.textContent = totalTrainees;
}

function updateNotificationBadge() {
    // Charger les notifications depuis localStorage
    const saved = localStorage.getItem('cfpa_notifications');
    let unreadCount = 0;
    
    if (saved) {
        try {
            const notifications = JSON.parse(saved);
            unreadCount = notifications.filter(n => !n.isRead).length;
        } catch (error) {
            console.warn('Erreur lors du chargement des notifications:', error);
        }
    }
    
    // Mettre à jour le badge dans la sidebar
    const sidebarBadge = document.getElementById('adminNotifCount');
    if (sidebarBadge) {
        sidebarBadge.textContent = unreadCount;
        // Masquer le badge s'il n'y a pas de notifications non lues
        sidebarBadge.style.display = unreadCount > 0 ? 'inline' : 'none';
    }
    
    // Mettre à jour le badge dans le header
    const headerBadge = document.querySelector('.notification-badge');
    if (headerBadge) {
        headerBadge.textContent = unreadCount;
        headerBadge.style.display = unreadCount > 0 ? 'inline' : 'none';
    }
}

// ========== FONCTIONS MODALES ==========
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Fonction de déconnexion
function logout() {
    openModal('logoutModal');
}

function confirmLogout() {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';

    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');

    setTimeout(() => {
        window.location.href = '/client/login_page/index.html';
    }, 500);
}

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mainContent = document.getElementById('mainContent');
    const menuToggle = document.getElementById('menuToggle');
    
    // Toggle sidebar collapse/expand
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
            
            // Sauvegarder l'état
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });
    }
    
    // Mobile menu toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
        });
    }
    
    // Restaurer l'état du sidebar
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }
    
    // Initialisation des données
    updateStatistics();
    updateNotificationBadge();
});