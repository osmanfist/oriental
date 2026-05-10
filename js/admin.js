/**
 * Oriental v3.0 - Admin Overview with Graphs
 * Shows project performance, task distribution, and stats
 */

class AdminOverview {
    constructor() {
        this.charts = {};
        this.widgets = [
            'projectPerformance',
            'taskDistribution', 
            'teamVelocity',
            'overdueTasks',
            'recentActivity'
        ];
    }

    async update() {
        const container = document.getElementById('admin-view');
        if (!container) return;
        
        container.style.display = 'block';
        await this.render();
    }

    async render() {
        const container = document.getElementById('admin-view');
        if (!container) return;

        container.innerHTML = `
            <div style="padding:24px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                    <h2 style="margin:0;">📊 Project Overview</h2>
                    <button class="btn-secondary" onclick="app.modules.admin.refresh()">🔄 Refresh</button>
                </div>
                
                <!-- Stats Cards -->
                <div id="admin-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px;"></div>
                
                <!-- Charts Row -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:20px;margin-bottom:24px;">
                    <div class="admin-widget">
                        <div class="widget-header">
                            <span class="widget-title">📈 Project Performance</span>
                        </div>
                        <div class="widget-content">
                            <canvas id="chart-project-performance" height="250"></canvas>
                        </div>
                    </div>
                    <div class="admin-widget">
                        <div class="widget-header">
                            <span class="widget-title">🍩 Task Distribution</span>
                        </div>
                        <div class="widget-content">
                            <canvas id="chart-task-distribution" height="250"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Second Row -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:20px;">
                    <div class="admin-widget">
                        <div class="widget-header">
                            <span class="widget-title">⚠️ Overdue Tasks</span>
                        </div>
                        <div class="widget-content" id="overdue-tasks-list" style="max-height:300px;overflow-y:auto;"></div>
                    </div>
                    <div class="admin-widget">
                        <div class="widget-header">
                            <span class="widget-title">📋 Recent Activity</span>
                        </div>
                        <div class="widget-content" id="recent-activity-list" style="max-height:300px;overflow-y:auto;"></div>
                    </div>
                </div>
            </div>
        `;

        await this.loadStats();
        await this.loadProjectPerformanceChart();
        await this.loadTaskDistributionChart();
        await this.loadOverdueTasks();
        await this.loadRecentActivity();
    }

    async loadStats() {
        const container = document.getElementById('admin-stats');
        if (!container) return;

        try {
            const tasks = await localDB.getAll('tasks') || [];
            const projects = await localDB.getAll('projects') || [];
            
            const total = tasks.length;
            const completed = tasks.filter(t => t.status === 'completed').length;
            const inProgress = tasks.filter(t => ['started', 'review'].includes(t.status)).length;
            const stuck = tasks.filter(t => t.status === 'stuck').length;
            const overdue = tasks.filter(t => t.dueDate && getDaysOverdue(t.dueDate) > 0 && t.status !== 'completed').length;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

            const stats = [
                { label: 'Total Tasks', value: total, color: '#7c3aed', bg: '#f3e8ff' },
                { label: 'Completion Rate', value: rate + '%', color: '#22c55e', bg: '#dcfce7' },
                { label: 'In Progress', value: inProgress, color: '#3b82f6', bg: '#dbeafe' },
                { label: 'Overdue', value: overdue, color: '#ef4444', bg: '#fee2e2' },
                { label: 'Stuck', value: stuck, color: '#f59e0b', bg: '#fef3c7' },
                { label: 'Projects', value: projects.length, color: '#06b6d4', bg: '#cffafe' },
            ];

            container.innerHTML = stats.map(s => `
                <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:12px;padding:20px;text-align:center;">
                    <div style="font-size:36px;font-weight:800;color:${s.color};line-height:1;">${s.value}</div>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${s.label}</div>
                </div>
            `).join('');

        } catch (e) {
            console.warn('Error loading stats:', e);
        }
    }

