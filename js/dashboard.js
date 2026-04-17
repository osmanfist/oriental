/**
 * Oriental - Dashboard Module
 * Version: 2.8.0
 * 
 * Main application logic including task management, project handling,
 * real-time updates, drag-and-drop functionality, comments, search, filters,
 * sorting, assignee filtering (real users), mobile drag & drop, pull to refresh,
 * team invitations, sprints, and dark mode.
 */

// ============================================
// Global State Variables
// ============================================
// Undo Delete Variables
let deletedItem = null;
let deletedItemType = null;
let undoTimeout = null;
const UNDO_DURATION = 20000; // 20 seconds to undo
let currentUser = null;
let currentOrganization = null;
let currentProject = null;
let currentView = 'board';
let currentTaskForComments = null;
let unsubscribeTasks = null;
let allTasks = [];
let filteredTasks = [];
let searchTerm = '';
let currentSort = 'created-desc';
let teamMembers = [];
let activeFilters = {
    priorities: [],
    statuses: [],
    dueDates: [],
    assignees: []
};
let taskReloadTimeout = null;

// ============================================
// Dark Mode Functions
// ============================================

/**
 * Initialize dark mode from localStorage
 */
function initDarkMode() {
    // Check localStorage for theme preference
    const savedTheme = localStorage.getItem('oriental_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcons(true);
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeIcons(false);
    }
}

/**
 * Toggle dark/light mode
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const isDark = currentTheme === 'dark';
    
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('oriental_theme', 'light');
        updateThemeIcons(false);
        showToast('Light mode activated', 'info');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('oriental_theme', 'dark');
        updateThemeIcons(true);
        showToast('Dark mode activated', 'info');
    }
}

/**
 * Update theme toggle icons
 * @param {boolean} isDark - Whether dark mode is active
 */
function updateThemeIcons(isDark) {
    const themeToggles = document.querySelectorAll('.theme-toggle');
    themeToggles.forEach(toggle => {
        const icon = toggle.querySelector('i');
        if (icon) {
            if (isDark) {
                icon.className = 'fas fa-sun';
                toggle.title = 'Switch to Light Mode';
            } else {
                icon.className = 'fas fa-moon';
                toggle.title = 'Switch to Dark Mode';
            }
        }
    });
}

/**
 * Setup theme toggle event listeners
 */
function setupThemeToggle() {
    const themeToggles = document.querySelectorAll('.theme-toggle');
    themeToggles.forEach(toggle => {
        toggle.addEventListener('click', toggleTheme);
    });
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize dashboard when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Dashboard initializing...');
    initDarkMode();  // Initialize dark mode first
    await checkAuth();
    await loadUserData();
    await loadOrganization();
    await loadTeamMembers();
    await loadProjects();
    setupEventListeners();
    setupRealtimeSubscription();
    setupMobileNavigation();
    setupKeyboardShortcuts();
    setupSorting();
    setupPullToRefresh();
    setupThemeToggle();  // Setup theme toggle buttons
    console.log('✅ Dashboard ready!');
});

/**
 * Verify user is authenticated
 */
async function checkAuth() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                console.log('No user found, redirecting to login...');
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
// Loading Skeleton Functions
// ============================================

/**
 * Show project list skeleton
 */
function showProjectSkeleton() {
    const projectList = document.getElementById('project-list');
    if (!projectList) return;
    
    projectList.innerHTML = `
        <div class="project-skeleton">
            <div class="skeleton-color"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-count"></div>
        </div>
        <div class="project-skeleton">
            <div class="skeleton-color"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-count"></div>
        </div>
        <div class="project-skeleton">
            <div class="skeleton-color"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-count"></div>
        </div>
    `;
}

/**
 * Show board skeleton
 */
function showBoardSkeleton() {
    const boardView = document.getElementById('board-view');
    if (!boardView) return;
    
    boardView.innerHTML = `
        <div class="column-skeleton">
            <div class="skeleton-header"></div>
            <div class="skeleton-card">
                <div class="skeleton-card-title"></div>
                <div class="skeleton-card-meta"></div>
            </div>
            <div class="skeleton-card">
                <div class="skeleton-card-title"></div>
                <div class="skeleton-card-meta"></div>
            </div>
        </div>
        <div class="column-skeleton">
            <div class="skeleton-header"></div>
            <div class="skeleton-card">
                <div class="skeleton-card-title"></div>
                <div class="skeleton-card-meta"></div>
            </div>
        </div>
        <div class="column-skeleton">
            <div class="skeleton-header"></div>
            <div class="skeleton-card">
                <div class="skeleton-card-title"></div>
                <div class="skeleton-card-meta"></div>
            </div>
            <div class="skeleton-card">
                <div class="skeleton-card-title"></div>
                <div class="skeleton-card-meta"></div>
            </div>
        </div>
    `;
}

// ============================================
// Confirmation Dialog Functions
// ============================================

/**
 * Show custom confirmation dialog
 */
function showConfirmDialog(title, message, type = 'danger') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        
        const okButtonClass = type === 'danger' ? 'confirm-ok' : 'confirm-ok-success';
        const okButtonText = type === 'danger' ? 'Delete' : 'Confirm';
        
        dialog.innerHTML = `
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(message)}</p>
            <div class="confirm-dialog-actions">
                <button class="confirm-cancel">Cancel</button>
                <button class="${okButtonClass}">${okButtonText}</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        const cancelBtn = dialog.querySelector('.confirm-cancel');
        const okBtn = dialog.querySelector(`.${okButtonClass}`);
        
        const cleanup = () => {
            overlay.remove();
        };
        
        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
        });
        
        okBtn.addEventListener('click', () => {
            cleanup();
            resolve(true);
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(false);
            }
        });
    });
}

// ============================================
// Team Members (Real Assignees)
// ============================================

/**
 * Load all team members from current organization
 */
async function loadTeamMembers() {
    if (!currentOrganization) return;
    
    try {
        console.log('Loading team members for organization:', currentOrganization);
        
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
        
        const currentUserInList = teamMembers.some(m => m.id === currentUser.uid);
        if (!currentUserInList) {
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

/**
 * Update all assignee dropdowns in forms
 */
function updateAssigneeDropdowns() {
    const taskAssignee = document.getElementById('task-assignee');
    if (taskAssignee) {
        taskAssignee.innerHTML = '<option value="">Unassigned</option>';
        teamMembers.forEach(member => {
            taskAssignee.innerHTML += `<option value="${escapeHtml(member.name)}">${escapeHtml(member.name)} (${escapeHtml(member.email)})</option>`;
        });
    }
    
    const editAssignee = document.getElementById('edit-task-assignee');
    if (editAssignee) {
        const currentValue = editAssignee.value;
        editAssignee.innerHTML = '<option value="">Unassigned</option>';
        teamMembers.forEach(member => {
            editAssignee.innerHTML += `<option value="${escapeHtml(member.name)}">${escapeHtml(member.name)} (${escapeHtml(member.email)})</option>`;
        });
        if (currentValue) editAssignee.value = currentValue;
    }
}

/**
 * Load team members display in sidebar
 */
async function loadTeamMembersDisplay() {
    if (!currentOrganization) return;
    
    try {
        const usersSnapshot = await db.collection('users')
            .where('organizations', 'array-contains', currentOrganization)
            .get();
        
        const teamContainer = document.getElementById('team-members-list');
        if (!teamContainer) return;
        
        teamContainer.innerHTML = '';
        
        const members = [];
        usersSnapshot.forEach(doc => {
            members.push({ id: doc.id, ...doc.data() });
        });
        
        const inviteHeader = document.querySelector('.invite-header h3');
        if (inviteHeader) {
            inviteHeader.innerHTML = `<i class="fas fa-user-plus"></i> Team Members (${members.length})`;
        }
        
        members.forEach(member => {
            const isCurrentUser = member.id === currentUser.uid;
            const memberDiv = document.createElement('div');
            memberDiv.className = 'team-member-item';
            memberDiv.innerHTML = `
                <div class="team-member-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="team-member-info">
                    <div class="team-member-name">${escapeHtml(member.name || member.email)}</div>
                    <div class="team-member-email">${escapeHtml(member.email)}</div>
                </div>
                ${isCurrentUser ? '<span class="team-member-badge">You</span>' : ''}
            `;
            teamContainer.appendChild(memberDiv);
        });
        
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
// Invite Functions
// ============================================

// Initialize EmailJS
emailjs.init('8gIppIfexFw6yYhyo');

/**
 * Open invite modal
 */
function openInviteModal() {
    const modal = document.getElementById('invite-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

/**
 * Close invite modal
 */
function closeInviteModal() {
    const modal = document.getElementById('invite-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    const form = document.getElementById('invite-form');
    if (form) form.reset();
}

/**
 * Send invitation via EmailJS
 */
async function sendInvite(email, role) {
    if (!currentOrganization) {
        showToast('No organization found', 'error');
        return false;
    }
    
    // Get organization name
    const orgName = document.getElementById('org-name').textContent;
    
    // Show loading state
    const submitBtn = document.querySelector('#invite-form button[type="submit"]');
    const originalText = submitBtn?.innerHTML;
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        submitBtn.disabled = true;
    }
    
    try {
        // Generate unique token
        const token = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        
        // Calculate expiration (7 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        // Create invite in Firestore
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
        
        // Generate invite link
        const inviteLink = `${window.location.origin}/accept-invite.html?token=${token}`;
        
        // Prepare email template parameters
        const templateParams = {
            to_email: email,
            inviter_name: currentUser.displayName || currentUser.email.split('@')[0],
            organization_name: orgName,
            role: role === 'admin' ? 'Admin' : (role === 'member' ? 'Member' : 'Viewer'),
            invite_link: inviteLink,
            expires_in: '7 days'
        };
        
        // Send email via EmailJS
        const result = await emailjs.send(
            'service_oriental_0126',
            'oriental_invite',
            templateParams
        );
        
        console.log('Email sent:', result);
        
        showToast(`Invitation sent to ${email}!`, 'success');
        
        // Refresh pending invites list
        loadPendingInvites();
        
        return true;
        
    } catch (error) {
        console.error('Error sending invite:', error);
        
        if (error.text) {
            showToast('Failed to send email. Check EmailJS configuration.', 'error');
        } else {
            showToast('Error sending invite: ' + error.message, 'error');
        }
        
        return false;
        
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

/**
 * Load pending invites
 */
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
                <div class="pending-invite-email">
                    <i class="fas fa-envelope"></i> ${escapeHtml(invite.email)}
                </div>
                <div class="pending-invite-details">
                    <span class="pending-invite-role">${escapeHtml(invite.role)}</span>
                    <span class="pending-invite-date">Invited ${new Date(invite.createdAt?.toDate()).toLocaleDateString()}</span>
                    ${isExpired ? '<span class="pending-invite-expired">Expired</span>' : ''}
                </div>
                <button class="cancel-invite-btn" onclick="cancelInvite('${doc.id}')">
                    <i class="fas fa-times"></i> Cancel
                </button>
            `;
            pendingList.appendChild(inviteDiv);
        });
        
    } catch (error) {
        console.error('Error loading pending invites:', error);
    }
}

