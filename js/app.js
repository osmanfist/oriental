/**
 * Oriental v3.0.0 - Main Application Entry
 * Initializes all modules and manages application state
 */

class OrientalApp {
    constructor() {
        this.version = '3.0.0';
        this.modules = {};
        this.state = {
            currentOrganization: null,
            currentProject: null,
            currentView: 'board',
            currentSprint: null,
            theme: 'system',
            language: 'en'
        };
        this.initialized = false;
    }

    async init() {
    console.log(`🚀 Oriental v${this.version} Initializing...`);
    this.showLoading(true);

    try {
        // Step 1: Initialize auth
        const user = await authManager.init();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Step 2: Load user data
        await this.loadUserData();

        // Step 3: Setup organization
        await this.setupOrganization();

        // Step 4: Initialize modules
        await this.initModules();

        // Step 5: Load projects list
        await this.loadProjectsList();  // ADD THIS LINE

        // Step 6: Setup event listeners
        this.setupEventListeners();

        // Step 7: Load initial view
        await this.loadView('board');

        // Step 8: Setup real-time subscriptions
        this.setupRealtimeSubscriptions();

        this.initialized = true;
        this.showLoading(false);
        
        console.log('✅ Oriental ready!');
        this.checkSeedData();

    } catch (error) {
        console.error('Initialization error:', error);
        this.showError('Failed to initialize application');
        this.showLoading(false);
    }
}

