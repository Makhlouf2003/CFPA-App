// ---------- CONFIG API ----------
const API_BASE_URL = 'http://localhost:8080/api';
let authToken = localStorage.getItem('accessToken') || null;

// ---------- GLOBALS ----------
let modulesData = {};

let moduleIdCounter = 1;
let courseIdCounter = 1;
let fileIdCounter = 1;

let currentModuleId = null;
let editingCourse = null;

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
        // some endpoints return empty body
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (err) {
        console.error('apiRequest error', err);
        throw err;
    }
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function() {
    // initializePage is async
    initializePage().catch(err => console.error('Initialization failed', err));
});

async function initializePage() {
    console.log('Initialisation de la page (API-enabled)');
    loadSavedData();             // garde compatibilité locale si présent
    displayUserInfo();
    updateNotificationBadge();
    try {
        await loadAssignedModules(); // charge modules assignés pour l'utilisateur courant
    } catch (err) {
        console.warn('Impossible de charger les modules assignés:', err.message);
    }
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

// ---------- USER INFO ----------
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

    // Créer modulesData pour chaque module unique
    const seen = new Set();
    for (const row of associations) {
        const moduleId = row.moduleId ?? row.id ?? row.module_id ?? row.moduleId;
        const moduleNom = row.moduleNom ?? row.moduleNom ?? row.nom ?? row.moduleName;
        if (!moduleId) continue;
        const moduleKey = `module-${moduleId}`;
        if (seen.has(moduleKey)) continue;
        seen.add(moduleKey);
        // si déjà présent dans modulesData (local saved), on conserve ; sinon on crée
        if (!modulesData[moduleKey]) {
            modulesData[moduleKey] = {
                id: moduleKey,
                name: moduleNom || `Module ${moduleId}`,
                description: '',
                courses: {}
            };
            createModuleElement(modulesData[moduleKey]);
        }
    }

    // Pour chaque module assigné, charger les cours existants depuis le serveur
    for (const moduleKey of Array.from(seen)) {
        const numericId = parseInt(moduleKey.split('-')[1], 10);
        try {
            await loadCoursesForModule(numericId);
        } catch (err) {
            console.warn(`Chargement cours pour module ${moduleKey} échoué:`, err.message);
        }
    }
}

// ---------- LOAD COURSES FOR A MODULE ----------
async function loadCoursesForModule(moduleId) {
    // moduleId: number
    const moduleKey = `module-${moduleId}`;
    if (!modulesData[moduleKey]) {
        console.warn('Module non présent localement:', moduleKey);
        return;
    }
    try {
        const courses = await apiRequest(`/cours/module/${moduleId}`, { method: 'GET' });
        if (!courses || !Array.isArray(courses)) {
            return;
        }
        // vider l'ancien contenu serveur (on garde les cours locaux non envoyés)
        // donc on n'écrase que les clés db-*
        Object.keys(modulesData[moduleKey].courses).forEach(k => {
            if (k.startsWith('db-')) delete modulesData[moduleKey].courses[k];
        });

        for (const row of courses) {
            const coursId = row.id;
            const courseKey = `db-${coursId}`;
            const fileId = `dbfile-${coursId}`;
            modulesData[moduleKey].courses[courseKey] = {
                id: courseKey,
                name: row.titre || `Cours ${coursId}`,
                description: row.description || '',
                serverId: coursId,
                files: (row.files && row.files.length > 0) 
                ? row.files.map(f => ({
                    id: `dbfile-${f.id}`,
                    name: f.name,
                    url: f.url,
                    type: f.type
                    }))
                : []
            };
        }

        updateModuleElement(moduleKey);
        refreshCoursesForModule(moduleKey);
    } catch (err) {
        console.error('loadCoursesForModule error', err);
        throw err;
    }
}

