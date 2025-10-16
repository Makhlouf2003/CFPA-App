// =========================
// Configuration & Constantes
// =========================
const API_BASE_URL = 'http://localhost:8080/api';

// Données globales
let users = [];
let profiles = [];
let modules = [];
let groupes = [];
let currentUser = null;
let editingUserId = null;
let authToken = localStorage.getItem('accessToken') || null;

// Formations disponibles
const formations = [
    'Informatique', 'Électronique', 'Mécanique', 'Couture',
    'Coiffure', 'Comptabilité', 'Langues'
];

// =========================
// Fonctions API Utilitaires
// =========================
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
        
        return await response.json();
    } catch (error) {
        console.error('Erreur API:', error);
        showNotification(`Erreur: ${error.message}`, 'error');
        throw error;
    }
}

// =========================
// Fonctions pour gérer les profils
// =========================
async function loadProfilesFromAPI() {
    try {
        const apiProfiles = await apiRequest('/profil/');
        profiles = apiProfiles.map(profile => ({
            id: profile.id,
            utilisateurId: profile.utilisateurId,
            photo: profile.photo,
            specialite: profile.specialite,
            numeroCarteIdentite: profile.numero_carte_identite,
            informationsSupplementaires: profile.informations_supplementaires,
            additionalData: profile.informations_supplementaires ? 
                (typeof profile.informations_supplementaires === 'string' ? 
                    JSON.parse(profile.informations_supplementaires) : 
                    profile.informations_supplementaires) : {},
            cree_a: profile.cree_a,
            mis_a_jour_a: profile.mis_a_jour_a
        }));
        
        return profiles;
    } catch (error) {
        console.error('Erreur lors du chargement des profils:', error);
        return [];
    }
}

async function loadModulesFromAPI() {
    try {
        modules = await apiRequest('/modules');
        return modules;
    } catch (error) {
        console.error('Erreur lors du chargement des modules:', error);
        return [];
    }
}

async function loadGroupesFromAPI() {
    try {
        groupes = await apiRequest('/groupes');
        return groupes;
    } catch (error) {
        console.error('Erreur lors du chargement des groupes:', error);
        return [];
    }
}

function getProfileByUserId(userId) {
    return profiles.find(profile => profile.utilisateurId.toString() === userId.toString());
}

