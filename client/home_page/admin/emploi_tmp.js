console.log('CFPA Emploi du Temps - Version 3.2 (Correction Type de Cours)');

// ==============================================
// CONFIGURATION & CONSTANTES GLOBALES
// ==============================================

const API_BASE_URL = 'http://localhost:8080/api';

let currentWeek = new Date();
let scheduleData = {};
let allScheduleData = {}; // Stocke tous les horaires sans filtrage
let teachers = [];
let groups = [];
let modules = [];
let rooms = []; // Nouvelle variable pour les salles
let selectedDay = null;
let selectedTime = null;
let editingSchedule = null;
let authToken = localStorage.getItem('accessToken') || null;
let currentUser = null;
let currentSpecialtyFilter = ''; // Filtre par spécialité

// Mapping des jours pour l'API
const dayMapping = {
    'sunday': 'Dimanche',
    'monday': 'Lundi',
    'tuesday': 'Mardi',
    'wednesday': 'Mercredi',
    'thursday': 'Jeudi'
};

const reverseDayMapping = {
    'Dimanche': 'sunday',
    'Lundi': 'monday',
    'Mardi': 'tuesday',
    'Mercredi': 'wednesday',
    'Jeudi': 'thursday'
};

const specialities = {
    'informatique': {
        name: 'Informatique',
        modules: [
            'Algorithmique et Programmation',
            'Base de Données',
            'Réseaux Informatiques',
            'Développement Web',
            'Intelligence Artificielle',
            'Cybersécurité',
            'Systèmes d\'exploitation'
        ]
    },
    'electronique': {
        name: 'Électronique',
        modules: [
            'Circuits Électroniques',
            'Microprocesseurs',
            'Automatisme',
            'Télécommunications',
            'Électronique de Puissance',
            'Instrumentation'
        ]
    },
    'mecanique': {
        name: 'Mécanique',
        modules: [
            'Résistance des Matériaux',
            'Thermodynamique',
            'Mécanique des Fluides',
            'Construction Mécanique',
            'Fabrication Mécanique',
            'Maintenance Industrielle'
        ]
    },
    'couture': {
        name: 'Couture',
        modules: [
            'Techniques de Couture',
            'Patronage',
            'Confection Textile',
            'Design Vestimentaire',
            'Broderie et Décoration'
        ]
    },
    'coiffure': {
        name: 'Coiffure',
        modules: [
            'Techniques de Coupe',
            'Coloration',
            'Coiffage et Mise en Forme',
            'Soins Capillaires',
            'Gestion de Salon'
        ]
    },
    'comptabilite': {
        name: 'Comptabilité',
        modules: [
            'Comptabilité Générale',
            'Comptabilité Analytique',
            'Fiscalité',
            'Audit et Contrôle',
            'Gestion Financière'
        ]
    },
    'langues': {
        name: 'Langues',
        modules: [
            'Français Professionnel',
            'Anglais Technique',
            'Arabe Classique',
            'Communication Orale',
            'Rédaction Administrative'
        ]
    }
};

const timeSlots = [
    { id: '08:00', label: '08:00 - 09:30', start: '08:00:00', end: '09:30:00' },
    { id: '09:30', label: '09:30 - 11:00', start: '09:30:00', end: '11:00:00' },
    { id: '11:00', label: '11:00 - 12:30', start: '11:00:00', end: '12:30:00' },
    { id: '12:30', label: '12:30 - 14:00', start: '12:30:00', end: '14:00:00' },
    { id: '14:00', label: '14:00 - 15:30', start: '14:00:00', end: '15:30:00' },
    { id: '15:30', label: '15:30 - 17:00', start: '15:30:00', end: '17:00:00' }
];

const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
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
        
        // Gérer les réponses vides (pour DELETE par exemple)
        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type');
        
        if (contentLength === '0' || !contentType?.includes('application/json')) {
            return {}; // Retourner un objet vide pour les réponses sans contenu
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erreur API:', error);
        if (error.name !== 'AbortError') {
            showNotification(`Erreur API: ${error.message}`, 'error');
        }
        throw error;
    }
}

// ==============================================
// CHARGEMENT DES DONNÉES DEPUIS L'API
// ==============================================

async function loadTeachersFromAPI() {
    try {
        const users = await apiRequest('/users');
        teachers = users.filter(user => {
            return user.roles && user.roles.some(role => 
                role.nom === 'enseignant' || role.nom === 'ROLE_ENSEIGNANT'
            );
        }).map(user => ({
            id: user.id,
            name: user.nom,
            email: user.email,
            speciality: 'Général'
        }));
        
        console.log(`${teachers.length} enseignants chargés depuis l'API:`, teachers);
        return teachers;
    } catch (error) {
        console.error('Erreur lors du chargement des enseignants:', error);
        teachers = [];
        return teachers;
    }
}

async function loadGroupsFromAPI() {
    try {
        groups = await apiRequest('/groupes');
        groups = groups.map(group => ({
            id: group.id,
            name: group.nom,
            formation: 'Général',
            students: 0
        }));
        
        console.log(`${groups.length} groupes chargés depuis l'API:`, groups);
        return groups;
    } catch (error) {
        console.error('Erreur lors du chargement des groupes:', error);
        groups = [];
        return groups;
    }
}

async function loadModulesFromAPI() {
    try {
        modules = await apiRequest('/modules');
        console.log(`${modules.length} modules chargés depuis l'API:`, modules);
        return modules;
    } catch (error) {
        console.error('Erreur lors du chargement des modules:', error);
        modules = [];
        return modules;
    }
}