/**
 * Open pending invites modal
 */
function openPendingInvitesModal() {
    loadPendingInvites();
    const modal = document.getElementById('pending-invites-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

/**
 * Close pending invites modal
 */
function closePendingInvitesModal() {
    const modal = document.getElementById('pending-invites-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

/**
 * Cancel an invite
 */
async function cancelInvite(inviteId) {
    if (!confirm('Cancel this invitation?')) return;
    
    try {
        await db.collection('invites').doc(inviteId).update({
            status: 'cancelled'
        });
        showToast('Invitation cancelled', 'success');
        loadPendingInvites();
    } catch (error) {
        console.error('Error cancelling invite:', error);
        showToast('Error cancelling invite', 'error');
    }
}

// ============================================
// Data Loading Functions - FIXED
// ============================================

/**
 * Load user data from Firestore - FIXED VERSION
 */
async function loadUserData() {
    try {
        console.log('Loading user data for UID:', currentUser.uid);
        
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            currentOrganization = userData.currentOrganization;
            console.log('Organization loaded:', currentOrganization);
            
            const orgNameElement = document.getElementById('org-name');
            if (orgNameElement) {
                orgNameElement.textContent = userData.name || currentUser.email;
            }
            
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = userData.name || currentUser.displayName || 'User';
            }
            
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) {
                userEmailElement.textContent = currentUser.email;
            }
            
            if (currentOrganization) {
                await loadProjects();
            }
            
        } else {
            console.warn('User document not found, attempting to create...');
            
            // Update UI with fallback data
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = currentUser.displayName || currentUser.email.split('@')[0];
            }
            
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) {
                userEmailElement.textContent = currentUser.email;
            }
            
            // Try to create missing user document
            await createMissingUserDocument();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
    }
}

/**
 * Create missing user document (for users without one)
 */
async function createMissingUserDocument() {
    try {
        console.log('Creating missing user document for:', currentUser.uid);
        
        // Check if user already has any organizations
        const orgsSnapshot = await db.collection('organizations')
            .where('members', 'array-contains', currentUser.uid)
            .get();
        
        let orgId;
        
        if (!orgsSnapshot.empty) {
            orgId = orgsSnapshot.docs[0].id;
            console.log('Found existing organization:', orgId);
        } else {
            // Create new organization
            const orgName = prompt('Welcome! Please enter your organization name:', 'My Team');
            if (!orgName) {
                console.log('No organization name provided');
                return;
            }
            
            const orgRef = await db.collection('organizations').add({
                name: orgName,
                slug: generateSlug(orgName),
                createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                members: [currentUser.uid],
                settings: { defaultView: 'board', theme: 'light' }
            });
            orgId = orgRef.id;
            console.log('Organization created:', orgId);
            
            // Create default project
            await db.collection('projects').add({
                name: 'Getting Started',
                description: 'Welcome to Oriental! This is your first project.',
                organizationId: orgId,
                createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isArchived: false,
                color: '#16a34a'
            });
            console.log('Default project created');
        }
        
        // Create user document
        await db.collection('users').doc(currentUser.uid).set({
            name: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email,
            currentOrganization: orgId,
            organizations: [orgId],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            preferences: { notifications: true, emailDigest: 'daily' }
        });
        
        currentOrganization = orgId;
        console.log('User document created successfully');
        
        const orgNameElement = document.getElementById('org-name');
        if (orgNameElement) {
            orgNameElement.textContent = currentUser.displayName || currentUser.email.split('@')[0];
        }
        
        await loadProjects();
        showToast('Organization created successfully', 'success');
        
    } catch (error) {
        console.error('Error creating user document:', error);
        showToast('Error setting up your account: ' + error.message, 'error');
    }
}

/**
 * Generate slug from text
 */
function generateSlug(text) {
    if (!text) return 'my-team';
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Load organization details
 */
async function loadOrganization() {
    if (!currentOrganization) return;
    
    try {
        console.log('Loading organization:', currentOrganization);
        const orgDoc = await db.collection('organizations').doc(currentOrganization).get();
        
        if (orgDoc.exists) {
            const orgData = orgDoc.data();
            const orgNameElement = document.getElementById('org-name');
            if (orgNameElement) {
                orgNameElement.textContent = orgData.name;
            }
            console.log('Organization loaded:', orgData.name);
        }
    } catch (error) {
        console.error('Error loading organization:', error);
    }
}

/**
 * Load all projects for current organization
 */
async function loadProjects() {
    if (!currentOrganization) {
        console.log('No currentOrganization, skipping loadProjects');
        return;
    }
    
    showProjectSkeleton();
    
    try {
        const projectsSnapshot = await db.collection('projects')
            .where('organizationId', '==', currentOrganization)
            .where('isArchived', '==', false)
            .get();
        
        const projectList = document.getElementById('project-list');
        if (!projectList) return;
        
        projectList.innerHTML = '';
        
        const projects = [];
        projectsSnapshot.forEach(doc => {
            projects.push({ id: doc.id, ...doc.data() });
        });
        
        projects.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return b.createdAt.toDate() - a.createdAt.toDate();
            }
            return 0;
        });
        
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
        
        if (projects.length > 0 && !currentProject) {
            selectProject(projects[0]);
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        showToast('Error loading projects', 'error');
    }
}

/**
 * Create project list item element with delete button
 */
function createProjectElement(project) {
    const div = document.createElement('div');
    div.className = `project-item ${currentProject && currentProject.id === project.id ? 'active' : ''}`;
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
        if (!e.target.closest('.delete-project-btn')) {
            selectProject(project);
        }
    });
    return div;
}

/**
 * Load task count for a project and update UI
 */
async function loadTaskCount(projectId, projectElement) {
    try {
        const tasksSnapshot = await db.collection('tasks')
            .where('projectId', '==', projectId)
            .get();
        
        const countSpan = projectElement.querySelector('.project-count');
        if (countSpan) {
            countSpan.textContent = tasksSnapshot.size;
        }
    } catch (error) {
        console.error('Error loading task count:', error);
    }
}

/**
 * Select a project and load its tasks
 */
async function selectProject(project) {
    currentProject = project;
    console.log('Project selected:', project.name);
    
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-project-id') === project.id) {
            item.classList.add('active');
        }
    });
    
    const headerTitle = document.querySelector('.dashboard-header h1');
    if (headerTitle) {
        headerTitle.textContent = project.name;
    }
    
    await loadTasks(true);
}

/**
 * Load tasks for current project
 */
