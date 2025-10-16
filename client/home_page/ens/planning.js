console.log('Planning Enseignant - Version 2.0 avec API');

// ==============================================
// CONFIGURATION & CONSTANTES GLOBALES
// ==============================================

const API_BASE_URL = 'http://localhost:8080/api';
let currentWeek = new Date();
let scheduleData = {};
let currentUser = null;
let authToken = localStorage.getItem('accessToken') || null;
let teacherModules = [];
let teacherGroups = [];

// Mapping des jours pour l'API
const dayMapping = {
    'Dimanche': 'sunday',
    'Lundi': 'monday',
    'Mardi': 'tuesday',
    'Mercredi': 'wednesday',
    'Jeudi': 'thursday'
};

const reverseDayMapping = {
    'sunday': 'Dimanche',
    'monday': 'Lundi',
    'tuesday': 'Mardi',
    'wednesday': 'Mercredi',
    'thursday': 'Jeudi'
};

// Mapping des jours français vers anglais pour l'API
const frenchToEnglishDays = {
    'Dimanche': 'sunday',
    'Lundi': 'monday', 
    'Mardi': 'tuesday',
    'Mercredi': 'wednesday',
    'Jeudi': 'thursday'
};

const timeSlots = [
    { id: '08:00', label: '08:00 - 09:30', start: '08:00:00', end: '09:30:00' },
    { id: '09:30', label: '09:30 - 11:00', start: '09:30:00', end: '11:00:00' },
    { id: '11:00', label: '11:00 - 12:30', start: '11:00:00', end: '12:30:00' },
    { id: '12:30', label: '12:30 - 14:00', start: '12:30:00', end: '14:00:00' },
    { id: '14:00', label: '14:00 - 15:30', start: '14:00:00', end: '15:30:00' },
    { id: '15:30', label: '15:30 - 17:00', start: '15:30:00', end: '17:00:00' }
];

const dayLabels = {
    sunday: 'Dimanche',
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi'
};

// ==============================================
// FONCTIONS API UTILITAIRES
// ==============================================

function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (authToken) {
        headers['x-access-token'] = authToken;
    }
    
    return headers;
}