// Nouvelle fonction pour charger les salles depuis les horaires
async function loadRoomsFromAPI() {
    try {
        // Récupérer toutes les salles utilisées dans les horaires
        const allSchedules = [];
        for (const group of groups) {
            try {
                const groupSchedules = await apiRequest(`/horaires/groupe/${group.id}`);
                allSchedules.push(...groupSchedules);
            } catch (error) {
                console.warn(`Erreur lors du chargement des horaires pour le groupe ${group.id}:`, error);
            }
        }
        
        // Extraire les salles uniques
        const uniqueRooms = [...new Set(allSchedules.map(schedule => schedule.salle).filter(Boolean))];
        
        // Ajouter quelques salles standards si aucune n'est trouvée
        if (uniqueRooms.length === 0) {
            uniqueRooms.push(...[
                'C01', 'C02', 'T03', 'T04', 'Lab05', 'Lab06'
            ]);
        }
        
        rooms = uniqueRooms.sort();
        console.log(`${rooms.length} salles identifiées:`, rooms);
        return rooms;
    } catch (error) {
        console.error('Erreur lors du chargement des salles:', error);
        // Fallback sur des salles par défaut
        rooms = [
            'C01', 'C02', 'T03', 'T04', 'Lab05', 'Lab06'
        ];
        return rooms;
    }
}

async function loadSchedulesFromAPI() {
    try {
        allScheduleData = {};
        
        // Charger tous les horaires pour tous les groupes
        for (const group of groups) {
            try {
                const groupSchedules = await apiRequest(`/horaires/groupe/${group.id}`);
                
                groupSchedules.forEach(schedule => {
                    const dayKey = reverseDayMapping[schedule.jour];
                    const timeKey = schedule.heure_debut.substring(0, 5);
                    // Utiliser une clé unique qui inclut l'ID du groupe ET de l'enseignant
                    const scheduleKey = `${dayKey}_${timeKey}_${group.id}_${schedule.enseignantId}`;
                    
                    // Trouver l'enseignant dans la liste locale
                    const teacher = teachers.find(t => t.id === schedule.enseignantId);
                    const teacherName = teacher ? teacher.name : 
                                     (schedule.utilisateur ? schedule.utilisateur.nom : 
                                      (schedule.enseignant ? schedule.enseignant.nom : 'Enseignant non trouvé'));
                    
                    // Trouver le groupe dans la liste locale
                    const groupData = groups.find(g => g.id === schedule.groupeId);
                    const groupName = groupData ? groupData.name : 
                                    (schedule.groupe ? schedule.groupe.nom : group.name);
                    
                    // Trouver le module dans la liste locale
                    const moduleData = modules.find(m => m.id === schedule.moduleId);
                    const moduleName = moduleData ? moduleData.nom : 
                                     (schedule.module ? schedule.module.nom : 'Module inconnu');
                    
                    // CORRECTION IMPORTANTE : Utiliser directement le type de l'API
                    const courseType = schedule.type || 'Cours'; // Le type est maintenant exposé directement par l'API

                    allScheduleData[scheduleKey] = {
                        id: schedule.id,
                        day: dayKey,
                        time: timeKey,
                        speciality: getSpecialityFromModule(moduleName),
                        module: moduleName,
                        moduleId: schedule.moduleId,
                        teacher: teacherName,
                        teacherId: schedule.enseignantId,
                        group: groupName,
                        groupId: schedule.groupeId,
                        room: schedule.salle || 'Salle non définie',
                        type: courseType, // Utiliser le type récupéré depuis l'API
                        startTime: schedule.heure_debut,
                        endTime: schedule.heure_fin
                    };

                    console.log(`Horaire chargé - Type: ${courseType}`, allScheduleData[scheduleKey]);
                });
            } catch (error) {
                console.warn(`Erreur lors du chargement des horaires pour le groupe ${group.id}:`, error);
            }
        }
        
        // Appliquer le filtre par spécialité
        applySpecialtyFilter();
        
        console.log(`${Object.keys(allScheduleData).length} créneaux chargés depuis l'API`);
        console.log('Données des horaires avec types:', allScheduleData);
        return scheduleData;
    } catch (error) {
        console.error('Erreur lors du chargement des horaires:', error);
        allScheduleData = {};
        scheduleData = {};
        return scheduleData;
    }
}

// ==============================================
// FONCTIONS DE FILTRAGE PAR SPÉCIALITÉ
// ==============================================

function filterBySpecialty() {
    const specialtyFilter = document.getElementById('specialtyFilter');
    currentSpecialtyFilter = specialtyFilter ? specialtyFilter.value : '';
    applySpecialtyFilter();
    loadScheduleGrid();
}

function applySpecialtyFilter() {
    if (!currentSpecialtyFilter) {
        // Afficher tous les horaires mais regrouper par créneau
        scheduleData = {};
        Object.entries(allScheduleData).forEach(([key, schedule]) => {
            const displayKey = `${schedule.day}_${schedule.time}`;
            if (!scheduleData[displayKey]) {
                scheduleData[displayKey] = [];
            }
            if (Array.isArray(scheduleData[displayKey])) {
                scheduleData[displayKey].push(schedule);
            } else {
                scheduleData[displayKey] = [scheduleData[displayKey], schedule];
            }
        });
    } else {
        // Filtrer par spécialité
        scheduleData = {};
        Object.entries(allScheduleData).forEach(([key, schedule]) => {
            const scheduleSpecialty = getSpecialityKey(schedule.speciality);
            if (scheduleSpecialty === currentSpecialtyFilter) {
                const displayKey = `${schedule.day}_${schedule.time}`;
                if (!scheduleData[displayKey]) {
                    scheduleData[displayKey] = schedule;
                }
            }
        });
    }
}

