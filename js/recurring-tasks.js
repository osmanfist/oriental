/**
 * Oriental - Recurring Tasks System
 * Version: 1.0.0
 */

class RecurringTasksManager {
    constructor() {
        this.recurrencePatterns = {
            daily: { label: 'Daily', icon: 'fa-calendar-day' },
            weekly: { label: 'Weekly', icon: 'fa-calendar-week' },
            monthly: { label: 'Monthly', icon: 'fa-calendar-alt' }
        };
    }

    // ... existing methods ...

    /**
     * Check and generate recurring tasks on dashboard load
     * This runs client-side instead of requiring a Cloud Function
     */
    async checkAndGenerateRecurringTasks() {
        // Only check once per session
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
                window.showToast?.(`${generated} recurring task(s) generated`, 'info');
            } else {
                console.log('📅 No recurring tasks due today');
            }
            
            // Store last check date
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
            if (!templateDoc.exists) {
                console.warn('Template not found:', templateId);
                return null;
            }

            const template = templateDoc.data();
            const config = template.recurrenceConfig;

            // Check if we should stop
            if (config.endType === 'after' && template.occurrencesCreated >= config.occurrences) {
                console.log('Template reached max occurrences:', templateId);
                return null;
            }
            
            if (config.endType === 'on-date' && config.endDate) {
                const today = new Date().toISOString().split('T')[0];
                if (today > config.endDate) {
                    console.log('Template past end date:', templateId);
                    return null;
                }
            }

            // Create the task
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

            // Calculate next occurrence
            const nextOccurrence = this.calculateNextOccurrence(template.nextOccurrence, config);
            
