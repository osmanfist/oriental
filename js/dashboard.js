/**
 * Oriental - Dashboard Module
 * Version: 1.1.0
 *
 * Main application logic: task management, project handling,
 * real-time updates, drag-and-drop, sprints, and comments.
 *
 * Changes from v1.0.0:
 *  - Fixed userData scope bug (lines that ran outside try block)
 *  - Fixed infinite real-time loop (onSnapshot → loadTasks → setupRealtimeSubscription)
 *  - checkAuth now unsubscribes its listener immediately after first call
 *  - All event listeners centralised in setupEventListeners() — no more inline onclick
 *  - Visibility toggling uses classList exclusively (no mixed style.display)
 *  - Duplicate logout button IDs resolved (one shared handler, two IDs)
 *  - localStorage removed — Firebase Auth already caches the user
 */

// ============================================
// Global State
// ============================================
let currentUser         = null;
let currentOrganization = null;
let currentProject      = null;
let currentView         = 'board';
let currentTaskForComments = null;
let unsubscribeTasks    = null;

// ============================================
// Initialisation
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard initialising…');
    await checkAuth();
    await loadUserData();
    await loadOrganization();
    await loadProjects();
    setupEventListeners();
    console.log('Dashboard ready');
});

/**
 * Verify the user is authenticated.
 * Unsubscribes the Firebase listener as soon as we have a result so it
 * doesn't accumulate across re-renders.
 * @returns {Promise<void>}
 */
function checkAuth() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe(); // clean up — we only need the first result
            if (!user) {
                console.log('Not authenticated — redirecting to login');
                window.location.href = 'login.html';
                return; // do not resolve; navigation is in progress
            }
            currentUser = user;
            console.log('Authenticated:', user.email);
            resolve();
        });
    });
}

// ============================================
// Data Loading
// ============================================

/**
 * Load the current user's document and populate the sidebar header.
 */
async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            currentOrganization = userData.currentOrganization;

            // Populate sidebar user info — both elements live inside the try
            // block so userData is guaranteed to be defined here
            const nameEl  = document.getElementById('user-name');
            const emailEl = document.getElementById('user-email');
            if (nameEl)  nameEl.textContent  = userData.name  || currentUser.email;
            if (emailEl) emailEl.textContent = currentUser.email;

            console.log('User data loaded');
        } else {
            console.warn('User document not found for UID:', currentUser.uid);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
    }
}

/**
 * Load organisation details and display the org name in the sidebar.
 */
async function loadOrganization() {
    if (!currentOrganization) return;

    try {
        const orgDoc = await db.collection('organizations').doc(currentOrganization).get();

        if (orgDoc.exists) {
            const orgData = orgDoc.data();
            const orgNameEl = document.getElementById('org-name');
            if (orgNameEl) orgNameEl.textContent = orgData.name;
            console.log('Organisation loaded:', orgData.name);
        }
    } catch (error) {
        console.error('Error loading organisation:', error);
    }
}

/**
 * Load all non-archived projects for the current organisation.
 */