async function loadTasks(showSkeleton = true) {
    if (!currentProject) return;
    
    if (unsubscribeTasks) {
        unsubscribeTasks();
    }
    
    if (showSkeleton) {
        showBoardSkeleton();
    }
    
    try {
        const tasksSnapshot = await db.collection('tasks')
            .where('projectId', '==', currentProject.id)
            .get();
        
        allTasks = [];
        tasksSnapshot.forEach(doc => {
            allTasks.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`Loaded ${allTasks.length} tasks`);
        
        loadAssigneeFilters();
        applySearchAndFilter();
        
        setupRealtimeSubscription();
        setupSearchAndFilter();
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        if (showSkeleton) {
            showToast('Error loading tasks', 'error');
            const boardView = document.getElementById('board-view');
            if (boardView) {
                boardView.innerHTML = '<div class="empty-state"><p><i class="fas fa-exclamation-triangle"></i><br>Error loading tasks. Please refresh.</p></div>';
            }
        }
    }
}

// ============================================
// Task Sorting Functions
// ============================================

function sortTasks(tasks) {
    const sorted = [...tasks];
    
    switch(currentSort) {
        case 'priority-desc':
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            sorted.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
            break;
        case 'priority-asc':
            const priorityOrderAsc = { high: 3, medium: 2, low: 1 };
            sorted.sort((a, b) => (priorityOrderAsc[a.priority] || 0) - (priorityOrderAsc[b.priority] || 0));
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
            sorted.sort((a, b) => {
                if (!a.createdAt && !b.createdAt) return 0;
                if (!a.createdAt) return 1;
                if (!b.createdAt) return -1;
                return a.createdAt.toDate() - b.createdAt.toDate();
            });
            break;
        case 'created-desc':
        default:
            sorted.sort((a, b) => {
                if (!a.createdAt && !b.createdAt) return 0;
                if (!a.createdAt) return 1;
                if (!b.createdAt) return -1;
                return b.createdAt.toDate() - a.createdAt.toDate();
            });
            break;
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
                
                const sortIcon = sortBtn?.querySelector('i');
                if (sortIcon) {
                    const iconMap = {
                        'priority-desc': 'fa-arrow-down',
                        'priority-asc': 'fa-arrow-up',
                        'due-date-asc': 'fa-calendar-alt',
                        'due-date-desc': 'fa-calendar-alt',
                        'created-desc': 'fa-clock',
                        'created-asc': 'fa-clock'
                    };
                    sortIcon.className = `fas ${iconMap[sortValue] || 'fa-sort-amount-down'}`;
                }
                
                sortDropdown.classList.remove('show');
                applySearchAndFilter();
            }
        });
    });
}

// ============================================
// Assignee Filter Functions
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
// Search and Filter Functions
// ============================================

function setupSearchAndFilter() {
    const searchInput = document.getElementById('search-tasks');
    const clearSearch = document.getElementById('clear-search');
    
    if (searchInput) {
        searchInput.removeEventListener('input', handleSearchInput);
        searchInput.addEventListener('input', handleSearchInput);
    }
    
    if (clearSearch) {
        clearSearch.removeEventListener('click', handleClearSearch);
        clearSearch.addEventListener('click', handleClearSearch);
    }
    
    const filterBtn = document.getElementById('filter-btn');
    const filterDropdown = document.getElementById('filter-dropdown');
    
    if (filterBtn) {
        filterBtn.removeEventListener('click', handleFilterBtnClick);
        filterBtn.addEventListener('click', handleFilterBtnClick);
        document.removeEventListener('click', handleOutsideClick);
        document.addEventListener('click', handleOutsideClick);
    }
    
    const applyFilters = document.getElementById('apply-filters');
    if (applyFilters) {
        applyFilters.removeEventListener('click', handleApplyFilters);
        applyFilters.addEventListener('click', handleApplyFilters);
    }
    
    const clearFilters = document.getElementById('clear-filters');
    if (clearFilters) {
        clearFilters.removeEventListener('click', handleClearFilters);
        clearFilters.addEventListener('click', handleClearFilters);
    }
}

function handleSearchInput(e) {
    searchTerm = e.target.value.toLowerCase();
    const clearSearch = document.getElementById('clear-search');
    if (clearSearch) {
        clearSearch.style.display = searchTerm ? 'block' : 'none';
    }
    applySearchAndFilter();
}

function handleClearSearch() {
    const searchInput = document.getElementById('search-tasks');
    if (searchInput) {
        searchInput.value = '';
        searchTerm = '';
    }
    const clearSearch = document.getElementById('clear-search');
    if (clearSearch) {
        clearSearch.style.display = 'none';
    }
    applySearchAndFilter();
}

function handleFilterBtnClick(e) {
    e.stopPropagation();
    const filterDropdown = document.getElementById('filter-dropdown');
    if (filterDropdown) {
        filterDropdown.classList.toggle('show');
    }
}

function handleOutsideClick(e) {
    const filterBtn = document.getElementById('filter-btn');
    const filterDropdown = document.getElementById('filter-dropdown');
    if (filterDropdown && filterBtn && !filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
        filterDropdown.classList.remove('show');
    }
}

function handleApplyFilters() {
    activeFilters.priorities = Array.from(document.querySelectorAll('.filter-priority:checked')).map(cb => cb.value);
    activeFilters.statuses = Array.from(document.querySelectorAll('.filter-status:checked')).map(cb => cb.value);
    activeFilters.dueDates = Array.from(document.querySelectorAll('.filter-due:checked')).map(cb => cb.value);
    activeFilters.assignees = Array.from(document.querySelectorAll('.filter-assignee:checked')).map(cb => cb.value);
    
    const filterDropdown = document.getElementById('filter-dropdown');
    if (filterDropdown) {
        filterDropdown.classList.remove('show');
    }
    updateFilterBadge();
    applySearchAndFilter();
}

function handleClearFilters() {
    document.querySelectorAll('.filter-priority, .filter-status, .filter-due, .filter-assignee').forEach(cb => cb.checked = false);
    activeFilters = { priorities: [], statuses: [], dueDates: [], assignees: [] };
    updateFilterBadge();
    applySearchAndFilter();
}

function updateFilterBadge() {
    let badgeContainer = document.getElementById('active-filters');
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
        const checkbox = document.querySelector(`.filter-priority[value="${value}"]`);
        if (checkbox) checkbox.checked = false;
    } else if (type === 'status') {
        activeFilters.statuses = activeFilters.statuses.filter(s => s !== value);
        const checkbox = document.querySelector(`.filter-status[value="${value}"]`);
        if (checkbox) checkbox.checked = false;
    } else if (type === 'dueDate') {
        activeFilters.dueDates = activeFilters.dueDates.filter(d => d !== value);
        const checkbox = document.querySelector(`.filter-due[value="${value}"]`);
        if (checkbox) checkbox.checked = false;
    } else if (type === 'assignee') {
        activeFilters.assignees = activeFilters.assignees.filter(a => a !== value);
        const checkbox = document.querySelector(`.filter-assignee[value="${value}"]`);
        if (checkbox) checkbox.checked = false;
    }
    updateFilterBadge();
    applySearchAndFilter();
};

function getDueDateStatus(dueDate) {
    if (!dueDate) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
    if (due.getTime() === today.getTime()) return 'today';
    const weekFromNow = new Date(today);
    weekFromNow.setDate(today.getDate() + 7);
    if (due <= weekFromNow) return 'week';
    return 'future';
}

function getDueDateDisplay(dueDate) {
    if (!dueDate) return null;
    const status = getDueDateStatus(dueDate);
    const date = new Date(dueDate).toLocaleDateString();
    const labels = { overdue: `⚠️ Overdue: ${date}`, today: `📅 Today: ${date}`, week: `📆 Due: ${date}`, future: `📅 Due: ${date}` };
    return labels[status];
}

function clearSearchAndReload() {
    const searchInput = document.getElementById('search-tasks');
    if (searchInput) {
        searchInput.value = '';
        searchTerm = '';
        const clearSearch = document.getElementById('clear-search');
        if (clearSearch) clearSearch.style.display = 'none';
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
        const boardView = document.getElementById('board-view');
        if (boardView) {
            boardView.innerHTML = `<div class="empty-state empty-search" style="width: 100%;"><i class="fas fa-search"></i><h3>No matching tasks</h3><p>No tasks found matching "${escapeHtml(searchTerm)}"</p><button class="btn-secondary" onclick="clearSearchAndReload()"><i class="fas fa-undo"></i> Clear Search</button></div>`;
        }
        return;
    }
    
    renderBoard(filteredTasks);
}

// ============================================
// Render Functions
// ============================================

