/**
 * Oriental - Recurring Tasks System
 * Version: 1.0.1 - Fixed
 */

class RecurringTasksManager {
    constructor() {
        this.recurrencePatterns = {
            daily: { label: 'Daily', icon: 'fa-calendar-day' },
            weekly: { label: 'Weekly', icon: 'fa-calendar-week' },
            monthly: { label: 'Monthly', icon: 'fa-calendar-alt' }
        };
        console.log('✅ RecurringTasksManager instance created');
    }

    /**
     * Check and generate recurring tasks on dashboard load
     */
    async checkAndGenerateRecurringTasks() {
        const lastCheck = localStorage.getItem('oriental_last_recurring_check');
        const today = new Date().toDateString();
        
        if (lastCheck === today) {
            console.log('📅 Recurring tasks already checked today');
            return 0;
        }
        
        console.log('🔄 Checking for recurring tasks...');
        
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            
            const snapshot = await db.collection('recurring_templates')
                .where('nextOccurrence', '<=', todayStr)
                .get();

            let generated = 0;
            for (const doc of snapshot.docs) {
                const result = await this.generateNextOccurrence(doc.id);
                if (result) generated++;
            }

            if (generated > 0) {
                console.log(`✅ Generated ${generated} recurring tasks`);
                if (window.showToast) {
                    window.showToast(`${generated} recurring task(s) generated`, 'info');
                }
            }
            
            localStorage.setItem('oriental_last_recurring_check', today);
            return generated;
            
        } catch (error) {
            console.error('❌ Error processing recurring tasks:', error);
            return 0;
        }
    }

    /**
     * Generate next occurrence of a recurring task
     */
    async generateNextOccurrence(templateId) {
        try {
            const templateDoc = await db.collection('recurring_templates').doc(templateId).get();
            if (!templateDoc.exists) return null;

            const template = templateDoc.data();
            const config = template.recurrenceConfig;

            if (config.endType === 'after' && template.occurrencesCreated >= config.occurrences) return null;
            if (config.endType === 'on-date' && config.endDate) {
                const today = new Date().toISOString().split('T')[0];
                if (today > config.endDate) return null;
            }

            const taskData = {
                projectId: template.projectId,
                title: template.title,
                description: template.description || '',
                priority: template.priority || 'medium',
                assignedTo: template.assignedTo || null,
                assignedToId: template.assignedToId || null,
                dueDate: template.nextOccurrence,
                estimatedHours: template.estimatedHours || 0,
                tags: template.tags || [],
                status: 'todo',
                createdBy: template.createdBy || window.currentUser?.uid,
                recurringTemplateId: templateId,
                occurrenceNumber: (template.occurrencesCreated || 0) + 1,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('tasks').add(taskData);

            const nextOccurrence = this.calculateNextOccurrence(template.nextOccurrence, config);
            
            await db.collection('recurring_templates').doc(templateId).update({
                nextOccurrence: nextOccurrence,
                occurrencesCreated: (template.occurrencesCreated || 0) + 1,
                lastGenerated: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (window.logActivity) {
                await window.logActivity('create_recurring_task', 'task', templateId, template.title, {
                    occurrence: template.occurrencesCreated + 1
                });
            }

            return nextOccurrence;
            
        } catch (error) {
            console.error('Error generating next occurrence:', error);
            return null;
        }
    }

    /**
     * Enhance task form with recurrence options
     */
    enhanceTaskForm() {
        const taskForm = document.getElementById('task-form');
        if (!taskForm) return;

        const modalBody = taskForm.querySelector('.modal-body');
        if (!modalBody) return;

        // Don't add if already exists
        if (document.getElementById('recurrence-section')) return;

        const recurrenceSection = document.createElement('div');
        recurrenceSection.id = 'recurrence-section';
        recurrenceSection.style.cssText = 'margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color, #e5e7eb);';
        recurrenceSection.innerHTML = `
            <div style="margin-bottom: 16px;">
                <label style="display: flex; align-items: center; cursor: pointer; font-weight: 500; font-size: 14px;">
                    <input type="checkbox" id="is-recurring" style="margin-right: 8px; width: 18px; height: 18px; accent-color: var(--primary-600, #16a34a);"> 
                    🔄 Recurring Task
                </label>
            </div>
            
            <div id="recurrence-options" style="display: none; padding-left: 26px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                    <div>
                        <label style="display: block; margin-bottom: 4px; font-size: 13px; font-weight: 500; color: var(--text-secondary, #4b5563);">Frequency</label>
                        <select id="recurrence-frequency" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; background: var(--bg-card, #fff); color: var(--text-primary, #111); font-size: 14px;">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 4px; font-size: 13px; font-weight: 500; color: var(--text-secondary, #4b5563);">Repeat every</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="number" id="recurrence-interval" min="1" value="1" style="width: 70px; padding: 8px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; background: var(--bg-card, #fff); color: var(--text-primary, #111); font-size: 14px;">
                            <span id="interval-label" style="font-size: 13px; color: var(--text-muted, #6b7280); white-space: nowrap;">day(s)</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Append to modal body (safest approach)
        modalBody.appendChild(recurrenceSection);

        // Attach event listeners
        this.attachRecurrenceEventListeners();
        
        console.log('✅ Recurrence section added to task form');
    }

    /**
     * Attach event listeners for recurrence options
     */
    attachRecurrenceEventListeners() {
        const isRecurring = document.getElementById('is-recurring');
        const frequencySelect = document.getElementById('recurrence-frequency');
        const intervalLabel = document.getElementById('interval-label');

        if (isRecurring) {
            // Remove existing listener first
            const newCheckbox = isRecurring.cloneNode(true);
            isRecurring.parentNode.replaceChild(newCheckbox, isRecurring);
            
            newCheckbox.addEventListener('change', (e) => {
                const options = document.getElementById('recurrence-options');
                if (options) {
                    options.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }

        if (frequencySelect && intervalLabel) {
            const newSelect = frequencySelect.cloneNode(true);
            frequencySelect.parentNode.replaceChild(newSelect, frequencySelect);
            
            newSelect.addEventListener('change', (e) => {
                const labels = { daily: 'day(s)', weekly: 'week(s)', monthly: 'month(s)' };
                intervalLabel.textContent = labels[e.target.value] || 'day(s)';
            });
        }
    }

    /**
     * Get recurrence configuration from form
     */
    getRecurrenceConfig() {
        const isRecurring = document.getElementById('is-recurring')?.checked;
        if (!isRecurring) return null;

        return {
            frequency: document.getElementById('recurrence-frequency')?.value || 'daily',
            interval: parseInt(document.getElementById('recurrence-interval')?.value) || 1,
            startDate: new Date().toISOString().split('T')[0],
            endType: 'never'
        };
    }

    /**
     * Calculate next occurrence date
     */
    calculateNextOccurrence(lastDate, config) {
        const date = lastDate ? new Date(lastDate) : new Date(config.startDate || new Date());
        
        switch (config.frequency) {
            case 'daily':
                date.setDate(date.getDate() + (config.interval || 1));
                break;
            case 'weekly':
                date.setDate(date.getDate() + (7 * (config.interval || 1)));
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + (config.interval || 1));
                break;
            default:
                date.setDate(date.getDate() + 1);
        }
        
        return date.toISOString().split('T')[0];
    }

    /**
     * Create recurring task template
     */
    async createRecurringTaskTemplate(taskData, recurrenceConfig) {
        try {
            const template = {
                projectId: taskData.projectId || window.currentProject?.id,
                title: taskData.title,
                description: taskData.description || '',
                priority: taskData.priority || 'medium',
                assignedTo: taskData.assignedTo || null,
                assignedToId: taskData.assignedToId || null,
                estimatedHours: taskData.estimatedHours || 0,
                tags: taskData.tags || [],
                isRecurring: true,
                recurrenceConfig: recurrenceConfig,
                nextOccurrence: this.calculateNextOccurrence(recurrenceConfig.startDate, recurrenceConfig),
                occurrencesCreated: 0,
                createdBy: window.currentUser?.uid,
                organizationId: window.currentOrganization,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('recurring_templates').add(template);
            console.log('✅ Recurring template created');
            return true;
            
        } catch (error) {
            console.error('Error creating recurring template:', error);
            return false;
        }
    }
}

// ============================================
// AUTO-INITIALIZE
// ============================================

// Create global instance immediately
window.RecurringTasksManager = RecurringTasksManager;

(function() {
    if (typeof RecurringTasksManager !== 'undefined' && !window.recurringManager) {
        window.recurringManager = new RecurringTasksManager();
        console.log('✅ RecurringTasksManager auto-initialized');
    }
})();

console.log('✅ Recurring tasks system loaded');