async function loadProjects() {
    if (!currentOrganization) return;

    try {
        const snapshot = await db.collection('projects')
            .where('organizationId', '==', currentOrganization)
            .where('isArchived', '==', false)
            .orderBy('createdAt', 'desc')
            .get();

        const projectList = document.getElementById('project-list');
        if (!projectList) return;

        projectList.innerHTML = '';

        if (snapshot.empty) {
            projectList.innerHTML =
                '<div class="empty-state-small">No projects yet. Click + to create one.</div>';
            return;
        }

        snapshot.forEach((doc) => {
            const project = { id: doc.id, ...doc.data() };
            const el = createProjectElement(project);
            projectList.appendChild(el);
            loadTaskCount(project.id, el);
        });

        // Auto-select the first project if none is already active
        if (!currentProject) {
            const first = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            selectProject(first);
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        showToast('Error loading projects', 'error');
    }
}

/**
 * Create a sidebar project list item element.
 * @param {Object} project
 * @returns {HTMLElement}
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
 * Fetch the task count for a project and update the badge in the sidebar.
 * Uses the Firestore count() aggregate to avoid loading full documents.
 * Falls back to a regular get() for SDK versions older than 9.8.
 *
 * @param {string}      projectId
 * @param {HTMLElement} projectElement
 */
async function loadTaskCount(projectId, projectElement) {
    try {
        const query = db.collection('tasks').where('projectId', '==', projectId);
        let count;

        if (typeof query.count === 'function') {
            // SDK ≥ 9.8 — aggregate count, zero document reads
            const snap = await query.count().get();
            count = snap.data().count;
        } else {
            // Fallback for older SDK versions
            const snap = await query.get();
            count = snap.size;
        }

        const countSpan = projectElement.querySelector('.project-count');
        if (countSpan) countSpan.textContent = count;
    } catch (error) {
        console.error('Error loading task count:', error);
    }
}

/**
 * Mark a project as active and load its tasks.
 * @param {Object} project
 */
async function selectProject(project) {
    currentProject = project;
    console.log('Project selected:', project.name);

    // Highlight the active item in the sidebar
    document.querySelectorAll('.project-item').forEach((item) => {
        item.classList.toggle('active', item.getAttribute('data-project-id') === project.id);
    });

    // Update the main header
    const headerTitle = document.querySelector('.dashboard-header h1');
    if (headerTitle) headerTitle.textContent = project.name;

    // Start the real-time subscription for this project's tasks.
    // setupRealtimeSubscription both sets up the listener AND renders the board,
    // so there is no separate loadTasks() call needed here.
    setupRealtimeSubscription();
}

// ============================================
// Real-time Subscription
// ============================================

/**
 * Register a Firestore real-time listener for the current project's tasks.
 *
 * The listener renders the board directly from snapshot data — there is no
 * separate loadTasks() step, which previously caused an infinite loop:
 *   onSnapshot → loadTasks → setupRealtimeSubscription → onSnapshot → …
 *
 * Call this once when a project is selected. It cleans up the previous
 * listener automatically.
 */
function setupRealtimeSubscription() {
    if (!currentProject) return;

    // Cancel the previous listener before registering a new one
    if (unsubscribeTasks) {
        unsubscribeTasks();
        unsubscribeTasks = null;
    }

    unsubscribeTasks = db.collection('tasks')
        .where('projectId', '==', currentProject.id)
        .orderBy('order', 'asc')
        .orderBy('createdAt', 'desc')
        .onSnapshot(
            (snapshot) => {
                const tasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                console.log(`Real-time update: ${tasks.length} tasks`);
                renderBoard(tasks);
            },
            (error) => {
                console.error('Real-time subscription error:', error);
                showToast('Lost real-time connection. Please refresh.', 'error');
            }
        );
}

// ============================================
// Render Functions
// ============================================

/**
 * Render the Kanban board, grouping tasks into three columns.
 * @param {Array} tasks
 */
function renderBoard(tasks) {
    const columns = {
        'todo':        { title: 'To Do',       tasks: [], icon: 'fa-circle',       color: '#9ca3af' },
        'in-progress': { title: 'In Progress',  tasks: [], icon: 'fa-spinner',      color: '#3b82f6' },
        'done':        { title: 'Done',          tasks: [], icon: 'fa-check-circle', color: '#10b981' },
    };

    tasks.forEach((task) => {
        const status = task.status || 'todo';
        if (columns[status]) columns[status].tasks.push(task);
    });

    const boardView = document.getElementById('board-view');
    if (!boardView) return;

    boardView.innerHTML = '';

    for (const [key, column] of Object.entries(columns)) {
        boardView.appendChild(createColumnElement(key, column));
    }

    setupDragAndDrop();
}

/**
 * Build a board column element.
 * @param {string} status
 * @param {Object} column
 * @returns {HTMLElement}
 */
function createColumnElement(status, column) {
    const div = document.createElement('div');
    div.className = 'board-column';
    div.setAttribute('data-status', status);

    div.innerHTML = `
        <div class="column-header">
            <span class="column-title">
                <i class="fas ${column.icon}" style="color: ${column.color}"></i>
                ${column.title}
            </span>
            <span class="column-count">${column.tasks.length}</span>
        </div>
        <div class="tasks-container" data-status="${status}">
            ${column.tasks.map(createTaskCard).join('')}
        </div>
    `;

    return div;
}

/**
 * Return the HTML string for a task card.
 * @param {Object} task
 * @returns {string}
 */
function createTaskCard(task) {
    const priorityClass = task.priority === 'high'   ? 'priority-high'   :
                          task.priority === 'medium' ? 'priority-medium' : 'priority-low';
    const priorityIcon  = task.priority === 'high'   ? 'fa-arrow-up'     :
                          task.priority === 'medium' ? 'fa-minus'        : 'fa-arrow-down';

    // Note: openComments is called via a data attribute + delegated listener
    // in setupEventListeners() — not an inline onclick — so window export is
    // no longer required for this handler.
    return `
        <div class="task-card" draggable="true"
             data-task-id="${escapeHtml(task.id)}"
             data-status="${escapeHtml(task.status || 'todo')}">
            <div class="task-title">${escapeHtml(task.title)}</div>
            ${task.description
                ? `<div class="task-description">${escapeHtml(task.description.substring(0, 100))}</div>`
                : ''}
            <div class="task-meta">
                <span class="priority ${priorityClass}">
                    <i class="fas ${priorityIcon}"></i> ${escapeHtml(task.priority || 'medium')}
                </span>
                <span class="assignee">
                    <i class="fas fa-user"></i>
                    ${task.assignedTo ? escapeHtml(task.assignedTo.substring(0, 8)) : 'Unassigned'}
                </span>
                <button class="comment-btn"
                        data-task-id="${escapeHtml(task.id)}"
                        data-task-title="${escapeHtml(task.title)}"
                        aria-label="View comments">
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
    document.querySelectorAll('.task-card').forEach((card) => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend',   handleDragEnd);
    });

    document.querySelectorAll('.tasks-container').forEach((container) => {
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('drop',     handleDrop);
    });
}

function handleDragStart(e) {
    draggedTask = this;
    e.dataTransfer.setData('text/plain', this.dataset.taskId);
    this.style.opacity = '0.5';
}

function handleDragEnd() {
    if (draggedTask) draggedTask.style.opacity = '';
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
    const taskId    = draggedTask.dataset.taskId;
    const oldStatus = draggedTask.dataset.status;

    if (newStatus === oldStatus) return;

    try {
        await db.collection('tasks').doc(taskId).update({
            status:    newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        showToast('Task status updated', 'success');
    } catch (error) {
        console.error('Error updating task status:', error);
        showToast('Error updating task', 'error');
    }
}

// ============================================
// Task CRUD
// ============================================

/**
 * Create a new task in Firestore for the current project.
 * @param {Object} taskData
 * @returns {Promise<boolean>}
 */
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
        await db.collection('tasks').add({
            projectId:      currentProject.id,
            title:          taskData.title,
            description:    taskData.description   || '',
            priority:       taskData.priority      || 'medium',
            status:         'todo',
            assignedTo:     taskData.assignedTo    || null,
            dueDate:        taskData.dueDate       || null,
            estimatedHours: taskData.estimatedHours || 0,
            tags:           taskData.tags          || [],
            order:          Date.now(),
            createdBy:      currentUser.uid,
            createdAt:      firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt:      firebase.firestore.FieldValue.serverTimestamp(),
        });

        showToast('Task created', 'success');
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

/**
 * Create a new project in the current organisation.
 * @param {Object} projectData
 * @returns {Promise<boolean>}
 */
async function createProject(projectData) {
    if (!currentOrganization) return false;

    try {
        await db.collection('projects').add({
            organizationId: currentOrganization,
            name:           projectData.name,
            description:    projectData.description || '',
            color:          projectData.color       || '#6366f1',
            isArchived:     false,
            createdBy:      currentUser.uid,
            createdAt:      firebase.firestore.FieldValue.serverTimestamp(),
        });

        showToast('Project created', 'success');
        await loadProjects();
        return true;
    } catch (error) {
        console.error('Error creating project:', error);
        showToast('Error creating project', 'error');
        return false;
    }
}

// ============================================
// Comments
// ============================================

async function openComments(taskId, taskTitle) {
    currentTaskForComments = taskId;
    const modalTitle = document.getElementById('comment-task-title');
    if (modalTitle) modalTitle.textContent = `Comments: ${taskTitle}`;
    await loadComments(taskId);
    document.getElementById('comment-modal').classList.add('active');
}

async function loadComments(taskId) {
    try {
        const snapshot = await db.collection('comments')
            .where('taskId', '==', taskId)
            .orderBy('createdAt', 'desc')
            .get();

        const list = document.getElementById('comments-list');
        if (!list) return;

        list.innerHTML = '';

        if (snapshot.empty) {
            list.innerHTML =
                '<div class="empty-state"><p><i class="fas fa-comments"></i><br>No comments yet</p></div>';
            return;
        }

        snapshot.forEach((doc) => {
            list.appendChild(createCommentElement(doc.data()));
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
            taskId,
            userId:    currentUser.uid,
            userName:  currentUser.displayName || currentUser.email,
            content:   content.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
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
// Sprints (placeholder)
// ============================================

async function loadSprints() {
    const container = document.getElementById('sprint-tasks');
    if (container) {
        container.innerHTML =
            '<div class="empty-state"><p><i class="fas fa-calendar-alt"></i><br>Sprint feature coming soon!</p></div>';
    }
}

// ============================================
// Modal Controls
// ============================================

function openTaskModal() {
    if (!currentProject) {
        showToast('Please select a project first', 'warning');
        return;
    }
    document.getElementById('task-modal').classList.add('active');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.remove('active');
    document.getElementById('task-form')?.reset();
}

function openProjectModal() {
    document.getElementById('project-modal').classList.add('active');
}

function closeProjectModal() {
    document.getElementById('project-modal').classList.remove('active');
    document.getElementById('project-form')?.reset();
}

function openSprintModal() {
    if (!currentProject) {
        showToast('Please select a project first', 'warning');
        return;
    }
    document.getElementById('sprint-modal').classList.add('active');
}

function closeSprintModal() {
    document.getElementById('sprint-modal').classList.remove('active');
    document.getElementById('sprint-form')?.reset();
}

function closeCommentModal() {
    document.getElementById('comment-modal').classList.remove('active');
    const textarea = document.getElementById('new-comment');
    if (textarea) textarea.value = '';
}

// ============================================
// Event Listeners
// ============================================

/**
 * Attach all event listeners in one place.
 * No inline onclick attributes are used — all handlers are registered here.
 */
function setupEventListeners() {
    // ---- Navigation (Board / Sprints) ----
    document.querySelectorAll('.nav-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;

            document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));
            item.classList.add('active');

            // Use classList for all visibility toggling — no style.display
            const boardView   = document.getElementById('board-view');
            const sprintsView = document.getElementById('sprints-view');

            if (view === 'board') {
                boardView.classList.remove('hidden');
                sprintsView.classList.add('hidden');
                currentView = 'board';
            } else if (view === 'sprints') {
                boardView.classList.add('hidden');
                sprintsView.classList.remove('hidden');
                currentView = 'sprints';
                loadSprints();
            }
        });
    });

    // ---- New Task button ----
    document.getElementById('create-task-btn')
        ?.addEventListener('click', openTaskModal);

    // ---- Add Project button ----
    document.getElementById('add-project-btn')
        ?.addEventListener('click', openProjectModal);

    // ---- Create Sprint button ----
    document.getElementById('create-sprint-btn')
        ?.addEventListener('click', openSprintModal);

    // ---- Modal close buttons ----
    document.querySelectorAll('.close-modal').forEach((btn) => {
        btn.addEventListener('click', () => {
            // Find the parent modal and remove the active class
            const modal = btn.closest('.modal');
            if (modal) modal.classList.remove('active');
        });
    });

    // ---- Cancel buttons in modals ----
    document.querySelectorAll('[data-dismiss="modal"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            btn.closest('.modal')?.classList.remove('active');
        });
    });

    // ---- Task form ----
    document.getElementById('task-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskData = {
            title:          document.getElementById('task-title').value,
            description:    document.getElementById('task-description').value,
            priority:       document.getElementById('task-priority').value,
            assignedTo:     document.getElementById('task-assignee').value,
            dueDate:        document.getElementById('task-due-date').value,
            estimatedHours: parseFloat(document.getElementById('task-estimate')?.value || 0),
        };
        const success = await createTask(taskData);
        if (success) closeTaskModal();
    });

    // ---- Project form ----
    document.getElementById('project-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const projectData = {
            name:        document.getElementById('project-name').value,
            description: document.getElementById('project-description').value,
            color:       document.getElementById('project-color')?.value,
        };
        const success = await createProject(projectData);
        if (success) closeProjectModal();
    });

    // ---- Sprint form ----
    document.getElementById('sprint-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Sprint creation logic goes here when the feature is implemented
        showToast('Sprint feature coming soon!', 'info');
        closeSprintModal();
    });

    // ---- Add Comment button ----
    document.getElementById('add-comment-btn')?.addEventListener('click', async () => {
        const content = document.getElementById('new-comment').value;
        await addComment(currentTaskForComments, content);
    });

    // ---- Comment modal close ----
    // The generic .close-modal handler above covers this, but keep the
    // explicit close as well in case the modal has its own Cancel button.
    document.querySelector('#comment-modal .btn-secondary')
        ?.addEventListener('click', closeCommentModal);

    // ---- Delegated listener for comment buttons on task cards ----
    // Task cards are re-rendered on every real-time update so we delegate
    // to the board container to avoid re-attaching on every render.
    document.getElementById('board-view')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.comment-btn');
        if (!btn) return;
        e.stopPropagation();
        const { taskId, taskTitle } = btn.dataset;
        if (taskId) openComments(taskId, taskTitle || 'Task');
    });

    // ---- Logout buttons (icon in user-info bar + text button in sidebar footer) ----
    // Both buttons share the same handler; they now have distinct IDs.
    const handleLogout = async () => {
        console.log('Signing out…');
        if (unsubscribeTasks) unsubscribeTasks();
        await auth.signOut();
        window.location.href = 'login.html';
    };

    document.getElementById('logout-btn-icon')?.addEventListener('click', handleLogout);
    document.getElementById('logout-btn-sidebar')?.addEventListener('click', handleLogout);

    console.log('Event listeners ready');
}

// ============================================
// Utility Functions
// ============================================

/**
 * Escape HTML entities to prevent XSS.
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Display a brief toast notification.
 * @param {string} message
 * @param {'info'|'success'|'warning'|'error'} type
 */
function showToast(message, type = 'info') {
    const icons = {
        success: 'fa-check-circle',
        error:   'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info:    'fa-info-circle',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${escapeHtml(message)}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}