// =========================
// Vérification de l'existence d\'un profil
// =========================
async function checkProfileExists(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/profil/${userId}`, {
            method: 'GET',
            headers: {
                'x-access-token': authToken
            }
        });
        
        if (response.ok) {
            const profile = await response.json();
            return { exists: true, profile };
        } else if (response.status === 404) {
            return { exists: false, profile: null };
        } else {
            console.warn('Erreur lors de la vérification du profil:', response.status);
            return { exists: false, profile: null };
        }
    } catch (error) {
        console.error('Erreur lors de la vérification du profil:', error);
        return { exists: false, profile: null };
    }
}

// =========================
// Fonctions API CRUD pour utilisateurs
// =========================
async function loadUsersFromAPI() {
    try {
        const [apiUsers, apiProfiles, apiModules, apiGroupes] = await Promise.all([
            apiRequest('/users'),
            loadProfilesFromAPI(),
            loadModulesFromAPI(),
            loadGroupesFromAPI()
        ]);
        
        // Filtrer les utilisateurs admin de l'affichage
        const filteredApiUsers = apiUsers.filter(user => {
            const hasAdminRole = user.roles && user.roles.some(role => 
                role.nom === 'admin' || role.nom === 'ROLE_ADMIN'
            );
            return !hasAdminRole;
        });
        
        // Transformer les données API au format attendu par l'interface
        users = filteredApiUsers.map(user => {
            const profile = getProfileByUserId(user.id);
            const additionalData = profile ? profile.additionalData : {};
            
            // Déterminer le rôle principal
            const primaryRole = user.roles && user.roles.length > 0 ? user.roles[0].nom : 'stagiaire';
            const displayRole = primaryRole === 'enseignant' ? 'Enseignant' : 'Stagiaire';
            
            return {
                id: user.id.toString(),
                nom: user.nom || '',
                firstName: additionalData.firstName || extractFirstName(user.nom || ''),
                lastName: additionalData.lastName || extractLastName(user.nom || ''),
                email: user.email || '',
                role: displayRole,
                primaryRole: primaryRole,
                status: 'Actif', // Par défaut, peut être modifié selon vos besoins
                registrationDate: profile ? profile.cree_a : new Date().toISOString(),
                
                // Données de profil
                photo: profile ? profile.photo : null,
                phone: additionalData.phone || '',
                matricule: profile ? profile.numeroCarteIdentite : '',
                birthDate: additionalData.birthDate || '',
                gender: additionalData.gender || '',
                address: additionalData.address || '',
                specialty: profile && profile.specialite ? profile.specialite : (additionalData.formation || ''),
                formation: additionalData.formation || (profile ? profile.specialite : ''),
                level: additionalData.studyLevel || '',
                experience: additionalData.experience || 0,
                qualification: additionalData.qualification || '',
                emergencyContact: additionalData.emergencyContact || '',
                emergencyName: additionalData.emergencyName || '',
                relationship: additionalData.relationship || '',
                
                // Données brutes pour référence
                rawData: user,
                profileData: profile
            };
        });
        
        // Trier par date de création
        users.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));
        
        localStorage.setItem('users', JSON.stringify(users));
        return users;
    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        // En cas d'erreur, charger depuis localStorage comme fallback
        const savedUsers = localStorage.getItem('users');
        if (savedUsers) {
            try {
                users = JSON.parse(savedUsers);
            } catch (parseError) {
                console.error('Erreur parsing localStorage:', parseError);
                users = [];
            }
        }
        return users;
    }
}

async function createUserAPI(userData) {
    try {
        // Vérifier qu'on ne crée pas un admin
        if (userData.role === 'Admin' || userData.role === 'admin') {
            throw new Error('La création d\'utilisateurs administrateurs n\'est pas autorisée depuis cette interface.');
        }
        
        // Générer un mot de passe temporaire si non fourni
        const tempPassword = userData.password || generateTempPassword();
        
        // Préparer les données pour l'API d\'inscription
        const apiUserData = {
            nom: `${userData.firstName} ${userData.lastName}`.trim(),
            email: userData.email,
            mot_de_passe: tempPassword,
            roles: [userData.role === 'Enseignant' ? 'enseignant' : 'stagiaire'],
            informations_supplementaires: JSON.stringify({
                firstName: userData.firstName,
                lastName: userData.lastName,
                matricule: userData.matricule,
                phone: userData.phone || '',
                address: userData.address || '',
                birthDate: userData.birthDate || '',
                gender: userData.gender || '',
                formation: userData.formation || userData.specialty || '',
                studyLevel: userData.level || '',
                experience: userData.experience || 0,
                qualification: userData.qualification || '',
                emergencyContact: userData.emergencyContact || '',
                emergencyName: userData.emergencyName || '',
                relationship: userData.relationship || ''
            })
        };
        
        // Créer l'utilisateur
        const signupResult = await apiRequest('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(apiUserData)
        });
        
        console.log('Utilisateur créé:', signupResult);
        
        // Récupérer l'ID du nouvel utilisateur en chargeant la liste mise à jour
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre un peu
        const updatedUsers = await apiRequest('/users');
        const newUser = updatedUsers.find(u => u.email === userData.email);
        
        if (newUser) {
            // Créer le profil détaillé
            await createUserProfile(newUser.id, userData, tempPassword);
        }
        
        showNotification('Utilisateur créé avec succès', 'success');
        
        // Recharger la liste des utilisateurs
        await loadUsersFromAPI();
        renderAllUsers();
        
        return signupResult;
    } catch (error) {
        console.error('Erreur lors de la création:', error);
        showNotification(`Erreur lors de la création: ${error.message}`, 'error');
        throw error;
    }
}

async function createUserProfile(userId, userData, password) {
    try {
        const formData = new FormData();
        
        // Préparer les données de profil
        const profileData = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone || '',
            birthDate: userData.birthDate || '',
            gender: userData.gender || '',
            address: userData.address || '',
            formation: userData.formation || userData.specialty || '',
            studyLevel: userData.level || '',
            experience: userData.experience || 0,
            qualification: userData.qualification || '',
            emergencyContact: userData.emergencyContact || '',
            emergencyName: userData.emergencyName || '',
            relationship: userData.relationship || '',
            tempPassword: password // Pour information de l'admin
        };
        
        formData.append('specialite', userData.specialty || userData.formation || '');
        formData.append('numero_carte_identite', userData.matricule || '');
        formData.append('informations_supplementaires', JSON.stringify(profileData));
        
        // Ajouter la photo si elle existe
        if (userData.photoFile) {
            formData.append('photo', userData.photoFile);
        }
        
        // Créer le profil
        const result = await fetch(`${API_BASE_URL}/profil/${userId}`, {
            method: 'POST',
            headers: {
                'x-access-token': authToken
            },
            body: formData
        });
        
        if (!result.ok) {
            const errorData = await result.json().catch(() => ({}));
            console.warn('Erreur lors de la création du profil:', errorData.message || result.statusText);
        } else {
            console.log('Profil créé avec succès pour l\'utilisateur', userId);
        }
        
    } catch (error) {
        console.error('Erreur lors de la création du profil:', error);
        // Ne pas faire échouer l'opération principale
    }
}

async function updateUserAPI(userId, userData) {
    try {
        // Vérifier qu'on ne modifie pas vers un rôle admin
        if (userData.role === 'Admin' || userData.role === 'admin') {
            throw new Error('La modification vers un rôle administrateur n\'est pas autorisée depuis cette interface.');
        }
        
        // Mettre à jour l'utilisateur principal
        const apiUserData = {
            nom: `${userData.firstName} ${userData.lastName}`.trim(),
            email: userData.email,
            roles: [userData.role === 'Enseignant' ? 'enseignant' : 'stagiaire'],
            informations_supplementaires: JSON.stringify({
                firstName: userData.firstName,
                lastName: userData.lastName,
                matricule: userData.matricule
            })
        };
        
        await apiRequest(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(apiUserData)
        });
        
        // Mettre à jour le profil
        await updateOrCreateProfile(userId, userData);
        
        showNotification('Utilisateur modifié avec succès', 'success');
        
        // Recharger la liste des utilisateurs
        await loadUsersFromAPI();
        renderAllUsers();
        renderTeachers();
        renderTrainees();
        
    } catch (error) {
        console.error('Erreur lors de la modification:', error);
        showNotification(`Erreur lors de la modification: ${error.message}`, 'error');
        throw error;
    }
}

async function updateOrCreateProfile(userId, userData) {
    try {
        // Vérifier d'abord si le profil existe
        const profileCheck = await checkProfileExists(userId);
        const profileExists = profileCheck.exists;
        
        console.log(`Profil pour l'utilisateur ${userId}: ${profileExists ? 'existe' : 'n\'existe pas'}`);

        const formData = new FormData();
        
        // Préparer les données de profil
        const profileData = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone || '',
            birthDate: userData.birthDate || '',
            gender: userData.gender || '',
            address: userData.address || '',
            formation: userData.formation || userData.specialty || '',
            studyLevel: userData.level || '',
            experience: userData.experience || 0,
            qualification: userData.qualification || '',
            emergencyContact: userData.emergencyContact || '',
            emergencyName: userData.emergencyName || '',
            relationship: userData.relationship || ''
        };
        
        formData.append('specialite', userData.specialty || userData.formation || '');
        formData.append('numero_carte_identite', userData.matricule || '');
        formData.append('informations_supplementaires', JSON.stringify(profileData));
        
        // Ajouter la photo si elle a été modifiée
        if (userData.photoFile) {
            formData.append('photo', userData.photoFile);
        }
        
        // Utiliser la méthode appropriée
        const method = profileExists ? 'PUT' : 'POST';
        const url = `${API_BASE_URL}/profil/${userId}`;
        
        console.log(`${method} request vers ${url}`);

        const response = await fetch(url, {
            method: method,
            headers: {
                'x-access-token': authToken
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.warn(`Erreur lors de la ${profileExists ? 'mise à jour' : 'création'} du profil:`, errorData.message || response.statusText);
        } else {
            console.log(`Profil ${profileExists ? 'mis à jour' : 'créé'} avec succès pour l'utilisateur ${userId}`);
        }
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        // Ne pas faire échouer l'opération principale
    }
}