// ---------- CREATE / RENDER MODULE UI ----------
// (on garde votre code existant, mais attention : il attend module.id sous la forme 'module-<n>')
function createModuleElement(module) {
    const container = document.getElementById('modulesContainer');
    if (!container) return;

    // éviter duplication
    if (document.querySelector(`[data-module-id="${module.id}"]`)) return;

    const moduleElement = document.createElement('div');
    moduleElement.className = 'module-item';
    moduleElement.setAttribute('data-module-id', module.id);

    moduleElement.innerHTML = `
        <div class="module-header">
            <div class="module-info">
                <h3><i class="fas fa-layer-group"></i> ${module.name}</h3>
            </div>
            <div class="module-stats">
                <div class="stat-item">
                    <i class="fas fa-book"></i>
                    <span>${Object.keys(module.courses).length} cours</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-file"></i>
                    <span>${getTotalFilesInModule(module.id)} fichiers</span>
                </div>
            </div>
            <div class="module-actions">
                <button class="module-toggle" onclick="event.stopPropagation(); toggleModule('${module.id}')">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
        </div>
        <div class="module-content" id="module-content-${module.id}">
            <div class="courses-section">
                <div class="section-header">
                    <h4><i class="fas fa-graduation-cap"></i> Cours du Module</h4>
                    <button class="add-course-btn" onclick="openCourseModal('${module.id}')">
                        <i class="fas fa-plus"></i> Ajouter Cours
                    </button>
                </div>
                <div class="courses-list" id="courses-list-${module.id}">
                    ${renderCoursesForModule(module.id)}
                </div>
            </div>
        </div>
    `;

    container.appendChild(moduleElement);
}

