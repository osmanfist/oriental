/**
 * Oriental - Dashboard Sprints
 * Sprint CRUD, sprint board, task assignment
 */

// ============================================
// LOAD SPRINTS
// ============================================

async function loadSprints() {
    if (!currentProject) return;
    
    try {
        const activeSprintSnapshot = await db.collection('sprints')
            .where('projectId', '==', currentProject.id)
            .where('status', '==', 'active').limit(1).get();
        
        if (!activeSprintSnapshot.empty) {
            currentSprint = { id: activeSprintSnapshot.docs[0].id, ...activeSprintSnapshot.docs[0].data() };
            displayActiveSprint(currentSprint);
            loadSprintTasks(currentSprint);
        } else {
            currentSprint = null;
            displayNoActiveSprint();
        }
        await loadPastSprints();
    } catch (error) { console.error('Error loading sprints:', error); }
}

function displayActiveSprint(sprint) {
    const nameEl = document.getElementById('active-sprint-name');
    const goalEl = document.getElementById('active-sprint-goal');
    const datesEl = document.getElementById('sprint-dates');
    const createBtn = document.getElementById('create-sprint-btn');
    const completeBtn = document.getElementById('complete-sprint-btn');
    
    if (nameEl) nameEl.textContent = sprint.name || 'Unnamed Sprint';
    if (goalEl) goalEl.textContent = sprint.goal || 'No goal set';
    if (datesEl && sprint.startDate && sprint.endDate) {
        const start = new Date(sprint.startDate).toLocaleDateString();
        const end = new Date(sprint.endDate).toLocaleDateString();
        datesEl.innerHTML = `<i class="fas fa-calendar-alt"></i> ${start} - ${end}`;
    }
    if (createBtn) createBtn.style.display = 'none';
    if (completeBtn) completeBtn.style.display = 'flex';
}

function displayNoActiveSprint() {
    const nameEl = document.getElementById('active-sprint-name');
    const goalEl = document.getElementById('active-sprint-goal');
    const datesEl = document.getElementById('sprint-dates');
    const createBtn = document.getElementById('create-sprint-btn');
    const completeBtn = document.getElementById('complete-sprint-btn');
    
    if (nameEl) nameEl.textContent = 'No Active Sprint';
    if (goalEl) goalEl.textContent = 'Start a sprint to track progress';
    if (datesEl) datesEl.innerHTML = '';
    if (createBtn) createBtn.style.display = 'flex';
    if (completeBtn) completeBtn.style.display = 'none';
    
    ['planned-tasks', 'started-tasks', 'progress-tasks', 'waiting-tasks', 'completed-tasks'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="empty-state-small">No active sprint</div>';
    });
    ['planned-count', 'started-count', 'progress-count', 'waiting-count', 'completed-count'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });
    
    ['sprint-progress-percent', 'sprint-progress-fill', 'sprint-completed-tasks', 'sprint-total-tasks'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'sprint-progress-percent') el.textContent = '0%';
            else if (id === 'sprint-progress-fill') el.style.width = '0%';
            else el.textContent = '0';
        }
    });
}

async function loadSprintTasks(sprint) {
    if (!sprint?.tasks?.length) {
        showEmptySprintColumns();
        updateSprintProgress(0, 0);
        return;
    }
    
    try {
        const tasksData = [];
        for (const taskId of sprint.tasks) {
            const taskDoc = await db.collection('tasks').doc(taskId).get();
            if (taskDoc.exists) tasksData.push({ id: taskDoc.id, ...taskDoc.data() });
        }
        
        const planned = tasksData.filter(t => t.status === 'planned' || t.status === 'todo');
        const started = tasksData.filter(t => t.status === 'started');
        const inProgress = tasksData.filter(t => t.status === 'in-progress');
        const waiting = tasksData.filter(t => t.status === 'waiting');
        const completed = tasksData.filter(t => t.status === 'done');
        
        renderSprintColumns(planned, started, inProgress, waiting, completed);
        updateSprintProgress(completed.length, tasksData.length);
    } catch (error) { console.error('Error loading sprint tasks:', error); }
}