    async loadProjectPerformanceChart() {
        const canvas = document.getElementById('chart-project-performance');
        if (!canvas) return;

        if (this.charts.performance) this.charts.performance.destroy();

        try {
            const projects = await localDB.getAll('projects') || [];
            const tasks = await localDB.getAll('tasks') || [];
            
            const projectStats = projects.map(p => {
                const ptasks = tasks.filter(t => t.projectId === p.id);
                const completed = ptasks.filter(t => t.status === 'completed').length;
                const total = ptasks.length;
                const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                return { name: p.name || 'Unknown', total, completed, rate };
            }).filter(p => p.total > 0).sort((a, b) => b.total - a.total).slice(0, 8);

            if (projectStats.length === 0) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#94a3b8';
                ctx.font = '14px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('No project data yet', canvas.width/2, canvas.height/2);
                return;
            }

            const ctx = canvas.getContext('2d');
            
            this.charts.performance = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: projectStats.map(p => p.name.substring(0, 15)),
                    datasets: [
                        {
                            label: 'Total Tasks',
                            data: projectStats.map(p => p.total),
                            backgroundColor: '#7c3aed',
                            borderRadius: 6
                        },
                        {
                            label: 'Completed',
                            data: projectStats.map(p => p.completed),
                            backgroundColor: '#22c55e',
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });

        } catch (e) {
            console.warn('Error loading performance chart:', e);
        }
    }

    async loadTaskDistributionChart() {
        const canvas = document.getElementById('chart-task-distribution');
        if (!canvas) return;

        if (this.charts.distribution) this.charts.distribution.destroy();

        try {
            const tasks = await localDB.getAll('tasks') || [];
            
            const statusCounts = {
                planned: tasks.filter(t => t.status === 'planned').length,
                started: tasks.filter(t => t.status === 'started').length,
                stuck: tasks.filter(t => t.status === 'stuck').length,
                review: tasks.filter(t => t.status === 'review').length,
                completed: tasks.filter(t => t.status === 'completed').length
            };

            const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
            
            if (total === 0) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#94a3b8';
                ctx.font = '14px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('No tasks yet', canvas.width/2, canvas.height/2);
                return;
            }

            this.charts.distribution = new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: ['Planned', 'Started', 'Stuck', 'Review', 'Completed'],
                    datasets: [{
                        data: [statusCounts.planned, statusCounts.started, statusCounts.stuck, 
                               statusCounts.review, statusCounts.completed],
                        backgroundColor: ['#9ca3af', '#3b82f6', '#ef4444', '#f59e0b', '#22c55e'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });

        } catch (e) {
            console.warn('Error loading distribution chart:', e);
        }
    }

    async loadOverdueTasks() {
        const container = document.getElementById('overdue-tasks-list');
        if (!container) return;

        try {
            const tasks = await localDB.getAll('tasks') || [];
            const overdue = tasks
                .filter(t => t.dueDate && getDaysOverdue(t.dueDate) > 0 && t.status !== 'completed')
                .sort((a, b) => getDaysOverdue(b.dueDate) - getDaysOverdue(a.dueDate));

            if (overdue.length === 0) {
                container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">✅ No overdue tasks!</p>';
                return;
            }

            container.innerHTML = overdue.slice(0, 10).map(t => {
                const days = getDaysOverdue(t.dueDate);
                const severity = days > 7 ? 'critical' : days > 3 ? 'high' : days > 1 ? 'medium' : 'low';
                const colors = { critical: '#7f1d1d', high: '#991b1b', medium: '#9a3412', low: '#92400e' };
                const bgs = { critical: '#fee2e2', high: '#fecaca', medium: '#fed7aa', low: '#fef3c7' };
                
                return `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color);">
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(t.title)}</div>
                            <div style="font-size:11px;color:var(--text-muted);">${escapeHtml(t.assignedTo || 'Unassigned')}</div>
                        </div>
                        <span style="background:${bgs[severity]};color:${colors[severity]};padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600;white-space:nowrap;margin-left:8px;">
                            +${days}d
                        </span>
                    </div>
                `;
            }).join('');
        } catch (e) {
            console.warn('Error loading overdue tasks:', e);
        }
    }

    async loadRecentActivity() {
        const container = document.getElementById('recent-activity-list');
        if (!container) return;

        try {
            const activities = await localDB.getAll('activity') || [];
            const recent = activities
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                .slice(0, 10);

            if (recent.length === 0) {
                container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No recent activity</p>';
                return;
            }

            container.innerHTML = recent.map(a => `
                <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-color);font-size:13px;">
                    <span style="color:#7c3aed;flex-shrink:0;">●</span>
                    <div style="flex:1;">
                        <span style="font-weight:500;">${escapeHtml(a.userName || 'User')}</span>
                        <span style="color:var(--text-secondary);">${escapeHtml(a.action || '')} ${escapeHtml(a.entityName || '')}</span>
                        <div style="font-size:11px;color:var(--text-muted);">${a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</div>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.warn('Error loading activity:', e);
        }
    }

    refresh() {
        Object.values(this.charts).forEach(c => c?.destroy?.());
        this.charts = {};
        this.render();
        showToast('Dashboard refreshed', 'success');
    }

    async updateWidget(widgetName) {
        switch (widgetName) {
            case 'projectPerformance':
                await this.loadProjectPerformanceChart();
                break;
        }
    }
}