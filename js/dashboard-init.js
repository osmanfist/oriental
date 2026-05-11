/**
 * Oriental - Dashboard Initialization
 * DOMContentLoaded, Phase 1 features, real-time subscription
 */

// ============================================
// LOADING SCREEN CONTROLLER
// ============================================

const loadingSteps = [
    { progress: 10, status: 'Checking authentication...', delay: 300 },
    { progress: 25, status: 'Loading user data...', delay: 400 },
    { progress: 40, status: 'Loading organization...', delay: 300 },
    { progress: 55, status: 'Loading team members...', delay: 400 },
    { progress: 70, status: 'Loading projects...', delay: 500 },
    { progress: 85, status: 'Setting up workspace...', delay: 300 },
    { progress: 95, status: 'Almost ready...', delay: 200 },
    { progress: 100, status: 'Ready!', delay: 300 },
];

let currentLoadingStep = 0;

function updateLoadingProgress(stepIndex) {
    const step = loadingSteps[stepIndex];
    if (!step) return;
    
    const fill = document.getElementById('loading-progress-fill');
    const status = document.getElementById('loading-status');
    
    if (fill) fill.style.width = step.progress + '%';
    if (status) status.textContent = step.status;
}

function hideLoadingScreen() {
    const loadingEl = document.getElementById('dashboard-loading');
    if (loadingEl) {
        loadingEl.classList.add('fade-out');
        setTimeout(() => {
            if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
        }, 500);
    }
}

// ============================================
// REALTIME SUBSCRIPTION
// ============================================

function setupRealtimeSubscription() {
    if (!currentProject) return;
    if (unsubscribeTasks) unsubscribeTasks();
    
    unsubscribeTasks = db.collection('tasks')
        .where('projectId', '==', currentProject.id)
        .onSnapshot((snapshot) => {
            if (taskReloadTimeout) clearTimeout(taskReloadTimeout);
            taskReloadTimeout = setTimeout(() => {
                const tasks = [];
                snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
                allTasks = tasks;
                loadAssigneeFilters();
                applySearchAndFilter();
                taskReloadTimeout = null;
            }, 100);
        }, (error) => console.error('Realtime error:', error));
}

// ============================================
// PHASE 1 FEATURES
// ============================================

function initializePhase1Features() {
    if (typeof RecurringTasksManager !== 'undefined') {
        window.recurringManager = new RecurringTasksManager();
        setTimeout(() => {
            window.recurringManager?.checkAndGenerateRecurringTasks()
                .then(count => { if (count > 0) console.log(`Generated ${count} recurring tasks`); })
                .catch(err => console.warn('Recurring check:', err));
        }, 2000);
    }
    
    setTimeout(() => {
        const taskDesc = document.getElementById('task-description');
        if (taskDesc && window.mentionsSystem) window.mentionsSystem.initMentions(taskDesc);
        const editTaskDesc = document.getElementById('edit-task-description');
        if (editTaskDesc && window.mentionsSystem) window.mentionsSystem.initMentions(editTaskDesc);
    }, 1000);
    
    window.openTemplatesLibrary = function() {
        if (window.TemplatesLibrary) new TemplatesLibrary().openTemplatesLibrary();
        else showToast('Templates library not loaded', 'error');
    };
}

// ============================================
// DOMCONTENTLOADED
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Oriental Dashboard - Leantime Edition');
    
        // Start loading
    updateLoadingProgress(0);
    
    initDarkMode();
    setupOfflineDetection();
    setupPWAInstallPrompt();
    
    // Step 1: Auth
    updateLoadingProgress(1);
    await checkAuth();
    
    // Step 2: User data
    updateLoadingProgress(2);
    await loadUserData();
    
    // Step 3: Organization
    updateLoadingProgress(3);
    await loadOrganization();
    
    // Step 4: Team
    updateLoadingProgress(4);
    await loadTeamMembers();
    
    // Step 5: Projects
    updateLoadingProgress(5);
    await loadProjectsOptimized();
    
    // Step 6: Setup
    updateLoadingProgress(6);
    setupEventListeners();
    setupSettingsEventListeners();
    setupRealtimeSubscription();
    setupMobileNavigation();
    setupKeyboardShortcuts();
    setupSorting();
    setupThemeToggle();
    setupAllProjectsToggle();
    setupSearchAndFilter();
    initializePhase1Features();
    
    // Step 7: Done
    updateLoadingProgress(7);
    
    // Hide loading screen
    setTimeout(() => {
        hideLoadingScreen();
    }, 400);
    
    window.addEventListener('beforeunload', cleanup);
    
    const originalOpenInvite = window.openInviteModal;
    window.openInviteModal = function() {
        originalOpenInvite();
        setTimeout(() => {
            const inviteForm = document.getElementById('invite-form');
            const modalBody = inviteForm?.querySelector('.modal-body');
            if (modalBody && !document.getElementById('add-member-method')) {
                // Enhance invite modal if needed
            }
        }, 50);
    };
    
    console.log('✅ Dashboard ready!');
});

console.log('✅ dashboard-init.js loaded');