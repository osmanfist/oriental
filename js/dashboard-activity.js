/**
 * Oriental - Dashboard Activity
 * Activity log panel
 */

// ============================================
// ACTIVITY LOG
// ============================================

function openActivityLog() {
    const panel = document.getElementById('activity-log-container');
    const overlay = document.getElementById('activity-log-overlay');
    if (panel) { panel.classList.add('open'); isActivityLogOpen = true; }
    if (overlay) overlay.classList.add('active');
    loadActivityLog();
}

function closeActivityLog() {
    const panel = document.getElementById('activity-log-container');
    const overlay = document.getElementById('activity-log-overlay');
    if (panel) { panel.classList.remove('open'); isActivityLogOpen = false; }
    if (overlay) overlay.classList.remove('active');
}

async function loadActivityLog() {
    if (!currentOrganization) return;
    try {
        const snapshot = await db.collection('activity_logs')
            .where('organizationId', '==', currentOrganization)
            .orderBy('createdAt', 'desc').limit(50).get();
        const container = document.getElementById('activity-log-list');
        if (!container) return;
        if (snapshot.empty) { container.innerHTML = '<div class="empty-state-small">No activity yet</div>'; return; }
        
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const activity = doc.data();
            const el = document.createElement('div');
            el.className = 'activity-item';
            
            let icon = 'fa-info-circle', iconClass = 'update';
            if (activity.action.includes('create')) { icon = 'fa-plus'; iconClass = 'create'; }
            else if (activity.action.includes('delete')) { icon = 'fa-trash'; iconClass = 'delete'; }
            else if (activity.action.includes('assign')) { icon = 'fa-user-check'; iconClass = 'assign'; }
            else if (activity.action.includes('comment')) { icon = 'fa-comment'; iconClass = 'comment'; }
            else if (activity.action.includes('complete')) { icon = 'fa-check-circle'; iconClass = 'create'; }
            
            const time = activity.createdAt?.toDate() ? new Date(activity.createdAt.toDate()).toLocaleString() : 'Just now';
            el.innerHTML = `
                <div class="activity-icon ${iconClass}"><i class="fas ${icon}"></i></div>
                <div class="activity-content">
                    <div class="activity-title">${escapeHtml(activity.userName)}</div>
                    <div class="activity-description">${escapeHtml(activity.action.replace(/_/g, ' ') + ' ' + activity.entityName)}</div>
                    <div class="activity-time">${escapeHtml(time)}</div>
                </div>`;
            container.appendChild(el);
        });
    } catch (error) { console.error('Error loading activity log:', error); }
}

document.getElementById('activity-log-btn')?.addEventListener('click', openActivityLog);
document.getElementById('mobile-activity-log-btn')?.addEventListener('click', openActivityLog);
document.getElementById('close-activity-log')?.addEventListener('click', closeActivityLog);
document.getElementById('activity-log-overlay')?.addEventListener('click', closeActivityLog);

window.openActivityLog = openActivityLog;
window.closeActivityLog = closeActivityLog;
window.loadActivityLog = loadActivityLog;

console.log('✅ dashboard-activity.js loaded');