function getSpecialityKey(specialityName) {
    for (const [key, specialty] of Object.entries(specialities)) {
        if (specialty.name === specialityName) {
            return key;
        }
    }
    return '';
}

// ==============================================
// FONCTION D'ACTUALISATION
// ==============================================

async function refreshScheduleData() {
    try {
        showNotification('Actualisation des données...', 'info');
        
        // Recharger toutes les données depuis l'API
        await Promise.all([
            loadTeachersFromAPI(),
            loadGroupsFromAPI(),
            loadModulesFromAPI()
        ]);
        
        // Recharger les salles et les horaires
        await loadRoomsFromAPI();
        await loadSchedulesFromAPI();
        
        // Actualiser l'interface
        loadScheduleGrid();
        populateSelectors();
        populateRoomSelectors();
        
        // Actualiser les onglets actifs
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const tabName = activeTab.onclick.toString().match(/showTab\('(\w+)'\)/);
            if (tabName && tabName[1]) {
                if (tabName[1] === 'teacher') {
                    loadTeacherSchedule();
                } else if (tabName[1] === 'room') {
                    loadRoomSchedule();
                } else if (tabName[1] === 'conflicts') {
                    detectConflicts();
                }
            }
        }
        
        showNotification('Données actualisées avec succès', 'success');
        
    } catch (error) {
        console.error('Erreur lors de l\'actualisation:', error);
        showNotification('Erreur lors de l\'actualisation des données', 'error');
    }
}

// ==============================================
// SAUVEGARDE VERS L'API
// ==============================================

async function saveScheduleToAPI(scheduleData) {
    try {
        const apiData = {
            groupeId: scheduleData.groupId,
            enseignantId: scheduleData.teacherId,
            moduleId: scheduleData.moduleId,
            salle: scheduleData.room,
            jour: dayMapping[scheduleData.day],
            heure_debut: getTimeSlotStart(scheduleData.time),
            heure_fin: getTimeSlotEnd(scheduleData.time),
            informations_supplementaires: JSON.stringify({
                type: scheduleData.type,
                speciality: scheduleData.speciality,
                createdBy: currentUser?.nom || 'Admin'
            })
        };
        
        console.log('Données à sauvegarder:', apiData);
        
        const result = await apiRequest('/horaires', {
            method: 'POST',
            body: JSON.stringify(apiData)
        });
        
        console.log('Horaire créé:', result);
        return result;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        throw error;
    }
}

async function updateScheduleInAPI(scheduleId, scheduleData) {
    try {
        const apiData = {
            groupeId: scheduleData.groupId,
            enseignantId: scheduleData.teacherId,
            moduleId: scheduleData.moduleId,
            salle: scheduleData.room,
            jour: dayMapping[scheduleData.day],
            heure_debut: getTimeSlotStart(scheduleData.time),
            heure_fin: getTimeSlotEnd(scheduleData.time),
            informations_supplementaires: JSON.stringify({
                type: scheduleData.type,
                speciality: scheduleData.speciality,
                updatedBy: currentUser?.nom || 'Admin'
            })
        };
        
        const result = await apiRequest(`/horaires/${scheduleId}`, {
            method: 'PUT',
            body: JSON.stringify(apiData)
        });
        
        console.log('Horaire mis à jour:', result);
        return result;
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        throw error;
    }
}

