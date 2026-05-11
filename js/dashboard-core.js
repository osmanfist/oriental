/**
 * Oriental - Dashboard Core
 * Auth, globals, utilities, caching
 */

// ============================================
// GLOBAL VARIABLES
// ============================================

// Undo Delete
let deletedItem = null;
let deletedItemType = null;
let undoTimeout = null;
const UNDO_DURATION = 20000;

// User & Organization
let currentUser = null;
let currentOrganization = null;
let currentProject = null;
let currentView = 'board';
let currentTaskForComments = null;

// Tasks
let allTasks = [];
let filteredTasks = [];
let searchTerm = '';
let currentSort = 'created-desc';
let activeFilters = { priorities: [], statuses: [], dueDates: [], assignees: [] };

// Team
let teamMembers = [];

// Realtime
let unsubscribeTasks = null;
let taskReloadTimeout = null;

// UI State
let isActivityLogOpen = false;

// Cache
let projectsCache = null;
let projectsCacheTime = 0;
const CACHE_DURATION = 30000;

// Offline
let pendingWrites = [];
let isOnline = navigator.onLine;

// Reports
let reportsCharts = {};

// Sprints
let currentSprint = null;
let availableTasks = [];

// Phase 1
let phase1FeaturesEnabled = true;
let currentAttachmentsManager = null;

// Settings
let currentSettingsTab = 'general';