async function deleteUserAPI(userId) {
    try {
        // Supprimer d'abord le profil (cascade devrait s\'en charger mais on s'assure)
        try {
            await fetch(`${API_BASE_URL}/profil/${userId}`, {
                method: 'DELETE',
                headers: {
                    'x-access-token': authToken
                }
            });
        } catch (profileError) {
            console.warn('Erreur lors de la suppression du profil (peut être normal):', profileError.message);
        }
        
        // Supprimer l'utilisateur principal
        await apiRequest(`/users/${userId}`, {
            method: 'DELETE'
        });
        
        showNotification('Utilisateur supprimé avec succès', 'success');
        
        // Recharger la liste des utilisateurs
        await loadUsersFromAPI();
        renderAllUsers();
        renderTeachers();
        renderTrainees();
        renderPendingUsers();
        
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
        throw error;
    }
}

// =========================
// Fonctions utilitaires
// =========================
function extractFirstName(fullName) {
    if (!fullName) return '';
    return fullName.split(' ')[0] || '';
}

function extractLastName(fullName) {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    return parts.slice(1).join(' ') || '';
}

function generateTempPassword() {
    return 'temp' + Math.random().toString(36).substr(2, 8);
}

async function getUserDetailedProfile(userId) {
    try {
        const user = users.find(u => u.id.toString() === userId.toString());
        
        if (!user) {
            console.warn('Utilisateur non trouvé:', userId);
            return null;
        }
        
        // Si on n'a pas toutes les données, essayer de les récupérer depuis l\'API
        if (!user.profileData && authToken) {
            try {
                const profileCheck = await checkProfileExists(userId);
                if (profileCheck.exists) {
                    const apiProfile = profileCheck.profile;
                    const additionalData = apiProfile.informations_supplementaires ? 
                        (typeof apiProfile.informations_supplementaires === 'string' ? 
                            JSON.parse(apiProfile.informations_supplementaires) : 
                            apiProfile.informations_supplementaires) : {};
                    
                    // Mettre à jour les données utilisateur avec le profil détaillé
                    Object.assign(user, {
                        photo: apiProfile.photo,
                        phone: additionalData.phone || '',
                        matricule: apiProfile.numero_carte_identite || '',
                        birthDate: additionalData.birthDate || '',
                        gender: additionalData.gender || '',
                        address: additionalData.address || '',
                        emergencyContact: additionalData.emergencyContact || '',
                        emergencyName: additionalData.emergencyName || '',
                        relationship: additionalData.relationship || '',
                        profileData: apiProfile
                    });
                }
            } catch (error) {
                console.warn('Profil non trouvé pour l\'utilisateur', userId);
            }
        }
        
        return user;
    } catch (error) {
        console.error('Erreur lors de la récupération du profil détaillé:', error);
        return users.find(u => u.id.toString() === userId.toString()) || null;
    }
}

