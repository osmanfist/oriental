/**
 * Oriental - Dashboard Tasks
 * Task CRUD, board rendering, comments
 */

// ============================================
// TASK LOADING
// ============================================

async function loadTasks(showSkeleton = true) {
    if (!currentProject) return;
    if (unsubscribeTasks) unsubscribeTasks();
    
    try {
        const tasksSnapshot = await db.collection('tasks').where('projectId', '==', currentProject.id).get();
        allTasks = [];
        tasksSnapshot.forEach(doc => allTasks.push({ id: doc.id, ...doc.data() }));
        loadAssigneeFilters();
        applySearchAndFilter();
    } catch (error) {
        console.error('Error loading tasks:', error);
        showToast('Error loading tasks', 'error');
    }
}

// ============================================
// TASK CREATION
// ============================================

async function createTask(taskData) {
    if (!currentProject) { showToast('Please select a project first', 'warning'); return false; }
    if (!taskData.title) { showToast('Please enter a task title', 'warning'); return false; }
    
    try {
        let assigneeId = null;
        if (taskData.assignedTo && taskData.assignedTo !== 'Unassigned' && taskData.assignedTo !== '') {
            const matched = teamMembers.find(m => m.name === taskData.assignedTo);
            if (matched) assigneeId = matched.id;
        }
        
        const task = {
            projectId: currentProject.id, title: taskData.title,
            description: taskData.description || '', priority: taskData.priority || 'medium',
            status: 'planned', assignedTo: taskData.assignedTo || null, assignedToId: assigneeId,
            dueDate: taskData.dueDate || null, estimatedHours: parseFloat(taskData.estimatedHours) || 0,
            tags: taskData.tags ? taskData.tags.split(',').map(t => t.trim()) : [],
            order: Date.now(), createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection('tasks').add(task);
        await logActivity('create_task', 'task', docRef.id, taskData.title, { assignedTo: taskData.assignedTo });
        invalidateCache();
        showToast('Task created successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error creating task:', error);
        showToast('Error: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// TASK UPDATE
// ============================================

async function updateTask(taskId, taskData) {
    try {
        let assigneeId = null;
        if (taskData.assignedTo && taskData.assignedTo !== 'Unassigned' && taskData.assignedTo !== '') {
            const matched = teamMembers.find(m => m.name === taskData.assignedTo);
            if (matched) assigneeId = matched.id;
        }
        
        const updateData = {
            title: taskData.title, description: taskData.description || '',
            priority: taskData.priority || 'medium', assignedTo: taskData.assignedTo || null,
            assignedToId: assigneeId, dueDate: taskData.dueDate || null,
            estimatedHours: parseFloat(taskData.estimatedHours) || 0,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (taskData.tags) updateData.tags = taskData.tags.split(',').map(t => t.trim());
        
        await db.collection('tasks').doc(taskId).update(updateData);
        await logActivity('update_task', 'task', taskId, taskData.title, {});
        invalidateCache();
        showToast('Task updated successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error updating task:', error);
        showToast('Error: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// TASK DELETE WITH UNDO
// ============================================

function showUndoToast(message, undoFn) {
    const existing = document.querySelector('.undo-toast');
    if (existing) existing.remove();
    if (undoTimeout) clearTimeout(undoTimeout);
    const toast = document.createElement('div');
    toast.className = 'undo-toast';
    toast.innerHTML = `<span>${escapeHtml(message)}</span><button class="undo-btn">Undo</button>`;
    document.body.appendChild(toast);
    toast.querySelector('.undo-btn').addEventListener('click', () => {
        undoFn(); toast.remove(); clearTimeout(undoTimeout);
        showToast('Undone!', 'success');
    });
    undoTimeout = setTimeout(() => { toast.remove(); deletedItem = null; deletedItemType = null; }, UNDO_DURATION);
}

async function deleteTaskWithUndo(taskId, taskData) {
    deletedItem = { id: taskId, ...taskData, type: 'task' };
    deletedItemType = 'task';
    try {
        const cs = await db.collection('comments').where('taskId', '==', taskId).get();
        const batch = db.batch();
        cs.forEach(d => batch.delete(d.ref));
        batch.delete(db.collection('tasks').doc(taskId));
        await batch.commit();
        await logActivity('delete_task', 'task', taskId, taskData.title, {});
        showUndoToast('Task deleted', undoDelete);
        if (document.getElementById('comment-modal').style.display === 'flex') closeCommentModal();
        await loadTasks();
        invalidateCache();
    } catch (error) { console.error('Error:', error); showToast('Error deleting task', 'error'); }
}

async function undoDelete() {
    if (!deletedItem) return;
    try {
        if (deletedItemType === 'task') {
            await db.collection('tasks').add({
                projectId: deletedItem.projectId, title: deletedItem.title,
                description: deletedItem.description || '', priority: deletedItem.priority || 'medium',
                status: deletedItem.status || 'planned', assignedTo: deletedItem.assignedTo,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else if (deletedItemType === 'project') {
            const ref = await db.collection('projects').add({
                organizationId: deletedItem.organizationId, name: deletedItem.name,
                description: deletedItem.description || '', color: deletedItem.color || '#16a34a',
                isArchived: false, createdBy: deletedItem.createdBy,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            if (deletedItem.tasks) {
                for (const t of deletedItem.tasks) {
                    await db.collection('tasks').add({
                        projectId: ref.id, title: t.title, description: t.description || '',
                        priority: t.priority || 'medium', status: t.status || 'planned',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }
        deletedItem = null; deletedItemType = null;
        invalidateCache();
        if (deletedItemType === 'project') await loadProjectsOptimized();
        else await loadTasks();
    } catch (error) { console.error('Error:', error); showToast('Error undoing', 'error'); }
}

// ============================================
// BOARD RENDERING - 5 Columns
// ============================================

function renderBoard(tasks) {
    if (tasks.length === 0 && !searchTerm) {
        document.getElementById('board-view').innerHTML = `
            <div class="empty-state empty-tasks" style="width:100%;">
                <i class="fas fa-tasks"></i>
                <h3>No tasks yet</h3>
                <p>Get started by creating your first task</p>
                <button class="btn-primary" onclick="openTaskModal()"><i class="fas fa-plus"></i> Create Task</button>
            </div>`;
        return;
    }
    
    // Initialize all columns with empty tasks arrays
    const columns = {
        'planned':     { title: 'Planned',     tasks: [], icon: 'fa-circle',       color: '#9ca3af' },
        'started':     { title: 'Started',     tasks: [], icon: 'fa-play-circle',  color: '#3b82f6' },
        'in-progress': { title: 'In Progress', tasks: [], icon: 'fa-spinner',      color: '#f59e0b' },
        'waiting':     { title: 'Waiting',     tasks: [], icon: 'fa-clock',        color: '#8b5cf6' },
        'done':        { title: 'Done',        tasks: [], icon: 'fa-check-circle', color: '#10b981' }
    };
    
    // Safely assign tasks to columns
    tasks.forEach(task => {
        let status = task.status;
        
        // Map legacy statuses
        if (!status || status === 'todo') {
            status = 'planned';
        }
        
        // Ensure the column exists and has a tasks array
        if (columns[status]) {
            if (!Array.isArray(columns[status].tasks)) {
                columns[status].tasks = [];
            }
            columns[status].tasks.push(task);
        } else {
            // Unknown status - put in planned
            if (!Array.isArray(columns['planned'].tasks)) {
                columns['planned'].tasks = [];
            }
            columns['planned'].tasks.push(task);
        }
    });
    
    const boardView = document.getElementById('board-view');
    boardView.innerHTML = '';
    
    Object.entries(columns).forEach(([status, column]) => {
        const safeTasks = Array.isArray(column.tasks) ? column.tasks : [];
        const columnElement = document.createElement('div');
        columnElement.className = 'board-column';
        columnElement.setAttribute('data-status', status);
        columnElement.innerHTML = `
            <div class="column-header">
                <span class="column-title"><i class="fas ${column.icon}" style="color:${column.color}"></i> ${column.title}</span>
                <span class="column-count">${safeTasks.length}</span>
            </div>
            <div class="tasks-container" data-status="${status}">
                ${safeTasks.map(task => createTaskCard(task)).join('')}
            </div>
        `;
        boardView.appendChild(columnElement);
    });
    
    setupDragAndDrop();
    setupMobileDragAndDrop();
}

// ============================================
// TASK CARD CREATION
// ============================================


function createTaskCard(task) {
    const priorityClass = task.priority === 'high' ? 'priority-high' : (task.priority === 'medium' ? 'priority-medium' : 'priority-low');
    const priorityIcon = task.priority === 'high' ? 'fa-arrow-up' : (task.priority === 'medium' ? 'fa-minus' : 'fa-arrow-down');
    const safeTaskId = task.id.replace(/'/g, "\\'");
    const dueDateInfo = getDueDateDisplay(task.dueDate);
    const dueDateClass = task.dueDate ? getDueDateStatus(task.dueDate) : '';
    
    let highlightedTitle = escapeHtml(task.title);
    if (searchTerm) {
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        highlightedTitle = highlightedTitle.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    
    const projectBadge = showAllProjects ? `
        <span style="display:inline-flex;align-items:center;gap:3px;background:var(--primary-50);color:var(--primary-600);padding:1px 6px;border-radius:8px;font-size:10px;font-weight:500;">
            <span style="width:5px;height:5px;border-radius:50%;background:${task.projectColor||'#16a34a'};display:inline-block;"></span>
            ${escapeHtml(task.projectName||'')}
        </span>` : '';
    
    return `
        <div class="task-card" draggable="true" data-task-id="${task.id}" data-status="${task.status || 'planned'}" data-project-id="${task.projectId}" onclick="openTaskDetail('${safeTaskId}')">
            <div class="task-title">${highlightedTitle} ${projectBadge}</div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description.substring(0, 100))}</div>` : ''}
            <div class="task-meta">
                <span class="priority ${priorityClass}"><i class="fas ${priorityIcon}"></i> ${task.priority || 'medium'}</span>
                ${dueDateInfo ? `<span class="task-due-date due-${dueDateClass}"><i class="fas fa-calendar-alt"></i> ${escapeHtml(dueDateInfo)}</span>` : ''}
                <span class="assignee"><i class="fas fa-user"></i> ${task.assignedTo ? escapeHtml(task.assignedTo.substring(0, 8)) : 'Unassigned'}</span>
                <button class="comment-btn" onclick="event.stopPropagation(); openTaskDetail('${safeTaskId}')"><i class="fas fa-comment"></i></button>
            </div>
        </div>`;
}

// ============================================
// TASK DETAIL & COMMENTS
// ============================================

async function openTaskDetail(taskId) {
    currentTaskForComments = taskId;
    try {
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        if (!taskDoc.exists) { showToast('Task not found', 'error'); return; }
        const task = { id: taskDoc.id, ...taskDoc.data() };
        
        document.getElementById('edit-task-id').value = task.id;
        document.getElementById('edit-task-title').value = task.title || '';
        document.getElementById('edit-task-description').value = task.description || '';
        document.getElementById('edit-task-priority').value = task.priority || 'medium';
        updateAssigneeDropdowns();
        document.getElementById('edit-task-assignee').value = task.assignedTo || '';
        document.getElementById('edit-task-due-date').value = task.dueDate || '';
        document.getElementById('edit-task-estimate').value = task.estimatedHours || 0;
        document.getElementById('edit-task-tags').value = task.tags ? task.tags.join(', ') : '';
        document.getElementById('comment-task-title').textContent = `Task: ${task.title}`;
        
        await loadComments(taskId);
        document.getElementById('comment-modal').style.display = 'flex';
        document.getElementById('comment-modal').classList.add('active');
    } catch (error) { console.error('Error:', error); showToast('Error loading task', 'error'); }
}

async function loadComments(taskId) {
    try {
        const commentsSnapshot = await db.collection('comments')
            .where('taskId', '==', taskId).orderBy('createdAt', 'desc').get();
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;
        if (commentsSnapshot.empty) { commentsList.innerHTML = '<div class="empty-state"><p>No comments yet</p></div>'; return; }
        commentsList.innerHTML = '';
        commentsSnapshot.forEach(doc => {
            const comment = doc.data();
            const el = document.createElement('div');
            el.className = 'comment-item';
            el.innerHTML = `
                <div class="comment-author"><i class="fas fa-user-circle"></i> ${escapeHtml(comment.userName || 'Anonymous')}</div>
                <div class="comment-content">${escapeHtml(comment.content)}</div>
                <div class="comment-time">${comment.createdAt?.toDate() ? new Date(comment.createdAt.toDate()).toLocaleString() : 'Just now'}</div>
            `;
            commentsList.appendChild(el);
        });
    } catch (error) { console.error('Error loading comments:', error); }
}

async function addComment(taskId, content) {
    if (!content.trim()) return false;
    try {
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        const task = taskDoc.data();
        await db.collection('comments').add({
            taskId, userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email,
            content: content.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await logActivity('add_comment', 'comment', taskId, task.title, {});
        await loadComments(taskId);
        document.getElementById('new-comment').value = '';
        showToast('Comment added', 'success');
        return true;
    } catch (error) { console.error('Error:', error); showToast('Error adding comment', 'error'); return false; }
}

// ============================================
// MODAL HANDLERS
// ============================================

function openTaskModal() {
    if (!currentProject) { showToast('Select a project first', 'warning'); return; }
    const modal = document.getElementById('task-modal');
    if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); updateAssigneeDropdowns(); }
}

function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
}

function closeCommentModal() {
    const modal = document.getElementById('comment-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
    document.getElementById('new-comment').value = '';
}

// Make functions available globally
window.loadTasks = loadTasks;
window.createTask = createTask;
window.updateTask = updateTask;
window.deleteTaskWithUndo = deleteTaskWithUndo;
window.renderBoard = renderBoard;
window.createTaskCard = createTaskCard;
window.openTaskDetail = openTaskDetail;
window.loadComments = loadComments;
window.addComment = addComment;
window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.closeCommentModal = closeCommentModal;
window.undoDelete = undoDelete;

console.log('✅ dashboard-tasks.js loaded');