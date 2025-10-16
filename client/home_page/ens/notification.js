// Variables globales
let notifications = [];
let currentFilter = 'all';
let currentNotificationId = null;
let currentTeacherId = null;

// Configuration API
const API_BASE_URL = 'http://localhost:8080/api';

// Initialisation de la page
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuthentication()) {
        return;
    }
    displayUserInfo();
    initializeNotifications();
    setupEventListeners();
});

// Vérification de l'authentification
function checkAuthentication() {
    const token = getAuthToken();
    const currentUser = getCurrentUser();
    
    if (!token || !currentUser) {
        window.location.href = '/client/login_page/index.html';
        return false;
    }
    
    // Récupérer l'ID de l'enseignant connecté
    currentTeacherId = currentUser.id;
    return true;
}

// Utilitaires d'authentification
function getAuthToken() {
    return localStorage.getItem('accessToken');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'x-access-token': getAuthToken()
    };
}

// Fonction pour faire des appels API
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                ...getAuthHeaders(),
                ...options.headers
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('currentUser');
            window.location.href = '/client/login_page/index.html';
            return null;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.status === 204 ? null : await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showToast(`Erreur API: ${error.message}`, 'error');
        return null;
    }
}

// Initialisation des notifications depuis l'API
async function initializeNotifications() {
    await loadNotificationsFromAPI();
    updateNotificationBadge();
}

// Charger les notifications depuis l'API pour l'enseignant connecté
async function loadNotificationsFromAPI() {
    if (!currentTeacherId) {
        console.error('ID enseignant non disponible');
        return;
    }

    try {
        const data = await apiCall(`/notifications/${currentTeacherId}`);
        if (data && Array.isArray(data)) {
            // Transformer les données API au format attendu par l'interface
            notifications = data.map(notification => ({
                id: notification.id,
                title: notification.titre,
                content: notification.message,
                type: mapAPITypeToLocal(notification.type),
                date: notification.cree_a,
                read: notification.lu,
                priority: determinePriority(notification.type),
                informations_supplementaires: notification.informations_supplementaires
            }));
        } else {
            notifications = [];
        }
        loadNotifications();
    } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error);
        notifications = [];
        loadNotifications();
    }
}

// Mapper les types API vers les types locaux
function mapAPITypeToLocal(apiType) {
    const typeMapping = {
        'course': 'course',
        'schedule': 'schedule',
        'system': 'system',
        'announcement': 'system'
    };
    return typeMapping[apiType] || 'system';
}

// Déterminer la priorité basée sur le type
function determinePriority(type) {
    const priorityMapping = {
        'course': 'high',
        'grade': 'medium',
        'schedule': 'high',
        'system': 'low',
        'announcement': 'medium'
    };
    return priorityMapping[type] || 'medium';
}

