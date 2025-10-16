console.log('Planning Stagiaire - Version 2.0 avec API');

// ==============================================
// CONFIGURATION & CONSTANTES GLOBALES
// ==============================================

const API_BASE_URL = 'http://localhost:8080/api';
let currentWeek = new Date();
let scheduleData = {};
let currentUser = null;
let authToken = localStorage.getItem('accessToken') || null;
let userProfile = null;

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
// CHARGEMENT DES DONNÉES STAGIAIRE
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

async function loadStudentProfile() {
    try {
        if (!currentUser || !currentUser.id) {
            throw new Error('Utilisateur non identifié');
        }

        console.log('Chargement du profil stagiaire...');
        userProfile = await apiRequest(`/profil/${currentUser.id}`);
        console.log('Profil stagiaire chargé:', userProfile);
        
        return userProfile;
    } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        userProfile = null;
        // Ne pas lancer d'erreur car le profil peut ne pas exister
        return null;
    }
}

async function loadStudentSchedule() {
    try {
        scheduleData = {};
        
        if (!currentUser || !currentUser.id) {
            throw new Error('Utilisateur non identifié');
        }

        console.log(`Chargement des horaires pour le stagiaire ${currentUser.id}`);
        
        // Récupérer les horaires du stagiaire via l'API
        const studentSchedules = await apiRequest(`/horaires/stagiaire/${currentUser.id}`);
        console.log('Horaires bruts du stagiaire:', studentSchedules);

        if (!Array.isArray(studentSchedules)) {
            console.warn('Les horaires ne sont pas un tableau:', studentSchedules);
            return scheduleData;
        }

        // Traitement de chaque horaire du stagiaire
        studentSchedules.forEach(schedule => {
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
                }

                // Obtenir le nom de l'enseignant
                let teacherName = 'Enseignant inconnu';
                if (schedule.enseignant && schedule.enseignant.nom) {
                    teacherName = schedule.enseignant.nom;
                }

                // Obtenir le nom du groupe
                let groupName = 'Groupe inconnu';
                if (schedule.groupe && schedule.groupe.nom) {
                    groupName = schedule.groupe.nom;
                }

                let courseType = 'Cours';
                if (schedule.type) {
                    courseType = schedule.type;
                } else if (schedule.informations_supplementaires) {
                    try {
                        const info = typeof schedule.informations_supplementaires === 'string'
                            ? JSON.parse(schedule.informations_supplementaires)
                            : schedule.informations_supplementaires;
                        courseType = info.type || 'Cours';
                    } catch (e) {
                        console.warn('Erreur parsing informations_supplementaires:', schedule.informations_supplementaires);
                    }
                }

                scheduleData[scheduleKey] = {
                    id: schedule.id,
                    day: dayKey,
                    time: timeKey,
                    module: moduleName,
                    moduleId: schedule.module?.id || null,
                    teacher: teacherName,
                    teacherId: schedule.enseignant?.id || null,
                    type: courseType, 
                    group: groupName,
                    groupId: schedule.groupe?.id || null,
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
        
        console.log(`${Object.keys(scheduleData).length} créneaux chargés pour le stagiaire`);
        console.log('Données finales du planning:', scheduleData);
        return scheduleData;
    } catch (error) {
        console.error('Erreur lors du chargement du planning stagiaire:', error);
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
    console.log('DOM chargé, initialisation du planning stagiaire...');
    
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

    // Vérifier que l'utilisateur est bien un stagiaire
    const hasStudentRole = currentUser.roles && currentUser.roles.some(role => 
        role === 'ROLE_STAGIAIRE' || role === 'stagiaire'
    );

    if (!hasStudentRole) {
        console.warn('Utilisateur sans rôle stagiaire:', currentUser.roles);
        showNotification('Accès non autorisé - Réservé aux stagiaires', 'error');
        setTimeout(() => {
            window.location.href = '/client/login_page/index.html';
        }, 3000);
        return;
    }
    
    initializeStudentSchedule();
});

async function initializeStudentSchedule() {
    try {
        console.log("Début de l'initialisation du planning stagiaire");
        showLoadingIndicator(true);
        showNotification("Chargement de votre planning...", "info");

        updateNotificationBadge();
        updateCurrentWeekDisplay();

        // Charger le profil du stagiaire AVANT d'afficher l'info utilisateur
        console.log("Chargement du profil...");
        await loadStudentProfile();

        // Maintenant on affiche avec la photo
        await displayUserInfo();

        // Charger le planning du stagiaire
        console.log("Chargement du planning...");
        await loadStudentSchedule();

        // Charger la grille de planning
        console.log("Chargement de la grille...");
        loadScheduleGrid();

        generateLegend();

        showLoadingIndicator(false);
        showNotification("Planning chargé avec succès", "success");
        console.log("Initialisation du planning stagiaire terminée");
    } catch (error) {
        console.error("Erreur lors de l'initialisation:", error);
        showLoadingIndicator(false);
        showNotification("Erreur lors du chargement du planning", "error");
        displayErrorMessage("Impossible de charger votre planning. Veuillez contacter l'administrateur.");
    }
}

// ==============================================
// FONCTIONS D'AFFICHAGE
// ==============================================

async function displayUserInfo() {
    const savedCurrent = localStorage.getItem('currentUser') || localStorage.getItem('studentProfile');
    let currentUserInfo = { name: 'Stagiaire' };

    if (savedCurrent) {
        try {
            const profile = JSON.parse(savedCurrent);
            currentUserInfo.id = profile.id || profile.userId || profile.id_user;
            currentUserInfo.name = profile.nom || profile.firstName || profile.name || 'Stagiaire';
        } catch (e) {
            console.warn('displayUserInfo parse error', e);
        }
    }

    // Charger le profil depuis l'API si disponible
    if (userProfile && userProfile.photo) {
        currentUserInfo.photo = userProfile.photo;
    }

    // Mettre à jour l'interface
    const elName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');

    if (elName) elName.textContent = currentUserInfo.name;

    if (userAvatar) {
        if (currentUserInfo.photo) {
            userAvatar.innerHTML = `<img src="${currentUserInfo.photo}" alt="Photo de profil" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
            userAvatar.textContent = currentUserInfo.name.charAt(0).toUpperCase();
        }
    }
}


function showLoadingIndicator(show) {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
        indicator.style.display = show ? 'flex' : 'none';
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
    
    // Réinitialiser toutes les cellules
    const cells = document.querySelectorAll('.course-cell');
    cells.forEach(cell => {
        cell.className = 'course-cell empty';
        cell.innerHTML = '<div class="empty-slot"></div>';
    });
    
    // Remplir les cellules avec les données
    Object.keys(scheduleData).forEach(scheduleKey => {
        const schedule = scheduleData[scheduleKey];
        const cell = document.querySelector(`[data-day="${schedule.day}"][data-time="${schedule.time}"]`);
        
        if (cell) {
            console.log(`Affichage cours dans cellule ${scheduleKey}:`, schedule);
            cell.className = 'course-cell occupied';
            cell.innerHTML = `
                <div class="course-block ${getModuleClass(schedule.module)}" onclick="showCourseDetails('${scheduleKey}')">
                    <div class="course-title">${schedule.module}</div>
                    <div class="course-details">
                        <span><i class="fas fa-user"></i> ${schedule.teacher}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${schedule.room}</span>
                        <span><i class="fas fa-tag"></i> ${schedule.type}</span>
                    </div>
                </div>
            `;
        } else {
            console.warn(`Cellule non trouvée pour ${scheduleKey} (day: ${schedule.day}, time: ${schedule.time})`);
        }
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

function generateLegend() {
    const legendItems = document.getElementById('legendItems');
    if (!legendItems) return;
    
    // Récupérer tous les modules uniques du planning
    const uniqueModules = [...new Set(Object.values(scheduleData).map(s => s.module))];
    
    legendItems.innerHTML = '';
    uniqueModules.forEach(module => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color ${getModuleClass(module)}"></div>
            <span>${module}</span>
        `;
        legendItems.appendChild(legendItem);
    });
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
    const uniqueTeachers = [...new Set(schedules.map(s => s.teacher))].length;
    
    if (totalHours) totalHours.textContent = `${hoursThisWeek}h`;
    if (totalCourses) totalCourses.textContent = coursesThisWeek;
    if (totalRooms) totalRooms.textContent = uniqueRooms;
    if (totalTeachers) totalTeachers.textContent = uniqueTeachers;
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
    await loadStudentSchedule();
    loadScheduleGrid();
    generateLegend();
}

async function nextWeek() {
    currentWeek.setDate(currentWeek.getDate() + 7);
    updateCurrentWeekDisplay();
    await loadStudentSchedule();
    loadScheduleGrid();
    generateLegend();
}

// ==============================================
// FONCTIONS DE DÉTAIL ET MODAL
// ==============================================

function showCourseDetails(scheduleKey) {
    const course = scheduleData[scheduleKey];
    if (!course) {
        console.warn('Cours non trouvé pour la clé:', scheduleKey);
        return;
    }
    
    console.log('Affichage détails du cours:', course);
    
    const modal = document.getElementById('courseModal');
    const modalTitle = document.getElementById('modalCourseTitle');
    const modalModuleName = document.getElementById('modalModuleName');
    const modalTeacher = document.getElementById('modalTeacher');
    const modalGroup = document.getElementById('modalGroup');
    const modalTime = document.getElementById('modalTime');
    const modalDate = document.getElementById('modalDate');
    const modalRoom = document.getElementById('modalRoom');
    const modalStatus = document.getElementById('modalStatus');
    
    if (modalTitle) modalTitle.textContent = course.module;
    if (modalModuleName) modalModuleName.textContent = course.module;
    if (modalTeacher) modalTeacher.textContent = course.teacher;
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
    updateNotificationBadge();
    window.location.href = 'notification.html';
}

function showProfile() {
    window.location.href = 'profile.html';
}

function goBack() {
    window.location.href = 'stg.html';
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

// Styles CSS pour les animations et les indicateurs
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

.loading-indicator {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    flex-direction: column;
    gap: 1rem;
}

.loading-indicator i {
    font-size: 2rem;
    color: #007bff;
}

.loading-indicator span {
    font-size: 1.1rem;
    color: #6c757d;
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
    opacity: 0.5;
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
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.course-block:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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

.course-block.gestion-projet {
    background: linear-gradient(135deg, #a8edea, #fed6e3);
    color: #2c3e50;
}

.course-block.general {
    background: linear-gradient(135deg, #c3cfe2, #c3cfe2);
    color: #2c3e50;
}

.legend-color {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    margin-right: 8px;
}

.legend-color.dev-web {
    background: linear-gradient(135deg, #667eea, #764ba2);
}

.legend-color.bdd {
    background: linear-gradient(135deg, #f093fb, #f5576c);
}

.legend-color.algorithmes {
    background: linear-gradient(135deg, #4facfe, #00f2fe);
}

.legend-color.reseaux {
    background: linear-gradient(135deg, #43e97b, #38f9d7);
}

.legend-color.securite {
    background: linear-gradient(135deg, #fa709a, #fee140);
}

.legend-color.gestion-projet {
    background: linear-gradient(135deg, #a8edea, #fed6e3);
}

.legend-color.general {
    background: linear-gradient(135deg, #c3cfe2, #c3cfe2);
}

.legend-items {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
}

.legend-item {
    display: flex;
    align-items: center;
    font-size: 0.9rem;
}
`;
document.head.appendChild(style);

console.log('Planning Stagiaire avec intégration API initialisé avec succès');