async function apiRequest(url, options = {}) {
    try {
        console.log(`API Request: ${API_BASE_URL}${url}`);
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers: {
                ...getAuthHeaders(),
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type');
        
        if (contentLength === '0' || !contentType?.includes('application/json')) {
            return {};
        }
        
        const result = await response.json();
        console.log(`API Response for ${url}:`, result);
        return result;
    } catch (error) {
        console.error('Erreur API:', error);
        showNotification(`Erreur API: ${error.message}`, 'error');
        throw error;
    }
}

// ==============================================
// CHARGEMENT DES DONNÉES ENSEIGNANT
// ==============================================

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

async function loadTeacherAssignments() {
    try {
        if (!currentUser || !currentUser.id) {
            throw new Error('Utilisateur non identifié');
        }

        // Récupérer les modules assignés à l'enseignant (correct URL selon les routes)
        teacherModules = await apiRequest(`/utilisateur-modules/teacher/${currentUser.id}`);
        console.log('Modules assignés à l\'enseignant:', teacherModules);

        // Récupérer les groupes assignés à l'enseignant (correct URL selon les routes)
        teacherGroups = await apiRequest(`/utilisateur-modules/teacher/${currentUser.id}/groups`);
        console.log('Groupes assignés à l\'enseignant:', teacherGroups);

        return { modules: teacherModules, groups: teacherGroups };
    } catch (error) {
        console.error('Erreur lors du chargement des assignations:', error);
        teacherModules = [];
        teacherGroups = [];
        throw error;
    }
}

async function loadTeacherSchedule() {
    try {
        scheduleData = {};
        
        if (!teacherGroups || teacherGroups.length === 0) {
            console.log('Aucun groupe assigné à cet enseignant');
            return scheduleData;
        }

        // Pour chaque groupe assigné à l'enseignant
        for (const group of teacherGroups) {
            try {
                console.log(`Chargement des horaires pour le groupe ${group.id} (${group.nom})`);
                
                // Récupérer les horaires du groupe
                const groupSchedules = await apiRequest(`/horaires/groupe/${group.id}`);
                console.log(`Horaires bruts du groupe ${group.nom}:`, groupSchedules);

                if (!Array.isArray(groupSchedules)) {
                    console.warn(`Les horaires du groupe ${group.id} ne sont pas un tableau:`, groupSchedules);
                    continue;
                }

                // Filtrer seulement les horaires où cet enseignant enseigne
                const teacherSchedules = groupSchedules.filter(schedule => {
                    const isTeacherSchedule = schedule.enseignant && 
                                            schedule.enseignant.id === currentUser.id;
                    if (!isTeacherSchedule) {
                        console.log(`Horaire exclu (enseignant différent): ${schedule.enseignant?.nom} vs ${currentUser.nom}`);
                    }
                    return isTeacherSchedule;
                });

                console.log(`Horaires filtrés pour l'enseignant ${currentUser.nom}:`, teacherSchedules);

                // Traitement de chaque horaire de l'enseignant
                teacherSchedules.forEach(schedule => {
                    try {
                        // Convertir le jour français en anglais pour la clé
                        const dayKey = frenchToEnglishDays[schedule.jour] || schedule.jour.toLowerCase();
                        const timeKey = schedule.heure_debut ? schedule.heure_debut.substring(0, 5) : '00:00';
                        const scheduleKey = `${dayKey}_${timeKey}`;
                        
                        console.log(`Traitement horaire: ${schedule.jour} -> ${dayKey}, ${schedule.heure_debut} -> ${timeKey}, clé: ${scheduleKey}`);
                        
                        // Obtenir le nom du module
                        let moduleName = 'Module inconnu';
                        if (schedule.module && schedule.module.nom) {
                            moduleName = schedule.module.nom;
                        } else {
                            // Chercher dans les modules assignés à l'enseignant
                            const moduleData = teacherModules.find(m => m.moduleId === schedule.module?.id);
                            if (moduleData && moduleData.moduleNom) {
                                moduleName = moduleData.moduleNom;
                            }
                        }

                        scheduleData[scheduleKey] = {
                            id: schedule.id,
                            day: dayKey,
                            time: timeKey,
                            module: moduleName,
                            moduleId: schedule.module?.id || null,
                            teacher: currentUser.nom,
                            teacherId: currentUser.id,
                            group: schedule.groupe?.nom || group.nom,
                            groupId: schedule.groupe?.id || group.id,
                            room: schedule.salle || 'Salle non définie',
                            type: schedule.type || getScheduleTypeFromTime(schedule.heure_debut),
                            startTime: schedule.heure_debut,
                            endTime: schedule.heure_fin,
                            status: 'confirmé',
                            informations_supplementaires: schedule.informations_supplementaires
                        };

                        console.log(`Horaire ajouté:`, scheduleData[scheduleKey]);
                    } catch (scheduleError) {
                        console.error('Erreur lors du traitement d\'un horaire:', scheduleError, schedule);
                    }
                });
            } catch (error) {
                console.warn(`Erreur lors du chargement des horaires pour le groupe ${group.id} (${group.nom}):`, error);
            }
        }
        
        console.log(`${Object.keys(scheduleData).length} créneaux chargés pour l'enseignant`);
        console.log('Données finales du planning:', scheduleData);
        return scheduleData;
    } catch (error) {
        console.error('Erreur lors du chargement du planning enseignant:', error);
        scheduleData = {};
        return scheduleData;
    }
}

function getScheduleTypeFromTime(heureDebut) {
    if (!heureDebut) return 'Cours';
    
    const hour = parseInt(heureDebut.substring(0, 2));
    if (hour === 8 || hour === 14) return 'Cours';
    if (hour === 9 || hour === 15) return 'TD';
    if (hour === 11) return 'TP';
    return 'Cours';
}

function getScheduleType(schedule) {
    // Essayer d'abord le champ type direct
    if (schedule.type) {
        return schedule.type;
    }
    
    // Extraire le type depuis informations_supplementaires si disponible
    if (schedule.informations_supplementaires) {
        try {
            const info = typeof schedule.informations_supplementaires === 'string' 
                ? JSON.parse(schedule.informations_supplementaires)
                : schedule.informations_supplementaires;
            if (info.type) return info.type;
        } catch (error) {
            console.warn('Erreur parsing informations_supplementaires:', error);
        }
    }
    
    // Déterminer le type basé sur l'heure (fallback)
    return getScheduleTypeFromTime(schedule.heure_debut);
}

// ==============================================
// INITIALISATION
// ==============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM chargé, initialisation du planning...');
    
    // Vérifier l'authentification
    const currentUserData = localStorage.getItem('currentUser');
    if (currentUserData) {
        try {
            currentUser = JSON.parse(currentUserData);
            console.log('Utilisateur connecté:', currentUser);
        } catch (error) {
            console.error('Erreur parsing currentUser:', error);
        }
    }
    
    if (!authToken || !currentUser) {
        console.warn('Pas de token d\'authentification ou d\'utilisateur trouvé');
        showNotification('Veuillez vous reconnecter', 'warning');
        setTimeout(() => {
            window.location.href = '/client/login_page/index.html';
        }, 3000);
        return;
    }

    // Vérifier que l'utilisateur est bien un enseignant
    const hasTeacherRole = currentUser.roles && currentUser.roles.some(role => 
        role === 'ROLE_ENSEIGNANT' || role === 'enseignant'
    );

    if (!hasTeacherRole) {
        console.warn('Utilisateur sans rôle enseignant:', currentUser.roles);
        showNotification('Accès non autorisé - Réservé aux enseignants', 'error');
        setTimeout(() => {
            window.location.href = '/client/login_page/index.html';
        }, 3000);
        return;
    }
    
    initializeTeacherSchedule();
});

