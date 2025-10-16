console.log('CFPA Notification System - Version 2.0 (API Integration)');

// ========== CONFIGURATION ET DONNÉES ==========
const API_BASE_URL = 'http://localhost:8080/api';
const NOTIFICATIONS_PER_PAGE = 10;
let currentPage = 1;
let currentFilter = 'all';
let notifications = [];
let users = [];
let groupes = [];
let totalNotifications = 0;

// Types de notifications avec leurs configurations
const NOTIFICATION_TYPES = {
    course: {
        label: 'Nouveau Cours',
        icon: 'fa-book-open',
        color: 'success'
    },
    grade: {
        label: 'Note Ajoutée',
        icon: 'fa-star',
        color: 'info'
    },
    schedule: {
        label: 'Changement Planning',
        icon: 'fa-calendar-alt',
        color: 'warning'
    },
    system: {
        label: 'Notification Système',
        icon: 'fa-cog',
        color: 'system'
    },
    announcement: {
        label: 'Annonce',
        icon: 'fa-bullhorn',
        color: 'announcement'
    }
};

// ========== UTILITAIRES D'AUTHENTIFICATION ==========
function getAuthToken() {
    return localStorage.getItem('accessToken');
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'x-access-token': getAuthToken()
    };
}

function checkAuthentication() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ========== FONCTIONS API ==========
async function apiCall(endpoint, options = {}) {
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                ...getAuthHeaders(),
                ...options.headers
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('accessToken');
            window.location.href = 'login.html';
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
    } finally {
        showLoading(false);
    }
}

