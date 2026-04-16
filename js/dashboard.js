/**
 * Oriental - Dashboard Module
 * Version: 2.4.0
 * 
 * Main application logic including task management, project handling,
 * real-time updates, drag-and-drop functionality, comments, search, filters,
 * sorting, assignee filtering, mobile drag & drop, and pull to refresh.
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
let activeFilters = {
    priorities: [],
    statuses: [],
    dueDates: [],
    assignees: []
};
let taskReloadTimeout = null; // For debouncing real-time updates

// ============================================
// Initialization
// ============================================

/**
 * Initialize dashboard when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Dashboard initializing...');
    await checkAuth();
    await loadUserData();
    await loadOrganization();
    await loadProjects();
    setupEventListeners();
    setupRealtimeSubscription();
    setupMobileNavigation();
    setupKeyboardShortcuts();
    setupSorting();
    setupPullToRefresh();
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
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {string} type - 'danger' or 'warning' or 'info'
 * @returns {Promise<boolean>} - Resolves with true if confirmed, false if cancelled
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
// Data Loading Functions
// ============================================

/**
 * Load user data from Firestore
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
            console.warn('User document not found for:', currentUser.uid);
            
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = currentUser.displayName || currentUser.email.split('@')[0];
            }
            
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) {
                userEmailElement.textContent = currentUser.email;
            }
            
            await createMissingUserDocument();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
    }
}

/**
 * Create missing user document (for Google Sign-in users or edge cases)
 */