            // Update template
            await db.collection('recurring_templates').doc(templateId).update({
                nextOccurrence: nextOccurrence,
                occurrencesCreated: (template.occurrencesCreated || 0) + 1,
                lastGenerated: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Generated occurrence ${template.occurrencesCreated + 1} for: ${template.title}`);
            
            // Log activity
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

        if (document.getElementById('recurrence-section')) return;

        const recurrenceSection = document.createElement('div');
        recurrenceSection.id = 'recurrence-section';
        recurrenceSection.style.cssText = 'margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color, #e5e7eb);';
        recurrenceSection.innerHTML = `
            <div style="margin-bottom: 16px;">
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="is-recurring" style="margin-right: 8px; width: 18px; height: 18px; accent-color: var(--primary-600);"> 
                    <span style="font-weight: 500;">🔄 Recurring Task</span>
                </label>
            </div>
            
            <div id="recurrence-options" style="display: none;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500;">Frequency</label>
                        <select id="recurrence-frequency" style="width: 100%; padding: 10px; border: 2px solid var(--border-color, #e5e7eb); border-radius: 8px; background: var(--bg-tertiary, #f3f4f6); color: var(--text-primary);">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500;">Repeat every</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="number" id="recurrence-interval" min="1" value="1" style="width: 80px; padding: 10px; border: 2px solid var(--border-color, #e5e7eb); border-radius: 8px; background: var(--bg-tertiary, #f3f4f6); color: var(--text-primary);">
                            <span id="interval-label">day(s)</span>
                        </div>
                    </div>
                </div>
                
                <div id="recurrence-weekly-options" style="display: none; margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500;">Repeat on</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => `
                            <label style="display: flex; align-items: center; gap: 4px; padding: 6px 12px; background: var(--bg-tertiary, #f3f4f6); border-radius: 20px; cursor: pointer;">
                                <input type="checkbox" value="${i}" ${i === 1 ? 'checked' : ''} style="accent-color: var(--primary-600);"> ${day}
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500;">Start Date</label>
                        <input type="date" id="recurrence-start-date" style="width: 100%; padding: 10px; border: 2px solid var(--border-color, #e5e7eb); border-radius: 8px; background: var(--bg-tertiary, #f3f4f6); color: var(--text-primary);">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500;">End</label>
                        <select id="recurrence-end-type" style="width: 100%; padding: 10px; border: 2px solid var(--border-color, #e5e7eb); border-radius: 8px; background: var(--bg-tertiary, #f3f4f6); color: var(--text-primary);">
                            <option value="never">Never</option>
                            <option value="after">After occurrences</option>
                            <option value="on-date">On date</option>
                        </select>
                    </div>
                </div>
                
                <div id="recurrence-end-after" style="display: none; margin-top: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500;">Number of occurrences</label>
                    <input type="number" id="recurrence-occurrences" min="1" value="10" style="width: 100%; padding: 10px; border: 2px solid var(--border-color, #e5e7eb); border-radius: 8px; background: var(--bg-tertiary, #f3f4f6); color: var(--text-primary);">
                </div>
                
                <div id="recurrence-end-date-container" style="display: none; margin-top: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500;">End Date</label>
                    <input type="date" id="recurrence-end-date" style="width: 100%; padding: 10px; border: 2px solid var(--border-color, #e5e7eb); border-radius: 8px; background: var(--bg-tertiary, #f3f4f6); color: var(--text-primary);">
                </div>
            </div>
        `;

        // Insert before the modal footer
        const modalFooter = taskForm.querySelector('.modal-footer');
        modalBody.insertBefore(recurrenceSection, modalFooter);

        this.attachRecurrenceEventListeners();
        
        // Set default start date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('recurrence-start-date').value = today;
    }

    /**
     * Attach event listeners for recurrence options
     */
    attachRecurrenceEventListeners() {
        const isRecurring = document.getElementById('is-recurring');
        const frequencySelect = document.getElementById('recurrence-frequency');
        const intervalLabel = document.getElementById('interval-label');
        const endTypeSelect = document.getElementById('recurrence-end-type');
        const weeklyOptions = document.getElementById('recurrence-weekly-options');

        if (isRecurring) {
            isRecurring.addEventListener('change', (e) => {
                const options = document.getElementById('recurrence-options');
                options.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        if (frequencySelect) {
            frequencySelect.addEventListener('change', (e) => {
                if (weeklyOptions) {
                    weeklyOptions.style.display = e.target.value === 'weekly' ? 'block' : 'none';
                }
                const labels = { daily: 'day(s)', weekly: 'week(s)', monthly: 'month(s)' };
                if (intervalLabel) {
                    intervalLabel.textContent = labels[e.target.value] || 'day(s)';
                }
            });
        }

        if (endTypeSelect) {
            endTypeSelect.addEventListener('change', (e) => {
                const afterDiv = document.getElementById('recurrence-end-after');
                const dateDiv = document.getElementById('recurrence-end-date-container');
                
                if (afterDiv) afterDiv.style.display = e.target.value === 'after' ? 'block' : 'none';
                if (dateDiv) dateDiv.style.display = e.target.value === 'on-date' ? 'block' : 'none';
            });
        }
    }

    /**
     * Get recurrence configuration from form
     */
    getRecurrenceConfig() {
        const isRecurring = document.getElementById('is-recurring')?.checked;
        if (!isRecurring) return null;

        const frequency = document.getElementById('recurrence-frequency')?.value || 'daily';
        const interval = parseInt(document.getElementById('recurrence-interval')?.value) || 1;
        const startDate = document.getElementById('recurrence-start-date')?.value;
        const endType = document.getElementById('recurrence-end-type')?.value || 'never';

        const config = {
            frequency,
            interval,
            startDate,
            endType
        };

        // Add frequency-specific options
        if (frequency === 'weekly') {
            const weekdays = Array.from(document.querySelectorAll('#recurrence-weekly-options input:checked'))
                .map(cb => parseInt(cb.value));
            config.weekdays = weekdays.length > 0 ? weekdays : [1]; // Default to Monday
        }

        // Add end options
        if (endType === 'after') {
            config.occurrences = parseInt(document.getElementById('recurrence-occurrences')?.value) || 10;
        } else if (endType === 'on-date') {
            config.endDate = document.getElementById('recurrence-end-date')?.value;
        }

        return config;
    }

    /**
     * Calculate next occurrence date
     */
    calculateNextOccurrence(lastDate, config) {
        const date = lastDate ? new Date(lastDate) : new Date(config.startDate || new Date());
        
        switch (config.frequency) {
            case 'daily':
                date.setDate(date.getDate() + config.interval);
                break;
                
            case 'weekly':
                if (config.weekdays && config.weekdays.length > 0) {
                    // Find next weekday in the list
                    let daysAdded = 0;
                    const maxDays = 14; // Prevent infinite loop
                    while (daysAdded < maxDays) {
                        date.setDate(date.getDate() + 1);
                        daysAdded++;
                        if (config.weekdays.includes(date.getDay())) {
                            break;
                        }
                    }
                } else {
                    date.setDate(date.getDate() + (7 * config.interval));
                }
                break;
                
            case 'monthly':
                date.setMonth(date.getMonth() + config.interval);
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
                projectId: taskData.projectId,
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

// Export for global use
window.RecurringTasksManager = RecurringTasksManager;
console.log('✅ Recurring tasks system loaded');