// ---------- COURSES UI (conserve la plupart de votre logique existante) ----------
function renderCoursesForModule(moduleId) {
    const module = modulesData[moduleId];
    if (!module) return '<p>Module introuvable</p>';
    const courses = Object.values(module.courses || {});
    if (courses.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h3>Aucun cours</h3>
                <p>Commencez par ajouter un cours à ce module</p>
            </div>
        `;
    }
    return courses.map(course => createCourseHTML(moduleId, course)).join('');
}

function createCourseHTML(moduleId, course) {
    const fileCount = course.files ? course.files.length : 0;

    return `
        <div class="course-item" data-course-id="${course.id}">
            <button class="delete-x-btn" onclick="event.stopPropagation(); deleteCourse('${moduleId}', '${course.id}')" title="Supprimer le cours">
                ×
            </button>
            <div class="course-header">
                <h5><i class="fas fa-book"></i> ${escapeHtml(course.name)}</h5>
                <p>${escapeHtml(course.description || 'Aucune description')}</p>
                <div class="course-meta">
                    <div class="file-count">
                        <i class="fas fa-file"></i>
                        <span>${fileCount} fichier${fileCount > 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>
            <div class="upload-section">
                <div class="upload-area" onclick="event.stopPropagation(); triggerFileUpload('${moduleId}', '${course.id}')" 
                     ondragover="event.preventDefault(); event.stopPropagation(); handleDragOver(event)"
                     ondragleave="event.preventDefault(); event.stopPropagation(); handleDragLeave(event)"
                     ondrop="event.preventDefault(); event.stopPropagation(); handleFileDrop(event, '${moduleId}', '${course.id}')">
                    <div class="upload-icon">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <h6>Déposez vos fichiers ici</h6>
                    <p>ou cliquez pour sélectionner des fichiers</p>
                </div>
                <input type="file" id="fileInput-${course.id}" multiple style="display: none;" 
                       onchange="handleFileSelect(event, '${moduleId}', '${course.id}')">
            </div>
            <div class="files-list">
                ${renderFilesForCourse(course)}
            </div>
        </div>
    `;
}

function renderFilesForCourse(course) {
    if (!course.files || course.files.length === 0) {
        return '<p style="text-align: center; color: #666; font-style: italic;">Aucun fichier déposé</p>';
    }

    return course.files.map(file => `
        <div class="file-item">
            <div class="file-icon ${getFileIconClass(file.type || '')}">
                <i class="fas ${getFileIcon(file.type || '')}"></i>
            </div>
            <div class="file-info">
                <span class="file-name">${escapeHtml(file.name)}</span>
                ${file.size ? `<span class="file-size">${formatFileSize(file.size)}</span>` : ''}
            </div>
            <div class="file-actions">
                <button class="file-action-btn delete-file-btn" onclick="event.stopPropagation(); deleteFile('${course.id}', '${file.id}')" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// ---------- FILE DRAG & SELECT ----------
function triggerFileUpload(moduleId, courseId) {
    const fileInput = document.getElementById(`fileInput-${courseId}`);
    if (fileInput) fileInput.click();
}

function handleFileSelect(event, moduleId, courseId) {
    const files = Array.from(event.target.files);
    uploadFiles(files, moduleId, courseId);
    event.target.value = '';
}

function handleDragOver(event) {
    event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('dragover');
}

function handleFileDrop(event, moduleId, courseId) {
    event.currentTarget.classList.remove('dragover');
    const files = Array.from(event.dataTransfer.files);
    uploadFiles(files, moduleId, courseId);
}

// ---------- UPLOAD FILES TO SERVER ----------
async function uploadFiles(files, moduleKeyOrId, courseId) {
    const moduleKey = typeof moduleKeyOrId === 'string' && moduleKeyOrId.startsWith('module-') 
        ? moduleKeyOrId 
        : `module-${moduleKeyOrId}`;

    if (!modulesData[moduleKey]) {
        showNotification("Module introuvable localement", 'error');
        return;
    }

    const course = modulesData[moduleKey].courses[courseId];
    const rawFiles = files.map(f => f);

    for (const file of rawFiles) {
        const formData = new FormData();
        formData.append('fichier', file);

        const numericModuleId = parseInt(moduleKey.split('-')[1], 10);
        formData.append('moduleId', String(numericModuleId));
        const titre = (course && course.name) ? course.name : file.name;
        formData.append('titre', titre);
        formData.append('description', (course && course.description) ? course.description : '');

        try {
            let res;

            if (course && course.serverId) {
                // 🔹 Ajouter le fichier dans un cours existant
                res = await apiRequest(`/cours/${course.serverId}/files`, { 
                    method: 'POST', 
                    body: formData, 
                    isForm: true 
                });
            } else {
                // 🔹 Créer un nouveau cours (logique actuelle)
                res = await apiRequest('/cours', { 
                    method: 'POST', 
                    body: formData, 
                    isForm: true 
                });
            }

            if (res && res.cours) {
                const cours = res.cours;
                const serverCourseKey = `db-${cours.id}`;

                // si le cours local existe (placeholder), on le remplace
                if (course && courseId && courseId.startsWith('course-')) {
                    try { delete modulesData[moduleKey].courses[courseId]; } catch (e) {}
                }

                // 🔹 MAJ des fichiers du cours existant
                if (!modulesData[moduleKey].courses[serverCourseKey]) {
                    modulesData[moduleKey].courses[serverCourseKey] = {
                        id: serverCourseKey,
                        name: cours.titre || titre,
                        description: cours.description || '',
                        serverId: cours.id,
                        files: []
                    };
                }

                modulesData[moduleKey].courses[serverCourseKey].files.push({
                    id: `dbfile-${Date.now()}`, // identifiant unique
                    name: file.name,
                    url: res.file?.url || cours.fichier_url,
                    type: res.file?.type || cours.type_fichier || file.type
                });

                refreshCoursesForModule(moduleKey);
                updateModuleElement(moduleKey);
                showNotification(`Fichier "${file.name}" ajouté au cours (id ${cours.id})`, 'success');
            } else {
                showNotification(`Upload réussi mais réponse inattendue du serveur pour ${file.name}`, 'warning');
            }
        } catch (err) {
            console.error('Upload failed for', file.name, err);
            showNotification(`Erreur upload ${file.name}: ${err.message}`, 'error');
        }
    }
}

// ---------- DELETE COURSE (local ou serveur) ----------
async function deleteCourse(moduleId, courseId) {
    const moduleKey = moduleId;
    if (!modulesData[moduleKey] || !modulesData[moduleKey].courses[courseId]) {
        showNotification('Cours introuvable', 'error');
        return;
    }
    const course = modulesData[moduleKey].courses[courseId];

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le cours "${course.name}" ?`)) return;

    // Si c'est un cours serveur (db-...), appeler l'API DELETE
    if (courseId.startsWith('db-') && course.serverId) {
        try {
            await apiRequest(`/cours/${course.serverId}`, { method: 'DELETE' });
            delete modulesData[moduleKey].courses[courseId];
            refreshCoursesForModule(moduleKey);
            updateModuleElement(moduleKey);
            showNotification('Cours supprimé du serveur avec succès', 'success');
            return;
        } catch (err) {
            console.error('Erreur suppression serveur', err);
            showNotification(`Erreur suppression serveur: ${err.message}`, 'error');
            return;
        }
    }

    // sinon suppression locale
    delete modulesData[moduleKey].courses[courseId];
    refreshCoursesForModule(moduleKey);
    updateModuleElement(moduleKey);
    showNotification(`Cours "${course.name}" supprimé localement`, 'success');
}

// ---------- DELETE FILE (si c'est un fichier serveur, on supprime le cours via endpoint DELETE) ----------
async function findFile(fileId) {
    for (const moduleKey in modulesData) {
        for (const courseKey in modulesData[moduleKey].courses) {
            const course = modulesData[moduleKey].courses[courseKey];
            if (!course.files) continue;
            const f = course.files.find(x => x.id === fileId);
            if (f) return { moduleKey, courseKey, file: f, course };
        }
    }
    return null;
}

async function deleteFile(courseId, fileId) {
    const moduleKey = Object.keys(modulesData).find((key) => 
        modulesData[key].courses[courseId]
    );

    if (!moduleKey) {
        showNotification("Cours introuvable", "error");
        return;
    }

    const course = modulesData[moduleKey].courses[courseId];
    if (!course) {
        showNotification("Cours introuvable", "error");
        return;
    }

    // 🔹 Cas 1 : fichier sauvegardé en base (id commence par "dbfile-")
    if (fileId.startsWith("dbfile-")) {
        const fileNumericId = parseInt(fileId.split("-")[1], 10);
        try {
            await apiRequest(`/cours/files/${fileNumericId}`, { method: "DELETE" });

            // retirer le fichier du tableau local
            const idx = course.files.findIndex((f) => f.id === fileId);
            if (idx !== -1) {
                const removed = course.files.splice(idx, 1)[0];
                refreshCoursesForModule(moduleKey);
                updateModuleElement(moduleKey);
                showNotification(`Fichier "${removed.name}" supprimé du serveur`, "success");
            }
        } catch (err) {
            console.error("Erreur suppression fichier serveur:", err);
            showNotification(`Erreur suppression: ${err.message}`, "error");
        }
        return;
    }

    // 🔹 Cas 2 : fichier local non encore sauvegardé en base
    const idx = course.files.findIndex((f) => f.id === fileId);
    if (idx !== -1) {
        const removed = course.files.splice(idx, 1)[0];
        refreshCoursesForModule(moduleKey);
        updateModuleElement(moduleKey);
        showNotification(`Fichier "${removed.name}" supprimé localement`, "success");
    }
}

// ---------- DOWNLOAD FILE ----------
async function downloadFile(fileId, fileName) {
    const found = await findFile(fileId);
    if (!found) {
        showNotification('Fichier introuvable', 'error');
        return;
    }
    const { file } = found;
    if (file.url) {
        window.open(file.url, '_blank');
        return;
    }
    // si blob local
    if (file.blob) {
        const url = URL.createObjectURL(file.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || file.name || 'download';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showNotification(`${fileName} téléchargé`, 'success');
        return;
    }
    showNotification('Aucune source pour le téléchargement', 'error');
}

// ---------- SMALL UTIL FUNCTIONS ----------
function refreshCoursesForModule(moduleId) {
    const el = document.getElementById(`courses-list-${moduleId}`);
    if (el) {
        el.innerHTML = renderCoursesForModule(moduleId);
    }
}

function updateModuleElement(moduleId) {
    const moduleElement = document.querySelector(`[data-module-id="${moduleId}"]`);
    const module = modulesData[moduleId];
    if (!moduleElement || !module) return;
    const moduleInfo = moduleElement.querySelector('.module-info');
    if (moduleInfo) {
        moduleInfo.innerHTML = `
            <h3><i class="fas fa-layer-group"></i> ${escapeHtml(module.name)}</h3>
        `;
    }
    const statsContainer = moduleElement.querySelector('.module-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-item">
                <i class="fas fa-book"></i>
                <span>${Object.keys(module.courses).length} cours</span>
            </div>
            <div class="stat-item">
                <i class="fas fa-file"></i>
                <span>${getTotalFilesInModule(moduleId)} fichiers</span>
            </div>
        `;
    }
}

function getTotalFilesInModule(moduleId) {
    const module = modulesData[moduleId];
    if (!module) return 0;
    let total = 0;
    Object.values(module.courses || {}).forEach(c => total += (c.files ? c.files.length : 0));
    return total;
}

// ---------- MODAL / COURSE CREATION (local placeholder) ----------
function openCourseModal(moduleId, courseId = null) {
    currentModuleId = moduleId;
    editingCourse = courseId;

    const modal = document.getElementById('courseModal');
    const title = document.getElementById('courseModalTitle');
    const form = document.getElementById('courseForm');

    if (courseId) {
        const course = modulesData[moduleId].courses[courseId];
        title.textContent = 'Modifier le Cours';
        document.getElementById('courseName').value = course.name;
        document.getElementById('courseDescription').value = course.description || '';
        document.querySelector('#courseModal .save-btn').textContent = 'Modifier Cours';
    } else {
        title.textContent = 'Créer un Nouveau Cours';
        if (form) form.reset();
        document.querySelector('#courseModal .save-btn').textContent = 'Créer Cours';
    }

    if (modal) {
        modal.style.display = 'block';
        document.getElementById('courseName').focus();
    }
}

async function saveCourse() {
    if (!currentModuleId) {
        alert('Erreur: Aucun module sélectionné');
        return;
    }

    const name = document.getElementById('courseName').value.trim();
    const description = document.getElementById('courseDescription').value.trim();

    if (!name) {
        alert('Veuillez saisir un nom pour le cours');
        return;
    }

    const numericModuleId = parseInt(currentModuleId.split('-')[1], 10);

    try {
        // Appel API pour créer un cours SANS fichier
        const body = new FormData();
        body.append("moduleId", numericModuleId);
        body.append("titre", name);
        body.append("description", description);

        const res = await apiRequest('/cours', { method: 'POST', body, isForm: true });

        if (res && res.cours) {
            const cours = res.cours;
            const serverCourseKey = `db-${cours.id}`;
            modulesData[currentModuleId].courses[serverCourseKey] = {
                id: serverCourseKey,
                name: cours.titre,
                description: cours.description,
                serverId: cours.id,
                files: []
            };
            refreshCoursesForModule(currentModuleId);
            updateModuleElement(currentModuleId);
            showNotification('Cours créé sur le serveur', 'success');
        }
    } catch (err) {
        console.error('Erreur création cours', err);
        showNotification(`Erreur création cours: ${err.message}`, 'error');
    }

    closeModal('courseModal');
    editingCourse = null;
    currentModuleId = null;
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function closeAllModals() {
    closeModal('courseModal');
}

// ---------- SAVE ALL DATA (upload pending local course files) ----------
async function saveAllData() {
    try {
        // pour chaque module, trouver les cours locaux qui ont des blobs/fichiers et les uploader
        for (const moduleKey in modulesData) {
            for (const courseId in modulesData[moduleKey].courses) {
                const course = modulesData[moduleKey].courses[courseId];
                // si placeholder local (id startsWith 'course-') et a des files contenant blob, upload
                if (courseId.startsWith('course-') && course.files && course.files.length > 0) {
                    const blobs = course.files.filter(f => f.blob).map(f => f.blob);
                    if (blobs.length > 0) {
                        await uploadFiles(blobs, moduleKey, courseId);
                    }
                }
            }
        }
        // sauvegarde locale (optionnelle)
        const dataToSave = { modules: modulesData, lastModified: new Date().toISOString() };
        localStorage.setItem('modulesData', JSON.stringify(dataToSave));
        showNotification('Données sauvegardées (et fichiers uploadés si présents).', 'success');
    } catch (err) {
        console.error('saveAllData error', err);
        showNotification(`Erreur sauvegarde: ${err.message}`, 'error');
    }
}

// ---------- UTIL ----------------
function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); });
}