    async loadUserData() {
        const user = authManager.getCurrentUser();
        if (!user) return;

        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            user.userData = userData;
            this.state.currentOrganization = userData.currentOrganization;
            
            // Update UI
            document.getElementById('user-name').textContent = userData.name || user.email;
            document.getElementById('user-email').textContent = user.email;
        } else {
            // Create user document
            await authManager.ensureUserDocument(user);
            await this.loadUserData();
            return;
        }
    }

    async setupOrganization() {
        if (!this.state.currentOrganization) {
            await this.showOrganizationSetup();
            return;
        }

        try {
            const orgDoc = await db.collection('organizations')
                .doc(this.state.currentOrganization)
                .get();

            if (orgDoc.exists) {
                const orgData = orgDoc.data();
                document.getElementById('org-name').textContent = orgData.name;
                
                // Load user role
                const role = await rolesManager.getUserRole(
                    authManager.getCurrentUser().uid,
                    this.state.currentOrganization
                );
                
                const viewType = rolesManager.getViewType(role.role);
                document.getElementById('org-role').textContent = role.name;
                document.getElementById('org-role').style.color = role.color;
                
                this.state.viewType = viewType;
                this.state.userRole = role;
                
                // Configure UI based on role
                this.configureUIForRole(role);
            }
        } catch (error) {
            console.error('Error loading organization:', error);
        }
    }

    configureUIForRole(role) {
        const viewType = role.role;
        
        // Navigation visibility
        const navConfig = {
            reports: ['admin', 'manager', 'team_lead'].includes(viewType),
            sprints: ['admin', 'manager', 'team_lead'].includes(viewType),
            settings: ['admin'].includes(viewType),
            templates: ['admin', 'manager'].includes(viewType)
        };

        for (const [view, visible] of Object.entries(navConfig)) {
            const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
            const bottomNavItem = document.querySelector(`.bottom-nav-item[data-view="${view}"]`);
            
            if (navItem) navItem.style.display = visible ? 'flex' : 'none';
            if (bottomNavItem) bottomNavItem.style.display = visible ? 'flex' : 'none';
        }

        // Show/hide admin widgets
        const adminView = document.getElementById('admin-view');
        if (adminView) {
            adminView.style.display = viewType === 'admin' ? 'block' : 'none';
        }
    }

    async initModules() {
        this.modules.ui = new UIManager();
        this.modules.tasks = new TaskManager();
        this.modules.board = new BoardManager();
        this.modules.milestones = new MilestoneManager();
        this.modules.teams = new TeamManager();
        
        if (['admin', 'manager'].includes(this.state.viewType)) {
            this.modules.reports = new ReportsManager();
        }
        
        if (this.state.viewType === 'admin') {
            this.modules.admin = new AdminOverview();
        }

        console.log('✅ Modules initialized');
    }

    async loadView(view) {
        this.state.currentView = view;
        document.getElementById('current-view').textContent = 
            view.charAt(0).toUpperCase() + view.slice(1);

        // Hide all views
        document.querySelectorAll('.view-container').forEach(el => {
            el.classList.add('hidden');
        });

        // Show selected view
        const viewEl = document.getElementById(`${view}-view`);
        if (viewEl) viewEl.classList.remove('hidden');

        // Update navigation
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // Load view content
        switch (view) {
            case 'board':
                await this.modules.board.render();
                break;
            case 'sprints':
                await this.loadSprintsView();
                break;
            case 'reports':
                await this.modules.reports?.render();
                break;
            case 'settings':
                await this.modules.ui.renderSettings();
                break;
        }

        // Load admin overview if admin
        if (this.state.viewType === 'admin') {
            await this.modules.admin?.update();
        }
    }

    async switchProject(project) {
        this.state.currentProject = project;
        document.getElementById('current-project-name').textContent = project.name;
        
        // Update project list highlighting
        document.querySelectorAll('.project-item').forEach(item => {
            item.classList.toggle('active', item.dataset.projectId === project.id);
        });

        await this.modules.board.render();
        await this.modules.admin?.updateWidget('projectPerformance');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadView(item.dataset.view);
            });
        });

        // Bottom navigation (mobile)
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                this.loadView(item.dataset.view);
            });
        });

        // Mobile menu
        document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('sidebar-overlay').classList.toggle('active');
        });

        document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebar-overlay').classList.remove('active');
        });

        // Theme toggle
        document.querySelectorAll('.theme-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => this.modules.ui.toggleTheme());
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            authManager.logout();
        });

        // Create task button
        document.getElementById('create-task-btn')?.addEventListener('click', () => {
            this.modules.ui.openTaskModal();
        });

        // Bottom add button (mobile)
        document.getElementById('bottom-add-btn')?.addEventListener('click', () => {
            this.modules.ui.openTaskModal();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    handleKeyboardShortcuts(e) {
        if (e.target.matches('input, textarea, select')) return;

        switch (e.key.toLowerCase()) {
            case 'n':
                e.preventDefault();
                this.modules.ui.openTaskModal();
                break;
            case 'b':
                e.preventDefault();
                this.loadView('board');
                break;
            case 'r':
                e.preventDefault();
                this.loadView('reports');
                break;
            case 's':
                e.preventDefault();
                this.loadView('sprints');
                break;
            case 'escape':
                this.modules.ui.closeAllModals();
                break;
            case '?':
                e.preventDefault();
                this.modules.ui.showShortcutsHelp();
                break;
        }
    }

    setupRealtimeSubscriptions() {
        if (!this.state.currentProject) return;

        // Subscribe to tasks
        this.unsubscribeTasks = db.collection('tasks')
            .where('projectId', '==', this.state.currentProject.id)
            .onSnapshot(() => {
                this.modules.board.render();
            });

        // Subscribe to milestones
        this.unsubscribeMilestones = db.collection('milestones')
            .where('projectId', '==', this.state.currentProject.id)
            .onSnapshot(() => {
                this.modules.milestones.refresh();
            });
    }

    async loadSprintsView() {
        if (!this.state.currentProject) return;

        try {
            // Load active sprint
            const activeSprint = await db.collection('sprints')
                .where('projectId', '==', this.state.currentProject.id)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (!activeSprint.empty) {
                this.state.currentSprint = {
                    id: activeSprint.docs[0].id,
                    ...activeSprint.docs[0].data()
                };
                this.renderActiveSprint();
            } else {
                this.state.currentSprint = null;
                this.renderNoActiveSprint();
            }

            // Load past sprints
            await this.loadPastSprints();
        } catch (error) {
            console.error('Error loading sprints:', error);
        }
    }

    renderActiveSprint() {
        const sprint = this.state.currentSprint;
        if (!sprint) return;

        document.getElementById('active-sprint-name').textContent = sprint.name;
        document.getElementById('active-sprint-goal').textContent = sprint.goal || 'No goal set';
        
        const startDate = formatDate(sprint.startDate);
        const endDate = formatDate(sprint.endDate);
        document.getElementById('sprint-dates').textContent = `${startDate} - ${endDate}`;

        document.getElementById('create-sprint-btn').style.display = 'none';
        document.getElementById('complete-sprint-btn').style.display = 'flex';

        // Load sprint tasks
        this.loadSprintTasks(sprint);
    }

    renderNoActiveSprint() {
        document.getElementById('active-sprint-name').textContent = 'No Active Sprint';
        document.getElementById('active-sprint-goal').textContent = 'Start a sprint to track progress';
        document.getElementById('sprint-dates').textContent = '';
        document.getElementById('create-sprint-btn').style.display = 'flex';
        document.getElementById('complete-sprint-btn').style.display = 'none';
    }

    async loadSprintTasks(sprint) {
        if (!sprint.tasks?.length) return;

        const tasks = [];
        for (const taskId of sprint.tasks) {
            const taskDoc = await db.collection('tasks').doc(taskId).get();
            if (taskDoc.exists) {
                tasks.push({ id: taskDoc.id, ...taskDoc.data() });
            }
        }

        // Group by status
        const grouped = {
            planned: tasks.filter(t => t.status === 'planned'),
            started: tasks.filter(t => t.status === 'started'),
            stuck: tasks.filter(t => t.status === 'stuck'),
            review: tasks.filter(t => t.status === 'review'),
            completed: tasks.filter(t => t.status === 'completed')
        };

        // Render columns
        for (const [status, columnTasks] of Object.entries(grouped)) {
            const container = document.getElementById(`${status}-tasks`);
            if (!container) continue;

            document.getElementById(`${status}-count`).textContent = columnTasks.length;
            
            container.innerHTML = columnTasks.map(task => 
                this.createSprintTaskCard(task)
            ).join('') || '<div class="empty-state-small">No tasks</div>';
        }

        // Update progress
        const completed = grouped.completed.length;
        const total = tasks.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        document.getElementById('sprint-progress-percent').textContent = `${percent}%`;
        document.getElementById('sprint-progress-fill').style.width = `${percent}%`;
        document.getElementById('sprint-completed-tasks').textContent = completed;
        document.getElementById('sprint-total-tasks').textContent = total;
    }

    createSprintTaskCard(task) {
        const daysOverdue = getDaysOverdue(task.dueDate);
        const overdueBadge = daysOverdue > 0 && task.status !== 'completed' 
            ? `<span class="overdue-badge">+${daysOverdue}d</span>` 
            : '';

        return `
            <div class="sprint-task-card" onclick="app.modules.ui.openTaskDetail('${task.id}')">
                <div class="sprint-task-header">
                    <span class="sprint-task-title">${escapeHtml(task.title)}</span>
                    ${overdueBadge}
                </div>
                <div class="sprint-task-meta">
                    <span class="priority-indicator" style="background: ${getPriorityColor(task.priority)}"></span>
                    <span>${task.assignedTo || 'Unassigned'}</span>
                </div>
            </div>
        `;
    }

    async loadPastSprints() {
        const snapshot = await db.collection('sprints')
            .where('projectId', '==', this.state.currentProject.id)
            .where('status', '==', 'completed')
            .orderBy('completedAt', 'desc')
            .limit(10)
            .get();

        const container = document.getElementById('past-sprints-list');
        if (!container) return;

        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state-small">No past sprints</div>';
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(doc => {
            const sprint = doc.data();
            const div = document.createElement('div');
            div.className = 'past-sprint-item';
            div.innerHTML = `
                <div class="past-sprint-name">${escapeHtml(sprint.name)}</div>
                <div class="past-sprint-dates">
                    ${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}
                </div>
                <div class="past-sprint-stats">
                    ${sprint.tasks?.length || 0} tasks
                </div>
            `;
            container.appendChild(div);
        });
    }

    async showOrganizationSetup() {
        const setupModal = document.createElement('div');
        setupModal.className = 'modal active';
        setupModal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Welcome to Oriental!</h3>
                </div>
                <div class="modal-body">
                    <p>Let's set up your organization to get started.</p>
                    <div class="form-group">
                        <label>Organization Name</label>
                        <input type="text" id="setup-org-name" placeholder="My Team">
                    </div>
                    <div class="form-group">
                        <label>Your Role</label>
                        <select id="setup-role">
                            <option value="admin">Admin - Full access</option>
                            <option value="manager">Manager - Project management</option>
                            <option value="team_lead">Team Lead - Team coordination</option>
                            <option value="member">Member - Task execution</option>
                        </select>
                    </div>
                    <div class="setup-actions">
                        <button class="btn-primary" id="setup-create-org">Create Organization</button>
                        <button class="btn-secondary" id="setup-create-seed">Create with Sample Data</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(setupModal);

        document.getElementById('setup-create-org')?.addEventListener('click', async () => {
            const name = document.getElementById('setup-org-name').value.trim() || 'My Team';
            const role = document.getElementById('setup-role').value;
            
            await this.createOrganization(name, role);
            setupModal.remove();
        });

        document.getElementById('setup-create-seed')?.addEventListener('click', async () => {
            const name = document.getElementById('setup-org-name').value.trim() || 'My Team';
            const role = document.getElementById('setup-role').value;
            
            await this.createOrganization(name, role);
            await seedGenerator.createSeedData();
            await this.loadUserData();
            await this.setupOrganization();
            await this.initModules();
            setupModal.remove();
            window.location.reload();
        });
    }

    async createOrganization(name, role) {
        const user = authManager.getCurrentUser();
        
        const orgRef = await db.collection('organizations').add({
            name: name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            createdBy: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            members: [user.uid],
            admins: [user.uid],
            settings: { defaultView: 'board', theme: 'light' }
        });

        // Set user role
        await rolesManager.setUserRole(user.uid, orgRef.id, role);

        // Update user document
        await db.collection('users').doc(user.uid).update({
            currentOrganization: orgRef.id,
            organizations: firebase.firestore.FieldValue.arrayUnion(orgRef.id)
        });

        // Create default project
        await db.collection('projects').add({
            name: 'Getting Started',
            description: 'Welcome to Oriental! This is your first project.',
            organizationId: orgRef.id,
            createdBy: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isArchived: false,
            color: '#8b5cf6'
        });

        this.state.currentOrganization = orgRef.id;
        showToast('Organization created!', 'success');
    }

    async checkSeedData() {
        const user = authManager.getCurrentUser();
        if (!this.state.currentOrganization) return;

        const tasksSnapshot = await db.collection('tasks')
            .where('organizationId', '==', this.state.currentOrganization)
            .limit(1)
            .get();

        if (tasksSnapshot.empty) {
            // Show seed data prompt
            setTimeout(() => {
                const shouldSeed = confirm(
                    'Would you like to create sample data for testing?\n\n' +
                    'This will create projects, tasks, team members, and more.'
                );
                if (shouldSeed) {
                    seedGenerator.createSeedData().then(async () => {
                        await this.loadUserData();
                        window.location.reload();
                    });
                }
            }, 1000);
        }
    }

    showLoading(show) {
        const loader = document.getElementById('app-loader');
        if (loader) loader.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        const errorEl = document.getElementById('app-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => errorEl.style.display = 'none', 5000);
        }
        showToast(message, 'error');
    }
    /**
 * Load and render the projects list in the sidebar
 */
async loadProjectsList() {
    if (!this.state.currentOrganization) return;

    const projectList = document.getElementById('project-list');
    if (!projectList) return;

    try {
        // Try local DB first (instant)
        let projects = await localDB.getByIndex('projects', 'organizationId', this.state.currentOrganization);
        
        // If empty or online, sync from Firestore
        if (projects.length === 0 || navigator.onLine) {
            const snapshot = await db.collection('projects')
                .where('organizationId', '==', this.state.currentOrganization)
                .where('isArchived', '==', false)
                .get();

            projects = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Save to local DB
            await localDB.clear('projects');
            await localDB.batchPut('projects', projects);
        }

        // Render projects
        if (projects.length === 0) {
            projectList.innerHTML = `
                <div class="empty-state-small" style="padding: 16px;">
                    <p style="font-size: 12px; color: var(--text-muted);">No projects yet</p>
                    <button class="btn-primary btn-sm" style="margin-top: 8px;" onclick="app.modules.ui.openProjectModal()">
                        + Create Project
                    </button>
                </div>
            `;
            return;
        }

        projectList.innerHTML = projects.map(project => `
            <div class="project-item ${this.state.currentProject?.id === project.id ? 'active' : ''}" 
                 data-project-id="${project.id}"
                 onclick="app.selectProjectById('${project.id}')">
                <span class="project-color" style="background: ${escapeHtml(project.color || '#8b5cf6')}"></span>
                <span class="project-name">${escapeHtml(project.name)}</span>
                <span class="project-count" id="project-count-${project.id}">...</span>
            </div>
        `).join('');

        // Load task counts for each project
        projects.forEach(project => {
            this.loadProjectTaskCount(project.id);
        });

        console.log(`📁 Loaded ${projects.length} projects`);

    } catch (error) {
        console.error('Error loading projects:', error);
        projectList.innerHTML = `
            <div class="empty-state-small" style="padding: 16px;">
                <p style="font-size: 12px; color: var(--error);">Error loading projects</p>
            </div>
        `;
    }
}

/**
 * Load task count for a project
 */
async loadProjectTaskCount(projectId) {
    try {
        const tasks = await localDB.getByIndex('tasks', 'projectId', projectId);
        const countEl = document.getElementById(`project-count-${projectId}`);
        if (countEl) {
            countEl.textContent = tasks.length;
        }
    } catch (error) {
        // Silently fail - count is non-critical
    }
}

/**
 * Select project by ID
 */
async selectProjectById(projectId) {
    try {
        const project = await localDB.get('projects', projectId);
        
        if (!project) {
            // Try Firestore
            const doc = await db.collection('projects').doc(projectId).get();
            if (doc.exists) {
                const project = { id: doc.id, ...doc.data() };
                await localDB.put('projects', project);
                await this.switchProject(project);
            }
        } else {
            await this.switchProject(project);
        }
    } catch (error) {
        console.error('Error selecting project:', error);
        showToast('Error loading project', 'error');
    }
}
}

// Initialize app when DOM is ready
const app = new OrientalApp();

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Handle service worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('✅ Service Worker registered'))
        .catch(err => console.error('Service Worker failed:', err));
}
// Make key functions globally accessible for onclick handlers
window.app = app;
window.loadProjectsList = () => app.loadProjectsList();
window.selectProjectById = (id) => app.selectProjectById(id);

// ============================================
// GLOBAL MODULE EXPORTS (for console testing)
// ============================================

// Make all modules globally accessible
window.app = app;
window.auth = auth;
window.db = db;

// Async initialization of globals after app is ready
app.onReady = async function() {
    window.authManager = authManager;
    window.rolesManager = rolesManager;
    window.localDB = localDB;
    window.syncManager = syncManager;
    window.charts = charts;
    window.networkManager = networkManager;
    window.offlineAuth = offlineAuth;
    window.seedGenerator = seedGenerator;
    
    console.log('✅ Global modules exported for console access');
    console.log('Available: authManager, rolesManager, localDB, syncManager, charts, networkManager, offlineAuth, seedGenerator');
};

// Call onReady after init
const originalInit = app.init.bind(app);
app.init = async function() {
    await originalInit();
    await app.onReady();
};