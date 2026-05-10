/**
 * Oriental v3.0.0 - UI Manager
 * Modals, toasts, theme, and UI utilities
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

        // Add escape key listener
        document.addEventListener('keydown', this.handleEscapeKey);
        
        // Add click outside listener
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

        // Remove escape key listener if no more modals
        if (this.activeModals.length === 0) {
            document.removeEventListener('keydown', this.handleEscapeKey);
        }
    }

    closeAllModals() {
        this.activeModals.forEach(id => this.closeModal(id));
        this.activeModals = [];
        document.removeEventListener('keydown', this.handleEscapeKey);
    }

    handleEscapeKey = (e) => {
        if (e.key === 'Escape' && this.activeModals.length > 0) {
            this.closeModal(this.activeModals[this.activeModals.length - 1]);
        }
    }

    // ============================================
    // TASK MODAL
    // ============================================

    openTaskModal(taskData = null) {
        if (!app.state.currentProject) {
            showToast('Please select a project first', 'warning');
            return;
        }

        const isEditing = !!taskData;
        const modalId = isEditing ? 'edit-task-modal' : 'create-task-modal';
        
        // Create modal if it doesn't exist
        this.ensureTaskModal(modalId, isEditing);

        if (isEditing) {
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
                        <i class="fas fa-times"></i>
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
                                <select id="task-assignee">
                                    <option value="">Unassigned</option>
                                </select>
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
                                    <i class="fas fa-plus"></i> Add Subtask
                                </button>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="task-recurring"> Recurring Task
                            </label>
                            <div id="recurring-options" style="display: none; margin-top: 10px;">
                                <select id="recurring-frequency">
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="app.modules.ui.closeModal('${modalId}')">Cancel</button>
                    <button class="btn-primary" onclick="app.modules.ui.saveTask('${modalId}')">
                        <i class="fas fa-save"></i> ${isEditing ? 'Save Changes' : 'Create Task'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup event listeners
        document.getElementById('task-recurring')?.addEventListener('change', (e) => {
            document.getElementById('recurring-options').style.display = 
                e.target.checked ? 'block' : 'none';
        });

        // Load assignees
        this.loadAssigneeOptions();
    }

    async loadAssigneeOptions() {
        const assigneeSelects = ['task-assignee', 'edit-task-assignee'];
        
        if (app.modules.teams) {
            const members = app.modules.teams.getAssignableMembers();
            const options = '<option value="">Unassigned</option>' + 
                members.map(m => `
                    <option value="${m.id}">${escapeHtml(m.name || m.email)}</option>
                `).join('');
            
            assigneeSelects.forEach(id => {
                const select = document.getElementById(id);
                if (select) select.innerHTML = options;
            });
        }
    }

    addSubtaskField() {
        const list = document.getElementById('subtasks-list');
        if (!list) return;

        const index = list.children.length;
        const div = document.createElement('div');
        div.className = 'subtask-field';
        div.innerHTML = `
            <input type="text" class="subtask-input" placeholder="Subtask ${index + 1}" data-index="${index}">
            <button type="button" class="btn-icon danger" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        list.appendChild(div);
    }

    async saveTask(modalId) {
        const title = document.getElementById('task-title')?.value.trim();
        if (!title) {
            showToast('Please enter a task title', 'warning');
            return;
        }

        const assigneeId = document.getElementById('task-assignee')?.value || null;
        const assigneeSelect = document.getElementById('task-assignee');
        const assigneeName = assigneeSelect?.options[assigneeSelect.selectedIndex]?.text || null;

        // Collect subtasks
        const subtasks = [];
        document.querySelectorAll('.subtask-input').forEach(input => {
            const value = input.value.trim();
            if (value) {
                subtasks.push({ 
                    title: value,
                    status: 'planned',
                    assignedToId: assigneeId,
                    assignedTo: assigneeName
                });
            }
        });

        const taskData = {
            title: title,
            description: document.getElementById('task-description')?.value || '',
            status: document.getElementById('task-status')?.value || 'planned',
            priority: document.getElementById('task-priority')?.value || 'medium',
            assignedToId: assigneeId,
            assignedTo: assigneeName,
            dueDate: document.getElementById('task-due-date')?.value || null,
            estimatedHours: parseFloat(document.getElementById('task-estimated-hours')?.value) || 0,
            tags: document.getElementById('task-tags')?.value
                .split(',')
                .map(t => t.trim())
                .filter(t => t),
            subtasks: subtasks,
            recurring: document.getElementById('task-recurring')?.checked ? {
                frequency: document.getElementById('recurring-frequency')?.value
            } : null
        };

        const isEditing = modalId === 'edit-task-modal';
        let success = false;

        if (isEditing) {
            const taskId = document.getElementById('edit-task-id')?.value;
            if (taskId) {
                success = await app.modules.tasks.updateTask(taskId, taskData);
            }
        } else {
            const taskId = await app.modules.tasks.createTask(taskData);
            success = !!taskId;
        }

        if (success) {
            this.closeModal(modalId);
            await app.modules.board.render();
            app.modules.admin?.update();
        }
    }

    populateEditTaskForm(taskData) {
        document.getElementById('edit-task-id').value = taskData.id;
        document.getElementById('edit-task-title').value = taskData.title || '';
        document.getElementById('edit-task-description').value = taskData.description || '';
        document.getElementById('edit-task-status').value = taskData.status || 'planned';
        document.getElementById('edit-task-priority').value = taskData.priority || 'medium';
        document.getElementById('edit-task-assignee').value = taskData.assignedToId || '';
        document.getElementById('edit-task-due-date').value = taskData.dueDate || '';
        document.getElementById('edit-task-estimated-hours').value = taskData.estimatedHours || 0;
        document.getElementById('edit-task-tags').value = (taskData.tags || []).join(', ');
    }

    // ============================================
    // TASK DETAIL MODAL (with subtasks)
    // ============================================

    async openTaskDetail(taskId) {
        try {
            const taskDoc = await db.collection('tasks').doc(taskId).get();
            if (!taskDoc.exists) {
                showToast('Task not found', 'error');
                return;
            }

            const task = { id: taskDoc.id, ...taskDoc.data() };
            const subtasks = await app.modules.tasks.getSubtasks(taskId);
            const history = await app.modules.tasks.getTaskHistory(taskId);
            const milestones = app.modules.milestones?.getTaskMilestones(taskId) || [];

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
            ? `<span class="overdue-badge large">+${daysOverdue}d overdue</span>` 
            : '';

        // Update modal content
        const modal = document.getElementById(modalId);
        modal.querySelector('.modal-header h3').textContent = task.title;
        
        modal.querySelector('.modal-body').innerHTML = `
            ${overdueBadge}
            
            <div class="task-detail-grid">
                <div class="detail-section">
                    <h4>Description</h4>
                    <p>${escapeHtml(task.description || 'No description')}</p>
                </div>
                
                <div class="detail-section">
                    <h4>Details</h4>
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value">
                            <i class="fas ${getTaskStateIcon(task.status)}" style="color: ${getTaskStateColor(task.status)}"></i>
                            ${getTaskStateLabel(task.status)}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Priority:</span>
                        <span class="detail-value" style="color: ${getPriorityColor(task.priority)}">
                            ${task.priority?.toUpperCase()}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Assignee:</span>
                        <span class="detail-value">${escapeHtml(task.assignedTo || 'Unassigned')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Due Date:</span>
                        <span class="detail-value ${daysOverdue > 0 ? 'overdue' : ''}">
                            ${task.dueDate ? formatDate(task.dueDate) : 'Not set'}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Progress:</span>
                        <span class="detail-value">
                            <div class="progress-bar small">
                                <div class="progress-fill" style="width: ${task.progress || 0}%"></div>
                            </div>
                            ${task.progress || 0}%
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- Subtasks Section -->
            <div class="detail-section">
                <h4>
                    <i class="fas fa-list-check"></i> Subtasks 
                    (${subtasks.filter(s => s.status === 'completed').length}/${subtasks.length})
                </h4>
                <div class="subtasks-list">
                    ${subtasks.length === 0 ? 
                        '<p class="text-muted">No subtasks</p>' :
                        subtasks.map(subtask => `
                            <div class="subtask-item ${subtask.status === 'completed' ? 'completed' : ''}">
                                <input type="checkbox" 
                                       ${subtask.status === 'completed' ? 'checked' : ''}
                                       onchange="app.modules.tasks.updateSubtask('${subtask.id}', {status: this.checked ? 'completed' : 'planned'})">
                                <span class="subtask-title">${escapeHtml(subtask.title)}</span>
                                <span class="subtask-assignee">${escapeHtml(subtask.assignedTo || 'Unassigned')}</span>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
            
            <!-- Milestones Section -->
            ${milestones.length > 0 ? `
                <div class="detail-section">
                    <h4><i class="fas fa-flag"></i> Milestones</h4>
                    <div class="milestones-list">
                        ${milestones.map(m => `
                            <div class="milestone-item ${m.completed ? 'completed' : ''}">
                                <span>${escapeHtml(m.name)}</span>
                                <span>${formatDate(m.date)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- History Section -->
            <div class="detail-section">
                <h4><i class="fas fa-history"></i> Activity History</h4>
                <div class="history-list">
                    ${history.map(h => {
                        const changes = Object.entries(h.changes || {}).map(([key, value]) => {
                            return `${key}: ${value.from || 'none'} → ${value.to || 'none'}`;
                        }).join(', ');
                        
                        return `
                            <div class="history-item">
                                <span class="history-action">${h.action}</span>
                                ${changes ? `<span class="history-changes">${changes}</span>` : ''}
                                <span class="history-time">${h.createdAt?.toDate() ? formatDate(h.createdAt.toDate()) : ''}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        // Update footer actions
        modal.querySelector('.modal-footer').innerHTML = `
            <button class="btn-secondary" onclick="app.modules.ui.openTaskModalForEdit('${task.id}')">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-danger" onclick="app.modules.tasks.deleteTask('${task.id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
            <button class="btn-secondary" onclick="app.modules.ui.closeModal('${modalId}')">Close</button>
        `;

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
                    <button class="close-modal" onclick="app.modules.ui.closeModal('${modalId}')">
                        <i class="fas fa-times"></i>
                    </button>
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
                        <button class="close-modal" onclick="app.modules.ui.closeModal('${modalId}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form onsubmit="return false;">
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
                                            <span class="color-swatch" style="background: ${color}"></span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="app.modules.ui.closeModal('${modalId}')">Cancel</button>
                        <button class="btn-primary" onclick="app.modules.ui.createProject()">
                            <i class="fas fa-plus"></i> Create Project
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        }

        this.openModal(modalId);
    }

    async createProject() {
    const name = document.getElementById('project-name')?.value.trim();
    if (!name) {
        showToast('Please enter a project name', 'warning');
        return;
    }

    const colorInput = document.querySelector('input[name="project-color"]:checked');
    const color = colorInput?.value || '#8b5cf6';

    try {
        const projectRef = await db.collection('projects').add({
            name: name,
            description: document.getElementById('project-description')?.value || '',
            color: color,
            organizationId: app.state.currentOrganization,
            createdBy: authManager.getCurrentUser().uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isArchived: false
        });

        // Save to local DB immediately
        await localDB.put('projects', {
            id: projectRef.id,
            name: name,
            description: document.getElementById('project-description')?.value || '',
            color: color,
            organizationId: app.state.currentOrganization,
            isArchived: false
        });

        showToast('Project created!', 'success');
        this.closeModal('project-modal');
        
        // Refresh the project list in sidebar
        await loadProjectsList();
        
        console.log('✅ Project created and UI refreshed:', name);

    } catch (error) {
        console.error('Error creating project:', error);
        showToast('Error creating project', 'error');
    }
}

    // ============================================
    // MILESTONE MODAL
    // ============================================

    openMilestoneModal() {
        const modalId = 'milestone-modal';
        
        if (!document.getElementById(modalId)) {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = modalId;
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>Add Milestone</h3>
                        <button class="close-modal" onclick="app.modules.ui.closeModal('${modalId}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form onsubmit="return false;">
                            <div class="form-group">
                                <label>Name <span class="required">*</span></label>
                                <input type="text" id="milestone-name" placeholder="e.g., Phase 1 Launch" required>
                            </div>
                            <div class="form-group">
                                <label>Date <span class="required">*</span></label>
                                <input type="date" id="milestone-date" required>
                            </div>
                            <div class="form-group">
                                <label>Description</label>
                                <textarea id="milestone-description" rows="2" placeholder="Milestone description"></textarea>
                            </div>
                            <div class="form-group">
                                <label>Type</label>
                                <select id="milestone-type">
                                    <option value="project">Project Milestone</option>
                                    <option value="task">Task Milestone</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="app.modules.ui.closeModal('${modalId}')">Cancel</button>
                        <button class="btn-primary" onclick="app.modules.ui.createMilestone()">
                            <i class="fas fa-flag"></i> Add Milestone
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        }

        // Set default date to next week
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        document.getElementById('milestone-date').value = nextWeek.toISOString().split('T')[0];

        this.openModal(modalId);
    }

    async createMilestone() {
        const name = document.getElementById('milestone-name')?.value.trim();
        const date = document.getElementById('milestone-date')?.value;

        if (!name || !date) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }

        const milestoneData = {
            name: name,
            date: date,
            description: document.getElementById('milestone-description')?.value || '',
            type: document.getElementById('milestone-type')?.value || 'project'
        };

        const id = await app.modules.milestones.createMilestone(milestoneData);
        
        if (id) {
            this.closeModal('milestone-modal');
            app.modules.milestones.renderTimeline();
        }
    }

    // ============================================
    // ROLE CHANGE MODAL
    // ============================================

    openRoleChangeModal(userId) {
        const member = app.modules.teams.members.find(m => m.id === userId);
        if (!member) {
            showToast('Member not found', 'error');
            return;
        }

        const modalId = 'role-change-modal';
        
        if (document.getElementById(modalId)) {
            document.getElementById(modalId).remove();
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = modalId;
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h3>Change Role</h3>
                    <button class="close-modal" onclick="app.modules.ui.closeModal('${modalId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Change role for <strong>${escapeHtml(member.name || member.email)}</strong></p>
                    <p class="text-muted">Current role: <span style="color: ${member.roleData?.color}">${member.roleData?.name}</span></p>
                    
                    <div class="role-options">
                        ${Object.entries(ROLES).map(([key, role]) => `
                            <label class="role-option ${key === member.role ? 'active' : ''}">
                                <input type="radio" name="new-role" value="${key}" ${key === member.role ? 'checked' : ''}>
                                <div class="role-option-content">
                                    <i class="fas ${role.icon}" style="color: ${role.color}"></i>
                                    <div>
                                        <strong>${role.name}</strong>
                                        <p class="text-muted">${role.description || ''}</p>
                                    </div>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="app.modules.ui.closeModal('${modalId}')">Cancel</button>
                    <button class="btn-primary" id="save-role-btn">
                        <i class="fas fa-save"></i> Save Role
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#save-role-btn').addEventListener('click', async () => {
            const newRole = modal.querySelector('input[name="new-role"]:checked')?.value;
            if (newRole && newRole !== member.role) {
                await app.modules.teams.changeMemberRole(userId, newRole);
                this.closeModal(modalId);
            } else {
                showToast('No changes made', 'info');
                this.closeModal(modalId);
            }
        });

        this.openModal(modalId);
    }

    // ============================================
    // SETTINGS VIEW
    // ============================================

    async renderSettings() {
        const container = document.getElementById('settings-view');
        if (!container) return;

        const user = authManager.getCurrentUser();
        const prefs = user.userData?.preferences || {};

        container.innerHTML = `
            <div class="settings-container">
                <div class="settings-header">
                    <h2><i class="fas fa-cog"></i> Settings</h2>
                </div>
                
                <div class="settings-tabs">
                    <button class="settings-tab active" data-tab="profile">
                        <i class="fas fa-user"></i> Profile
                    </button>
                    <button class="settings-tab" data-tab="notifications">
                        <i class="fas fa-bell"></i> Notifications
                    </button>
                    <button class="settings-tab" data-tab="appearance">
                        <i class="fas fa-palette"></i> Appearance
                    </button>
                    ${authManager.hasPermission('manage_organization') ? `
                        <button class="settings-tab" data-tab="organization">
                            <i class="fas fa-building"></i> Organization
                        </button>
                    ` : ''}
                </div>
                
                <div class="settings-content">
                    <div class="settings-panel active" id="panel-profile">
                        ${this.renderProfilePanel(user)}
                    </div>
                    <div class="settings-panel" id="panel-notifications">
                        ${this.renderNotificationsPanel(prefs)}
                    </div>
                    <div class="settings-panel" id="panel-appearance">
                        ${this.renderAppearancePanel(prefs)}
                    </div>
                    ${authManager.hasPermission('manage_organization') ? `
                        <div class="settings-panel" id="panel-organization">
                            ${await this.renderOrganizationPanel()}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Setup tab switching
        container.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                container.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
                
                tab.classList.add('active');
                const panelId = `panel-${tab.dataset.tab}`;
                document.getElementById(panelId)?.classList.add('active');
            });
        });

        // Setup event listeners
        this.setupSettingsListeners();
    }

    renderProfilePanel(user) {
        return `
            <div class="settings-section">
                <h3>Profile Information</h3>
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" id="settings-name" value="${escapeHtml(user.userData?.name || '')}">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" value="${escapeHtml(user.email)}" disabled>
                </div>
                <button class="btn-primary" id="save-profile-btn">
                    <i class="fas fa-save"></i> Save Profile
                </button>
            </div>
        `;
    }

    renderNotificationsPanel(prefs) {
        return `
            <div class="settings-section">
                <h3>Email Notifications</h3>
                <div class="toggle-group">
                    <label class="toggle-item">
                        <input type="checkbox" id="notify-task-assigned" ${prefs.notifications?.taskAssigned !== false ? 'checked' : ''}>
                        <span>When a task is assigned to me</span>
                    </label>
                    <label class="toggle-item">
                        <input type="checkbox" id="notify-comment-mention" ${prefs.notifications?.commentMention !== false ? 'checked' : ''}>
                        <span>When someone mentions me</span>
                    </label>
                    <label class="toggle-item">
                        <input type="checkbox" id="notify-project-updates" ${prefs.notifications?.projectUpdates !== false ? 'checked' : ''}>
                        <span>Project updates and changes</span>
                    </label>
                </div>
                <button class="btn-primary" id="save-notifications-btn">
                    <i class="fas fa-save"></i> Save Notifications
                </button>
            </div>
        `;
    }

    renderAppearancePanel(prefs) {
        return `
            <div class="settings-section">
                <h3>Theme</h3>
                <div class="theme-options">
                    ${['light', 'dark', 'system'].map(theme => `
                        <label class="theme-option ${this.theme === theme ? 'active' : ''}">
                            <input type="radio" name="theme" value="${theme}" ${this.theme === theme ? 'checked' : ''}>
                            <i class="fas ${theme === 'light' ? 'fa-sun' : theme === 'dark' ? 'fa-moon' : 'fa-laptop'}"></i>
                            <span>${theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="settings-section">
                <h3>Language</h3>
                <select id="settings-language">
                    <option value="en" ${prefs.language === 'en' ? 'selected' : ''}>English</option>
                    <option value="ar" ${prefs.language === 'ar' ? 'selected' : ''}>العربية</option>
                </select>
            </div>
        `;
    }

    async renderOrganizationPanel() {
        const orgDoc = await db.collection('organizations').doc(app.state.currentOrganization).get();
        const orgData = orgDoc.data() || {};

        return `
            <div class="settings-section">
                <h3>Organization Settings</h3>
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" id="settings-org-name" value="${escapeHtml(orgData.name || '')}">
                </div>
                <div class="form-group">
                    <label>Slug</label>
                    <input type="text" id="settings-org-slug" value="${escapeHtml(orgData.slug || '')}">
                </div>
                <button class="btn-primary" id="save-org-settings-btn">
                    <i class="fas fa-save"></i> Save Organization
                </button>
            </div>
            
            <div class="settings-section danger-section">
                <h3 class="text-danger">Danger Zone</h3>
                <p>Destructive actions that cannot be undone.</p>
                <div class="danger-actions">
                    <button class="btn-danger" id="delete-org-btn">
                        <i class="fas fa-trash"></i> Delete Organization
                    </button>
                    <button class="btn-danger" id="leave-org-btn">
                        <i class="fas fa-sign-out-alt"></i> Leave Organization
                    </button>
                </div>
            </div>
        `;
    }

    setupSettingsListeners() {
        document.getElementById('save-profile-btn')?.addEventListener('click', async () => {
            const name = document.getElementById('settings-name')?.value.trim();
            if (name) {
                await db.collection('users').doc(authManager.getCurrentUser().uid).update({ name });
                showToast('Profile saved', 'success');
            }
        });

        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        });

        document.getElementById('save-org-settings-btn')?.addEventListener('click', async () => {
            const name = document.getElementById('settings-org-name')?.value.trim();
            const slug = document.getElementById('settings-org-slug')?.value.trim();
            
            if (name) {
                await db.collection('organizations').doc(app.state.currentOrganization).update({
                    name,
                    slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                showToast('Organization saved', 'success');
            }
        });
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
        
        // Update theme icons
        document.querySelectorAll('.theme-toggle i').forEach(icon => {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        });
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        this.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
        showToast(`${currentTheme === 'dark' ? 'Light' : 'Dark'} mode activated`, 'info');
    }

    // ============================================
    // KEYBOARD SHORTCUTS HELP
    // ============================================

    showShortcutsHelp() {
        const modalId = 'shortcuts-modal';
        
        if (!document.getElementById(modalId)) {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = modalId;
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
                        <button class="close-modal" onclick="app.modules.ui.closeModal('${modalId}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="shortcuts-grid">
                            <div class="shortcut-item"><kbd>N</kbd><span>New Task</span></div>
                            <div class="shortcut-item"><kbd>P</kbd><span>New Project</span></div>
                            <div class="shortcut-item"><kbd>B</kbd><span>Board View</span></div>
                            <div class="shortcut-item"><kbd>R</kbd><span>Reports View</span></div>
                            <div class="shortcut-item"><kbd>S</kbd><span>Sprints View</span></div>
                            <div class="shortcut-item"><kbd>/</kbd><span>Search Tasks</span></div>
                            <div class="shortcut-item"><kbd>Esc</kbd><span>Close Modal</span></div>
                            <div class="shortcut-item"><kbd>?</kbd><span>Show Shortcuts</span></div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        }

        this.openModal(modalId);
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