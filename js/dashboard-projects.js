/**
 * Oriental - Dashboard Projects
 * Project CRUD, sidebar, All Projects toggle
 */

// ============================================
// PROJECT LOADING
// ============================================

async function loadProjectsOptimized() {
    if (!currentOrganization) return;
    const projectList = document.getElementById('project-list');
    if (!projectList) return;
    
    try {
        const projects = await getCachedProjects();
        projectList.innerHTML = '';
        projects.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
        
        if (projects.length === 0) {
            projectList.innerHTML = `
                <div class="empty-state-small empty-projects">
                    <i class="fas fa-folder-open"></i>
                    <p>No projects yet</p>
                    <button class="btn-primary" style="margin-top: 12px; padding: 8px 16px; font-size: 12px;" onclick="openProjectModal()">
                        <i class="fas fa-plus"></i> Create Project
                    </button>
                </div>`;
            return;
        }
        
        projects.forEach(project => {
            const el = createProjectElement(project);
            projectList.appendChild(el);
            loadTaskCount(project.id, el);
        });
        
        if (!currentProject) {
            showAllProjects = true;
            const toggleBtn = document.getElementById('all-projects-toggle');
            if (toggleBtn) { toggleBtn.classList.add('active'); }
            loadAllProjectsTasks(true);
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        showToast('Error loading projects', 'error');
    }
}

function loadProjects() { return loadProjectsOptimized(); }

function createProjectElement(project) {
    const div = document.createElement('div');
    div.className = `project-item ${currentProject?.id === project.id ? 'active' : ''}`;
    div.setAttribute('data-project-id', project.id);
    div.innerHTML = `
        <div class="project-color" style="background: ${project.color || '#6366f1'}"></div>
        <span class="project-name">${escapeHtml(project.name)}</span>
        <span class="project-count" id="project-count-${project.id}">0</span>
        <button class="delete-project-btn" onclick="event.stopPropagation(); deleteProjectWithUndo('${project.id}', { name: '${escapeHtml(project.name)}', organizationId: '${project.organizationId}', description: '${escapeHtml(project.description || '')}', color: '${project.color}', createdBy: '${project.createdBy}' })">
            <i class="fas fa-trash"></i>
        </button>
    `;
    div.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-project-btn')) selectProject(project);
    });
    return div;
}

async function loadTaskCount(projectId, projectElement) {
    try {
        const snapshot = await db.collection('tasks').where('projectId', '==', projectId).get();
        const countSpan = projectElement.querySelector('.project-count');
        if (countSpan) countSpan.textContent = snapshot.size;
    } catch (error) { console.error('Error loading task count:', error); }
}

async function selectProject(project) {
    currentProject = project;
    showAllProjects = false;
    const toggleBtn = document.getElementById('all-projects-toggle');
    if (toggleBtn) { toggleBtn.classList.remove('active'); }
    
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-project-id') === project.id);
    });
    
    document.querySelector('.dashboard-header h1').textContent = project.name;
    const chartContainer = document.getElementById('project-performance-charts');
    if (chartContainer) chartContainer.style.display = 'none';
    await loadTasks(true);
}