function getFileIcon(mimeType) {
    if (!mimeType) return 'fa-file';
    if (mimeType.includes('pdf')) return 'fa-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint';
    if (mimeType.includes('video')) return 'fa-file-video';
    if (mimeType.includes('image')) return 'fa-file-image';
    return 'fa-file';
}
function getFileIconClass(mimeType){ return `file-icon ${getFileIcon(mimeType)}`; }
function formatFileSize(bytes){ if (!bytes) return ''; const k=1024; const sizes=['Bytes','KB','MB','GB']; const i=Math.floor(Math.log(bytes)/Math.log(k)); return parseFloat((bytes/Math.pow(k,i)).toFixed(2)) + ' ' + sizes[i]; }

// ---------- NOTIFICATIONS & MISC ----------
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

// ---------- LOCAL LOAD / BACKWARD COMPATIBILITY ----------
function loadSavedData() {
    try {
        const saved = JSON.parse(localStorage.getItem('modulesData') || 'null');
        if (!saved || !saved.modules) return;
        modulesData = saved.modules || {};

        // render modules from saved local data (keeps previous behavior)
        Object.values(modulesData).forEach(m => createModuleElement(m));
    } catch (err) {
        console.warn('loadSavedData parse error', err);
    }
}

// ---------- SMALL UI listners ----------
function setupEventListeners() {
    window.onclick = function(event) {
        const modals = ['courseModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (event.target === modal) {
                closeModal(modalId);
            }
        });
    };
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeAllModals(); });
}
setupEventListeners();