async function initializeTeacherSchedule() {
    try {
        console.log('Début de l\'initialisation du planning enseignant');
        showNotification('Chargement de votre planning...', 'info');
        
        // Afficher les informations utilisateur
        displayUserInfo();
        updateNotificationBadge();
        updateCurrentWeekDisplay();
        
        // Charger les assignations de l'enseignant
        console.log('Chargement des assignations...');
        await loadTeacherAssignments();
        
        // Charger le planning de l'enseignant
        console.log('Chargement du planning...');
        await loadTeacherSchedule();
        
        // Charger la grille de planning
        console.log('Chargement de la grille...');
        loadScheduleGrid();
        
        showNotification('Planning chargé avec succès', 'success');
        console.log('Initialisation du planning enseignant terminée');
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showNotification('Erreur lors du chargement du planning', 'error');
        
        // Afficher un message d'erreur dans la grille
        displayErrorMessage('Impossible de charger votre planning. Veuillez contacter l\'administrateur.');
    }
}

// ==============================================
// FONCTIONS D'AFFICHAGE
// ==============================================

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

    // 🔥 Appel API profil
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

    // maj UI
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

function updateCurrentWeekDisplay() {
    const sunday = getSunday(currentWeek);
    const thursday = new Date(sunday);
    thursday.setDate(thursday.getDate() + 4);
    
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    const sundayStr = sunday.toLocaleDateString('fr-FR', options);
    const thursdayStr = thursday.toLocaleDateString('fr-FR', options);
    
    const currentWeekTitle = document.getElementById('currentWeekTitle');
    if (currentWeekTitle) {
        currentWeekTitle.textContent = `Semaine du ${sundayStr} au ${thursdayStr}`;
    }

    const weekInfo = document.getElementById('weekInfo');
    if (weekInfo) {
        const weekNumber = getWeekNumber(sunday);
        weekInfo.textContent = `Semaine ${weekNumber}`;
    }
    
    updateDayHeaders(sunday);
}

function getSunday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

function getWeekNumber(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - start) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
}

function updateDayHeaders(weekStart) {
    const dayHeaders = document.querySelectorAll('.day-header');
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'];
    
    dayHeaders.forEach((header, index) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + index);
        
        const dayName = header.querySelector('.day-name');
        const dayDate = header.querySelector('.day-date');
        
        if (dayName && dayDate) {
            dayName.textContent = days[index];
            dayDate.textContent = day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        }
    });
}