async function deleteScheduleFromAPI(scheduleId) {
    try {
        // Pour éviter l'erreur JSON, on traite la réponse différemment
        const response = await fetch(`${API_BASE_URL}/horaires/${scheduleId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Ne pas essayer de parser JSON pour une réponse DELETE
        console.log('Horaire supprimé:', scheduleId);
        return true;
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        throw error;
    }
}

// ==============================================
// FONCTIONS UTILITAIRES
// ==============================================

function getSpecialityFromModule(moduleName) {
    for (const [key, speciality] of Object.entries(specialities)) {
        if (speciality.modules.some(module => 
            module.toLowerCase().includes(moduleName.toLowerCase()) ||
            moduleName.toLowerCase().includes(module.toLowerCase())
        )) {
            return speciality.name;
        }
    }
    return 'Général';
}

function getTypeFromTime(time) {
    if (time === '08:00' || time === '14:00') return 'Cours';
    if (time === '09:30' || time === '15:30') return 'TD';
    if (time === '11:00') return 'TP';
    return 'Cours';
}

function getTimeSlotStart(timeId) {
    const slot = timeSlots.find(slot => slot.id === timeId);
    return slot ? slot.start : '08:00:00';
}

function getTimeSlotEnd(timeId) {
    const slot = timeSlots.find(slot => slot.id === timeId);
    return slot ? slot.end : '09:30:00';
}

function findModuleByName(moduleName) {
    return modules.find(module => 
        module.nom.toLowerCase() === moduleName.toLowerCase()
    );
}

// ==============================================
// INITIALISATION
// ==============================================

document.addEventListener('DOMContentLoaded', function() {
    // Vérifier l'authentification
    const currentUserData = localStorage.getItem('currentUser');
    if (currentUserData) {
        try {
            currentUser = JSON.parse(currentUserData);
        } catch (error) {
            console.error('Erreur parsing currentUser:', error);
        }
    }
    
    if (!authToken) {
        console.warn('Pas de token d\'authentification trouvé');
        showNotification('Veuillez vous reconnecter', 'warning');
        setTimeout(() => {
            window.location.href = '/client/login_page/index.html';
        }, 3000);
        return;
    }
    
    // Injecter les styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = notificationStyles;
    document.head.appendChild(styleSheet);
    
    // Initialiser l'application
    initializeScheduleManagement();
});

async function initializeScheduleManagement() {
    try {
        showNotification('Chargement des données...', 'info');
        
        // Charger toutes les données depuis l'API
        await Promise.all([
            loadTeachersFromAPI(),
            loadGroupsFromAPI(),
            loadModulesFromAPI()
        ]);
        
        // Charger les salles et les horaires
        await loadRoomsFromAPI();
        await loadSchedulesFromAPI();
        
        // Initialiser l'interface
        updateNotificationBadge();
        updateCurrentWeekDisplay();
        loadScheduleGrid();
        populateSelectors();
        populateRoomSelectors();
        setupEventListeners();
        
        showNotification('Données chargées avec succès', 'success');
        console.log('Initialisation terminée avec succès');
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showNotification('Erreur lors du chargement des données', 'error');
    }
}

// ==============================================
// FONCTIONS MODIFIÉES POUR UTILISER L'API
// ==============================================

function populateSelectors() {
    // Remplir les sélecteurs d'enseignants
    const teacherSelects = [
        document.getElementById('scheduleTeacher'),
        document.getElementById('selectedTeacher'),
        document.getElementById('filterTeacher')
    ];

    teacherSelects.forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">Sélectionner un enseignant</option>';
            teachers.forEach(teacher => {
                const option = document.createElement('option');
                option.value = teacher.id;
                option.textContent = teacher.name;
                select.appendChild(option);
            });
        }
    });

    // Remplir les sélecteurs de groupes
    const groupSelects = [
        document.getElementById('scheduleGroup'),
        document.getElementById('filterGroup')
    ];

    groupSelects.forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">Sélectionner un groupe</option>';
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = `${group.name}`;
                select.appendChild(option);
            });
        }
    });
}

function populateRoomSelectors() {
    const roomSelects = [
        document.getElementById('scheduleRoom'),
        document.getElementById('selectedRoom')
    ];

    roomSelects.forEach(select => {
        if (select) {
            const isScheduleRoom = select.id === 'scheduleRoom';
            select.innerHTML = isScheduleRoom ? '<option value="">Sélectionner une salle</option>' : '<option value="">Sélectionner une salle</option>';
            
            rooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room;
                option.textContent = room;
                select.appendChild(option);
            });
        }
    });
}

function loadModulesForSpeciality() {
    const specialitySelect = document.getElementById('scheduleSpeciality');
    const moduleSelect = document.getElementById('scheduleModule');
    
    if (!specialitySelect || !moduleSelect) return;
    
    const selectedSpeciality = specialitySelect.value;
    
    // Réinitialiser le sélecteur de modules
    moduleSelect.innerHTML = '<option value="">Sélectionner un module</option>';
    
    if (selectedSpeciality && specialities[selectedSpeciality]) {
        // Activer le sélecteur de modules
        moduleSelect.disabled = false;
        
        // Filtrer les modules depuis l'API ou utiliser ceux de la spécialité
        const relevantModules = modules.filter(module => {
            return specialities[selectedSpeciality].modules.some(specModule =>
                module.nom.toLowerCase().includes(specModule.toLowerCase()) ||
                specModule.toLowerCase().includes(module.nom.toLowerCase())
            );
        });
        
        if (relevantModules.length > 0) {
            relevantModules.forEach(module => {
                const option = document.createElement('option');
                option.value = module.id;
                option.textContent = module.nom;
                moduleSelect.appendChild(option);
            });
        } else {
            // Utiliser les modules de la spécialité par défaut
            specialities[selectedSpeciality].modules.forEach(module => {
                const option = document.createElement('option');
                option.value = module;
                option.textContent = module;
                moduleSelect.appendChild(option);
            });
        }
    } else {
        moduleSelect.disabled = true;
        moduleSelect.innerHTML = '<option value="">Sélectionner d\'abord une spécialité</option>';
    }
}

async function saveSchedule() {
    const form = document.getElementById('addScheduleForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const day = document.getElementById('scheduleDay').value;
    const time = document.getElementById('scheduleTime').value;
    const speciality = document.getElementById('scheduleSpeciality').value;
    const moduleValue = document.getElementById('scheduleModule').value;
    const teacherId = parseInt(document.getElementById('scheduleTeacher').value);
    const groupId = parseInt(document.getElementById('scheduleGroup').value);
    const room = document.getElementById('scheduleRoom').value;
    const type = document.getElementById('scheduleType').value || 'Cours'; // Valeur par défaut
    
    console.log('Type de cours sélectionné:', type);
    
    // Validation
    if (!day || !time || !speciality || !moduleValue || !teacherId || !groupId || !room) {
        showNotification('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }
    
    // Vérifier les conflits
    const conflicts = checkForConflicts(day, time, teacherId, groupId, room);
    if (conflicts.length > 0) {
        showNotification(`Conflit détecté: ${conflicts.join(', ')}`, 'error');
        return;
    }
    
    try {
        // Déterminer le moduleId
        let moduleId = null;
        const existingModule = modules.find(m => m.id == moduleValue);
        
        if (existingModule) {
            moduleId = existingModule.id;
        } else {
            // Créer un nouveau module si nécessaire
            const newModule = await apiRequest('/modules', {
                method: 'POST',
                body: JSON.stringify({
                    nom: moduleValue,
                    informations_supplementaires: `Module créé pour la spécialité ${speciality}`
                })
            });
            moduleId = newModule.id;
            modules.push(newModule);
        }
        
        // Trouver les noms
        const teacher = teachers.find(t => t.id === teacherId);
        const group = groups.find(g => g.id === groupId);
        
        if (!teacher || !group) {
            showNotification('Enseignant ou groupe non trouvé', 'error');
            return;
        }
        
        // Créer le planning
        const scheduleDataToSave = {
            day,
            time,
            speciality,
            module: existingModule ? existingModule.nom : moduleValue,
            moduleId,
            teacher: teacher.name,
            teacherId,
            group: group.name,
            groupId,
            room,
            type: type // Le type sera maintenant correctement sauvegardé
        };
        
        console.log('Données de planning à sauvegarder:', scheduleDataToSave);
        
        // Sauvegarder via API
        const result = await saveScheduleToAPI(scheduleDataToSave);
        
        // Recharger les données
        await loadSchedulesFromAPI();
        loadScheduleGrid();
        closeModal('addScheduleModal');
        
        // Réinitialiser le formulaire
        form.reset();
        const moduleSelect = document.getElementById('scheduleModule');
        if (moduleSelect) {
            moduleSelect.disabled = true;
            moduleSelect.innerHTML = '<option value="">Sélectionner d\'abord une spécialité</option>';
        }
        
        showNotification(`Créneau ajouté avec succès (Type: ${type})`, 'success');
        
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        showNotification(`Erreur lors de la sauvegarde: ${error.message}`, 'error');
    }
}

async function deleteScheduleSlot() {
    if (!editingSchedule || !editingSchedule.id) {
        showNotification('Impossible de supprimer: identifiant manquant', 'error');
        return;
    }
    
    try {
        await deleteScheduleFromAPI(editingSchedule.id);
        
        // Recharger les données
        await loadSchedulesFromAPI();
        loadScheduleGrid();
        closeModal('editScheduleModal');
        
        editingSchedule = null;
        showNotification('Créneau supprimé avec succès', 'success');
        
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
    }
}

// ==============================================
// FONCTIONS CONSERVÉES IDENTIQUES
// ==============================================

function getSunday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function updateCurrentWeekDisplay() {
    const sunday = getSunday(currentWeek);
    const thursday = new Date(sunday);
    thursday.setDate(thursday.getDate() + 4);
    
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    const sundayStr = sunday.toLocaleDateString('fr-FR', options);
    const thursdayStr = thursday.toLocaleDateString('fr-FR', options);
    
    const currentWeekDisplay = document.getElementById('currentWeekDisplay');
    if (currentWeekDisplay) {
        currentWeekDisplay.textContent = `Semaine du ${sundayStr} au ${thursdayStr}`;
    }
}

function loadScheduleGrid() {
    days.forEach(day => {
        const daySlots = document.getElementById(`${day}Slots`);
        if (daySlots) {
            const slots = daySlots.querySelectorAll('.schedule-slot');
            slots.forEach((slot, index) => {
                const time = timeSlots[index].id;
                const scheduleKey = `${day}_${time}`;
                
                // Gérer les créneaux multiples
                const scheduleItem = scheduleData[scheduleKey];
                
                // Réinitialiser le slot
                slot.innerHTML = '';
                slot.className = 'schedule-slot';
                slot.setAttribute('data-time', time);
                slot.onclick = () => openScheduleModal(day, time);
                
                if (scheduleItem) {
                    // Si c'est un tableau (plusieurs cours au même créneau)
                    if (Array.isArray(scheduleItem)) {
                        slot.classList.add('occupied', 'multiple');
                        
                        const content = document.createElement('div');
                        content.className = 'slot-content multiple-courses';
                        
                        scheduleItem.forEach((schedule, idx) => {
                            const courseDiv = document.createElement('div');
                            courseDiv.className = `course-item ${getTypeClass(schedule.type)}`;
                            courseDiv.innerHTML = `
                                <span class="slot-module">${schedule.module}</span>
                                <span class="slot-teacher">${schedule.teacher}</span>
                                <span class="slot-room">${schedule.room}</span>
                                <span class="slot-group">${schedule.group}</span>
                                <span class="slot-type">[${schedule.type}]</span>
                            `;
                            content.appendChild(courseDiv);
                            
                            if (idx < scheduleItem.length - 1) {
                                const separator = document.createElement('div');
                                separator.className = 'course-separator';
                                content.appendChild(separator);
                            }
                        });
                        
                        slot.appendChild(content);
                    } else {
                        // Un seul cours
                        slot.classList.add('occupied');
                        slot.classList.add(getTypeClass(scheduleItem.type));
                        
                        const content = document.createElement('div');
                        content.className = 'slot-content';
                        content.innerHTML = `
                            <span class="slot-module">${scheduleItem.module}</span>
                            <span class="slot-teacher">${scheduleItem.teacher}</span>
                            <span class="slot-room">${scheduleItem.room}</span>
                            <span class="slot-group">${scheduleItem.group}</span>
                        `;
                        
                        slot.appendChild(content);
                    }
                }
            });
        }
    });
    
    // Détecter et afficher les conflits
    detectConflicts();
}

function getTypeClass(type) {
    switch (type) {
        case 'Cours': return 'cours';
        case 'TP': return 'tp';
        case 'TD': return 'td';
        default: return 'cours';
    }
}

function openScheduleModal(day, time) {
    selectedDay = day;
    selectedTime = time;
    
    const scheduleKey = `${day}_${time}`;
    const existingSchedule = scheduleData[scheduleKey];
    
    if (existingSchedule) {
        // Si plusieurs cours, prendre le premier pour l'édition
        const scheduleToEdit = Array.isArray(existingSchedule) ? existingSchedule[0] : existingSchedule;
        openEditModal(scheduleToEdit);
    } else {
        // Ouvrir le modal d'ajout
        document.getElementById('scheduleDay').value = day;
        document.getElementById('scheduleTime').value = time;
        openModal('addScheduleModal');
    }
}

function openEditModal(schedule) {
    editingSchedule = schedule;
    const editModal = document.getElementById('editScheduleModal');
    const detailsDiv = document.getElementById('editScheduleDetails');
    
    if (detailsDiv) {
        detailsDiv.innerHTML = `
            <div class="detail-row">
                <span class="detail-label">Jour:</span>
                <span class="detail-value">${dayLabels[schedule.day]}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Horaire:</span>
                <span class="detail-value">${timeSlots.find(t => t.id === schedule.time)?.label}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Spécialité:</span>
                <span class="detail-value">${schedule.speciality}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Module:</span>
                <span class="detail-value">${schedule.module}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Enseignant:</span>
                <span class="detail-value">${schedule.teacher}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Groupe:</span>
                <span class="detail-value">${schedule.group}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Salle:</span>
                <span class="detail-value">${schedule.room}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value detail-type ${getTypeClass(schedule.type)}">${schedule.type}</span>
            </div>
        `;
    }
    
    openModal('editScheduleModal');
}

// CORRECTION MAJEURE: Amélioration de la fonction de détection de conflits
function checkForConflicts(day, time, teacherId, groupId, room, excludeKey = null) {
    const conflicts = [];
    
    console.log('Vérification des conflits pour:', { day, time, teacherId, groupId, room });
    
    Object.entries(allScheduleData).forEach(([key, schedule]) => {
        if (key === excludeKey) return;
        
        // Vérifier si c'est le même créneau (jour et heure)
        if (schedule.day === day && schedule.time === time) {
            console.log('Créneau identique trouvé:', schedule);
            
            // Vérifier l'enseignant par ID plutôt que par nom
            if (schedule.teacherId === teacherId) {
                conflicts.push(`Enseignant ${schedule.teacher} déjà occupé à ce créneau`);
            }
            
            // Vérifier le groupe par ID
            if (schedule.groupId === groupId) {
                conflicts.push(`Groupe ${schedule.group} déjà programmé à ce créneau`);
            }
            
            // Vérifier la salle
            if (schedule.room === room) {
                conflicts.push(`Salle ${room} déjà occupée à ce créneau`);
            }
        }
    });
    
    console.log('Conflits détectés:', conflicts);
    return [...new Set(conflicts)];
}

function detectConflicts() {
    const conflictsList = document.getElementById('conflictsList');
    if (!conflictsList) return;
    
    const conflicts = [];
    const scheduleEntries = Object.entries(allScheduleData);
    
    console.log('Détection des conflits sur', scheduleEntries.length, 'créneaux');
    
    // Détecter les conflits
    scheduleEntries.forEach(([key1, schedule1], index1) => {
        scheduleEntries.forEach(([key2, schedule2], index2) => {
            // Éviter de comparer un élément avec lui-même et éviter les doublons
            if (index1 >= index2) return;
            
            // Vérifier si c'est le même créneau (jour et heure)
            if (schedule1.day === schedule2.day && schedule1.time === schedule2.time) {
                console.log('Comparaison:', schedule1, 'vs', schedule2);
                
                // Conflit d'enseignant (même enseignant, groupes différents)
                if (schedule1.teacherId === schedule2.teacherId && schedule1.groupId !== schedule2.groupId) {
                    conflicts.push({
                        type: 'Enseignant en conflit',
                        description: `${schedule1.teacher} est programmé(e) pour ${schedule1.group} et ${schedule2.group} le ${dayLabels[schedule1.day]} à ${timeSlots.find(t => t.id === schedule1.time)?.label}`,
                        schedule1: key1,
                        schedule2: key2
                    });
                }
                
                // Conflit de salle (même salle, enseignants différents)
                if (schedule1.room === schedule2.room && schedule1.teacherId !== schedule2.teacherId) {
                    conflicts.push({
                        type: 'Salle en conflit',
                        description: `La salle ${schedule1.room} est occupée par ${schedule1.teacher} (${schedule1.group}) et ${schedule2.teacher} (${schedule2.group}) le ${dayLabels[schedule1.day]} à ${timeSlots.find(t => t.id === schedule1.time)?.label}`,
                        schedule1: key1,
                        schedule2: key2
                    });
                }
            }
        });
    });
    
    console.log('Conflits détectés:', conflicts);
    
    // Afficher les conflits
    if (conflicts.length === 0) {
        conflictsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>Aucun conflit détecté</h3>
                <p>Tous les créneaux sont correctement planifiés</p>
            </div>
        `;
    } else {
        conflictsList.innerHTML = conflicts.map(conflict => `
            <div class="conflict-item">
                <div class="conflict-type">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${conflict.type}
                </div>
                <div class="conflict-description">
                    ${conflict.description}
                </div>
                <div class="conflict-actions">
                    <button class="btn-warning" onclick="resolveConflict('${conflict.schedule1}', '${conflict.schedule2}')">
                        <i class="fas fa-tools"></i> Résoudre
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Marquer les créneaux en conflit
    conflicts.forEach(conflict => {
        markScheduleSlotAsConflict(conflict.schedule1);
        markScheduleSlotAsConflict(conflict.schedule2);
    });
}

function markScheduleSlotAsConflict(scheduleKey) {
    // Extraire day et time de la clé (format: day_time_groupId_teacherId)
    const [day, time] = scheduleKey.split('_');
    const daySlots = document.getElementById(`${day}Slots`);
    if (daySlots) {
        const slot = daySlots.querySelector(`[data-time="${time}"]`);
        if (slot) {
            slot.classList.add('conflict');
        }
    }
}

async function resolveConflict(key1, key2) {
    const schedule1 = allScheduleData[key1];
    const schedule2 = allScheduleData[key2];
    
    if (schedule1 && schedule2) {
        // Proposer de supprimer l'un des deux créneaux
        const conflictDetails = `
            <strong>Conflit entre:</strong><br>
            1. ${schedule1.teacher} - ${schedule1.group} - ${schedule1.room}<br>
            2. ${schedule2.teacher} - ${schedule2.group} - ${schedule2.room}<br>
            <strong>Créneau:</strong> ${dayLabels[schedule1.day]} ${timeSlots.find(t => t.id === schedule1.time)?.label}
        `;
        
        showConfirmation(
            `Voulez-vous supprimer un des créneaux en conflit ?\n\n${conflictDetails}`,
            async () => {
                try {
                    // Supprimer le second créneau par défaut
                    await deleteScheduleFromAPI(schedule2.id);
                    await loadSchedulesFromAPI();
                    loadScheduleGrid();
                    showNotification('Conflit résolu', 'success');
                } catch (error) {
                    showNotification('Erreur lors de la résolution du conflit', 'error');
                }
            }
        );
    }
}

// Navigation des onglets
function showTab(tabName) {
    // Masquer tous les onglets
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));
    
    // Afficher l'onglet sélectionné
    const selectedTab = document.getElementById(`${tabName}Tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activer le bouton correspondant
    const tabBtns2 = document.querySelectorAll('.tab-btn');
    tabBtns2.forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes(tabName)) {
            btn.classList.add('active');
        }
    });
    
    // Actions spécifiques par onglet
    if (tabName === 'teacher') {
        loadTeacherSchedule();
    } else if (tabName === 'room') {
        loadRoomSchedule();
    } else if (tabName === 'conflicts') {
        detectConflicts();
    }
}

