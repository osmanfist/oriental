/**
 * Oriental - Dashboard Module
 * Version: 1.1.0
 * 
 * Main application logic including task management, project handling,
 * real-time updates, drag-and-drop functionality, and comments.
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
    await checkAuth();
    await loadUserData();
    await loadOrganization();
    await loadProjects();
    setupEventListeners();
    setupRealtimeSubscription();
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
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            currentOrganization = userData.currentOrganization;
            
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
            
            console.log('User data loaded');
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
            .get();
        
        const projectList = document.getElementById('project-list');
        if (!projectList) return;
        
        projectList.innerHTML = '';
        
        // Sort manually
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
        
        // Select first project if none selected
        if (projects.length > 0 && !currentProject) {
            selectProject(projects[0]);
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
    
    // Update UI
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-project-id') === project.id) {
            item.classList.add('active');
        }
    });
    
    // Update header
    const headerTitle = document.querySelector('.dashboard-header h1');
    if (headerTitle) {
        headerTitle.textContent = project.name;
    }
    
    // Load tasks for this project
    await loadTasks();
}

/**
 * Load tasks for current project
 */
async function loadTasks() {
    if (!currentProject) return;
    
    // Clean up previous subscription
    if (unsubscribeTasks) {
        unsubscribeTasks();
    }
    
    try {
        const tasksSnapshot = await db.collection('tasks')
            .where('projectId', '==', currentProject.id)
            .get();
        
        const tasks = [];
        tasksSnapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort manually
        tasks.sort((a, b) => {
            if (a.order && b.order) {
                return a.order - b.order;
            }
            if (a.createdAt && b.createdAt) {
                return b.createdAt.toDate() - a.createdAt.toDate();
            }
            return 0;
        });
        
        console.log(`Loaded ${tasks.length} tasks`);
        renderBoard(tasks);
        
        // Set up real-time listener
        setupRealtimeSubscription();
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        showToast('Error loading tasks', 'error');
    }
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
    
    // Organize tasks by status
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
    
    // Setup drag and drop after rendering
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
 * Create a task card element with onclick handler
 */
function createTaskCard(task) {
    const priorityClass = task.priority === 'high' ? 'priority-high' : 
                         (task.priority === 'medium' ? 'priority-medium' : 'priority-low');
    
    const priorityIcon = task.priority === 'high' ? 'fa-arrow-up' : 
                        (task.priority === 'medium' ? 'fa-minus' : 'fa-arrow-down');
    
    // Escape task ID for safe use in onclick
    const safeTaskId = task.id.replace(/'/g, "\\'");
    
    return `
        <div class="task-card" 
             draggable="true" 
             data-task-id="${task.id}" 
             data-status="${task.status || 'todo'}" 
             onclick="openTaskDetail('${safeTaskId}')">
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

/**
 * Setup drag and drop event listeners
 */
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

/**
 * Handle drag start event
 */
function handleDragStart(e) {
    draggedTask = this;
    e.dataTransfer.setData('text/plain', this.dataset.taskId);
    this.style.opacity = '0.5';
}

/**
 * Handle drag end event
 */
function handleDragEnd(e) {
    if (draggedTask) {
        draggedTask.style.opacity = '';
    }
    draggedTask = null;
}

/**
 * Handle drag over event
 */
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

/**
 * Handle drop event - update task status
 */
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
// Task Detail & Comments System
// ============================================

/**
 * Open task detail modal (shows comments and task info)
 */
async function openTaskDetail(taskId) {
    console.log('🔍 Opening task detail for:', taskId);
    currentTaskForComments = taskId;
    
    try {
        // Fetch task data to display title
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        
        if (taskDoc.exists) {
            const task = taskDoc.data();
            const modalTitle = document.getElementById('comment-task-title');
            if (modalTitle) {
                modalTitle.textContent = task.title;
            }
        } else {
            const modalTitle = document.getElementById('comment-task-title');
            if (modalTitle) {
                modalTitle.textContent = 'Task Comments';
            }
        }
        
        // Load and display comments
        await loadComments(taskId);
        
        // Open modal
        const modal = document.getElementById('comment-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            console.log('✅ Comment modal opened');
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
        console.log('📝 Loading comments for task:', taskId);
        
        const commentsSnapshot = await db.collection('comments')
            .where('taskId', '==', taskId)
            .orderBy('createdAt', 'desc')
            .get();
        
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) {
            console.error('Comments list element not found');
            return;
        }
        
        commentsList.innerHTML = '';
        
        if (commentsSnapshot.empty) {
            commentsList.innerHTML = '<div class="empty-state"><p><i class="fas fa-comments"></i><br>No comments yet</p></div>';
            console.log('No comments found');
            return;
        }
        
        console.log(`✅ Found ${commentsSnapshot.size} comments`);
        
        commentsSnapshot.forEach(doc => {
            const comment = doc.data();
            const commentElement = createCommentElement(comment);
            commentsList.appendChild(commentElement);
        });
        
    } catch (error) {
        console.error('Error loading comments:', error);
        const commentsList = document.getElementById('comments-list');
        if (commentsList) {
            commentsList.innerHTML = '<div class="empty-state"><p>Error loading comments</p></div>';
        }
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
// Project CRUD Operations
// ============================================

/**
 * Create a new project
 */
async function createProject(projectData) {
    if (!currentOrganization) return false;
    
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
// Real-time Subscriptions
// ============================================

/**
 * Set up real-time listener for tasks
 */
function setupRealtimeSubscription() {
    if (!currentProject) return;
    
    // Clean up previous subscription
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

/**
 * Setup all event listeners
 */
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
    
    // Task form submission
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
                estimatedHours: parseFloat(document.getElementById('task-estimate')?.value || 0)
            };
            
            const success = await createTask(taskData);
            if (success) {
                closeTaskModal();
                taskForm.reset();
            }
        });
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
    
    // Add comment button
    const addCommentBtn = document.getElementById('add-comment-btn');
    if (addCommentBtn) {
        // Remove existing listeners to avoid duplicates
        const newAddBtn = addCommentBtn.cloneNode(true);
        addCommentBtn.parentNode.replaceChild(newAddBtn, addCommentBtn);
        
        newAddBtn.addEventListener('click', async () => {
            const content = document.getElementById('new-comment').value;
            console.log('💬 Add comment clicked, content:', content);
            
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
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            console.log('Logging out...');
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
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    const form = document.getElementById('task-form');
    if (form) form.reset();
    console.log('Task modal closed');
}

function closeProjectModal() {
    const modal = document.getElementById('project-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    const form = document.getElementById('project-form');
    if (form) form.reset();
    console.log('Project modal closed');
}

function closeSprintModal() {
    const modal = document.getElementById('sprint-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    const form = document.getElementById('sprint-form');
    if (form) form.reset();
    console.log('Sprint modal closed');
}

function closeCommentModal() {
    const modal = document.getElementById('comment-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    const textarea = document.getElementById('new-comment');
    if (textarea) textarea.value = '';
    console.log('Comment modal closed');
}

function openTaskModal() {
    console.log('Opening task modal');
    if (!currentProject) {
        showToast('Please select a project first', 'warning');
        return;
    }
    const modal = document.getElementById('task-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        console.log('Task modal opened');
    } else {
        console.error('Task modal not found');
    }
}

function openProjectModal() {
    console.log('Opening project modal');
    const modal = document.getElementById('project-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        console.log('Project modal opened');
    } else {
        console.error('Project modal not found');
    }
}

function openSprintModal() {
    console.log('Opening sprint modal');
    if (!currentProject) {
        showToast('Please select a project first', 'warning');
        return;
    }
    const modal = document.getElementById('sprint-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        console.log('Sprint modal opened');
    } else {
        console.error('Sprint modal not found');
    }
}

// ============================================
// Sprint Functions (Placeholder for future enhancement)
// ============================================

async function loadSprints() {
    console.log('Loading sprints view');
    const sprintContainer = document.getElementById('sprint-tasks');
    if (sprintContainer) {
        sprintContainer.innerHTML = '<div class="empty-state"><p><i class="fas fa-calendar-alt"></i><br>Sprint feature coming soon!</p></div>';
    }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show toast notification
 */
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
// Global Exports (for inline onclick handlers)
// ============================================
window.openTaskDetail = openTaskDetail;
window.closeTaskModal = closeTaskModal;
window.closeProjectModal = closeProjectModal;
window.closeSprintModal = closeSprintModal;
window.closeCommentModal = closeCommentModal;
window.openTaskModal = openTaskModal;
window.openProjectModal = openProjectModal;
window.openSprintModal = openSprintModal;