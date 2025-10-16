console.log('Notes Stagiaire - Version 2.0 (API Integration)');

// Configuration API
const API_BASE_URL = 'http://localhost:8080/api';

// Variables globales
let currentUser = null;
let userProfile = null;
let gradesData = {};
let allGrades = [];
let currentFilter = 'all';

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
                window.location.href = 'client/login_page/index.html';
            }, 2000);
            return;
        }

        // Charger le profil utilisateur
        await loadUserProfile();
        
        // Charger les notes et données utilisateur
        await loadUserNotes();
        
        // Initialiser l'interface
        displayUserInfo();
        updateNotificationBadge();
        updateStatistics();
        displayNotes();
        
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
        
    } catch (error) {
        console.warn('Impossible de charger le profil:', error.message);
        // Continuer sans profil
        userProfile = null;
    }
}

async function loadUserNotes() {
    try {
        // Charger les notes du stagiaire
        const notes = await apiCall(`/notes/stagiaire/${currentUser.id}`, 'GET');
        
        // Organiser les notes par module
        organizeGradesByModule(notes);
        
    } catch (error) {
        console.error('Erreur lors du chargement des notes:', error);
        // Continuer avec des données vides
        gradesData = {};
        allGrades = [];
    }
}

function organizeGradesByModule(notes) {
    gradesData = {};
    allGrades = [];

    // Coefficients selon le type
    const coefMap = {
        test1: 0.2,
        test2: 0.2,
        exam: 0.6
    };

    const moduleGroups = {};
    
    notes.forEach(note => {
        const moduleId = note.module.id;
        const moduleName = note.module.nom;
        
        if (!moduleGroups[moduleId]) {
            moduleGroups[moduleId] = {
                moduleId: moduleId,
                moduleTitle: moduleName,
                teacher: note.enseignant.nom,
                teacherEmail: note.enseignant.email || 'non fourni',
                teacherPhoto: note.enseignant.photo || 'default.jpg',
                grades: [],
                totalPoints: 0,
                totalCoefficients: 0
            };
        }

        // Récupérer le type depuis informations_supplementaires
        let evalType = 'Évaluation';
        try {
            if (note.informations_supplementaires) {
                let info = note.informations_supplementaires;

                if (typeof info === 'string') {
                    try {
                        info = JSON.parse(info);
                    } catch (e) {
                        const match = info.match(/Type:\s*(\w+)/i);
                        if (match) evalType = match[1];
                    }
                }

                if (info && typeof info === 'object' && info.type) {
                    evalType = info.type;
                }
            }
        } catch (e) {
            console.warn("Erreur parsing informations_supplementaires:", note.informations_supplementaires);
        }

        // Déterminer le coefficient selon le type
        const coefficient = coefMap[evalType.toLowerCase()] || 1.0;

        const gradeItem = {
            id: note.id,
            title: evalType,
            score: parseFloat(note.note),
            maxScore: 20,
            date: note.cree_a,
            type: evalType,
            coefficient: coefficient
        };

        moduleGroups[moduleId].grades.push(gradeItem);
        moduleGroups[moduleId].totalPoints += gradeItem.score * gradeItem.coefficient;
        moduleGroups[moduleId].totalCoefficients += gradeItem.coefficient;

        allGrades.push({
            ...gradeItem,
            moduleTitle: moduleName,
            teacher: note.enseignant.nom,
            teacherEmail: 'contact@cfpa.dz',
            teacherPhoto: 'photo.jpg'
        });
    });

    Object.keys(moduleGroups).forEach(moduleId => {
        const module = moduleGroups[moduleId];
        if (module.totalCoefficients > 0) {
            module.moduleAverage = module.totalPoints / module.totalCoefficients;
        } else {
            module.moduleAverage = 0;
        }
        gradesData[moduleId] = module;
    });
}

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

function updateStatistics() {
    // Calcul de la moyenne générale
    let totalPoints = 0;
    let totalCoefficients = 0;
    let bestGrade = 0;
    let totalEvaluations = allGrades.length;
    let passedModules = 0;

    Object.values(gradesData).forEach(module => {
        if (module.moduleAverage >= 10) passedModules++;
        
        module.grades.forEach(grade => {
            totalPoints += grade.score * grade.coefficient;
            totalCoefficients += grade.coefficient;
            if (grade.score > bestGrade) bestGrade = grade.score;
        });
    });

    const averageGrade = totalCoefficients > 0 ? (totalPoints / totalCoefficients).toFixed(1) : 0;

    // Mise à jour des statistiques dans l'interface
    document.getElementById('averageGrade').textContent = averageGrade;
    document.getElementById('bestGrade').textContent = bestGrade.toFixed(1);
    document.getElementById('totalEvaluations').textContent = totalEvaluations;
    document.getElementById('passedModules').textContent = passedModules;
}

