/**
 * Oriental - Dashboard Module
 * Version: 5.0.0 - Phase 1 Complete
 * 
 * COMPLETE version with:
 * - Full Reports & Analytics functionality
 * - @Mentions system with autocomplete
 * - File Attachments (Base64, 1MB limit)
 * - Recurring Tasks (daily/weekly/monthly)
 * - Templates Library (6+ project, 4+ task templates)
 * - Settings page (5 tabs)
 * - Reduced Firestore reads (caching, debouncing)
 * - PWA offline support
 * - Analytics integration
 * - Performance monitoring
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

// Phase 1 Feature Flags
let phase1FeaturesEnabled = true;
let currentAttachmentsManager = null;

// Settings
let currentSettingsTab = 'general';

// ============================================
// ANALYTICS & PERFORMANCE
// ============================================

function trackAnalytics(eventName, eventParams = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventParams);
        console.log(`📊 Analytics: ${eventName}`, eventParams);
    }
}

function trackPageView(pageName) {
    if (typeof gtag !== 'undefined') {
        gtag('config', 'G-XXXXXXXXXX', { page_path: pageName });
    }
}

function reportPerformance() {
    if ('performance' in window && typeof gtag !== 'undefined') {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
            gtag('event', 'performance', {
                'page_load_time': perfData.loadEventEnd - perfData.fetchStart,
                'dom_content_loaded': perfData.domContentLoadedEventEnd - perfData.fetchStart,
                'first_paint': performance.getEntriesByType('paint')[0]?.startTime || 0
            });
        }
    }
}

// ============================================
// OFFLINE DETECTION
// ============================================

function setupOfflineDetection() {
    window.addEventListener('online', () => {
        isOnline = true;
        document.getElementById('offline-indicator')?.classList.remove('show');
        showToast('Back online! Syncing changes...', 'success');
        syncPendingWrites();
        trackAnalytics('connection_restored', {});
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        document.getElementById('offline-indicator')?.classList.add('show');
        showToast('You are offline. Changes will sync when you reconnect.', 'warning');
        trackAnalytics('connection_lost', {});
    });
    
    if (!isOnline) {
        document.getElementById('offline-indicator')?.classList.add('show');
    }
}

async function syncPendingWrites() {
    if (!isOnline || pendingWrites.length === 0) return;
    
    console.log(`Syncing ${pendingWrites.length} pending writes...`);
    trackAnalytics('sync_pending_writes', { count: pendingWrites.length });
    
    for (const write of pendingWrites) {
        try { await write(); } catch (error) { console.error('Failed to sync:', error); }
    }
    pendingWrites = [];
    await loadProjects();
    await loadTasks();
    showToast('All changes synced!', 'success');
}

function queueWrite(writeOperation) {
    if (isOnline) {
        return writeOperation();
    } else {
        pendingWrites.push(writeOperation);
        showToast('Changes will sync when online.', 'warning');
        trackAnalytics('write_queued_offline', {});
        return Promise.resolve({ queued: true });
    }
}

// ============================================
// CACHING
// ============================================

async function getCachedProjects() {
    const now = Date.now();
    if (projectsCache && (now - projectsCacheTime) < CACHE_DURATION) {
        trackAnalytics('cache_hit', { type: 'projects' });
        return projectsCache;
    }
    
    trackAnalytics('cache_miss', { type: 'projects' });
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
    trackAnalytics('cache_invalidated', {});
}

// ============================================
// PWA INSTALL PROMPT
// ============================================

let deferredPrompt;
let pwaInstallPrompt = null;

function setupPWAInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        if (!pwaInstallPrompt) {
            pwaInstallPrompt = document.createElement('div');
            pwaInstallPrompt.className = 'pwa-install-prompt';
            pwaInstallPrompt.innerHTML = `
                <p><i class="fas fa-download"></i> Install Oriental for a better experience!</p>
                <button id="install-pwa-btn">Install</button>
                <button class="close-pwa-prompt" id="close-pwa-prompt">&times;</button>
            `;
            document.body.appendChild(pwaInstallPrompt);
            
            document.getElementById('install-pwa-btn')?.addEventListener('click', () => {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        trackAnalytics('pwa_installed', {});
                    }
                    pwaInstallPrompt?.classList.remove('show');
                    deferredPrompt = null;
                });
            });
            
            document.getElementById('close-pwa-prompt')?.addEventListener('click', () => {
                pwaInstallPrompt?.classList.remove('show');
                trackAnalytics('pwa_prompt_dismissed', {});
            });
        }
        
        pwaInstallPrompt.classList.add('show');
        trackAnalytics('pwa_prompt_shown', {});
    });
}

// ============================================
// DARK MODE
// ============================================

function initDarkMode() {
    const savedTheme = localStorage.getItem('oriental_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcons(true);
        trackAnalytics('dark_mode_enabled', { source: savedTheme ? 'user_preference' : 'system' });
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeIcons(false);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const isDark = currentTheme === 'dark';
    
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('oriental_theme', 'light');
        updateThemeIcons(false);
        showToast('Light mode activated', 'info');
        trackAnalytics('theme_changed', { mode: 'light' });
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('oriental_theme', 'dark');
        updateThemeIcons(true);
        showToast('Dark mode activated', 'info');
        trackAnalytics('theme_changed', { mode: 'dark' });
    }
}

function updateThemeIcons(isDark) {
    document.querySelectorAll('.theme-toggle').forEach(toggle => {
        const icon = toggle.querySelector('i');
        if (icon) {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
            toggle.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        }
    });
}

function setupThemeToggle() {
    document.querySelectorAll('.theme-toggle').forEach(toggle => {
        toggle.addEventListener('click', toggleTheme);
    });
}

// ============================================
// ACTIVITY LOG
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
        trackAnalytics('activity_logged', { action, entityType });
    };
    
    queueWrite(writeOp);
    if (isActivityLogOpen) loadActivityLog();
}

function openActivityLog() {
    const panel = document.getElementById('activity-log-container');
    const overlay = document.getElementById('activity-log-overlay');
    if (panel) {
        panel.classList.add('open');
        isActivityLogOpen = true;
        if (overlay) overlay.classList.add('active');
        loadActivityLog();
        trackAnalytics('activity_log_opened', {});
    }
}

function closeActivityLog() {
    const panel = document.getElementById('activity-log-container');
    const overlay = document.getElementById('activity-log-overlay');
    if (panel) {
        panel.classList.remove('open');
        isActivityLogOpen = false;
        if (overlay) overlay.classList.remove('active');
    }
}

async function loadActivityLog() {
    if (!currentOrganization) return;
    
    try {
        const snapshot = await db.collection('activity_logs')
            .where('organizationId', '==', currentOrganization)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        const container = document.getElementById('activity-log-list');
        if (!container) return;
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state-small">No activity yet</div>';
            return;
        }
        
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const activity = doc.data();
            const el = document.createElement('div');
            el.className = 'activity-item';
            
            let icon = 'fa-info-circle', iconClass = 'update';
            if (activity.action.includes('create')) { icon = 'fa-plus'; iconClass = 'create'; }
            else if (activity.action.includes('delete')) { icon = 'fa-trash'; iconClass = 'delete'; }
            else if (activity.action.includes('assign')) { icon = 'fa-user-check'; iconClass = 'assign'; }
            else if (activity.action.includes('comment')) { icon = 'fa-comment'; iconClass = 'comment'; }
            else if (activity.action.includes('complete')) { icon = 'fa-check-circle'; iconClass = 'create'; }
            
            let description = activity.action.replace(/_/g, ' ') + ' ' + activity.entityName;
            const time = activity.createdAt?.toDate() ? new Date(activity.createdAt.toDate()).toLocaleString() : 'Just now';
            
            el.innerHTML = `
                <div class="activity-icon ${iconClass}"><i class="fas ${icon}"></i></div>
                <div class="activity-content">
                    <div class="activity-title">${escapeHtml(activity.userName)}</div>
                    <div class="activity-description">${escapeHtml(description)}</div>
                    <div class="activity-time">${escapeHtml(time)}</div>
                </div>
            `;
            container.appendChild(el);
        });
    } catch (error) {
        console.error('Error loading activity log:', error);
    }
}

// ============================================
// EMAIL NOTIFICATIONS
// ============================================

async function sendEmailNotification(to, subject, template, data) {
    if (!isOnline) return false;
    
    try {
        const templateParams = { to_email: to, subject: subject, ...data };
        await emailjs.send('service_oriental_0126', template, templateParams);
        trackAnalytics('email_sent', { template, to_domain: to.split('@')[1] });
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

async function notifyTaskAssignment(taskId, taskTitle, assignedToEmail, assignedToName, assignerName) {
    await sendEmailNotification(assignedToEmail, `New Task Assigned: ${taskTitle}`, 'task_assigned', {
        to_name: assignedToName,
        task_title: taskTitle,
        task_link: `${window.location.origin}/dashboard.html?task=${taskId}`,
        assigner_name: assignerName
    });
    trackAnalytics('notification_sent', { type: 'task_assigned' });
}

async function notifyCommentOnTask(taskTitle, taskId, commentAuthor, taskOwnerEmail, taskOwnerName) {
    await sendEmailNotification(taskOwnerEmail, `New Comment on Task: ${taskTitle}`, 'comment_on_task', {
        to_name: taskOwnerName,
        task_title: taskTitle,
        task_link: `${window.location.origin}/dashboard.html?task=${taskId}`,
        comment_author: commentAuthor
    });
    trackAnalytics('notification_sent', { type: 'comment_added' });
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Oriental Dashboard v5.0.0 - Phase 1');
    trackPageView('/dashboard');
    
    initDarkMode();
    setupOfflineDetection();
    setupPWAInstallPrompt();
    reportPerformance();
    
    await checkAuth();
    await loadUserData();
    await loadOrganization();
    await loadTeamMembers();
    await loadProjectsOptimized();
    
    setupEventListeners();
    setupReportsEventListeners();
    setupSettingsEventListeners();
    setupRealtimeSubscription();
    setupMobileNavigation();
    setupKeyboardShortcuts();
    setupSorting();
    setupPullToRefresh();
    setupThemeToggle();
    
    initializePhase1Features();
    
    window.addEventListener('beforeunload', cleanup);
    
    trackAnalytics('dashboard_loaded', { 
        user_id: currentUser?.uid,
        has_organization: !!currentOrganization
    });
    
    console.log('✅ Dashboard ready!');
});

function cleanup() {
    if (unsubscribeTasks) unsubscribeTasks();
    if (taskReloadTimeout) clearTimeout(taskReloadTimeout);
    if (undoTimeout) clearTimeout(undoTimeout);
    Object.values(reportsCharts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') chart.destroy();
    });
}

async function checkAuth() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                reject();
            } else {
                currentUser = user;
                console.log('User authenticated:', user.email);
                resolve();
            }
        });
    });
}

// ============================================
// PHASE 1 FEATURES INITIALIZATION
// ============================================

function initializePhase1Features() {
    console.log('🚀 Initializing Phase 1 features...');
    
    // Initialize recurring manager
    if (typeof RecurringTasksManager !== 'undefined') {
        window.recurringManager = new RecurringTasksManager();
        console.log('✅ RecurringTasksManager initialized');
        
        setTimeout(() => {
            if (window.recurringManager?.checkAndGenerateRecurringTasks) {
                window.recurringManager.checkAndGenerateRecurringTasks()
                    .then(count => { if (count > 0) console.log(`✅ Generated ${count} recurring tasks`); })
                    .catch(err => console.warn('Recurring check:', err));
            }
        }, 2000);
    } else {
        console.warn('⚠️ RecurringTasksManager not loaded');
    }
    
    // Initialize mentions on task description
    setTimeout(() => {
        const taskDesc = document.getElementById('task-description');
        if (taskDesc && window.mentionsSystem) {
            window.mentionsSystem.initMentions(taskDesc);
        }
        const editTaskDesc = document.getElementById('edit-task-description');
        if (editTaskDesc && window.mentionsSystem) {
            window.mentionsSystem.initMentions(editTaskDesc);
        }
    }, 1000);
    
    // Templates library handler
    window.openTemplatesLibrary = function() {
        if (window.TemplatesLibrary) {
            new TemplatesLibrary().openTemplatesLibrary();
        } else {
            showToast('Templates library not loaded', 'error');
        }
    };
}

// ============================================
// LOADING SKELETONS
// ============================================

function showProjectSkeleton() {
    const projectList = document.getElementById('project-list');
    if (!projectList) return;
    
    projectList.innerHTML = `
        <div class="project-skeleton"><div class="skeleton-color"></div><div class="skeleton-text"></div><div class="skeleton-count"></div></div>
        <div class="project-skeleton"><div class="skeleton-color"></div><div class="skeleton-text"></div><div class="skeleton-count"></div></div>
        <div class="project-skeleton"><div class="skeleton-color"></div><div class="skeleton-text"></div><div class="skeleton-count"></div></div>
    `;
}

function showBoardSkeleton() {
    const boardView = document.getElementById('board-view');
    if (!boardView) return;
    
    boardView.innerHTML = `
        <div class="column-skeleton"><div class="skeleton-header"></div><div class="skeleton-card"><div class="skeleton-card-title"></div><div class="skeleton-card-meta"></div></div></div>
        <div class="column-skeleton"><div class="skeleton-header"></div><div class="skeleton-card"><div class="skeleton-card-title"></div><div class="skeleton-card-meta"></div></div></div>
        <div class="column-skeleton"><div class="skeleton-header"></div><div class="skeleton-card"><div class="skeleton-card-title"></div><div class="skeleton-card-meta"></div></div></div>
    `;
}

function showReportsSkeleton() {
    ['total-tasks-stat', 'completed-tasks-stat', 'completion-rate-stat', 
     'active-members-stat', 'avg-completion-stat', 'active-sprints-stat'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '...';
    });
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
// TEAM MEMBERS
// ============================================

async function loadTeamMembers() {
    if (!currentOrganization) return;
    
    try {
        const usersSnapshot = await db.collection('users')
            .where('organizations', 'array-contains', currentOrganization)
            .get();
        
        teamMembers = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            teamMembers.push({
                id: doc.id,
                name: userData.name || userData.email.split('@')[0],
                email: userData.email,
                avatar: userData.avatar || null
            });
        });
        
        if (!teamMembers.some(m => m.id === currentUser.uid)) {
            teamMembers.unshift({
                id: currentUser.uid,
                name: currentUser.displayName || currentUser.email.split('@')[0],
                email: currentUser.email
            });
        }
        
        console.log(`Loaded ${teamMembers.length} team members`);
        
        updateAssigneeDropdowns();
        loadTeamMembersDisplay();
    } catch (error) {
        console.error('Error loading team members:', error);
    }
}

function updateAssigneeDropdowns() {
    const options = '<option value="">Unassigned</option>' + teamMembers.map(m => 
        `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)} (${escapeHtml(m.email)})</option>`
    ).join('');
    
    const taskAssignee = document.getElementById('task-assignee');
    if (taskAssignee) taskAssignee.innerHTML = options;
    
    const editAssignee = document.getElementById('edit-task-assignee');
    if (editAssignee) {
        const currentValue = editAssignee.value;
        editAssignee.innerHTML = options;
        if (currentValue) editAssignee.value = currentValue;
    }
}

async function loadTeamMembersDisplay() {
    if (!currentOrganization) return;
    
    try {
        const usersSnapshot = await db.collection('users')
            .where('organizations', 'array-contains', currentOrganization)
            .get();
        
        const teamContainer = document.getElementById('team-members-list');
        if (!teamContainer) return;
        
        const members = [];
        usersSnapshot.forEach(doc => members.push({ id: doc.id, ...doc.data() }));
        
        const inviteHeader = document.querySelector('.invite-header h3');
        if (inviteHeader) {
            inviteHeader.innerHTML = `<i class="fas fa-user-plus"></i> Team Members (${members.length})`;
        }
        
        teamContainer.innerHTML = members.map(member => {
            const isCurrentUser = member.id === currentUser.uid;
            return `
                <div class="team-member-item">
                    <div class="team-member-avatar"><i class="fas fa-user-circle"></i></div>
                    <div class="team-member-info">
                        <div class="team-member-name">${escapeHtml(member.name || member.email)}</div>
                        <div class="team-member-email">${escapeHtml(member.email)}</div>
                    </div>
                    ${isCurrentUser ? '<span class="team-member-badge">You</span>' : ''}
                </div>
            `;
        }).join('');
        
        const pendingBtn = document.createElement('div');
        pendingBtn.className = 'view-pending-invites';
        pendingBtn.innerHTML = '<i class="fas fa-clock"></i> View Pending Invites';
        pendingBtn.onclick = () => openPendingInvitesModal();
        teamContainer.appendChild(pendingBtn);
    } catch (error) {
        console.error('Error loading team members display:', error);
    }
}

// ============================================
// INVITE FUNCTIONS
// ============================================

emailjs.init('8gIppIfexFw6yYhyo');

function openInviteModal() {
    const modal = document.getElementById('invite-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function closeInviteModal() {
    const modal = document.getElementById('invite-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    document.getElementById('invite-form')?.reset();
}

async function sendInvite(email, role) {
    if (!currentOrganization) {
        showToast('No organization found', 'error');
        return false;
    }
    
    const orgName = document.getElementById('org-name').textContent;
    const submitBtn = document.querySelector('#invite-form button[type="submit"]');
    const originalText = submitBtn?.innerHTML;
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        submitBtn.disabled = true;
    }
    
    try {
        const token = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        await db.collection('invites').add({
            email: email.toLowerCase(),
            organizationId: currentOrganization,
            organizationName: orgName,
            role: role,
            invitedBy: currentUser.uid,
            invitedByEmail: currentUser.email,
            token: token,
            status: 'pending',
            expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const inviteLink = `${window.location.origin}/accept-invite.html?token=${token}`;
        
        await emailjs.send('service_oriental_0126', 'oriental_invite', {
            to_email: email,
            inviter_name: currentUser.displayName || currentUser.email.split('@')[0],
            organization_name: orgName,
            role: role === 'admin' ? 'Admin' : (role === 'member' ? 'Member' : 'Viewer'),
            invite_link: inviteLink,
            expires_in: '7 days'
        });
        
        showToast(`Invitation sent to ${email}!`, 'success');
        loadPendingInvites();
        trackAnalytics('invite_sent', { role });
        return true;
    } catch (error) {
        console.error('Error sending invite:', error);
        showToast('Error sending invite: ' + error.message, 'error');
        return false;
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

async function loadPendingInvites() {
    if (!currentOrganization) return;
    
    try {
        const invitesSnapshot = await db.collection('invites')
            .where('organizationId', '==', currentOrganization)
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .get();
        
        const pendingList = document.getElementById('pending-invites-list');
        if (!pendingList) return;
        
        if (invitesSnapshot.empty) {
            pendingList.innerHTML = '<div class="empty-state-small">No pending invites</div>';
            return;
        }
        
        pendingList.innerHTML = '';
        invitesSnapshot.forEach(doc => {
            const invite = doc.data();
            const expiresDate = invite.expiresAt?.toDate() || new Date();
            const isExpired = expiresDate < new Date();
            
            const inviteDiv = document.createElement('div');
            inviteDiv.className = 'pending-invite-item';
            inviteDiv.innerHTML = `
                <div class="pending-invite-email"><i class="fas fa-envelope"></i> ${escapeHtml(invite.email)}</div>
                <div class="pending-invite-details">
                    <span class="pending-invite-role">${escapeHtml(invite.role)}</span>
                    <span class="pending-invite-date">Invited ${new Date(invite.createdAt?.toDate()).toLocaleDateString()}</span>
                    ${isExpired ? '<span class="pending-invite-expired">Expired</span>' : ''}
                </div>
                <button class="cancel-invite-btn" onclick="cancelInvite('${doc.id}')"><i class="fas fa-times"></i> Cancel</button>
            `;
            pendingList.appendChild(inviteDiv);
        });
    } catch (error) {
        console.error('Error loading pending invites:', error);
    }
}

function openPendingInvitesModal() {
    loadPendingInvites();
    const modal = document.getElementById('pending-invites-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function closePendingInvitesModal() {
    const modal = document.getElementById('pending-invites-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

async function cancelInvite(inviteId) {
    if (!confirm('Cancel this invitation?')) return;
    
    try {
        await db.collection('invites').doc(inviteId).update({ status: 'cancelled' });
        showToast('Invitation cancelled', 'success');
        loadPendingInvites();
        trackAnalytics('invite_cancelled', {});
    } catch (error) {
        console.error('Error cancelling invite:', error);
        showToast('Error cancelling invite', 'error');
    }
}
// ============================================
// DATA LOADING FUNCTIONS
// ============================================

async function loadUserData() {
    try {
        console.log('Loading user data for UID:', currentUser.uid);
        
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            currentOrganization = userData.currentOrganization;
            console.log('Organization loaded:', currentOrganization);
            
            document.getElementById('org-name').textContent = userData.name || currentUser.email;
            document.getElementById('user-name').textContent = userData.name || currentUser.displayName || 'User';
            document.getElementById('user-email').textContent = currentUser.email;
            
            if (currentOrganization) await loadProjectsOptimized();
        } else {
            console.warn('User document not found, creating...');
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
                name: orgName,
                slug: generateSlug(orgName),
                createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                members: [currentUser.uid],
                settings: { defaultView: 'board', theme: 'light' }
            });
            orgId = orgRef.id;
            
            await db.collection('projects').add({
                name: 'Getting Started',
                description: 'Welcome to Oriental! This is your first project.',
                organizationId: orgId,
                createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isArchived: false,
                color: '#16a34a'
            });
        }
        
        await db.collection('users').doc(currentUser.uid).set({
            name: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email,
            currentOrganization: orgId,
            organizations: [orgId],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            preferences: { notifications: true, emailDigest: 'daily' }
        });
        
        currentOrganization = orgId;
        document.getElementById('org-name').textContent = currentUser.displayName || currentUser.email.split('@')[0];
        
        await loadProjectsOptimized();
        showToast('Organization created successfully', 'success');
    } catch (error) {
        console.error('Error creating user document:', error);
        showToast('Error setting up account: ' + error.message, 'error');
    }
}

function generateSlug(text) {
    if (!text) return 'my-team';
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function loadOrganization() {
    if (!currentOrganization) return;
    try {
        const orgDoc = await db.collection('organizations').doc(currentOrganization).get();
        if (orgDoc.exists) {
            document.getElementById('org-name').textContent = orgDoc.data().name;
        }
    } catch (error) {
        console.error('Error loading organization:', error);
    }
}

// ============================================
// PROJECTS
// ============================================

async function loadProjectsOptimized() {
    if (!currentOrganization) return;
    showProjectSkeleton();
    
    try {
        const projects = await getCachedProjects();
        const projectList = document.getElementById('project-list');
        if (!projectList) return;
        
        projectList.innerHTML = '';
        projects.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
        
        if (projects.length === 0) {
            projectList.innerHTML = `
                <div class="empty-state-small empty-projects">
                    <i class="fas fa-folder-open"></i>
                    <p>No projects yet</p>
                    <button class="btn-primary" style="margin-top: 12px; padding: 8px 16px; font-size: 12px;" onclick="openProjectModal()">
                        <i class="fas fa-plus"></i> Create Project
                    </button>
                </div>
            `;
            return;
        }
        
        projects.forEach(project => {
            const projectElement = createProjectElement(project);
            projectList.appendChild(projectElement);
            loadTaskCount(project.id, projectElement);
        });
        
        if (!currentProject) selectProject(projects[0]);
    } catch (error) {
        console.error('Error loading projects:', error);
        showToast('Error loading projects', 'error');
    }
}

async function loadProjects() {
    return loadProjectsOptimized();
}

function createProjectElement(project) {
    const div = document.createElement('div');
    div.className = `project-item ${currentProject?.id === project.id ? 'active' : ''}`;
    div.setAttribute('data-project-id', project.id);
    div.innerHTML = `
        <div class="project-color" style="background: ${project.color || '#6366f1'}"></div>
        <span class="project-name">${escapeHtml(project.name)}</span>
        <span class="project-count" id="project-count-${project.id}">0</span>
        <button class="delete-project-btn" onclick="event.stopPropagation(); deleteProjectWithUndo('${project.id}', { name: '${escapeHtml(project.name)}', organizationId: '${project.organizationId}', description: '${escapeHtml(project.description || '')}', color: '${project.color}', createdBy: '${project.createdBy}' })">
            <i class="fas fa-trash"></i>
        </button>
    `;
    div.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-project-btn')) selectProject(project);
    });
    return div;
}

async function loadTaskCount(projectId, projectElement) {
    try {
        const snapshot = await db.collection('tasks').where('projectId', '==', projectId).get();
        const countSpan = projectElement.querySelector('.project-count');
        if (countSpan) countSpan.textContent = snapshot.size;
    } catch (error) {
        console.error('Error loading task count:', error);
    }
}

async function selectProject(project) {
    currentProject = project;
    console.log('Project selected:', project.name);
    
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-project-id') === project.id);
    });
    
    document.querySelector('.dashboard-header h1').textContent = project.name;
    await loadTasks(true);
}

async function createProject(projectData) {
    if (!currentOrganization) {
        await loadUserData();
        if (!currentOrganization) {
            showToast('Unable to create project. Please refresh.', 'error');
            return false;
        }
    }
    
    try {
        const project = {
            organizationId: currentOrganization,
            name: projectData.name,
            description: projectData.description || '',
            color: projectData.color || '#16a34a',
            isArchived: false,
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection('projects').add(project);
        await logActivity('create_project', 'project', docRef.id, projectData.name, {});
        invalidateCache();
        trackAnalytics('project_created', {});
        
        showToast('Project created successfully', 'success');
        await loadProjectsOptimized();
        return true;
    } catch (error) {
        console.error('Error creating project:', error);
        showToast('Error creating project: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// TASKS
// ============================================

async function loadTasks(showSkeleton = true) {
    if (!currentProject) return;
    
    if (unsubscribeTasks) unsubscribeTasks();
    if (showSkeleton) showBoardSkeleton();
    
    try {
        const tasksSnapshot = await db.collection('tasks')
            .where('projectId', '==', currentProject.id).get();
        
        allTasks = [];
        tasksSnapshot.forEach(doc => allTasks.push({ id: doc.id, ...doc.data() }));
        
        console.log(`Loaded ${allTasks.length} tasks`);
        
        loadAssigneeFilters();
        applySearchAndFilter();
        setupRealtimeSubscription();
        setupSearchAndFilter();
    } catch (error) {
        console.error('Error loading tasks:', error);
        if (showSkeleton) {
            showToast('Error loading tasks', 'error');
            document.getElementById('board-view').innerHTML = '<div class="empty-state"><p><i class="fas fa-exclamation-triangle"></i><br>Error loading tasks. Please refresh.</p></div>';
        }
    }
}

async function createTask(taskData) {
    if (!currentProject) {
        showToast('Please select a project first', 'warning');
        return false;
    }
    if (!taskData.title) {
        showToast('Please enter a task title', 'warning');
        return false;
    }
    
    try {
        let assigneeId = null, assigneeName = taskData.assignedTo || null;
        if (assigneeName && assigneeName !== 'Unassigned' && assigneeName !== '') {
            const matchedMember = teamMembers.find(m => m.name === assigneeName);
            if (matchedMember) assigneeId = matchedMember.id;
        }
        
        const task = {
            projectId: currentProject.id,
            title: taskData.title,
            description: taskData.description || '',
            priority: taskData.priority || 'medium',
            status: 'todo',
            assignedTo: assigneeName,
            assignedToId: assigneeId,
            dueDate: taskData.dueDate || null,
            estimatedHours: parseFloat(taskData.estimatedHours) || 0,
            tags: taskData.tags ? taskData.tags.split(',').map(t => t.trim()) : [],
            order: Date.now(),
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection('tasks').add(task);
        await logActivity('create_task', 'task', docRef.id, taskData.title, { assignedTo: assigneeName });
        invalidateCache();
        trackAnalytics('task_created', { priority: taskData.priority, hasAssignee: !!assigneeId });
        
        if (assigneeId && assigneeName) {
            const assignedUser = teamMembers.find(m => m.id === assigneeId);
            if (assignedUser && assignedUser.email !== currentUser.email) {
                await notifyTaskAssignment(docRef.id, taskData.title, assignedUser.email, assignedUser.name, currentUser.displayName || currentUser.email);
            }
        }
        
        // PHASE 1: Check for recurring task
        if (window.recurringManager) {
            const recurrenceConfig = window.recurringManager.getRecurrenceConfig();
            if (recurrenceConfig) {
                await window.recurringManager.createRecurringTaskTemplate(taskData, recurrenceConfig);
                showToast('Recurring task created', 'success');
            }
        }
        
        showToast('Task created successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error creating task:', error);
        showToast('Error creating task: ' + error.message, 'error');
        return false;
    }
}

async function updateTask(taskId, taskData) {
    try {
        const oldTaskDoc = await db.collection('tasks').doc(taskId).get();
        const oldTask = oldTaskDoc.data();
        
        let assigneeId = null, assigneeName = taskData.assignedTo || null;
        if (assigneeName && assigneeName !== 'Unassigned' && assigneeName !== '') {
            const matchedMember = teamMembers.find(m => m.name === assigneeName);
            if (matchedMember) assigneeId = matchedMember.id;
        }
        
        const updateData = {
            title: taskData.title,
            description: taskData.description || '',
            priority: taskData.priority || 'medium',
            assignedTo: assigneeName,
            assignedToId: assigneeId,
            dueDate: taskData.dueDate || null,
            estimatedHours: parseFloat(taskData.estimatedHours) || 0,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (taskData.tags) updateData.tags = taskData.tags.split(',').map(t => t.trim());
        
        await db.collection('tasks').doc(taskId).update(updateData);
        
        const details = {};
        if (oldTask.assignedTo !== assigneeName) {
            details.assignedTo = assigneeName;
            if (assigneeId && assigneeName !== oldTask.assignedTo) {
                const assignedUser = teamMembers.find(m => m.id === assigneeId);
                if (assignedUser && assignedUser.email !== currentUser.email) {
                    await notifyTaskAssignment(taskId, taskData.title, assignedUser.email, assignedUser.name, currentUser.displayName || currentUser.email);
                }
            }
        }
        
        await logActivity('update_task', 'task', taskId, taskData.title, details);
        invalidateCache();
        trackAnalytics('task_updated', { priority: taskData.priority, hasAssignee: !!assigneeId });
        
        showToast('Task updated successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error updating task:', error);
        showToast('Error updating task: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// TASK SORTING
// ============================================

function sortTasks(tasks) {
    const sorted = [...tasks];
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    switch(currentSort) {
        case 'priority-desc':
            sorted.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
            break;
        case 'priority-asc':
            sorted.sort((a, b) => (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0));
            break;
        case 'due-date-asc':
            sorted.sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
            break;
        case 'due-date-desc':
            sorted.sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(b.dueDate) - new Date(a.dueDate);
            });
            break;
        case 'created-asc':
            sorted.sort((a, b) => a.createdAt?.toDate() - b.createdAt?.toDate());
            break;
        default:
            sorted.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
    }
    return sorted;
}

function setupSorting() {
    const sortBtn = document.getElementById('sort-btn');
    const sortDropdown = document.getElementById('sort-dropdown');
    
    if (sortBtn) {
        sortBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sortDropdown.classList.toggle('show');
        });
    }
    
    document.addEventListener('click', (e) => {
        if (sortBtn && !sortBtn.contains(e.target) && sortDropdown && !sortDropdown.contains(e.target)) {
            sortDropdown.classList.remove('show');
        }
    });
    
    document.querySelectorAll('.sort-option').forEach(option => {
        option.addEventListener('click', () => {
            const sortValue = option.dataset.sort;
            if (sortValue) {
                currentSort = sortValue;
                document.querySelectorAll('.sort-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                sortDropdown.classList.remove('show');
                applySearchAndFilter();
            }
        });
    });
}

// ============================================
// ASSIGNEE FILTERS
// ============================================

function loadAssigneeFilters() {
    const assignees = new Set();
    allTasks.forEach(task => {
        if (task.assignedTo && task.assignedTo.trim()) {
            assignees.add(task.assignedTo);
        }
    });
    
    const assigneeContainer = document.getElementById('assignee-filters');
    if (!assigneeContainer) return;
    
    const existingLabels = assigneeContainer.querySelectorAll('label:not(:first-child)');
    existingLabels.forEach(label => label.remove());
    
    assignees.forEach(assignee => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${escapeHtml(assignee)}" class="filter-assignee"> ${escapeHtml(assignee)}`;
        assigneeContainer.appendChild(label);
    });
}

// ============================================
// SEARCH AND FILTER
// ============================================

function setupSearchAndFilter() {
    const searchInput = document.getElementById('search-tasks');
    const clearSearch = document.getElementById('clear-search');
    const filterBtn = document.getElementById('filter-btn');
    const filterDropdown = document.getElementById('filter-dropdown');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            if (clearSearch) clearSearch.style.display = searchTerm ? 'block' : 'none';
            applySearchAndFilter();
        });
    }
    
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            searchTerm = '';
            clearSearch.style.display = 'none';
            applySearchAndFilter();
        });
    }
    
    if (filterBtn && filterDropdown) {
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            filterDropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
                filterDropdown.classList.remove('show');
            }
        });
    }
    
    document.getElementById('apply-filters')?.addEventListener('click', () => {
        activeFilters.priorities = Array.from(document.querySelectorAll('.filter-priority:checked')).map(cb => cb.value);
        activeFilters.statuses = Array.from(document.querySelectorAll('.filter-status:checked')).map(cb => cb.value);
        activeFilters.dueDates = Array.from(document.querySelectorAll('.filter-due:checked')).map(cb => cb.value);
        activeFilters.assignees = Array.from(document.querySelectorAll('.filter-assignee:checked')).map(cb => cb.value);
        filterDropdown.classList.remove('show');
        updateFilterBadge();
        applySearchAndFilter();
    });
    
    document.getElementById('clear-filters')?.addEventListener('click', () => {
        document.querySelectorAll('.filter-priority, .filter-status, .filter-due, .filter-assignee').forEach(cb => cb.checked = false);
        activeFilters = { priorities: [], statuses: [], dueDates: [], assignees: [] };
        updateFilterBadge();
        applySearchAndFilter();
    });
}

function updateFilterBadge() {
    const badgeContainer = document.getElementById('active-filters');
    const totalFilters = activeFilters.priorities.length + activeFilters.statuses.length + activeFilters.dueDates.length + activeFilters.assignees.length;
    
    if (!badgeContainer) return;
    
    if (totalFilters === 0) {
        badgeContainer.style.display = 'none';
        badgeContainer.innerHTML = '';
        return;
    }
    
    badgeContainer.style.display = 'flex';
    badgeContainer.innerHTML = '';
    
    activeFilters.priorities.forEach(p => {
        badgeContainer.innerHTML += `<div class="filter-badge"><i class="fas fa-flag"></i> ${p}<button onclick="removeFilter('priority', '${p}')">&times;</button></div>`;
    });
    
    activeFilters.statuses.forEach(s => {
        const statusName = s === 'todo' ? 'To Do' : (s === 'in-progress' ? 'In Progress' : 'Done');
        badgeContainer.innerHTML += `<div class="filter-badge"><i class="fas fa-circle"></i> ${statusName}<button onclick="removeFilter('status', '${s}')">&times;</button></div>`;
    });
    
    activeFilters.dueDates.forEach(d => {
        const dueName = d === 'overdue' ? 'Overdue' : (d === 'today' ? 'Due Today' : 'This Week');
        badgeContainer.innerHTML += `<div class="filter-badge"><i class="fas fa-calendar"></i> ${dueName}<button onclick="removeFilter('dueDate', '${d}')">&times;</button></div>`;
    });
    
    activeFilters.assignees.forEach(a => {
        badgeContainer.innerHTML += `<div class="filter-badge"><i class="fas fa-user"></i> ${escapeHtml(a)}<button onclick="removeFilter('assignee', '${escapeHtml(a)}')">&times;</button></div>`;
    });
}

window.removeFilter = function(type, value) {
    if (type === 'priority') {
        activeFilters.priorities = activeFilters.priorities.filter(p => p !== value);
        document.querySelector(`.filter-priority[value="${value}"]`).checked = false;
    } else if (type === 'status') {
        activeFilters.statuses = activeFilters.statuses.filter(s => s !== value);
        document.querySelector(`.filter-status[value="${value}"]`).checked = false;
    } else if (type === 'dueDate') {
        activeFilters.dueDates = activeFilters.dueDates.filter(d => d !== value);
        document.querySelector(`.filter-due[value="${value}"]`).checked = false;
    } else if (type === 'assignee') {
        activeFilters.assignees = activeFilters.assignees.filter(a => a !== value);
        document.querySelector(`.filter-assignee[value="${value}"]`).checked = false;
    }
    updateFilterBadge();
    applySearchAndFilter();
};

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
    const labels = { overdue: `⚠️ Overdue: ${date}`, today: `📅 Today: ${date}`, week: `📆 Due: ${date}`, future: `📅 Due: ${date}` };
    return labels[status] || `📅 ${date}`;
}

function clearSearchAndReload() {
    const searchInput = document.getElementById('search-tasks');
    if (searchInput) {
        searchInput.value = '';
        searchTerm = '';
        document.getElementById('clear-search').style.display = 'none';
    }
    applySearchAndFilter();
}
window.clearSearchAndReload = clearSearchAndReload;

function applySearchAndFilter() {
    if (!allTasks) return;
    
    let tasks = allTasks.filter(task => {
        if (searchTerm) {
            const matchesTitle = task.title?.toLowerCase().includes(searchTerm);
            const matchesDesc = task.description?.toLowerCase().includes(searchTerm);
            const matchesTags = task.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
            if (!matchesTitle && !matchesDesc && !matchesTags) return false;
        }
        if (activeFilters.priorities.length > 0 && !activeFilters.priorities.includes(task.priority)) return false;
        if (activeFilters.statuses.length > 0) {
            const taskStatus = task.status || 'todo';
            if (!activeFilters.statuses.includes(taskStatus)) return false;
        }
        if (activeFilters.dueDates.length > 0) {
            const dueStatus = getDueDateStatus(task.dueDate);
            if (!activeFilters.dueDates.includes(dueStatus)) return false;
        }
        if (activeFilters.assignees.length > 0) {
            const taskAssignee = task.assignedTo || 'unassigned';
            if (!activeFilters.assignees.includes(taskAssignee)) return false;
        }
        return true;
    });
    
    tasks = sortTasks(tasks);
    filteredTasks = tasks;
    
    if (filteredTasks.length === 0 && searchTerm) {
        document.getElementById('board-view').innerHTML = `
            <div class="empty-state empty-search" style="width: 100%;">
                <i class="fas fa-search"></i>
                <h3>No matching tasks</h3>
                <p>No tasks found matching "${escapeHtml(searchTerm)}"</p>
                <button class="btn-secondary" onclick="clearSearchAndReload()"><i class="fas fa-undo"></i> Clear Search</button>
            </div>
        `;
        return;
    }
    
    renderBoard(filteredTasks);
}

// ============================================
// BOARD RENDERING
// ============================================

function renderBoard(tasks) {
    if (tasks.length === 0 && !searchTerm) {
        document.getElementById('board-view').innerHTML = `
            <div class="empty-state empty-tasks" style="width: 100%;">
                <i class="fas fa-tasks"></i>
                <h3>No tasks yet</h3>
                <p>Get started by creating your first task</p>
                <button class="btn-primary" onclick="openTaskModal()"><i class="fas fa-plus"></i> Create Task</button>
            </div>
        `;
        return;
    }
    
    const columns = {
        'todo': { title: 'To Do', tasks: [], icon: 'fa-circle', color: '#9ca3af' },
        'in-progress': { title: 'In Progress', tasks: [], icon: 'fa-spinner', color: '#3b82f6' },
        'done': { title: 'Done', tasks: [], icon: 'fa-check-circle', color: '#10b981' }
    };
    
    tasks.forEach(task => {
        const status = task.status || 'todo';
        if (columns[status]) columns[status].tasks.push(task);
    });
    
    const boardView = document.getElementById('board-view');
    boardView.innerHTML = '';
    
    Object.entries(columns).forEach(([status, column]) => {
        const columnElement = document.createElement('div');
        columnElement.className = 'board-column';
        columnElement.setAttribute('data-status', status);
        columnElement.innerHTML = `
            <div class="column-header">
                <span class="column-title"><i class="fas ${column.icon}" style="color: ${column.color}"></i> ${column.title}</span>
                <span class="column-count">${column.tasks.length}</span>
            </div>
            <div class="tasks-container" data-status="${status}">
                ${column.tasks.map(task => createTaskCard(task)).join('')}
            </div>
        `;
        boardView.appendChild(columnElement);
    });
    
    setupDragAndDrop();
    setupMobileDragAndDrop();
}

function createTaskCard(task) {
    const priorityClass = task.priority === 'high' ? 'priority-high' : (task.priority === 'medium' ? 'priority-medium' : 'priority-low');
    const priorityIcon = task.priority === 'high' ? 'fa-arrow-up' : (task.priority === 'medium' ? 'fa-minus' : 'fa-arrow-down');
    const safeTaskId = task.id.replace(/'/g, "\\'");
    const dueDateInfo = getDueDateDisplay(task.dueDate);
    const dueDateClass = task.dueDate ? getDueDateStatus(task.dueDate) : '';
    
    let highlightedTitle = escapeHtml(task.title);
    if (searchTerm) {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        highlightedTitle = highlightedTitle.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    
    const recurringBadge = task.recurringTemplateId ? 
        '<span class="recurrence-badge" title="Recurring Task"><i class="fas fa-redo-alt"></i></span>' : '';
    
    return `
        <div class="task-card" draggable="true" data-task-id="${task.id}" data-status="${task.status || 'todo'}" onclick="openTaskDetail('${safeTaskId}')">
            <div class="task-title">${highlightedTitle} ${recurringBadge}</div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description.substring(0, 100))}</div>` : ''}
            <div class="task-meta">
                <span class="priority ${priorityClass}"><i class="fas ${priorityIcon}"></i> ${task.priority || 'medium'}</span>
                ${dueDateInfo ? `<span class="task-due-date due-${dueDateClass}"><i class="fas fa-calendar-alt"></i> ${escapeHtml(dueDateInfo)}</span>` : ''}
                <span class="assignee"><i class="fas fa-user"></i> ${task.assignedTo ? escapeHtml(task.assignedTo.substring(0, 8)) : 'Unassigned'}</span>
                <button class="comment-btn" onclick="event.stopPropagation(); openTaskDetail('${safeTaskId}')"><i class="fas fa-comment"></i></button>
            </div>
        </div>
    `;
}

// ============================================
// DRAG AND DROP
// ============================================

let draggedTask = null;

function setupDragAndDrop() {
    document.querySelectorAll('.task-card').forEach(task => {
        task.setAttribute('draggable', 'true');
        task.addEventListener('dragstart', (e) => {
            draggedTask = task;
            e.dataTransfer.setData('text/plain', task.dataset.taskId);
            task.classList.add('dragging');
        });
        task.addEventListener('dragend', () => {
            task.classList.remove('dragging');
            draggedTask = null;
        });
    });
    
    document.querySelectorAll('.tasks-container').forEach(container => {
        container.addEventListener('dragover', (e) => e.preventDefault());
        container.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (!draggedTask) return;
            
            const newStatus = container.dataset.status;
            const taskId = draggedTask.dataset.taskId;
            const oldStatus = draggedTask.dataset.status;
            
            if (newStatus === oldStatus) return;
            
            const taskDoc = await db.collection('tasks').doc(taskId).get();
            const taskTitle = taskDoc.data()?.title || 'Unknown';
            
            try {
                await db.collection('tasks').doc(taskId).update({
                    status: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                await logActivity('update_task', 'task', taskId, taskTitle, { oldStatus, newStatus });
                showToast('Task moved', 'success');
                invalidateCache();
            } catch (error) {
                console.error('Error moving task:', error);
                showToast('Error moving task', 'error');
            }
        });
    });
}

// ============================================
// MOBILE DRAG AND DROP
// ============================================

let touchStartY = null, touchCurrentY = null, isDragging = false;

function setupMobileDragAndDrop() {
    if (window.innerWidth > 768) return;
    
    document.querySelectorAll('.task-card').forEach(task => {
        task.addEventListener('touchstart', (e) => {
            e.preventDefault();
            draggedTask = task;
            touchStartY = e.touches[0].clientY;
            isDragging = false;
            task.style.opacity = '0.5';
        });
        
        task.addEventListener('touchmove', (e) => {
            if (!draggedTask) return;
            e.preventDefault();
            touchCurrentY = e.touches[0].clientY;
            if (Math.abs(touchCurrentY - touchStartY) > 10) isDragging = true;
        });
        
        task.addEventListener('touchend', async (e) => {
            if (!draggedTask) return;
            e.preventDefault();
            
            if (isDragging) {
                const touch = e.changedTouches[0];
                const elementAtTouch = document.elementsFromPoint(touch.clientX, touch.clientY);
                const targetContainer = elementAtTouch.find(el => el.classList?.contains('tasks-container'));
                
                if (targetContainer) {
                    const newStatus = targetContainer.dataset.status;
                    const taskId = draggedTask.dataset.taskId;
                    const oldStatus = draggedTask.dataset.status;
                    
                    if (newStatus !== oldStatus) {
                        try {
                            await db.collection('tasks').doc(taskId).update({
                                status: newStatus,
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            showToast('Task moved', 'success');
                        } catch (error) {
                            showToast('Error moving task', 'error');
                        }
                    }
                }
            } else {
                const taskId = draggedTask.dataset.taskId;
                if (taskId) openTaskDetail(taskId);
            }
            
            draggedTask.style.opacity = '';
            draggedTask = null;
            isDragging = false;
        });
    });
}

// ============================================
// PULL TO REFRESH
// ============================================

let pullStartY = 0, isRefreshing = false, pullElement = null;

function setupPullToRefresh() {
    pullElement = document.getElementById('pull-to-refresh');
    if (!pullElement) return;
    
    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) pullStartY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchmove', (e) => {
        if (isRefreshing || window.scrollY > 0) return;
        const pullDistance = e.touches[0].clientY - pullStartY;
        if (pullDistance > 0 && pullDistance < 100) {
            e.preventDefault();
            pullElement.style.top = `${pullDistance - 60}px`;
            const icon = pullElement.querySelector('i');
            const span = pullElement.querySelector('span');
            if (pullDistance > 60) {
                icon.style.transform = 'rotate(180deg)';
                span.textContent = 'Release to refresh';
            } else {
                icon.style.transform = 'rotate(0deg)';
                span.textContent = 'Pull to refresh';
            }
        }
    });
    
    document.addEventListener('touchend', async () => {
        if (isRefreshing) return;
        const pullDistance = parseInt(pullElement.style.top) + 60;
        if (pullDistance > 60) await refreshData();
        pullElement.style.top = '-60px';
        pullElement.querySelector('i').style.transform = 'rotate(0deg)';
        pullElement.querySelector('span').textContent = 'Pull to refresh';
    });
}

async function refreshData() {
    if (isRefreshing) return;
    isRefreshing = true;
    pullElement.classList.add('refreshing');
    pullElement.querySelector('span').textContent = 'Refreshing...';
    pullElement.style.top = '0';
    
    try {
        await loadUserData();
        await loadOrganization();
        await loadTeamMembers();
        await loadProjectsOptimized();
        if (currentProject) await loadTasks();
        showToast('Data refreshed', 'success');
        trackAnalytics('data_refreshed', {});
    } catch (error) {
        console.error('Refresh error:', error);
        showToast('Error refreshing data', 'error');
    }
    
    isRefreshing = false;
    pullElement.classList.remove('refreshing');
    pullElement.style.top = '-60px';
    pullElement.querySelector('span').textContent = 'Pull to refresh';
}

// ============================================
// TASK DETAIL & COMMENTS
// ============================================

async function openTaskDetail(taskId) {
    currentTaskForComments = taskId;
    
    try {
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        if (!taskDoc.exists) {
            showToast('Task not found', 'error');
            return;
        }
        
        const task = { id: taskDoc.id, ...taskDoc.data() };
        
        document.getElementById('edit-task-id').value = task.id;
        document.getElementById('edit-task-title').value = task.title || '';
        document.getElementById('edit-task-description').value = task.description || '';
        document.getElementById('edit-task-priority').value = task.priority || 'medium';
        updateAssigneeDropdowns();
        document.getElementById('edit-task-assignee').value = task.assignedTo || '';
        document.getElementById('edit-task-due-date').value = task.dueDate || '';
        document.getElementById('edit-task-estimate').value = task.estimatedHours || 0;
        document.getElementById('edit-task-tags').value = task.tags ? task.tags.join(', ') : '';
        document.getElementById('comment-task-title').textContent = `Task: ${task.title}`;
        
        initializeTaskDetailFeatures(taskId);
        
        await loadComments(taskId);
        
        const modal = document.getElementById('comment-modal');
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        trackAnalytics('task_detail_opened', {});
    } catch (error) {
        console.error('Error opening task detail:', error);
        showToast('Error loading task details', 'error');
    }
}

function initializeTaskDetailFeatures(taskId) {
    setTimeout(() => {
        const commentInput = document.getElementById('new-comment');
        if (commentInput && window.mentionsSystem) {
            window.mentionsSystem.initMentions(commentInput, {
                onMention: (mention) => {
                    console.log('👤 Mentioned:', mention.userName);
                    trackAnalytics('user_mentioned', { mentionedUserId: mention.userId });
                }
            });
        }
        
        const modalBody = document.querySelector('#comment-modal .modal-body');
        if (modalBody && !document.getElementById('attachments-container')) {
            const container = document.createElement('div');
            container.id = 'attachments-container';
            
            const commentsHeader = modalBody.querySelector('h4');
            if (commentsHeader) {
                modalBody.insertBefore(container, commentsHeader);
            } else {
                modalBody.appendChild(container);
            }
            
            if (window.AttachmentsManager) {
                const manager = new AttachmentsManager();
                manager.initAttachmentsUI('attachments-container', {
                    taskId: taskId,
                    onAttachmentAdded: (attachment) => {
                        trackAnalytics('attachment_added', { fileType: attachment.fileType });
                        logActivity('upload_attachment', 'attachment', taskId, attachment.fileName);
                    },
                    onAttachmentDeleted: () => trackAnalytics('attachment_deleted', {})
                });
                currentAttachmentsManager = manager;
            }
        }
    }, 100);
}

async function loadComments(taskId) {
    try {
        const commentsSnapshot = await db.collection('comments')
            .where('taskId', '==', taskId)
            .orderBy('createdAt', 'desc')
            .get();
        
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;
        
        if (commentsSnapshot.empty) {
            commentsList.innerHTML = '<div class="empty-state"><p><i class="fas fa-comments"></i><br>No comments yet</p></div>';
            return;
        }
        
        commentsList.innerHTML = '';
        commentsSnapshot.forEach(doc => {
            const comment = doc.data();
            const commentElement = document.createElement('div');
            commentElement.className = 'comment-item';
            
            let content = escapeHtml(comment.content);
            if (window.mentionsSystem) {
                content = window.mentionsSystem.highlightMentions(comment.content);
            }
            
            const time = comment.createdAt?.toDate() ? new Date(comment.createdAt.toDate()).toLocaleString() : 'Just now';
            
            commentElement.innerHTML = `
                <div class="comment-author"><i class="fas fa-user-circle"></i> ${escapeHtml(comment.userName || 'Anonymous')}</div>
                <div class="comment-content">${content}</div>
                <div class="comment-time"><i class="far fa-clock"></i> ${time}</div>
            `;
            commentsList.appendChild(commentElement);
        });
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

async function addComment(taskId, content) {
    if (!content.trim()) return false;
    
    try {
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        const task = taskDoc.data();
        
        if (window.mentionsSystem) {
            const mentions = window.mentionsSystem.extractMentions(content);
            if (mentions.length > 0) {
                await window.mentionsSystem.sendMentionNotifications(
                    taskId, task.title, mentions,
                    currentUser.displayName || currentUser.email
                );
            }
        }
        
        await db.collection('comments').add({
            taskId: taskId,
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email,
            content: content.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await logActivity('add_comment', 'comment', taskId, task.title, { content: content.substring(0, 50) });
        trackAnalytics('comment_added', {});
        
        if (task.createdBy !== currentUser.uid) {
            const ownerDoc = await db.collection('users').doc(task.createdBy).get();
            if (ownerDoc.exists) {
                const owner = ownerDoc.data();
                await notifyCommentOnTask(task.title, taskId, currentUser.displayName || currentUser.email, owner.email, owner.name);
            }
        }
        
        await loadComments(taskId);
        document.getElementById('new-comment').value = '';
        showToast('Comment added', 'success');
        return true;
    } catch (error) {
        console.error('Error adding comment:', error);
        showToast('Error adding comment', 'error');
        return false;
    }
}

// ============================================
// REAL-TIME SUBSCRIPTION
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
        }, (error) => console.error('Realtime subscription error:', error));
}

// ============================================
// UI EVENT LISTENERS
// ============================================

function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            const boardView = document.getElementById('board-view');
            const sprintsView = document.getElementById('sprints-view');
            const reportsView = document.getElementById('reports-view');
            const settingsView = document.getElementById('settings-view');
            
            [sprintsView, reportsView, settingsView].forEach(v => v?.classList.add('hidden'));
            if (boardView) boardView.style.display = 'none';
            
            if (view === 'board') {
                boardView.style.display = 'flex';
                document.getElementById('current-view').textContent = 'Board';
                currentView = 'board';
            } else if (view === 'sprints') {
                sprintsView.classList.remove('hidden');
                document.getElementById('current-view').textContent = 'Sprints';
                currentView = 'sprints';
                loadSprints();
            } else if (view === 'reports') {
                reportsView.classList.remove('hidden');
                document.getElementById('current-view').textContent = 'Reports';
                currentView = 'reports';
                loadReportsData();
            } else if (view === 'settings') {
                settingsView.classList.remove('hidden');
                document.getElementById('current-view').textContent = 'Settings';
                currentView = 'settings';
                loadSettingsView();
            }
        });
    });
    
    document.getElementById('task-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskData = {
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-description').value,
            priority: document.getElementById('task-priority').value,
            assignedTo: document.getElementById('task-assignee').value,
            dueDate: document.getElementById('task-due-date').value,
            estimatedHours: document.getElementById('task-estimate').value,
            tags: document.getElementById('task-tags').value
        };
        
        const success = await createTask(taskData);
        if (success) {
            closeTaskModal();
            document.getElementById('task-form').reset();
        }
    });
    
    document.getElementById('project-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const projectData = {
            name: document.getElementById('project-name').value,
            description: document.getElementById('project-description').value,
            color: document.getElementById('project-color')?.value
        };
        if (await createProject(projectData)) {
            closeProjectModal();
            document.getElementById('project-form').reset();
        }
    });
    
    document.getElementById('save-task-btn')?.addEventListener('click', async () => {
        const taskId = document.getElementById('edit-task-id').value;
        if (!taskId) return;
        
        const taskData = {
            title: document.getElementById('edit-task-title').value,
            description: document.getElementById('edit-task-description').value,
            priority: document.getElementById('edit-task-priority').value,
            assignedTo: document.getElementById('edit-task-assignee').value,
            dueDate: document.getElementById('edit-task-due-date').value,
            estimatedHours: document.getElementById('edit-task-estimate').value,
            tags: document.getElementById('edit-task-tags').value
        };
        
        if (!taskData.title) {
            showToast('Please enter a task title', 'warning');
            return;
        }
        
        if (await updateTask(taskId, taskData)) closeCommentModal();
    });
    
    document.getElementById('delete-task-btn')?.addEventListener('click', async () => {
        const taskId = document.getElementById('edit-task-id').value;
        const taskTitle = document.getElementById('edit-task-title').value;
        if (taskId) await deleteTaskWithUndo(taskId, { title: taskTitle, projectId: currentProject?.id });
    });
    
    const addCommentBtn = document.getElementById('add-comment-btn');
    if (addCommentBtn) {
        const newBtn = addCommentBtn.cloneNode(true);
        addCommentBtn.parentNode.replaceChild(newBtn, addCommentBtn);
        newBtn.addEventListener('click', async () => {
            const content = document.getElementById('new-comment').value;
            if (!content?.trim()) {
                showToast('Please enter a comment', 'warning');
                return;
            }
            if (!currentTaskForComments) {
                showToast('No task selected', 'error');
                return;
            }
            await addComment(currentTaskForComments, content);
        });
    }
    
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await auth.signOut();
        localStorage.removeItem('oriental_user');
        window.location.href = 'login.html';
    });
    
    document.getElementById('invite-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await sendInvite(document.getElementById('invite-email').value, document.getElementById('invite-role').value);
        closeInviteModal();
    });
    
    document.getElementById('activity-log-btn')?.addEventListener('click', openActivityLog);
    document.getElementById('mobile-activity-log-btn')?.addEventListener('click', openActivityLog);
    document.getElementById('close-activity-log')?.addEventListener('click', closeActivityLog);
    document.getElementById('activity-log-overlay')?.addEventListener('click', closeActivityLog);
}

// ============================================
// REPORTS EVENT LISTENERS
// ============================================

function setupReportsEventListeners() {
    document.getElementById('export-csv-btn')?.addEventListener('click', exportToCSV);
    document.getElementById('export-pdf-btn')?.addEventListener('click', exportToPDF);
    document.getElementById('report-date-range')?.addEventListener('change', loadReportsData);
    document.getElementById('refresh-reports-btn')?.addEventListener('click', () => {
        loadReportsData();
        showToast('Reports refreshed', 'success');
    });
}

// ============================================
// SETTINGS EVENT LISTENERS
// ============================================

function setupSettingsEventListeners() {
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`panel-${tabId}`).classList.add('active');
            currentSettingsTab = tabId;
            trackAnalytics('settings_tab_changed', { tab: tabId });
        });
    });
    
    document.getElementById('save-org-settings')?.addEventListener('click', saveOrganizationSettings);
    
    const prefInputs = ['theme-select', 'density-select', 'show-task-counts',
        'default-view-select', 'default-priority-select', 'auto-assign-tasks',
        'notify-task-assigned', 'notify-task-completed', 'notify-comment-mention',
        'notify-project-updates', 'notify-sprint-updates', 'digest-frequency', 'digest-time'];
    
    prefInputs.forEach(id => {
        document.getElementById(id)?.addEventListener('change', saveUserPreferences);
    });
    
    const slugInput = document.getElementById('org-slug-input');
    if (slugInput) {
        slugInput.addEventListener('input', (e) => {
            const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
            document.getElementById('slug-preview').textContent = slug || 'your-org';
        });
    }
    
    document.getElementById('leave-organization')?.addEventListener('click', leaveOrganization);
    document.getElementById('delete-organization')?.addEventListener('click', deleteOrganization);
    document.getElementById('export-all-data')?.addEventListener('click', exportAllData);
}

// ============================================
// MOBILE NAVIGATION
// ============================================

function setupMobileNavigation() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    
    const openSidebar = () => {
        sidebar?.classList.add('open');
        sidebarOverlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    };
    
    const closeSidebar = () => {
        sidebar?.classList.remove('open');
        sidebarOverlay?.classList.remove('active');
        document.body.style.overflow = '';
    };
    
    mobileMenuBtn?.addEventListener('click', openSidebar);
    sidebarCloseBtn?.addEventListener('click', closeSidebar);
    sidebarOverlay?.addEventListener('click', closeSidebar);
    
    const navItems = document.querySelectorAll('.nav-item');
    
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            
            document.querySelectorAll('.bottom-nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            navItems.forEach(nav => nav.classList.remove('active'));
            document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');
            
            const boardView = document.getElementById('board-view');
            const sprintsView = document.getElementById('sprints-view');
            const reportsView = document.getElementById('reports-view');
            const settingsView = document.getElementById('settings-view');
            
            [sprintsView, reportsView, settingsView].forEach(v => v?.classList.add('hidden'));
            if (boardView) boardView.style.display = 'none';
            
            if (view === 'board') {
                boardView.style.display = 'flex';
                document.getElementById('current-view').textContent = 'Board';
                currentView = 'board';
            } else if (view === 'sprints') {
                sprintsView.classList.remove('hidden');
                document.getElementById('current-view').textContent = 'Sprints';
                currentView = 'sprints';
                loadSprints();
            } else if (view === 'reports') {
                reportsView.classList.remove('hidden');
                document.getElementById('current-view').textContent = 'Reports';
                currentView = 'reports';
                loadReportsData();
            } else if (view === 'settings') {
                settingsView.classList.remove('hidden');
                document.getElementById('current-view').textContent = 'Settings';
                currentView = 'settings';
                loadSettingsView();
            }
        });
    });
    
    document.getElementById('bottom-add-btn')?.addEventListener('click', () => openTaskModal());
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) setTimeout(closeSidebar, 150);
        });
    });
}

// ============================================
// MODAL CONTROLS
// ============================================

function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
    document.getElementById('task-form')?.reset();
}

function closeProjectModal() {
    const modal = document.getElementById('project-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
    document.getElementById('project-form')?.reset();
}

function closeSprintModal() {
    const modal = document.getElementById('sprint-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
    document.getElementById('sprint-form')?.reset();
}

function closeCommentModal() {
    const modal = document.getElementById('comment-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
    const textarea = document.getElementById('new-comment');
    if (textarea) textarea.value = '';
}

function openTaskModal() {
    if (!currentProject) {
        showToast('Please select a project first', 'warning');
        return;
    }
    const modal = document.getElementById('task-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        updateAssigneeDropdowns();
        
        setTimeout(() => {
            if (window.recurringManager) {
                window.recurringManager.enhanceTaskForm();
            }
        }, 50);
    }
}

function openProjectModal() {
    const modal = document.getElementById('project-modal');
    if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
}

// ============================================
// UTILITIES
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================
// GLOBAL EXPORTS
// ============================================

window.openTaskDetail = openTaskDetail;
window.updateTask = updateTask;
window.removeFilter = removeFilter;
window.closeTaskModal = closeTaskModal;
window.closeProjectModal = closeProjectModal;
window.closeSprintModal = closeSprintModal;
window.closeCommentModal = closeCommentModal;
window.openTaskModal = openTaskModal;
window.openProjectModal = openProjectModal;
window.clearSearchAndReload = clearSearchAndReload;
window.deleteProjectWithUndo = deleteProjectWithUndo;
window.deleteTaskWithUndo = deleteTaskWithUndo;
window.openInviteModal = openInviteModal;
window.closeInviteModal = closeInviteModal;
window.closePendingInvitesModal = closePendingInvitesModal;
window.cancelInvite = cancelInvite;
window.toggleTheme = toggleTheme;
window.openActivityLog = openActivityLog;
window.closeActivityLog = closeActivityLog;
window.openTemplatesLibrary = openTemplatesLibrary;
window.exportChart = exportChart;

console.log('✅ Dashboard.js fully loaded - Phase 1 Ready!');