// All Projects
let showAllProjects = false;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const icons = { 
        success: 'fa-check-circle', 
        error: 'fa-exclamation-circle', 
        warning: 'fa-exclamation-triangle', 
        info: 'fa-info-circle' 
    };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function generateSlug(text) {
    if (!text) return 'my-team';
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getDueDateStatus(dueDate) {
    if (!dueDate) return 'none';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
    if (due.getTime() === today.getTime()) return 'today';
    const weekFromNow = new Date(today); weekFromNow.setDate(today.getDate() + 7);
    if (due <= weekFromNow) return 'week';
    return 'future';
}

function getDueDateDisplay(dueDate) {
    if (!dueDate) return null;
    const status = getDueDateStatus(dueDate);
    const date = new Date(dueDate).toLocaleDateString();
    const labels = { 
        overdue: `⚠️ Overdue: ${date}`, 
        today: `📅 Today: ${date}`, 
        week: `📆 Due: ${date}`, 
        future: `📅 Due: ${date}` 
    };
    return labels[status] || `📅 ${date}`;
}

function getDateFilter(range) {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    switch(range) {
        case 'week': start.setDate(end.getDate() - 7); break;
        case 'month': start.setMonth(end.getMonth() - 1); break;
        case 'quarter': start.setMonth(end.getMonth() - 3); break;
        case 'year': start.setFullYear(end.getFullYear() - 1); break;
        case 'all': start.setFullYear(2020, 0, 1); break;
        default: start.setMonth(end.getMonth() - 1);
    }
    return { start, end };
}

function escapeCsvField(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// ============================================
// PERMISSION SYSTEM
// ============================================

const PERMISSIONS = {
    viewer: {
        viewTasks: true,
        viewProjects: true,
        viewReports: true,
        completeTasks: false,
        comment: false,
        createTasks: false,
        deleteTasks: false,
        createSprints: false,
        manageTeam: false,
        createProjects: false,
        deleteProjects: false,
        fullAuthority: false
    },
    member: {
        viewTasks: true,
        viewProjects: true,
        viewReports: true,
        completeTasks: true,
        comment: true,
        createTasks: false,
        deleteTasks: false,
        createSprints: false,
        manageTeam: false,
        createProjects: false,
        deleteProjects: false,
        fullAuthority: false
    },
    manager: {
        viewTasks: true,
        viewProjects: true,
        viewReports: true,
        completeTasks: true,
        comment: true,
        createTasks: true,
        deleteTasks: true,
        createSprints: true,
        manageTeam: false,
        createProjects: false,
        deleteProjects: false,
        fullAuthority: false
    },
    admin: {
        viewTasks: true,
        viewProjects: true,
        viewReports: true,
        completeTasks: true,
        comment: true,
        createTasks: true,
        deleteTasks: true,
        createSprints: true,
        manageTeam: true,
        createProjects: true,
        deleteProjects: true,
        fullAuthority: true
    }
};

let currentUserRole = 'admin'; // Default for safety

function getUserPermissions() {
    return PERMISSIONS[currentUserRole] || PERMISSIONS.viewer;
}

function can(permission) {
    const perms = getUserPermissions();
    return perms[permission] || perms.fullAuthority || false;
}

function requirePermission(permission) {
    if (!can(permission)) {
        showToast('You do not have permission to perform this action', 'error');
        return false;
    }
    return true;
}

/**
 * Update UI based on user permissions
 */
function applyPermissionUI() {
    const perms = getUserPermissions();
    
    // Create Task button
    const createTaskBtn = document.getElementById('create-task-btn');
    const bottomAddBtn = document.getElementById('bottom-add-btn');
    if (createTaskBtn) createTaskBtn.style.display = perms.createTasks ? 'flex' : 'none';
    if (bottomAddBtn) bottomAddBtn.style.display = perms.createTasks ? 'flex' : 'none';
    
    // Create Project button
    const addProjectBtn = document.getElementById('add-project-btn');
    if (addProjectBtn) addProjectBtn.style.display = perms.createProjects ? 'flex' : 'none';
    
    // Templates button
    const templatesBtn = document.getElementById('templates-btn');
    if (templatesBtn) templatesBtn.style.display = perms.createTasks ? 'flex' : 'none';
    
    // Invite button
    const inviteBtn = document.getElementById('invite-btn');
    if (inviteBtn) inviteBtn.style.display = perms.manageTeam ? 'flex' : 'none';
    
    // Delete project buttons (hide for non-admins)
    document.querySelectorAll('.delete-project-btn').forEach(btn => {
        btn.style.display = perms.deleteProjects ? '' : 'none';
    });
    
    // Sprint buttons
    const createSprintBtn = document.getElementById('create-sprint-btn');
    const completeSprintBtn = document.getElementById('complete-sprint-btn');
    const addToSprintBtn = document.getElementById('add-to-sprint-btn');
    if (createSprintBtn) createSprintBtn.style.display = perms.createSprints ? 'flex' : 'none';
    if (addToSprintBtn) addToSprintBtn.style.display = perms.createSprints ? 'flex' : 'none';
    
    // Settings tabs
    document.querySelectorAll('.settings-tab[data-tab="team"]').forEach(tab => {
        tab.style.display = perms.manageTeam ? 'flex' : 'none';
    });
    
    // Danger zone in settings
    document.querySelectorAll('.danger-item-critical').forEach(item => {
        item.style.display = perms.deleteProjects ? 'flex' : 'none';
    });
    
    // Export buttons
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportCsvBtn) exportCsvBtn.style.display = perms.viewReports ? 'flex' : 'none';
    if (exportPdfBtn) exportPdfBtn.style.display = perms.viewReports ? 'flex' : 'none';
    
    console.log('🔒 Permissions applied for role:', currentUserRole, perms);
}

// ============================================
// CACHING
// ============================================

async function getCachedProjects() {
    const now = Date.now();
    if (projectsCache && (now - projectsCacheTime) < CACHE_DURATION) return projectsCache;
    
    const snapshot = await db.collection('projects')
        .where('organizationId', '==', currentOrganization)
        .where('isArchived', '==', false)
        .get();
    
    projectsCache = [];
    snapshot.forEach(doc => projectsCache.push({ id: doc.id, ...doc.data() }));
    projectsCacheTime = now;
    return projectsCache;
}

function invalidateCache() {
    projectsCache = null;
    projectsCacheTime = 0;
}

// ============================================
// ACTIVITY LOGGING
// ============================================

async function logActivity(action, entityType, entityId, entityName, details = {}) {
    if (!currentOrganization) return;
    const writeOp = async () => {
        await db.collection('activity_logs').add({
            organizationId: currentOrganization,
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            userEmail: currentUser.email,
            action, entityType, entityId, entityName, details,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    };
    if (isOnline) {
        try { await writeOp(); } catch (e) { console.error('Activity log error:', e); }
    } else {
        pendingWrites.push(writeOp);
    }
}

// ============================================
// AUTH & USER DATA
// ============================================

async function checkAuth() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (!user) { window.location.href = 'login.html'; reject(); }
            else { currentUser = user; resolve(); }
        });
    });
}

