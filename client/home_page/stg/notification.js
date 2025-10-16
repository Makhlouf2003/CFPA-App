// Variables globales
let notifications = [];
let currentFilter = 'all';
let currentNotificationId = null;
let currentUserId = null;

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
        showError('Session expirée. Redirection vers la page de connexion...');
        setTimeout(() => {
            window.location.href = '/client/login_page/index.html';
        }, 2000);
        return false;
    }
    
    // Récupérer l'ID de l'utilisateur connecté (stagiaire)
    currentUserId = currentUser.id;
    return true;
}

// Utilitaires d'authentification
function getAuthToken() {
    // Essayer différents noms de tokens
    return localStorage.getItem('accessToken') || 
           localStorage.getItem('authToken') || 
           localStorage.getItem('x-access-token');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

function getAuthHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-access-token': token
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
            handleUnauthorized();
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

// Charger les notifications depuis l'API pour le stagiaire connecté
async function loadNotificationsFromAPI() {
    if (!currentUserId) {
        console.error('ID utilisateur non disponible');
        return;
    }

    showLoading(true);
    hideError();

    try {
        const data = await apiCall(`/notifications/${currentUserId}`);
        if (data && Array.isArray(data)) {
            // Transformer les données API au format attendu par l'interface
            notifications = data.map(notification => ({
                id: notification.id,
                title: notification.titre || 'Notification',
                content: notification.message || '',
                type: mapAPITypeToLocal(notification.type),
                date: notification.cree_a,
                read: notification.lu,
                priority: determinePriority(notification.type),
                informations_supplementaires: notification.informations_supplementaires
            }));
        } else {
            notifications = [];
        }
        displayNotifications();
    } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error);
        notifications = [];
        displayNotifications();
        showError('Impossible de charger les notifications. ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Mapper les types API vers les types locaux
function mapAPITypeToLocal(apiType) {
    const typeMapping = {
        'note': 'note',
        'cours': 'cours', 
        'planning': 'planning',
        'system': 'system',
        'announcement': 'system'
    };
    return typeMapping[apiType] || 'system';
}

// Déterminer la priorité basée sur le type
function determinePriority(type) {
    const priorityMapping = {
        'note': 'high',
        'cours': 'medium',
        'planning': 'high',
        'system': 'low',
        'announcement': 'medium'
    };
    return priorityMapping[type] || 'medium';
}

function displayUserInfo() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    document.getElementById('userName').textContent = currentUser.nom || 'Stagiaire';
    
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        // Essayer de charger la photo de profil depuis l'API
        loadUserProfile(currentUser.id).then(profile => {
            if (profile && profile.photo) {
                userAvatar.innerHTML = `<img src="${profile.photo}" alt="Photo de profil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                userAvatar.textContent = currentUser.nom ? currentUser.nom.charAt(0).toUpperCase() : 'S';
            }
        }).catch(() => {
            userAvatar.textContent = currentUser.nom ? currentUser.nom.charAt(0).toUpperCase() : 'S';
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

    // Fermer la modal en cliquant en dehors
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('notificationModal');
        if (event.target === modal) {
            closeNotificationModal();
        }
    });

    // Fermer la modal avec la touche Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeNotificationModal();
        }
    });
}

// Afficher les notifications
function displayNotifications() {
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
    
    return `
        <div class="notification-item ${notification.type || 'system'} ${isUnread ? 'unread' : ''}" 
             data-id="${notification.id}">
            <div class="notification-header">
                <div>
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-meta">
                        <span class="notification-type ${notification.type || 'system'}">
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
        case 'note':
            return notifications.filter(n => n.type === 'note');
        case 'cours':
            return notifications.filter(n => n.type === 'cours');
        case 'planning':
            return notifications.filter(n => n.type === 'planning');
        case 'system':
            return notifications.filter(n => n.type === 'system' || !n.type);
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
    displayNotifications();
}

// Marquer toutes les notifications comme lues
async function markAllAsRead() {
    const unreadNotifications = notifications.filter(n => !n.read);
    
    if (unreadNotifications.length === 0) {
        showToast('Toutes les notifications sont déjà marquées comme lues', 'info');
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
            displayNotifications();
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
                displayNotifications();
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
        const result = await apiCall(`/notifications/${notificationId}`, {
            method: 'DELETE'
        });
        
        if (result !== null || result === null) { // DELETE retourne souvent null
            // Supprimer de la liste locale
            notifications = notifications.filter(n => n.id !== notificationId);
            updateNotificationBadge();
            displayNotifications();
            showToast('Notification supprimée', 'success');
        }
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
    document.getElementById('modalType').className = `notification-type ${notification.type || 'system'}`;
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
        note: 'fas fa-graduation-cap',
        cours: 'fas fa-book',
        planning: 'fas fa-calendar',
        system: 'fas fa-info-circle'
    };
    return icons[type] || 'fas fa-bell';
}

// Obtenir le label selon le type
function getTypeLabel(type) {
    const labels = {
        note: 'Notes',
        cours: 'Cours',
        planning: 'Planning',
        system: 'Système'
    };
    return labels[type] || 'Notification';
}

// Obtenir le temps écoulé
function getTimeAgo(dateString) {
    if (!dateString) return 'Date inconnue';
    
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
    if (!dateString) return 'Date inconnue';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Afficher/masquer le spinner de chargement
function showLoading(show) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const notificationsList = document.getElementById('notificationsList');
    const noNotifications = document.getElementById('noNotifications');
    
    if (show) {
        if (loadingSpinner) loadingSpinner.style.display = 'block';
        if (notificationsList) notificationsList.style.display = 'none';
        if (noNotifications) noNotifications.style.display = 'none';
    } else {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

// Afficher un message d'erreur
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const notificationsList = document.getElementById('notificationsList');
    const noNotifications = document.getElementById('noNotifications');
    
    if (errorMessage && errorText) {
        errorText.textContent = message;
        errorMessage.style.display = 'block';
        if (notificationsList) notificationsList.style.display = 'none';
        if (noNotifications) noNotifications.style.display = 'none';
    }
}

// Masquer le message d'erreur
function hideError() {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

// Gérer l'erreur d'autorisation
function handleUnauthorized() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('x-access-token');
    localStorage.removeItem('currentUser');
    showToast('Session expirée. Redirection vers la page de connexion...', 'error');
    setTimeout(() => {
        window.location.href = '/client/login_page/index.html';
    }, 2000);
}

// Afficher un toast de notification
function showToast(message, type = 'info') {
    // Créer l'élément toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Ajouter les styles
    const backgroundColor = type === 'success' ? 'linear-gradient(45deg, #27ae60, #2ecc71)' :
                          type === 'error' ? 'linear-gradient(45deg, #e74c3c, #c0392b)' :
                          'linear-gradient(45deg, #3498db, #2980b9)';
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
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
    
    // Supprimer le toast après 5 secondes
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

// Fonctions de navigation
function showProfile() {
    window.location.href = 'profile.html';
}

function goBack() {
    window.history.back();
}

// Exposer les fonctions globalement
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