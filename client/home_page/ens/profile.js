console.log('Teacher Profile page version 2.1 - Enhanced Photo Upload & API Integration');

//---------- Configuration API ----------//
const API_BASE_URL = 'http://localhost:8080/api';
let authToken = localStorage.getItem('accessToken') || null;
let currentUserId = null;
let currentUserData = null;

//---------- Données du profil enseignant ----------//
let teacherProfile = {
    photo: null,
    lastName: '',
    firstName: '',
    birthDate: '',
    gender: '',
    email: '',
    phone: '',
    idNumber: '',
    specialty: '',
    address: '',
    experience: '',
    qualification: '',
    documents: {
        idCard: null,
        cv: null,
        diploma: null
    }
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
            
            // Mapper les données vers l'objet teacherProfile
            teacherProfile = {
                photo: profile.photo || null,
                lastName: additionalInfo.lastName || extractLastName(userData?.nom || ''),
                firstName: additionalInfo.firstName || extractFirstName(userData?.nom || ''),
                birthDate: additionalInfo.birthDate || '',
                gender: additionalInfo.gender || '',
                email: additionalInfo.email || userData?.email || '',
                phone: additionalInfo.phone || '',
                idNumber: profile.numero_carte_identite || '',
                specialty: profile.specialite || additionalInfo.specialty || '',
                address: additionalInfo.address || '',
                experience: additionalInfo.experience || '',
                qualification: additionalInfo.qualification || '',
                documents: additionalInfo.documents || {
                    idCard: null,
                    cv: null,
                    diploma: null
                }
            };
        } else {
            // Aucun profil existant, initialiser avec les données utilisateur de base
            await initializeFromUserData();
        }
        
        console.log('Profil enseignant mappé:', teacherProfile);
        return teacherProfile;
        
    } catch (error) {
        console.error('Erreur lors du chargement du profil depuis l\'API:', error);
        
        // Fallback vers localStorage
        const savedProfile = localStorage.getItem('teacherProfile');
        if (savedProfile) {
            try {
                teacherProfile = JSON.parse(savedProfile);
                console.log('Profil chargé depuis localStorage:', teacherProfile);
            } catch (parseError) {
                console.error('Erreur parsing localStorage:', parseError);
                initializeEmptyProfile();
            }
        } else {
            // Initialiser avec les données utilisateur de base
            await initializeFromUserData();
        }
        return teacherProfile;
    }
}

async function initializeFromUserData() {
    const userData = currentUserData || await loadUserFromAPI();
    
    teacherProfile = {
        photo: null,
        lastName: extractLastName(userData?.nom || ''),
        firstName: extractFirstName(userData?.nom || ''),
        birthDate: '',
        gender: '',
        email: userData?.email || '',
        phone: '',
        idNumber: '',
        specialty: '',
        address: '',
        experience: '',
        qualification: '',
        documents: {
            idCard: null,
            cv: null,
            diploma: null
        }
    };
    
    console.log('Profil enseignant initialisé avec les données utilisateur:', teacherProfile);
}

async function saveProfileToAPI() {
    try {
        if (!currentUserId) {
            throw new Error('ID utilisateur non trouvé');
        }

        // Vérifier d'abord l'état actuel du profil
        await checkProfileExists(currentUserId);

        const formData = new FormData();
        
        // Utiliser la spécialité comme spécialité principale
        formData.append('specialite', teacherProfile.specialty || '');
        formData.append('numero_carte_identite', teacherProfile.idNumber || '');
        
        // Préparer les informations supplémentaires
        const additionalData = {
            lastName: teacherProfile.lastName,
            firstName: teacherProfile.firstName,
            birthDate: teacherProfile.birthDate,
            gender: teacherProfile.gender,
            email: teacherProfile.email,
            phone: teacherProfile.phone,
            specialty: teacherProfile.specialty,
            address: teacherProfile.address,
            experience: teacherProfile.experience,
            qualification: teacherProfile.qualification,
            documents: teacherProfile.documents
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
            teacherProfile.photo = result.profil.photo;
        }
        
        // Sauvegarder aussi en localStorage comme backup
        localStorage.setItem('teacherProfile', JSON.stringify(teacherProfile));
        
        // Mettre à jour les données utilisateur si nécessaire
        if (currentUserData && (currentUserData.nom !== `${teacherProfile.firstName} ${teacherProfile.lastName}` || currentUserData.email !== teacherProfile.email)) {
            await updateUserData();
        }
        
        return result;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du profil:', error);
        // Fallback vers localStorage en cas d'erreur
        localStorage.setItem('teacherProfile', JSON.stringify(teacherProfile));
        throw error;
    }
}