// =========================
// Initialisation
// =========================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initialisation de la gestion des utilisateurs...');
    
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
    
    if (!authToken) {
        console.warn('Pas de token d\'authentification trouvé');
        showNotification('Veuillez vous reconnecter', 'warning');
        // Rediriger vers la page de connexion après un délai
        setTimeout(() => {
            window.location.href = '/client/login_page/index.html';
        }, 3000);
        return;
    }
    
    try {
        await initializeData();
        initializeUserRoleOptions();
        renderAllUsers();
        updateNotificationBadge();
        setupEventListeners();
        
        console.log('Initialisation terminée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showNotification('Erreur lors du chargement des données', 'error');
    }
});

async function initializeData() {
    try {
        showNotification('Chargement des données...', 'info');
        await loadUsersFromAPI();
        console.log(`${users.length} utilisateurs chargés`);
        console.log(`${profiles.length} profils chargés`);
        console.log(`${modules.length} modules chargés`);
        console.log(`${groupes.length} groupes chargés`);
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des données:', error);
        throw error;
    }
}

function initializeUserRoleOptions() {
    const roleSelect = document.getElementById('userRole');
    if (roleSelect) {
        roleSelect.innerHTML = `
            <option value="">Sélectionner un rôle</option>
            <option value="Enseignant">Enseignant</option>
            <option value="Stagiaire">Stagiaire</option>
        `;
    }
    
    // Initialiser les formations
    const formationSelect = document.getElementById('traineeFormation');
    if (formationSelect) {
        formationSelect.innerHTML = `
            <option value="">Sélectionner une formation</option>
            ${formations.map(formation => `<option value="${formation}">${formation}</option>`).join('')}
        `;
    }
    
    const specialtySelect = document.getElementById('teacherSpecialty');
    if (specialtySelect) {
        specialtySelect.innerHTML = `
            <option value="">Sélectionner une spécialité</option>
            ${formations.map(formation => `<option value="${formation}">${formation}</option>`).join('')}
        `;
    }
    
    // Filtres
    const filterRole = document.getElementById('filterRole');
    if (filterRole) {
        filterRole.innerHTML = `
            <option value="">Tous les rôles</option>
            <option value="Enseignant">Enseignants</option>
            <option value="Stagiaire">Stagiaires</option>
        `;
    }
}

// =========================
// Gestion des utilisateurs (CRUD)
// =========================
async function saveUser() {
    const form = document.getElementById('addUserForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const userData = {
        firstName: document.getElementById('userFirstName').value.trim(),
        lastName: document.getElementById('userLastName').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        password: document.getElementById('userPassword').value,
        matricule: document.getElementById('userMatricule').value.trim(),
        phone: document.getElementById('userPhone')?.value.trim() || '',
        birthDate: document.getElementById('userBirthDate')?.value || '',
        gender: document.getElementById('userGender')?.value || '',
        address: document.getElementById('userAddress')?.value.trim() || '',
        role: document.getElementById('userRole').value,
        status: 'Actif',
        registrationDate: new Date().toISOString().split('T')[0]
    };

    // Ajouter les champs spécifiques selon le rôle
    if (userData.role === 'Enseignant') {
        userData.specialty = document.getElementById('teacherSpecialty').value;
        userData.experience = document.getElementById('teacherExperience')?.value || 0;
        userData.qualification = document.getElementById('teacherQualification')?.value || '';
    } else if (userData.role === 'Stagiaire') {
        userData.formation = document.getElementById('traineeFormation').value;
        userData.level = document.getElementById('traineeLevel')?.value || '';
        userData.emergencyContact = document.getElementById('traineeEmergencyContact')?.value || '';
        userData.emergencyName = document.getElementById('traineeEmergencyName')?.value || '';
        userData.relationship = document.getElementById('traineeRelationship')?.value || '';
    }

    // Gérer la photo si elle a été uploadée
    const photoInput = document.getElementById('userPhoto');
    if (photoInput && photoInput.files.length > 0) {
        userData.photoFile = photoInput.files[0];
    }

    try {
        if (editingUserId) {
            await updateUserAPI(editingUserId, userData);
            editingUserId = null;
        } else {
            await createUserAPI(userData);
        }

        closeModal('addUserModal');
        form.reset();
        
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        // L'erreur est déjà gérée dans les fonctions API
    }
}