function showNotifications() {
    window.location.href = 'notification.html';
}

function toggleModule(moduleId) {
    const moduleContent = document.getElementById(`module-content-${moduleId}`);
    const toggleButton = document.querySelector(`[data-module-id="${moduleId}"] .module-toggle`);

    if (moduleContent.classList.contains('active')) {
        moduleContent.classList.remove('active');
        toggleButton.classList.remove('active');
    } else {
        moduleContent.classList.add('active');
        toggleButton.classList.add('active');
        refreshCoursesForModule(moduleId);

        // 👉 forcer l’affichage de la zone d’upload dès qu’on clique
        const uploadSection = moduleContent.querySelector('.upload-section');
        if (uploadSection) {
            uploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// Expose some functions to inline onclick attributes (déjà utilisés dans le HTML)
window.openCourseModal = openCourseModal;
window.saveCourse = saveCourse;
window.deleteCourse = deleteCourse;
window.triggerFileUpload = triggerFileUpload;
window.handleFileSelect = handleFileSelect;
window.handleFileDrop = handleFileDrop;
window.downloadFile = downloadFile;
window.deleteFile = deleteFile;
window.saveAllData = saveAllData;
window.showProfile = function(){ window.location.href = 'profile.html'; };
window.goBack = function(){ window.history.back(); };