async function createMissingUserDocument() {
    try {
        console.log('Creating missing user document...');
        
        const orgsSnapshot = await db.collection('organizations')
            .where('members', 'array-contains', currentUser.uid)
            .get();
        
        let orgId;
        
        if (!orgsSnapshot.empty) {
            orgId = orgsSnapshot.docs[0].id;
            console.log('Found existing organization:', orgId);
        } else {
            const orgName = prompt('Welcome! Please enter your organization name:', 'My Team');
            if (!orgName) return;
            
            const orgRef = await db.collection('organizations').add({
                name: orgName,
                slug: orgName.toLowerCase().replace(/ /g, '-'),
                createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                members: [currentUser.uid],
                settings: { defaultView: 'board', theme: 'light' }
            });
            orgId = orgRef.id;
            console.log('Organization created:', orgId);
            
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
        console.log('User document created successfully');
        
        const orgNameElement = document.getElementById('org-name');
        if (orgNameElement) {
            orgNameElement.textContent = currentUser.displayName || currentUser.email.split('@')[0];
        }
        
        await loadProjects();
        showToast('Organization created successfully', 'success');
        
    } catch (error) {
        console.error('Error creating user document:', error);
        showToast('Error setting up your account', 'error');
    }
}

/**
 * Load organization details
 */
async function loadOrganization() {
    if (!currentOrganization) {
        console.log('No currentOrganization, waiting for loadUserData to set it');
        return;
    }
    
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
        } else {
            console.error('Organization document not found:', currentOrganization);
            const orgNameElement = document.getElementById('org-name');
            if (orgNameElement) {
                orgNameElement.textContent = 'Organization Not Found';
            }
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
 * @param {boolean} showSkeleton - Whether to show loading skeleton
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
        
        // Load assignee filters
        loadAssigneeFilters();
        
        // Apply search, filters, and sorting
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

/**
 * Sort tasks based on current sort option
 */
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

/**
 * Setup sort dropdown
 */
function setupSorting() {
    const sortBtn = document.getElementById('sort-btn');
    const sortDropdown = document.getElementById('sort-dropdown');
    
    if (sortBtn) {
        sortBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sortDropdown.classList.toggle('show');
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (sortBtn && !sortBtn.contains(e.target) && sortDropdown && !sortDropdown.contains(e.target)) {
            sortDropdown.classList.remove('show');
        }
    });
    
    // Handle sort option clicks
    document.querySelectorAll('.sort-option').forEach(option => {
        option.addEventListener('click', () => {
            const sortValue = option.dataset.sort;
            if (sortValue) {
                currentSort = sortValue;
                
                // Update active class
                document.querySelectorAll('.sort-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // Update sort button icon
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

/**
 * Load assignees from tasks for filtering
 */
function loadAssigneeFilters() {
    const assignees = new Set();
    allTasks.forEach(task => {
        if (task.assignedTo && task.assignedTo.trim()) {
            assignees.add(task.assignedTo);
        }
    });
    
    const assigneeContainer = document.getElementById('assignee-filters');
    if (!assigneeContainer) return;
    
    // Clear existing assignee checkboxes (keep the unassigned one)
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

/**
 * Setup search and filter event listeners
 */
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
    activeFilters.priorities = Array.from(document.querySelectorAll('.filter-priority:checked'))
        .map(cb => cb.value);
    
    activeFilters.statuses = Array.from(document.querySelectorAll('.filter-status:checked'))
        .map(cb => cb.value);
    
    activeFilters.dueDates = Array.from(document.querySelectorAll('.filter-due:checked'))
        .map(cb => cb.value);
    
    activeFilters.assignees = Array.from(document.querySelectorAll('.filter-assignee:checked'))
        .map(cb => cb.value);
    
    const filterDropdown = document.getElementById('filter-dropdown');
    if (filterDropdown) {
        filterDropdown.classList.remove('show');
    }
    updateFilterBadge();
    applySearchAndFilter();
}

function handleClearFilters() {
    document.querySelectorAll('.filter-priority, .filter-status, .filter-due, .filter-assignee')
        .forEach(cb => cb.checked = false);
    
    activeFilters = { priorities: [], statuses: [], dueDates: [], assignees: [] };
    updateFilterBadge();
    applySearchAndFilter();
}

/**
 * Update filter badge display
 */
function updateFilterBadge() {
    let badgeContainer = document.getElementById('active-filters');
    const totalFilters = activeFilters.priorities.length + activeFilters.statuses.length + 
                         activeFilters.dueDates.length + activeFilters.assignees.length;
    
    if (!badgeContainer) return;
    
    if (totalFilters === 0) {
        badgeContainer.style.display = 'none';
        badgeContainer.innerHTML = '';
        return;
    }
    
    badgeContainer.style.display = 'flex';
    badgeContainer.innerHTML = '';
    
    activeFilters.priorities.forEach(p => {
        badgeContainer.innerHTML += `
            <div class="filter-badge">
                <i class="fas fa-flag"></i> ${p}
                <button onclick="removeFilter('priority', '${p}')">&times;</button>
            </div>
        `;
    });
    
    activeFilters.statuses.forEach(s => {
        const statusName = s === 'todo' ? 'To Do' : (s === 'in-progress' ? 'In Progress' : 'Done');
        badgeContainer.innerHTML += `
            <div class="filter-badge">
                <i class="fas fa-circle"></i> ${statusName}
                <button onclick="removeFilter('status', '${s}')">&times;</button>
            </div>
        `;
    });
    
    activeFilters.dueDates.forEach(d => {
        const dueName = d === 'overdue' ? 'Overdue' : (d === 'today' ? 'Due Today' : 'This Week');
        badgeContainer.innerHTML += `
            <div class="filter-badge">
                <i class="fas fa-calendar"></i> ${dueName}
                <button onclick="removeFilter('dueDate', '${d}')">&times;</button>
            </div>
        `;
    });
    
    activeFilters.assignees.forEach(a => {
        badgeContainer.innerHTML += `
            <div class="filter-badge">
                <i class="fas fa-user"></i> ${escapeHtml(a)}
                <button onclick="removeFilter('assignee', '${escapeHtml(a)}')">&times;</button>
            </div>
        `;
    });
}

/**
 * Remove a specific filter
 */
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

/**
 * Get due date status
 */
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

/**
 * Get due date display text
 */
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
    
    return labels[status];
}

/**
 * Clear search and reload
 */
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

/**
 * Apply search, filter, and sort to tasks
 */
function applySearchAndFilter() {
    if (!allTasks) return;
    
    let tasks = allTasks.filter(task => {
        // Search filter
        if (searchTerm) {
            const matchesTitle = task.title?.toLowerCase().includes(searchTerm);
            const matchesDesc = task.description?.toLowerCase().includes(searchTerm);
            const matchesTags = task.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
            if (!matchesTitle && !matchesDesc && !matchesTags) return false;
        }
        
        // Priority filter
        if (activeFilters.priorities.length > 0) {
            if (!activeFilters.priorities.includes(task.priority)) return false;
        }
        
        // Status filter
        if (activeFilters.statuses.length > 0) {
            const taskStatus = task.status || 'todo';
            if (!activeFilters.statuses.includes(taskStatus)) return false;
        }
        
        // Due date filter
        if (activeFilters.dueDates.length > 0) {
            const dueStatus = getDueDateStatus(task.dueDate);
            if (!activeFilters.dueDates.includes(dueStatus)) return false;
        }
        
        // Assignee filter
        if (activeFilters.assignees.length > 0) {
            const taskAssignee = task.assignedTo || 'unassigned';
            if (!activeFilters.assignees.includes(taskAssignee)) return false;
        }
        
        return true;
    });
    
    // Apply sorting
    tasks = sortTasks(tasks);
    filteredTasks = tasks;
    
    // Show empty search state if no results
    if (filteredTasks.length === 0 && searchTerm) {
        const boardView = document.getElementById('board-view');
        if (boardView) {
            boardView.innerHTML = `
                <div class="empty-state empty-search" style="width: 100%;">
                    <i class="fas fa-search"></i>
                    <h3>No matching tasks</h3>
                    <p>No tasks found matching "${escapeHtml(searchTerm)}"</p>
                    <button class="btn-secondary" onclick="clearSearchAndReload()">
                        <i class="fas fa-undo"></i> Clear Search
                    </button>
                </div>
            `;
        }
        return;
    }
    
    renderBoard(filteredTasks);
}

// ============================================
// Render Functions
// ============================================

/**
 * Render the board view with tasks organized by status
 */
function renderBoard(tasks) {
    if (tasks.length === 0 && !searchTerm) {
        const boardView = document.getElementById('board-view');
        if (boardView) {
            boardView.innerHTML = `
                <div class="empty-state empty-tasks" style="width: 100%;">
                    <i class="fas fa-tasks"></i>
                    <h3>No tasks yet</h3>
                    <p>Get started by creating your first task</p>
                    <button class="btn-primary" onclick="openTaskModal()">
                        <i class="fas fa-plus"></i> Create Task
                    </button>
                </div>
            `;
        }
        return;
    }
    
    const columns = {
        'todo': { title: 'To Do', tasks: [], icon: 'fa-circle', color: '#9ca3af' },
        'in-progress': { title: 'In Progress', tasks: [], icon: 'fa-spinner', color: '#3b82f6' },
        'done': { title: 'Done', tasks: [], icon: 'fa-check-circle', color: '#10b981' }
    };
    
    tasks.forEach(task => {
        const status = task.status || 'todo';
        if (columns[status]) {
            columns[status].tasks.push(task);
        }
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

/**
 * Create a board column element
 */
function createColumnElement(status, column) {
    const columnDiv = document.createElement('div');
    columnDiv.className = 'board-column';
    columnDiv.setAttribute('data-status', status);
    
    columnDiv.innerHTML = `
        <div class="column-header">
            <span class="column-title">
                <i class="fas ${column.icon}" style="color: ${column.color}"></i>
                ${column.title}
            </span>
            <span class="column-count">${column.tasks.length}</span>
        </div>
        <div class="tasks-container" data-status="${status}">
            ${column.tasks.map(task => createTaskCard(task)).join('')}
        </div>
    `;
    
    return columnDiv;
}

/**
 * Create a task card element with due date and search highlight
 */
function createTaskCard(task) {
    const priorityClass = task.priority === 'high' ? 'priority-high' : 
                         (task.priority === 'medium' ? 'priority-medium' : 'priority-low');
    
    const priorityIcon = task.priority === 'high' ? 'fa-arrow-up' : 
                        (task.priority === 'medium' ? 'fa-minus' : 'fa-arrow-down');
    
    const safeTaskId = task.id.replace(/'/g, "\\'");
    const dueDateInfo = getDueDateDisplay(task.dueDate);
    const dueDateClass = task.dueDate ? getDueDateStatus(task.dueDate) : '';
    
    let highlightedTitle = escapeHtml(task.title);
    if (searchTerm) {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        highlightedTitle = highlightedTitle.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    
    return `
        <div class="task-card" 
             draggable="true" 
             data-task-id="${task.id}" 
             data-status="${task.status || 'todo'}" 
             onclick="openTaskDetail('${safeTaskId}')">
            <div class="task-title">${highlightedTitle}</div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description.substring(0, 100))}</div>` : ''}
            <div class="task-meta">
                <span class="priority ${priorityClass}">
                    <i class="fas ${priorityIcon}"></i> ${task.priority || 'medium'}
                </span>
                ${dueDateInfo ? `<span class="task-due-date due-${dueDateClass}">
                    <i class="fas fa-calendar-alt"></i> ${escapeHtml(dueDateInfo)}
                </span>` : ''}
                <span class="assignee">
                    <i class="fas fa-user"></i>
                    ${task.assignedTo ? escapeHtml(task.assignedTo.substring(0, 8)) : 'Unassigned'}
                </span>
                <button class="comment-btn" onclick="event.stopPropagation(); openTaskDetail('${safeTaskId}')">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
        </div>
    `;
}

// ============================================
// Drag and Drop Functionality
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
        await db.collection('tasks').doc(taskId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Task status updated', 'success');
        
    } catch (error) {
        console.error('Error updating task status:', error);
        showToast('Error updating task', 'error');
    }
}

// ============================================
// Mobile Drag and Drop (Touch Support)
// ============================================

let touchStartY = null;
let touchCurrentY = null;
let isDragging = false;

function setupMobileDragAndDrop() {
    if (window.innerWidth > 768) return; // Only for mobile
    
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
    
    if (deltaY > 10 && !isDragging) {
        isDragging = true;
    }
    
    if (isDragging) {
        const touch = e.touches[0];
        const elementAtTouch = document.elementsFromPoint(touch.clientX, touch.clientY);
        
        for (const element of elementAtTouch) {
            if (element.classList && element.classList.contains('tasks-container')) {
                document.querySelectorAll('.tasks-container').forEach(container => {
                    container.classList.remove('drag-over');
                });
                element.classList.add('drag-over');
                break;
            }
        }
    }
}

async function handleTouchEnd(e) {
    if (!draggedTask) {
        resetDrag();
        return;
    }
    
    e.preventDefault();
    
    if (isDragging) {
        const touch = e.changedTouches[0];
        const elementAtTouch = document.elementsFromPoint(touch.clientX, touch.clientY);
        
        let targetContainer = null;
        for (const element of elementAtTouch) {
            if (element.classList && element.classList.contains('tasks-container')) {
                targetContainer = element;
                break;
            }
        }
        
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
                    console.error('Error updating task status:', error);
                    showToast('Error moving task', 'error');
                }
            }
        }
    } else {
        const taskId = draggedTask.dataset.taskId;
        if (taskId) {
            openTaskDetail(taskId);
        }
    }
    
    resetDrag();
}

function resetDrag() {
    if (draggedTask) {
        draggedTask.style.opacity = '';
        draggedTask.style.transition = '';
    }
    draggedTask = null;
    touchStartY = null;
    touchCurrentY = null;
    isDragging = false;
    
    document.querySelectorAll('.tasks-container').forEach(container => {
        container.classList.remove('drag-over');
    });
}

// ============================================
// Pull to Refresh
// ============================================

let pullStartY = 0;
let isRefreshing = false;
let pullElement = null;

function setupPullToRefresh() {
    pullElement = document.getElementById('pull-to-refresh');
    if (!pullElement) return;
    
    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            pullStartY = e.touches[0].clientY;
        }
    });
    
    document.addEventListener('touchmove', (e) => {
        if (isRefreshing) return;
        if (window.scrollY > 0) return;
        
        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - pullStartY;
        
        if (pullDistance > 0 && pullDistance < 100) {
            e.preventDefault();
            pullElement.style.top = `${pullDistance - 60}px`;
            
            if (pullDistance > 60) {
                pullElement.querySelector('i').style.transform = 'rotate(180deg)';
                pullElement.querySelector('span').textContent = 'Release to refresh';
            } else {
                pullElement.querySelector('i').style.transform = 'rotate(0deg)';
                pullElement.querySelector('span').textContent = 'Pull to refresh';
            }
        }
    });
    
    document.addEventListener('touchend', async (e) => {
        if (isRefreshing) return;
        
        const pullDistance = parseInt(pullElement.style.top) + 60;
        
        if (pullDistance > 60) {
            await refreshData();
        }
        
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
        await loadProjects();
        if (currentProject) {
            await loadTasks();
        }
        showToast('Data refreshed', 'success');
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
// Task CRUD Operations
// ============================================

/**
 * Create a new task
 */
async function createTask(taskData) {
    console.log('createTask called with:', taskData);
    
    if (!currentProject) {
        showToast('Please select a project first', 'warning');
        return false;
    }
    
    if (!taskData.title) {
        showToast('Please enter a task title', 'warning');
        return false;
    }
    
    try {
        const task = {
            projectId: currentProject.id,
            title: taskData.title,
            description: taskData.description || '',
            priority: taskData.priority || 'medium',
            status: 'todo',
            assignedTo: taskData.assignedTo || null,
            dueDate: taskData.dueDate || null,
            estimatedHours: parseFloat(taskData.estimatedHours) || 0,
            tags: taskData.tags ? taskData.tags.split(',').map(t => t.trim()) : [],
            order: Date.now(),
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('tasks').add(task);
        showToast('Task created successfully', 'success');
        return true;
        
    } catch (error) {
        console.error('Error creating task:', error);
        showToast('Error creating task: ' + error.message, 'error');
        return false;
    }
}

/**
 * Update an existing task
 */
async function updateTask(taskId, taskData) {
    console.log('Updating task:', taskId, taskData);
    
    try {
        const updateData = {
            title: taskData.title,
            description: taskData.description || '',
            priority: taskData.priority || 'medium',
            assignedTo: taskData.assignedTo || null,
            dueDate: taskData.dueDate || null,
            estimatedHours: parseFloat(taskData.estimatedHours) || 0,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (taskData.tags) {
            updateData.tags = taskData.tags.split(',').map(t => t.trim());
        }
        
        await db.collection('tasks').doc(taskId).update(updateData);
        showToast('Task updated successfully', 'success');
        return true;
        
    } catch (error) {
        console.error('Error updating task:', error);
        showToast('Error updating task: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// Project CRUD Operations
// ============================================

/**
 * Create a new project
 */
async function createProject(projectData) {
    if (!currentOrganization) {
        console.log('No organization found, trying to reload...');
        await loadUserData();
        if (!currentOrganization) {
            showToast('Unable to create project. Please refresh the page.', 'error');
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
        
        await db.collection('projects').add(project);
        showToast('Project created successfully', 'success');
        await loadProjects();
        return true;
        
    } catch (error) {
        console.error('Error creating project:', error);
        showToast('Error creating project: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// Task Detail & Comments System
// ============================================

/**
 * Open task detail modal with edit capability
 */
async function openTaskDetail(taskId) {
    console.log('🔍 Opening task detail for:', taskId);
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
        document.getElementById('edit-task-assignee').value = task.assignedTo || '';
        document.getElementById('edit-task-due-date').value = task.dueDate || '';
        document.getElementById('edit-task-estimate').value = task.estimatedHours || 0;
        document.getElementById('edit-task-tags').value = task.tags ? task.tags.join(', ') : '';
        
        const modalTitle = document.getElementById('comment-task-title');
        if (modalTitle) {
            modalTitle.textContent = `Task: ${task.title}`;
        }
        
        await loadComments(taskId);
        
        const modal = document.getElementById('comment-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
        
    } catch (error) {
        console.error('Error opening task detail:', error);
        showToast('Error loading task details', 'error');
    }
}

/**
 * Load comments for a task
 */
async function loadComments(taskId) {
    try {
        const commentsSnapshot = await db.collection('comments')
            .where('taskId', '==', taskId)
            .orderBy('createdAt', 'desc')
            .get();
        
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;
        
        commentsList.innerHTML = '';
        
        if (commentsSnapshot.empty) {
            commentsList.innerHTML = '<div class="empty-state"><p><i class="fas fa-comments"></i><br>No comments yet</p></div>';
            return;
        }
        
        commentsSnapshot.forEach(doc => {
            const comment = doc.data();
            const commentElement = createCommentElement(comment);
            commentsList.appendChild(commentElement);
        });
        
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

/**
 * Create comment element
 */
function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    
    let timestamp = 'Just now';
    if (comment.createdAt && comment.createdAt.toDate) {
        timestamp = new Date(comment.createdAt.toDate()).toLocaleString();
    }
    
    div.innerHTML = `
        <div class="comment-author">
            <i class="fas fa-user-circle"></i> 
            ${escapeHtml(comment.userName || 'Anonymous')}
        </div>
        <div class="comment-content">${escapeHtml(comment.content)}</div>
        <div class="comment-time">
            <i class="far fa-clock"></i> ${timestamp}
        </div>
    `;
    return div;
}

/**
 * Add a comment to a task
 */
async function addComment(taskId, content) {
    if (!content.trim()) return false;
    
    try {
        await db.collection('comments').add({
            taskId: taskId,
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email,
            content: content.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
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
// Real-time Subscriptions
// ============================================

function setupRealtimeSubscription() {
    if (!currentProject) return;
    
    if (unsubscribeTasks) {
        unsubscribeTasks();
    }
    
    unsubscribeTasks = db.collection('tasks')
        .where('projectId', '==', currentProject.id)
        .onSnapshot((snapshot) => {
            console.log('Real-time update: tasks changed');
            
            if (taskReloadTimeout) {
                clearTimeout(taskReloadTimeout);
            }
            
            taskReloadTimeout = setTimeout(() => {
                const tasks = [];
                snapshot.forEach(doc => {
                    tasks.push({ id: doc.id, ...doc.data() });
                });
                
                tasks.sort((a, b) => {
                    if (a.order && b.order) return a.order - b.order;
                    if (a.createdAt && b.createdAt) return b.createdAt.toDate() - a.createdAt.toDate();
                    return 0;
                });
                
                allTasks = tasks;
                loadAssigneeFilters();
                applySearchAndFilter();
                taskReloadTimeout = null;
            }, 100);
            
        }, (error) => {
            console.error('Realtime subscription error:', error);
        });
}

// ============================================
// UI Event Listeners
// ============================================

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            if (view === 'board') {
                document.getElementById('board-view').style.display = 'flex';
                document.getElementById('sprints-view').classList.remove('active');
                currentView = 'board';
            } else if (view === 'sprints') {
                document.getElementById('board-view').style.display = 'none';
                document.getElementById('sprints-view').classList.add('active');
                currentView = 'sprints';
                loadSprints();
            }
        });
    });
    
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
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
                taskForm.reset();
            }
        });
    }
    
    const projectForm = document.getElementById('project-form');
    if (projectForm) {
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const projectData = {
                name: document.getElementById('project-name').value,
                description: document.getElementById('project-description').value,
                color: document.getElementById('project-color')?.value
            };
            
            const success = await createProject(projectData);
            if (success) {
                closeProjectModal();
                projectForm.reset();
            }
        });
    }
    
    const saveTaskBtn = document.getElementById('save-task-btn');
    if (saveTaskBtn) {
        saveTaskBtn.addEventListener('click', async () => {
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
            
            const success = await updateTask(taskId, taskData);
            if (success) {
                closeCommentModal();
            }
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
                const taskData = {
                    projectId: currentProject.id,
                    title: taskTitle,
                    description: taskDescription,
                    priority: taskPriority,
                    assignedTo: taskAssignee,
                    dueDate: taskDueDate,
                    estimatedHours: parseFloat(taskEstimate),
                    tags: taskTags ? taskTags.split(',').map(t => t.trim()) : [],
                    status: 'todo',
                    order: Date.now(),
                    createdBy: currentUser.uid
                };
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
            
            if (!content || !content.trim()) {
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
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await auth.signOut();
            localStorage.removeItem('oriental_user');
            window.location.href = 'login.html';
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
    
    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', openSidebar);
    }
    
    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', closeSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    const navItems = document.querySelectorAll('.nav-item');
    
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            if (view === 'board') {
                document.getElementById('board-view').style.display = 'flex';
                document.getElementById('sprints-view').classList.add('hidden');
                document.getElementById('current-view').textContent = 'Board';
                
                bottomNavItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                navItems.forEach(nav => nav.classList.remove('active'));
                document.querySelector('.nav-item[data-view="board"]')?.classList.add('active');
            } else if (view === 'sprints') {
                document.getElementById('board-view').style.display = 'none';
                document.getElementById('sprints-view').classList.remove('hidden');
                document.getElementById('current-view').textContent = 'Sprints';
                loadSprints();
                
                bottomNavItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                navItems.forEach(nav => nav.classList.remove('active'));
                document.querySelector('.nav-item[data-view="sprints"]')?.classList.add('active');
            }
        });
    });
    
    const bottomAddBtn = document.getElementById('bottom-add-btn');
    if (bottomAddBtn) {
        bottomAddBtn.addEventListener('click', () => {
            openTaskModal();
        });
    }
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                setTimeout(closeSidebar, 150);
            }
        });
    });
}

// ============================================
// Modal Controls
// ============================================

function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    const form = document.getElementById('task-form');
    if (form) form.reset();
}

function closeProjectModal() {
    const modal = document.getElementById('project-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    const form = document.getElementById('project-form');
    if (form) form.reset();
}

function closeSprintModal() {
    const modal = document.getElementById('sprint-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    const form = document.getElementById('sprint-form');
    if (form) form.reset();
}

function closeCommentModal() {
    const modal = document.getElementById('comment-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
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
    }
}

function openProjectModal() {
    console.log('Opening project modal');
    console.log('Current organization:', currentOrganization);
    
    if (!currentOrganization) {
        showToast('Loading organization... Please wait', 'warning');
        loadUserData().then(() => {
            if (currentOrganization) {
                const modal = document.getElementById('project-modal');
                if (modal) {
                    modal.style.display = 'flex';
                    modal.classList.add('active');
                }
            } else {
                showToast('Unable to load organization. Please refresh the page.', 'error');
            }
        });
        return;
    }
    
    const modal = document.getElementById('project-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    } else {
        console.error('Project modal not found');
    }
}

function openSprintModal() {
    if (!currentProject) {
        showToast('Please select a project first', 'warning');
        return;
    }
    const modal = document.getElementById('sprint-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

// ============================================
// Sprint Functions
// ============================================

async function loadSprints() {
    const sprintContainer = document.getElementById('sprint-tasks');
    if (sprintContainer) {
        sprintContainer.innerHTML = '<div class="empty-state"><p><i class="fas fa-calendar-alt"></i><br>Sprint feature coming soon!</p></div>';
    }
}

// ============================================
// Utility Functions
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ============================================
// Undo Delete Functions
// ============================================

/**
 * Show undo toast notification
 */
function showUndoToast(message, undoFunction) {
    const existingToast = document.querySelector('.undo-toast');
    if (existingToast) existingToast.remove();
    
    if (undoTimeout) {
        clearTimeout(undoTimeout);
        undoTimeout = null;
    }
    
    const toast = document.createElement('div');
    toast.className = 'undo-toast';
    toast.innerHTML = `
        <span>${escapeHtml(message)}</span>
        <button class="undo-btn">Undo</button>
    `;
    document.body.appendChild(toast);
    
    const undoBtn = toast.querySelector('.undo-btn');
    undoBtn.addEventListener('click', () => {
        undoFunction();
        toast.remove();
        if (undoTimeout) clearTimeout(undoTimeout);
        showToast('Action undone', 'success');
    });
    
    undoTimeout = setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.remove();
        }
        undoTimeout = null;
        deletedItem = null;
        deletedItemType = null;
    }, UNDO_DURATION);
}

/**
 * Delete a task with undo support
 */
async function deleteTaskWithUndo(taskId, taskData) {
    deletedItem = { id: taskId, ...taskData };
    deletedItemType = 'task';
    
    try {
        const commentsSnapshot = await db.collection('comments')
            .where('taskId', '==', taskId)
            .get();
        
        const batch = db.batch();
        commentsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        const taskRef = db.collection('tasks').doc(taskId);
        batch.delete(taskRef);
        
        await batch.commit();
        
        showUndoToast('Task deleted', () => undoDelete());
        closeCommentModal();
        await loadTasks();
        
    } catch (error) {
        console.error('Error deleting task:', error);
        showToast('Error deleting task: ' + error.message, 'error');
        deletedItem = null;
        deletedItemType = null;
    }
}

/**
 * Delete a project with undo support
 */
async function deleteProjectWithUndo(projectId, projectData) {
    deletedItem = { id: projectId, ...projectData };
    deletedItemType = 'project';
    
    try {
        const tasksSnapshot = await db.collection('tasks')
            .where('projectId', '==', projectId)
            .get();
        
        const batch = db.batch();
        const deletedTasks = [];
        
        for (const taskDoc of tasksSnapshot.docs) {
            const commentsSnapshot = await db.collection('comments')
                .where('taskId', '==', taskDoc.id)
                .get();
            
            commentsSnapshot.forEach(commentDoc => {
                batch.delete(commentDoc.ref);
            });
            
            batch.delete(taskDoc.ref);
            deletedTasks.push({ id: taskDoc.id, ...taskDoc.data() });
        }
        
        const projectRef = db.collection('projects').doc(projectId);
        batch.delete(projectRef);
        
        await batch.commit();
        
        if (deletedItem) {
            deletedItem.tasks = deletedTasks;
        }
        
        showUndoToast(`Project "${projectData.name}" deleted`, () => undoDelete());
        await loadProjects();
        
    } catch (error) {
        console.error('Error deleting project:', error);
        showToast('Error deleting project: ' + error.message, 'error');
        deletedItem = null;
        deletedItemType = null;
    }
}

/**
 * Undo the last delete operation
 */
async function undoDelete() {
    if (!deletedItem || !deletedItemType) {
        console.log('Nothing to undo');
        return;
    }
    
    try {
        if (deletedItemType === 'task') {
            const taskData = {
                projectId: deletedItem.projectId,
                title: deletedItem.title,
                description: deletedItem.description || '',
                priority: deletedItem.priority || 'medium',
                status: deletedItem.status || 'todo',
                assignedTo: deletedItem.assignedTo || null,
                dueDate: deletedItem.dueDate || null,
                estimatedHours: deletedItem.estimatedHours || 0,
                tags: deletedItem.tags || [],
                order: deletedItem.order || Date.now(),
                createdBy: deletedItem.createdBy,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('tasks').add(taskData);
            console.log('Task restored');
            
        } else if (deletedItemType === 'project') {
            const projectData = {
                organizationId: deletedItem.organizationId,
                name: deletedItem.name,
                description: deletedItem.description || '',
                color: deletedItem.color || '#16a34a',
                isArchived: false,
                createdBy: deletedItem.createdBy,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const projectRef = await db.collection('projects').add(projectData);
            console.log('Project restored:', projectRef.id);
            
            if (deletedItem.tasks && deletedItem.tasks.length > 0) {
                for (const task of deletedItem.tasks) {
                    const taskData = {
                        projectId: projectRef.id,
                        title: task.title,
                        description: task.description || '',
                        priority: task.priority || 'medium',
                        status: task.status || 'todo',
                        assignedTo: task.assignedTo || null,
                        dueDate: task.dueDate || null,
                        estimatedHours: task.estimatedHours || 0,
                        tags: task.tags || [],
                        order: task.order || Date.now(),
                        createdBy: task.createdBy,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    await db.collection('tasks').add(taskData);
                }
                console.log(`${deletedItem.tasks.length} tasks restored`);
            }
        }
        
        deletedItem = null;
        deletedItemType = null;
        
        if (deletedItemType === 'project') {
            await loadProjects();
        } else {
            await loadTasks();
        }
        
    } catch (error) {
        console.error('Error undoing delete:', error);
        showToast('Error undoing action', 'error');
    }
}

// ============================================
// Keyboard Shortcuts
// ============================================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const isTyping = e.target.matches('input, textarea, select, [contenteditable]');
        
        if (e.key === '?' && !isTyping) {
            e.preventDefault();
            showShortcutsHelp();
            return;
        }
        
        if (e.key === 'Escape') {
            if (isTyping) {
                const searchInput = document.getElementById('search-tasks');
                if (document.activeElement === searchInput && searchInput.value) {
                    searchInput.value = '';
                    searchTerm = '';
                    applySearchAndFilter();
                    const clearSearch = document.getElementById('clear-search');
                    if (clearSearch) clearSearch.style.display = 'none';
                }
            } else {
                closeAllModals();
            }
            return;
        }
        
        if (isTyping) return;
        
        if (e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            if (currentProject) {
                openTaskModal();
            } else {
                showToast('Please select a project first', 'warning');
            }
        }
        
        if (e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            openProjectModal();
        }
        
        if (e.key === '/') {
            e.preventDefault();
            const searchInput = document.getElementById('search-tasks');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            const filterBtn = document.getElementById('filter-btn');
            if (filterBtn) {
                filterBtn.click();
            }
        }
        
        if (e.key === 'b' || e.key === 'B') {
            e.preventDefault();
            switchToBoardView();
        }
        
        if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            switchToSprintsView();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            if (deletedItem) {
                undoDelete();
            }
        }
    });
}

function closeAllModals() {
    closeTaskModal();
    closeProjectModal();
    closeSprintModal();
    closeCommentModal();
    
    const filterDropdown = document.getElementById('filter-dropdown');
    if (filterDropdown) {
        filterDropdown.classList.remove('show');
    }
}

function switchToBoardView() {
    document.getElementById('board-view').style.display = 'flex';
    document.getElementById('sprints-view').classList.add('hidden');
    document.getElementById('current-view').textContent = 'Board';
    
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
        if (item.dataset?.view === 'board') {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function switchToSprintsView() {
    document.getElementById('board-view').style.display = 'none';
    document.getElementById('sprints-view').classList.remove('hidden');
    document.getElementById('current-view').textContent = 'Sprints';
    loadSprints();
    
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
        if (item.dataset?.view === 'sprints') {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function showShortcutsHelp() {
    let helpModal = document.getElementById('shortcuts-help-modal');
    
    if (!helpModal) {
        helpModal = document.createElement('div');
        helpModal.id = 'shortcuts-help-modal';
        helpModal.className = 'modal';
        helpModal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
                    <button class="close-modal" onclick="closeShortcutsHelp()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="shortcuts-grid">
                        <div class="shortcut-item"><kbd>N</kbd><span>New Task</span></div>
                        <div class="shortcut-item"><kbd>P</kbd><span>New Project</span></div>
                        <div class="shortcut-item"><kbd>/</kbd><span>Focus Search</span></div>
                        <div class="shortcut-item"><kbd>S</kbd><span>Focus Filter</span></div>
                        <div class="shortcut-item"><kbd>B</kbd><span>Board View</span></div>
                        <div class="shortcut-item"><kbd>R</kbd><span>Sprints View</span></div>
                        <div class="shortcut-item"><kbd>Esc</kbd><span>Close Modal / Clear Search</span></div>
                        <div class="shortcut-item"><kbd>Ctrl+Z</kbd> / <kbd>⌘+Z</kbd><span>Undo Delete</span></div>
                        <div class="shortcut-item"><kbd>?</kbd><span>Show this help</span></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeShortcutsHelp()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(helpModal);
    }
    
    helpModal.classList.add('active');
    helpModal.style.display = 'flex';
}

function closeShortcutsHelp() {
    const helpModal = document.getElementById('shortcuts-help-modal');
    if (helpModal) {
        helpModal.classList.remove('active');
        helpModal.style.display = 'none';
    }
}

window.closeShortcutsHelp = closeShortcutsHelp;

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