function displayNotes() {
    const container = document.getElementById('notesContainer');
    container.innerHTML = '';

    if (Object.keys(gradesData).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>Aucune note disponible</h3>
                <p>Vos notes apparaîtront ici une fois qu'elles auront été saisies par vos enseignants.</p>
            </div>
        `;
        return;
    }

    Object.entries(gradesData).forEach(([moduleId, moduleData]) => {
        const moduleCard = createModuleCard(moduleId, moduleData);
        container.appendChild(moduleCard);
    });
}

function createModuleCard(moduleId, moduleData) {
    const card = document.createElement('div');
    card.className = 'module-note-card';
    card.setAttribute('data-module', moduleId);

    const statusClass = moduleData.moduleAverage >= 10 ? 'passed' : 'failed';
    
    card.innerHTML = `
        <div class="module-note-header">
            <div class="module-info">
                <h3>
                    <i class="fas fa-book"></i>
                    ${escapeHtml(moduleData.moduleTitle)}
                </h3>
                <div class="module-teacher">
                    <i class="fas fa-user-tie"></i>
                    ${escapeHtml(moduleData.teacher)}
                </div>
            </div>
            <div class="module-average">
                <div class="average-score ${statusClass}">${moduleData.moduleAverage.toFixed(1)}</div>
                <div class="average-label">/ 20</div>
            </div>
        </div>
        <div class="module-note-body">
            <div class="grades-list">
                ${moduleData.grades.map(grade => createGradeItem(grade)).join('')}
            </div>
            <button class="contact-teacher-btn" onclick="openContactModal('${escapeHtml(moduleData.teacher)}', '${escapeHtml(moduleData.moduleTitle)}', '${moduleData.teacherEmail}', '${moduleData.teacherPhoto}')">
                <i class="fas fa-envelope"></i>
                Contacter l'Enseignant
            </button>
        </div>
    `;

    return card;
}

function createGradeItem(grade) {
    const scoreClass = grade.score >= 16 ? 'excellent' : grade.score >= 12 ? 'good' : grade.score >= 10 ? 'average' : 'poor';
    
    return `
        <div class="grade-item" onclick="openGradeModal(${grade.id}, '${escapeHtml(grade.moduleTitle || '')}', '${escapeHtml(grade.teacher || '')}')">
            <div class="grade-info">
                <div class="grade-title">${escapeHtml(grade.title)}</div>
                <div class="grade-details">
                    <span><i class="fas fa-calendar"></i> ${formatDate(grade.date)}</span>
                    <span><i class="fas fa-tag"></i> ${escapeHtml(grade.type)}</span>
                    <span><i class="fas fa-weight-hanging"></i> Coef. ${grade.coefficient}</span>
                </div>
            </div>
            <div class="grade-score-badge ${scoreClass}">
                ${grade.score.toFixed(1)}/${grade.maxScore}
            </div>
        </div>
    `;
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

function openGradeModal(gradeId, moduleTitle, teacher) {
    // Trouver la note correspondante
    let selectedGrade = null;
    let selectedModule = null;
    
    Object.values(gradesData).forEach(module => {
        const grade = module.grades.find(g => g.id === gradeId);
        if (grade) {
            selectedGrade = grade;
            selectedModule = module;
        }
    });
    
    if (!selectedGrade || !selectedModule) return;

    // Remplir le modal avec les détails de la note
    document.getElementById('modalGradeTitle').textContent = selectedGrade.title;
    document.getElementById('modalScore').textContent = selectedGrade.score.toFixed(1);
    document.getElementById('modalModule').textContent = selectedModule.moduleTitle;
    document.getElementById('modalTeacher').textContent = selectedModule.teacher;
    document.getElementById('modalDate').textContent = formatDate(selectedGrade.date);
    document.getElementById('modalType').textContent = selectedGrade.type;
    
    // Mettre à jour le commentaire (pour l'instant caché car pas dans l'API)
    const commentElement = document.getElementById('modalComment');
    commentElement.style.display = 'none';

    // Stocker les informations pour le contact
    document.getElementById('gradeModal').setAttribute('data-teacher', selectedModule.teacher);
    document.getElementById('gradeModal').setAttribute('data-module', selectedModule.moduleTitle);
    document.getElementById('gradeModal').setAttribute('data-email', selectedModule.teacherEmail);
    document.getElementById('gradeModal').setAttribute('data-photo', selectedModule.teacherPhoto);

    // Afficher le modal
    document.getElementById('gradeModal').style.display = 'block';
}

function contactTeacher() {
    const modal = document.getElementById('gradeModal');
    const teacher = modal.getAttribute('data-teacher');
    const moduleTitle = modal.getAttribute('data-module');
    const email = modal.getAttribute('data-email');
    const photo = modal.getAttribute('data-photo');
    
    closeModal();
    openContactModal(teacher, moduleTitle, email, photo);
}

function openContactModal(teacher, moduleTitle, email, photo) {
    document.getElementById('contactTeacherName').textContent = teacher;
    document.getElementById('contactTeacherModule').textContent = moduleTitle;
    document.getElementById('teacherEmail').textContent = email;
    document.getElementById('teacherPhoto').src = photo;
    
    // Préremplir le sujet du message
    document.getElementById('messageSubject').value = `Question concernant le module ${moduleTitle}`;
    document.getElementById('messageContent').value = '';
    
    document.getElementById('contactModal').style.display = 'block';
}

function sendMessage() {
    const subject = document.getElementById('messageSubject').value.trim();
    const content = document.getElementById('messageContent').value.trim();
    
    if (!subject || !content) {
        showAlert('Erreur', 'Veuillez remplir tous les champs du message.', 'error');
        return;
    }
    
    // Simulation de l'envoi du message (peut être implémenté avec l'API notifications)
    showAlert('Message envoyé', 'Votre message a été envoyé avec succès. L\'enseignant vous répondra bientôt.', 'success');
    
    // Fermer le modal et réinitialiser le formulaire
    closeContactModal();
    
    // Dans un vrai système, ici on pourrait créer une notification
    console.log('Message envoyé:', { subject, content });
}

function closeModal() {
    document.getElementById('gradeModal').style.display = 'none';
}

function closeContactModal() {
    document.getElementById('contactModal').style.display = 'none';
    document.getElementById('messageSubject').value = '';
    document.getElementById('messageContent').value = '';
}

function filterNotes() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const moduleCards = document.querySelectorAll('.module-note-card');
    
    moduleCards.forEach(card => {
        const moduleTitle = card.querySelector('.module-info h3').textContent.toLowerCase();
        const teacher = card.querySelector('.module-teacher').textContent.toLowerCase();
        const grades = card.querySelectorAll('.grade-title');
        
        let hasMatch = moduleTitle.includes(searchTerm) || teacher.includes(searchTerm);
        
        // Vérifier aussi dans les titres des notes
        grades.forEach(grade => {
            if (grade.textContent.toLowerCase().includes(searchTerm)) {
                hasMatch = true;
            }
        });
        
        card.style.display = hasMatch ? 'block' : 'none';
    });
}

function filterByModule(filter) {
    // Mettre à jour les boutons de filtre
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    currentFilter = filter;
    const moduleCards = document.querySelectorAll('.module-note-card');
    
    moduleCards.forEach(card => {
        const moduleId = card.getAttribute('data-module');
        const moduleData = gradesData[moduleId];
        
        if (filter === 'all') {
            card.style.display = 'block';
        } else if (filter === 'passed') {
            card.style.display = moduleData.moduleAverage >= 10 ? 'block' : 'none';
        } else if (filter === 'failed') {
            card.style.display = moduleData.moduleAverage < 10 ? 'block' : 'none';
        }
    });
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

function showAlert(title, message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <strong>${title}</strong>
            <p>${message}</p>
        </div>
    `;
    
    const bgColor = type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        max-width: 350px;
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Fonction d'appel API (identique à module.js)
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
    const gradeModal = document.getElementById('gradeModal');
    const contactModal = document.getElementById('contactModal');
    
    if (event.target === gradeModal) {
        closeModal();
    } else if (event.target === contactModal) {
        closeContactModal();
    }
}

// Ajouter les styles pour les animations toast
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
        animation: spin 1s linear infinite;
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
    
    .grade-score-badge.excellent {
        background: #27ae60;
        color: white;
    }
    
    .grade-score-badge.good {
        background: #3498db;
        color: white;
    }
    
    .grade-score-badge.average {
        background: #f39c12;
        color: white;
    }
    
    .grade-score-badge.poor {
        background: #e74c3c;
        color: white;
    }
    
    .module-average.passed {
        color: #27ae60;
    }
    
    .module-average.failed {
        color: #e74c3c;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
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