function renderBoard(tasks) {
    if (tasks.length === 0 && !searchTerm) {
        const boardView = document.getElementById('board-view');
        if (boardView) {
            boardView.innerHTML = `<div class="empty-state empty-tasks" style="width: 100%;"><i class="fas fa-tasks"></i><h3>No tasks yet</h3><p>Get started by creating your first task</p><button class="btn-primary" onclick="openTaskModal()"><i class="fas fa-plus"></i> Create Task</button></div>`;
        }
        return;
    }
    
    const columns = { 'todo': { title: 'To Do', tasks: [], icon: 'fa-circle', color: '#9ca3af' }, 'in-progress': { title: 'In Progress', tasks: [], icon: 'fa-spinner', color: '#3b82f6' }, 'done': { title: 'Done', tasks: [], icon: 'fa-check-circle', color: '#10b981' } };
    
    tasks.forEach(task => {
        const status = task.status || 'todo';
        if (columns[status]) columns[status].tasks.push(task);
    });
    
    const boardView = document.getElementById('board-view');
    if (!boardView) return;
    
    boardView.innerHTML = '';
    for (const [key, column] of Object.entries(columns)) {
        const columnElement = createColumnElement(key, column);
        boardView.appendChild(columnElement);
    }
    setupDragAndDrop();
    setupMobileDragAndDrop();
}

function createColumnElement(status, column) {
    const columnDiv = document.createElement('div');
    columnDiv.className = 'board-column';
    columnDiv.setAttribute('data-status', status);
    columnDiv.innerHTML = `<div class="column-header"><span class="column-title"><i class="fas ${column.icon}" style="color: ${column.color}"></i> ${column.title}</span><span class="column-count">${column.tasks.length}</span></div><div class="tasks-container" data-status="${status}">${column.tasks.map(task => createTaskCard(task)).join('')}</div>`;
    return columnDiv;
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
    return `<div class="task-card" draggable="true" data-task-id="${task.id}" data-status="${task.status || 'todo'}" onclick="openTaskDetail('${safeTaskId}')"><div class="task-title">${highlightedTitle}</div>${task.description ? `<div class="task-description">${escapeHtml(task.description.substring(0, 100))}</div>` : ''}<div class="task-meta"><span class="priority ${priorityClass}"><i class="fas ${priorityIcon}"></i> ${task.priority || 'medium'}</span>${dueDateInfo ? `<span class="task-due-date due-${dueDateClass}"><i class="fas fa-calendar-alt"></i> ${escapeHtml(dueDateInfo)}</span>` : ''}<span class="assignee"><i class="fas fa-user"></i> ${task.assignedTo ? escapeHtml(task.assignedTo.substring(0, 8)) : 'Unassigned'}</span><button class="comment-btn" onclick="event.stopPropagation(); openTaskDetail('${safeTaskId}')"><i class="fas fa-comment"></i></button></div></div>`;
}

// ============================================
// Drag and Drop
// ============================================

let draggedTask = null;