async function createProject(projectData) {
    if (!requirePermission('createProjects')) return false;
    if (!currentOrganization) { await loadUserData(); if (!currentOrganization) { showToast('Please refresh', 'error'); return false; } }
    try {
        const project = {
            organizationId: currentOrganization, name: projectData.name,
            description: projectData.description || '', color: projectData.color || '#16a34a',
            isArchived: false, createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await db.collection('projects').add(project);
        await logActivity('create_project', 'project', docRef.id, projectData.name, {});
        invalidateCache();
        showToast('Project created successfully', 'success');
        await loadProjectsOptimized();
        return true;
    } catch (error) {
        console.error('Error creating project:', error);
        showToast('Error: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// ALL PROJECTS TOGGLE
// ============================================

function setupAllProjectsToggle() {
    const toggleBtn = document.getElementById('all-projects-toggle');
    if (!toggleBtn) return;
    toggleBtn.addEventListener('click', () => {
        showAllProjects = !showAllProjects;
        if (showAllProjects) {
            toggleBtn.classList.add('active');
            loadAllProjectsTasks(true);
        } else {
            toggleBtn.classList.remove('active');
            if (currentProject) loadTasks(true);
        }
    });
}

async function loadAllProjectsTasks(showSkeleton = true) {
    if (!currentOrganization) return;
    if (unsubscribeTasks) unsubscribeTasks();
    
    try {
        const projectsSnapshot = await db.collection('projects')
            .where('organizationId', '==', currentOrganization)
            .where('isArchived', '==', false).get();
        
        const projects = [];
        projectsSnapshot.forEach(doc => projects.push({ id: doc.id, name: doc.data().name, color: doc.data().color }));
        
        if (projects.length === 0) { allTasks = []; renderBoard([]); return; }
        
        allTasks = [];
        for (const project of projects) {
            const tasksSnapshot = await db.collection('tasks').where('projectId', '==', project.id).get();
            tasksSnapshot.forEach(doc => allTasks.push({ id: doc.id, ...doc.data(), projectName: project.name, projectColor: project.color || '#16a34a', projectId: project.id }));
        }
        loadAssigneeFilters();
applySearchAndFilter();
        allTasks.forEach(task => {
    // Ensure every task has a valid status
    if (!task.status || task.status === 'todo') {
        task.status = 'planned';
    }
    // Ensure status is one of the valid columns
    const validStatuses = ['planned', 'started', 'in-progress', 'waiting', 'done'];
    if (!validStatuses.includes(task.status)) {
        task.status = 'planned';
    }
});
        
        document.querySelector('.dashboard-header h1').textContent = `📋 All Projects (${projects.length})`;
        document.querySelectorAll('.project-item').forEach(item => item.classList.remove('active'));
        
        await renderProjectPerformanceCharts();
        loadAssigneeFilters();
        applySearchAndFilter();
        
    } catch (error) { console.error('Error:', error); showToast('Error loading tasks', 'error'); }
}

cacheDataOffline('tasks', allTasks);

// ============================================
// PROJECT PERFORMANCE CHARTS
// ============================================

async function renderProjectPerformanceCharts() {
    const container = document.getElementById('project-performance-charts');
    if (!container) return;
    if (!showAllProjects || !currentOrganization || currentView !== 'board') { container.style.display = 'none'; return; }
    
    container.style.display = 'grid';
    container.innerHTML = '<div class="loading-pulse" style="grid-column:1/-1;text-align:center;padding:20px;">Loading project insights...</div>';
    
    try {
        const projectsSnapshot = await db.collection('projects')
            .where('organizationId', '==', currentOrganization).where('isArchived', '==', false).get();
        const projects = [];
        projectsSnapshot.forEach(doc => projects.push({ id: doc.id, name: doc.data().name, color: doc.data().color || '#16a34a' }));
        if (projects.length === 0) { container.innerHTML = '<div class="empty-state-small" style="grid-column:1/-1;">No projects</div>'; return; }
        
        const projectData = [];
        for (const project of projects) {
            const tasksSnapshot = await db.collection('tasks').where('projectId', '==', project.id).get();
            const tasks = [];
            tasksSnapshot.forEach(doc => tasks.push(doc.data()));
            const total = tasks.length;
            const completed = tasks.filter(t => t.status === 'done').length;
            const inProgress = tasks.filter(t => t.status === 'in-progress' || t.status === 'started').length;
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
            const today = new Date(); today.setHours(0,0,0,0);
            const overdue = tasks.filter(t => { if(!t.dueDate||t.status==='done') return false; const due=new Date(t.dueDate); due.setHours(0,0,0,0); return due < today; }).length;
            projectData.push({ ...project, total, completed, inProgress, completionRate, overdue });
        }
        projectData.sort((a, b) => b.total - a.total);
        
        container.innerHTML = projectData.map(p => {
            const hc = p.completionRate >= 70 ? '#10b981' : (p.completionRate >= 40 ? '#f59e0b' : '#ef4444');
            const hl = p.completionRate >= 70 ? 'Healthy' : (p.completionRate >= 40 ? 'At Risk' : 'Critical');
            return `
            <div class="project-performance-card" onclick="switchToProject('${p.id}')" style="position:relative;">
                <div style="position:absolute;top:0;left:0;width:3px;height:100%;background:${p.color};border-radius:7px 0 0 7px;"></div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-left:4px;">
                    <strong style="font-size:13px;">${escapeHtml(p.name)}</strong>
                    <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${hc}20;color:${hc};">${hl}</span>
                </div>
                <div style="display:flex;gap:8px;font-size:11px;color:var(--text-muted);margin-bottom:8px;padding-left:4px;">
                    <span>📋 ${p.total}</span><span style="color:#10b981;">✅ ${p.completed}</span>
                    ${p.overdue>0?`<span style="color:#ef4444;">⚠️ ${p.overdue}</span>`:''}
                </div>
                <div style="margin-bottom:6px;padding-left:4px;">
                    <div style="height:5px;background:var(--bg-muted);border-radius:10px;overflow:hidden;">
                        <div style="width:${p.completionRate}%;height:100%;background:${hc};border-radius:10px;"></div>
                    </div>
                </div>
                <div style="text-align:right;font-size:11px;color:${hc};padding-right:4px;">${p.completionRate}%</div>
            </div>`;
        }).join('');
    } catch (error) { console.error('Error:', error); container.innerHTML = '<div class="empty-state-small">Error loading charts</div>'; }
}

function switchToProject(projectId) {
    showAllProjects = false;
    document.getElementById('all-projects-toggle')?.classList.remove('active');
    document.querySelector(`.project-item[data-project-id="${projectId}"]`)?.click();
    const cc = document.getElementById('project-performance-charts');
    if (cc) cc.style.display = 'none';
}

// ============================================
// UNDO DELETE - Projects
// ============================================

async function deleteProjectWithUndo(projectId, projectData) {
    if (!requirePermission('deleteProjects')) return;
    deletedItem = { id: projectId, ...projectData, type: 'project' };
    deletedItemType = 'project';
    try {
        const ts = await db.collection('tasks').where('projectId', '==', projectId).get();
        const batch = db.batch();
        const tasks = [];
        for (const td of ts.docs) {
            const cs = await db.collection('comments').where('taskId', '==', td.id).get();
            cs.forEach(cd => batch.delete(cd.ref));
            batch.delete(td.ref);
            tasks.push({ id: td.id, ...td.data() });
        }
        batch.delete(db.collection('projects').doc(projectId));
        await batch.commit();
        deletedItem.tasks = tasks;
        await logActivity('delete_project', 'project', projectId, projectData.name, {});
        showUndoToast(`Project "${projectData.name}" deleted`, undoDelete);
        await loadProjectsOptimized();
        invalidateCache();
    } catch (error) { console.error('Error:', error); showToast('Error', 'error'); }
}

// Make functions available globally
window.loadProjectsOptimized = loadProjectsOptimized;
window.selectProject = selectProject;
window.createProject = createProject;
window.openProjectModal = function() { document.getElementById('project-modal').style.display = 'flex'; document.getElementById('project-modal').classList.add('active'); };
window.closeProjectModal = function() { document.getElementById('project-modal').style.display = 'none'; document.getElementById('project-modal').classList.remove('active'); };
window.deleteProjectWithUndo = deleteProjectWithUndo;
window.switchToProject = switchToProject;
window.loadAllProjectsTasks = loadAllProjectsTasks;

console.log('✅ dashboard-projects.js loaded');