// ========== CHARGEMENT DES DONNÉES ==========
async function loadGroupes() {
    try {
        const data = await apiCall('/groupes');
        if (data) {
            groupes = data;
            populateRecipientSelect();
            return data;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des groupes:', error);
    }
    return [];
}

async function loadUsers() {
    try {
        const data = await apiCall('/users');
        if (data) {
            // Pour chaque utilisateur, récupérer son profil pour avoir la spécialité
            const usersWithProfiles = [];
            for (const user of data) {
                try {
                    const profile = await apiCall(`/profil/${user.id}`);
                    usersWithProfiles.push({
                        ...user,
                        specialite: profile?.specialite || 'Non spécifiée'
                    });
                } catch (error) {
                    // Si pas de profil trouvé, garder l'utilisateur sans spécialité
                    console.warn(`Profil non trouvé pour l'utilisateur ${user.id}`);
                    usersWithProfiles.push({
                        ...user,
                        specialite: 'Non spécifiée'
                    });
                }
            }
            users = usersWithProfiles;
            populateRecipientSelect();
            return usersWithProfiles;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
    }
    return [];
}

async function loadUsersOptimized() {
    try {
        const [usersData, profilsData] = await Promise.all([
            apiCall('/users'),
            apiCall('/profil/')
        ]);

        if (usersData && profilsData) {
            // Créer un map des profils par utilisateurId
            const profilsMap = {};
            profilsData.forEach(profil => {
                profilsMap[profil.utilisateurId] = profil;
            });

            // Associer chaque utilisateur avec son profil
            users = usersData.map(user => ({
                ...user,
                specialite: profilsMap[user.id]?.specialite || 'Non spécifiée'
            }));

            populateRecipientSelect();
            return users;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
    }
    return [];
}

async function loadAllNotifications() {
    try {
        if (users.length === 0) {
            await loadUsers(); // ou loadUsersOptimized()
        }
        if (groupes.length === 0) {
            await loadGroupes();
        }

        let allNotifications = [];
        
        // Récupérer les notifications pour chaque utilisateur NON ADMINISTRATEUR
        const nonAdminUsers = users.filter(user => 
            !user.roles || !user.roles.some(role => 
                role.nom === 'administrateur' || role.nom === 'admin'
            )
        );
        
        for (const user of nonAdminUsers) {
            try {
                const userNotifications = await apiCall(`/notifications/${user.id}`);
                if (userNotifications && Array.isArray(userNotifications)) {
                    const notificationsWithUser = userNotifications.map(notif => ({
                        ...notif,
                        userName: user.nom,
                        userEmail: user.email,
                        userSpecialite: user.specialite,
                        createdAt: new Date(notif.cree_a),
                        isRead: notif.lu
                    }));
                    allNotifications = [...allNotifications, ...notificationsWithUser];
                }
            } catch (error) {
                console.error(`Erreur notifications pour utilisateur ${user.id}:`, error);
            }
        }

        notifications = allNotifications.sort((a, b) => b.createdAt - a.createdAt);
        updateStatistics();
        renderNotifications();
    } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error);
        showToast('Erreur lors du chargement des notifications', 'error');
    }
}

async function createNotificationAPI(notificationData) {
    try {
        const recipientType = notificationData.recipientType;
        const recipientValue = notificationData.recipientValue;
        
        let targetUsers = [];
        
        if (recipientType === 'all_teachers') {
            // Récupérer tous les enseignants (non administrateurs)
            targetUsers = users.filter(user => 
                user.roles && user.roles.some(role => role.nom === 'enseignant') &&
                !user.roles.some(role => role.nom === 'administrateur' || role.nom === 'admin')
            );
        } else if (recipientType === 'all_trainees') {
            // Récupérer tous les stagiaires (non administrateurs)
            targetUsers = users.filter(user => 
                user.roles && user.roles.some(role => role.nom === 'stagiaire') &&
                !user.roles.some(role => role.nom === 'administrateur' || role.nom === 'admin')
            );
        } else if (recipientType === 'groupe') {
            // Récupérer les utilisateurs d'un groupe spécifique
            try {
                const groupUsers = await apiCall(`/groupes/${recipientValue}/users`);
                if (groupUsers) {
                    // Filtrer les administrateurs du groupe
                    targetUsers = groupUsers.filter(user => 
                        !user.roles || !user.roles.some(role => 
                            role.nom === 'administrateur' || role.nom === 'admin'
                        )
                    );
                }
            } catch (error) {
                console.error('Erreur lors de la récupération des utilisateurs du groupe:', error);
                showToast('Erreur lors de la récupération des utilisateurs du groupe', 'error');
                return false;
            }
        } else if (recipientType === 'user') {
            // Utilisateur individuel - vérifier qu'il n'est pas administrateur
            const user = users.find(u => u.id == recipientValue);
            if (user && (!user.roles || !user.roles.some(role => 
                role.nom === 'administrateur' || role.nom === 'admin'
            ))) {
                targetUsers = [user];
            } else if (user) {
                showToast('Impossible d\'envoyer une notification à un administrateur', 'error');
                return false;
            }
        }

        if (targetUsers.length === 0) {
            showToast('Aucun destinataire valide trouvé (les administrateurs sont exclus)', 'error');
            return false;
        }

        // Créer une notification pour chaque utilisateur cible
        let successCount = 0;
        for (const user of targetUsers) {
            try {
                const notification = {
                    utilisateurId: user.id,
                    type: notificationData.type,
                    titre: notificationData.titre,
                    message: notificationData.message,
                    informations_supplementaires: notificationData.informations_supplementaires
                };
                
                const result = await apiCall('/notifications', {
                    method: 'POST',
                    body: JSON.stringify(notification)
                });
                
                if (result) {
                    successCount++;
                }
            } catch (error) {
                console.error(`Erreur pour l'utilisateur ${user.id}:`, error);
            }
        }
        
        if (successCount > 0) {
            await loadAllNotifications();
            showToast(`${successCount} notification(s) créée(s) avec succès`, 'success');
            return true;
        } else {
            showToast('Erreur lors de la création des notifications', 'error');
            return false;
        }
    } catch (error) {
        console.error('Erreur lors de la création:', error);
        showToast('Erreur lors de la création de la notification', 'error');
        return false;
    }
}

async function toggleReadStatusAPI(notificationId) {
    try {
        const result = await apiCall(`/notifications/${notificationId}/lu`, {
            method: 'PUT'
        });

        if (result !== null) {
            await loadAllNotifications();
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        showToast('Erreur lors de la mise à jour du statut', 'error');
    }
}

async function deleteNotificationAPI(notificationId) {
    try {
        await apiCall(`/notifications/${notificationId}`, {
            method: 'DELETE'
        });

        await loadAllNotifications();
        showToast('Notification supprimée avec succès', 'success');
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showToast('Erreur lors de la suppression de la notification', 'error');
    }
}

// ========== UTILITAIRES DE FORMATAGE ==========
function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    
    return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
}

function populateRecipientSelect() {
    const select = document.getElementById('notifRecipient');
    const groupesOptgroup = document.getElementById('groupesOptgroup');
    const usersOptgroup = document.getElementById('usersOptgroup');
    
    if (!select) return;

    // Vider les optgroups
    if (groupesOptgroup) {
        groupesOptgroup.innerHTML = '';
    }
    if (usersOptgroup) {
        usersOptgroup.innerHTML = '';
    }

    // Ajouter les groupes
    if (groupes.length > 0 && groupesOptgroup) {
        groupes.forEach(groupe => {
            const option = document.createElement('option');
            option.value = `groupe_${groupe.id}`;
            option.textContent = `Groupe: ${groupe.nom}`;
            groupesOptgroup.appendChild(option);
        });
    }

    // Ajouter les utilisateurs individuels avec la spécialité - EXCLURE LES ADMINISTRATEURS
    if (users.length > 0 && usersOptgroup) {
        // Filtrer les utilisateurs pour exclure les administrateurs
        const nonAdminUsers = users.filter(user => {
            // Vérifier si l'utilisateur n'a pas le rôle d'administrateur
            return !user.roles || !user.roles.some(role => 
                role.nom === 'administrateur' || role.nom === 'admin'
            );
        });

        nonAdminUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = `user_${user.id}`;
            // Afficher nom et spécialité au lieu de l'email
            option.textContent = `${user.nom} (${user.specialite})`;
            usersOptgroup.appendChild(option);
        });
    }
}
// ========== GESTION DE L'INTERFACE ==========
function showLoading(show) {
    const loader = document.getElementById('loadingIndicator');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function updateStatistics() {
    const total = notifications.length;
    const read = notifications.filter(n => n.isRead).length;
    const unread = total - read;

    document.getElementById('totalNotifications').textContent = total;
    document.getElementById('readNotifications').textContent = read;
    document.getElementById('unreadNotifications').textContent = unread;
    document.getElementById('totalUsers').textContent = users.length;

    // Mettre à jour les badges de notification
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        badge.textContent = unread;
        badge.style.display = unread === 0 ? 'none' : 'inline';
    }

    const sidebarBadge = document.getElementById('adminNotifCount');
    if (sidebarBadge) {
        sidebarBadge.textContent = unread;
    }
}

