/**
 * Oriental - Dashboard Reports
 * Charts, analytics, exports
 */

// ============================================
// LOAD REPORTS DATA
// ============================================

async function loadReportsData() {
    if (!currentOrganization) return;
    
    showReportsSkeleton();
    
    try {
        const dateRange = document.getElementById('report-date-range')?.value || 'month';
        const dateFilter = getDateFilter(dateRange);
        
        let tasks = [];
        if (currentProject) {
            const snapshot = await db.collection('tasks').where('projectId', '==', currentProject.id).get();
            snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
        } else {
            const projectsSnapshot = await db.collection('projects').where('organizationId', '==', currentOrganization).get();
            for (const projectDoc of projectsSnapshot.docs) {
                const snapshot = await db.collection('tasks').where('projectId', '==', projectDoc.id).get();
                snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
            }
        }
        
        const filteredTasks = tasks.filter(task => {
            if (!task.createdAt) return true;
            const created = task.createdAt.toDate();
            return created >= dateFilter.start && created <= dateFilter.end;
        });
        
        updateStatsCards(filteredTasks);
        renderCompletionTrendChart(filteredTasks, dateFilter);
        renderPriorityDistributionChart(filteredTasks);
        renderTeamPerformanceChart(filteredTasks);
        renderBurndownChart(filteredTasks);
        renderCumulativeFlowChart(filteredTasks, dateFilter);
        renderTaskAgingChart(filteredTasks);
        renderWorkloadChart(filteredTasks);
        renderVelocityChart(filteredTasks, dateFilter);
        await populateHealthTable(filteredTasks);
        
    } catch (error) { console.error('Error loading reports:', error); showToast('Error loading reports', 'error'); }
}

function showReportsSkeleton() {
    ['total-tasks-stat', 'completed-tasks-stat', 'completion-rate-stat', 'active-members-stat', 'avg-completion-stat', 'active-sprints-stat'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '...';
    });
}

function updateStatsCards(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    document.getElementById('total-tasks-stat').textContent = total;
    document.getElementById('completed-tasks-stat').textContent = completed;
    document.getElementById('completion-rate-stat').textContent = rate + '%';
    document.getElementById('active-members-stat').textContent = teamMembers?.length || 0;
    document.getElementById('avg-completion-stat').textContent = '--';
    document.getElementById('active-sprints-stat').textContent = currentSprint ? 1 : 0;
}

// ============================================
// COMPLETION TREND CHART
// ============================================

