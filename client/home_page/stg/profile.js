console.log('Student Profile page version 2.1 - Fixed Photo Upload');

//---------- Configuration API ----------//
const API_BASE_URL = 'http://localhost:8080/api';
let authToken = localStorage.getItem('accessToken') || null;
let currentUserId = null;
let currentUserData = null;

//---------- Données du profil stagiaire ----------//
let studentProfile = {
    photo: null,
    lastName: '',
    firstName: '',
    birthDate: '',
    gender: '',
    email: '',
    phone: '',
    idNumber: '',
    formation: '',
    address: '',
    studyLevel: '',
    emergencyContact: '',
    emergencyName: '',
    relationship: '',
    specialty: '',
    additionalInfo: ''
};

let hasUnsavedChanges = false;
let originalData = {};
let profileExists = false; // Track if profile exists
let currentPhotoFile = null; // Track current photo file
let isPhotoRemoved = false; // Track if photo was removed

//---------- Fonctions API Utilitaires ----------//
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (authToken) {
        headers['x-access-token'] = authToken;
    }
    
    return headers;
}

function getAuthHeadersForFormData() {
    const headers = {};
    
    if (authToken) {
        headers['x-access-token'] = authToken;
    }
    
    // Ne pas définir Content-Type pour FormData - le navigateur le fait automatiquement
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
        throw error;
    }
}

//---------- Fonctions d'authentification et utilisateur ----------//
function getCurrentUserData() {
    try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUserData = JSON.parse(savedUser);
            currentUserId = currentUserData.id;
            return currentUserData;
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des données utilisateur:', error);
    }
    return null;
}

async function loadUserFromAPI() {
    try {
        if (!currentUserId) {
            throw new Error('ID utilisateur non trouvé');
        }
        
        const user = await apiRequest(`/users/${currentUserId}`);
        
        // Mettre à jour les données utilisateur
        currentUserData = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        return user;
    } catch (error) {
        console.error('Erreur lors du chargement de l\'utilisateur depuis l\'API:', error);
        return currentUserData;
    }
}

