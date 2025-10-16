console.log('Modules Stagiaire - Version 2.0 (API Integration)');

// Configuration API
const API_BASE_URL = 'http://localhost:8080/api';

// Variables globales
let currentUser = null;
let userProfile = null;
let modulesData = {};
let userNotes = [];
let userSchedule = [];

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        showLoading(true);
        
        // Récupérer l'utilisateur connecté
        await loadCurrentUser();
        
        if (!currentUser) {
            showError('Utilisateur non connecté. Redirection vers la page de connexion...');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }

        // Charger le profil utilisateur
        await loadUserProfile();
        
        // Charger les données utilisateur
        await loadUserData();
        
        // Initialiser l'interface
        displayUserInfo();
        updateNotificationBadge();
        updateStats();
        
        showLoading(false);
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showError(`Erreur de chargement: ${error.message}`);
        showLoading(false);
    }
}

// Fonctions de chargement des données
async function loadCurrentUser() {
    // Récupérer depuis localStorage ou session
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
    if (!token) {
        throw new Error('Token d\'accès manquant');
    }
    
    if (!currentUser || !currentUser.id) {
        throw new Error('Informations utilisateur manquantes');
    }
}

async function loadUserProfile() {
    try {
        const response = await apiCall(`/profil/${currentUser.id}`, 'GET');
        userProfile = response;
        
        // Mettre à jour le nom avec spécialité si disponible
        const specialityElement = document.getElementById('specialityName');
        if (specialityElement && userProfile.specialite) {
            specialityElement.textContent = `Spécialité: ${userProfile.specialite}`;
        }
        
    } catch (error) {
        console.warn('Impossible de charger le profil:', error.message);
        // Continuer sans profil
    }
}

async function loadUserData() {
    try {
        // Charger les cours du stagiaire
        const courses = await apiCall(`/stagiaires/${currentUser.id}/cours`, 'GET');
        
        // Charger les notes du stagiaire
        try {
            userNotes = await apiCall(`/notes/stagiaire/${currentUser.id}`, 'GET');
        } catch (e) {
            console.warn('Impossible de charger les notes:', e.message);
            userNotes = [];
        }
        
        // Charger l'emploi du temps
        try {
            userSchedule = await apiCall(`/horaires/stagiaire/${currentUser.id}`, 'GET');
        } catch (e) {
            console.warn('Impossible de charger l\'emploi du temps:', e.message);
            userSchedule = [];
        }
        
        // Organiser les données par module
        organizeCoursesByModule(courses);
        
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        throw new Error(`Impossible de charger vos modules: ${error.message}`);
    }
}

function organizeCoursesByModule(courses) {
    modulesData = {};

    courses.forEach(course => {
        const moduleId = course.moduleId;
        const moduleName = course.nomModule || `Module ${moduleId}`;

        if (!modulesData[moduleId]) {
            // Initialisation du module
            modulesData[moduleId] = {
                id: moduleId,
                title: moduleName,
                progress: 0,
                status: 'in-progress',
                courses: [],
                teacher: course.enseignantNom || 'Non défini',
                groupId: course.groupeId || null,
                groupName: course.groupeNom || 'Non défini'
            };
        }

        // ✅ Vérifier si ce cours existe déjà
        let courseRef = modulesData[moduleId].courses.find(c => c.id === course.coursId);
        if (!courseRef) {
            courseRef = {
                id: course.coursId,
                title: course.titre,
                description: course.description,
                files: []   // ✅ liste de fichiers
            };
            modulesData[moduleId].courses.push(courseRef);
        }

        // ✅ Ajouter le fichier s’il existe
        if (course.fichierId) {
            courseRef.files.push({
                id: course.fichierId,
                name: course.fichierNom,
                url: course.fichierUrl,
                type: course.fichierType
            });
        }
    });

    // Afficher les modules
    displayModules();
}