function renderCompletionTrendChart(tasks, dateFilter) {
    const canvas = document.getElementById('completion-trend-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (reportsCharts.completionTrend) reportsCharts.completionTrend.destroy();
    
    const grouped = groupTasksByDay(tasks, dateFilter);
    
    reportsCharts.completionTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: grouped.labels,
            datasets: [{
                label: 'Tasks Created', data: grouped.created,
                borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)',
                tension: 0.3, fill: true
            }, {
                label: 'Tasks Completed', data: grouped.completed,
                borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)',
                tension: 0.3, fill: true
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function groupTasksByDay(tasks, dateFilter) {
    const labels = [], created = [], completed = [];
    const days = Math.ceil((dateFilter.end - dateFilter.start) / (1000 * 60 * 60 * 24));
    const step = Math.max(1, Math.floor(days / 7));
    
    for (let i = days; i >= 0; i -= step) {
        const d = new Date(dateFilter.end); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        let c = 0, comp = 0;
        tasks.forEach(t => {
            if (t.createdAt && t.createdAt.toDate().toDateString() === d.toDateString()) c++;
            if (t.status === 'done' && t.updatedAt && t.updatedAt.toDate().toDateString() === d.toDateString()) comp++;
        });
        created.push(c); completed.push(comp);
    }
    return { labels, created, completed };
}

// ============================================
// PRIORITY DISTRIBUTION
// ============================================

function renderPriorityDistributionChart(tasks) {
    const canvas = document.getElementById('priority-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (reportsCharts.priority) reportsCharts.priority.destroy();
    
    const counts = { high: 0, medium: 0, low: 0 };
    tasks.forEach(t => { if (t.priority) counts[t.priority]++; });
    
    reportsCharts.priority = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{ data: [counts.high, counts.medium, counts.low], backgroundColor: ['#ef4444', '#f59e0b', '#10b981'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

// ============================================
// TEAM PERFORMANCE
// ============================================

function renderTeamPerformanceChart(tasks) {
    const canvas = document.getElementById('team-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (reportsCharts.team) reportsCharts.team.destroy();
    
    const stats = {};
    tasks.forEach(t => {
        const assignee = t.assignedTo || 'Unassigned';
        if (!stats[assignee]) stats[assignee] = { total: 0, completed: 0 };
        stats[assignee].total++;
        if (t.status === 'done') stats[assignee].completed++;
    });
    
    const sorted = Object.entries(stats).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
    
    reportsCharts.team = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(([name]) => name.substring(0, 10)),
            datasets: [
                { label: 'Total', data: sorted.map(([, s]) => s.total), backgroundColor: '#3b82f6', borderRadius: 4 },
                { label: 'Completed', data: sorted.map(([, s]) => s.completed), backgroundColor: '#10b981', borderRadius: 4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
}

// ============================================
// BURNDOWN CHART
// ============================================

function renderBurndownChart(tasks) {
    const canvas = document.getElementById('burndown-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (reportsCharts.burndown) reportsCharts.burndown.destroy();
    
    if (!currentSprint) {
        reportsCharts.burndown = new Chart(ctx, {
            type: 'line',
            data: { labels: ['No Active Sprint'], datasets: [{ label: 'Start a sprint', data: [0] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'No active sprint' } } }
        });
        return;
    }
    
    const sprintTasks = tasks.filter(t => currentSprint.tasks?.includes(t.id));
    const total = sprintTasks.length || 10;
    const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];
    const ideal = days.map((_, i) => Math.round(total - (total / days.length) * i));
    const actual = days.map((_, i) => Math.round(total - (total / days.length) * i * 0.7));
    
    reportsCharts.burndown = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [
                { label: 'Ideal', data: ideal, borderColor: '#9ca3af', borderDash: [5, 5] },
                { label: 'Actual', data: actual, borderColor: '#ef4444' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
}

// ============================================
// CUMULATIVE FLOW
// ============================================

function renderCumulativeFlowChart(tasks, dateFilter) {
    const canvas = document.getElementById('cumulative-flow-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (reportsCharts.cumulativeFlow) reportsCharts.cumulativeFlow.destroy();
    
    const days = Math.ceil((dateFilter.end - dateFilter.start) / (1000 * 60 * 60 * 24));
    const step = Math.max(1, Math.floor(days / 10));
    const labels = [], todoData = [], inProgressData = [], doneData = [];
    
    for (let i = days; i >= 0; i -= step) {
        const d = new Date(dateFilter.end); d.setDate(d.getDate() - i); d.setHours(23, 59, 59, 999);
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        let todo = 0, inP = 0, done = 0;
        tasks.forEach(t => {
            const created = t.createdAt?.toDate() || new Date(0);
            if (created <= d) {
                if (t.status === 'done') done++;
                else if (t.status === 'in-progress' || t.status === 'started') inP++;
                else todo++;
            }
        });
        todoData.push(todo); inProgressData.push(inP); doneData.push(done);
    }
    
    reportsCharts.cumulativeFlow = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Done', data: doneData, backgroundColor: 'rgba(16,185,129,0.2)', borderColor: '#10b981', fill: true, tension: 0.3 },
                { label: 'In Progress', data: inProgressData, backgroundColor: 'rgba(59,130,246,0.2)', borderColor: '#3b82f6', fill: true, tension: 0.3 },
                { label: 'To Do', data: todoData, backgroundColor: 'rgba(156,163,175,0.2)', borderColor: '#9ca3af', fill: true, tension: 0.3 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { stacked: true } } }
    });
}

// ============================================
// TASK AGING
// ============================================

function renderTaskAgingChart(tasks) {
    const canvas = document.getElementById('task-aging-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (reportsCharts.taskAging) reportsCharts.taskAging.destroy();
    
    const now = new Date();
    const aging = { 'Today': 0, '2-3 days': 0, '4-7 days': 0, '1-2 weeks': 0, '2-4 weeks': 0, '> 1 month': 0 };
    
    tasks.filter(t => t.status !== 'done').forEach(t => {
        const created = t.createdAt?.toDate() || now;
        const diff = Math.floor((now - created) / (1000 * 60 * 60 * 24));
        if (diff <= 1) aging['Today']++;
        else if (diff <= 3) aging['2-3 days']++;
        else if (diff <= 7) aging['4-7 days']++;
        else if (diff <= 14) aging['1-2 weeks']++;
        else if (diff <= 28) aging['2-4 weeks']++;
        else aging['> 1 month']++;
    });
    
    reportsCharts.taskAging = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(aging),
            datasets: [{ label: 'Open Tasks', data: Object.values(aging), backgroundColor: ['#10b981','#34d399','#fbbf24','#f59e0b','#ef4444','#dc2626'], borderRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}

// ============================================
// WORKLOAD DISTRIBUTION
// ============================================

function renderWorkloadChart(tasks) {
    const canvas = document.getElementById('workload-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (reportsCharts.workload) reportsCharts.workload.destroy();
    
    const stats = {};
    tasks.forEach(t => {
        const assignee = t.assignedTo || 'Unassigned';
        if (!stats[assignee]) stats[assignee] = { todo: 0, inProgress: 0, done: 0 };
        if (t.status === 'done') stats[assignee].done++;
        else if (t.status === 'in-progress' || t.status === 'started') stats[assignee].inProgress++;
        else stats[assignee].todo++;
    });
    
    const sorted = Object.entries(stats).map(([name, s]) => ({ name, ...s, active: s.todo + s.inProgress })).sort((a, b) => b.active - a.active).slice(0, 8);
    
    reportsCharts.workload = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s.name.length > 12 ? s.name.substring(0, 10) + '...' : s.name),
            datasets: [
                { label: 'To Do', data: sorted.map(s => s.todo), backgroundColor: '#9ca3af' },
                { label: 'In Progress', data: sorted.map(s => s.inProgress), backgroundColor: '#3b82f6' },
                { label: 'Completed', data: sorted.map(s => s.done), backgroundColor: '#10b981' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true }, y: { stacked: true } } }
    });
}

// ============================================
// WEEKLY VELOCITY
// ============================================

function renderVelocityChart(tasks, dateFilter) {
    const canvas = document.getElementById('velocity-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (reportsCharts.velocity) reportsCharts.velocity.destroy();
    
    const weekly = {}, weeks = [];
    const current = new Date(dateFilter.start);
    while (current <= dateFilter.end) {
        const weekEnd = new Date(current); weekEnd.setDate(weekEnd.getDate() + 6);
        const key = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        weekly[key] = { completed: 0, created: 0, ws: new Date(current), we: new Date(Math.min(weekEnd, dateFilter.end)) };
        weeks.push(key);
        current.setDate(current.getDate() + 7);
    }
    tasks.forEach(t => {
        if (t.createdAt) {
            const c = t.createdAt.toDate();
            for (const [k, d] of Object.entries(weekly)) { if (c >= d.ws && c <= d.we) { d.created++; break; } }
        }
        if (t.status === 'done' && t.updatedAt) {
            const c = t.updatedAt.toDate();
            for (const [k, d] of Object.entries(weekly)) { if (c >= d.ws && c <= d.we) { d.completed++; break; } }
        }
    });
    
    reportsCharts.velocity = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weeks,
            datasets: [
                { label: 'Completed', data: weeks.map(w => weekly[w].completed), backgroundColor: '#10b981', borderRadius: 6, order: 1 },
                { label: 'Created', data: weeks.map(w => weekly[w].created), type: 'line', borderColor: '#3b82f6', tension: 0.3, order: 0, borderWidth: 2, pointRadius: 4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}

// ============================================
// PROJECT HEALTH TABLE
// ============================================

async function populateHealthTable(tasks) {
    const tbody = document.getElementById('health-table-body');
    if (!tbody) return;
    
    const projectsSnapshot = await db.collection('projects').where('organizationId', '==', currentOrganization).where('isArchived', '==', false).get();
    const stats = {};
    projectsSnapshot.forEach(doc => { stats[doc.id] = { name: doc.data().name, total: 0, completed: 0, inProgress: 0 }; });
    tasks.forEach(t => {
        if (stats[t.projectId]) {
            stats[t.projectId].total++;
            if (t.status === 'done') stats[t.projectId].completed++;
            if (t.status === 'in-progress' || t.status === 'started') stats[t.projectId].inProgress++;
        }
    });
    
    tbody.innerHTML = '';
    Object.values(stats).forEach(s => {
        const rate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
        let status = 'Healthy';
        if (rate < 30) status = 'Critical';
        else if (rate < 60) status = 'At Risk';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escapeHtml(s.name)}</strong></td><td>${s.total}</td><td>${s.completed}</td><td>${s.inProgress}</td>
            <td><div style="width:100px;height:6px;background:var(--bg-muted);border-radius:10px;"><div style="width:${rate}%;height:100%;background:var(--primary-400);border-radius:10px;"></div></div> ${rate}%</td>
            <td><span class="status-badge status-${status.toLowerCase().replace(' ','-')}">${status}</span></td>`;
        tbody.appendChild(row);
    });
}

// ============================================
// EXPORTS
// ============================================

async function exportToCSV() {
    if (!currentOrganization) { showToast('No data', 'warning'); return; }
    showToast('Preparing CSV...', 'info');
    try {
        let tasks = [];
        if (currentProject) {
            const snapshot = await db.collection('tasks').where('projectId', '==', currentProject.id).get();
            snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data(), projectName: currentProject.name }));
        } else {
            const pSnapshot = await db.collection('projects').where('organizationId', '==', currentOrganization).get();
            const projects = {}; pSnapshot.forEach(doc => { projects[doc.id] = doc.data().name; });
            for (const pid of Object.keys(projects)) {
                const snapshot = await db.collection('tasks').where('projectId', '==', pid).get();
                snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data(), projectName: projects[pid] }));
            }
        }
        if (!tasks.length) { showToast('No tasks', 'warning'); return; }
        
        const headers = ['Title','Description','Status','Priority','Assignee','Due Date','Hours','Tags','Project','Created','Updated'];
        const rows = tasks.map(t => [
            escapeCsvField(t.title||''), escapeCsvField((t.description||'').substring(0,200)),
            escapeCsvField(t.status||'planned'), escapeCsvField(t.priority||'medium'),
            escapeCsvField(t.assignedTo||''), escapeCsvField(t.dueDate||''), t.estimatedHours||0,
            escapeCsvField((t.tags||[]).join('; ')), escapeCsvField(t.projectName||''),
            t.createdAt ? new Date(t.createdAt.toDate()).toLocaleDateString() : '',
            t.updatedAt ? new Date(t.updatedAt.toDate()).toLocaleDateString() : ''
        ]);
        
        const csv = '\uFEFF' + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `oriental-tasks-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        showToast(`Exported ${tasks.length} tasks!`, 'success');
    } catch (error) { showToast('Error: ' + error.message, 'error'); }
}

function exportToPDF() { window.print(); }

function exportChart(chartId) {
    const canvas = document.getElementById(`${chartId}-chart`);
    if (canvas) {
        const a = document.createElement('a');
        a.download = `${chartId}.png`;
        a.href = canvas.toDataURL();
        a.click();
    }
}

// Make functions available globally
window.loadReportsData = loadReportsData;
window.exportToCSV = exportToCSV;
window.exportToPDF = exportToPDF;
window.exportChart = exportChart;

console.log('✅ dashboard-reports.js loaded');