function renderSprintColumns(planned, started, inProgress, waiting, completed) {
    const columns = {
        'planned-tasks': planned,
        'started-tasks': started,
        'progress-tasks': inProgress,
        'waiting-tasks': waiting,
        'completed-tasks': completed
    };
    
    Object.entries(columns).forEach(([id, tasks]) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = tasks.map(t => createSprintTaskCard(t)).join('') || '<div class="empty-state-small">No tasks</div>';
    });
    
    document.getElementById('planned-count').textContent = planned.length;
    document.getElementById('started-count').textContent = started.length;
    document.getElementById('progress-count').textContent = inProgress.length;
    document.getElementById('waiting-count').textContent = waiting.length;
    document.getElementById('completed-count').textContent = completed.length;
}

function createSprintTaskCard(task) {
    const pc = task.priority === 'high' ? 'priority-high' : (task.priority === 'medium' ? 'priority-medium' : 'priority-low');
    return `<div class="sprint-task-card" onclick="openTaskDetail('${task.id}')">
        <div class="sprint-task-title">${escapeHtml(task.title)}</div>
        <div class="sprint-task-status">
            <span class="priority ${pc}">${task.priority || 'medium'}</span>
            <span><i class="fas fa-user"></i> ${task.assignedTo || 'Unassigned'}</span>
        </div>
    </div>`;
}

function showEmptySprintColumns() {
    ['planned-tasks', 'started-tasks', 'progress-tasks', 'waiting-tasks', 'completed-tasks'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="empty-state-small">No tasks</div>';
    });
    ['planned-count', 'started-count', 'progress-count', 'waiting-count', 'completed-count'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });
}

function updateSprintProgress(completed, total) {
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const pe = document.getElementById('sprint-progress-percent');
    const fe = document.getElementById('sprint-progress-fill');
    const ce = document.getElementById('sprint-completed-tasks');
    const te = document.getElementById('sprint-total-tasks');
    if (pe) pe.textContent = `${percent}%`;
    if (fe) fe.style.width = `${percent}%`;
    if (ce) ce.textContent = completed;
    if (te) te.textContent = total;
}

async function loadPastSprints() {
    if (!currentProject) return;
    try {
        const snapshot = await db.collection('sprints')
            .where('projectId', '==', currentProject.id)
            .where('status', '==', 'completed')
            .orderBy('endDate', 'desc').limit(10).get();
        const container = document.getElementById('past-sprints-list');
        if (!container) return;
        if (snapshot.empty) { container.innerHTML = '<div class="empty-state-small">No past sprints</div>'; return; }
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const s = doc.data();
            const div = document.createElement('div');
            div.className = 'past-sprint-item';
            const start = s.startDate ? new Date(s.startDate).toLocaleDateString() : '?';
            const end = s.endDate ? new Date(s.endDate).toLocaleDateString() : '?';
            div.innerHTML = `<div class="past-sprint-name">${escapeHtml(s.name)}</div>
                <div class="past-sprint-dates"><i class="fas fa-calendar-alt"></i> ${start} - ${end}</div>
                <div class="past-sprint-stats"><i class="fas fa-tasks"></i> ${s.tasks?.length || 0} tasks</div>`;
            container.appendChild(div);
        });
    } catch (error) { console.error('Error:', error); }
}

// ============================================
// SPRINT ACTIONS
// ============================================