function calculateModuleProgress(moduleId, moduleNotes) {
    if (moduleNotes.length === 0) return 0;
    
    // Si il y a des notes, on considère que le module est en cours ou terminé
    const averageNote = moduleNotes.reduce((sum, note) => sum + parseFloat(note.note), 0) / moduleNotes.length;
    
    // Convertir la note moyenne en pourcentage de progression
    // Note >= 10/20 = 100% (terminé)
    // Note < 10/20 = note*10% (en cours)
    if (averageNote >= 10) {
        return 100;
    } else {
        return Math.round(averageNote * 10);
    }
}

function getModuleStatus(progress) {
    if (progress === 0) return 'not-started';
    if (progress === 100) return 'completed';
    return 'in-progress';
}

function displayModules() {
    const modulesGrid = document.getElementById('modulesGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (Object.keys(modulesData).length === 0) {
        emptyState.style.display = 'block';
        modulesGrid.innerHTML = '';
        return;
    }
    
    emptyState.style.display = 'none';
    modulesGrid.innerHTML = '';
    
    Object.values(modulesData).forEach(module => {
        const moduleCard = createModuleCard(module);
        modulesGrid.appendChild(moduleCard);
    });
}

function createModuleCard(module) {
    const card = document.createElement('div');
    card.className = 'module-card';
    card.setAttribute('data-status', module.status);
    
    const statusClass = `status-${module.status}`;
    const statusText = getStatusText(module.status);
    const isLocked = module.status === 'not-started';
    
    card.innerHTML = `
        <div class="module-header">
            <img src="cours.jpg" alt="Module image" class="module-image">
            <span class="module-status ${statusClass}">${statusText}</span>
        </div>
        <div class="module-body">
            <h3 class="module-title">${escapeHtml(module.title)}</h3>
            <div class="module-info">
                <div class="info-item">
                    <i class="fas fa-user-tie"></i>
                    <span>${escapeHtml(module.teacher)}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-users"></i>
                    <span>${escapeHtml(module.groupName)}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-file"></i>
                    <span>${module.courses.length} cours disponible${module.courses.length > 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill ${module.status === 'completed' ? 'completed' : ''}" style="width: ${module.progress}%"></div>
                <span class="progress-text">${module.progress}%</span>
            </div>
            <button class="module-btn ${isLocked ? 'disabled' : ''}" onclick="openModule(${module.id})" ${isLocked ? 'disabled' : ''}>
                <i class="fas ${isLocked ? 'fa-lock' : 'fa-folder-open'}"></i> 
                ${isLocked ? 'Module verrouillé' : 'Accéder au module'}
            </button>
        </div>
    `;
    
    return card;
}

function getStatusText(status) {
    const statusTexts = {
        'completed': 'Terminé',
        'in-progress': 'En cours',
        'not-started': 'Non commencé'
    };
    return statusTexts[status] || 'Inconnu';
}