//---------- Fonctions API pour les profils ----------//
async function checkProfileExists(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/profil/${userId}`, {
            method: 'GET',
            headers: getAuthHeadersForFormData()
        });
        
        if (response.ok) {
            const profile = await response.json();
            profileExists = true;
            return profile;
        } else if (response.status === 404) {
            profileExists = false;
            return null;
        } else {
            const errorText = await response.text();
            console.warn('Erreur lors de la vérification du profil:', response.status, errorText);
            profileExists = false;
            return null;
        }
    } catch (error) {
        console.error('Erreur lors de la vérification du profil:', error);
        profileExists = false;
        return null;
    }
}

async function loadProfileFromAPI() {
    try {
        if (!currentUserId) {
            throw new Error('ID utilisateur non trouvé');
        }
        
        // Vérifier d'abord si le profil existe
        const profile = await checkProfileExists(currentUserId);
        
        console.log('Profil chargé depuis l\'API:', profile);
        
        if (profile) {
            // Traitement des informations supplémentaires
            let additionalInfo = {};
            if (profile.informations_supplementaires) {
                try {
                    additionalInfo = typeof profile.informations_supplementaires === 'string' 
                        ? JSON.parse(profile.informations_supplementaires) 
                        : profile.informations_supplementaires;
                } catch (e) {
                    console.log('Informations supplémentaires ne sont pas en JSON, utilisation comme texte');
                    additionalInfo = { additionalInfo: profile.informations_supplementaires };
                }
            }
            
            // Récupérer les données utilisateur pour compléter
            const userData = currentUserData || await loadUserFromAPI();
            
            // Mapper les données vers l'objet studentProfile
            studentProfile = {
                photo: profile.photo || null,
                lastName: additionalInfo.lastName || extractLastName(userData?.nom || ''),
                firstName: additionalInfo.firstName || extractFirstName(userData?.nom || ''),
                birthDate: additionalInfo.birthDate || '',
                gender: additionalInfo.gender || '',
                email: additionalInfo.email || userData?.email || '',
                phone: additionalInfo.phone || '',
                idNumber: profile.numero_carte_identite || '',
                formation: additionalInfo.formation || profile.specialite || '',
                address: additionalInfo.address || '',
                studyLevel: additionalInfo.studyLevel || '',
                emergencyContact: additionalInfo.emergencyContact || '',
                emergencyName: additionalInfo.emergencyName || '',
                relationship: additionalInfo.relationship || '',
                specialty: profile.specialite || additionalInfo.specialty || '',
                additionalInfo: additionalInfo.additionalInfo || ''
            };
        } else {
            // Aucun profil existant, initialiser avec les données utilisateur de base
            await initializeFromUserData();
        }
        
        console.log('Profil étudiant mappé:', studentProfile);
        return studentProfile;
        
    } catch (error) {
        console.error('Erreur lors du chargement du profil depuis l\'API:', error);
        
        // Fallback vers localStorage
        const savedProfile = localStorage.getItem('studentProfile');
        if (savedProfile) {
            try {
                studentProfile = JSON.parse(savedProfile);
                console.log('Profil chargé depuis localStorage:', studentProfile);
            } catch (parseError) {
                console.error('Erreur parsing localStorage:', parseError);
                initializeEmptyProfile();
            }
        } else {
            // Initialiser avec les données utilisateur de base
            await initializeFromUserData();
        }
        return studentProfile;
    }
}

async function initializeFromUserData() {
    const userData = currentUserData || await loadUserFromAPI();
    
    studentProfile = {
        photo: null,
        lastName: extractLastName(userData?.nom || ''),
        firstName: extractFirstName(userData?.nom || ''),
        birthDate: '',
        gender: '',
        email: userData?.email || '',
        phone: '',
        idNumber: '',
        formation: '',
        address: '',
        studyLevel: '',
        emergencyContact: '',
        emergencyName: '',
        relationship: '',
        specialty: '',
        additionalInfo: ''
    };
    
    console.log('Profil initialisé avec les données utilisateur:', studentProfile);
}

async function saveProfileToAPI() {
    try {
        if (!currentUserId) {
            throw new Error('ID utilisateur non trouvé');
        }

        // Vérifier d'abord l'état actuel du profil
        await checkProfileExists(currentUserId);

        const formData = new FormData();
        
        // Utiliser la formation comme spécialité principale
        formData.append('specialite', studentProfile.formation || '');
        formData.append('numero_carte_identite', studentProfile.idNumber || '');
        
        // Préparer les informations supplémentaires
        const additionalData = {
            lastName: studentProfile.lastName,
            firstName: studentProfile.firstName,
            birthDate: studentProfile.birthDate,
            gender: studentProfile.gender,
            email: studentProfile.email,
            phone: studentProfile.phone,
            formation: studentProfile.formation,
            address: studentProfile.address,
            studyLevel: studentProfile.studyLevel,
            emergencyContact: studentProfile.emergencyContact,
            emergencyName: studentProfile.emergencyName,
            relationship: studentProfile.relationship,
            additionalInfo: studentProfile.additionalInfo
        };
        
        formData.append('informations_supplementaires', JSON.stringify(additionalData));

        // Gérer l'upload de la photo
        if (currentPhotoFile) {
            // Nouveau fichier à uploader
            formData.append('photo', currentPhotoFile);
            console.log('Ajout d\'un nouveau fichier photo:', currentPhotoFile.name);
        } else if (isPhotoRemoved) {
            // Photo supprimée - envoyer une chaîne vide pour indiquer la suppression
            formData.append('removePhoto', 'true');
            console.log('Suppression de la photo demandée');
        }

        // Utiliser la méthode appropriée selon l'existence du profil
        const method = profileExists ? 'PUT' : 'POST';
        const url = `${API_BASE_URL}/profil/${currentUserId}`;
        
        console.log(`${method} request vers ${url}`);
        console.log('FormData contents:');
        for (let pair of formData.entries()) {
            if (pair[1] instanceof File) {
                console.log(pair[0], `File: ${pair[1].name}, Size: ${pair[1].size}, Type: ${pair[1].type}`);
            } else {
                console.log(pair[0], pair[1]);
            }
        }

        const response = await fetch(url, {
            method: method,
            headers: getAuthHeadersForFormData(), // Headers spéciaux pour FormData
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { message: errorText || `HTTP error! status: ${response.status}` };
            }
            
            console.error('Erreur détaillée de l\'API:', {
                status: response.status,
                statusText: response.statusText,
                errorData
            });
            
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Profil sauvegardé avec succès:', result);
        
        // Marquer le profil comme existant après la création/mise à jour
        profileExists = true;
        
        // Réinitialiser les flags
        currentPhotoFile = null;
        isPhotoRemoved = false;
        
        // Mettre à jour l'URL de la photo si elle a été uploadée
        if (result.profil && result.profil.photo) {
            studentProfile.photo = result.profil.photo;
        }
        
        // Sauvegarder aussi en localStorage comme backup
        localStorage.setItem('studentProfile', JSON.stringify(studentProfile));
        
        // Mettre à jour les données utilisateur si nécessaire
        if (currentUserData && (currentUserData.nom !== `${studentProfile.firstName} ${studentProfile.lastName}` || currentUserData.email !== studentProfile.email)) {
            await updateUserData();
        }
        
        return result;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du profil:', error);
        // Fallback vers localStorage en cas d'erreur
        localStorage.setItem('studentProfile', JSON.stringify(studentProfile));
        throw error;
    }
}

async function updateUserData() {
    try {
        if (!currentUserId || !currentUserData) return;
        
        const updatedUserData = {
            nom: `${studentProfile.firstName} ${studentProfile.lastName}`.trim(),
            email: studentProfile.email,
            roles: currentUserData.roles || ['stagiaire']
        };
        
        await apiRequest(`/users/${currentUserId}`, {
            method: 'PUT',
            body: JSON.stringify(updatedUserData)
        });
        
        // Mettre à jour les données locales
        currentUserData.nom = updatedUserData.nom;
        currentUserData.email = updatedUserData.email;
        localStorage.setItem('currentUser', JSON.stringify(currentUserData));
        
        console.log('Données utilisateur mises à jour');
    } catch (error) {
        console.error('Erreur lors de la mise à jour des données utilisateur:', error);
        // Ne pas faire échouer l'opération principale
    }
}

//---------- Fonctions de notification via API ----------//
async function loadNotificationsFromAPI() {
    try {
        if (!currentUserId) return [];
        
        const notifications = await apiRequest(`/notifications/${currentUserId}`);
        return notifications || [];
    } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error);
        return [];
    }
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
        console.error('Erreur mise à jour badge notification:', error);
        
        // Fallback vers localStorage
        const savedNotifications = localStorage.getItem('studentNotifications');
        let notifications = [];
        
        if (savedNotifications) {
            try {
                notifications = JSON.parse(savedNotifications);
            } catch (parseError) {
                notifications = [
                    { id: 1, read: false },
                    { id: 2, read: false },
                    { id: 3, read: true }
                ];
            }
        } else {
            notifications = [
                { id: 1, read: false },
                { id: 2, read: false },
                { id: 3, read: true }
            ];
        }
        
        const unreadCount = notifications.filter(n => !n.read).length;
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

//---------- Fonctions utilitaires ----------//
function extractFirstName(fullName) {
    if (!fullName) return '';
    return fullName.split(' ')[0] || '';
}

function extractLastName(fullName) {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    return parts.slice(1).join(' ') || '';
}

function initializeEmptyProfile() {
    studentProfile = {
        photo: null,
        lastName: '',
        firstName: '',
        birthDate: '',
        gender: '',
        email: '',
        phone: '',
        idNumber: '',
        formation: '',
        address: '',
        studyLevel: '',
        emergencyContact: '',
        emergencyName: '',
        relationship: '',
        specialty: '',
        additionalInfo: ''
    };
}

//---------- Initialization ----------//
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initialisation de la page profil étudiant...');
    
    try {
        // Récupérer les données utilisateur
        if (!getCurrentUserData()) {
            console.error('Impossible de récupérer les données utilisateur');
            alert('Erreur: Impossible de charger le profil. Veuillez vous reconnecter.');
            setTimeout(() => {
                window.location.href = '/client/login_page/index.html';
            }, 2000);
            return;
        }
        
        console.log('Utilisateur connecté:', currentUserData);
        
        // Vérifier le token d'authentification
        if (!authToken) {
            console.warn('Token d\'authentification manquant');
            alert('Token d\'authentification manquant. Veuillez vous reconnecter.');
            setTimeout(() => {
                window.location.href = '/client/login_page/index.html';
            }, 2000);
            return;
        }
        
        // Initialiser la page
        initProfilePage();
        
        // Configurer les événements
        setupEventListeners();
        
        // Charger les données (async)
        await loadProfileData();
        
        // Mettre à jour les informations utilisateur
        displayUserInfo();
        
        // Mettre à jour les notifications
        await updateNotificationBadge();
        
        console.log('Initialisation terminée avec succès');
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        alert('Une erreur est survenue lors du chargement du profil');
    }
});

function initProfilePage() {
    console.log('Initialisation de la page de profil stagiaire');
    
    const saveIndicator = document.getElementById('saveIndicator');
    if (saveIndicator) {
        saveIndicator.classList.remove('show');
    }
    
    const form = document.getElementById('profileForm');
    if (form) {
        form.reset();
    }
}

//---------- Data management ----------//
async function loadProfileData() {
    try {
        console.log('Chargement des données de profil...');
        
        // Charger le profil depuis l'API
        await loadProfileFromAPI();
        
        // Remplir le formulaire avec les données chargées
        populateForm();
        
        // Sauvegarder les données originales pour détecter les changements
        originalData = JSON.parse(JSON.stringify(studentProfile));
        
        console.log('Données de profil chargées avec succès');
        
    } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        
        // Fallback vers localStorage
        const savedProfile = localStorage.getItem('studentProfile');
        if (savedProfile) {
            try {
                studentProfile = JSON.parse(savedProfile);
                populateForm();
                originalData = JSON.parse(JSON.stringify(studentProfile));
                console.log('Données chargées depuis localStorage');
            } catch (parseError) {
                console.error('Erreur parsing localStorage:', parseError);
                initializeEmptyProfile();
                await initializeFromUserData();
                populateForm();
                originalData = JSON.parse(JSON.stringify(studentProfile));
            }
        } else {
            // Initialiser avec les données utilisateur
            await initializeFromUserData();
            populateForm();
            originalData = JSON.parse(JSON.stringify(studentProfile));
        }
    }
}

function populateForm() {
    console.log('Remplissage du formulaire avec:', studentProfile);
    
    const setFieldValue = (fieldId, value) => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
        } else {
            console.warn(`Champ non trouvé: ${fieldId}`);
        }
    };

    setFieldValue('lastName', studentProfile.lastName);
    setFieldValue('firstName', studentProfile.firstName);
    setFieldValue('birthDate', studentProfile.birthDate);
    setFieldValue('gender', studentProfile.gender);
    setFieldValue('email', studentProfile.email);
    setFieldValue('phone', studentProfile.phone);
    setFieldValue('idNumber', studentProfile.idNumber);
    setFieldValue('formation', studentProfile.formation);
    setFieldValue('address', studentProfile.address);
    setFieldValue('studyLevel', studentProfile.studyLevel);
    setFieldValue('emergencyContact', studentProfile.emergencyContact);
    setFieldValue('emergencyName', studentProfile.emergencyName);
    setFieldValue('relationship', studentProfile.relationship);
    
    // Gérer la photo de profil
    const profilePhotoElement = document.getElementById('profilePhoto');
    if (profilePhotoElement && studentProfile.photo) {
        profilePhotoElement.src = studentProfile.photo;
    }
    
    console.log('Formulaire rempli avec succès');
}

function showNotifications() {
    window.location.href = 'notification.html';
}

function setupEventListeners() {
    const formInputs = document.querySelectorAll('#profileForm input, #profileForm select, #profileForm textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', handleInputChange);
        input.addEventListener('change', handleInputChange);
    });

    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoUpload);
    }

    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?';
        }
    });
}

//---------- Form handling ----------//
function handleInputChange(event) {
    const fieldName = event.target.name;
    const fieldValue = event.target.value;

    // Mettre à jour immédiatement l'objet studentProfile
    if (studentProfile.hasOwnProperty(fieldName)) {
        studentProfile[fieldName] = fieldValue;
    }

    hasUnsavedChanges = true;
    validateField(event.target);

    console.log(`Champ modifié: ${fieldName} = ${fieldValue}`);
    
    // Sauvegarder en localStorage pour éviter la perte de données
    localStorage.setItem('studentProfile', JSON.stringify(studentProfile));
}

function validateField(field) {
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    
    const errorMessage = formGroup.querySelector('.error-message');
    const successMessage = formGroup.querySelector('.success-message');

    if (errorMessage) errorMessage.remove();
    if (successMessage) successMessage.remove();

    formGroup.classList.remove('valid', 'invalid');

    let isValid = true;
    let message = '';

    switch (field.name) {
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (field.value && !emailRegex.test(field.value)) {
                isValid = false;
                message = 'Format d\'email invalide';
            }
            break;

        case 'phone':
        case 'emergencyContact':
            const phoneRegex = /^[0-9+\-\s]{8,}$/;
            if (field.value && !phoneRegex.test(field.value.replace(/\s/g, ''))) {
                isValid = false;
                message = 'Format de numéro invalide';
            }
            break;

        case 'idNumber':
            if (field.value && field.value.length != 6) {
                isValid = false;
                message = 'La Matricule doit contenir 6 caractères';
            }
            break;

        case 'birthDate':
            if (field.value) {
                const birthDate = new Date(field.value);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                if (age < 16 || age > 60) {
                    isValid = false;
                    message = 'L\'âge doit être entre 16 et 60 ans';
                }
            }
            break;
    }

    if (field.value) {
        if (isValid && field.checkValidity()) {
            formGroup.classList.add('valid');
            if (message) {
                const successMsg = document.createElement('div');
                successMsg.className = 'success-message';
                successMsg.textContent = message;
                formGroup.appendChild(successMsg);
            }
        } else {
            formGroup.classList.add('invalid');
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = message || 'Ce champ est obligatoire';
            formGroup.appendChild(errorMsg);
        }
    }
}

function validateForm() {
    const form = document.getElementById('profileForm');
    if (!form) return { isValid: false, errors: ['Formulaire non trouvé'] };
    
    const formData = new FormData(form);
    const errors = [];

    const email = formData.get('email');
    if (email && !email.includes('@')) {
        errors.push('Format d\'email invalide');
    }

    const birthDate = formData.get('birthDate');
    if (birthDate) {
        const age = calculateAge(birthDate);
        if (age < 16 || age > 60) {
            errors.push('L\'âge doit être compris entre 16 et 60 ans');
        }
    }

    const phone = formData.get('phone');
    if (phone && !/^[0-9+\-\s]{8,}$/.test(phone.replace(/\s/g, ''))) {
        errors.push('Format de numéro de téléphone invalide');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

//---------- Photo management ----------//
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Validation du fichier
        if (!file.type.startsWith('image/')) {
            alert('Veuillez sélectionner un fichier image valide.');
            event.target.value = ''; // Reset input
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('La taille de l\'image ne doit pas dépasser 5MB.');
            event.target.value = ''; // Reset input
            return;
        }

        console.log('Fichier sélectionné:', {
            name: file.name,
            size: file.size,
            type: file.type
        });

        // Stocker le fichier pour l'upload
        currentPhotoFile = file;
        isPhotoRemoved = false; // Reset le flag de suppression
        
        const reader = new FileReader();
        reader.onload = function(e) {
            studentProfile.photo = e.target.result; // Data URL pour l'affichage
            const profilePhoto = document.getElementById('profilePhoto');
            if (profilePhoto) {
                profilePhoto.src = e.target.result;
            }
            hasUnsavedChanges = true;
            console.log('Photo de profil mise à jour dans l\'interface');
        };
        reader.onerror = function(e) {
            console.error('Erreur lors de la lecture du fichier:', e);
            alert('Erreur lors de la lecture du fichier image.');
        };
        reader.readAsDataURL(file);
    }
}

function triggerPhotoUpload() {
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.click();
    }
}

function removePhoto() {
    if (confirm('Êtes-vous sûr de vouloir supprimer votre photo de profil ?')) {
        studentProfile.photo = null;
        currentPhotoFile = null;
        isPhotoRemoved = true; // Marquer la photo comme supprimée
        
        const profilePhoto = document.getElementById('profilePhoto');
        if (profilePhoto) {
            profilePhoto.src = 'https://via.placeholder.com/150x150/667eea/ffffff?text=S';
        }
        
        // Reset l'input file
        const photoInput = document.getElementById('photoInput');
        if (photoInput) {
            photoInput.value = '';
        }
        
        hasUnsavedChanges = true;
        console.log('Photo de profil marquée pour suppression');
    }
}

//---------- Save and reset functions ----------//
function displayUserInfo() {
    let displayName = "Stagiaire";

    // Priorité aux données du profil
    if (studentProfile.firstName && studentProfile.lastName) {
        displayName = `${studentProfile.firstName} ${studentProfile.lastName}`;
    }
    // Fallback vers les données utilisateur
    else if (currentUserData && currentUserData.nom) {
        displayName = currentUserData.nom;
    }
    
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = displayName;
    }
    
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        if (studentProfile.photo) {
            userAvatar.innerHTML = `<img src="${studentProfile.photo}" alt="Photo de profil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            userAvatar.textContent = displayName.charAt(0).toUpperCase();
        }
    }
}