function setupDragAndDrop() {
    const tasks = document.querySelectorAll('.task-card');
    const containers = document.querySelectorAll('.tasks-container');
    
    tasks.forEach(task => {
        task.setAttribute('draggable', 'true');
        task.removeEventListener('dragstart', handleDragStart);
        task.removeEventListener('dragend', handleDragEnd);
        task.addEventListener('dragstart', handleDragStart);
        task.addEventListener('dragend', handleDragEnd);
    });
    
    containers.forEach(container => {
        container.removeEventListener('dragover', handleDragOver);
        container.removeEventListener('drop', handleDrop);
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedTask = this;
    e.dataTransfer.setData('text/plain', this.dataset.taskId);
    e.dataTransfer.effectAllowed = 'move';
    this.classList.add('dragging');
    this.style.opacity = '0.5';
}

function handleDragEnd(e) {
    if (draggedTask) {
        draggedTask.classList.remove('dragging');
        draggedTask.style.opacity = '';
    }
    draggedTask = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

async function handleDrop(e) {
    e.preventDefault();
    const container = e.target.closest('.tasks-container');
    if (!container || !draggedTask) return;
    const newStatus = container.dataset.status;
    const taskId = draggedTask.dataset.taskId;
    const oldStatus = draggedTask.dataset.status;
    if (newStatus === oldStatus) return;
    try {
        await db.collection('tasks').doc(taskId).update({ status: newStatus, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        showToast('Task status updated', 'success');
    } catch (error) {
        console.error('Error updating task status:', error);
        showToast('Error updating task', 'error');
    }
}

// ============================================
// Mobile Drag and Drop
// ============================================

let touchStartY = null, touchCurrentY = null, isDragging = false;

function setupMobileDragAndDrop() {
    if (window.innerWidth > 768) return;
    const tasks = document.querySelectorAll('.task-card');
    tasks.forEach(task => {
        task.removeEventListener('touchstart', handleTouchStart);
        task.removeEventListener('touchmove', handleTouchMove);
        task.removeEventListener('touchend', handleTouchEnd);
        task.addEventListener('touchstart', handleTouchStart);
        task.addEventListener('touchmove', handleTouchMove);
        task.addEventListener('touchend', handleTouchEnd);
    });
}

function handleTouchStart(e) {
    e.preventDefault();
    draggedTask = this;
    touchStartY = e.touches[0].clientY;
    isDragging = false;
    this.style.opacity = '0.5';
    this.style.transition = 'opacity 0.2s';
}

function handleTouchMove(e) {
    if (!draggedTask) return;
    e.preventDefault();
    touchCurrentY = e.touches[0].clientY;
    const deltaY = Math.abs(touchCurrentY - touchStartY);
    if (deltaY > 10 && !isDragging) isDragging = true;
    if (isDragging) {
        const touch = e.touches[0];
        const elementAtTouch = document.elementsFromPoint(touch.clientX, touch.clientY);
        for (const element of elementAtTouch) {
            if (element.classList && element.classList.contains('tasks-container')) {
                document.querySelectorAll('.tasks-container').forEach(container => container.classList.remove('drag-over'));
                element.classList.add('drag-over');
                break;
            }
        }
    }
}

async function handleTouchEnd(e) {
    if (!draggedTask) { resetDrag(); return; }
    e.preventDefault();
    if (isDragging) {
        const touch = e.changedTouches[0];
        const elementAtTouch = document.elementsFromPoint(touch.clientX, touch.clientY);
        let targetContainer = null;
        for (const element of elementAtTouch) {
            if (element.classList && element.classList.contains('tasks-container')) { targetContainer = element; break; }
        }
        if (targetContainer) {
            const newStatus = targetContainer.dataset.status;
            const taskId = draggedTask.dataset.taskId;
            const oldStatus = draggedTask.dataset.status;
            if (newStatus !== oldStatus) {
                try {
                    await db.collection('tasks').doc(taskId).update({ status: newStatus, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
                    showToast('Task moved', 'success');
                } catch (error) { console.error('Error updating task status:', error); showToast('Error moving task', 'error'); }
            }
        }
    } else {
        const taskId = draggedTask.dataset.taskId;
        if (taskId) openTaskDetail(taskId);
    }
    resetDrag();
}

function resetDrag() {
    if (draggedTask) { draggedTask.style.opacity = ''; draggedTask.style.transition = ''; }
    draggedTask = null;
    touchStartY = null;
    touchCurrentY = null;
    isDragging = false;
    document.querySelectorAll('.tasks-container').forEach(container => container.classList.remove('drag-over'));
}

// ============================================
// Pull to Refresh
// ============================================

let pullStartY = 0, isRefreshing = false, pullElement = null;

function setupPullToRefresh() {
    pullElement = document.getElementById('pull-to-refresh');
    if (!pullElement) return;
    document.addEventListener('touchstart', (e) => { if (window.scrollY === 0) pullStartY = e.touches[0].clientY; });
    document.addEventListener('touchmove', (e) => {
        if (isRefreshing || window.scrollY > 0) return;
        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - pullStartY;
        if (pullDistance > 0 && pullDistance < 100) {
            e.preventDefault();
            pullElement.style.top = `${pullDistance - 60}px`;
            if (pullDistance > 60) { pullElement.querySelector('i').style.transform = 'rotate(180deg)'; pullElement.querySelector('span').textContent = 'Release to refresh'; }
            else { pullElement.querySelector('i').style.transform = 'rotate(0deg)'; pullElement.querySelector('span').textContent = 'Pull to refresh'; }
        }
    });
    document.addEventListener('touchend', async (e) => {
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
        await loadProjects();
        if (currentProject) await loadTasks();
        showToast('Data refreshed', 'success');
    } catch (error) { console.error('Refresh error:', error); showToast('Error refreshing data', 'error'); }
    isRefreshing = false;
    pullElement.classList.remove('refreshing');
    pullElement.style.top = '-60px';
    pullElement.querySelector('span').textContent = 'Pull to refresh';
}

// ============================================
// Task CRUD Operations
// ============================================

async function createTask(taskData) {
    if (!currentProject) { showToast('Please select a project first', 'warning'); return false; }
    if (!taskData.title) { showToast('Please enter a task title', 'warning'); return false; }
    try {
        let assigneeId = null, assigneeName = taskData.assignedTo || null;
        if (assigneeName && assigneeName !== 'Unassigned' && assigneeName !== '') {
            const matchedMember = teamMembers.find(m => m.name === assigneeName);
            if (matchedMember) assigneeId = matchedMember.id;
        }
        const task = {
            projectId: currentProject.id, title: taskData.title, description: taskData.description || '',
            priority: taskData.priority || 'medium', status: 'todo', assignedTo: assigneeName, assignedToId: assigneeId,
            dueDate: taskData.dueDate || null, estimatedHours: parseFloat(taskData.estimatedHours) || 0,
            tags: taskData.tags ? taskData.tags.split(',').map(t => t.trim()) : [], order: Date.now(),
            createdBy: currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('tasks').add(task);
        showToast('Task created successfully', 'success');
        return true;
    } catch (error) { console.error('Error creating task:', error); showToast('Error creating task: ' + error.message, 'error'); return false; }
}

async function updateTask(taskId, taskData) {
    try {
        let assigneeId = null, assigneeName = taskData.assignedTo || null;
        if (assigneeName && assigneeName !== 'Unassigned' && assigneeName !== '') {
            const matchedMember = teamMembers.find(m => m.name === assigneeName);
            if (matchedMember) assigneeId = matchedMember.id;
        }
        const updateData = {
            title: taskData.title, description: taskData.description || '',
            priority: taskData.priority || 'medium', assignedTo: assigneeName, assignedToId: assigneeId,
            dueDate: taskData.dueDate || null, estimatedHours: parseFloat(taskData.estimatedHours) || 0,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (taskData.tags) updateData.tags = taskData.tags.split(',').map(t => t.trim());
        await db.collection('tasks').doc(taskId).update(updateData);
        showToast('Task updated successfully', 'success');
        return true;
    } catch (error) { console.error('Error updating task:', error); showToast('Error updating task: ' + error.message, 'error'); return false; }
}

// ============================================
// Project CRUD Operations
// ============================================

async function createProject(projectData) {
    if (!currentOrganization) {
        await loadUserData();
        if (!currentOrganization) { showToast('Unable to create project. Please refresh the page.', 'error'); return false; }
    }
    try {
        const project = {
            organizationId: currentOrganization, name: projectData.name, description: projectData.description || '',
            color: projectData.color || '#16a34a', isArchived: false, createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('projects').add(project);
        showToast('Project created successfully', 'success');
        await loadProjects();
        return true;
    } catch (error) { console.error('Error creating project:', error); showToast('Error creating project: ' + error.message, 'error'); return false; }
}

// ============================================
// Task Detail & Comments
// ============================================

async function openTaskDetail(taskId) {
    currentTaskForComments = taskId;
    try {
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        if (!taskDoc.exists) { showToast('Task not found', 'error'); return; }
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
        const modalTitle = document.getElementById('comment-task-title');
        if (modalTitle) modalTitle.textContent = `Task: ${task.title}`;
        await loadComments(taskId);
        const modal = document.getElementById('comment-modal');
        if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
    } catch (error) { console.error('Error opening task detail:', error); showToast('Error loading task details', 'error'); }
}

async function loadComments(taskId) {
    try {
        const commentsSnapshot = await db.collection('comments').where('taskId', '==', taskId).orderBy('createdAt', 'desc').get();
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;
        commentsList.innerHTML = '';
        if (commentsSnapshot.empty) { commentsList.innerHTML = '<div class="empty-state"><p><i class="fas fa-comments"></i><br>No comments yet</p></div>'; return; }
        commentsSnapshot.forEach(doc => { const comment = doc.data(); const commentElement = createCommentElement(comment); commentsList.appendChild(commentElement); });
    } catch (error) { console.error('Error loading comments:', error); }
}

function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    let timestamp = 'Just now';
    if (comment.createdAt && comment.createdAt.toDate) timestamp = new Date(comment.createdAt.toDate()).toLocaleString();
    div.innerHTML = `<div class="comment-author"><i class="fas fa-user-circle"></i> ${escapeHtml(comment.userName || 'Anonymous')}</div><div class="comment-content">${escapeHtml(comment.content)}</div><div class="comment-time"><i class="far fa-clock"></i> ${timestamp}</div>`;
    return div;
}

async function addComment(taskId, content) {
    if (!content.trim()) return false;
    try {
        await db.collection('comments').add({ taskId: taskId, userId: currentUser.uid, userName: currentUser.displayName || currentUser.email, content: content.trim(), createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        await loadComments(taskId);
        document.getElementById('new-comment').value = '';
        showToast('Comment added', 'success');
        return true;
    } catch (error) { console.error('Error adding comment:', error); showToast('Error adding comment', 'error'); return false; }
}

// ============================================
// Real-time Subscriptions
// ============================================

function setupRealtimeSubscription() {
    if (!currentProject) return;
    if (unsubscribeTasks) unsubscribeTasks();
    unsubscribeTasks = db.collection('tasks').where('projectId', '==', currentProject.id).onSnapshot((snapshot) => {
        if (taskReloadTimeout) clearTimeout(taskReloadTimeout);
        taskReloadTimeout = setTimeout(() => {
            const tasks = [];
            snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
            tasks.sort((a, b) => { if (a.order && b.order) return a.order - b.order; if (a.createdAt && b.createdAt) return b.createdAt.toDate() - a.createdAt.toDate(); return 0; });
            allTasks = tasks;
            loadAssigneeFilters();
            applySearchAndFilter();
            taskReloadTimeout = null;
        }, 100);
    }, (error) => console.error('Realtime subscription error:', error));
}

// ============================================
// UI Event Listeners
// ============================================

function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            if (view === 'board') { document.getElementById('board-view').style.display = 'flex'; document.getElementById('sprints-view').classList.remove('active'); currentView = 'board'; }
            else if (view === 'sprints') { document.getElementById('board-view').style.display = 'none'; document.getElementById('sprints-view').classList.add('active'); currentView = 'sprints'; loadSprints(); }
        });
    });
    
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const taskData = { title: document.getElementById('task-title').value, description: document.getElementById('task-description').value, priority: document.getElementById('task-priority').value, assignedTo: document.getElementById('task-assignee').value, dueDate: document.getElementById('task-due-date').value, estimatedHours: document.getElementById('task-estimate').value, tags: document.getElementById('task-tags').value };
            const success = await createTask(taskData);
            if (success) { closeTaskModal(); taskForm.reset(); }
        });
    }
    
    const projectForm = document.getElementById('project-form');
    if (projectForm) {
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const projectData = { name: document.getElementById('project-name').value, description: document.getElementById('project-description').value, color: document.getElementById('project-color')?.value };
            const success = await createProject(projectData);
            if (success) { closeProjectModal(); projectForm.reset(); }
        });
    }
    
    const saveTaskBtn = document.getElementById('save-task-btn');
    if (saveTaskBtn) {
        saveTaskBtn.addEventListener('click', async () => {
            const taskId = document.getElementById('edit-task-id').value;
            if (!taskId) return;
            const taskData = { title: document.getElementById('edit-task-title').value, description: document.getElementById('edit-task-description').value, priority: document.getElementById('edit-task-priority').value, assignedTo: document.getElementById('edit-task-assignee').value, dueDate: document.getElementById('edit-task-due-date').value, estimatedHours: document.getElementById('edit-task-estimate').value, tags: document.getElementById('edit-task-tags').value };
            if (!taskData.title) { showToast('Please enter a task title', 'warning'); return; }
            const success = await updateTask(taskId, taskData);
            if (success) closeCommentModal();
        });
    }
    
    const deleteTaskBtn = document.getElementById('delete-task-btn');
    if (deleteTaskBtn) {
        deleteTaskBtn.addEventListener('click', async () => {
            const taskId = document.getElementById('edit-task-id').value;
            const taskTitle = document.getElementById('edit-task-title').value;
            const taskDescription = document.getElementById('edit-task-description').value;
            const taskPriority = document.getElementById('edit-task-priority').value;
            const taskAssignee = document.getElementById('edit-task-assignee').value;
            const taskDueDate = document.getElementById('edit-task-due-date').value;
            const taskEstimate = document.getElementById('edit-task-estimate').value;
            const taskTags = document.getElementById('edit-task-tags').value;
            if (taskId) {
                const taskData = { projectId: currentProject.id, title: taskTitle, description: taskDescription, priority: taskPriority, assignedTo: taskAssignee, dueDate: taskDueDate, estimatedHours: parseFloat(taskEstimate), tags: taskTags ? taskTags.split(',').map(t => t.trim()) : [], status: 'todo', order: Date.now(), createdBy: currentUser.uid };
                await deleteTaskWithUndo(taskId, taskData);
            }
        });
    }
    
    const addCommentBtn = document.getElementById('add-comment-btn');
    if (addCommentBtn) {
        const newAddBtn = addCommentBtn.cloneNode(true);
        addCommentBtn.parentNode.replaceChild(newAddBtn, addCommentBtn);
        newAddBtn.addEventListener('click', async () => {
            const content = document.getElementById('new-comment').value;
            if (!content || !content.trim()) { showToast('Please enter a comment', 'warning'); return; }
            if (!currentTaskForComments) { showToast('No task selected', 'error'); return; }
            await addComment(currentTaskForComments, content);
        });
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await auth.signOut();
            localStorage.removeItem('oriental_user');
            window.location.href = 'login.html';
        });
    }
    
    const inviteForm = document.getElementById('invite-form');
    if (inviteForm) {
        inviteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('invite-email').value;
            const role = document.getElementById('invite-role').value;
            await sendInvite(email, role);
            closeInviteModal();
        });
    }
}

