console.log('Gestion des Groupes & Classes - Version 6.0 (Correction Attribution Stagiaires)');

// ========== CONFIGURATION API ========== //
const API_BASE_URL = 'http://localhost:8080/api';

// ========== VARIABLES GLOBALES ========== //
let groups = [];
let modules = [];
let teachers = [];
let trainees = [];
let teacherAssignments = [];
let traineeAssignments = [];
let editingGroupId = null;
let editingModuleId = null;
let authToken = localStorage.getItem('accessToken') || null;

// ========== FONCTIONS UTILITAIRES API ========== //
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
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers: {
                ...getAuthHeaders(),
                ...options.headers
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Session expirée, veuillez vous reconnecter', 'error');
                logout();
                return null;
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// ========== FONCTIONS UTILITAIRES POUR VALIDATION ========== //
function parseIntSafely(value) {
    if (!value || value === '') return null;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
}

function validateRequiredFields(fields) {
    const errors = [];
    
    Object.entries(fields).forEach(([key, value]) => {
        if (!value || value === '' || value === null || value === undefined) {
            errors.push(`Le champ ${key} est requis`);
        }
    });
    
    return errors;
}

// ========== FONCTIONS DE CHARGEMENT DES DONNÉES (CORRIGÉES) ========== //
async function loadGroups() {
    try {
        const data = await apiRequest('/groupes');
        if (data) {
            groups = data.map(group => {
                let additionalInfo = {};
                try {
                    if (group.informations_supplementaires) {
                        additionalInfo = typeof group.informations_supplementaires === 'string' 
                            ? JSON.parse(group.informations_supplementaires)
                            : group.informations_supplementaires;
                    }
                } catch (e) {
                    console.warn('Erreur parsing informations_supplementaires pour groupe', group.id, e);
                }

                return {
                    id: group.id,
                    name: group.nom,
                    formation: additionalInfo.formation || 'Non définie',
                    capacity: additionalInfo.capacity || 25,
                    status: additionalInfo.status || 'Actif',
                    description: additionalInfo.description || '',
                    createdAt: group.cree_a,
                    updatedAt: group.mis_a_jour_a,
                    studentsCount: 0, // Sera mis à jour par loadTraineeAssignmentsFromDB
                    rawData: group
                };
            });
        }
        return groups;
    } catch (error) {
        console.error('Erreur lors du chargement des groupes:', error);
        return [];
    }
}

async function loadModules() {
    try {
        const data = await apiRequest('/modules');
        if (data) {
            modules = data.map(module => {
                let additionalInfo = {};
                try {
                    if (module.informations_supplementaires) {
                        additionalInfo = typeof module.informations_supplementaires === 'string' 
                            ? JSON.parse(module.informations_supplementaires)
                            : module.informations_supplementaires;
                    }
                } catch (e) {
                    console.warn('Erreur parsing informations_supplementaires pour module', module.id, e);
                }

                return {
                    id: module.id,
                    name: module.nom,
                    speciality: additionalInfo.speciality || '',
                    description: additionalInfo.description || '',
                    coefficient: additionalInfo.coefficient || 1,
                    createdAt: module.cree_a,
                    updatedAt: module.mis_a_jour_a,
                    assignedTeachers: [], // Sera mis à jour
                    assignedGroups: [], // Sera mis à jour
                    rawData: module
                };
            });
        }
        return modules;
    } catch (error) {
        console.error('Erreur lors du chargement des modules:', error);
        return [];
    }
}

async function loadTeachers() {
    try {
        const data = await apiRequest('/users');
        if (data) {
            teachers = data.filter(user => 
                user.roles && user.roles.some(role => role.nom === 'enseignant')
            ).map(user => ({
                id: user.id,
                name: user.nom,
                email: user.email,
                roles: user.roles
            }));
        }
        return teachers;
    } catch (error) {
        console.error('Erreur lors du chargement des enseignants:', error);
        return [];
    }
}

async function loadTrainees() {
    try {
        const data = await apiRequest('/users');
        if (data) {
            trainees = data.filter(user => 
                user.roles && user.roles.some(role => role.nom === 'stagiaire')
            ).map(user => ({
                id: user.id,
                name: user.nom,
                email: user.email,
                roles: user.roles
            }));
        }
        return trainees;
    } catch (error) {
        console.error('Erreur lors du chargement des stagiaires:', error);
        return [];
    }
}

// ========== NOUVELLES FONCTIONS POUR RÉCUPÉRER LES ASSIGNATIONS RÉELLES ========== //
async function loadTeacherAssignmentsFromDB() {
    try {
        teacherAssignments = [];

        // Réinitialiser les assignations des modules
        modules.forEach(m => {
            m.assignedTeachers = [];
            m.assignedGroups = [];
        });

        for (let teacher of teachers) {
            try {
                // Endpoint stable qui renvoie moduleId et groupeId
                let assignedModules = [];
                try {
                    assignedModules = await apiRequest(`/utilisateur-modules/teacher/${teacher.id}`);
                } catch (e) {
                    // fallback si l'endpoint n'existe pas côté serveur
                    console.warn('Fallback: /utilisateur-modules failed, trying /modules/enseignant', e);
                    assignedModules = await apiRequest(`/modules/enseignant/${teacher.id}`) || [];
                }

                if (!assignedModules || assignedModules.length === 0) continue;

                for (let moduleData of assignedModules) {
                    // gérer plusieurs formes possibles des clés (robustesse)
                    const moduleId = moduleData.moduleId ?? moduleData.id ?? moduleData.module_id;
                    const groupId  = moduleData.groupeId  ?? moduleData.groupId ?? moduleData.groupe_id;
                    const moduleNameFromApi = moduleData.moduleNom ?? moduleData.moduleName ?? moduleData.nom;
                    const groupNameFromApi  = moduleData.groupeNom  ?? moduleData.groupName  ?? moduleData.nom;

                    const mId = moduleId !== undefined ? Number(moduleId) : null;
                    const gId = groupId  !== undefined ? Number(groupId)  : null;

                    const fullModule = modules.find(m => Number(m.id) === mId);
                    const group = groups.find(g => Number(g.id) === gId);

                    if (!fullModule) {
                        // si le module n'est pas dans la liste locale, on l'ignore (ou on peut le créer)
                        console.warn(`Module local non trouvé pour id=${mId}`, moduleData);
                        continue;
                    }

                    // ajouter enseignant au module (si absent)
                    if (!fullModule.assignedTeachers.find(t => t.id === teacher.id)) {
                        fullModule.assignedTeachers.push(teacher);
                    }

                    // ajouter groupe réel (s'il existe)
                    if (group && !fullModule.assignedGroups.find(g => g.id === group.id)) {
                        fullModule.assignedGroups.push(group);
                    }

                    // remplir la liste d'assignations affichées
                    teacherAssignments.push({
                        teacherId: teacher.id,
                        moduleId: mId,
                        groupId:  group ? group.id : gId,
                        teacherName: teacher.name,
                        moduleName: fullModule.name || moduleNameFromApi || 'Module inconnu',
                        groupName:  group ? group.name : (groupNameFromApi || 'Groupe inconnu')
                    });
                }
            } catch (err) {
                console.warn(`Erreur chargement assignations pour teacher ${teacher.id}:`, err);
            }
        }

        return teacherAssignments;
    } catch (error) {
        console.error('Erreur lors du chargement des assignations enseignants:', error);
        return [];
    }
}

// ========== FONCTION CORRIGÉE POUR RÉCUPÉRER LES VRAIES ASSIGNATIONS STAGIAIRES ========== //
async function loadTraineeAssignmentsFromDB() {
    try {
        traineeAssignments = [];
        groups.forEach(group => { group.studentsCount = 0; });

        console.log('Chargement des assignations stagiaires depuis /utilisateur-groupes...');

        const data = await apiRequest('/utilisateur-groupes');
        if (data && data.length > 0) {
            traineeAssignments = data.map(row => {
                const group = groups.find(g => g.id === row.groupeId);
                if (group) {
                    group.studentsCount++;
                }
                return {
                    id: row.id,
                    traineeId: row.stagiaireId,
                    traineeName: row.stagiaireNom,
                    traineeEmail: row.stagiaireEmail,
                    groupId: row.groupeId,
                    groupName: row.groupeNom
                };
            });
        }

        console.log(`${traineeAssignments.length} assignations stagiaires récupérées.`);
        return traineeAssignments;
    } catch (error) {
        console.error('Erreur lors du chargement des assignations stagiaires:', error);
        return [];
    }
}


// ========== FONCTION ALTERNATIVE SI AUCUN ENDPOINT N'EST DISPONIBLE ========== //
async function loadTraineeAssignmentsAlternative() {
    try {
        traineeAssignments = [];
        
        // Réinitialiser le compteur de stagiaires pour tous les groupes
        groups.forEach(group => {
            group.studentsCount = 0;
        });
        
        // Si aucun endpoint spécifique n'est disponible, on commence avec une liste vide
        // Les assignations seront chargées au fur et à mesure des actions de l'utilisateur
        
        console.log('Aucun endpoint disponible pour les assignations stagiaires, initialisation avec une liste vide');
        
        return traineeAssignments;
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation alternative:', error);
        return [];
    }
}

// ========== INITIALISATION ========== //
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initialisation de la gestion des groupes et classes...');
    
    if (!authToken) {
        showNotification('Veuillez vous connecter', 'error');
        setTimeout(() => {
            window.location.href = '/client/login_page/index.html';
        }, 2000);
        return;
    }

    try {
        await initializeData();
        setupEventListeners();
        updateNotificationBadge();
        console.log('Initialisation terminée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showNotification('Erreur lors du chargement des données', 'error');
    }
});

