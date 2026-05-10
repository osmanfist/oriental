/**
 * Oriental v3.0.0 - Main Application Entry
 * Initializes all modules and manages application state
 * With global module exports for console testing
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
            // Step 0: Initialize localDB FIRST
            if (typeof localDB !== 'undefined') {
                if (!localDB.db) {
                    console.log('📦 Initializing local database...');
                    await localDB.init();
                    console.log('✅ Local database ready');
                }
            }
            
            // Step 1: Wait for Firebase Auth
            const user = await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(auth.currentUser || null), 5000);
                const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
                    clearTimeout(timeout);
                    unsubscribe();
                    resolve(firebaseUser);
                });
            });

            if (!user) {
                this.showNotSignedIn();
                return;
            }

            console.log('✅ User authenticated:', user.email);
            
            await authManager.init();
            await this.loadUserData();
            await this.setupOrganization();
            await this.initModules();
            await this.loadProjectsList();
            this.setupEventListeners();
            await this.loadView('board');
            this.setupRealtimeSubscriptions();

            this.initialized = true;
            this.showLoading(false);
            
            console.log('✅ Oriental ready!');
            this.exportGlobals();
            
            if (typeof seedGenerator !== 'undefined') {
                this.checkSeedData();
            }

        } catch (error) {
            console.error('Initialization error:', error);
            this.showLoading(false);
            this.showErrorPage(error);
        }
    }

    showNotSignedIn() {
        this.showLoading(false);
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;font-family:Inter,sans-serif;text-align:center;padding:20px;background:#f9fafb;">
                <div style="font-size:64px;">🔐</div>
                <h1 style="color:#111827;margin:0;font-size:24px;">Not Signed In</h1>
                <p style="color:#6b7280;margin:0;">Please sign in to access Oriental</p>
                <a href="login.html" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;display:inline-block;">Go to Login</a>
            </div>
        `;
    }

    showErrorPage(error) {
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;font-family:Inter,sans-serif;text-align:center;padding:20px;background:#f9fafb;">
                <div style="font-size:64px;">⚠️</div>
                <h1 style="color:#111827;margin:0;">Something went wrong</h1>
                <p style="color:#6b7280;margin:0;max-width:400px;">${error.message || 'Please try refreshing'}</p>
                <button onclick="location.reload()" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;border:none;font-weight:600;margin-top:8px;cursor:pointer;font-family:inherit;">Refresh Page</button>
                <a href="login.html" style="color:#6b7280;font-size:14px;margin-top:8px;">Back to Login</a>
            </div>
        `;
    }

    renderFallbackView(viewId, message) {
        const container = document.getElementById(viewId);
        if (!container) return;
        container.innerHTML = `
            <div style="text-align:center;padding:48px;">
                <p style="color:var(--text-muted);font-size:14px;">${message || 'Nothing to show'}</p>
            </div>
        `;
    }

    exportGlobals() {
        window.app = this;
        window.auth = auth;
        window.db = db;
        window.authManager = authManager;
        window.rolesManager = rolesManager;
        window.localDB = localDB;
        window.syncManager = syncManager;
        window.charts = charts;
        window.networkManager = networkManager;
        window.offlineAuth = offlineAuth;
        window.seedGenerator = seedGenerator;
        window.loadProjectsList = () => this.loadProjectsList();
        window.selectProjectById = (id) => this.selectProjectById(id);
        console.log('✅ Global modules exported');
    }

    async loadUserData() {
        const user = authManager.getCurrentUser();
        if (!user) return;

        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            user.userData = userData;
            this.state.currentOrganization = userData.currentOrganization;
            
            const nameEl = document.getElementById('user-name');
            const emailEl = document.getElementById('user-email');
            const avatarEl = document.getElementById('user-avatar-initial');
            
            if (nameEl) nameEl.textContent = userData.name || user.email;
            if (emailEl) emailEl.textContent = user.email;
            if (avatarEl) avatarEl.textContent = (userData.name || user.email).charAt(0).toUpperCase();
        } else {
            await authManager.ensureUserDocument(user);
            const retryDoc = await db.collection('users').doc(user.uid).get();
            if (retryDoc.exists) {
                const userData = retryDoc.data();
                user.userData = userData;
                this.state.currentOrganization = userData.currentOrganization;
                const nameEl = document.getElementById('user-name');
                if (nameEl) nameEl.textContent = userData.name || user.email;
            }
        }
    }

    async setupOrganization() {
        if (!this.state.currentOrganization) {
            await this.showOrganizationSetup();
            return;
        }

        try {
            const orgDoc = await db.collection('organizations').doc(this.state.currentOrganization).get();
            if (orgDoc.exists) {
                const orgData = orgDoc.data();
                const orgNameEl = document.getElementById('org-name');
                if (orgNameEl) orgNameEl.textContent = orgData.name;
                
                const role = await rolesManager.getUserRole(authManager.getCurrentUser().uid, this.state.currentOrganization);
                const roleEl = document.getElementById('org-role');
                if (roleEl) {
                    roleEl.textContent = role.name;
                    roleEl.style.color = role.color;
                }
                
                this.state.viewType = rolesManager.getViewType(role.role);
                this.state.userRole = role;
                this.configureUIForRole(role);
            }
        } catch (error) {
            console.error('Error loading organization:', error);
        }
    }

    configureUIForRole(role) {
    const viewType = role.role;
    
    // Show all nav items for testing
    const navConfig = {
        reports: true,
        sprints: true,
        settings: true,
        templates: true
    };

    for (const [view, visible] of Object.entries(navConfig)) {
        const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
        const bottomNavItem = document.querySelector(`.bottom-nav-item[data-view="${view}"]`);
        if (navItem) navItem.style.display = visible ? 'flex' : 'none';
        if (bottomNavItem) bottomNavItem.style.display = visible ? 'flex' : 'none';
    }

    // Always show admin view for now
    const adminView = document.getElementById('admin-view');
    if (adminView) {
        adminView.style.display = 'block';
    }
}

    async initModules() {
    console.log('🔧 Initializing modules...');
    this.modules.ui = new UIManager();
    this.modules.tasks = new TaskManager();
    this.modules.board = new BoardManager();
    this.modules.milestones = new MilestoneManager();
    this.modules.teams = new TeamManager();
    
    try { this.modules.reports = new ReportsManager(); } catch (e) {}
    
    // Always initialize admin for testing
    try { 
        this.modules.admin = new AdminOverview();
        console.log('✅ Admin module initialized');
    } catch (e) {
        console.warn('Admin module failed:', e);
    }

    console.log('✅ Modules:', Object.keys(this.modules).filter(k => this.modules[k]).join(', '));
}

    async loadView(view) {
        this.state.currentView = view;
        const viewTitle = document.getElementById('current-view');
        if (viewTitle) viewTitle.textContent = view.charAt(0).toUpperCase() + view.slice(1);

        document.querySelectorAll('.view-container').forEach(el => el.classList.add('hidden'));
        const viewEl = document.getElementById(`${view}-view`);
        if (viewEl) viewEl.classList.remove('hidden');

        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        try {
            switch (view) {
                case 'board':
                    if (this.modules.board) await this.modules.board.render();
                    else this.renderFallbackView('board-view', 'Board module not loaded');
                    break;
                case 'sprints':
                    await this.loadSprintsView();
                    break;
                case 'reports':
                    if (this.modules.reports && typeof this.modules.reports.render === 'function') {
                        await this.modules.reports.render();
                    } else {
                        await this.renderSimpleReports();
                    }
                    break;
                case 'settings':
                    if (this.modules.ui) await this.modules.ui.renderSettings();
                    else this.renderFallbackView('settings-view', 'Settings not available');
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${view} view:`, error);
            this.renderFallbackView(`${view}-view`, `Error: ${error.message}`);
        }

        if (this.state.viewType === 'admin' && this.modules.admin) {
            try { await this.modules.admin.update(); } catch (e) {}
        }
    }

    async renderSimpleReports() {
        const container = document.getElementById('reports-view');
        if (!container) return;

        try {
            const tasks = await localDB.getAll('tasks');
            const total = tasks.length;
            const completed = tasks.filter(t => t.status === 'completed').length;
            const inProgress = tasks.filter(t => ['started', 'review'].includes(t.status)).length;
            const overdue = tasks.filter(t => t.dueDate && getDaysOverdue(t.dueDate) > 0 && t.status !== 'completed').length;
            const planned = tasks.filter(t => t.status === 'planned').length;
            const stuck = tasks.filter(t => t.status === 'stuck').length;

            container.innerHTML = `
                <div style="padding:24px;">
                    <h2 style="margin-bottom:20px;">Reports & Analytics</h2>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px;">
                        <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:12px;padding:20px;text-align:center;">
                            <div style="font-size:32px;font-weight:800;color:#7c3aed;">${total}</div>
                            <div style="font-size:12px;color:var(--text-muted);">Total Tasks</div>
                        </div>
                        <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:12px;padding:20px;text-align:center;">
                            <div style="font-size:32px;font-weight:800;color:#22c55e;">${completed}</div>
                            <div style="font-size:12px;color:var(--text-muted);">Completed</div>
                        </div>
                        <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:12px;padding:20px;text-align:center;">
                            <div style="font-size:32px;font-weight:800;color:#3b82f6;">${inProgress}</div>
                            <div style="font-size:12px;color:var(--text-muted);">In Progress</div>
                        </div>
                        <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:12px;padding:20px;text-align:center;">
                            <div style="font-size:32px;font-weight:800;color:#ef4444;">${overdue}</div>
                            <div style="font-size:12px;color:var(--text-muted);">Overdue</div>
                        </div>
                        <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:12px;padding:20px;text-align:center;">
                            <div style="font-size:32px;font-weight:800;color:#9ca3af;">${planned}</div>
                            <div style="font-size:12px;color:var(--text-muted);">Planned</div>
                        </div>
                        <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:12px;padding:20px;text-align:center;">
                            <div style="font-size:32px;font-weight:800;color:#f59e0b;">${stuck}</div>
                            <div style="font-size:12px;color:var(--text-muted);">Stuck</div>
                        </div>
                    </div>
                    
                    <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:12px;padding:20px;">
                        <h3 style="margin-bottom:12px;">Completion Rate: ${total > 0 ? Math.round((completed/total)*100) : 0}%</h3>
                        <div class="progress-bar large" style="height:12px;">
                            <div class="progress-fill" style="width:${total > 0 ? Math.round((completed/total)*100) : 0}%;background:#22c55e;"></div>
                        </div>
                    </div>
                </div>
            `;
        } catch (e) {
            container.innerHTML = `<div style="text-align:center;padding:48px;color:var(--text-muted);">Unable to load reports</div>`;
        }
    }

    async loadSprintsView() {
        const container = document.getElementById('sprints-view');
        if (!container) return;

        if (!this.state.currentProject) {
            container.innerHTML = `<div class="empty-state"><p style="color:var(--text-muted);">Select a project to view sprints</p></div>`;
            return;
        }

        try {
            const activeSnapshot = await db.collection('sprints')
                .where('projectId', '==', this.state.currentProject.id)
                .where('status', '==', 'active').limit(1).get();

            let html = '';
            
            if (!activeSnapshot.empty) {
                const sprint = { id: activeSnapshot.docs[0].id, ...activeSnapshot.docs[0].data() };
                this.state.currentSprint = sprint;
                html += `
                    <div class="sprint-header">
                        <div class="sprint-info">
                            <h3>${escapeHtml(sprint.name)}</h3>
                            <p>${escapeHtml(sprint.goal || 'No goal')}</p>
                            <div class="sprint-dates">${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}</div>
                        </div>
                        <button class="btn-success" id="complete-sprint-btn">Complete Sprint</button>
                    </div>
                `;
            } else {
                html += `
                    <div class="empty-state" style="text-align:center;padding:48px;">
                        <h3>No Active Sprint</h3>
                        <p style="color:var(--text-muted);">Create a sprint to get started</p>
                    </div>
                `;
                this.state.currentSprint = null;
            }

            // Past sprints
            const pastSnapshot = await db.collection('sprints')
                .where('projectId', '==', this.state.currentProject.id)
                .where('status', '==', 'completed').orderBy('completedAt', 'desc').limit(5).get();

            if (!pastSnapshot.empty) {
                html += `<div style="margin-top:24px;"><h4>Past Sprints</h4>`;
                pastSnapshot.forEach(doc => {
                    const s = doc.data();
                    html += `<div style="padding:12px;border:1px solid var(--border-color);border-radius:8px;margin:4px 0;"><strong>${escapeHtml(s.name)}</strong> <span style="color:var(--text-muted);">${formatDate(s.startDate)} - ${formatDate(s.endDate)}</span></div>`;
                });
                html += `</div>`;
            }

            container.innerHTML = html;

            document.getElementById('complete-sprint-btn')?.addEventListener('click', async () => {
                if (confirm('Complete this sprint?')) {
                    await db.collection('sprints').doc(this.state.currentSprint.id).update({
                        status: 'completed',
                        completedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    showToast('Sprint completed!', 'success');
                    this.loadSprintsView();
                }
            });

        } catch (error) {
            container.innerHTML = `<div class="empty-state"><p style="color:var(--error);">Error: ${error.message}</p></div>`;
        }
    }

    async switchProject(project) {
        this.state.currentProject = project;
        const nameEl = document.getElementById('current-project-name');
        if (nameEl) nameEl.textContent = project.name;
        
        document.querySelectorAll('.project-item').forEach(item => {
            item.classList.toggle('active', item.dataset.projectId === project.id);
        });

        await this.modules.board?.render();
        try { await this.modules.admin?.updateWidget?.('projectPerformance'); } catch (e) {}
    }

    async loadProjectsList() {
        if (!this.state.currentOrganization) return;
        const projectList = document.getElementById('project-list');
        if (!projectList) return;

        projectList.innerHTML = `<div class="project-item placeholder"><span class="project-color" style="background:#d1d5db;"></span><span class="project-name">Loading...</span></div>`;

        try {
            let projects = [];
            if (localDB?.isReady?.()) {
                projects = await localDB.getByIndex('projects', 'organizationId', this.state.currentOrganization);
            }
            
            if (projects.length === 0 && navigator.onLine) {
                const snapshot = await db.collection('projects')
                    .where('organizationId', '==', this.state.currentOrganization)
                    .where('isArchived', '==', false).get();
                projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }

            if (projects.length === 0) {
                projectList.innerHTML = `<div style="padding:16px;text-align:center;"><p style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">No projects</p><button style="background:#7c3aed;color:white;border:none;padding:6px 14px;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;" onclick="app.modules.ui.openProjectModal()">+ Create Project</button></div>`;
                return;
            }

            projectList.innerHTML = projects.map(p => `
                <div class="project-item ${this.state.currentProject?.id === p.id ? 'active' : ''}" data-project-id="${p.id}" onclick="app.selectProjectById('${p.id}')" style="cursor:pointer;">
                    <span class="project-color" style="background:${escapeHtml(p.color || '#8b5cf6')}"></span>
                    <span class="project-name">${escapeHtml(p.name)}</span>
                    <span class="project-count" id="project-count-${p.id}">...</span>
                </div>
            `).join('');

            projects.forEach(p => this.loadProjectTaskCount(p.id));
            console.log(`📁 ${projects.length} projects loaded`);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    async loadProjectTaskCount(projectId) {
        try {
            const tasks = await localDB.getByIndex('tasks', 'projectId', projectId);
            const el = document.getElementById(`project-count-${projectId}`);
            if (el) el.textContent = tasks.length;
        } catch (e) {}
    }

    async selectProjectById(projectId) {
        try {
            let project = null;
            if (localDB?.isReady?.()) project = await localDB.get('projects', projectId);
            if (!project && navigator.onLine) {
                const doc = await db.collection('projects').doc(projectId).get();
                if (doc.exists) project = { id: doc.id, ...doc.data() };
            }
            if (project) await this.switchProject(project);
            else showToast('Project not found', 'error');
        } catch (error) {
            showToast('Error loading project', 'error');
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => { e.preventDefault(); this.loadView(item.dataset.view); });
        });
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.addEventListener('click', () => { this.loadView(item.dataset.view); });
        });
        document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.toggle('open');
            document.getElementById('sidebar-overlay')?.classList.toggle('active');
        });
        document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.remove('open');
            document.getElementById('sidebar-overlay')?.classList.remove('active');
        });
        document.querySelectorAll('.theme-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => this.modules.ui?.toggleTheme());
        });
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            if (confirm('Logout?')) authManager.logout();
        });
        document.getElementById('create-task-btn')?.addEventListener('click', () => {
            if (!this.state.currentProject) { showToast('Select a project first', 'warning'); return; }
            this.modules.ui?.openTaskModal();
        });
        document.getElementById('bottom-add-btn')?.addEventListener('click', () => {
            if (!this.state.currentProject) { showToast('Select a project first', 'warning'); return; }
            this.modules.ui?.openTaskModal();
        });
        document.getElementById('add-project-btn')?.addEventListener('click', () => this.modules.ui?.openProjectModal());
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    handleKeyboardShortcuts(e) {
        if (e.target.matches('input, textarea, select')) return;
        switch (e.key.toLowerCase()) {
            case 'n': e.preventDefault(); if (this.state.currentProject) this.modules.ui?.openTaskModal(); break;
            case 'b': e.preventDefault(); this.loadView('board'); break;
            case 'r': e.preventDefault(); this.loadView('reports'); break;
            case 's': e.preventDefault(); this.loadView('sprints'); break;
            case 'escape': this.modules.ui?.closeAllModals(); break;
            case '?': e.preventDefault(); this.modules.ui?.showShortcutsHelp(); break;
        }
    }

    setupRealtimeSubscriptions() {
        if (!this.state.currentProject) return;
        if (this.unsubscribeTasks) this.unsubscribeTasks();
        this.unsubscribeTasks = db.collection('tasks').where('projectId', '==', this.state.currentProject.id)
            .onSnapshot(async (snapshot) => {
                const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                for (const task of tasks) { try { await localDB.put('tasks', task); } catch (e) {} }
                this.modules.board?.render();
            }, (error) => console.error('Task subscription error:', error));
    }

    async showOrganizationSetup() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:500px;">
                <div class="modal-header"><h3>Welcome to Oriental!</h3></div>
                <div class="modal-body">
                    <p style="margin-bottom:16px;">Set up your organization to get started.</p>
                    <div class="form-group"><label>Organization Name</label><input type="text" id="setup-org-name" placeholder="My Team" value="My Team"></div>
                    <div class="form-group"><label>Your Role</label><select id="setup-role"><option value="admin">Admin</option><option value="manager">Manager</option><option value="team_lead">Team Lead</option><option value="member">Member</option></select></div>
                    <div style="display:flex;gap:12px;margin-top:20px;">
                        <button class="btn-primary" id="setup-create-org" style="flex:1;">Create Organization</button>
                        <button class="btn-secondary" id="setup-create-seed" style="flex:1;">Create with Sample Data</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
        document.getElementById('setup-create-org')?.addEventListener('click', async () => {
            const name = document.getElementById('setup-org-name').value.trim() || 'My Team';
            await this.createOrganization(name, document.getElementById('setup-role').value);
            modal.remove(); window.location.reload();
        });
        document.getElementById('setup-create-seed')?.addEventListener('click', async () => {
            const name = document.getElementById('setup-org-name').value.trim() || 'My Team';
            await this.createOrganization(name, document.getElementById('setup-role').value);
            await seedGenerator.createSeedData();
            modal.remove(); window.location.reload();
        });
    }

    async createOrganization(name, role) {
        const user = authManager.getCurrentUser();
        const orgRef = await db.collection('organizations').add({
            name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            createdBy: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            members: [user.uid], admins: [user.uid],
            settings: { defaultView: 'board', theme: 'light' }
        });
        await rolesManager.setUserRole(user.uid, orgRef.id, role);
        await db.collection('users').doc(user.uid).update({
            currentOrganization: orgRef.id,
            organizations: firebase.firestore.FieldValue.arrayUnion(orgRef.id)
        });
        await db.collection('projects').add({
            name: 'Getting Started', description: 'Welcome to Oriental!',
            organizationId: orgRef.id, createdBy: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isArchived: false, color: '#8b5cf6'
        });
        this.state.currentOrganization = orgRef.id;
        showToast('Organization created!', 'success');
    }

    async checkSeedData() {
        if (!this.state.currentOrganization) return;
        const snapshot = await db.collection('tasks').where('organizationId', '==', this.state.currentOrganization).limit(1).get();
        if (snapshot.empty) {
            setTimeout(() => {
                if (confirm('Create sample data for testing?')) {
                    seedGenerator.createSeedData().then(() => window.location.reload());
                }
            }, 1000);
        }
    }

    showLoading(show) {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
            loader.classList.toggle('hidden', !show);
        }
    }

    showError(message) {
        console.error(message);
        showToast(message, 'error');
    }
}

// ============================================
// INITIALIZE
// ============================================
const app = new OrientalApp();
document.addEventListener('DOMContentLoaded', () => app.init());
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(r => console.log('✅ SW registered')).catch(e => console.log('SW:', e.message));
}
window.app = app;