function editUser(userId) {
    const user = users.find(u => u.id.toString() === userId.toString());
    if (!user) {
        console.error('Utilisateur non trouvé pour l\'édition:', userId);
        return;
    }

    editingUserId = userId;

    // Remplir le formulaire avec les données existantes
    document.getElementById('userFirstName').value = user.firstName || '';
    document.getElementById('userLastName').value = user.lastName || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userPassword').value = ''; // Ne pas pré-remplir le mot de passe
    document.getElementById('userMatricule').value = user.matricule || '';
    document.getElementById('userRole').value = user.role || '';
    
    // Champs optionnels
    if (document.getElementById('userPhone')) {
        document.getElementById('userPhone').value = user.phone || '';
    }
    if (document.getElementById('userBirthDate')) {
        document.getElementById('userBirthDate').value = user.birthDate || '';
    }
    if (document.getElementById('userGender')) {
        document.getElementById('userGender').value = user.gender || '';
    }
    if (document.getElementById('userAddress')) {
        document.getElementById('userAddress').value = user.address || '';
    }
    
    toggleRoleFields();
    
    if (user.role === 'Enseignant') {
        document.getElementById('teacherSpecialty').value = user.specialty || '';
        if (document.getElementById('teacherExperience')) {
            document.getElementById('teacherExperience').value = user.experience || 0;
        }
        if (document.getElementById('teacherQualification')) {
            document.getElementById('teacherQualification').value = user.qualification || '';
        }
    } else if (user.role === 'Stagiaire') {
        document.getElementById('traineeFormation').value = user.formation || '';
        if (document.getElementById('traineeLevel')) {
            document.getElementById('traineeLevel').value = user.level || '';
        }
        if (document.getElementById('traineeEmergencyContact')) {
            document.getElementById('traineeEmergencyContact').value = user.emergencyContact || '';
        }
        if (document.getElementById('traineeEmergencyName')) {
            document.getElementById('traineeEmergencyName').value = user.emergencyName || '';
        }
        if (document.getElementById('traineeRelationship')) {
            document.getElementById('traineeRelationship').value = user.relationship || '';
        }
    }

    // Changer le titre et le bouton
    const modalTitle = document.querySelector('#addUserModal .modal-header h3');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-user-edit"></i> Modifier l\'Utilisateur';
    }
    
    openModal('addUserModal');
}

async function deleteUser(userId) {
    const user = users.find(u => u.id.toString() === userId.toString());
    if (!user) {
        console.error('Utilisateur non trouvé pour la suppression:', userId);
        return;
    }

    const deleteConfirmText = document.getElementById('deleteConfirmText');
    if (deleteConfirmText) {
        deleteConfirmText.textContent = 
            `Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.firstName} ${user.lastName}" ?`;
    }

    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.onclick = async () => {
            try {
                await deleteUserAPI(userId);
                closeModal('deleteConfirmModal');
            } catch (error) {
                console.error('Erreur lors de la suppression:', error);
            }
        };
    }

    openModal('deleteConfirmModal');
}

async function validateUser(userId) {
    const userIndex = users.findIndex(u => u.id.toString() === userId.toString());
    if (userIndex !== -1) {
        try {
            users[userIndex].status = 'Actif';
            
            // Mettre à jour via API si possible
            if (authToken) {
                await updateUserAPI(userId, users[userIndex]);
            } else {
                localStorage.setItem('users', JSON.stringify(users));
            }
            
            renderAllUsers();
            renderTrainees();
            renderPendingUsers();
            
            showNotification('Utilisateur validé avec succès', 'success');
        } catch (error) {
            users[userIndex].status = 'En attente';
            console.error('Erreur lors de la validation:', error);
        }
    }
}