function renderNotifications() {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;

    let filteredNotifications = notifications;

    // Appliquer le filtre
    if (currentFilter !== 'all') {
        if (currentFilter === 'read') {
            filteredNotifications = notifications.filter(n => n.isRead);
        } else if (currentFilter === 'unread') {
            filteredNotifications = notifications.filter(n => !n.isRead);
        } else {
            filteredNotifications = notifications.filter(n => n.type === currentFilter);
        }
    }

    // Appliquer la recherche (inclure la spécialité dans la recherche)
    const searchTerm = document.getElementById('searchNotifications')?.value.toLowerCase();
    if (searchTerm) {
        filteredNotifications = filteredNotifications.filter(n => 
            n.titre.toLowerCase().includes(searchTerm) || 
            n.message.toLowerCase().includes(searchTerm) ||
            (n.userName && n.userName.toLowerCase().includes(searchTerm)) ||
            (n.userSpecialite && n.userSpecialite.toLowerCase().includes(searchTerm))
        );
    }

    // Pagination
    const totalPages = Math.ceil(filteredNotifications.length / NOTIFICATIONS_PER_PAGE);
    const startIndex = (currentPage - 1) * NOTIFICATIONS_PER_PAGE;
    const endIndex = startIndex + NOTIFICATIONS_PER_PAGE;
    const pageNotifications = filteredNotifications.slice(startIndex, endIndex);

    if (pageNotifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <h3>Aucune notification</h3>
                <p>Aucune notification ne correspond à vos critères de recherche.</p>
            </div>
        `;
    } else {
        container.innerHTML = pageNotifications.map(notification => `
            <div class="notification-item ${notification.isRead ? '' : 'unread'}" 
                 onclick="showNotificationDetails(${notification.id})">
                <div class="notification-icon ${notification.type}">
                    <i class="fas ${NOTIFICATION_TYPES[notification.type]?.icon || 'fa-bell'}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <h4 class="notification-title">${notification.titre}</h4>
                        <span class="notification-time">${formatTimeAgo(notification.createdAt)}</span>
                    </div>
                    <p class="notification-message">${notification.message}</p>
                    <div class="notification-meta">
                        <span class="notification-type">${NOTIFICATION_TYPES[notification.type]?.label || notification.type}</span>
                        <span class="notification-sender">Utilisateur: ${notification.userName} ${notification.userSpecialite ? `(${notification.userSpecialite})` : ''}</span>
                    </div>
                </div>
                <div class="notification-actions" onclick="event.stopPropagation()">
                    <button class="notification-action" onclick="toggleReadStatus(${notification.id})" 
                            title="${notification.isRead ? 'Marquer comme non lu' : 'Marquer comme lu'}">
                        <i class="fas ${notification.isRead ? 'fa-envelope' : 'fa-envelope-open'}"></i>
                    </button>
                    <button class="notification-action delete" onclick="deleteNotification(${notification.id})" 
                            title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Mettre à jour la pagination
    updatePagination(totalPages, filteredNotifications.length);
}
function updatePagination(totalPages, totalItems) {
    const currentPageEl = document.getElementById('currentPage');
    const totalPagesEl = document.getElementById('totalPages');
    
    if (currentPageEl) currentPageEl.textContent = currentPage;
    if (totalPagesEl) totalPagesEl.textContent = Math.max(totalPages, 1);

    // Désactiver les boutons si nécessaire
    const prevBtn = document.querySelector('.pagination-btn:first-child');
    const nextBtn = document.querySelector('.pagination-btn:last-child');
    
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages || totalPages === 0;
}

// ========== ACTIONS SUR LES NOTIFICATIONS ==========
async function toggleReadStatus(id) {
    await toggleReadStatusAPI(id);
}

async function deleteNotification(id) {
    showConfirm(
        'Supprimer la notification',
        'Êtes-vous sûr de vouloir supprimer cette notification ? Cette action est irréversible.',
        async () => {
            await deleteNotificationAPI(id);
        }
    );
}

async function markAllAsRead() {
    showConfirm(
        'Marquer tout comme lu',
        'Voulez-vous marquer toutes les notifications comme lues ?',
        async () => {
            const unreadNotifications = notifications.filter(n => !n.isRead);
            let successCount = 0;
            
            for (const notification of unreadNotifications) {
                try {
                    await toggleReadStatusAPI(notification.id);
                    successCount++;
                } catch (error) {
                    console.error('Erreur pour notification', notification.id, error);
                }
            }
            
            if (successCount > 0) {
                showToast(`${successCount} notifications marquées comme lues`, 'success');
            }
        }
    );
}

async function deleteAllRead() {
    const readNotifications = notifications.filter(n => n.isRead);
    
    if (readNotifications.length === 0) {
        showToast('Aucune notification lue à supprimer', 'info');
        return;
    }
    
    showConfirm(
        'Supprimer les notifications lues',
        `Voulez-vous supprimer les ${readNotifications.length} notifications déjà lues ?`,
        async () => {
            let successCount = 0;
            
            for (const notification of readNotifications) {
                try {
                    await deleteNotificationAPI(notification.id);
                    successCount++;
                } catch (error) {
                    console.error('Erreur pour notification', notification.id, error);
                }
            }
            
            if (successCount > 0) {
                showToast(`${successCount} notifications supprimées`, 'success');
            }
        }
    );
}

// ========== GESTION DES FILTRES ==========
function filterNotifications(filter) {
    currentFilter = filter;
    currentPage = 1;
    renderNotifications();
    closeFilterDropdown();
}

function toggleFilterDropdown() {
    const dropdown = document.getElementById('filterDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function closeFilterDropdown() {
    const dropdown = document.getElementById('filterDropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}

// ========== PAGINATION ==========
function changePage(direction) {
    const filteredNotifications = getFilteredNotifications();
    const totalPages = Math.ceil(filteredNotifications.length / NOTIFICATIONS_PER_PAGE);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderNotifications();
    }
}

function getFilteredNotifications() {
    let filtered = notifications;

    if (currentFilter !== 'all') {
        if (currentFilter === 'read') {
            filtered = notifications.filter(n => n.isRead);
        } else if (currentFilter === 'unread') {
            filtered = notifications.filter(n => !n.isRead);
        } else {
            filtered = notifications.filter(n => n.type === currentFilter);
        }
    }

    const searchTerm = document.getElementById('searchNotifications')?.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(n => 
            n.titre.toLowerCase().includes(searchTerm) || 
            n.message.toLowerCase().includes(searchTerm) ||
            (n.userName && n.userName.toLowerCase().includes(searchTerm))
        );
    }

    return filtered;
}

// ========== CRÉATION DE NOUVELLES NOTIFICATIONS ==========
async function createNotification() {
    const form = document.getElementById('createNotificationForm');
    if (!form) return;

    const recipientValue = document.getElementById('notifRecipient').value;
    
    if (!recipientValue) {
        showToast('Veuillez sélectionner un destinataire', 'error');
        return;
    }
    
    // Analyser le type de destinataire
    let recipientType, recipientId;
    if (recipientValue === 'all_teachers' || recipientValue === 'all_trainees') {
        recipientType = recipientValue;
        recipientId = null;
    } else if (recipientValue.startsWith('groupe_')) {
        recipientType = 'groupe';
        recipientId = recipientValue.replace('groupe_', '');
    } else if (recipientValue.startsWith('user_')) {
        recipientType = 'user';
        recipientId = recipientValue.replace('user_', '');
    } else {
        showToast('Type de destinataire invalide', 'error');
        return;
    }

    const notificationData = {
        recipientType: recipientType,
        recipientValue: recipientId,
        type: document.getElementById('notifType').value,
        titre: document.getElementById('notifTitle').value,
        message: document.getElementById('notifMessage').value,
        informations_supplementaires: document.getElementById('notifAdditionalInfo').value || null
    };

    // Validation
    if (!notificationData.type || !notificationData.titre || !notificationData.message) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }

    const success = await createNotificationAPI(notificationData);
    
    if (success) {
        closeModal('createNotificationModal');
        form.reset();
    }
}

// ========== DÉTAILS D'UNE NOTIFICATION ==========
function showNotificationDetails(id) {
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;

    const modal = document.getElementById('notificationDetailsModal');
    const content = document.getElementById('notificationDetailsContent');
    
    if (!modal || !content) return;

    content.innerHTML = `
        <div class="details-section">
            <h4><i class="fas fa-info-circle"></i> Informations générales</h4>
            <div class="details-info">
                <div class="details-row">
                    <span class="details-label">Type:</span>
                    <span class="details-value">${NOTIFICATION_TYPES[notification.type]?.label || notification.type}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Utilisateur:</span>
                    <span class="details-value">${notification.userName}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Email:</span>
                    <span class="details-value">${notification.userEmail}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Spécialité:</span>
                    <span class="details-value">${notification.userSpecialite || 'Non spécifiée'}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Date de création:</span>
                    <span class="details-value">${notification.createdAt.toLocaleString('fr-FR')}</span>
                </div>
                <div class="details-row">
                    <span class="details-label">Statut:</span>
                    <span class="details-value">${notification.isRead ? 'Lue' : 'Non lue'}</span>
                </div>
                ${notification.informations_supplementaires ? `
                <div class="details-row">
                    <span class="details-label">Informations supplémentaires:</span>
                    <span class="details-value">${notification.informations_supplementaires}</span>
                </div>
                ` : ''}
            </div>
        </div>
        <div class="details-section">
            <h4><i class="fas fa-envelope"></i> Contenu de la notification</h4>
            <div class="details-info">
                <div class="details-row">
                    <span class="details-label">Titre:</span>
                    <span class="details-value">${notification.titre}</span>
                </div>
            </div>
            <div class="details-message">
                ${notification.message}
            </div>
        </div>
    `;

    // Marquer comme lue si pas encore lue
    if (!notification.isRead) {
        toggleReadStatusAPI(notification.id);
    }

    // Configurer le bouton de suppression
    const deleteBtn = document.getElementById('deleteNotificationBtn');
    if (deleteBtn) {
        deleteBtn.onclick = () => {
            closeModal('notificationDetailsModal');
            deleteNotification(id);
        };
    }

    openModal('notificationDetailsModal');
}
// ========== GESTION DES MODALES ==========
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ========== FONCTION DE CONFIRMATION ==========
function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmActionBtn');

    if (modal && titleEl && messageEl && confirmBtn) {
        titleEl.innerHTML = `<i class="fas fa-question-circle"></i> ${title}`;
        messageEl.textContent = message;
        confirmBtn.onclick = () => {
            closeModal('confirmModal');
            onConfirm();
        };
        openModal('confirmModal');
    }
}

