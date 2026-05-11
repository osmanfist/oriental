/**
 * Oriental - Dashboard Modals
 * Modal event listeners, form submissions
 */

// ============================================
// SETUP ALL MODAL EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Task Form
    // Task Form submission - update this in setupEventListeners
document.getElementById('task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const taskData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        priority: document.getElementById('task-priority').value,
        assignedTo: document.getElementById('task-assignee').value,
        dueDate: document.getElementById('task-due-date').value,
        estimatedHours: document.getElementById('task-estimate').value,
        tags: document.getElementById('task-tags').value
    };
    if (await createTask(taskData)) {
        closeTaskModal();
        document.getElementById('task-form').reset();
        resetCreateMilestones();
    }
});
    
    // Project Form
    document.getElementById('project-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const projectData = {
            name: document.getElementById('project-name').value,
            description: document.getElementById('project-description').value,
            color: document.getElementById('project-color')?.value
        };
        if (await createProject(projectData)) { closeProjectModal(); document.getElementById('project-form').reset(); }
    });
    
    // Save Task Button
    document.getElementById('save-task-btn')?.addEventListener('click', async () => {
        const taskId = document.getElementById('edit-task-id').value;
        if (!taskId) return;
        const taskData = {
            title: document.getElementById('edit-task-title').value,
            description: document.getElementById('edit-task-description').value,
            priority: document.getElementById('edit-task-priority').value,
            assignedTo: document.getElementById('edit-task-assignee').value,
            dueDate: document.getElementById('edit-task-due-date').value,
            estimatedHours: document.getElementById('edit-task-estimate').value,
            tags: document.getElementById('edit-task-tags').value
        };
        if (!taskData.title) { showToast('Please enter a task title', 'warning'); return; }
        if (await updateTask(taskId, taskData)) closeCommentModal();
    });
    
    // Delete Task Button
    document.getElementById('delete-task-btn')?.addEventListener('click', async () => {
        const taskId = document.getElementById('edit-task-id').value;
        const taskTitle = document.getElementById('edit-task-title').value;
        if (taskId) await deleteTaskWithUndo(taskId, { title: taskTitle, projectId: currentProject?.id });
    });
    
    // Add Comment Button
    const addCommentBtn = document.getElementById('add-comment-btn');
    if (addCommentBtn) {
        const newBtn = addCommentBtn.cloneNode(true);
        addCommentBtn.parentNode.replaceChild(newBtn, addCommentBtn);
        newBtn.addEventListener('click', async () => {
            const content = document.getElementById('new-comment').value;
            if (!content?.trim()) { showToast('Please enter a comment', 'warning'); return; }
            if (!currentTaskForComments) { showToast('No task selected', 'error'); return; }
            await addComment(currentTaskForComments, content);
        });
    }
    
    // Sprint Form
    const sprintForm = document.getElementById('sprint-form');
    if (sprintForm) {
        const newForm = sprintForm.cloneNode(true);
        sprintForm.parentNode.replaceChild(newForm, sprintForm);
        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const sprintData = {
                name: document.getElementById('sprint-name')?.value?.trim(),
                goal: document.getElementById('sprint-goal')?.value?.trim() || '',
                startDate: document.getElementById('sprint-start-date')?.value || '',
                endDate: document.getElementById('sprint-end-date')?.value || ''
            };
            if (!sprintData.name) { showToast('Please enter a sprint name', 'warning'); return; }
            if (await createSprint(sprintData)) { closeSprintModal(); newForm.reset(); }
        });
    }
    
    // Invite Form
    document.getElementById('invite-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await sendInvite(document.getElementById('invite-email').value, document.getElementById('invite-role').value);
        closeInviteModal();
    });
    
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await auth.signOut();
        localStorage.removeItem('oriental_user');
        window.location.href = 'login.html';
    });
    
    // Nav Items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            const boardView = document.getElementById('board-view');
            const sprintsView = document.getElementById('sprints-view');
            const reportsView = document.getElementById('reports-view');
            const settingsView = document.getElementById('settings-view');
            const perfCards = document.getElementById('project-performance-charts');
            
            [sprintsView, reportsView, settingsView].forEach(v => v?.classList.add('hidden'));
            if (boardView) boardView.style.display = 'none';
            
            if (view === 'board') {
                boardView.style.display = 'flex';
                currentView = 'board';
                if (perfCards) perfCards.style.display = showAllProjects ? 'grid' : 'none';
                document.getElementById('current-view').textContent = 'Board';
            } else if (view === 'sprints') {
                sprintsView.classList.remove('hidden');
                currentView = 'sprints';
                if (perfCards) perfCards.style.display = 'none';
                document.getElementById('current-view').textContent = 'Sprints';
                loadSprints();
            } else if (view === 'reports') {
                reportsView.classList.remove('hidden');
                currentView = 'reports';
                if (perfCards) perfCards.style.display = 'none';
                document.getElementById('current-view').textContent = 'Reports';
                loadReportsData();
            } else if (view === 'settings') {
                settingsView.classList.remove('hidden');
                currentView = 'settings';
                if (perfCards) perfCards.style.display = 'none';
                document.getElementById('current-view').textContent = 'Settings';
                loadSettingsView();
            }
        });
    });
    
    // Bottom Nav
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            document.querySelectorAll('.bottom-nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
            if (navItem) {
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                navItem.classList.add('active');
            }
            
            const boardView = document.getElementById('board-view');
            const sprintsView = document.getElementById('sprints-view');
            const reportsView = document.getElementById('reports-view');
            const settingsView = document.getElementById('settings-view');
            const perfCards = document.getElementById('project-performance-charts');
            
            [sprintsView, reportsView, settingsView].forEach(v => v?.classList.add('hidden'));
            if (boardView) boardView.style.display = 'none';
            
            if (view === 'board') {
                boardView.style.display = 'flex';
                currentView = 'board';
                if (perfCards) perfCards.style.display = showAllProjects ? 'grid' : 'none';
                document.getElementById('current-view').textContent = 'Board';
            } else if (view === 'sprints') {
                sprintsView.classList.remove('hidden');
                currentView = 'sprints';
                if (perfCards) perfCards.style.display = 'none';
                document.getElementById('current-view').textContent = 'Sprints';
                loadSprints();
            } else if (view === 'reports') {
                reportsView.classList.remove('hidden');
                currentView = 'reports';
                if (perfCards) perfCards.style.display = 'none';
                document.getElementById('current-view').textContent = 'Reports';
                loadReportsData();
            } else if (view === 'settings') {
                settingsView.classList.remove('hidden');
                currentView = 'settings';
                if (perfCards) perfCards.style.display = 'none';
                document.getElementById('current-view').textContent = 'Settings';
                loadSettingsView();
            }
        });
    });
    
    document.getElementById('bottom-add-btn')?.addEventListener('click', () => openTaskModal());
    
    // Invite Modal
    window.openInviteModal = function() {
        document.getElementById('invite-modal').style.display = 'flex';
        document.getElementById('invite-modal').classList.add('active');
    };
    window.closeInviteModal = function() {
        document.getElementById('invite-modal').style.display = 'none';
        document.getElementById('invite-modal').classList.remove('active');
    };
    
    // Reports events
    document.getElementById('export-csv-btn')?.addEventListener('click', exportToCSV);
    document.getElementById('export-pdf-btn')?.addEventListener('click', exportToPDF);
    document.getElementById('report-date-range')?.addEventListener('change', loadReportsData);
    document.getElementById('refresh-reports-btn')?.addEventListener('click', () => { loadReportsData(); showToast('Reports refreshed', 'success'); });
}

window.setupEventListeners = setupEventListeners;
console.log('✅ dashboard-modals.js loaded');