// Fonctions de l'interface utilisateur
function displayUserInfo() {
    const userName = currentUser.nom || 'Stagiaire';
    document.getElementById('userName').textContent = userName;
    
    const userAvatar = document.getElementById('userAvatar');
    if (userProfile && userProfile.photo) {
        userAvatar.innerHTML = `<img src="${userProfile.photo}" alt="Photo de profil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
        userAvatar.textContent = userName.charAt(0).toUpperCase();
    }
}

function updateStats() {
    const totalModules = Object.keys(modulesData).length;
    const completedModules = Object.values(modulesData).filter(m => m.status === 'completed').length;
    const inProgressModules = Object.values(modulesData).filter(m => m.status === 'in-progress').length;
    
    // Calcul de la progression globale
    const totalProgress = Object.values(modulesData).reduce((sum, module) => sum + module.progress, 0);
    const globalProgress = totalModules > 0 ? Math.round(totalProgress / totalModules) : 0;

    document.getElementById('totalModules').textContent = totalModules;
    document.getElementById('completedModules').textContent = completedModules;
    document.getElementById('inProgressModules').textContent = inProgressModules;
    document.getElementById('globalProgress').textContent = globalProgress + '%';
}

// Fonctions de filtrage
function filterModules() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const moduleCards = document.querySelectorAll('.module-card');
    
    moduleCards.forEach(card => {
        const title = card.querySelector('.module-title').textContent.toLowerCase();
        const teacher = card.querySelector('.info-item span').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || teacher.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function filterByStatus(status) {
    // Retirer la classe active de tous les boutons
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    // Ajouter la classe active au bouton cliqué
    event.target.classList.add('active');
    
    const moduleCards = document.querySelectorAll('.module-card');
    
    moduleCards.forEach(card => {
        if (status === 'all') {
            card.style.display = 'block';
        } else {
            const cardStatus = card.getAttribute('data-status');
            card.style.display = cardStatus === status ? 'block' : 'none';
        }
    });
}

// Fonctions du modal
function openModule(moduleId) {
    const moduleData = modulesData[moduleId];
    
    if (!moduleData || moduleData.status === 'not-started') {
        showAlert('Module non disponible', 'Ce module n\'est pas encore accessible. Veuillez terminer les modules précédents.', 'warning');
        return;
    }
    
    // Remplir les informations du modal
    document.getElementById('modalModuleTitle').textContent = moduleData.title;
    document.getElementById('modalTeacher').textContent = moduleData.teacher;
    document.getElementById('modalProgress').textContent = moduleData.progress + '%';
    document.getElementById('modalGroup').textContent = moduleData.groupName || 'Non défini';
    
    // Afficher la liste des cours
    displayCourses(moduleData.courses);
    
    // Afficher le modal
    document.getElementById('moduleModal').style.display = 'block';
}

function displayCourses(courses) {
    const coursesList = document.getElementById('coursesList');
    coursesList.innerHTML = '';

    if (!courses || courses.length === 0) {
        coursesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <p>Aucun cours disponible pour ce module</p>
            </div>`;
        return;
    }

    courses.forEach(course => {
        const courseDiv = document.createElement('div');
        courseDiv.className = 'course-item';

        // Créer bloc infos
        let filesHtml = '';
        if (course.files && course.files.length > 0) {
            filesHtml = course.files.map(file => `
                <div class="course-meta">
                    <span><i class="fas fa-file"></i> ${escapeHtml(file.name)} (${escapeHtml(file.type || 'Fichier')})</span>
                </div>
                <a href="${file.url}" target="_blank" class="download-btn">
                    <i class="fas fa-download"></i> Télécharger
                </a>
            `).join('');
        } else {
            filesHtml = `<p style="color:#777;font-style:italic;">Aucun fichier</p>`;
        }

        courseDiv.innerHTML = `
            <div class="course-info">
                <h4 class="course-title">
                    <i class="fas fa-book"></i> ${escapeHtml(course.title)}
                </h4>
                <p class="course-description">${escapeHtml(course.description || '')}</p>
                
                <div class="course-files">
                    ${course.files && course.files.length > 0 ? 
                        course.files.map(file => `
                            <div class="file-item">
                                <div class="file-info">
                                    <i class="fas fa-file-${getFileIcon(file.type)}"></i>
                                    <div class="file-details">
                                        <span class="file-name">${escapeHtml(file.name)}</span>
                                        <span class="file-type">${escapeHtml(file.type || 'Fichier')}</span>
                                        ${file.size ? `<span class="file-size">${formatFileSize(file.size)}</span>` : ''}
                                    </div>
                                </div>
                                <a href="${file.url}" target="_blank" class="download-btn-small">
                                    <i class="fas fa-download"></i>
                                </a>
                            </div>
                        `).join('') 
                        : '<p class="no-files">Aucun fichier disponible</p>'
                    }
                </div>
            </div>
        `;

        coursesList.appendChild(courseDiv);
    });
}





function downloadCourse(courseId, title, url) {
    if (url && url !== 'null' && url !== '') {
        // Télécharger depuis l'URL
        window.open(url, '_blank');
        showAlert('Téléchargement', `Téléchargement de "${title}" démarré...`, 'success');
    } else {
        showAlert('Fichier indisponible', `Le fichier "${title}" n'est pas disponible au téléchargement.`, 'warning');
    }
    
    updateDownloadStats();
}