// ============================================
// Mobile Navigation
// ============================================

function setupMobileNavigation() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    function openSidebar() { if (sidebar) sidebar.classList.add('open'); if (sidebarOverlay) sidebarOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    function closeSidebar() { if (sidebar) sidebar.classList.remove('open'); if (sidebarOverlay) sidebarOverlay.classList.remove('active'); document.body.style.overflow = ''; }
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    const navItems = document.querySelectorAll('.nav-item');
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            if (view === 'board') { document.getElementById('board-view').style.display = 'flex'; document.getElementById('sprints-view').classList.add('hidden'); document.getElementById('current-view').textContent = 'Board'; bottomNavItems.forEach(nav => nav.classList.remove('active')); item.classList.add('active'); navItems.forEach(nav => nav.classList.remove('active')); document.querySelector('.nav-item[data-view="board"]')?.classList.add('active'); }
            else if (view === 'sprints') { document.getElementById('board-view').style.display = 'none'; document.getElementById('sprints-view').classList.remove('hidden'); document.getElementById('current-view').textContent = 'Sprints'; loadSprints(); bottomNavItems.forEach(nav => nav.classList.remove('active')); item.classList.add('active'); navItems.forEach(nav => nav.classList.remove('active')); document.querySelector('.nav-item[data-view="sprints"]')?.classList.add('active'); }
        });
    });
    const bottomAddBtn = document.getElementById('bottom-add-btn');
    if (bottomAddBtn) bottomAddBtn.addEventListener('click', () => openTaskModal());
    navItems.forEach(item => { item.addEventListener('click', () => { if (window.innerWidth <= 768) setTimeout(closeSidebar, 150); }); });
}

// ============================================
// Modal Controls
// ============================================