// Navigation semaine
async function previousWeek() {
    currentWeek.setDate(currentWeek.getDate() - 7);
    updateCurrentWeekDisplay();
    await loadSchedulesFromAPI();
    loadScheduleGrid();
}

async function nextWeek() {
    currentWeek.setDate(currentWeek.getDate() + 7);
    updateCurrentWeekDisplay();
    await loadSchedulesFromAPI();
    loadScheduleGrid();
}

// Chargement des plannings par enseignant
function loadTeacherSchedule() {
    const teacherId = parseInt(document.getElementById('selectedTeacher').value);
    const displayDiv = document.getElementById('teacherScheduleDisplay');
    
    if (!teacherId || !displayDiv) {
        if (displayDiv) {
            displayDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chalkboard-teacher"></i>
                    <h3>Aucun enseignant sélectionné</h3>
                    <p>Sélectionnez un enseignant pour voir son emploi du temps</p>
                </div>
            `;
        }
        return;
    }
    
    const teacher = teachers.find(t => t.id === teacherId);
    const teacherSchedules = Object.values(allScheduleData).filter(s => s.teacherId === teacherId);
    
    if (teacherSchedules.length === 0) {
        displayDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>Aucun cours programmé</h3>
                <p>${teacher?.name || 'Cet enseignant'} n'a pas de cours programmés cette semaine</p>
            </div>
        `;
        return;
    }
    
    // Trier par jour et heure
    teacherSchedules.sort((a, b) => {
        const dayOrder = {sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4 };
        if (dayOrder[a.day] !== dayOrder[b.day]) {
            return dayOrder[a.day] - dayOrder[b.day];
        }
        return a.time.localeCompare(b.time);
    });
    
    displayDiv.innerHTML = `
        <div class="teacher-schedule-list">
            ${teacherSchedules.map(schedule => `
                <div class="teacher-schedule-item">
                    <div class="schedule-item-info">
                        <div class="schedule-item-time">
                            ${dayLabels[schedule.day]} - ${timeSlots.find(t => t.id === schedule.time)?.label}
                        </div>
                        <div class="schedule-item-speciality">${schedule.speciality}</div>
                        <div class="schedule-item-subject">${schedule.module}</div>
                        <div class="schedule-item-details">
                            <span><i class="fas fa-users"></i> ${schedule.group}</span>
                            <span><i class="fas fa-door-open"></i> ${schedule.room}</span>
                            <span class="schedule-type ${getTypeClass(schedule.type)}"><i class="fas fa-tag"></i> ${schedule.type}</span>
                        </div>
                    </div>
                    <div class="schedule-item-actions">
                        <button class="action-btn edit" onclick="openEditModal(allScheduleData['${schedule.day}_${schedule.time}_${schedule.groupId}_${schedule.teacherId}'])" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Chargement des plannings par salle
function loadRoomSchedule() {
    const selectedRoom = document.getElementById('selectedRoom').value;
    const displayDiv = document.getElementById('roomScheduleDisplay');
    
    if (!selectedRoom || !displayDiv) {
        if (displayDiv) {
            displayDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-door-open"></i>
                    <h3>Aucune salle sélectionnée</h3>
                    <p>Sélectionnez une salle pour voir son occupation</p>
                </div>
            `;
        }
        return;
    }
    
    const roomSchedules = Object.values(allScheduleData).filter(s => s.room === selectedRoom);
    
    if (roomSchedules.length === 0) {
        displayDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-door-open"></i>
                <h3>Salle libre</h3>
                <p>La ${selectedRoom} n'a pas de cours programmés cette semaine</p>
            </div>
        `;
        return;
    }
    
    // Trier par jour et heure
    roomSchedules.sort((a, b) => {
        const dayOrder = {sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4 };
        if (dayOrder[a.day] !== dayOrder[b.day]) {
            return dayOrder[a.day] - dayOrder[b.day];
        }
        return a.time.localeCompare(b.time);
    });
    
    displayDiv.innerHTML = `
        <div class="teacher-schedule-list">
            ${roomSchedules.map(schedule => `
                <div class="teacher-schedule-item">
                    <div class="schedule-item-info">
                        <div class="schedule-item-time">
                            ${dayLabels[schedule.day]} - ${timeSlots.find(t => t.id === schedule.time)?.label}
                        </div>
                        <div class="schedule-item-speciality">${schedule.speciality}</div>
                        <div class="schedule-item-subject">${schedule.module}</div>
                        <div class="schedule-item-details">
                            <span><i class="fas fa-chalkboard-teacher"></i> ${schedule.teacher}</span>
                            <span><i class="fas fa-users"></i> ${schedule.group}</span>
                            <span class="schedule-type ${getTypeClass(schedule.type)}"><i class="fas fa-tag"></i> ${schedule.type}</span>
                        </div>
                    </div>
                    <div class="schedule-item-actions">
                        <button class="action-btn edit" onclick="openEditModal(allScheduleData['${schedule.day}_${schedule.time}_${schedule.groupId}_${schedule.teacherId}'])" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ==============================================
// FONCTIONS UTILITAIRES
// ==============================================

function resolveAllConflicts() {
    showConfirmation(
        'Voulez-vous résoudre automatiquement tous les conflits détectés ?',
        async () => {
            try {
                await loadSchedulesFromAPI();
                detectConflicts();
                showNotification('Conflits vérifiés automatiquement', 'success');
            } catch (error) {
                showNotification('Erreur lors de la résolution automatique', 'error');
            }
        }
    );
}

function setupEventListeners() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mainContent = document.getElementById('mainContent');
    const menuToggle = document.getElementById('menuToggle');
    
    // Toggle sidebar
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });
    }
    
    // Mobile menu
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
        });
    }
    
    // Gestionnaire d'événements pour fermer les modals
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Restaurer l'état
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }
}