function downloadAllCourses() {
    const courseItems = document.querySelectorAll('.course-item');
    if (courseItems.length === 0) {
        showAlert('Aucun cours', 'Aucun cours disponible à télécharger.', 'warning');
        return;
    }
    
    let downloadCount = 0;
    courseItems.forEach(item => {
        const downloadBtn = item.querySelector('.download-btn');
        if (downloadBtn && !downloadBtn.disabled) {
            downloadBtn.click();
            downloadCount++;
        }
    });
    
    if (downloadCount > 0) {
        showAlert('Téléchargement', `Téléchargement de ${downloadCount} cours en cours...`, 'success');
        setTimeout(() => {
            closeModal();
        }, 1000);
    }
}

// Fonctions utilitaires
function getFileIcon(type) {
    const icons = {
        'PDF': 'pdf',
        'application/pdf': 'pdf',
        'ZIP': 'archive',
        'application/zip': 'archive',
        'SQL': 'code',
        'DOC': 'word',
        'DOCX': 'word',
        'application/msword': 'word',
        'PPT': 'powerpoint',
        'PPTX': 'powerpoint',
        'application/vnd.ms-powerpoint': 'powerpoint',
        'XLS': 'excel',
        'XLSX': 'excel',
        'application/vnd.ms-excel': 'excel',
        'PNG': 'image',
        'JPG': 'image',
        'JPEG': 'image',
        'image/png': 'image',
        'image/jpeg': 'image',
        'TXT': 'alt',
        'text/plain': 'alt'
    };
    return icons[type] || 'file';
}


function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function downloadAllFilesFromCourse(courseId) {
    const courseFiles = document.querySelectorAll(`[data-course-id="${courseId}"] .download-btn-small`);
    let downloadCount = 0;
    
    courseFiles.forEach(btn => {
        if (btn.href && btn.href !== 'null') {
            btn.click();
            downloadCount++;
        }
    });
    
    if (downloadCount > 0) {
        showAlert('Téléchargement', `${downloadCount} fichier(s) en cours de téléchargement`, 'success');
    }
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return 'Date inconnue';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Fonctions de notification
async function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
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

function updateDownloadStats() {
    let downloads = parseInt(localStorage.getItem('studentDownloads') || '0');
    downloads++;
    localStorage.setItem('studentDownloads', downloads.toString());
}

// Fonctions de navigation
function closeModal() {
    document.getElementById('moduleModal').style.display = 'none';
}

function goBack() {
    window.history.back();
}

function showNotifications() {
    window.location.href = 'notification.html';
}

function showProfile() {
    window.location.href = 'profile.html';
}

// Fonctions d'interface
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.querySelector('span').textContent = message;
        errorDiv.style.display = 'block';
    }
}

function showAlert(title, message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <strong>${title}</strong>
            <p>${message}</p>
        </div>
    `;
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'warning' ? '#f39c12' : '#3498db'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Fonction d'appel API
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
                window.location.href = 'login.html';
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

// Event listeners
window.onclick = function(event) {
    const modal = document.getElementById('moduleModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Styles pour les animations
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }
    
    .loading-spinner {
        background: white;
        padding: 2rem;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    
    .loading-spinner i {
        font-size: 2rem;
        color: #3498db;
        margin-bottom: 1rem;
    }
    
    .error-message {
        background: #f8d7da;
        color: #721c24;
        padding: 1rem;
        border-radius: 5px;
        margin-bottom: 1rem;
        border: 1px solid #f5c6cb;
    }
    
    .empty-state {
        text-align: center;
        padding: 3rem;
        color: #666;
    }
    
    .empty-state i {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }
    
    .speciality-info {
        background: #e3f2fd;
        color: #1565c0;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.5rem;
        font-weight: 500;
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .toast-content p {
        margin: 0.5rem 0 0 0;
        font-size: 0.9rem;
    }
`;
document.head.appendChild(toastStyles);