async function saveProfile() {
    const requiredFields = ['lastName', 'firstName', 'birthDate', 'email', 'phone', 'idNumber', 'formation', 'address'];
    let isValid = true;
    let firstInvalidField = null;

    console.log('Début de la sauvegarde du profil...');

    // Mettre à jour studentProfile avec les valeurs actuelles du formulaire
    updateProfileFromForm();

    // Validation des champs obligatoires
    requiredFields.forEach(fieldName => {
        const field = document.getElementById(fieldName);
        if (!field || !field.value.trim()) {
            if (field) validateField(field);
            isValid = false;
            if (!firstInvalidField && field) {
                firstInvalidField = field;
            }
        }
    });

    if (!isValid) {
        alert('Veuillez remplir tous les champs obligatoires.');
        if (firstInvalidField) {
            firstInvalidField.focus();
            firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    // Validation du formulaire
    const validation = validateForm();
    if (!validation.isValid) {
        alert('Erreurs de validation:\n' + validation.errors.join('\n'));
        return;
    }

    try {
        console.log('Sauvegarde via API...');
        console.log('État avant sauvegarde:', {
            profileExists,
            hasPhotoFile: currentPhotoFile ? 'Oui' : 'Non',
            isPhotoRemoved,
            currentPhoto: studentProfile.photo ? 'Oui' : 'Non'
        });
        
        // Sauvegarder via l'API
        const result = await saveProfileToAPI();
        
        // Mettre à jour les données de référence après sauvegarde réussie
        originalData = JSON.parse(JSON.stringify(studentProfile));
        hasUnsavedChanges = false;

        // Sauvegarder aussi en localStorage comme backup
        localStorage.setItem('studentProfile', JSON.stringify(studentProfile));

        showSaveIndicator();
        displayUserInfo();

        console.log('Profil stagiaire sauvegardé avec succès');
        
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        
        // En cas d'erreur API, sauvegarder quand même en localStorage
        localStorage.setItem('studentProfile', JSON.stringify(studentProfile));
        
        // Message d'erreur plus informatif
        let errorMessage = 'Une erreur est survenue lors de la sauvegarde sur le serveur.';
        if (error.message.includes('HTTP error! status: 401') || error.message.includes('401')) {
            errorMessage += ' Votre session a expiré. Veuillez vous reconnecter.';
            setTimeout(() => {
                window.location.href = '/client/login_page/index.html';
            }, 3000);
        } else if (error.message.includes('HTTP error! status: 403') || error.message.includes('403')) {
            errorMessage += ' Vous n\'avez pas les permissions nécessaires.';
        } else if (error.message.includes('HTTP error! status: 413') || error.message.includes('413')) {
            errorMessage += ' Le fichier image est trop volumineux.';
        } else if (error.message.includes('HTTP error! status: 415') || error.message.includes('415')) {
            errorMessage += ' Type de fichier non supporté.';
        } else {
            errorMessage += '\nDétail de l\'erreur: ' + error.message;
            errorMessage += '\nLes données ont été sauvegardées localement. Veuillez réessayer plus tard.';
        }
        
        alert(errorMessage);
    }
}

function updateProfileFromForm() {
    const getFieldValue = (fieldId) => {
        const field = document.getElementById(fieldId);
        return field ? field.value.trim() : '';
    };

    studentProfile.lastName = getFieldValue('lastName');
    studentProfile.firstName = getFieldValue('firstName');
    studentProfile.birthDate = getFieldValue('birthDate');
    studentProfile.gender = getFieldValue('gender');
    studentProfile.email = getFieldValue('email');
    studentProfile.phone = getFieldValue('phone');
    studentProfile.idNumber = getFieldValue('idNumber');
    studentProfile.formation = getFieldValue('formation');
    studentProfile.address = getFieldValue('address');
    studentProfile.studyLevel = getFieldValue('studyLevel');
    studentProfile.emergencyContact = getFieldValue('emergencyContact');
    studentProfile.emergencyName = getFieldValue('emergencyName');
    studentProfile.relationship = getFieldValue('relationship');
    
    // La spécialité suit la formation pour les stagiaires
    studentProfile.specialty = studentProfile.formation;

    console.log('Profil mis à jour depuis le formulaire:', studentProfile);
}

function showSaveIndicator() {
    const indicator = document.getElementById('saveIndicator');
    if (indicator) {
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 3000);
    }
}

function resetForm() {
    if (hasUnsavedChanges) {
        if (!confirm('Êtes-vous sûr de vouloir annuler toutes les modifications ?')) {
            return;
        }
    }

    // Restaurer depuis originalData
    studentProfile = JSON.parse(JSON.stringify(originalData));
    
    // Réinitialiser les flags de photo
    currentPhotoFile = null;
    isPhotoRemoved = false;
    
    // Réinitialiser l'input file
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.value = '';
    }
    
    // Remplir le formulaire
    populateForm();
    
    // Réinitialiser les indicateurs
    hasUnsavedChanges = false;

    // Nettoyer les messages d'erreur/succès
    document.querySelectorAll('.error-message, .success-message').forEach(msg => msg.remove());
    document.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('valid', 'invalid');
    });

    console.log('Formulaire réinitialisé');
}

