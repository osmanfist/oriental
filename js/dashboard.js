/**
 * Oriental - Dashboard Module
 * Version: 2.1.0
 * 
 * Main application logic including task management, project handling,
 * real-time updates, drag-and-drop functionality, comments, search, and filters.
 * Updated with mobile fixes and improved organization loading.
 */

// ============================================
// Global State Variables
// ============================================
let currentUser = null;
let currentOrganization = null;
let currentProject = null;
let currentView = 'board';
let currentTaskForComments = null;
let unsubscribeTasks = null;
let allTasks = [];
let filteredTasks = [];
let searchTerm = '';
let activeFilters = {
    priorities: [],
    statuses: [],
    dueDates: []
};

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
            
            // Update organization name in sidebar
            const orgNameElement = document.getElementById('org-name');
            if (orgNameElement) {
                orgNameElement.textContent = userData.name || currentUser.email;
            }
            
            // Update user info section
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = userData.name || currentUser.displayName || 'User';
            }
            
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) {
                userEmailElement.textContent = currentUser.email;
            }
            
            // Force reload projects if organization was just loaded
            if (currentOrganization) {
                await loadProjects();
            }
            
        } else {
            console.warn('User document not found for:', currentUser.uid);
            
            // Fallback: use Firebase auth data
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
 * Create missing user document (for Google Sign-in users or edge cases)
 */
async function createMissingUserDocument() {
    try {
        console.log('Creating missing user document...');
        
        // Check if user has any organizations
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
        
        // Update UI
        const orgNameElement = document.getElementById('org-name');
        if (orgNameElement) {
            orgNameElement.textContent = currentUser.displayName || currentUser.email.split('@')[0];
        }
        
        // Reload projects
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
            projectList.innerHTML = '<div class="empty-state-small">No projects yet. Click + to create one.</div>';
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
        <button class="delete-project-btn" onclick="event.stopPropagation(); deleteProject('${project.id}', '${escapeHtml(project.name)}')">
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
    
    await loadTasks();
}

/**
 * Load tasks for current project
 */
async function loadTasks() {
    if (!currentProject) return;
    
    if (unsubscribeTasks) {
        unsubscribeTasks();
    }
    
    try {
        const tasksSnapshot = await db.collection('tasks')
            .where('projectId', '==', currentProject.id)
            .get();
        
        allTasks = [];
        tasksSnapshot.forEach(doc => {
            allTasks.push({ id: doc.id, ...doc.data() });
        });
        
        allTasks.sort((a, b) => {
            if (a.order && b.order) {
                return a.order - b.order;
            }
            if (a.createdAt && b.createdAt) {
                return b.createdAt.toDate() - a.createdAt.toDate();
            }
            return 0;
        });
        
        console.log(`Loaded ${allTasks.length} tasks`);
        applySearchAndFilter();
        
        setupRealtimeSubscription();
        setupSearchAndFilter();
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        showToast('Error loading tasks', 'error');
    }
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
    
    const filterDropdown = document.getElementById('filter-dropdown');
    if (filterDropdown) {
        filterDropdown.classList.remove('show');
    }
    updateFilterBadge();
    applySearchAndFilter();
}

function handleClearFilters() {
    document.querySelectorAll('.filter-priority, .filter-status, .filter-due')
        .forEach(cb => cb.checked = false);
    
    activeFilters = { priorities: [], statuses: [], dueDates: [] };
    updateFilterBadge();
    applySearchAndFilter();
}

/**
 * Update filter badge display
 */
function updateFilterBadge() {
    let badgeContainer = document.getElementById('active-filters');
    const totalFilters = activeFilters.priorities.length + activeFilters.statuses.length + activeFilters.dueDates.length;
    
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
 * Apply search and filter to tasks
 */
function applySearchAndFilter() {
    if (!allTasks) return;
    
    filteredTasks = allTasks.filter(task => {
        if (searchTerm) {
            const matchesTitle = task.title?.toLowerCase().includes(searchTerm);
            const matchesDesc = task.description?.toLowerCase().includes(searchTerm);
            const matchesTags = task.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
            if (!matchesTitle && !matchesDesc && !matchesTags) return false;
        }
        
        if (activeFilters.priorities.length > 0) {
            if (!activeFilters.priorities.includes(task.priority)) return false;
        }
        
        if (activeFilters.statuses.length > 0) {
            const taskStatus = task.status || 'todo';
            if (!activeFilters.statuses.includes(taskStatus)) return false;
        }
        
        if (activeFilters.dueDates.length > 0) {
            const dueStatus = getDueDateStatus(task.dueDate);
            if (!activeFilters.dueDates.includes(dueStatus)) return false;
        }
        
        return true;
    });
    
    renderBoard(filteredTasks);
}

// ============================================
// Render Functions
// ============================================

/**
 * Render the board view with tasks organized by status
 */
function renderBoard(tasks) {
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

/**
 * Delete a task
 */
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
        return false;
    }
    
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
        showToast('Task deleted successfully', 'success');
        closeCommentModal();
        return true;
        
    } catch (error) {
        console.error('Error deleting task:', error);
        showToast('Error deleting task: ' + error.message, 'error');
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

/**
 * Delete a project
 */
async function deleteProject(projectId, projectName) {
    if (!confirm(`Delete project "${projectName}"? This will also delete ALL tasks and comments in this project. This action cannot be undone.`)) {
        return false;
    }
    
    try {
        const tasksSnapshot = await db.collection('tasks')
            .where('projectId', '==', projectId)
            .get();
        
        const batch = db.batch();
        
        for (const taskDoc of tasksSnapshot.docs) {
            const commentsSnapshot = await db.collection('comments')
                .where('taskId', '==', taskDoc.id)
                .get();
            
            commentsSnapshot.forEach(commentDoc => {
                batch.delete(commentDoc.ref);
            });
            
            batch.delete(taskDoc.ref);
        }
        
        const projectRef = db.collection('projects').doc(projectId);
        batch.delete(projectRef);
        
        await batch.commit();
        showToast(`Project "${projectName}" deleted successfully`, 'success');
        await loadProjects();
        return true;
        
    } catch (error) {
        console.error('Error deleting project:', error);
        showToast('Error deleting project: ' + error.message, 'error');
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
            loadTasks();
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
            if (taskId) {
                await deleteTask(taskId);
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
    // Mobile menu button
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
    
    // Bottom navigation
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    const navItems = document.querySelectorAll('.nav-item');
    
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            if (view === 'board') {
                document.getElementById('board-view').style.display = 'flex';
                document.getElementById('sprints-view').classList.add('hidden');
                document.getElementById('current-view').textContent = 'Board';
                
                // Update active states
                bottomNavItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                navItems.forEach(nav => nav.classList.remove('active'));
                document.querySelector('.nav-item[data-view="board"]')?.classList.add('active');
            } else if (view === 'sprints') {
                document.getElementById('board-view').style.display = 'none';
                document.getElementById('sprints-view').classList.remove('hidden');
                document.getElementById('current-view').textContent = 'Sprints';
                loadSprints();
                
                // Update active states
                bottomNavItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                navItems.forEach(nav => nav.classList.remove('active'));
                document.querySelector('.nav-item[data-view="sprints"]')?.classList.add('active');
            }
        });
    });
    
    // Bottom add button
    const bottomAddBtn = document.getElementById('bottom-add-btn');
    if (bottomAddBtn) {
        bottomAddBtn.addEventListener('click', () => {
            openTaskModal();
        });
    }
    
    // Close sidebar when clicking a nav link on mobile
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
        // Try to reload user data
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
// Global Exports
// ============================================
window.openTaskDetail = openTaskDetail;
window.deleteTask = deleteTask;
window.deleteProject = deleteProject;
window.updateTask = updateTask;
window.removeFilter = removeFilter;
window.closeTaskModal = closeTaskModal;
window.closeProjectModal = closeProjectModal;
window.closeSprintModal = closeSprintModal;
window.closeCommentModal = closeCommentModal;
window.openTaskModal = openTaskModal;
window.openProjectModal = openProjectModal;
window.openSprintModal = openSprintModal;