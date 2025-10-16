// ---------- CONFIG API ----------
const API_BASE_URL = 'http://localhost:8080/api';
let authToken = localStorage.getItem('accessToken') || null;

// ---------- GLOBALS ----------
let gradesData = {};
let currentStudentId = null;
let currentModuleId = null;
let editingStudent = false;

const moduleCoefficients = {
    'test1': 0.2,
    'test2': 0.2,  
    'exam': 0.6  
};

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
    initializePage().catch(err => console.error('Initialization failed', err));
    setupEventListeners();
});

async function initializePage() {
    console.log('Initialisation de la page de gestion des notes (API-enabled)');         // garde compatibilité locale si présent
    displayUserInfo();
    try {
        await loadAssignedModules(); // charge modules assignés depuis l'API
    } catch (err) {
        console.warn('Impossible de charger les modules assignés:', err.message);
        // fallback vers les données locales
        loadModulesFromCourses();
    }
    updateNotificationBadge();
}

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

//---------- Fonctions d'initialisation et de configuration ----------//
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

// ---------- LOAD ASSIGNED MODULES ----------
async function loadAssignedModules() {
    // récupère l'id utilisateur depuis currentUser (ou teacherProfile)
    const raw = localStorage.getItem('currentUser') || localStorage.getItem('teacherProfile');
    if (!raw) {
        console.warn('Aucun utilisateur trouvé dans localStorage (currentUser/teacherProfile)');
        return;
    }
    let user = {};
    try { user = JSON.parse(raw); } catch (e) { console.warn(e); return; }
    const teacherId = user.id || user.userId || user.id_user;
    if (!teacherId) {
        console.warn('Impossible de déterminer teacherId depuis currentUser/teacherProfile');
        return;
    }

    // Appel API: tentons /utilisateur-modules/teacher/:teacherId (stable), sinon fallback /modules/enseignant/:id
    let associations = [];
    try {
        associations = await apiRequest(`/utilisateur-modules/teacher/${teacherId}`, { method: 'GET' });
    } catch (err) {
        console.warn('/utilisateur-modules failed, trying /modules/enseignant', err.message);
        try {
            associations = await apiRequest(`/modules/enseignant/${teacherId}`, { method: 'GET' });
        } catch (err2) {
            console.error('Aucun endpoint de modules enseignant disponible', err2.message);
            associations = [];
        }
    }

    if (!associations || associations.length === 0) {
        console.log('Aucune association module-enseignant trouvée pour cet utilisateur');
        return;
    }

    // Créer gradesData pour chaque module unique
    const seen = new Set();
    for (const row of associations) {
        const moduleId = row.moduleId ?? row.id ?? row.module_id ?? row.moduleId;
        const moduleNom = row.moduleNom ?? row.moduleNom ?? row.nom ?? row.moduleName;
        const groupeId = row.groupeId ?? row.groupe_id;
        
        if (!moduleId) continue;
        const moduleKey = `module-${moduleId}`;
        
        if (seen.has(moduleKey)) continue;
        seen.add(moduleKey);
        
        // si déjà présent dans gradesData (local saved), on conserve ; sinon on crée
        if (!gradesData[moduleKey]) {
            gradesData[moduleKey] = {
                name: moduleNom || `Module ${moduleId}`,
                description: '',
                students: [],
                groupeId: groupeId
            };
        }
    }

    // Pour chaque module assigné, charger les stagiaires
    for (const moduleKey of Array.from(seen)) {
        const numericId = parseInt(moduleKey.split('-')[1], 10);
        try {
            await loadStudentsForModule(numericId, moduleKey);
        } catch (err) {
            console.warn(`Chargement stagiaires pour module ${moduleKey} échoué:`, err.message);
        }
    }

    displayModules();
    populateModuleSelect();
}