async function createSprint(sprintData) {
    if (!currentProject) { showToast('Select a project first', 'warning'); return false; }
    try {
        await db.collection('sprints').add({
            organizationId: currentOrganization, projectId: currentProject.id,
            name: sprintData.name, goal: sprintData.goal || '',
            startDate: sprintData.startDate, endDate: sprintData.endDate,
            status: 'active', tasks: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await logActivity('create_sprint', 'sprint', null, sprintData.name);
        showToast('Sprint started!', 'success');
        await loadSprints();
        return true;
    } catch (error) { console.error('Error:', error); showToast('Error creating sprint', 'error'); return false; }
}

async function completeSprint() {
    if (!currentSprint) { showToast('No active sprint', 'warning'); return; }
    const confirmed = await showConfirmDialog('Complete Sprint', `Mark "${currentSprint.name}" as completed?`, 'warning');
    if (!confirmed) return;
    try {
        await db.collection('sprints').doc(currentSprint.id).update({
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await logActivity('complete_sprint', 'sprint', currentSprint.id, currentSprint.name);
        showToast('Sprint completed! 🎉', 'success');
        currentSprint = null;
        await loadSprints();
    } catch (error) { console.error('Error:', error); showToast('Error completing sprint', 'error'); }
}

function openSprintModal() {
    if (!currentProject) { showToast('Select a project first', 'warning'); return; }
    if (currentSprint) { showToast('Active sprint exists. Complete it first.', 'warning'); return; }
    const modal = document.getElementById('sprint-modal');
    const today = new Date();
    const end = new Date(); end.setDate(today.getDate() + 14);
    document.getElementById('sprint-start-date').value = today.toISOString().split('T')[0];
    document.getElementById('sprint-end-date').value = end.toISOString().split('T')[0];
    if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
}

function closeSprintModal() {
    const modal = document.getElementById('sprint-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
}

async function openAddToSprintModal() {
    if (!currentSprint) { showToast('No active sprint', 'warning'); return; }
    await loadAvailableTasks();
    const modal = document.getElementById('add-to-sprint-modal');
    if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
}

function closeAddToSprintModal() {
    const modal = document.getElementById('add-to-sprint-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
}

async function loadAvailableTasks() {
    if (!currentProject || !currentSprint) return;
    try {
        const snapshot = await db.collection('tasks').where('projectId', '==', currentProject.id).get();
        const sprintIds = currentSprint.tasks || [];
        availableTasks = [];
        snapshot.forEach(doc => {
            if (!sprintIds.includes(doc.id)) availableTasks.push({ id: doc.id, ...doc.data() });
        });
        const container = document.getElementById('available-tasks-list');
        if (!container) return;
        if (!availableTasks.length) { container.innerHTML = '<div class="empty-state-small">No available tasks</div>'; return; }
        container.innerHTML = availableTasks.map(t => `
            <div class="available-task-item">
                <input type="checkbox" value="${t.id}" id="task-${t.id}">
                <label for="task-${t.id}" class="available-task-title">${escapeHtml(t.title)}</label>
                <span class="available-task-priority priority-${t.priority || 'medium'}">${t.priority || 'medium'}</span>
            </div>`).join('');
    } catch (error) { console.error('Error:', error); }
}

async function addSelectedTasksToSprint() {
    const selected = document.querySelectorAll('#available-tasks-list input:checked');
    const ids = Array.from(selected).map(cb => cb.value);
    if (!ids.length) { showToast('Select tasks first', 'warning'); return; }
    try {
        const updated = [...(currentSprint.tasks || []), ...ids];
        await db.collection('sprints').doc(currentSprint.id).update({ tasks: updated });
        currentSprint.tasks = updated;
        showToast(`${ids.length} task(s) added`, 'success');
        closeAddToSprintModal();
        await loadSprintTasks(currentSprint);
    } catch (error) { console.error('Error:', error); showToast('Error adding tasks', 'error'); }
}

// Make functions available globally
window.loadSprints = loadSprints;
window.createSprint = createSprint;
window.completeSprint = completeSprint;
window.openSprintModal = openSprintModal;
window.closeSprintModal = closeSprintModal;
window.openAddToSprintModal = openAddToSprintModal;
window.closeAddToSprintModal = closeAddToSprintModal;
window.addSelectedTasksToSprint = addSelectedTasksToSprint;

console.log('✅ dashboard-sprints.js loaded');