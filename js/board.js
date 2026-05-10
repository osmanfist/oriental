/**
 * Oriental v3.0 - Board Manager (Fixed)
 */

class BoardManager {
    constructor() {
        this.tasks = [];
        this.collapsedColumns = new Set();
    }

    async render() {
        const project = app.state.currentProject;
        if (!project) {
            document.getElementById('board-view').innerHTML = `
                <div class="empty-state"><p>Select a project to view tasks</p></div>`;
            return;
        }

        try {
            // Load from localDB first
            this.tasks = await localDB.getByIndex('tasks', 'projectId', project.id);
            
            // If empty, try Firestore
            if (this.tasks.length === 0 && navigator.onLine) {
                const snapshot = await db.collection('tasks')
                    .where('projectId', '==', project.id)
                    .orderBy('order', 'asc')
                    .get();
                this.tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }

            this.renderBoard();
        } catch (error) {
            console.error('Error loading board:', error);
            document.getElementById('board-view').innerHTML = `
                <div class="empty-state"><p>Error loading tasks</p></div>`;
        }
    }

    renderBoard() {
        const boardView = document.getElementById('board-view');
        if (!boardView) return;

        const states = ['planned', 'started', 'stuck', 'review', 'completed'];
        
        boardView.innerHTML = `
            <div class="board-scroll">
                ${states.map(state => this.renderColumn(state)).join('')}
            </div>
        `;

        this.setupDragAndDrop();
    }

    renderColumn(state) {
        const stateTasks = this.tasks.filter(t => t.status === state);
        const isCollapsed = this.collapsedColumns.has(state);
        
        return `
            <div class="board-column" data-state="${state}">
                <div class="column-header" onclick="app.modules.board.toggleColumn('${state}')">
                    <div class="column-header-left">
                        <span class="column-title">${this.getStateLabel(state)}</span>
                        <span class="column-count">${stateTasks.length}</span>
                    </div>
                    <button class="column-collapse-btn">${isCollapsed ? '▶' : '▼'}</button>
                </div>
                <div class="tasks-container ${isCollapsed ? 'collapsed' : ''}" data-state="${state}">
                    ${stateTasks.map(task => this.renderTaskCard(task)).join('')}
                    ${stateTasks.length === 0 ? '<div class="empty-column-state">No tasks</div>' : ''}
                </div>
            </div>
        `;
    }

    renderTaskCard(task) {
        const daysOverdue = getDaysOverdue(task.dueDate);
        const overdueBadge = daysOverdue > 0 && !['completed', 'archived'].includes(task.status) 
            ? `<span class="overdue-badge">+${daysOverdue}d</span>` : '';
        const overdueClass = daysOverdue > 0 && !['completed', 'archived'].includes(task.status) ? 'overdue' : '';
        
        return `
            <div class="task-card ${overdueClass}" draggable="true" data-task-id="${task.id}" data-state="${task.status}"
                 onclick="app.modules.ui.openTaskDetail('${task.id}')">
                <div class="task-card-header">
                    <span class="priority-dot" style="background:${getPriorityColor(task.priority)}"></span>
                    <span class="task-title">${escapeHtml(task.title)}</span>
                    ${overdueBadge}
                </div>
                ${task.description ? `<div class="task-description">${escapeHtml(task.description.substring(0, 80))}</div>` : ''}
                <div class="task-card-footer">
                    <div class="task-meta">
                        ${task.dueDate ? `<span class="task-due-date ${overdueClass}">${formatDate(task.dueDate)}</span>` : ''}
                        <span class="task-assignee">${escapeHtml(task.assignedTo || 'Unassigned')}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getStateLabel(state) {
        const labels = { planned: 'Planned', started: 'Started', stuck: 'Stuck', review: 'Review', completed: 'Completed' };
        return labels[state] || state;
    }

    toggleColumn(state) {
        if (this.collapsedColumns.has(state)) {
            this.collapsedColumns.delete(state);
        } else {
            this.collapsedColumns.add(state);
        }
        this.renderBoard();
    }

    setupDragAndDrop() {
        document.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', card.dataset.taskId);
            });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
        });

        document.querySelectorAll('.tasks-container').forEach(container => {
            container.addEventListener('dragover', (e) => e.preventDefault());
            container.addEventListener('drop', async (e) => {
                e.preventDefault();
                container.classList.remove('drag-over');
                const taskId = e.dataTransfer.getData('text/plain');
                const newState = container.dataset.state;
                if (taskId && newState) await this.moveTask(taskId, newState);
            });
            container.addEventListener('dragenter', () => container.classList.add('drag-over'));
            container.addEventListener('dragleave', () => container.classList.remove('drag-over'));
        });
    }

    async moveTask(taskId, newState) {
        try {
            await db.collection('tasks').doc(taskId).update({
                status: newState,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local task
            const task = this.tasks.find(t => t.id === taskId);
            if (task) task.status = newState;
            
            this.renderBoard();
            showToast(`Task moved to ${this.getStateLabel(newState)}`, 'success');
        } catch (error) {
            console.error('Error moving task:', error);
            showToast('Error moving task', 'error');
        }
    }
}