// ---------- LOAD STUDENTS FOR A MODULE ----------
async function loadStudentsForModule(moduleId, moduleKey) {
    if (!gradesData[moduleKey]) {
        console.warn('Module non présent localement:', moduleKey);
        return;
    }

    try {
        // 🔥 Récupérer toutes les notes du module en une seule requête
        let moduleNotes = [];
        try {
            moduleNotes = await apiRequest(`/notes/module/${moduleId}`, { method: 'GET' });
        } catch (err) {
            console.warn(`Impossible de charger les notes pour le module ${moduleId}:`, err.message);
            moduleNotes = [];
        }

        // Charger les stagiaires liés au module
        let students = [];
        try {
            students = await apiRequest(`/utilisateur-modules/students/${moduleId}`, { method: 'GET' });
        } catch (err) {
            console.warn(`Impossible de charger les stagiaires pour le module ${moduleId}:`, err.message);
            students = [];
        }

        gradesData[moduleKey].students = [];

        for (const studentRow of students) {
            const studentId = studentRow.stagiaireId || studentRow.id || studentRow.utilisateurId;
            const studentNom = studentRow.stagiaireNom || studentRow.nom || 'Étudiant';
            const studentEmail = studentRow.email || '';

            if (!studentId) continue;

            // Notes de ce stagiaire dans le module courant
            const studentNotes = moduleNotes.filter(n => n.stagiaire.id === studentId);

            let existingGrades = {};
            let gradesIds = {};

            for (const note of studentNotes) {
                // Nettoyer la chaîne => "Type: test1" → "test1"
                let type = note.informations_supplementaires?.toLowerCase().trim() || "";
                type = type.replace("type:", "").trim();

                if (type === "test1") {
                    existingGrades.test1 = parseFloat(note.note);
                    gradesIds.test1 = note.id;
                }
                if (type === "test2") {
                    existingGrades.test2 = parseFloat(note.note);
                    gradesIds.test2 = note.id;
                }
                if (type === "exam") {
                    existingGrades.exam = parseFloat(note.note);
                    gradesIds.exam = note.id;
                }
            }

            gradesData[moduleKey].students.push({
                id: `db-student-${studentId}`,
                serverId: studentId,
                firstName: studentNom.split(' ')[0] || 'Prénom',
                lastName: studentNom.split(' ').slice(1).join(' ') || 'Nom',
                email: studentEmail,
                groupe: studentRow.groupeNom || 'Non assigné',
                grades: existingGrades,
                gradesIds: gradesIds
            });
        }

    } catch (err) {
        console.error('loadStudentsForModule error', err);
        throw err;
    }
}
// ---------- SAVE GRADES TO SERVER ----------
async function saveGradesToServer(studentId, moduleId, grades) {
    if (!studentId || !moduleId || !grades) return;

    // Retrouver le module
    const moduleKey = Object.keys(gradesData).find(
        key => key === `module-${moduleId}` || key === moduleId
    );
    if (!moduleKey) return;

    const student = gradesData[moduleKey].students.find(s => s.id === studentId);
    if (!student || !student.serverId) return;

    try {
        for (const [gradeType, gradeValue] of Object.entries(grades)) {
            if (gradeValue !== null && gradeValue !== undefined && gradeValue !== '') {
                // Vérifier si une note existe déjà (grâce à gradesIds)
                if (student.gradesIds && student.gradesIds[gradeType]) {
                    // 🔄 Mise à jour
                    await apiRequest(`/notes/${student.gradesIds[gradeType]}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            note: parseFloat(gradeValue),
                            informations_supplementaires: `Type: ${gradeType}`
                        })
                    });
                } else {
                    // ➕ Création
                    const newNote = await apiRequest('/notes', {
                        method: 'POST',
                        body: JSON.stringify({
                            stagiaireId: student.serverId,
                            moduleId: parseInt(moduleId.toString().replace('module-', '')),
                            note: parseFloat(gradeValue),
                            informations_supplementaires: `Type: ${gradeType}`
                        })
                    });

                    if (!student.gradesIds) student.gradesIds = {};
                    student.gradesIds[gradeType] = newNote.id;
                }

            }
        }

        showNotification('Notes sauvegardées sur le serveur', 'success');
    } catch (err) {
        console.error('Erreur sauvegarde notes serveur:', err);
        showNotification(`Erreur sauvegarde: ${err.message}`, 'error');
    }
}

function setupEventListeners() {
    window.onclick = function(event) {
        const modals = ['gradesModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (event.target === modal) {
                closeModal(modalId);
            }
        });
    };

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function loadModulesFromCourses() {
    try {
        const savedModulesData = JSON.parse(localStorage.getItem('modulesData'));
        if (savedModulesData && savedModulesData.modules) {
            const modules = savedModulesData.modules;
            Object.keys(modules).forEach(moduleId => {
                if (!gradesData[moduleId]) {
                    gradesData[moduleId] = {
                        name: modules[moduleId].name,
                        description: modules[moduleId].description,
                        students: []
                    };
                }
                else {
                    gradesData[moduleId].name = modules[moduleId].name;
                    gradesData[moduleId].description = modules[moduleId].description;
                }
            });
            syncWithCourseModules();
            displayModules();
            populateModuleSelect();
        } else {
            createTestData();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des modules:', error);
        createTestData();
    }
}

function createTestData() {
    displayModules();
    populateModuleSelect();
}

function syncWithCourseModules() {
    try {
        const coursesData = JSON.parse(localStorage.getItem('modulesData'));
        if (coursesData && coursesData.modules) {
            let gradesData = JSON.parse(localStorage.getItem('gradesData')) || {};
            
            Object.keys(coursesData.modules).forEach(moduleId => {
                const courseModule = coursesData.modules[moduleId];
                if (!gradesData[moduleId]) {
                    gradesData[moduleId] = {
                        name: courseModule.name,
                        description: courseModule.description || '',
                        students: []
                    };
                }
            });
            
            localStorage.setItem('gradesData', JSON.stringify(gradesData));
        }
    } catch (error) {
        console.error('Erreur lors de la synchronisation avec les modules de cours:', error);
    }
}

//---------- Fonctions d'affichage ----------//
function displayModules() {
    const container = document.getElementById('modulesContainer');
    container.innerHTML = '';
    
    if (Object.keys(gradesData).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-graduation-cap"></i>
                <h3>Aucun module trouvé</h3>
                <p>Commencez par créer des modules dans la section Cours</p>
            </div>
        `;
        return;
    }
    
    Object.keys(gradesData).forEach(moduleId => {
        const moduleData = gradesData[moduleId];
        const students = moduleData.students || [];
        
        const moduleElement = document.createElement('div');
        moduleElement.className = 'module-item';
        moduleElement.innerHTML = `
            <div class="module-header" onclick="toggleModule('${moduleId}')">
                <div class="module-info">
                    <h3><i class="fas fa-book"></i> ${moduleData.name}</h3>
                </div>
                <div class="module-stats">
                    <div class="stat-item">
                        <span class="stat-number">${students.length}</span>
                        <span class="stat-label">Stagiaires</span>
                    </div>
                </div>
                <div class="module-actions">
                    <button class="module-toggle" id="toggle-${moduleId}">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
            </div>
            <div class="module-content" id="content-${moduleId}">
                <div class="grades-section">
                    ${generateGradesTable(moduleId)}
                </div>
            </div>
        `;
        
        container.appendChild(moduleElement);
    });
}

function generateGradesTable(moduleId) {
    const moduleData = gradesData[moduleId];
    const students = moduleData.students || [];
    
    if (students.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-user-graduate"></i>
                <h3>Aucun stagiaire dans ce module</h3>
                <p>Les stagiaires seront chargés automatiquement depuis la base de données</p>
            </div>
        `;
    }
    
    let tableRows = '';
    students.forEach(student => {
        const grades = student.grades || {};
        
        tableRows += `
            <tr>
                <td class="student-info-cell">
                    <div class="student-name">${student.firstName} ${student.lastName}</div>
                    <div class="student-matricule">${student.groupe}</div>
                </td>
                <td class="grade-cell">
                    <span class="grade-value ${getGradeClass(grades.test1)}">${formatGrade(grades.test1)}</span>
                </td>
                <td class="grade-cell">
                    <span class="grade-value ${getGradeClass(grades.test2)}">${formatGrade(grades.test2)}</span>
                </td>
                <td class="grade-cell">
                    <span class="grade-value ${getGradeClass(grades.exam)}">${formatGrade(grades.exam)}</span>
                </td>
                <td class="grade-cell average-cell">
                    <span class="grade-value ${getGradeClass(calculateAverage(grades))}">${formatGrade(calculateAverage(grades))}</span>
                </td>
                <td class="actions-cell">
                    <button class="action-btn-small edit-btn" onclick="openGradesModal('${student.id}', '${moduleId}')" title="Modifier les notes">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn-small delete-btn" onclick="deleteStudent('${student.id}', '${moduleId}')" title="Supprimer l'étudiant">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    return `
        <table class="grades-table">
            <thead>
                <tr>
                    <th>Stagiaire</th>
                    <th>Test 1<br><small>(Coef: ${moduleCoefficients.test1})</small></th>
                    <th>Test 2<br><small>(Coef: ${moduleCoefficients.test2})</small></th>
                    <th>Examen<br><small>(Coef: ${moduleCoefficients.exam})</small></th>
                    <th>Moyenne</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}

function populateModuleSelect() {
    const select = document.getElementById('studentModule');
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner un module</option>';
    
    Object.keys(gradesData).forEach(moduleId => {
        const option = document.createElement('option');
        option.value = moduleId;
        option.textContent = gradesData[moduleId].name;
        select.appendChild(option);
    });
}

//---------- Fonctions de calcul et utilitaires ----------//
function calculateAverage(grades) {
    if (!grades.test1 && !grades.test2 && !grades.exam) return null;
    
    let total = 0;
    let totalCoef = 0;
    
    if (grades.test1 !== null && grades.test1 !== undefined) {
        total += grades.test1 * moduleCoefficients.test1;
        totalCoef += moduleCoefficients.test1;
    }
    if (grades.test2 !== null && grades.test2 !== undefined) {
        total += grades.test2 * moduleCoefficients.test2;
        totalCoef += moduleCoefficients.test2;
    }
    if (grades.exam !== null && grades.exam !== undefined) {
        total += grades.exam * moduleCoefficients.exam;
        totalCoef += moduleCoefficients.exam;
    }
    
    return totalCoef > 0 ? total / totalCoef : null;
}

function getGradeClass(grade) {
    if (grade === undefined || grade === null || grade === '') return 'grade-empty';
    if (grade >= 16) return 'grade-excellent';
    if (grade >= 14) return 'grade-good';
    if (grade >= 10) return 'grade-average';
    return 'grade-poor';
}

function formatGrade(grade) {
    if (grade === undefined || grade === null || grade === '') return '--';
    else if (grade < 0 || grade > 20) return console.error();
    return parseFloat(grade).toFixed(1);
}

function findStudent(studentId, moduleId) {
    const moduleData = gradesData[moduleId];
    return moduleData?.students?.find(s => s.id === studentId);
}

function generateId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

//---------- Fonctions pour les modals ----------//
function openGradesModal(studentId, moduleId) {
    currentStudentId = studentId;
    currentModuleId = moduleId;
    
    const student = findStudent(studentId, moduleId);
    if (!student) return;
    
    document.getElementById('gradesModalTitle').textContent = 'Modifier les Notes';
    document.getElementById('studentInfo').innerHTML = `
        <h4>${student.firstName} ${student.lastName}</h4>
        <p>Groupe: ${student.groupe} | Module: ${gradesData[moduleId].name}</p>
    `;
    
    const grades = student.grades || {};
    document.getElementById('test1Grade').value = grades.test1 || '';
    document.getElementById('test2Grade').value = grades.test2 || '';
    document.getElementById('examGrade').value = grades.exam || '';
    
    document.getElementById('gradesModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.style.display = 'none');
}

async function saveGrades() {
    if (!currentStudentId || !currentModuleId) return;
    
    const student = findStudent(currentStudentId, currentModuleId);
    if (!student) return;
    
    const test1 = document.getElementById('test1Grade').value;
    const test2 = document.getElementById('test2Grade').value;
    const exam = document.getElementById('examGrade').value;
    
    const newGrades = {
        test1: test1 !== '' ? parseFloat(test1) : null,
        test2: test2 !== '' ? parseFloat(test2) : null,
        exam: exam !== '' ? parseFloat(exam) : null
    };
    
    student.grades = newGrades;
    
    // 🔥 Sauvegarder sur le serveur si c'est un étudiant du serveur
    if (student.serverId) {
        try {
            await saveGradesToServer(currentStudentId, currentModuleId, newGrades);
        } catch (err) {
            console.warn('Erreur sauvegarde serveur, sauvegarde locale uniquement:', err.message);
        }
    }

    displayModules();
    closeModal('gradesModal');
    showNotification('Notes mises à jour', 'success');
}

//---------- Fonctions d'interface utilisateur ----------//
function toggleModule(moduleId) {
    const content = document.getElementById(`content-${moduleId}`);
    const toggle = document.getElementById(`toggle-${moduleId}`);
    
    if (content.classList.contains('active')) {
        content.classList.remove('active');
        toggle.classList.remove('active');
    } else {
        document.querySelectorAll('.module-content').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.module-toggle').forEach(t => t.classList.remove('active'));
        
        content.classList.add('active');
        toggle.classList.add('active');
    }
}

//---------- Fonctions de navigation ----------//
function goBack() {
    window.history.back();
}

function showProfile() {
    window.location.href = 'profile.html';
}

function showNotifications() {
    window.location.href = 'notification.html';
}

//---------- Notifications ----------//

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
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        z-index: 9999;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(()=> notification.style.transform='translateX(0)', 50);
    setTimeout(()=> {
        notification.style.transform='translateX(400px)';
        setTimeout(()=> { if (notification.parentNode) notification.parentNode.removeChild(notification); }, 300);
    }, 3000);
}

//---------- Fonction pour mettre à jour le badge de notification ----------//
async function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    try {
        const notifications = await loadNotificationsFromAPI();
        const unreadCount = notifications.filter(n => !n.lu).length; // ⚠️ utilise "lu" comme dans profile.js
        
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    } catch (error) {
        console.error('Erreur mise à jour badge notifications:', error);
        badge.style.display = 'none';
    }
}

//---------- Fonctions d'export et sauvegarde ----------//
async function saveAllGrades() {
    try {
        // Sauvegarder toutes les notes sur le serveur
        for (const moduleId in gradesData) {
            const students = gradesData[moduleId].students || [];
            for (const student of students) {
                if (student.serverId && student.grades) {
                    try {
                        await saveGradesToServer(student.id, moduleId, student.grades);
                    } catch (err) {
                        console.warn(`Erreur sauvegarde pour étudiant ${student.id}:`, err.message);
                    }
                }
            }
        }
        
        const btn = document.querySelector('.save-btn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Sauvegardé!';
            btn.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = 'linear-gradient(45deg, #007bff, #0056b3)';
            }, 2000);
        }
        
        showNotification('Toutes les notes ont été sauvegardées', 'success');
    } catch (err) {
        console.error('Erreur sauvegarde générale:', err);
        showNotification('Erreur lors de la sauvegarde complète', 'error');
    }
}

function exportGrades() {
    try {
        const dataStr = JSON.stringify(gradesData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `notes_cfpa_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showNotification('Export réussi! Le fichier a été téléchargé.', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        showNotification('Erreur lors de l\'export des données', 'error');
    }
}