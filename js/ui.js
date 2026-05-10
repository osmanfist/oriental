/**
 * Oriental v3.0.0 - UI Manager
 * Modals, toasts, theme, and UI utilities
 * CRASH-PROOF: All DOM operations have null checks
 */

class UIManager {
    constructor() {
        this.activeModals = [];
        this.theme = localStorage.getItem('oriental_theme') || 'system';
        this.sidebarOpen = false;
    }

    // ============================================
    // MODAL MANAGEMENT
    // ============================================

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.style.display = 'flex';
        modal.classList.add('active');
        this.activeModals.push(modalId);

        document.addEventListener('keydown', this.handleEscapeKey);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modalId);
            }
        });
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.style.display = 'none';
        modal.classList.remove('active');
        this.activeModals = this.activeModals.filter(id => id !== modalId);

        if (this.activeModals.length === 0) {
            document.removeEventListener('keydown', this.handleEscapeKey);
        }
    }

    closeAllModals() {
        [...this.activeModals].forEach(id => this.closeModal(id));
        this.activeModals = [];
        document.removeEventListener('keydown', this.handleEscapeKey);
    }

    handleEscapeKey = (e) => {
        if (e.key === 'Escape' && this.activeModals.length > 0) {
            this.closeModal(this.activeModals[this.activeModals.length - 1]);
        }
    }

    // ============================================
    // ICON HELPER (replaces Font Awesome)
    // ============================================

    _icon(name, size = 16) {
        const icons = {
            close: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
            save: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
            plus: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
            trash: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
            edit: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
            flag: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
            user: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
            bell: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
            palette: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><path d="M12 2a10 10 0 0 0 0 20"/></svg>`,
            cog: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
            building: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><path d="M9 18h6"/></svg>`,
            keyboard: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="8.01"/><line x1="10" y1="8" x2="10" y2="8.01"/><line x1="14" y1="8" x2="14" y2="8.01"/><line x1="18" y1="8" x2="18" y2="8.01"/><line x1="8" y1="12" x2="8" y2="12.01"/><line x1="16" y1="12" x2="16" y2="12.01"/><line x1="7" y1="16" x2="17" y2="16"/></svg>`,
            signout: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
            list: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
            history: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>`,
        };
        return icons[name] || '';
    }

    // ============================================
    // TASK MODAL
    // ============================================

    openTaskModal(taskData = null) {
        if (!app?.state?.currentProject) {
            showToast('Please select a project first', 'warning');
            return;
        }

        const isEditing = !!taskData;
        const modalId = isEditing ? 'edit-task-modal' : 'create-task-modal';
        
        this.ensureTaskModal(modalId, isEditing);

        if (isEditing && taskData) {
            this.populateEditTaskForm(taskData);
        }

        this.openModal(modalId);
    }

    ensureTaskModal(modalId, isEditing) {
        if (document.getElementById(modalId)) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = modalId;
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>${isEditing ? 'Edit Task' : 'Create New Task'}</h3>
                    <button class="close-modal" onclick="app.modules.ui.closeModal('${modalId}')">
                        ${this._icon('close', 18)}
                    </button>
                </div>
                <div class="modal-body">
                    <form id="${modalId}-form" onsubmit="return false;">
                        <div class="form-group">
                            <label>Title <span class="required">*</span></label>
                            <input type="text" id="task-title" placeholder="Enter task title" required>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="task-description" rows="3" placeholder="Describe the task..."></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Status</label>
                                <select id="task-status">
                                    <option value="planned">Planned</option>
                                    <option value="started">Started</option>
                                    <option value="stuck">Stuck</option>
                                    <option value="review">In Review</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Priority</label>
                                <select id="task-priority">
                                    <option value="low">Low</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Assignee</label>
                                <select id="task-assignee"><option value="">Unassigned</option></select>
                            </div>
                            <div class="form-group">
                                <label>Due Date</label>
                                <input type="date" id="task-due-date">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Estimated Hours</label>
                                <input type="number" id="task-estimated-hours" min="0" step="0.5" value="0">
                            </div>
                            <div class="form-group">
                                <label>Tags</label>
                                <input type="text" id="task-tags" placeholder="e.g., frontend, bug">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Subtasks</label>
                            <div id="subtasks-container">
                                <div id="subtasks-list"></div>
                                <button type="button" class="btn-secondary btn-sm" onclick="app.modules.ui.addSubtaskField()">
                                    ${this._icon('plus', 14)} Add Subtask
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="app.modules.ui.closeModal('${modalId}')">Cancel</button>
                    <button class="btn-primary" onclick="app.modules.ui.saveTask('${modalId}')">
                        ${this._icon('save', 16)} ${isEditing ? 'Save Changes' : 'Create Task'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.loadAssigneeOptions();
    }

    async loadAssigneeOptions() {
        try {
            const members = app?.modules?.teams?.getAssignableMembers?.() || [];
            const options = '<option value="">Unassigned</option>' + 
                members.map(m => `<option value="${m.id}">${escapeHtml(m.name || m.email)}</option>`).join('');
            
            ['task-assignee', 'edit-task-assignee'].forEach(id => {
                const select = document.getElementById(id);
                if (select) select.innerHTML = options;
            });
        } catch (e) {
            console.warn('Could not load assignees:', e);
        }
    }

    addSubtaskField() {
        const list = document.getElementById('subtasks-list');
        if (!list) return;

        const index = list.children.length;
        const div = document.createElement('div');
        div.className = 'subtask-field';
        div.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;';
        div.innerHTML = `
            <input type="text" class="subtask-input" placeholder="Subtask ${index + 1}" data-index="${index}" style="flex:1;">
            <button type="button" class="btn-icon danger" onclick="this.parentElement.remove()" style="flex-shrink:0;">
                ${this._icon('trash', 14)}
            </button>
        `;
        list.appendChild(div);
    }

    async saveTask(modalId) {
        const title = document.getElementById('task-title')?.value?.trim();
        if (!title) {
            showToast('Please enter a task title', 'warning');
            return;
        }

        const assigneeId = document.getElementById('task-assignee')?.value || null;
        const assigneeSelect = document.getElementById('task-assignee');
        const assigneeName = assigneeSelect?.options?.[assigneeSelect?.selectedIndex]?.text || null;

        const subtasks = [];
        document.querySelectorAll('.subtask-input').forEach(input => {
            const value = input.value?.trim();
            if (value) subtasks.push({ title: value, status: 'planned', assignedToId: assigneeId, assignedTo: assigneeName });
        });

        const taskData = {
            title,
            description: document.getElementById('task-description')?.value || '',
            status: document.getElementById('task-status')?.value || 'planned',
            priority: document.getElementById('task-priority')?.value || 'medium',
            assignedToId: assigneeId,
            assignedTo: assigneeName,
            dueDate: document.getElementById('task-due-date')?.value || null,
            estimatedHours: parseFloat(document.getElementById('task-estimated-hours')?.value) || 0,
            tags: (document.getElementById('task-tags')?.value || '').split(',').map(t => t.trim()).filter(t => t),
            subtasks
        };

        const isEditing = modalId === 'edit-task-modal';
        let success = false;

        try {
            if (isEditing) {
                const taskId = document.getElementById('edit-task-id')?.value;
                if (taskId) success = await app.modules.tasks.updateTask(taskId, taskData);
            } else {
                const taskId = await app.modules.tasks.createTask(taskData);
                success = !!taskId;
            }

            if (success) {
                this.closeModal(modalId);
                await app.modules.board?.render();
                app.modules.admin?.update?.();
            }
        } catch (error) {
            console.error('Error saving task:', error);
            showToast('Error saving task', 'error');
        }
    }

    populateEditTaskForm(taskData) {
        const fields = {
            'edit-task-id': taskData.id,
            'edit-task-title': taskData.title || '',
            'edit-task-description': taskData.description || '',
            'edit-task-status': taskData.status || 'planned',
            'edit-task-priority': taskData.priority || 'medium',
            'edit-task-assignee': taskData.assignedToId || '',
            'edit-task-due-date': taskData.dueDate || '',
            'edit-task-estimated-hours': taskData.estimatedHours || 0,
            'edit-task-tags': (taskData.tags || []).join(', ')
        };

        for (const [id, value] of Object.entries(fields)) {
            const el = document.getElementById(id);
            if (el) el.value = value;
        }
    }

    // ============================================
    // TASK DETAIL MODAL
    // ============================================

    async openTaskDetail(taskId) {
        try {
            const taskDoc = await db.collection('tasks').doc(taskId).get();
            if (!taskDoc.exists) {
                showToast('Task not found', 'error');
                return;
            }

            const task = { id: taskDoc.id, ...taskDoc.data() };
            const subtasks = await app?.modules?.tasks?.getSubtasks?.(taskId) || [];
            const history = await app?.modules?.tasks?.getTaskHistory?.(taskId) || [];
            const milestones = app?.modules?.milestones?.getTaskMilestones?.(taskId) || [];

            this.showTaskDetailModal(task, subtasks, history, milestones);
        } catch (error) {
            console.error('Error opening task detail:', error);
            showToast('Error loading task', 'error');
        }
    }

    showTaskDetailModal(task, subtasks, history, milestones) {
        const modalId = 'task-detail-modal';
        this.ensureTaskDetailModal(modalId);

        const daysOverdue = getDaysOverdue(task.dueDate);
        const overdueBadge = daysOverdue > 0 && task.status !== 'completed' 
            ? `<span class="overdue-badge large">+${daysOverdue}d overdue</span>` : '';

        const modal = document.getElementById(modalId);
        if (!modal) return;

        const headerEl = modal.querySelector('.modal-header h3');
        if (headerEl) headerEl.textContent = task.title || 'Task Details';
        
        const bodyEl = modal.querySelector('.modal-body');
        if (!bodyEl) return;

        bodyEl.innerHTML = `
            ${overdueBadge}
            <div class="task-detail-grid">
                <div class="detail-section">
                    <h4>Description</h4>
                    <p>${escapeHtml(task.description || 'No description')}</p>
                </div>
                <div class="detail-section">
                    <h4>Details</h4>
                    <div class="detail-row"><span class="detail-label">Status:</span><span class="detail-value">${getTaskStateLabel(task.status)}</span></div>
                    <div class="detail-row"><span class="detail-label">Priority:</span><span class="detail-value" style="color:${getPriorityColor(task.priority)}">${(task.priority || '').toUpperCase()}</span></div>
                    <div class="detail-row"><span class="detail-label">Assignee:</span><span class="detail-value">${escapeHtml(task.assignedTo || 'Unassigned')}</span></div>
                    <div class="detail-row"><span class="detail-label">Due Date:</span><span class="detail-value ${daysOverdue > 0 ? 'overdue' : ''}">${task.dueDate ? formatDate(task.dueDate) : 'Not set'}</span></div>
                    <div class="detail-row"><span class="detail-label">Progress:</span><span class="detail-value">${task.progress || 0}%</span></div>
                </div>
            </div>
            <div class="detail-section">
                <h4>Subtasks (${subtasks.filter(s => s.status === 'completed').length}/${subtasks.length})</h4>
                <div class="subtasks-list">
                    ${subtasks.length === 0 ? '<p class="text-muted">No subtasks</p>' : subtasks.map(s => `
                        <div class="subtask-item ${s.status === 'completed' ? 'completed' : ''}">
                            <input type="checkbox" ${s.status === 'completed' ? 'checked' : ''} onchange="app.modules.tasks.updateSubtask('${s.id}', {status: this.checked ? 'completed' : 'planned'})">
                            <span class="subtask-title">${escapeHtml(s.title)}</span>
                            <span class="subtask-assignee">${escapeHtml(s.assignedTo || 'Unassigned')}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const footerEl = modal.querySelector('.modal-footer');
        if (footerEl) {
            footerEl.innerHTML = `
                <button class="btn-secondary" onclick="app.modules.ui.openTaskModal(taskData)">${this._icon('edit', 14)} Edit</button>
                <button class="btn-danger" onclick="app.modules.tasks.deleteTask('${task.id}')">${this._icon('trash', 14)} Delete</button>
                <button class="btn-secondary" onclick="app.modules.ui.closeModal('${modalId}')">Close</button>
            `;
        }

        this.openModal(modalId);
    }

    ensureTaskDetailModal(modalId) {
        if (document.getElementById(modalId)) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = modalId;
        modal.innerHTML = `
            <div class="modal-content modal-large" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>Task Details</h3>
                    <button class="close-modal" onclick="app.modules.ui.closeModal('${modalId}')">${this._icon('close', 18)}</button>
                </div>
                <div class="modal-body"></div>
                <div class="modal-footer"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ============================================
    // PROJECT MODAL
    // ============================================

    openProjectModal() {
        const modalId = 'project-modal';
        
        if (!document.getElementById(modalId)) {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = modalId;
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>Create Project</h3>
                        <button class="close-modal" onclick="app.modules.ui.closeModal('${modalId}')">${this._icon('close', 18)}</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Project Name <span class="required">*</span></label>
                            <input type="text" id="project-name" placeholder="Enter project name" required>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="project-description" rows="3" placeholder="Describe the project"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Color</label>
                            <div class="color-picker">
                                ${['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'].map(color => `
                                    <label class="color-option">
                                        <input type="radio" name="project-color" value="${color}" ${color === '#8b5cf6' ? 'checked' : ''}>
                                        <span class="color-swatch" style="background:${color}"></span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="app.modules.ui.closeModal('${modalId}')">Cancel</button>
                        <button class="btn-primary" id="create-project-btn">${this._icon('plus', 16)} Create Project</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('create-project-btn')?.addEventListener('click', () => this.createProject());
        }

        this.openModal(modalId);
    }

    async createProject() {
        const nameEl = document.getElementById('project-name');
        const name = nameEl?.value?.trim();
        if (!name) {
            showToast('Please enter a project name', 'warning');
            return;
        }

        const descEl = document.getElementById('project-description');
        const colorInput = document.querySelector('input[name="project-color"]:checked');
        const color = colorInput?.value || '#8b5cf6';

        try {
            const projectRef = await db.collection('projects').add({
                name,
                description: descEl?.value || '',
                color,
                organizationId: app.state.currentOrganization,
                createdBy: authManager.getCurrentUser()?.uid || auth.currentUser?.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isArchived: false
            });

            // Save to localDB if available
            try {
                if (localDB?.isReady?.()) {
                    await localDB.put('projects', {
                        id: projectRef.id, name,
                        description: descEl?.value || '',
                        color,
                        organizationId: app.state.currentOrganization,
                        isArchived: false
                    });
                }
            } catch (e) { /* ignore localDB errors */ }

            showToast('Project created!', 'success');
            this.closeModal('project-modal');
            
            if (app?.loadProjectsList) {
                await app.loadProjectsList();
            }
        } catch (error) {
            console.error('Error creating project:', error);
            showToast('Error creating project', 'error');
        }
    }

    // ============================================
    // THEME MANAGEMENT
    // ============================================

    setTheme(theme) {
        this.theme = theme;
        localStorage.setItem('oriental_theme', theme);

        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        this.setTheme(current === 'dark' ? 'light' : 'dark');
        showToast(`${current === 'dark' ? 'Light' : 'Dark'} mode`, 'info');
    }

    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================

    showShortcutsHelp() {
        const modalId = 'shortcuts-modal';
        if (document.getElementById(modalId)) {
            this.openModal(modalId);
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = modalId;
        modal.innerHTML = `
            <div class="modal-content" style="max-width:450px;">
                <div class="modal-header">
                    <h3>${this._icon('keyboard', 18)} Keyboard Shortcuts</h3>
                    <button class="close-modal" onclick="app.modules.ui.closeModal('${modalId}')">${this._icon('close', 18)}</button>
                </div>
                <div class="modal-body">
                    <div class="shortcuts-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <div><kbd>N</kbd> New Task</div>
                        <div><kbd>B</kbd> Board View</div>
                        <div><kbd>R</kbd> Reports</div>
                        <div><kbd>S</kbd> Sprints</div>
                        <div><kbd>Esc</kbd> Close Modal</div>
                        <div><kbd>?</kbd> This Help</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.openModal(modalId);
    }

    // ============================================
    // SETTINGS (simplified)
    // ============================================

    async renderSettings() {
    const container = document.getElementById('settings-view');
    if (!container) return;
    
    container.innerHTML = `
        <div style="padding:24px;">
            <h2 style="margin-bottom:20px;">Settings</h2>
            
            <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:12px;padding:20px;margin-bottom:16px;">
                <h3 style="margin-bottom:12px;">Theme</h3>
                <div style="display:flex;gap:8px;">
                    <button class="btn ${this.theme === 'light' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="app.modules.ui.setTheme('light')">Light</button>
                    <button class="btn ${this.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="app.modules.ui.setTheme('dark')">Dark</button>
                    <button class="btn ${this.theme === 'system' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="app.modules.ui.setTheme('system')">System</button>
                </div>
            </div>
            
            <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:12px;padding:20px;margin-bottom:16px;">
                <h3 style="margin-bottom:12px;">Profile</h3>
                <p style="color:var(--text-muted);margin-bottom:8px;">
                    Signed in as: <strong>${escapeHtml(authManager?.getCurrentUser()?.email || auth?.currentUser?.email || 'Unknown')}</strong>
                </p>
            </div>
            
            <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:12px;padding:20px;">
                <h3 style="margin-bottom:12px;color:#ef4444;">Danger Zone</h3>
                <button class="btn-danger" onclick="if(confirm('Logout?')) authManager.logout()" style="background:#ef4444;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;">
                    Logout
                </button>
            </div>
        </div>
    `;
}

    // ============================================
    // SIDEBAR
    // ============================================

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) {
            this.sidebarOpen = !this.sidebarOpen;
            sidebar.classList.toggle('open', this.sidebarOpen);
            if (overlay) overlay.classList.toggle('active', this.sidebarOpen);
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        this.sidebarOpen = false;
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }
}