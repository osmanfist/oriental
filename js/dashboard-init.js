/**
 * Oriental - Dashboard Initialization
 * DOMContentLoaded, Phase 1 features, real-time subscription
 */

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
    
    initDarkMode();
    setupOfflineDetection();
    setupPWAInstallPrompt();
    
    await checkAuth();
    await loadUserData();
    await loadOrganization();
    await loadTeamMembers();
    await loadProjectsOptimized();
    
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