function closeTaskModal() { const modal = document.getElementById('task-modal'); if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); } const form = document.getElementById('task-form'); if (form) form.reset(); }
function closeProjectModal() { const modal = document.getElementById('project-modal'); if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); } const form = document.getElementById('project-form'); if (form) form.reset(); }
function closeSprintModal() { const modal = document.getElementById('sprint-modal'); if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); } const form = document.getElementById('sprint-form'); if (form) form.reset(); }
function closeCommentModal() { const modal = document.getElementById('comment-modal'); if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); } const textarea = document.getElementById('new-comment'); if (textarea) textarea.value = ''; }
function openTaskModal() { if (!currentProject) { showToast('Please select a project first', 'warning'); return; } const modal = document.getElementById('task-modal'); if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); } }
function openProjectModal() { const modal = document.getElementById('project-modal'); if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); } }
function openSprintModal() {
    if (!currentProject) {
        showToast('Please select a project first', 'warning');
        return;
    }
    
    // Check if there's already an active sprint
    if (currentSprint) {
        showToast('There is already an active sprint. Complete it before starting a new one.', 'warning');
        return;
    }
    
    const modal = document.getElementById('sprint-modal');
    if (modal) {
        // Set default dates (2-week sprint)
        const today = new Date();
        const twoWeeksLater = new Date();
        twoWeeksLater.setDate(today.getDate() + 14);
        
        document.getElementById('sprint-start-date').value = today.toISOString().split('T')[0];
        document.getElementById('sprint-end-date').value = twoWeeksLater.toISOString().split('T')[0];
        
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}
/// ============================================
// Sprint Functions - COMPLETE
// ============================================

let currentSprint = null;
let availableTasks = [];

/**
 * Load active sprint for current project
 */
async function loadSprints() {
    if (!currentProject) return;
    
    try {
        // Get active sprint
        const activeSprintSnapshot = await db.collection('sprints')
            .where('projectId', '==', currentProject.id)
            .where('status', '==', 'active')
            .limit(1)
            .get();
        
        if (!activeSprintSnapshot.empty) {
            currentSprint = { id: activeSprintSnapshot.docs[0].id, ...activeSprintSnapshot.docs[0].data() };
            displayActiveSprint(currentSprint);
            loadSprintTasks(currentSprint);
        } else {
            displayNoActiveSprint();
        }
        
        // Load past sprints
        await loadPastSprints();
        
    } catch (error) {
        console.error('Error loading sprints:', error);
        showToast('Error loading sprints', 'error');
    }
}

/**
 * Display active sprint information
 */
function displayActiveSprint(sprint) {
    const sprintNameEl = document.getElementById('active-sprint-name');
    const sprintGoalEl = document.getElementById('active-sprint-goal');
    const sprintDatesEl = document.getElementById('sprint-dates');
    const createBtn = document.getElementById('create-sprint-btn');
    const completeBtn = document.getElementById('complete-sprint-btn');
    
    if (sprintNameEl) sprintNameEl.textContent = sprint.name;
    if (sprintGoalEl) sprintGoalEl.textContent = sprint.goal || 'No goal set';
    
    if (sprintDatesEl && sprint.startDate && sprint.endDate) {
        const start = new Date(sprint.startDate).toLocaleDateString();
        const end = new Date(sprint.endDate).toLocaleDateString();
        sprintDatesEl.innerHTML = `<i class="fas fa-calendar-alt"></i> ${start} - ${end}`;
    }
    
    if (createBtn) createBtn.style.display = 'none';
    if (completeBtn) completeBtn.style.display = 'flex';
}

/**
 * Display no active sprint state
 */
function displayNoActiveSprint() {
    const sprintNameEl = document.getElementById('active-sprint-name');
    const sprintGoalEl = document.getElementById('active-sprint-goal');
    const sprintDatesEl = document.getElementById('sprint-dates');
    const createBtn = document.getElementById('create-sprint-btn');
    const completeBtn = document.getElementById('complete-sprint-btn');
    const sprintTasksContainer = document.getElementById('sprint-tasks');
    
    if (sprintNameEl) sprintNameEl.textContent = 'No Active Sprint';
    if (sprintGoalEl) sprintGoalEl.textContent = 'Start a sprint to begin tracking progress';
    if (sprintDatesEl) sprintDatesEl.innerHTML = '';
    if (createBtn) createBtn.style.display = 'flex';
    if (completeBtn) completeBtn.style.display = 'none';
    
    // Clear sprint columns
    document.getElementById('planned-tasks').innerHTML = '<div class="empty-state-small">No active sprint</div>';
    document.getElementById('progress-tasks').innerHTML = '';
    document.getElementById('completed-tasks').innerHTML = '';
    
    document.getElementById('planned-count').textContent = '0';
    document.getElementById('progress-count').textContent = '0';
    document.getElementById('completed-count').textContent = '0';
    document.getElementById('sprint-progress-percent').textContent = '0%';
    document.getElementById('sprint-progress-fill').style.width = '0%';
    document.getElementById('sprint-completed-tasks').textContent = '0';
    document.getElementById('sprint-total-tasks').textContent = '0';
}

/**
 * Load and display sprint tasks
 */
async function loadSprintTasks(sprint) {
    if (!sprint || !sprint.tasks || sprint.tasks.length === 0) {
        showEmptySprintColumns();
        updateSprintProgress(0, 0);
        return;
    }
    
    try {
        const tasksData = [];
        for (const taskId of sprint.tasks) {
            const taskDoc = await db.collection('tasks').doc(taskId).get();
            if (taskDoc.exists) {
                tasksData.push({ id: taskDoc.id, ...taskDoc.data() });
            }
        }
        
        // Organize by status
        const planned = tasksData.filter(t => t.status === 'todo');
        const inProgress = tasksData.filter(t => t.status === 'in-progress');
        const completed = tasksData.filter(t => t.status === 'done');
        
        renderSprintColumns(planned, inProgress, completed);
        updateSprintProgress(completed.length, tasksData.length);
        
    } catch (error) {
        console.error('Error loading sprint tasks:', error);
    }
}

/**
 * Render sprint columns
 */
function renderSprintColumns(planned, inProgress, completed) {
    const plannedContainer = document.getElementById('planned-tasks');
    const progressContainer = document.getElementById('progress-tasks');
    const completedContainer = document.getElementById('completed-tasks');
    
    if (plannedContainer) {
        plannedContainer.innerHTML = planned.map(task => createSprintTaskCard(task)).join('');
    }
    if (progressContainer) {
        progressContainer.innerHTML = inProgress.map(task => createSprintTaskCard(task)).join('');
    }
    if (completedContainer) {
        completedContainer.innerHTML = completed.map(task => createSprintTaskCard(task)).join('');
    }
    
    document.getElementById('planned-count').textContent = planned.length;
    document.getElementById('progress-count').textContent = inProgress.length;
    document.getElementById('completed-count').textContent = completed.length;
}

/**
 * Create sprint task card
 */
function createSprintTaskCard(task) {
    const priorityClass = task.priority === 'high' ? 'priority-high' : (task.priority === 'medium' ? 'priority-medium' : 'priority-low');
    return `
        <div class="sprint-task-card" onclick="openTaskDetail('${task.id}')">
            <div class="sprint-task-title">${escapeHtml(task.title)}</div>
            <div class="sprint-task-status">
                <span class="priority ${priorityClass}">${task.priority || 'medium'}</span>
                <span><i class="fas fa-user"></i> ${task.assignedTo || 'Unassigned'}</span>
            </div>
        </div>
    `;
}

/**
 * Show empty sprint columns
 */
function showEmptySprintColumns() {
    document.getElementById('planned-tasks').innerHTML = '<div class="empty-state-small">No tasks in sprint</div>';
    document.getElementById('progress-tasks').innerHTML = '';
    document.getElementById('completed-tasks').innerHTML = '';
    document.getElementById('planned-count').textContent = '0';
    document.getElementById('progress-count').textContent = '0';
    document.getElementById('completed-count').textContent = '0';
}

/**
 * Update sprint progress indicators
 */
function updateSprintProgress(completed, total) {
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById('sprint-progress-percent').textContent = `${percent}%`;
    document.getElementById('sprint-progress-fill').style.width = `${percent}%`;
    document.getElementById('sprint-completed-tasks').textContent = completed;
    document.getElementById('sprint-total-tasks').textContent = total;
}

/**
 * Load past sprints
 */
async function loadPastSprints() {
    if (!currentProject) return;
    
    try {
        const pastSprintsSnapshot = await db.collection('sprints')
            .where('projectId', '==', currentProject.id)
            .where('status', '==', 'completed')
            .orderBy('endDate', 'desc')
            .limit(10)
            .get();
        
        const container = document.getElementById('past-sprints-list');
        if (!container) return;
        
        if (pastSprintsSnapshot.empty) {
            container.innerHTML = '<div class="empty-state-small">No past sprints</div>';
            return;
        }
        
        container.innerHTML = '';
        pastSprintsSnapshot.forEach(doc => {
            const sprint = doc.data();
            const sprintDiv = document.createElement('div');
            sprintDiv.className = 'past-sprint-item';
            sprintDiv.onclick = () => viewPastSprint(doc.id, sprint);
            
            const startDate = sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : 'Unknown';
            const endDate = sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : 'Unknown';
            const taskCount = sprint.tasks ? sprint.tasks.length : 0;
            
            sprintDiv.innerHTML = `
                <div class="past-sprint-name">${escapeHtml(sprint.name)}</div>
                <div class="past-sprint-dates"><i class="fas fa-calendar-alt"></i> ${startDate} - ${endDate}</div>
                <div class="past-sprint-stats"><i class="fas fa-tasks"></i> ${taskCount} tasks</div>
            `;
            container.appendChild(sprintDiv);
        });
        
    } catch (error) {
        console.error('Error loading past sprints:', error);
    }
}

/**
 * View past sprint details
 */
async function viewPastSprint(sprintId, sprint) {
    // Show modal with sprint details
    showToast(`Sprint "${sprint.name}" completed`, 'info');
    // Could open a modal with detailed view
}

/**
 * Create a new sprint
 */
async function createSprint(sprintData) {
    if (!currentProject) {
        showToast('Please select a project first', 'warning');
        return false;
    }
    
    try {
        const sprint = {
            organizationId: currentOrganization,
            projectId: currentProject.id,
            name: sprintData.name,
            goal: sprintData.goal || '',
            startDate: sprintData.startDate || null,
            endDate: sprintData.endDate || null,
            status: 'active',
            tasks: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('sprints').add(sprint);
        showToast('Sprint started successfully', 'success');
        await loadSprints();
        return true;
        
    } catch (error) {
        console.error('Error creating sprint:', error);
        showToast('Error creating sprint: ' + error.message, 'error');
        return false;
    }
}

/**
 * Complete current sprint
 */
async function completeSprint() {
    if (!currentSprint) {
        showToast('No active sprint', 'warning');
        return;
    }
    
    const confirmed = await showConfirmDialog(
        'Complete Sprint',
        `Complete "${currentSprint.name}"? This will mark the sprint as completed.`,
        'warning'
    );
    
    if (!confirmed) return;
    
    try {
        await db.collection('sprints').doc(currentSprint.id).update({
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Sprint completed successfully', 'success');
        currentSprint = null;
        await loadSprints();
        
    } catch (error) {
        console.error('Error completing sprint:', error);
        showToast('Error completing sprint', 'error');
    }
}

/**
 * Open add tasks to sprint modal
 */
async function openAddToSprintModal() {
    if (!currentSprint) {
        showToast('No active sprint. Start a sprint first.', 'warning');
        return;
    }
    
    await loadAvailableTasks();
    const modal = document.getElementById('add-to-sprint-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

/**
 * Close add to sprint modal
 */
function closeAddToSprintModal() {
    const modal = document.getElementById('add-to-sprint-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

/**
 * Load available tasks (not in sprint)
 */
async function loadAvailableTasks() {
    if (!currentProject || !currentSprint) return;
    
    try {
        const allTasksSnapshot = await db.collection('tasks')
            .where('projectId', '==', currentProject.id)
            .get();
        
        const sprintTaskIds = currentSprint.tasks || [];
        availableTasks = [];
        
        allTasksSnapshot.forEach(doc => {
            if (!sprintTaskIds.includes(doc.id)) {
                availableTasks.push({ id: doc.id, ...doc.data() });
            }
        });
        
        const container = document.getElementById('available-tasks-list');
        if (!container) return;
        
        if (availableTasks.length === 0) {
            container.innerHTML = '<div class="empty-state-small">No available tasks to add</div>';
            return;
        }
        
        container.innerHTML = availableTasks.map(task => `
            <div class="available-task-item">
                <input type="checkbox" value="${task.id}" id="task-${task.id}">
                <label for="task-${task.id}" class="available-task-title">${escapeHtml(task.title)}</label>
                <span class="available-task-priority priority-${task.priority || 'medium'}">${task.priority || 'medium'}</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading available tasks:', error);
    }
}

/**
 * Add selected tasks to sprint
 */
async function addSelectedTasksToSprint() {
    const selectedCheckboxes = document.querySelectorAll('#available-tasks-list input[type="checkbox"]:checked');
    const selectedTaskIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    if (selectedTaskIds.length === 0) {
        showToast('Please select at least one task', 'warning');
        return;
    }
    
    const currentTasks = currentSprint.tasks || [];
    const updatedTasks = [...currentTasks, ...selectedTaskIds];
    
    try {
        await db.collection('sprints').doc(currentSprint.id).update({
            tasks: updatedTasks
        });
        
        currentSprint.tasks = updatedTasks;
        showToast(`${selectedTaskIds.length} task(s) added to sprint`, 'success');
        closeAddToSprintModal();
        await loadSprintTasks(currentSprint);
        
    } catch (error) {
        console.error('Error adding tasks to sprint:', error);
        showToast('Error adding tasks to sprint', 'error');
    }
}

// Add event listener for add selected tasks button
document.addEventListener('DOMContentLoaded', () => {
    const addSelectedBtn = document.getElementById('add-selected-tasks-btn');
    if (addSelectedBtn) {
        addSelectedBtn.addEventListener('click', addSelectedTasksToSprint);
    }
});

// Update sprint form submission
const sprintForm = document.getElementById('sprint-form');
if (sprintForm) {
    sprintForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const sprintData = {
            name: document.getElementById('sprint-name').value,
            goal: document.getElementById('sprint-goal').value,
            startDate: document.getElementById('sprint-start-date').value,
            endDate: document.getElementById('sprint-end-date').value
        };
        
        const success = await createSprint(sprintData);
        if (success) {
            closeSprintModal();
            sprintForm.reset();
        }
    });
}
// ============================================
// Undo Delete Functions
// ============================================

function showUndoToast(message, undoFunction) {
    const existingToast = document.querySelector('.undo-toast');
    if (existingToast) existingToast.remove();
    if (undoTimeout) clearTimeout(undoTimeout);
    const toast = document.createElement('div');
    toast.className = 'undo-toast';
    toast.innerHTML = `<span>${escapeHtml(message)}</span><button class="undo-btn">Undo</button>`;
    document.body.appendChild(toast);
    const undoBtn = toast.querySelector('.undo-btn');
    undoBtn.addEventListener('click', () => { undoFunction(); toast.remove(); if (undoTimeout) clearTimeout(undoTimeout); showToast('Action undone', 'success'); });
    undoTimeout = setTimeout(() => { if (toast && toast.parentNode) toast.remove(); undoTimeout = null; deletedItem = null; deletedItemType = null; }, UNDO_DURATION);
}

async function deleteTaskWithUndo(taskId, taskData) {
    deletedItem = { id: taskId, ...taskData };
    deletedItemType = 'task';
    try {
        const commentsSnapshot = await db.collection('comments').where('taskId', '==', taskId).get();
        const batch = db.batch();
        commentsSnapshot.forEach(doc => batch.delete(doc.ref));
        const taskRef = db.collection('tasks').doc(taskId);
        batch.delete(taskRef);
        await batch.commit();
        showUndoToast('Task deleted', () => undoDelete());
        closeCommentModal();
        await loadTasks();
    } catch (error) { console.error('Error deleting task:', error); showToast('Error deleting task: ' + error.message, 'error'); deletedItem = null; deletedItemType = null; }
}

async function deleteProjectWithUndo(projectId, projectData) {
    deletedItem = { id: projectId, ...projectData };
    deletedItemType = 'project';
    try {
        const tasksSnapshot = await db.collection('tasks').where('projectId', '==', projectId).get();
        const batch = db.batch();
        const deletedTasks = [];
        for (const taskDoc of tasksSnapshot.docs) {
            const commentsSnapshot = await db.collection('comments').where('taskId', '==', taskDoc.id).get();
            commentsSnapshot.forEach(commentDoc => batch.delete(commentDoc.ref));
            batch.delete(taskDoc.ref);
            deletedTasks.push({ id: taskDoc.id, ...taskDoc.data() });
        }
        const projectRef = db.collection('projects').doc(projectId);
        batch.delete(projectRef);
        await batch.commit();
        if (deletedItem) deletedItem.tasks = deletedTasks;
        showUndoToast(`Project "${projectData.name}" deleted`, () => undoDelete());
        await loadProjects();
    } catch (error) { console.error('Error deleting project:', error); showToast('Error deleting project: ' + error.message, 'error'); deletedItem = null; deletedItemType = null; }
}

async function undoDelete() {
    if (!deletedItem || !deletedItemType) { console.log('Nothing to undo'); return; }
    try {
        if (deletedItemType === 'task') {
            const taskData = { projectId: deletedItem.projectId, title: deletedItem.title, description: deletedItem.description || '', priority: deletedItem.priority || 'medium', status: deletedItem.status || 'todo', assignedTo: deletedItem.assignedTo || null, dueDate: deletedItem.dueDate || null, estimatedHours: deletedItem.estimatedHours || 0, tags: deletedItem.tags || [], order: deletedItem.order || Date.now(), createdBy: deletedItem.createdBy, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
            await db.collection('tasks').add(taskData);
            console.log('Task restored');
        } else if (deletedItemType === 'project') {
            const projectData = { organizationId: deletedItem.organizationId, name: deletedItem.name, description: deletedItem.description || '', color: deletedItem.color || '#16a34a', isArchived: false, createdBy: deletedItem.createdBy, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
            const projectRef = await db.collection('projects').add(projectData);
            if (deletedItem.tasks && deletedItem.tasks.length > 0) {
                for (const task of deletedItem.tasks) {
                    const taskData = { projectId: projectRef.id, title: task.title, description: task.description || '', priority: task.priority || 'medium', status: task.status || 'todo', assignedTo: task.assignedTo || null, dueDate: task.dueDate || null, estimatedHours: task.estimatedHours || 0, tags: task.tags || [], order: task.order || Date.now(), createdBy: task.createdBy, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
                    await db.collection('tasks').add(taskData);
                }
            }
        }
        deletedItem = null;
        deletedItemType = null;
        if (deletedItemType === 'project') await loadProjects();
        else await loadTasks();
    } catch (error) { console.error('Error undoing delete:', error); showToast('Error undoing action', 'error'); }
}

// ============================================
// Keyboard Shortcuts
// ============================================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const isTyping = e.target.matches('input, textarea, select, [contenteditable]');
        if (e.key === '?' && !isTyping) { e.preventDefault(); showShortcutsHelp(); return; }
        if (e.key === 'Escape') {
            if (isTyping) {
                const searchInput = document.getElementById('search-tasks');
                if (document.activeElement === searchInput && searchInput.value) { searchInput.value = ''; searchTerm = ''; applySearchAndFilter(); const clearSearch = document.getElementById('clear-search'); if (clearSearch) clearSearch.style.display = 'none'; }
            } else closeAllModals();
            return;
        }
        if (isTyping) return;
        if (e.key === 'n' || e.key === 'N') { e.preventDefault(); if (currentProject) openTaskModal(); else showToast('Please select a project first', 'warning'); }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); openProjectModal(); }
        if (e.key === '/') { e.preventDefault(); const searchInput = document.getElementById('search-tasks'); if (searchInput) { searchInput.focus(); searchInput.select(); } }
        if (e.key === 's' || e.key === 'S') { e.preventDefault(); const filterBtn = document.getElementById('filter-btn'); if (filterBtn) filterBtn.click(); }
        if (e.key === 'b' || e.key === 'B') { e.preventDefault(); switchToBoardView(); }
        if (e.key === 'r' || e.key === 'R') { e.preventDefault(); switchToSprintsView(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); if (deletedItem) undoDelete(); }
    });
}

function closeAllModals() { closeTaskModal(); closeProjectModal(); closeSprintModal(); closeCommentModal(); const filterDropdown = document.getElementById('filter-dropdown'); if (filterDropdown) filterDropdown.classList.remove('show'); }
function switchToBoardView() { document.getElementById('board-view').style.display = 'flex'; document.getElementById('sprints-view').classList.add('hidden'); document.getElementById('current-view').textContent = 'Board'; document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => { if (item.dataset?.view === 'board') item.classList.add('active'); else item.classList.remove('active'); }); }
function switchToSprintsView() { document.getElementById('board-view').style.display = 'none'; document.getElementById('sprints-view').classList.remove('hidden'); document.getElementById('current-view').textContent = 'Sprints'; loadSprints(); document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => { if (item.dataset?.view === 'sprints') item.classList.add('active'); else item.classList.remove('active'); }); }

function showShortcutsHelp() {
    let helpModal = document.getElementById('shortcuts-help-modal');
    if (!helpModal) {
        helpModal = document.createElement('div');
        helpModal.id = 'shortcuts-help-modal';
        helpModal.className = 'modal';
        helpModal.innerHTML = `<div class="modal-content" style="max-width: 500px;"><div class="modal-header"><h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3><button class="close-modal" onclick="closeShortcutsHelp()">&times;</button></div><div class="modal-body"><div class="shortcuts-grid"><div class="shortcut-item"><kbd>N</kbd><span>New Task</span></div><div class="shortcut-item"><kbd>P</kbd><span>New Project</span></div><div class="shortcut-item"><kbd>/</kbd><span>Focus Search</span></div><div class="shortcut-item"><kbd>S</kbd><span>Focus Filter</span></div><div class="shortcut-item"><kbd>B</kbd><span>Board View</span></div><div class="shortcut-item"><kbd>R</kbd><span>Sprints View</span></div><div class="shortcut-item"><kbd>Esc</kbd><span>Close Modal / Clear Search</span></div><div class="shortcut-item"><kbd>Ctrl+Z</kbd> / <kbd>⌘+Z</kbd><span>Undo Delete</span></div><div class="shortcut-item"><kbd>?</kbd><span>Show this help</span></div></div></div><div class="modal-footer"><button class="btn-secondary" onclick="closeShortcutsHelp()">Close</button></div></div>`;
        document.body.appendChild(helpModal);
    }
    helpModal.classList.add('active');
    helpModal.style.display = 'flex';
}

function closeShortcutsHelp() { const helpModal = document.getElementById('shortcuts-help-modal'); if (helpModal) { helpModal.classList.remove('active'); helpModal.style.display = 'none'; } }
window.closeShortcutsHelp = closeShortcutsHelp;

// ============================================
// Utility Functions
// ============================================

function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================
// Global Exports
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
window.openSprintModal = openSprintModal;
window.clearSearchAndReload = clearSearchAndReload;
window.deleteProjectWithUndo = deleteProjectWithUndo;
window.deleteTaskWithUndo = deleteTaskWithUndo;
window.closeShortcutsHelp = closeShortcutsHelp;
window.openInviteModal = openInviteModal;
window.closeInviteModal = closeInviteModal;
window.closePendingInvitesModal = closePendingInvitesModal;
window.cancelInvite = cancelInvite;
window.toggleTheme = toggleTheme;  // Export toggleTheme for global access