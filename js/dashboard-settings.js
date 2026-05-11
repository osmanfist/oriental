/**
 * Oriental - Dashboard Settings
 * Organization, preferences, integrations, danger zone
 */

// ============================================
// LOAD SETTINGS
// ============================================

async function loadSettingsView() {
    if (!currentOrganization) { showToast('Loading settings...', 'info'); return; }
    applyPermissionUI();
        // Hide certain sections for non-admins
    const perms = getUserPermissions()
    const dangerPanel = document.getElementById('panel-danger');
    if (dangerPanel) {
        const dangerItems = dangerPanel.querySelectorAll('.danger-item, .danger-item-warning, .danger-item-critical');
        dangerItems.forEach(item => {
            if (item.classList.contains('danger-item-critical') && !perms.deleteProjects) {
                item.style.display = 'none';
            }
        });
    }
    
    // Team management visibility
    const teamTab = document.querySelector('.settings-tab[data-tab="team"]');
    if (teamTab) {
        teamTab.style.display = perms.manageTeam ? 'flex' : 'none';
    }
    try {
        const orgDoc = await db.collection('organizations').doc(currentOrganization).get();
        if (orgDoc.exists) {
            const d = orgDoc.data();
            document.getElementById('org-name-input').value = d.name || '';
            document.getElementById('org-slug-input').value = d.slug || '';
            document.getElementById('slug-preview').textContent = d.slug || 'your-org';
        }
        document.getElementById('theme-select').value = localStorage.getItem('oriental_theme') || 'system';
    } catch (error) { console.error('Error:', error); showToast('Error loading settings', 'error'); }
}

async function saveOrganizationSettings() {
    const n = document.getElementById('org-name-input').value.trim();
    if (!n) { showToast('Name required', 'warning'); return; }
    try {
        await db.collection('organizations').doc(currentOrganization).update({
            name: n, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('org-name').textContent = n;
        showToast('Settings saved', 'success');
    } catch (error) { showToast('Error saving', 'error'); }
}

async function saveUserPreferences() {
    try {
        const prefs = {
            notifyTaskAssigned: document.getElementById('notify-task-assigned')?.checked ?? true,
            notifyTaskCompleted: document.getElementById('notify-task-completed')?.checked ?? true,
            notifyCommentMention: document.getElementById('notify-comment-mention')?.checked ?? true,
            digestFrequency: document.getElementById('digest-frequency')?.value || 'never',
            theme: document.getElementById('theme-select')?.value || 'system',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('users').doc(currentUser.uid).update({ preferences: prefs });
        const isDark = prefs.theme === 'dark' || (prefs.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        showToast('Preferences saved', 'success');
    } catch (error) { console.error('Error:', error); }
}

async function leaveOrganization() {
    const c = await showConfirmDialog('Leave Organization', 'Are you sure? You will lose access.', 'danger');
    if (!c) return;
    try {
        await db.collection('organizations').doc(currentOrganization).update({ members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
        await db.collection('users').doc(currentUser.uid).update({ organizations: firebase.firestore.FieldValue.arrayRemove(currentOrganization), currentOrganization: null });
        showToast('You have left', 'success');
        setTimeout(() => { auth.signOut(); window.location.href = 'login.html'; }, 1500);
    } catch (error) { showToast('Error', 'error'); }
}

async function deleteOrganization() {
    const c = await showConfirmDialog('Delete Organization', 'This is IRREVERSIBLE. Continue?', 'danger');
    if (!c) return;
    const confirm = prompt('Type DELETE to confirm:');
    if (confirm !== 'DELETE') { showToast('Cancelled', 'info'); return; }
    try {
        showToast('Deleting...', 'info');
        const ps = await db.collection('projects').where('organizationId', '==', currentOrganization).get();
        for (const pd of ps.docs) {
            const ts = await db.collection('tasks').where('projectId', '==', pd.id).get();
            for (const td of ts.docs) {
                const cs = await db.collection('comments').where('taskId', '==', td.id).get();
                cs.forEach(cd => cd.ref.delete());
                await td.ref.delete();
            }
            await pd.ref.delete();
        }
        await db.collection('organizations').doc(currentOrganization).delete();
        showToast('Deleted', 'success');
        setTimeout(() => { auth.signOut(); window.location.href = 'login.html'; }, 1500);
    } catch (error) { showToast('Error: ' + error.message, 'error'); }
}

async function exportAllData() {
    showToast('Preparing export...', 'info');
    try {
        const data = { exportedAt: new Date().toISOString(), projects: [], tasks: [] };
        const ps = await db.collection('projects').where('organizationId', '==', currentOrganization).get();
        for (const pd of ps.docs) {
            data.projects.push({ id: pd.id, ...pd.data() });
            const ts = await db.collection('tasks').where('projectId', '==', pd.id).get();
            ts.forEach(td => data.tasks.push({ id: td.id, ...td.data() }));
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `oriental-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        showToast('Exported!', 'success');
    } catch (error) { showToast('Error exporting', 'error'); }
}

function setupSettingsEventListeners() {
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`panel-${tabId}`).classList.add('active');
            currentSettingsTab = tabId;
        });
    });
    
    document.getElementById('save-org-settings')?.addEventListener('click', saveOrganizationSettings);
    
    ['theme-select','density-select','show-task-counts','default-view-select','default-priority-select',
     'auto-assign-tasks','notify-task-assigned','notify-task-completed','notify-comment-mention',
     'notify-project-updates','notify-sprint-updates','digest-frequency','digest-time'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', saveUserPreferences);
    });
    
    document.getElementById('org-slug-input')?.addEventListener('input', (e) => {
        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
        document.getElementById('slug-preview').textContent = slug || 'your-org';
    });
    
    document.getElementById('leave-organization')?.addEventListener('click', leaveOrganization);
    document.getElementById('delete-organization')?.addEventListener('click', deleteOrganization);
    document.getElementById('export-all-data')?.addEventListener('click', exportAllData);
}

// Make functions available globally
window.loadSettingsView = loadSettingsView;
window.setupSettingsEventListeners = setupSettingsEventListeners;
window.saveOrganizationSettings = saveOrganizationSettings;
window.saveUserPreferences = saveUserPreferences;
window.leaveOrganization = leaveOrganization;
window.deleteOrganization = deleteOrganization;
window.exportAllData = exportAllData;

console.log('✅ dashboard-settings.js loaded');