async function initializeData() {
    showLoading(true);
    try {
        // Charger les données de base
        await Promise.all([
            loadGroups(),
            loadModules(), 
            loadTeachers(),
            loadTrainees()
        ]);
        
        // Charger les assignations après avoir chargé les données de base
        await Promise.all([
            loadTeacherAssignmentsFromDB(),
            loadTraineeAssignmentsFromDB()
        ]);
        
        console.log(`Données chargées: ${groups.length} groupes, ${modules.length} modules, ${teachers.length} enseignants, ${trainees.length} stagiaires`);
        console.log(`Assignations: ${teacherAssignments.length} enseignants, ${traineeAssignments.length} stagiaires`);
        
        updateStatistics();
        renderGroupsTable();
        renderModulesTable();
        renderAssignments();
        populateSelects();
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des données:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

// ========== FONCTIONS DE MISE À JOUR ========== //
function updateStatistics() {
    const totalGroups = groups.length;
    const totalModules = modules.length;
    const totalStudents = trainees.length;
    const totalTeachers = teachers.length;

    animateCounter('totalGroups', totalGroups);
    animateCounter('totalModules', totalModules);
    animateCounter('totalStudents', totalStudents);
    animateCounter('totalTeachers', totalTeachers);
}

function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    let currentValue = 0;
    const increment = Math.ceil(targetValue / 20);
    
    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        element.textContent = currentValue;
    }, 50);
}