//---------- Navigation and logout ----------//
function goBack() {
    if (hasUnsavedChanges) {
        if (confirm('Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?')) {
            window.history.back();
        }
    } else {
        window.history.back();
    }
}

function showProfile() {
    console.log('Affichage du profil');
}

function logout() {
    if (hasUnsavedChanges) {
        if (!confirm('Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir vous déconnecter ?')) {
            return;
        }
    }
    
    // Nettoyer les données locales
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    
    // Rediriger vers la page de connexion
    window.location.href = '/client/login_page/index.html';
}

//---------- Utility functions ----------//
function formatPhoneNumber(phone) {
    if (!phone) return '';
    return phone.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
}

function calculateAge(birthDate) {
    if (!birthDate) return 0;
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

//---------- Fonctions d'état et de debug ----------//
function getProfileStatus() {
    return {
        currentUserId,
        currentUserData,
        studentProfile,
        hasUnsavedChanges,
        profileExists,
        authToken: authToken ? 'Present' : 'Missing',
        hasPhotoFile: currentPhotoFile ? 'Yes' : 'No',
        isPhotoRemoved,
        photoFileName: currentPhotoFile ? currentPhotoFile.name : 'None'
    };
}

// Exposer certaines fonctions pour le debug
window.debugProfile = {
    getStatus: getProfileStatus,
    loadProfile: loadProfileFromAPI,
    saveProfile: saveProfileToAPI,
    refreshData: loadProfileData,
    checkProfile: checkProfileExists
};