// ========== TOAST NOTIFICATIONS ==========
function showToast(message, type = 'info') {
    // Créer un toast simple
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#0284c7'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 9999;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Animation d'apparition
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 100);

    // Suppression automatique
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ========== GESTION DE LA SIDEBAR MOBILE ==========
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (sidebar && mainContent) {
        sidebar.classList.toggle('mobile-open');
    }
}

// ========== NAVIGATION ==========
function showDashboard() {
    window.location.href = 'admin.html';
}   

function showUserManagement() {
    window.location.href = 'gestion_utilisateurs.html';
}

function showGroupManagement() {
    window.location.href = 'groupes_classes.html';
}

function showNotifications() {
    location.reload();
}

function showScheduleManagement(){
    window.location.href = 'emploi_tmp.html';
}

function logout() {
    showConfirm(
        'Déconnexion',
        'Êtes-vous sûr de vouloir vous déconnecter ?',
        () => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('currentUser');
            window.location.href = '/client/login_page/index.html';
        }
    );
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', async function() {
    // Vérifier l'authentification
    if (!checkAuthentication()) {
        return;
    }

    try {
        // Charger les données initiales
        await loadUsersOptimized();
        await loadGroupes();
        await loadAllNotifications();
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showToast('Erreur lors du chargement des données', 'error');
    }

    // Recherche en temps réel
    const searchInput = document.getElementById('searchNotifications');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            setTimeout(() => {
                currentPage = 1;
                renderNotifications();
            }, 300);
        });
    }

    // Toggle sidebar mobile
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }

    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            if (sidebar && mainContent) {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
            }
        });
    }

    // Fermer les dropdowns en cliquant à l'extérieur
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.filter-dropdown')) {
            closeFilterDropdown();
        }
    });

    // Fermer les modales en cliquant sur l'overlay
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });

    // Actualiser les données toutes les 30 secondes
    setInterval(async () => {
        try {
            await loadAllNotifications();
        } catch (error) {
            console.error('Erreur lors de l\'actualisation automatique:', error);
        }
    }, 30000);
});