async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            currentOrganization = userData.currentOrganization;
            document.getElementById('org-name').textContent = userData.name || currentUser.email;
            document.getElementById('user-name').textContent = userData.name || currentUser.displayName || 'User';
            document.getElementById('user-email').textContent = currentUser.email;
            if (currentOrganization) await loadProjectsOptimized();
        } else {
            document.getElementById('user-name').textContent = currentUser.displayName || currentUser.email.split('@')[0];
            document.getElementById('user-email').textContent = currentUser.email;
            await createMissingUserDocument();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
    }
}

async function createMissingUserDocument() {
    try {
        const orgsSnapshot = await db.collection('organizations')
            .where('members', 'array-contains', currentUser.uid).get();
        let orgId;
        if (!orgsSnapshot.empty) {
            orgId = orgsSnapshot.docs[0].id;
        } else {
            const orgName = prompt('Welcome! Enter your organization name:', 'My Team');
            if (!orgName) return;
            const orgRef = await db.collection('organizations').add({
                name: orgName, slug: generateSlug(orgName),
                createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                members: [currentUser.uid],
                settings: { defaultView: 'board', theme: 'light' }
            });
            orgId = orgRef.id;
            await db.collection('projects').add({
                name: 'Getting Started',
                description: 'Welcome to Oriental! This is your first project.',
                organizationId: orgId, createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isArchived: false, color: '#16a34a'
            });
        }
        await db.collection('users').doc(currentUser.uid).set({
            name: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email,
            currentOrganization: orgId, organizations: [orgId],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            preferences: { notifications: true, emailDigest: 'daily' }
        });
        currentOrganization = orgId;
        await loadProjectsOptimized();
        showToast('Organization created successfully', 'success');
    } catch (error) {
        console.error('Error:', error);
        showToast('Error setting up account', 'error');
    }
}

async function loadOrganization() {
    if (!currentOrganization) return;
    try {
        const orgDoc = await db.collection('organizations').doc(currentOrganization).get();
        if (orgDoc.exists) document.getElementById('org-name').textContent = orgDoc.data().name;
    } catch (error) { console.error('Error loading organization:', error); }
}

// ============================================
// TEAM MEMBERS
// ============================================

async function loadTeamMembers() {
    if (!currentOrganization) return;
    try {
        const usersSnapshot = await db.collection('users')
            .where('organizations', 'array-contains', currentOrganization).get();
        teamMembers = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            teamMembers.push({ id: doc.id, name: userData.name || userData.email.split('@')[0], email: userData.email, avatar: userData.avatar || null });
        });
        if (!teamMembers.some(m => m.id === currentUser.uid)) {
            teamMembers.unshift({ id: currentUser.uid, name: currentUser.displayName || currentUser.email.split('@')[0], email: currentUser.email });
        }
        updateAssigneeDropdowns();
        loadTeamMembersDisplay();
    } catch (error) { console.error('Error loading team members:', error); }
}

function updateAssigneeDropdowns() {
    const options = '<option value="">Unassigned</option>' + teamMembers.map(m => 
        `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)} (${escapeHtml(m.email)})</option>`
    ).join('');
    ['task-assignee', 'edit-task-assignee'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { const currentValue = el.value; el.innerHTML = options; if (currentValue && id === 'edit-task-assignee') el.value = currentValue; }
    });
}

async function loadTeamMembersDisplay() {
    if (!currentOrganization) return;
    try {
        const teamContainer = document.getElementById('team-members-list');
        if (!teamContainer) return;
        teamContainer.innerHTML = '';
        teamMembers.forEach(member => {
            const isCurrentUser = member.id === currentUser.uid;
            const div = document.createElement('div');
            div.className = 'team-member-item';
            div.innerHTML = `
                <div class="team-member-avatar"><i class="fas fa-user-circle"></i></div>
                <div class="team-member-info">
                    <div class="team-member-name">${escapeHtml(member.name)}</div>
                    <div class="team-member-email">${escapeHtml(member.email)}</div>
                </div>
                ${isCurrentUser ? '<span class="team-member-badge">You</span>' : ''}
            `;
            teamContainer.appendChild(div);
        });
    } catch (error) { console.error('Error loading team display:', error); }
}

// ============================================
// CONFIRMATION DIALOG
// ============================================