// ========== GESTION DES ONGLETS ========== //
function showTab(tabName) {
    // Retirer la classe active de tous les onglets
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Ajouter la classe active à l'onglet sélectionné
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Charger le contenu approprié
    switch(tabName) {
        case 'groups':
            renderGroupsTable();
            break;
        case 'modules':
            renderModulesTable();
            break;
        case 'assignments':
            renderAssignments();
            break;
    }
}

// ========== FONCTIONS DE RENDU (CORRIGÉES) ========== //
function renderGroupsTable() {
    const tbody = document.getElementById('groupsTableBody');
    if (!tbody) return;
    
    if (groups.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-layer-group"></i>
                    <h3>Aucun groupe créé</h3>
                    <p>Commencez par créer votre premier groupe de formation</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = groups.map(group => `
        <tr>
            <td><strong>${group.name}</strong></td>
            <td><span class="status-badge ${group.formation?.toLowerCase().replace(/\s+/g, '-') || 'default'}">${group.formation}</span></td>
            <td>
                <span class="student-count">${group.studentsCount}/${group.capacity}</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(group.studentsCount / group.capacity) * 100}%"></div>
                </div>
            </td>
            <td>${formatDate(group.createdAt)}</td>
            <td class="table-actions">
                <button class="action-btn view" onclick="viewGroup(${group.id})" title="Voir détails">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="editGroup(${group.id})" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteGroup(${group.id})" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderModulesTable() {
    const tbody = document.getElementById('modulesTableBody');
    if (!tbody) return;
    
    if (modules.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-chalkboard"></i>
                    <h3>Aucun module créé</h3>
                    <p>Créez des modules pour organiser vos formations</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = modules.map(module => {
        // Récupérer les noms des enseignants assignés
        const teacherNames = module.assignedTeachers && module.assignedTeachers.length > 0 
            ? module.assignedTeachers.map(t => t.name).join(', ')
            : 'Non assigné';
        
        // Compter les groupes assignés
        const groupsCount = module.assignedGroups ? module.assignedGroups.length : 0;
        
        return `
            <tr>
                <td>
                    <strong>${module.name}</strong>
                    ${module.speciality ? `<br><small class="text-muted">${module.speciality}</small>` : ''}
                </td>
                <td>${teacherNames}</td>
                <td>
                    <span class="groups-count">${groupsCount} groupe(s) assigné(s)</span>
                </td>
                <td>${formatDate(module.createdAt)}</td>
                <td class="table-actions">
                    <button class="action-btn view" onclick="viewModule(${module.id})" title="Voir détails">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editModule(${module.id})" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteModule(${module.id})" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderAssignments() {
    populateSelects();
    renderTeacherAssignments();
    renderTraineeAssignments();
}

function renderTeacherAssignments() {
    const container = document.getElementById('teacherAssignments');
    if (!container) return;
    
    if (teacherAssignments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Aucune attribution d'enseignant</p>
                <small>Utilisez le formulaire ci-dessus pour attribuer des enseignants aux modules</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = teacherAssignments.map(assignment => {
        return `
            <div class="assignment-item">
                <div class="assignment-info">
                    <div class="assignment-name">${assignment.teacherName}</div>
                    <div class="assignment-details">${assignment.moduleName} - ${assignment.groupName}</div>
                </div>
                <button class="action-btn delete" onclick="removeTeacherAssignment(${assignment.teacherId}, ${assignment.moduleId}, ${assignment.groupId})" title="Retirer">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');
}

function renderTraineeAssignments() {
    const container = document.getElementById('traineeAssignments');
    if (!container) return;
    
    if (traineeAssignments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Aucune attribution de stagiaire</p>
                <small>Utilisez le formulaire ci-dessus pour attribuer des stagiaires aux groupes</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = traineeAssignments.map(assignment => {
        return `
            <div class="assignment-item">
                <div class="assignment-info">
                    <div class="assignment-name">${assignment.traineeName}</div>
                    <div class="assignment-details">${assignment.groupName}</div>
                </div>
                <button class="action-btn delete" onclick="removeTraineeAssignment(${assignment.traineeId}, ${assignment.groupId})" title="Retirer">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');
}

// ========== GESTION DES GROUPES (CORRIGÉE AVEC RÉPERCUSSION EN BASE) ========== //
async function saveGroup() {
    const form = document.getElementById('addGroupForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const groupData = {
        nom: document.getElementById('groupName').value.trim(),
        informations_supplementaires: JSON.stringify({
            formation: document.getElementById('groupFormation').value,
            description: document.getElementById('groupDescription').value.trim(),
            capacity: parseInt(document.getElementById('groupCapacity').value),
            status: document.getElementById('groupStatus').value
        })
    };
    
    try {
        showLoading(true);
        
        if (editingGroupId) {
            // Modification - Utiliser l'endpoint PUT correct
            await apiRequest(`/groupes/${editingGroupId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(groupData)
            });
            showNotification('Groupe modifié avec succès', 'success');
        } else {
            // Création - Utiliser l'endpoint POST
            const result = await apiRequest('/groupes', {
                method: 'POST',
                body: JSON.stringify(groupData)
            });
            console.log('Groupe créé:', result);
            showNotification('Groupe créé avec succès', 'success');
        }
        
        closeModal('addGroupModal');
        form.reset();
        editingGroupId = null;
        
        // Recharger toutes les données depuis la base
        await initializeData();
        
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du groupe:', error);
        showNotification(`Erreur lors de la sauvegarde: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function editGroup(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (!group) {
        showNotification('Groupe non trouvé', 'error');
        return;
    }
    
    editingGroupId = groupId;
    
    // Remplir le formulaire
    document.getElementById('groupName').value = group.name;
    document.getElementById('groupFormation').value = group.formation || '';
    document.getElementById('groupDescription').value = group.description || '';
    document.getElementById('groupCapacity').value = group.capacity;
    document.getElementById('groupStatus').value = group.status;
    
    // Changer le titre et le bouton
    const modalTitle = document.querySelector('#addGroupModal .modal-header h3');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Modifier le Groupe';
    }
    
    const saveButton = document.querySelector('#addGroupModal .btn-primary');
    if (saveButton) {
        saveButton.innerHTML = '<i class="fas fa-save"></i> Modifier le Groupe';
    }
    
    openModal('addGroupModal');
}

async function deleteGroup(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (!group) {
        showNotification('Groupe non trouvé', 'error');
        return;
    }
    
    document.getElementById('deleteConfirmText').textContent = 
        `Êtes-vous sûr de vouloir supprimer le groupe "${group.name}" ? Cette action supprimera également toutes les assignations associées.`;
    
    document.getElementById('confirmDeleteBtn').onclick = async () => {
        try {
            showLoading(true);
            
            // Suppression en base de données avec l'endpoint DELETE correct
            await apiRequest(`/groupes/${groupId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            
            closeModal('deleteConfirmModal');
            showNotification('Groupe supprimé avec succès', 'success');
            
            // Recharger toutes les données depuis la base
            await initializeData();
            
        } catch (error) {
            console.error('Erreur lors de la suppression du groupe:', error);
            showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    };
    
    openModal('deleteConfirmModal');
}

async function viewGroup(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (!group) {
        showNotification('Groupe non trouvé', 'error');
        return;
    }
    
    // Récupérer les noms des stagiaires assignés à ce groupe
    const assignedTrainees = traineeAssignments
        .filter(assignment => assignment.groupId === groupId)
        .map(assignment => assignment.traineeName);
    
    const content = document.getElementById('detailsContent');
    const title = document.getElementById('detailsTitle');
    
    title.innerHTML = `<i class="fas fa-layer-group"></i> Détails du Groupe`;
    
    content.innerHTML = `
        <div class="details-grid">
            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> Informations Générales</h4>
                <div class="detail-row">
                    <span class="detail-label">Nom:</span>
                    <span class="detail-value">${group.name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Formation:</span>
                    <span class="detail-value">
                        <span class="status-badge ${group.formation?.toLowerCase().replace(/\s+/g, '-') || 'default'}">${group.formation}</span>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Statut:</span>
                    <span class="detail-value">
                        <span class="status-badge ${getStatusClass(group.status)}">${group.status}</span>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Capacité:</span>
                    <span class="detail-value">${group.studentsCount}/${group.capacity} stagiaires</span>
                </div>
                ${group.description ? `
                    <div class="detail-row">
                        <span class="detail-label">Description:</span>
                        <span class="detail-value">${group.description}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-users"></i> Stagiaires Assignés</h4>
                <div class="detail-row">
                    <span class="detail-label">Nombre de stagiaires:</span>
                    <span class="detail-value">${group.studentsCount}</span>
                </div>
                ${assignedTrainees.length > 0 ? `
                    <div class="detail-row">
                        <span class="detail-label">Liste des stagiaires:</span>
                        <span class="detail-value">
                            <ul class="trainee-list">
                                ${assignedTrainees.map(name => `<li>${name}</li>`).join('')}
                            </ul>
                        </span>
                    </div>
                ` : `
                    <div class="detail-row">
                        <span class="detail-label">Stagiaires:</span>
                        <span class="detail-value text-muted">Aucun stagiaire assigné</span>
                    </div>
                `}
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-calendar"></i> Dates</h4>
                <div class="detail-row">
                    <span class="detail-label">Créé le:</span>
                    <span class="detail-value">${formatDate(group.createdAt)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Modifié le:</span>
                    <span class="detail-value">${formatDate(group.updatedAt)}</span>
                </div>
            </div>
        </div>
    `;
    
    openModal('detailsModal');
}

// ========== GESTION DES MODULES (CORRIGÉE AVEC RÉPERCUSSION EN BASE) ========== //
async function saveModule() {
    const form = document.getElementById('addModuleForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const moduleData = {
        nom: document.getElementById('moduleName').value.trim(),
        informations_supplementaires: JSON.stringify({
            speciality: document.getElementById('moduleSpeciality').value,
            description: document.getElementById('moduleDescription').value.trim(),
            coefficient: parseFloat(document.getElementById('moduleCoefficient').value) || 1
        })
    };
    
    try {
        showLoading(true);
        
        if (editingModuleId) {
            // Modification - Utiliser l'endpoint PUT correct
            await apiRequest(`/modules/${editingModuleId}`, {
                method: 'PUT',
                body: JSON.stringify(moduleData)
            });
            showNotification('Module modifié avec succès', 'success');
        } else {
            // Création - Utiliser l'endpoint POST
            const result = await apiRequest('/modules', {
                method: 'POST',
                body: JSON.stringify(moduleData)
            });
            console.log('Module créé:', result);
            showNotification('Module créé avec succès', 'success');
        }
        
        closeModal('addModuleModal');
        form.reset();
        editingModuleId = null;
        
        // Recharger toutes les données depuis la base
        await initializeData();
        
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du module:', error);
        showNotification(`Erreur lors de la sauvegarde: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function editModule(moduleId) {
    const module = modules.find(m => m.id === moduleId);
    if (!module) {
        showNotification('Module non trouvé', 'error');
        return;
    }
    
    editingModuleId = moduleId;
    
    // Remplir le formulaire
    document.getElementById('moduleName').value = module.name;
    document.getElementById('moduleSpeciality').value = module.speciality || '';
    document.getElementById('moduleDescription').value = module.description || '';
    document.getElementById('moduleCoefficient').value = module.coefficient || 1;
    
    // Changer le titre et le bouton
    const modalTitle = document.querySelector('#addModuleModal .modal-header h3');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Modifier le Module';
    }
    
    const saveButton = document.querySelector('#addModuleModal .btn-primary');
    if (saveButton) {
        saveButton.innerHTML = '<i class="fas fa-save"></i> Modifier le Module';
    }
    
    openModal('addModuleModal');
}

async function deleteModule(moduleId) {
    const module = modules.find(m => m.id === moduleId);
    if (!module) {
        showNotification('Module non trouvé', 'error');
        return;
    }
    
    document.getElementById('deleteConfirmText').textContent = 
        `Êtes-vous sûr de vouloir supprimer le module "${module.name}" ? Cette action supprimera également toutes les assignations associées.`;
    
    document.getElementById('confirmDeleteBtn').onclick = async () => {
        try {
            showLoading(true);
            
            // Suppression en base de données avec l'endpoint DELETE correct
            await apiRequest(`/modules/${moduleId}`, {
                method: 'DELETE'
            });
            
            closeModal('deleteConfirmModal');
            showNotification('Module supprimé avec succès', 'success');
            
            // Recharger toutes les données depuis la base
            await initializeData();
            
        } catch (error) {
            console.error('Erreur lors de la suppression du module:', error);
            showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    };
    
    openModal('deleteConfirmModal');
}

async function viewModule(moduleId) {
    const module = modules.find(m => m.id === moduleId);
    if (!module) {
        showNotification('Module non trouvé', 'error');
        return;
    }
    
    const content = document.getElementById('detailsContent');
    const title = document.getElementById('detailsTitle');
    
    title.innerHTML = `<i class="fas fa-chalkboard"></i> Détails du Module`;
    
    // Récupérer les noms des enseignants et groupes assignés
    const teacherNames = module.assignedTeachers && module.assignedTeachers.length > 0 
        ? module.assignedTeachers.map(t => t.name).join(', ')
        : 'Aucun enseignant assigné';
        
    const groupNames = module.assignedGroups && module.assignedGroups.length > 0
        ? module.assignedGroups.map(g => g.name).join(', ')
        : 'Aucun groupe assigné';
    
    content.innerHTML = `
        <div class="details-grid">
            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> Informations Générales</h4>
                <div class="detail-row">
                    <span class="detail-label">Nom:</span>
                    <span class="detail-value">${module.name}</span>
                </div>
                ${module.speciality ? `
                    <div class="detail-row">
                        <span class="detail-label">Spécialité:</span>
                        <span class="detail-value">
                            <span class="status-badge ${module.speciality.toLowerCase().replace(/\s+/g, '-')}">${module.speciality}</span>
                        </span>
                    </div>
                ` : ''}
                ${module.description ? `
                    <div class="detail-row">
                        <span class="detail-label">Description:</span>
                        <span class="detail-value">${module.description}</span>
                    </div>
                ` : ''}
                <div class="detail-row">
                    <span class="detail-label">Coefficient:</span>
                    <span class="detail-value">${module.coefficient}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-users"></i> Assignations</h4>
                <div class="detail-row">
                    <span class="detail-label">Enseignants assignés:</span>
                    <span class="detail-value">${teacherNames}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Groupes assignés:</span>
                    <span class="detail-value">${groupNames}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Nombre total d'assignations:</span>
                    <span class="detail-value">${module.assignedTeachers.length} enseignant(s), ${module.assignedGroups.length} groupe(s)</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-calendar"></i> Dates</h4>
                <div class="detail-row">
                    <span class="detail-label">Créé le:</span>
                    <span class="detail-value">${formatDate(module.createdAt)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Modifié le:</span>
                    <span class="detail-value">${formatDate(module.updatedAt)}</span>
                </div>
            </div>
        </div>
    `;
    
    openModal('detailsModal');
}

// ========== GESTION DES ATTRIBUTIONS (COMPLÈTEMENT CORRIGÉE) ========== //
async function assignTeacherToModule() {
    const teacherSelect = document.getElementById('teacherSelect');
    const moduleSelect = document.getElementById('moduleSelectForTeacher');
    const groupSelect = document.getElementById('groupSelectForTeacher');
    
    // Récupérer les valeurs brutes
    const teacherId = teacherSelect ? teacherSelect.value : '';
    const moduleId = moduleSelect ? moduleSelect.value : '';
    const groupId = groupSelect ? groupSelect.value : '';
    
    console.log('Valeurs sélectionnées:', { teacherId, moduleId, groupId });
    
    // Validation des champs requis
    const validationErrors = validateRequiredFields({
        'Enseignant': teacherId,
        'Module': moduleId,
        'Groupe': groupId
    });
    
    if (validationErrors.length > 0) {
        showNotification(validationErrors.join(', '), 'error');
        return;
    }
    
    // Conversion sécurisée en entier
    const enseignantId = parseIntSafely(teacherId);
    const moduleIdParsed = parseIntSafely(moduleId);
    const groupeIdParsed = parseIntSafely(groupId);
    
    console.log('Valeurs parsées:', { enseignantId, moduleIdParsed, groupeIdParsed });
    
    // Vérifier que les conversions ont réussi
    if (!enseignantId || !moduleIdParsed || !groupeIdParsed) {
        showNotification('Erreur: Les IDs sélectionnés ne sont pas valides', 'error');
        return;
    }
    
    // Vérifier que l'assignation n'existe pas déjà
    const existingAssignment = teacherAssignments.find(assignment => 
        assignment.teacherId === enseignantId && 
        assignment.moduleId === moduleIdParsed && 
        assignment.groupId === groupeIdParsed
    );
    
    if (existingAssignment) {
        showNotification('Cette assignation existe déjà', 'warning');
        return;
    }
    
    const assignmentData = {
        enseignantId: enseignantId,
        moduleId: moduleIdParsed,
        groupeId: groupeIdParsed,
        informations_supplementaires: null
    };
    
    console.log('Données à envoyer:', assignmentData);
    
    try {
        showLoading(true);
        
        // Envoyer l'assignation à la base de données
        const response = await apiRequest('/modules/assign', {
            method: 'POST',
            body: JSON.stringify(assignmentData)
        });
        
        console.log('Réponse de l\'API:', response);
        
        // Réinitialiser les champs
        teacherSelect.value = '';
        moduleSelect.value = '';
        groupSelect.value = '';
        
        showNotification('Enseignant attribué avec succès', 'success');
        
        // Recharger les assignations depuis la base de données
        await loadTeacherAssignmentsFromDB();
        
        // Mettre à jour l'affichage
        renderTeacherAssignments();
        renderModulesTable();
        
    } catch (error) {
        console.error('Erreur lors de l\'attribution:', error);
        showNotification(`Erreur lors de l'attribution: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// ========== FONCTION CORRIGÉE POUR L'ATTRIBUTION DES STAGIAIRES ========== //
async function assignTraineeToGroup() {
    const traineeSelect = document.getElementById('traineeSelect');
    const groupSelect = document.getElementById('groupSelectForTrainee');
    
    // Récupérer les valeurs brutes
    const traineeId = traineeSelect ? traineeSelect.value : '';
    const groupId = groupSelect ? groupSelect.value : '';
    
    console.log('Valeurs sélectionnées:', { traineeId, groupId });
    
    // Validation des champs requis
    const validationErrors = validateRequiredFields({
        'Stagiaire': traineeId,
        'Groupe': groupId
    });
    
    if (validationErrors.length > 0) {
        showNotification(validationErrors.join(', '), 'error');
        return;
    }
    
    // Conversion sécurisée en entier
    const stagiaireId = parseIntSafely(traineeId);
    const groupeId = parseIntSafely(groupId);
    
    console.log('Valeurs parsées:', { stagiaireId, groupeId });
    
    // Vérifier que les conversions ont réussi
    if (!stagiaireId || !groupeId) {
        showNotification('Erreur: Les IDs sélectionnés ne sont pas valides', 'error');
        return;
    }
    
    // Vérifier la capacité du groupe
    const group = groups.find(g => g.id === groupeId);
    if (group && group.studentsCount >= group.capacity) {
        showNotification('Le groupe a atteint sa capacité maximale', 'warning');
        return;
    }
    
    // Vérifier que l'assignation n'existe pas déjà
    const existingAssignment = traineeAssignments.find(assignment => 
        assignment.traineeId === stagiaireId && assignment.groupId === groupeId
    );
    
    if (existingAssignment) {
        showNotification('Ce stagiaire est déjà assigné à ce groupe', 'warning');
        return;
    }
    
    // Vérifier que le stagiaire n'est pas déjà assigné à un autre groupe
    const existingTraineeAssignment = traineeAssignments.find(assignment => 
        assignment.traineeId === stagiaireId
    );
    
    if (existingTraineeAssignment) {
        showNotification('Ce stagiaire est déjà assigné à un autre groupe. Veuillez d\'abord le retirer de son groupe actuel.', 'warning');
        return;
    }
    
    const assignmentData = {
        stagiaireId: stagiaireId,
        groupeId: groupeId,
        informations_supplementaires: null
    };
    
    console.log('Données à envoyer:', assignmentData);
    
    try {
        showLoading(true);
        
        // Envoyer l'assignation à la base de données avec l'endpoint correct
        const response = await apiRequest('/groupes/assigner-stagiaire', {
            method: 'POST',
            body: JSON.stringify(assignmentData)
        });
        
        console.log('Réponse de l\'API:', response);
        
        // Mettre à jour les données locales immédiatement
        const trainee = trainees.find(t => t.id === stagiaireId);
        if (trainee && group) {
            traineeAssignments.push({
                traineeId: stagiaireId,
                groupId: groupeId,
                traineeName: trainee.name,
                groupName: group.name
            });
            
            // Mettre à jour le compteur du groupe
            group.studentsCount = Math.min(group.studentsCount + 1, group.capacity);
        }
        
        // Réinitialiser les champs
        traineeSelect.value = '';
        groupSelect.value = '';
        
        showNotification('Stagiaire attribué avec succès', 'success');
        
        // Mettre à jour l'affichage
        renderTraineeAssignments();
        renderGroupsTable();
        updateStatistics();
        populateSelects(); // Mettre à jour les options des groupes et stagiaires
        
        // Optionnel : Recharger les données depuis la base pour s'assurer de la cohérence
        // await loadTraineeAssignmentsFromDB();
        // await loadGroups();
        
    } catch (error) {
        console.error('Erreur lors de l\'attribution:', error);
        showNotification(`Erreur lors de l'attribution: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// ========== FONCTIONS DE SUPPRESSION DES ASSIGNATIONS (CORRIGÉES) ========== //
async function removeTeacherAssignment(teacherId, moduleId, groupId) {
    try {
        showLoading(true);
        
        console.log('Suppression assignation enseignant:', { teacherId, moduleId, groupId });
        
        // --- DEBUT DE LA MODIFICATION ---
        // Appel API pour supprimer l'assignation enseignant-module-groupe dans la base de données
        // Cet endpoint est documenté dans APIDocs.md
        await apiRequest(`/utilisateur-modules/teacher/${teacherId}/module/${moduleId}/group/${groupId}`, {
            method: 'DELETE'
        });
        // --- FIN DE LA MODIFICATION ---

        // Supprimer localement pour une mise à jour immédiate de l'interface
        teacherAssignments = teacherAssignments.filter(assignment => 
            !(assignment.teacherId === teacherId && assignment.moduleId === moduleId && assignment.groupId === groupId)
        );
        
        // Mettre à jour le module (retirer l'enseignant et le groupe des listes locales)
        const module = modules.find(m => m.id === moduleId);
        if (module) {
            module.assignedTeachers = module.assignedTeachers.filter(t => t.id !== teacherId);
            // Note : La logique de `assignedGroups` peut être plus complexe si un module 
            // est assigné à un groupe par plusieurs enseignants. 
            // Pour simplifier, nous ne le modifions pas ici, un rafraîchissement complet des données est plus sûr.
        }
        
        // Mettre à jour l'affichage
        renderTeacherAssignments();
        renderModulesTable();
        
        showNotification('Attribution enseignant supprimée avec succès', 'success');

        // Optionnel mais recommandé : Recharger les données pour assurer la cohérence
        // await initializeData(); 
        
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'attribution enseignant:', error);
        showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}
// ========== FONCTION CORRIGÉE POUR LA SUPPRESSION D'ASSIGNATION STAGIAIRE ========== //
async function removeTraineeAssignment(traineeId, groupId) {
    try {
        showLoading(true);
        
        console.log('Suppression assignation stagiaire:', { traineeId, groupId });
        
        // --- DEBUT DE LA MODIFICATION ---
        // Appel API pour supprimer l'assignation dans la base de données
        // Cet endpoint est documenté dans APIDocs.md
        await apiRequest(`/utilisateur-groupes/user/${traineeId}/group/${groupId}`, {
            method: 'DELETE'
        });
        // --- FIN DE LA MODIFICATION ---
        
        // Supprimer localement pour une mise à jour immédiate de l'interface
        traineeAssignments = traineeAssignments.filter(assignment => 
            !(assignment.traineeId === traineeId && assignment.groupId === groupId)
        );
        
        // Mettre à jour le compteur du groupe
        const group = groups.find(g => g.id === groupId);
        if (group && group.studentsCount > 0) {
            group.studentsCount = Math.max(0, group.studentsCount - 1);
        }
        
        // Mettre à jour l'affichage
        renderTraineeAssignments();
        renderGroupsTable();
        updateStatistics();
        populateSelects(); // Mettre à jour les options des groupes et stagiaires
        
        showNotification('Attribution stagiaire supprimée avec succès', 'success');
        
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'attribution stagiaire:', error);
        showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// ========== FONCTIONS DE PEUPLEMENT DES SELECTS (CORRIGÉE POUR ÉVITER LES ATTRIBUTIONS MULTIPLES) ========== //
function populateSelects() {
    // Enseignants
    const teacherSelect = document.getElementById('teacherSelect');
    if (teacherSelect) {
        teacherSelect.innerHTML = '<option value="">Sélectionner un enseignant</option>';
        
        if (teachers && teachers.length > 0) {
            teachers.forEach(teacher => {
                const option = document.createElement('option');
                option.value = teacher.id;
                option.textContent = teacher.name;
                teacherSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Aucun enseignant disponible';
            option.disabled = true;
            teacherSelect.appendChild(option);
        }
    }
    
    // Stagiaires - CORRIGER POUR N'AFFICHER QUE LES STAGIAIRES NON ASSIGNÉS
    const traineeSelect = document.getElementById('traineeSelect');
    if (traineeSelect) {
        traineeSelect.innerHTML = '<option value="">Sélectionner un stagiaire</option>';
        
        if (trainees && trainees.length > 0) {
            trainees.forEach(trainee => {
                // Vérifier si le stagiaire n'est pas déjà assigné à un groupe
                const alreadyAssigned = traineeAssignments.some(assignment => assignment.traineeId === trainee.id);
                
                const option = document.createElement('option');
                option.value = trainee.id;
                option.textContent = trainee.name;
                
                if (alreadyAssigned) {
                    // Ne pas ajouter les stagiaires déjà assignés ou les marquer comme indisponibles
                    option.textContent += ' (déjà assigné)';
                    option.disabled = true;
                }
                
                traineeSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Aucun stagiaire disponible';
            option.disabled = true;
            traineeSelect.appendChild(option);
        }
    }
    
    // Modules
    const moduleSelectForTeacher = document.getElementById('moduleSelectForTeacher');
    if (moduleSelectForTeacher) {
        moduleSelectForTeacher.innerHTML = '<option value="">Sélectionner un module</option>';
        
        if (modules && modules.length > 0) {
            modules.forEach(module => {
                const option = document.createElement('option');
                option.value = module.id;
                option.textContent = module.name;
                moduleSelectForTeacher.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Aucun module disponible';
            option.disabled = true;
            moduleSelectForTeacher.appendChild(option);
        }
    }
    
    // Groupes
    const groupSelects = ['groupSelectForTeacher', 'groupSelectForTrainee'];
    groupSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Sélectionner un groupe</option>';
            
            if (groups && groups.length > 0) {
                groups.forEach(group => {
                    const option = document.createElement('option');
                    option.value = group.id;
                    option.textContent = `${group.name} (${group.studentsCount}/${group.capacity})`;
                    
                    // Désactiver si le groupe est plein (seulement pour l'assignation des stagiaires)
                    if (group.studentsCount >= group.capacity && selectId === 'groupSelectForTrainee') {
                        option.disabled = true;
                        option.textContent += ' - COMPLET';
                    }
                    
                    select.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Aucun groupe disponible';
                option.disabled = true;
                select.appendChild(option);
            }
        }
    });
}

// ========== FONCTIONS DE FILTRAGE ========== //
function filterGroups() {
    const formation = document.getElementById('filterFormation')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const searchTerm = document.getElementById('searchGroups')?.value?.toLowerCase() || '';
    
    let filteredGroups = groups;
    
    if (formation) {
        filteredGroups = filteredGroups.filter(g => g.formation === formation);
    }
    
    if (status) {
        filteredGroups = filteredGroups.filter(g => g.status === status);
    }
    
    if (searchTerm) {
        filteredGroups = filteredGroups.filter(g => 
            g.name.toLowerCase().includes(searchTerm) ||
            g.formation.toLowerCase().includes(searchTerm) ||
            (g.description && g.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Réafficher avec les données filtrées
    renderFilteredGroups(filteredGroups);
}

function renderFilteredGroups(filteredGroups) {
    const tbody = document.getElementById('groupsTableBody');
    if (!tbody) return;
    
    if (filteredGroups.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Aucun résultat trouvé</h3>
                    <p>Essayez de modifier vos critères de recherche</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredGroups.map(group => `
        <tr>
            <td><strong>${group.name}</strong></td>
            <td><span class="status-badge ${group.formation?.toLowerCase().replace(/\s+/g, '-') || 'default'}">${group.formation}</span></td>
            <td>
                <span class="student-count">${group.studentsCount}/${group.capacity}</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(group.studentsCount / group.capacity) * 100}%"></div>
                </div>
            </td>
            <td>${formatDate(group.createdAt)}</td>
            <td class="table-actions">
                <button class="action-btn view" onclick="viewGroup(${group.id})" title="Voir détails">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="editGroup(${group.id})" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteGroup(${group.id})" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ========== FONCTIONS UTILITAIRES ========== //
function formatDate(dateString) {
    if (!dateString) return 'Non définie';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Erreur formatage date:', error);
        return 'Date invalide';
    }
}

function getStatusClass(status) {
    const statusMap = {
        'Actif': 'active',
        'En cours': 'pending', 
        'En attente': 'inactive',
        'Terminé': 'completed'
    };
    return statusMap[status] || 'inactive';
}

// ========== FONCTIONS D'INTERFACE ========== //
function showLoading(show) {
    let loader = document.getElementById('globalLoader');
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'globalLoader';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;
            loader.innerHTML = '<div style="color: white; font-size: 18px;"><i class="fas fa-spinner fa-spin"></i> Chargement...</div>';
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    } else {
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#FF9800',
        info: '#2196F3'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

function updateNotificationBadge() {
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
    
    const badges = document.querySelectorAll('#adminNotifCount, .notification-badge');
    badges.forEach(badge => {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline' : 'none';
    });
}

// ========== GESTION DES MODALES ========== //
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        
        // Réinitialiser le titre et le bouton si ce n'est pas un mode édition
        if (modalId === 'addGroupModal' && !editingGroupId) {
            const modalTitle = modal.querySelector('.modal-header h3');
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="fas fa-layer-group"></i> Nouveau Groupe';
            }
            const saveButton = modal.querySelector('.btn-primary');
            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-save"></i> Créer le Groupe';
            }
        }
        
        if (modalId === 'addModuleModal' && !editingModuleId) {
            const modalTitle = modal.querySelector('.modal-header h3');
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="fas fa-chalkboard"></i> Nouveau Module';
            }
            const saveButton = modal.querySelector('.btn-primary');
            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-save"></i> Créer le Module';
            }
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        // Réinitialiser les formulaires et les IDs d'édition
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
        
        if (modalId === 'addGroupModal') {
            editingGroupId = null;
        }
        
        if (modalId === 'addModuleModal') {
            editingModuleId = null;
        }
    }
}

// ========== EVENT LISTENERS ========== //
function setupEventListeners() {
    // Recherche en temps réel
    const searchInput = document.getElementById('searchGroups');
    if (searchInput) {
        searchInput.addEventListener('input', filterGroups);
    }
    
    // Filtres
    const filterFormation = document.getElementById('filterFormation');
    if (filterFormation) {
        filterFormation.addEventListener('change', filterGroups);
    }
    
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.addEventListener('change', filterGroups);
    }
    
    // Gestion du sidebar
    const sidebarToggle = document.getElementById('sidebarToggle');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (sidebarToggle && sidebar && mainContent) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        });
    }
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
        });
    }

    // Fermer les modals en cliquant à l'extérieur
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }
}

// ========== FONCTIONS DE RAFRAÎCHISSEMENT ========== //
async function refreshData() {
    try {
        showNotification('Actualisation des données...', 'info');
        await initializeData();
        showNotification('Données actualisées avec succès', 'success');
    } catch (error) {
        console.error('Erreur lors du rafraîchissement:', error);
        showNotification('Erreur lors du rafraîchissement des données', 'error');
    }
}

// ========== FONCTIONS DE NAVIGATION ========== //
function showDashboard() {
    window.location.href = 'admin.html';
}

function showUserManagement() {
    window.location.href = 'gestion_utilisateurs.html';
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

function showGroupManagement() {
    location.reload();
}

function showScheduleManagement() {
    window.location.href = 'emploi_tmp.html';
}

function logout() {
    openModal('logoutModal');
}

function confirmLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    window.location.href = '/client/login_page/index.html';
}