function loadScheduleGrid() {
    console.log('Chargement de la grille avec les données:', scheduleData);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
    
    days.forEach(day => {
        timeSlots.forEach((timeSlot, index) => {
            const scheduleKey = `${day}_${timeSlot.id}`;
            const schedule = scheduleData[scheduleKey];
            
            // Trouver la cellule correspondante dans la grille
            const dayIndex = days.indexOf(day);
            const grid = document.querySelector('.schedule-grid');
            if (!grid) {
                console.warn('Grille de planning non trouvée dans le DOM');
                return;
            }
            
            // Calculer la position dans la grille (6 colonnes: 1 pour les heures + 5 pour les jours)
            const cellIndex = (index + 1) * 6 + dayIndex + 1;
            const cells = grid.children;
            const cell = cells[cellIndex];
            
            if (cell) {
                // Réinitialiser la cellule
                cell.className = 'course-cell';
                cell.innerHTML = '';
                
                if (schedule) {
                    console.log(`Affichage cours dans cellule ${scheduleKey}:`, schedule);
                    cell.classList.add('occupied');
                    cell.innerHTML = `
                        <div class="course-block ${getModuleClass(schedule.module)}" onclick="showCourseDetails(scheduleData['${scheduleKey}'])">
                            <div class="course-title">${schedule.module}</div>
                            <div class="course-details">
                                <span><i class="fas fa-users"></i> ${schedule.group}</span>
                                <span><i class="fas fa-map-marker-alt"></i> ${schedule.room}</span>
                                <span><i class="fas fa-tag"></i> ${schedule.type}</span>
                            </div>
                        </div>
                    `;
                } else {
                    cell.classList.add('empty');
                    cell.innerHTML = '<div class="empty-slot"></div>';
                }
            } else {
                console.warn(`Cellule non trouvée pour l'index ${cellIndex} (${scheduleKey})`);
            }
        });
    });
    
    updateWeekSummary();
}

function getModuleClass(moduleName) {
    const moduleClassMap = {
        'Développement Web': 'dev-web',
        'Base de Données': 'bdd',
        'Algorithmes': 'algorithmes',
        'Réseaux': 'reseaux',
        'Sécurité': 'securite',
        'Gestion de Projet': 'gestion-projet'
    };
    
    return moduleClassMap[moduleName] || 'general';
}

function updateWeekSummary() {
    const totalHours = document.getElementById('totalHours');
    const totalCourses = document.getElementById('totalCourses');
    const totalRooms = document.getElementById('totalRooms');
    const totalTeachers = document.getElementById('totalTeachers');
    
    const schedules = Object.values(scheduleData);
    const coursesThisWeek = schedules.length;
    const hoursThisWeek = coursesThisWeek * 1.5; // Chaque cours = 1h30
    const uniqueRooms = [...new Set(schedules.map(s => s.room))].length;
    const uniqueGroups = [...new Set(schedules.map(s => s.group))].length;
    
    if (totalHours) totalHours.textContent = `${hoursThisWeek}h`;
    if (totalCourses) totalCourses.textContent = coursesThisWeek;
    if (totalRooms) totalRooms.textContent = uniqueRooms;
    if (totalTeachers) totalTeachers.textContent = uniqueGroups;
}