function showConfirmDialog(title, message, type = 'danger') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        const okClass = type === 'danger' ? 'confirm-ok' : 'confirm-ok-success';
        const okText = type === 'danger' ? 'Delete' : 'Confirm';
        dialog.innerHTML = `
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(message)}</p>
            <div class="confirm-dialog-actions">
                <button class="confirm-cancel">Cancel</button>
                <button class="${okClass}">${okText}</button>
            </div>
        `;
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        const cleanup = () => overlay.remove();
        dialog.querySelector('.confirm-cancel').addEventListener('click', () => { cleanup(); resolve(false); });
        dialog.querySelector(`.${okClass}`).addEventListener('click', () => { cleanup(); resolve(true); });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) { cleanup(); resolve(false); } });
    });
}

// ============================================
// PWA & OFFLINE
// ============================================

let deferredPrompt;

function setupPWAInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const pwaPrompt = document.createElement('div');
        pwaPrompt.className = 'pwa-install-prompt';
        pwaPrompt.innerHTML = `
            <p><i class="fas fa-download"></i> Install Oriental for a better experience!</p>
            <button id="install-pwa-btn">Install</button>
            <button class="close-pwa-prompt" id="close-pwa-prompt">&times;</button>
        `;
        document.body.appendChild(pwaPrompt);
        document.getElementById('install-pwa-btn').addEventListener('click', async () => {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            if (result.outcome === 'accepted') console.log('PWA installed');
            pwaPrompt.remove();
            deferredPrompt = null;
        });
        document.getElementById('close-pwa-prompt').addEventListener('click', () => pwaPrompt.remove());
        pwaPrompt.classList.add('show');
    });
}

function setupOfflineDetection() {
    window.addEventListener('online', () => {
        isOnline = true;
        const indicator = document.getElementById('offline-indicator');
        if (indicator) indicator.classList.remove('show');
        showToast('Back online!', 'success');
    });
    window.addEventListener('offline', () => {
        isOnline = false;
        const indicator = document.getElementById('offline-indicator');
        if (indicator) indicator.classList.add('show');
        showToast('You are offline', 'warning');
    });
    if (!isOnline) document.getElementById('offline-indicator')?.classList.add('show');
}

// ============================================
// DARK MODE
// ============================================

function initDarkMode() {
    const savedTheme = localStorage.getItem('oriental_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const isDark = currentTheme === 'dark';
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('oriental_theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('oriental_theme', 'dark');
    }
    showToast(isDark ? 'Light mode' : 'Dark mode', 'info');
}

function setupThemeToggle() {
    document.querySelectorAll('.theme-toggle').forEach(toggle => {
        toggle.addEventListener('click', toggleTheme);
    });
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const isTyping = e.target.matches('input, textarea, select, [contenteditable]');
        if (e.key === 'Escape') { closeAllModals(); return; }
        if (isTyping) return;
        if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openTaskModal(); }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); openProjectModal(); }
        if (e.key === '/') { e.preventDefault(); document.getElementById('search-tasks')?.focus(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); if (deletedItem) undoDelete(); }
    });
}

// ============================================
// MOBILE NAVIGATION
// ============================================

function setupMobileNavigation() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const openSidebar = () => { sidebar?.classList.add('open'); overlay?.classList.add('active'); };
    const closeSidebar = () => { sidebar?.classList.remove('open'); overlay?.classList.remove('active'); };
    
    document.getElementById('mobile-menu-btn')?.addEventListener('click', openSidebar);
    document.getElementById('sidebar-close-btn')?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);
}

// ============================================
// GLOBAL CLEANUP
// ============================================

function cleanup() {
    if (unsubscribeTasks) unsubscribeTasks();
    if (taskReloadTimeout) clearTimeout(taskReloadTimeout);
    if (undoTimeout) clearTimeout(undoTimeout);
    Object.values(reportsCharts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') chart.destroy();
    });
}

function closeAllModals() {
    ['task-modal','project-modal','sprint-modal','comment-modal','invite-modal','pending-invites-modal','add-to-sprint-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.classList.remove('active'); }
    });
    document.getElementById('filter-dropdown')?.classList.remove('show');
    document.getElementById('sort-dropdown')?.classList.remove('show');
}

console.log('✅ dashboard-core.js loaded');