/**
 * Oriental - Templates Library
 * Version: 1.0.0
 */

class TemplatesLibrary {
    constructor() {
        this.templateCategories = [
            { id: 'software', name: 'Software Development', icon: 'fa-code' },
            { id: 'marketing', name: 'Marketing', icon: 'fa-bullhorn' },
            { id: 'design', name: 'Design', icon: 'fa-paint-brush' },
            { id: 'operations', name: 'Operations', icon: 'fa-cogs' }
        ];
    }

    openTemplatesLibrary() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3><i class="fas fa-layer-group"></i> Templates Library</h3>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 2px solid var(--border-color, #e5e7eb);">
                        <button class="templates-tab active" data-tab="project" style="padding: 12px 20px; background: none; border: none; cursor: pointer; color: var(--primary-600); border-bottom: 2px solid var(--primary-600); margin-bottom: -2px;">
                            <i class="fas fa-folder"></i> Project Templates
                        </button>
                        <button class="templates-tab" data-tab="task" style="padding: 12px 20px; background: none; border: none; cursor: pointer; color: var(--text-muted);">
                            <i class="fas fa-tasks"></i> Task Templates
                        </button>
                    </div>
                    
                    <div id="project-templates-panel" class="templates-panel">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                            ${this.renderProjectTemplates()}
                        </div>
                    </div>
                    
                    <div id="task-templates-panel" class="templates-panel" style="display: none;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                            ${this.renderTaskTemplates()}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Tab switching
        modal.querySelectorAll('.templates-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                modal.querySelectorAll('.templates-tab').forEach(t => {
                    t.style.color = 'var(--text-muted)';
                    t.style.borderBottom = 'none';
                });
                tab.style.color = 'var(--primary-600)';
                tab.style.borderBottom = '2px solid var(--primary-600)';
                
                const panelId = tab.dataset.tab + '-templates-panel';
                modal.querySelectorAll('.templates-panel').forEach(p => p.style.display = 'none');
                document.getElementById(panelId).style.display = 'block';
            });
        });

        console.log('✅ Templates library opened');
    }

    renderProjectTemplates() {
        const templates = [
            { id: 'agile', name: 'Agile Development', desc: 'Sprints, backlog, and releases', tasks: 5, icon: 'fa-rocket' },
            { id: 'marketing', name: 'Marketing Campaign', desc: 'Plan and execute campaigns', tasks: 6, icon: 'fa-bullhorn' },
            { id: 'design', name: 'Design Sprint', desc: '5-day design process', tasks: 5, icon: 'fa-paint-brush' },
            { id: 'hiring', name: 'Hiring Process', desc: 'Standardize hiring workflow', tasks: 7, icon: 'fa-user-plus' }
        ];

        return templates.map(t => `
            <div style="border: 1px solid var(--border-color); border-radius: 12px; padding: 20px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <i class="fas ${t.icon}" style="color: var(--primary-600);"></i>
                    <span style="font-size: 12px; color: var(--text-muted);">Project</span>
                </div>
                <h4 style="margin-bottom: 8px;">${t.name}</h4>
                <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;">${t.desc}</p>
                <div style="margin-bottom: 16px;">
                    <span style="font-size: 12px; color: var(--text-muted);">
                        <i class="fas fa-tasks"></i> ${t.tasks} initial tasks
                    </span>
                </div>
                <button class="btn-primary" style="width: 100%;" onclick="window.useProjectTemplate('${t.id}')">
                    Use Template
                </button>
            </div>
        `).join('');
    }

    renderTaskTemplates() {
        const templates = [
            { id: 'bug', name: 'Bug Report', desc: 'Standard bug reporting template', icon: 'fa-bug' },
            { id: 'feature', name: 'Feature Request', desc: 'Feature specification template', icon: 'fa-star' },
            { id: 'meeting', name: 'Meeting Notes', desc: 'Meeting minutes template', icon: 'fa-clipboard' },
            { id: 'weekly', name: 'Weekly Report', desc: 'Weekly status update', icon: 'fa-calendar-check' }
        ];

        return templates.map(t => `
            <div style="border: 1px solid var(--border-color); border-radius: 12px; padding: 20px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <i class="fas ${t.icon}" style="color: var(--primary-600);"></i>
                    <span style="font-size: 12px; color: var(--text-muted);">Task</span>
                </div>
                <h4 style="margin-bottom: 8px;">${t.name}</h4>
                <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;">${t.desc}</p>
                <button class="btn-primary" style="width: 100%;" onclick="window.useTaskTemplate('${t.id}')">
                    Create Task
                </button>
            </div>
        `).join('');
    }
}

// Template usage functions
window.useProjectTemplate = async function(templateId) {
    if (!window.currentOrganization) {
        window.showToast?.('No organization found', 'error');
        return;
    }

    const templates = {
        agile: { name: 'Agile Project', tasks: ['Setup repo', 'Create backlog', 'Sprint planning', 'Daily standup', 'Sprint review'] },
        marketing: { name: 'Marketing Campaign', tasks: ['Define audience', 'Content calendar', 'Design assets', 'Launch', 'Track metrics'] },
        design: { name: 'Design Sprint', tasks: ['Understand', 'Sketch', 'Decide', 'Prototype', 'Validate'] },
        hiring: { name: 'Hiring', tasks: ['Job description', 'Post job', 'Screen resumes', 'Interview', 'Assessment', 'Offer', 'Onboarding'] }
    };

    const template = templates[templateId];
    if (!template) return;

    try {
        const projectRef = await db.collection('projects').add({
            name: template.name,
            organizationId: window.currentOrganization,
            createdBy: window.currentUser?.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isArchived: false,
            color: '#16a34a'
        });

        for (const taskTitle of template.tasks) {
            await db.collection('tasks').add({
                projectId: projectRef.id,
                title: taskTitle,
                status: 'todo',
                priority: 'medium',
                createdBy: window.currentUser?.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        window.showToast?.(`Project "${template.name}" created!`, 'success');
        document.querySelector('.modal')?.remove();
        window.loadProjectsOptimized?.();
        
    } catch (error) {
        console.error('Error creating project:', error);
        window.showToast?.('Error creating project', 'error');
    }
};

window.useTaskTemplate = function(templateId) {
    if (!window.currentProject) {
        window.showToast?.('Select a project first', 'warning');
        return;
    }

    const templates = {
        bug: { title: '[Bug] ', description: '**Steps:**\n1. \n2. \n\n**Expected:**\n\n**Actual:**' },
        feature: { title: '[Feature] ', description: '**As a** user\n**I want** \n**So that** ' },
        meeting: { title: 'Meeting: ', description: '**Attendees:**\n\n**Notes:**\n\n**Action Items:**\n- [ ] ' },
        weekly: { title: 'Weekly Report - ', description: '**Done:**\n- \n\n**Next:**\n- \n\n**Blockers:**\n- ' }
    };

    const template = templates[templateId];
    if (!template) return;

    window.openTaskModal?.();
    
    setTimeout(() => {
        document.getElementById('task-title').value = template.title;
        document.getElementById('task-description').value = template.description;
    }, 100);
    
    document.querySelector('.modal')?.remove();
};

window.TemplatesLibrary = TemplatesLibrary;
console.log('✅ Templates library loaded');