function displayUserInfo() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    document.getElementById('userName').textContent = currentUser.nom || 'Enseignant';
    
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        // Essayer de charger la photo de profil depuis l'API
        loadUserProfile(currentUser.id).then(profile => {
            if (profile && profile.photo) {
                userAvatar.innerHTML = `<img src="${profile.photo}" alt="Photo de profil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                userAvatar.textContent = currentUser.nom.charAt(0).toUpperCase();
            }
        }).catch(() => {
            userAvatar.textContent = currentUser.nom.charAt(0).toUpperCase();
        });
    }
}

// Charger le profil utilisateur
async function loadUserProfile(userId) {
    try {
        const profile = await apiCall(`/profil/${userId}`);
        return profile;
    } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        return null;
    }
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Filtres
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            setActiveFilter(filter);
            filterNotifications(filter);
        });
    });
    
    // Boutons d'action
    const markAllBtn = document.querySelector('.btn-secondary');
    if (markAllBtn && markAllBtn.textContent.includes('Tout marquer')) {
        markAllBtn.addEventListener('click', markAllAsRead);
    }
    
    const refreshBtn = document.querySelector('.btn-primary');
    if (refreshBtn && refreshBtn.textContent.includes('Actualiser')) {
        refreshBtn.addEventListener('click', refreshNotifications);
    }
}

// Charger et afficher les notifications
function loadNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    const noNotifications = document.getElementById('noNotifications');
    
    if (!notificationsList) return;
    
    // Filtrer les notifications selon le filtre actuel
    const filteredNotifications = getFilteredNotifications();
    
    if (filteredNotifications.length === 0) {
        notificationsList.style.display = 'none';
        noNotifications.style.display = 'block';
        return;
    }
    
    notificationsList.style.display = 'block';
    noNotifications.style.display = 'none';
    
    // Trier par date (plus récentes en premier)
    const sortedNotifications = filteredNotifications.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    // Générer le HTML des notifications
    notificationsList.innerHTML = sortedNotifications.map(notification => 
        createNotificationHTML(notification)
    ).join('');
    
    // Ajouter les écouteurs d'événements aux notifications
    addNotificationEventListeners();
}

// Créer le HTML d'une notification
function createNotificationHTML(notification) {
    const isUnread = !notification.read;
    const timeAgo = getTimeAgo(notification.date);
    const typeIcon = getTypeIcon(notification.type);
    const priorityClass = getPriorityClass(notification.priority);
    
    return `
        <div class="notification-item ${notification.type} ${isUnread ? 'unread' : ''}" 
             data-id="${notification.id}" data-priority="${notification.priority}">
            <div class="notification-header">
                <div>
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-meta">
                        <span class="notification-type ${notification.type}">
                            <i class="${typeIcon}"></i> ${getTypeLabel(notification.type)}
                        </span>
                        <span class="notification-date">${timeAgo}</span>
                    </div>
                </div>
            </div>
            <div class="notification-content">${notification.content}</div>
            <div class="notification-actions">
                ${isUnread ? `
                    <button class="btn-mark-read" onclick="markAsRead(${notification.id})">
                        <i class="fas fa-check"></i> Marquer comme lu
                    </button>
                ` : ''}
                <button class="btn-delete" onclick="deleteNotification(${notification.id})">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            </div>
        </div>
    `;
}

// Ajouter les écouteurs d'événements aux notifications
function addNotificationEventListeners() {
    const notificationItems = document.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Ne pas ouvrir la modal si on clique sur un bouton d'action
            if (e.target.closest('.notification-actions')) {
                return;
            }
            
            const notificationId = parseInt(this.getAttribute('data-id'));
            showNotificationModal(notificationId);
        });
    });
}

// Filtrer les notifications
function getFilteredNotifications() {
    switch (currentFilter) {
        case 'unread':
            return notifications.filter(n => !n.read);
        case 'courses':
            return notifications.filter(n => n.type === 'course');
        case 'system':
            return notifications.filter(n => n.type === 'system');
        case 'schedule':   
            return notifications.filter(n => n.type === 'schedule');
        default:
            return notifications;
    }
}

// Définir le filtre actif
function setActiveFilter(filter) {
    currentFilter = filter;
    
    // Mettre à jour l'interface
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// Filtrer les notifications
function filterNotifications(filter) {
    setActiveFilter(filter);
    loadNotifications();
}

// Marquer toutes les notifications comme lues
async function markAllAsRead() {
    const unreadNotifications = notifications.filter(n => !n.read);
    
    if (unreadNotifications.length === 0) {
        showToast('Aucune notification non lue', 'info');
        return;
    }

    try {
        let successCount = 0;
        for (const notification of unreadNotifications) {
            const result = await apiCall(`/notifications/${notification.id}/lu`, {
                method: 'PUT'
            });
            if (result !== null) {
                notification.read = true;
                successCount++;
            }
        }
        
        if (successCount > 0) {
            updateNotificationBadge();
            loadNotifications();
            showToast(`${successCount} notifications marquées comme lues`, 'success');
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    }
}

// Marquer une notification comme lue
async function markAsRead(notificationId) {
    try {
        const result = await apiCall(`/notifications/${notificationId}/lu`, {
            method: 'PUT'
        });
        
        if (result !== null) {
            const notification = notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                updateNotificationBadge();
                loadNotifications();
                showToast('Notification marquée comme lue', 'success');
            }
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        showToast('Erreur lors de la mise à jour', 'error');
    }
}

// Supprimer une notification
async function deleteNotification(notificationId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) {
        return;
    }

    try {
        await apiCall(`/notifications/${notificationId}`, {
            method: 'DELETE'
        });
        
        // Supprimer de la liste locale
        notifications = notifications.filter(n => n.id !== notificationId);
        updateNotificationBadge();
        loadNotifications();
        showToast('Notification supprimée', 'success');
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

// Actualiser les notifications
async function refreshNotifications() {
    const refreshBtn = document.querySelector('.btn-primary');
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualisation...';
        refreshBtn.disabled = true;
    }
    
    try {
        await loadNotificationsFromAPI();
        showToast('Notifications actualisées', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'actualisation:', error);
        showToast('Erreur lors de l\'actualisation', 'error');
    } finally {
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualiser';
            refreshBtn.disabled = false;
        }
    }
}

// Afficher la modal de détails d'une notification
function showNotificationModal(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;
    
    currentNotificationId = notificationId;
    
    // Remplir la modal
    document.getElementById('modalTitle').textContent = notification.title;
    document.getElementById('modalType').textContent = getTypeLabel(notification.type);
    document.getElementById('modalDate').textContent = formatDate(notification.date);
    document.getElementById('modalContent').textContent = notification.content;
    
    // Afficher la modal
    document.getElementById('notificationModal').style.display = 'block';
    
    // Marquer comme lue si ce n'est pas déjà fait
    if (!notification.read) {
        markAsRead(notificationId);
    }
}

// Fermer la modal de notification
function closeNotificationModal() {
    document.getElementById('notificationModal').style.display = 'none';
    currentNotificationId = null;
}

// Marquer comme lu depuis la modal
function markAsReadFromModal() {
    if (currentNotificationId) {
        markAsRead(currentNotificationId);
        closeNotificationModal();
    }
}

// Mettre à jour le badge de notification
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        const unreadCount = notifications.filter(n => !n.read).length;
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

// Obtenir l'icône selon le type
function getTypeIcon(type) {
    const icons = {
        course: 'fas fa-chalkboard',
        system: 'fas fa-cog',
        schedule: 'fas fa-calendar-alt'
    };
    return icons[type] || 'fas fa-bell';
}

// Obtenir le label selon le type
function getTypeLabel(type) {
    const labels = {
        course: 'Cours',
        system: 'Système',
        schedule: 'Planning'
    };
    return labels[type] || 'Notification';
}

// Obtenir la classe de priorité
function getPriorityClass(priority) {
    return `priority-${priority}`;
}

// Obtenir le temps écoulé
function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'À l\'instant';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    } else {
        return formatDate(dateString);
    }
}

// Formater une date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Afficher un toast de notification
function showToast(message, type = 'info') {
    // Créer l'élément toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Ajouter les styles
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: slideInRight 0.3s ease;
    `;
    
    // Ajouter l'animation CSS si elle n'existe pas
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Supprimer le toast après 3 secondes
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Fonctions de navigation (à utiliser depuis d'autres pages)
function showProfile() {
    window.location.href = 'profile.html';
}

function goBack() {
    window.history.back();
}

// Exposer les fonctions globalement pour les boutons HTML
window.showNotifications = function() {
    // Cette fonction est appelée depuis la page principale
    window.location.href = 'notification.html';
};

window.markAllAsRead = markAllAsRead;
window.refreshNotifications = refreshNotifications;
window.markAsRead = markAsRead;
window.deleteNotification = deleteNotification;
window.showNotificationModal = showNotificationModal;
window.closeNotificationModal = closeNotificationModal;
window.markAsReadFromModal = markAsReadFromModal;
window.showProfile = showProfile;
window.goBack = goBack;

// Actualisation automatique toutes les 30 secondes
setInterval(async () => {
    try {
        await loadNotificationsFromAPI();
    } catch (error) {
        console.error('Erreur lors de l\'actualisation automatique:', error);
    }
}, 30000);