// Fonctions modales
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Fonctions de navigation (pour la cohérence avec le système admin)
function showDashboard() {
    window.location.href = 'admin.html';
}

function showUserManagement() {
    window.location.href = 'gestion_utilisateurs.html';
}

function showGroupManagement() {
    window.location.href = 'groupes_classes.html';
}

function showScheduleManagement() {
    location.reload();
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
        sidebarBadge.style.display = unreadCount > 0 ? 'inline' : 'none';
    }
    
    // Mettre à jour le badge dans le header
    const headerBadge = document.querySelector('.notification-badge');
    if (headerBadge) {
        headerBadge.textContent = unreadCount;
        headerBadge.style.display = unreadCount > 0 ? 'inline' : 'none';
    }
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

// Système de notifications
function showNotification(message, type = 'info') {
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Styles inline pour la notification
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
    
    // Supprimer après 3 secondes
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

// Système de confirmation
function showConfirmation(message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const messageEl = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmAction');
    
    if (messageEl) messageEl.textContent = message;
    
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            onConfirm();
            closeModal('confirmModal');
        };
    }
    
    openModal('confirmModal');
}

// Styles CSS pour les animations de notification et l'amélioration du type de cours
const notificationStyles = `
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}

.filters-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
}

.specialty-filter {
    display: flex;
    align-items: center;
    gap: 10px;
}

.specialty-filter label {
    font-weight: 500;
    color: #495057;
}

.specialty-filter select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    min-width: 200px;
}

.action-header {
    margin-bottom: 20px;
}

.action-buttons {
    display: flex;
    gap: 10px;
}

.btn-success {
    background: #28a745;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
}

.btn-success:hover {
    background: #218838;
}

/* Styles pour les créneaux multiples */
.schedule-slot.multiple {
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    border: 2px solid #6c757d;
}

.slot-content.multiple-courses {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 100%;
    overflow-y: auto;
}

.course-item {
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 11px;
    line-height: 1.2;
}

.course-separator {
    height: 1px;
    background: #dee2e6;
    margin: 1px 0;
}

/* Styles pour le type de cours */
.slot-type {
    font-weight: bold;
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 3px;
    background: rgba(0,0,0,0.1);
    display: inline-block;
    margin-top: 2px;
}

.schedule-type {
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.schedule-type.cours {
    background: #e3f2fd;
    color: #1976d2;
}

.schedule-type.td {
    background: #f3e5f5;
    color: #7b1fa2;
}

.schedule-type.tp {
    background: #e8f5e8;
    color: #388e3c;
}

.detail-type {
    font-weight: bold;
    padding: 4px 8px;
    border-radius: 4px;
}

.detail-type.cours {
    background: #e3f2fd;
    color: #1976d2;
}

.detail-type.td {
    background: #f3e5f5;
    color: #7b1fa2;
}

.detail-type.tp {
    background: #e8f5e8;
    color: #388e3c;
}

/* Amélioration de l'affichage des conflits */
.schedule-slot.conflict {
    border: 3px solid #dc3545 !important;
    box-shadow: 0 0 10px rgba(220, 53, 69, 0.3);
    animation: conflictPulse 2s infinite;
}

@keyframes conflictPulse {
    0% { box-shadow: 0 0 10px rgba(220, 53, 69, 0.3); }
    50% { box-shadow: 0 0 20px rgba(220, 53, 69, 0.6); }
    100% { box-shadow: 0 0 10px rgba(220, 53, 69, 0.3); }
}
`;

console.log('CFPA Emploi du Temps avec correction du type de cours initialisé avec succès');