async function updateUserData() {
    try {
        if (!currentUserId || !currentUserData) return;
        
        const updatedUserData = {
            nom: `${teacherProfile.firstName} ${teacherProfile.lastName}`.trim(),
            email: teacherProfile.email,
            roles: currentUserData.roles || ['enseignant']
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
        const savedNotifications = localStorage.getItem('teacherNotifications');
        let notifications = [];
        
        if (savedNotifications) {
            try {
                notifications = JSON.parse(savedNotifications);
            } catch (parseError) {
                notifications = [
                    { id: 1, read: false },
                    { id: 2, read: false },
                    { id: 3, read: true },
                    { id: 4, read: false },
                    { id: 5, read: true }
                ];
            }
        } else {
            notifications = [
                { id: 1, read: false },
                { id: 2, read: false },
                { id: 3, read: true },
                { id: 4, read: false },
                { id: 5, read: true }
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
    teacherProfile = {
        photo: null,
        lastName: '',
        firstName: '',
        birthDate: '',
        gender: '',
        email: '',
        phone: '',
        idNumber: '',
        specialty: '',
        address: '',
        experience: '',
        qualification: '',
        documents: {
            idCard: null,
            cv: null,
            diploma: null
        }
    };
}

//---------- Initialization ----------//
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initialisation de la page profil enseignant...');
    
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
    console.log('Initialisation de la page de profil enseignant');
    
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
        console.log('Chargement des données de profil enseignant...');
        
        // Charger le profil depuis l'API
        await loadProfileFromAPI();
        
        // Remplir le formulaire avec les données chargées
        populateForm();
        
        // Sauvegarder les données originales pour détecter les changements
        originalData = JSON.parse(JSON.stringify(teacherProfile));
        
        console.log('Données de profil enseignant chargées avec succès');
        
    } catch (error) {
        console.error('Erreur lors du chargement du profil enseignant:', error);
        
        // Fallback vers localStorage
        const savedProfile = localStorage.getItem('teacherProfile');
        if (savedProfile) {
            try {
                teacherProfile = JSON.parse(savedProfile);
                populateForm();
                originalData = JSON.parse(JSON.stringify(teacherProfile));
                console.log('Données chargées depuis localStorage');
            } catch (parseError) {
                console.error('Erreur parsing localStorage:', parseError);
                initializeEmptyProfile();
                await initializeFromUserData();
                populateForm();
                originalData = JSON.parse(JSON.stringify(teacherProfile));
            }
        } else {
            // Initialiser avec les données utilisateur
            await initializeFromUserData();
            populateForm();
            originalData = JSON.parse(JSON.stringify(teacherProfile));
        }
    }
}

function populateForm() {
    console.log('Remplissage du formulaire enseignant avec:', teacherProfile);
    
    const setFieldValue = (fieldId, value) => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
        } else {
            console.warn(`Champ non trouvé: ${fieldId}`);
        }
    };

    setFieldValue('lastName', teacherProfile.lastName);
    setFieldValue('firstName', teacherProfile.firstName);
    setFieldValue('birthDate', teacherProfile.birthDate);
    setFieldValue('gender', teacherProfile.gender);
    setFieldValue('email', teacherProfile.email);
    setFieldValue('phone', teacherProfile.phone);
    setFieldValue('idNumber', teacherProfile.idNumber);
    setFieldValue('specialty', teacherProfile.specialty);
    setFieldValue('address', teacherProfile.address);
    setFieldValue('experience', teacherProfile.experience);
    setFieldValue('qualification', teacherProfile.qualification);
    
    // Gérer la photo de profil
    const profilePhotoElement = document.getElementById('profilePhoto');
    if (profilePhotoElement && teacherProfile.photo) {
        profilePhotoElement.src = teacherProfile.photo;
    }
    
    // Mettre à jour le statut des documents
    updateDocumentStatus();
    
    console.log('Formulaire enseignant rempli avec succès');
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

    const idCardInput = document.getElementById('idCardInput');
    if (idCardInput) {
        idCardInput.addEventListener('change', (e) => handleDocumentUpload(e, 'idCard'));
    }

    const cvInput = document.getElementById('cvInput');
    if (cvInput) {
        cvInput.addEventListener('change', (e) => handleDocumentUpload(e, 'cv'));
    }

    const diplomaInput = document.getElementById('diplomaInput');
    if (diplomaInput) {
        diplomaInput.addEventListener('change', (e) => handleDocumentUpload(e, 'diploma'));
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

    // Mettre à jour immédiatement l'objet teacherProfile
    if (teacherProfile.hasOwnProperty(fieldName)) {
        teacherProfile[fieldName] = fieldValue;
    }

    hasUnsavedChanges = true;
    validateField(event.target);

    console.log(`Champ modifié: ${fieldName} = ${fieldValue}`);
    
    // Sauvegarder en localStorage pour éviter la perte de données
    localStorage.setItem('teacherProfile', JSON.stringify(teacherProfile));
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
            const phoneRegex = /^[0-9+\-\s]{8,}$/;
            if (field.value && !phoneRegex.test(field.value.replace(/\s/g, ''))) {
                isValid = false;
                message = 'Format de numéro invalide';
            }
            break;

        case 'idNumber':
            if (field.value && field.value.length != 6) {
                isValid = false;
                message = 'Le numéro doit contenir 6 caractères';
            }
            break;

        case 'birthDate':
            if (field.value) {
                const birthDate = new Date(field.value);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                if (age < 22 || age > 70) {
                    isValid = false;
                    message = 'L\'âge doit être entre 22 et 70 ans';
                }
            }
            break;

        case 'experience':
            if (field.value && (isNaN(field.value) || field.value < 0 || field.value > 50)) {
                isValid = false;
                message = 'L\'expérience doit être entre 0 et 50 ans';
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
        if (age < 22 || age > 70) {
            errors.push('L\'âge doit être compris entre 22 et 70 ans');
        }
    }
    
    const phone = formData.get('phone');
    if (phone && !/^[0-9+\-\s]{8,}$/.test(phone.replace(/\s/g, ''))) {
        errors.push('Format de numéro de téléphone invalide');
    }

    const experience = formData.get('experience');
    if (experience && (isNaN(experience) || experience < 0 || experience > 50)) {
        errors.push('L\'expérience doit être entre 0 et 50 ans');
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
            teacherProfile.photo = e.target.result; // Data URL pour l'affichage
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
        teacherProfile.photo = null;
        currentPhotoFile = null;
        isPhotoRemoved = true; // Marquer la photo comme supprimée
        
        const profilePhoto = document.getElementById('profilePhoto');
        if (profilePhoto) {
            profilePhoto.src = 'https://via.placeholder.com/150x150/667eea/ffffff?text=E';
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

//---------- Document management ----------//
function handleDocumentUpload(event, documentType) {
    const files = event.target.files;
    if (files.length > 0) {
        const fileNames = Array.from(files).map(file => file.name);
        
        const allowedTypes = {
            idCard: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
            cv: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            diploma: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
        };

        const invalidFiles = Array.from(files).filter(file => 
            !allowedTypes[documentType].includes(file.type)
        );

        if (invalidFiles.length > 0) {
            alert(`Types de fichiers non autorisés: ${invalidFiles.map(f => f.name).join(', ')}`);
            return;
        }
        
        const oversizedFiles = Array.from(files).filter(file => file.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            alert(`Fichiers trop volumineux (max 10MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
            return;
        }

        teacherProfile.documents[documentType] = {
            files: fileNames,
            uploadDate: new Date().toLocaleDateString('fr-FR')
        };

        updateDocumentStatus();
        hasUnsavedChanges = true;
        console.log(`Documents enseignant ${documentType} mis à jour:`, fileNames);
    }
}

function updateDocumentStatus() {
    const documentTypes = ['idCard', 'cv', 'diploma'];
    
    documentTypes.forEach(type => {
        const statusElement = document.getElementById(`${type}Status`);
        const removeButton = document.getElementById(`remove${type.charAt(0).toUpperCase() + type.slice(1)}`);
        
        if (!statusElement) return;
        
        if (teacherProfile.documents[type]) {
            const doc = teacherProfile.documents[type];
            const fileCount = doc.files.length;
            statusElement.textContent = `${fileCount} fichier${fileCount > 1 ? 's' : ''} ajouté${fileCount > 1 ? 's' : ''} le ${doc.uploadDate}`;
            statusElement.style.color = '#4caf50';
            if (removeButton) removeButton.style.display = 'flex';
        } else {
            statusElement.textContent = 'Aucun document';
            statusElement.style.color = '#666';
            if (removeButton) removeButton.style.display = 'none';
        }
    });
}

function removeDocument(documentType) {
    const documentNames = {
        idCard: 'Carte d\'Identité',
        cv: 'CV',
        diploma: 'Diplômes'
    };

    if (confirm(`Êtes-vous sûr de vouloir supprimer le document "${documentNames[documentType]}" ?`)) {
        teacherProfile.documents[documentType] = null;
        updateDocumentStatus();
        hasUnsavedChanges = true;
        console.log(`Document enseignant ${documentType} supprimé`);
    }
}

//---------- Save and reset functions ----------//
function displayUserInfo() {
    let displayName = "Enseignant";

    // Priorité aux données du profil
    if (teacherProfile.firstName && teacherProfile.lastName) {
        displayName = `${teacherProfile.firstName} ${teacherProfile.lastName}`;
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
        if (teacherProfile.photo) {
            userAvatar.innerHTML = `<img src="${teacherProfile.photo}" alt="Photo de profil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            userAvatar.textContent = displayName.charAt(0).toUpperCase();
        }
    }
}

async function saveProfile() {
    const requiredFields = ['lastName', 'firstName', 'birthDate', 'email', 'phone', 'idNumber', 'specialty', 'address'];
    let isValid = true;
    let firstInvalidField = null;

    console.log('Début de la sauvegarde du profil enseignant...');

    // Mettre à jour teacherProfile avec les valeurs actuelles du formulaire
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
            currentPhoto: teacherProfile.photo ? 'Oui' : 'Non'
        });
        
        // Sauvegarder via l'API
        const result = await saveProfileToAPI();
        
        // Mettre à jour les données de référence après sauvegarde réussie
        originalData = JSON.parse(JSON.stringify(teacherProfile));
        hasUnsavedChanges = false;

        // Sauvegarder aussi en localStorage comme backup
        localStorage.setItem('teacherProfile', JSON.stringify(teacherProfile));

        showSaveIndicator();
        displayUserInfo();

        console.log('Profil enseignant sauvegardé avec succès');
        
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        
        // En cas d'erreur API, sauvegarder quand même en localStorage
        localStorage.setItem('teacherProfile', JSON.stringify(teacherProfile));
        
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

    teacherProfile.lastName = getFieldValue('lastName');
    teacherProfile.firstName = getFieldValue('firstName');
    teacherProfile.birthDate = getFieldValue('birthDate');
    teacherProfile.gender = getFieldValue('gender');
    teacherProfile.email = getFieldValue('email');
    teacherProfile.phone = getFieldValue('phone');
    teacherProfile.idNumber = getFieldValue('idNumber');
    teacherProfile.specialty = getFieldValue('specialty');
    teacherProfile.address = getFieldValue('address');
    teacherProfile.experience = getFieldValue('experience');
    teacherProfile.qualification = getFieldValue('qualification');
}

function resetForm() {
    if (hasUnsavedChanges) {
        if (!confirm('Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir annuler ?')) {
            return;
        }
    }

    // Restaurer les données originales
    teacherProfile = JSON.parse(JSON.stringify(originalData));
    populateForm();
    hasUnsavedChanges = false;
    
    // Réinitialiser les flags de photo
    currentPhotoFile = null;
    isPhotoRemoved = false;
    
    console.log('Formulaire enseignant réinitialisé');
}

function showSaveIndicator() {
    const saveIndicator = document.getElementById('saveIndicator');
    if (saveIndicator) {
        saveIndicator.classList.add('show');
        setTimeout(() => {
            saveIndicator.classList.remove('show');
        }, 3000);
    }
}

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

//---------- Navigation ----------//
function navigateTo(page) {
    if (hasUnsavedChanges) {
        if (!confirm('Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter cette page ?')) {
            return;
        }
    }
    
    window.location.href = page;
}

function goBack() {
    if (hasUnsavedChanges) {
        if (confirm('Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?')) {
            window.history.back();
        }
    } else {
        window.history.back();
    }
}

function logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('teacherProfile');
        window.location.href = '/client/login_page/index.html';
    }
}

//---------- Export pour utilisation externe ----------//
window.teacherProfileManager = {
    saveProfile,
    resetForm,
    triggerPhotoUpload,
    removePhoto,
    removeDocument,
    navigateTo,
    logout,
    showNotifications
};