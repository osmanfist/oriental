/**
 * Oriental - Dashboard Module
 * Version: 1.1.0
 * 
 * Main application logic including task management, project handling,
 * real-time updates, and drag-and-drop functionality.
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

// ============================================
// Initialization
// ============================================

/**
 * Initialize dashboard when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Dashboard initializing...');
    
    // Setup event listeners FIRST so buttons are always responsive,
    // even if Firebase is slow or data loading fails
    setupEventListeners();
    
    try {
        await checkAuth();
        await loadUserData();
        await loadOrganization();
        await loadProjects();
        setupRealtimeSubscription();
        console.log('✅ Dashboard ready!');
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showToast('Error loading dashboard data. Please refresh.', 'error');
    }
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
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            currentOrganization = userData.currentOrganization;
            
            const orgNameElement = document.getElementById('org-name');
            if (orgNameElement) {
                orgNameElement.textContent = userData.name || currentUser.email;
            }
            console.log('User data loaded');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
    }
}

/**
 * Load organization details
 */
async function loadOrganization() {
    if (!currentOrganization) return;
    
    try {
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
    if (!currentOrganization) return;
    
    try {
        const projectsSnapshot = await db.collection('projects')
            .where('organizationId', '==', currentOrganization)
            .where('isArchived', '==', false)
            .orderBy('createdAt', 'desc')
            .get();
        
        const projectList = document.getElementById('project-list');
        if (!projectList) return;
        
        projectList.innerHTML = '';
        
        if (projectsSnapshot.empty) {
            projectList.innerHTML = '<div class="empty-state-small">No projects yet. Click + to create one.</div>';
            return;
        }
        
        projectsSnapshot.forEach(doc => {
            const project = { id: doc.id, ...doc.data() };
            const projectElement = createProjectElement(project);
            projectList.appendChild(projectElement);
            loadTaskCount(project.id, projectElement);
        });
        
        if (projectsSnapshot.docs.length > 0 && !currentProject) {
            const firstProject = { 
                id: projectsSnapshot.docs[0].id, 
                ...projectsSnapshot.docs[0].data() 
            };
            selectProject(firstProject);
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        showToast('Error loading projects', 'error');
    }
}

/**
 * Create project list item element
 */
function createProjectElement(project) {
    const div = document.createElement('div');
    div.className = `project-item ${currentProject && currentProject.id === project.id ? 'active' : ''}`;
    div.setAttribute('data-project-id', project.id);
    div.innerHTML = `
        <div class="project-color" style="background: ${project.color || '#6366f1'}"></div>
        <span class="project-name">${escapeHtml(project.name)}</span>
        <span class="project-count">0</span>
    `;
    div.addEventListener('click', () => selectProject(project));
    return div;
}

/**
 * Load task count for a project
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
    
    await loadTasks();
}

/**
 * Load tasks for current project
 */
async function loadTasks() {
    if (!currentProject) return;
    
    try {
        const tasksSnapshot = await db.collection('tasks')
            .where('projectId', '==', currentProject.id)
            .orderBy('createdAt', 'desc')
            .get();
        
        const tasks = [];
        tasksSnapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`Loaded ${tasks.length} tasks`);
        renderBoard(tasks);
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        showToast('Error loading tasks', 'error');
    }
}

// ============================================
// Render Functions
// ============================================

/**
 * Render the board view
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
 * Create a board column
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
 * Create a task card
 */
function createTaskCard(task) {
    const priorityClass = task.priority === 'high' ? 'priority-high' : 
                         (task.priority === 'medium' ? 'priority-medium' : 'priority-low');
    
    const priorityIcon = task.priority === 'high' ? 'fa-arrow-up' : 
                        (task.priority === 'medium' ? 'fa-minus' : 'fa-arrow-down');
    
    return `
        <div class="task-card" draggable="true" data-task-id="${task.id}" data-status="${task.status || 'todo'}">
            <div class="task-title">${escapeHtml(task.title)}</div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description.substring(0, 100))}</div>` : ''}
            <div class="task-meta">
                <span class="priority ${priorityClass}">
                    <i class="fas ${priorityIcon}"></i> ${task.priority || 'medium'}
                </span>
                <span class="assignee">
                    <i class="fas fa-user"></i>
                    ${task.assignedTo ? task.assignedTo.substring(0, 8) : 'Unassigned'}
                </span>
                <button class="comment-btn" onclick="event.stopPropagation(); openComments('${task.id}', '${escapeHtml(task.title)}')">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
        </div>
    `;
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
        task.addEventListener('dragstart', handleDragStart);
        task.addEventListener('dragend', handleDragEnd);
    });
    
    containers.forEach(container => {
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedTask = this;
    e.dataTransfer.setData('text/plain', this.dataset.taskId);
    this.style.opacity = '0.5';
}

function handleDragEnd(e) {
    if (draggedTask) {
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
        console.log('No project selected');
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
            estimatedHours: taskData.estimatedHours || 0,
            tags: taskData.tags || [],
            order: Date.now(),
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('Saving task to Firestore:', task);
        const docRef = await db.collection('tasks').add(task);
        console.log('Task created with ID:', docRef.id);
        showToast('Task created successfully', 'success');
        return true;
        
    } catch (error) {
        console.error('Error creating task:', error);
        showToast('Error creating task: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// Project CRUD
// ============================================

async function createProject(projectData) {
    if (!currentOrganization) {
        showToast('No organization found. Please log out and sign in again.', 'error');
        return false;
    }
    
    try {
        const project = {
            organizationId: currentOrganization,
            name: projectData.name,
            description: projectData.description || '',
            color: projectData.color || '#6366f1',
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
        showToast('Error creating project', 'error');
        return false;
    }
}

// ============================================
// Comments System
// ============================================

async function openComments(taskId, taskTitle) {
    currentTaskForComments = taskId;
    const modalTitle = document.getElementById('comment-task-title');
    if (modalTitle) {
        modalTitle.textContent = `Comments: ${taskTitle}`;
    }
    
    await loadComments(taskId);
    document.getElementById('comment-modal').classList.add('active');
}

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

function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.innerHTML = `
        <div class="comment-author">
            <i class="fas fa-user-circle"></i> ${escapeHtml(comment.userName || 'User')}
        </div>
        <div class="comment-content">${escapeHtml(comment.content)}</div>
        <div class="comment-time">
            ${comment.createdAt ? new Date(comment.createdAt.toDate()).toLocaleString() : 'Just now'}
        </div>
    `;
    return div;
}

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
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            console.log('Real-time update: tasks changed');
            const tasks = [];
            snapshot.forEach(doc => {
                tasks.push({ id: doc.id, ...doc.data() });
            });
            renderBoard(tasks);
        }, (error) => {
            console.error('Realtime subscription error:', error);
        });
}

// ============================================
// UI Event Listeners
// ============================================

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            if (view === 'board') {
                document.getElementById('board-view').style.display = 'flex';
                document.getElementById('sprints-view').style.display = 'none';
                currentView = 'board';
            } else if (view === 'sprints') {
                document.getElementById('board-view').style.display = 'none';
                document.getElementById('sprints-view').style.display = 'block';
                currentView = 'sprints';
                loadSprints();
            }
        });
    });
    
    // Create task button (opens modal)
    const createTaskBtn = document.getElementById('create-task-btn');
    if (createTaskBtn) {
        createTaskBtn.addEventListener('click', () => {
            console.log('New Task button clicked');
            if (!currentProject) {
                showToast('Please select a project first', 'warning');
                return;
            }
            const modal = document.getElementById('task-modal');
            if (modal) {
                modal.classList.add('active');
                console.log('Task modal opened');
            } else {
                console.error('Task modal not found!');
            }
        });
    } else {
        console.error('Create task button not found!');
    }
    
    // 🔥 FIXED: Task form submission
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        console.log('Task form found, attaching submit handler');
        
        // Remove any existing listeners to avoid duplicates
        const newForm = taskForm.cloneNode(true);
        taskForm.parentNode.replaceChild(newForm, taskForm);
        
        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔥 TASK FORM SUBMITTED! 🔥');
            
            // Get form values
            const title = document.getElementById('task-title')?.value;
            const description = document.getElementById('task-description')?.value;
            const priority = document.getElementById('task-priority')?.value;
            const assignedTo = document.getElementById('task-assignee')?.value;
            const dueDate = document.getElementById('task-due-date')?.value;
            
            console.log('Form values:', { title, description, priority, assignedTo, dueDate });
            
            if (!title) {
                showToast('Please enter a task title', 'warning');
                return;
            }
            
            const taskData = {
                title: title,
                description: description || '',
                priority: priority || 'medium',
                assignedTo: assignedTo || null,
                dueDate: dueDate || null,
                estimatedHours: 0
            };
            
            const success = await createTask(taskData);
            if (success) {
                console.log('Task created, closing modal and resetting form');
                closeTaskModal();
                newForm.reset();
                // Force reload tasks
                await loadTasks();
            }
        });
    } else {
        console.error('Task form not found! Check that id="task-form" exists in dashboard.html');
    }
    
    // Project form submission
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
    
    // Add project button
    const addProjectBtn = document.getElementById('add-project-btn');
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', () => {
            console.log('Add Project button clicked');
            document.getElementById('project-modal').classList.add('active');
        });
    }
    
    // Create sprint button
    const createSprintBtn = document.getElementById('create-sprint-btn');
    if (createSprintBtn) {
        createSprintBtn.addEventListener('click', () => {
            console.log('Create Sprint button clicked');
            document.getElementById('sprint-modal').classList.add('active');
        });
    }
    
    // Add comment button
    const addCommentBtn = document.getElementById('add-comment-btn');
    if (addCommentBtn) {
        addCommentBtn.addEventListener('click', async () => {
            const content = document.getElementById('new-comment').value;
            await addComment(currentTaskForComments, content);
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await auth.signOut();
            localStorage.removeItem('oriental_user');
            window.location.href = 'login.html';
        });
    }
    
    console.log('✅ Event listeners setup complete');
}

// ============================================
// Modal Controls
// ============================================

function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = '';
    }
    const form = document.getElementById('task-form');
    if (form) form.reset();
    console.log('Task modal closed');
}

function closeProjectModal() {
    const modal = document.getElementById('project-modal');
    if (modal) modal.classList.remove('active');
    const form = document.getElementById('project-form');
    if (form) form.reset();
}

function closeSprintModal() {
    const modal = document.getElementById('sprint-modal');
    if (modal) modal.classList.remove('active');
    const form = document.getElementById('sprint-form');
    if (form) form.reset();
}

function closeCommentModal() {
    const modal = document.getElementById('comment-modal');
    if (modal) modal.classList.remove('active');
    const textarea = document.getElementById('new-comment');
    if (textarea) textarea.value = '';
}

function openTaskModal() {
    console.log('Opening task modal');
    
    if (!currentProject) {
        showToast('Please select or create a project first', 'warning');
        return;
    }
    
    const modal = document.getElementById('task-modal');
    if (modal) {
        modal.classList.add('active');
        console.log('Task modal opened');
    } else {
        console.error('Task modal not found');
    }
}

function openProjectModal() {
    console.log('Opening project modal');
    const modal = document.getElementById('project-modal');
    if (modal) modal.classList.add('active');
}

function openSprintModal() {
    console.log('Opening sprint modal');
    if (!currentProject) {
        showToast('Please select a project first', 'warning');
        return;
    }
    const modal = document.getElementById('sprint-modal');
    if (modal) modal.classList.add('active');
}

// ============================================
// Sprint Functions
// ============================================

async function loadSprints() {
    const sprintContainer = document.getElementById('sprint-tasks');
    if (sprintContainer) {
        sprintContainer.innerHTML = '<div class="empty-state"><p>Sprint feature coming soon!</p></div>';
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
window.openComments = openComments;
window.openTaskModal = openTaskModal;
window.openProjectModal = openProjectModal;
window.openSprintModal = openSprintModal;
window.closeTaskModal = closeTaskModal;
window.closeProjectModal = closeProjectModal;
window.closeSprintModal = closeSprintModal;
window.closeCommentModal = closeCommentModal;