// =========================
// Fonctions de rendu
// =========================
function renderAllUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Aucun utilisateur enregistré</h3>
                    <p>Commencez par ajouter votre premier utilisateur</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div class="user-info">
                    <div>
                        <strong>${user.firstName} ${user.lastName}</strong>
                    </div>
                </div>
            </td>
            <td>
                <span class="role-badge ${user.role.toLowerCase()}">${user.role}</span>
            </td>
            <td>${user.role === 'Enseignant' ? (user.specialty || '-') : (user.formation || '-')}</td>
            <td>
                <span class="status-badge ${getStatusClass(user.status)}">${user.status}</span>
            </td>
            <td>${formatDate(user.registrationDate)}</td>
            <td class="table-actions">
                <button class="action-btn view" onclick="viewUser('${user.id}')" title="Voir détails">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="editUser('${user.id}')" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                ${user.status === 'En attente' 
                    ? `<button class="action-btn validate" onclick="validateUser('${user.id}')" title="Valider">
                        <i class="fas fa-check"></i>
                       </button>`
                    : ''
                }
                <button class="action-btn delete" onclick="deleteUser('${user.id}')" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderTeachers() {
    const grid = document.getElementById('teachersGrid');
    if (!grid) return;
    
    const teachers = users.filter(u => u.role === 'Enseignant');
    
    if (teachers.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chalkboard-teacher"></i>
                <h3>Aucun enseignant enregistré</h3>
                <p>Ajoutez des enseignants pour commencer</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = teachers.map(teacher => `
        <div class="user-card teacher">
            <div class="user-card-header">
                ${teacher.photo 
                    ? `<img src="${teacher.photo}" alt="${teacher.firstName}" class="user-card-photo">`
                    : `<div class="user-card-photo-placeholder">${teacher.firstName[0]}</div>`
                }
                <div class="user-card-info">
                    <h3>${teacher.firstName} ${teacher.lastName}</h3>
                    <p><i class="fas fa-envelope"></i> ${teacher.email}</p>
                    <p><i class="fas fa-phone"></i> ${teacher.phone || 'Non renseigné'}</p>
                </div>
            </div>
            <div class="user-card-details">
                <div class="user-card-detail">
                    <span class="label">Spécialité</span>
                    <span class="value">${teacher.specialty || 'Non renseignée'}</span>
                </div>
                <div class="user-card-detail">
                    <span class="label">Expérience</span>
                    <span class="value">${teacher.experience || 0} ans</span>
                </div>
                <div class="user-card-detail">
                    <span class="label">Statut</span>
                    <span class="value">
                        <span class="status-badge ${getStatusClass(teacher.status)}">${teacher.status}</span>
                    </span>
                </div>
                <div class="user-card-detail">
                    <span class="label">Inscription</span>
                    <span class="value">${formatDate(teacher.registrationDate)}</span>
                </div>
            </div>
            <div class="user-card-actions">
                <button class="action-btn view" onclick="viewUser('${teacher.id}')" title="Voir détails">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="editUser('${teacher.id}')" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteUser('${teacher.id}')" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderTrainees() {
    const grid = document.getElementById('traineesGrid');
    if (!grid) return;
    
    const trainees = users.filter(u => u.role === 'Stagiaire');
    
    if (trainees.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-graduate"></i>
                <h3>Aucun stagiaire enregistré</h3>
                <p>Ajoutez des stagiaires pour commencer</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = trainees.map(trainee => `
        <div class="user-card trainee">
            <div class="user-card-header">
                ${trainee.photo 
                    ? `<img src="${trainee.photo}" alt="${trainee.firstName}" class="user-card-photo">`
                    : `<div class="user-card-photo-placeholder">${trainee.firstName[0]}</div>`
                }
                <div class="user-card-info">
                    <h3>${trainee.firstName} ${trainee.lastName}</h3>
                    <p><i class="fas fa-envelope"></i> ${trainee.email}</p>
                    <p><i class="fas fa-phone"></i> ${trainee.phone || 'Non renseigné'}</p>
                </div>
            </div>
            <div class="user-card-details">
                <div class="user-card-detail">
                    <span class="label">Formation</span>
                    <span class="value">${trainee.formation || 'Non assignée'}</span>
                </div>
                <div class="user-card-detail">
                    <span class="label">Niveau</span>
                    <span class="value">${trainee.level || 'Non renseigné'}</span>
                </div>
                <div class="user-card-detail">
                    <span class="label">Statut</span>
                    <span class="value">
                        <span class="status-badge ${getStatusClass(trainee.status)}">${trainee.status}</span>
                    </span>
                </div>
                <div class="user-card-detail">
                    <span class="label">Inscription</span>
                    <span class="value">${formatDate(trainee.registrationDate)}</span>
                </div>
            </div>
            <div class="user-card-actions">
                <button class="action-btn view" onclick="viewUser('${trainee.id}')" title="Voir détails">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="editUser('${trainee.id}')" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                ${trainee.status === 'En attente' 
                    ? `<button class="action-btn validate" onclick="validateUser('${trainee.id}')" title="Valider">
                        <i class="fas fa-check"></i>
                       </button>`
                    : ''
                }
                <button class="action-btn delete" onclick="deleteUser('${trainee.id}')" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderPendingUsers() {
    const container = document.getElementById('pendingList');
    if (!container) return;
    
    const pendingUsers = users.filter(u => u.status === 'En attente');
    
    if (pendingUsers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-hourglass-half"></i>
                <h3>Aucun utilisateur en attente</h3>
                <p>Toutes les validations sont à jour</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pendingUsers.map(user => `
        <div class="pending-item">
            <div class="pending-item-header">
                <div class="pending-item-info">
                    ${user.photo 
                        ? `<img src="${user.photo}" alt="${user.firstName}" class="user-card-photo">`
                        : `<div class="user-card-photo-placeholder">${user.firstName[0]}</div>`
                    }
                    <div>
                        <h3>${user.firstName} ${user.lastName}</h3>
                        <p><i class="fas fa-envelope"></i> ${user.email}</p>
                        <p><i class="fas fa-user-tag"></i> ${user.role} - ${user.specialty || user.formation}</p>
                        <p><i class="fas fa-calendar"></i> Inscrit le ${formatDate(user.registrationDate)}</p>
                    </div>
                </div>
                <div class="pending-item-actions">
                    <button class="action-btn validate" onclick="validateUser('${user.id}')" title="Valider">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn view" onclick="viewUser('${user.id}')" title="Voir détails">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteUser('${user.id}')" title="Rejeter">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function viewUser(userId) {
    try {
        const user = await getUserDetailedProfile(userId.toString());
        if (!user) {
            showNotification('Utilisateur non trouvé', 'error');
            return;
        }

        const content = document.getElementById('userDetailsContent');
        if (!content) return;

        content.innerHTML = `
            <div class="user-details">
                <div class="user-details-photo">
                    ${user.photo 
                        ? `<img src="${user.photo}" alt="${user.firstName}">`
                        : `<div class="user-photo-placeholder" style="width: 150px; height: 150px; font-size: 2rem;">${user.firstName[0]}</div>`
                    }
                    <h3>${user.firstName} ${user.lastName}</h3>
                    <span class="role-badge ${user.role.toLowerCase()}">${user.role}</span>
                </div>
                <div class="user-details-info">
                    <div class="detail-section">
                        <h4><i class="fas fa-user"></i> Informations Personnelles</h4>
                        <div class="detail-row">
                            <span class="detail-label">Nom complet:</span>
                            <span class="detail-value">${user.firstName} ${user.lastName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${user.email}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Téléphone:</span>
                            <span class="detail-value">${user.phone || 'Non renseigné'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Matricule:</span>
                            <span class="detail-value">${user.matricule || 'Non renseigné'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Date de naissance:</span>
                            <span class="detail-value">${formatDate(user.birthDate) || 'Non renseignée'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Genre:</span>
                            <span class="detail-value">${user.gender || 'Non renseigné'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Adresse:</span>
                            <span class="detail-value">${user.address || 'Non renseignée'}</span>
                        </div>
                        ${user.emergencyContact ? `
                            <div class="detail-row">
                                <span class="detail-label">Contact d'urgence:</span>
                                <span class="detail-value">${user.emergencyName || 'Contact'} - ${user.emergencyContact} ${user.relationship ? `(${user.relationship})` : ''}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="detail-section">
                        <h4><i class="fas fa-graduation-cap"></i> Informations Académiques</h4>
                        <div class="detail-row">
                            <span class="detail-label">Rôle:</span>
                            <span class="detail-value">
                                <span class="role-badge ${user.role.toLowerCase()}">${user.role}</span>
                            </span>
                        </div>
                        ${user.role === 'Enseignant' ? `
                            <div class="detail-row">
                                <span class="detail-label">Spécialité:</span>
                                <span class="detail-value">${user.specialty || 'Non renseignée'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Expérience:</span>
                                <span class="detail-value">${user.experience || 0} ans</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Qualification:</span>
                                <span class="detail-value">${user.qualification || 'Non renseignée'}</span>
                            </div>
                        ` : ''}
                        ${user.role === 'Stagiaire' ? `
                            <div class="detail-row">
                                <span class="detail-label">Formation:</span>
                                <span class="detail-value">${user.formation || 'Non assignée'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Niveau d'études:</span>
                                <span class="detail-value">${user.level || 'Non renseigné'}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="detail-section">
                        <h4><i class="fas fa-info-circle"></i> Informations Système</h4>
                        <div class="detail-row">
                            <span class="detail-label">Statut:</span>
                            <span class="detail-value">
                                <span class="status-badge ${getStatusClass(user.status)}">${user.status}</span>
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Date d'inscription:</span>
                            <span class="detail-value">${formatDate(user.registrationDate)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Dernière modification:</span>
                            <span class="detail-value">${user.profileData ? formatDate(user.profileData.mis_a_jour_a) : 'Non disponible'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        openModal('userDetailsModal');
    } catch (error) {
        console.error('Erreur lors de l\'affichage du profil:', error);
        showNotification('Erreur lors du chargement du profil', 'error');
    }
}

// =========================
// Fonctions de filtrage
// =========================
function filterUsers() {
    const roleFilter = document.getElementById('filterRole')?.value || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    const searchTerm = document.getElementById('searchUsers')?.value.toLowerCase() || '';
    
    let filteredUsers = users;
    
    if (roleFilter) {
        filteredUsers = filteredUsers.filter(u => u.role === roleFilter);
    }
    
    if (statusFilter) {
        filteredUsers = filteredUsers.filter(u => u.status === statusFilter);
    }
    
    if (searchTerm) {
        filteredUsers = filteredUsers.filter(u => 
            u.firstName.toLowerCase().includes(searchTerm) ||
            u.lastName.toLowerCase().includes(searchTerm) ||
            u.email.toLowerCase().includes(searchTerm) ||
            (u.specialty && u.specialty.toLowerCase().includes(searchTerm)) ||
            (u.formation && u.formation.toLowerCase().includes(searchTerm)) ||
            (u.matricule && u.matricule.toLowerCase().includes(searchTerm))
        );
    }
    
    renderFilteredUsers(filteredUsers);
}

function renderFilteredUsers(filteredUsers) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Aucun résultat trouvé</h3>
                    <p>Essayez de modifier vos critères de recherche</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => `
        <tr>
            <td>
                <div class="user-info">
                    ${user.photo 
                        ? `<img src="${user.photo}" alt="${user.firstName}" class="user-avatar">`
                        : `<div class="user-avatar-placeholder">${user.firstName[0]}</div>`
                    }
                    <div>
                        <strong>${user.firstName} ${user.lastName}</strong>
                        <small>${user.email}</small>
                    </div>
                </div>
            </td>
            <td><span class="role-badge ${user.role.toLowerCase()}">${user.role}</span></td>
            <td>${user.role === 'Enseignant' ? (user.specialty || '-') : (user.formation || '-')}</td>
            <td><span class="status-badge ${getStatusClass(user.status)}">${user.status}</span></td>
            <td>${formatDate(user.registrationDate)}</td>
            <td class="table-actions">
                <button class="action-btn view" onclick="viewUser('${user.id}')" title="Voir détails">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="editUser('${user.id}')" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                ${user.status === 'En attente' 
                    ? `<button class="action-btn validate" onclick="validateUser('${user.id}')" title="Valider">
                        <i class="fas fa-check"></i>
                       </button>`
                    : ''
                }
                <button class="action-btn delete" onclick="deleteUser('${user.id}')" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// =========================
// Gestion des onglets
// =========================
function showTab(tabName) {
    // Retirer la classe active de tous les onglets
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Ajouter la classe active à l'onglet sélectionné
    event.target.classList.add('active');
    const tabContent = document.getElementById(tabName + 'Tab');
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    // Charger le contenu approprié
    switch(tabName) {
        case 'users':
            renderAllUsers();
            break;
        case 'teachers':
            renderTeachers();
            break;
        case 'trainees':
            renderTrainees();
            break;
        case 'pending':
            renderPendingUsers();
            break;
    }
}

// =========================
// Gestion des champs dynamiques du formulaire
// =========================
function toggleRoleFields() {
    const role = document.getElementById('userRole')?.value;
    const teacherFields = document.getElementById('teacherFields');
    const traineeFields = document.getElementById('traineeFields');
    
    if (!teacherFields || !traineeFields) return;
    
    if (role === 'Enseignant') {
        teacherFields.style.display = 'block';
        traineeFields.style.display = 'none';
        
        const specialty = document.getElementById('teacherSpecialty');
        if (specialty) specialty.required = true;
        
        const formation = document.getElementById('traineeFormation');
        if (formation) formation.required = false;
    } else if (role === 'Stagiaire') {
        teacherFields.style.display = 'none';
        traineeFields.style.display = 'block';
        
        const specialty = document.getElementById('teacherSpecialty');
        if (specialty) specialty.required = false;
        
        const formation = document.getElementById('traineeFormation');
        if (formation) formation.required = true;
    } else {
        teacherFields.style.display = 'none';
        traineeFields.style.display = 'none';
        
        const specialty = document.getElementById('teacherSpecialty');
        if (specialty) specialty.required = false;
        
        const formation = document.getElementById('traineeFormation');
        if (formation) formation.required = false;
    }
}

// =========================
// Event Listeners
// =========================
function setupEventListeners() {
    // Recherche en temps réel
    const searchInput = document.getElementById('searchUsers');
    if (searchInput) {
        searchInput.addEventListener('input', filterUsers);
    }
    
    // Filtres
    const filterRole = document.getElementById('filterRole');
    if (filterRole) {
        filterRole.addEventListener('change', filterUsers);
    }
    
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.addEventListener('change', filterUsers);
    }
    
    // Rôle utilisateur
    const userRole = document.getElementById('userRole');
    if (userRole) {
        userRole.addEventListener('change', toggleRoleFields);
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
    
    // Bouton refresh
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }
}

// =========================
// Fonctions de rafraîchissement
// =========================
async function refreshData() {
    try {
        showNotification('Actualisation des données...', 'info');
        await loadUsersFromAPI();
        renderAllUsers();
        renderTeachers();
        renderTrainees();
        renderPendingUsers();
        showNotification('Données actualisées avec succès', 'success');
    } catch (error) {
        console.error('Erreur lors du rafraîchissement:', error);
        showNotification('Erreur lors du rafraîchissement des données', 'error');
    }
}

// =========================
// Fonctions utilitaires
// =========================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getStatusClass(status) {
    const statusMap = {
        'Actif': 'active',
        'En attente': 'pending',
        'Inactif': 'inactive'
    };
    return statusMap[status] || 'inactive';
}

function formatDate(dateString) {
    if (!dateString) return 'Non définie';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Erreur formatage date:', error);
        return 'Date invalide';
    }
}

// =========================
// Notifications
// =========================
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

// =========================
// Modals
// =========================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        
        if (modalId === 'addUserModal') {
            const modalTitle = modal.querySelector('.modal-header h3');
            if (modalTitle && !editingUserId) {
                modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Ajouter un Utilisateur';
            }
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
        
        const teacherFields = document.getElementById('teacherFields');
        const traineeFields = document.getElementById('traineeFields');
        if (teacherFields) teacherFields.style.display = 'none';
        if (traineeFields) traineeFields.style.display = 'none';
        
        editingUserId = null;
    }
}

// =========================
// Navigation
// =========================
function showDashboard() {
    window.location.href = 'admin.html';
}

function showUserManagement() {
    location.reload();
}

function showGroupManagement() {
    window.location.href = 'groupes_classes.html';
}

function showScheduleManagement() {
    window.location.href = 'emploi_tmp.html';
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