function displayErrorMessage(message) {
    const container = document.querySelector('.schedule-container');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erreur de chargement</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="retry-btn">
                    <i class="fas fa-redo"></i> Réessayer
                </button>
            </div>
        `;
    }
}

// ==============================================
// FONCTIONS DE NAVIGATION
// ==============================================

async function previousWeek() {
    currentWeek.setDate(currentWeek.getDate() - 7);
    updateCurrentWeekDisplay();
    await loadTeacherSchedule();
    loadScheduleGrid();
}

async function nextWeek() {
    currentWeek.setDate(currentWeek.getDate() + 7);
    updateCurrentWeekDisplay();
    await loadTeacherSchedule();
    loadScheduleGrid();
}

// ==============================================
// FONCTIONS DE DÉTAIL ET MODAL
// ==============================================

function showCourseDetails(course) {
    if (!course) return;
    
    console.log('Affichage détails du cours:', course);
    
    const modal = document.getElementById('courseModal');
    const modalTitle = document.getElementById('modalCourseTitle');
    const modalModuleName = document.getElementById('modalModuleName');
    const modalGroup = document.getElementById('modalGroup');
    const modalTime = document.getElementById('modalTime');
    const modalDate = document.getElementById('modalDate');
    const modalRoom = document.getElementById('modalRoom');
    const modalStatus = document.getElementById('modalStatus');
    
    if (modalTitle) modalTitle.textContent = course.module;
    if (modalModuleName) modalModuleName.textContent = course.module;
    if (modalGroup) modalGroup.textContent = course.group;
    if (modalTime) {
        const timeSlot = timeSlots.find(t => t.id === course.time);
        modalTime.textContent = timeSlot ? timeSlot.label : course.time;
    }
    if (modalDate) modalDate.textContent = dayLabels[course.day];
    if (modalRoom) modalRoom.textContent = course.room;
    if (modalStatus) {
        modalStatus.textContent = course.status;
        modalStatus.className = `status-badge ${course.status}`;
    }
    
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal() {
    const modal = document.getElementById('courseModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Fermer la modal en cliquant à l'extérieur
window.onclick = function(event) {
    const modal = document.getElementById('courseModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// ==============================================
// FONCTIONS DE NAVIGATION SYSTÈME
// ==============================================

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

function showNotifications() {
    // Marquer les notifications comme lues
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

function showProfile() {
    window.location.href = 'profile.html';
}

function goBack() {
    window.location.href = 'ens.html';
}

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

// ==============================================
// SYSTÈME DE NOTIFICATIONS
// ==============================================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-triangle';
        case 'warning': return 'exclamation-circle';
        default: return 'info-circle';
    }
}

function getNotificationColor(type) {
    switch (type) {
        case 'success': return '#22c55e';
        case 'error': return '#ef4444';
        case 'warning': return '#f59e0b';
        default: return '#3b82f6';
    }
}

// Styles CSS pour les animations
const style = document.createElement('style');
style.textContent = `
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}

.error-message {
    text-align: center;
    padding: 3rem;
    color: #6c757d;
}

.error-message i {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #dc3545;
}

.error-message h3 {
    margin-bottom: 1rem;
    color: #495057;
}

.retry-btn {
    background: #007bff;
    color: white;
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    margin-top: 1rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.retry-btn:hover {
    background: #0056b3;
}

.empty-slot {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6c757d;
    font-style: italic;
}

.course-cell.occupied {
    background: white;
}

.course-cell.empty {
    background: #f8f9fa;
}

.course-block {
    height: 100%;
    padding: 0.5rem;
    cursor: pointer;
    transition: transform 0.2s ease;
    border-radius: 8px;
}

.course-block:hover {
    transform: translateY(-2px);
}

.course-title {
    font-weight: bold;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    line-height: 1.2;
}

.course-details {
    font-size: 0.75rem;
    opacity: 0.9;
}

.course-details span {
    display: block;
    margin-bottom: 2px;
}

.course-details i {
    width: 12px;
    margin-right: 4px;
}

/* Couleurs par module */
.course-block.dev-web {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
}

.course-block.bdd {
    background: linear-gradient(135deg, #f093fb, #f5576c);
    color: white;
}

.course-block.algorithmes {
    background: linear-gradient(135deg, #4facfe, #00f2fe);
    color: white;
}

.course-block.reseaux {
    background: linear-gradient(135deg, #43e97b, #38f9d7);
    color: white;
}

.course-block.securite {
    background: linear-gradient(135deg, #fa709a, #fee140);
    color: white;
}

.course-block.general {
    background: linear-gradient(135deg, #a8edea, #fed6e3);
    color: #2c3e50;
}
`;
document.head.appendChild(style);

console.log('Planning Enseignant avec intégration API initialisé avec succès');