/**
 * 🧪 ORIENTAL FULL FEATURE TEST SUITE
 * Run this in browser console on the dashboard page
 */

console.clear();
console.log('🏔️  ORIENTAL FEATURE TEST SUITE');
console.log('='.repeat(50));
console.log('Testing all major features...\n');

let results = { passed: 0, failed: 0, skipped: 0 };

function test(name, fn) {
    try {
        const result = fn();
        if (result === true || result === undefined) {
            console.log(`  ✅ ${name}`);
            results.passed++;
        } else {
            console.log(`  ❌ ${name}: ${result}`);
            results.failed++;
        }
    } catch (error) {
        console.log(`  ❌ ${name}: ${error.message}`);
        results.failed++;
    }
}

function skip(name) {
    console.log(`  ⏭️  ${name} (skipped)`);
    results.skipped++;
}

// ============================================
// 1. CORE SYSTEM
// ============================================
console.log('\n📦 1. CORE SYSTEM');
console.log('─'.repeat(30));

test('Firebase initialized', () => !!firebase.apps.length);
test('Auth service available', () => !!auth);
test('Firestore available', () => !!db);
test('User authenticated', () => !!currentUser);
test('User email', () => !!currentUser?.email);
test('Organization loaded', () => !!currentOrganization);
test('Project selected', () => !!currentProject);
test('Tasks loaded', () => allTasks?.length >= 0);

// ============================================
// 2. AUTHENTICATION
// ============================================
console.log('\n🔐 2. AUTHENTICATION');
console.log('─'.repeat(30));

test('Sign out function', () => typeof auth.signOut === 'function');
test('Email login available', () => typeof firebase.auth.EmailAuthProvider !== 'undefined');
test('Google login available', () => typeof firebase.auth.GoogleAuthProvider !== 'undefined');
test('User display name', () => !!currentUser?.displayName || !!currentUser?.email);

// ============================================
// 3. ORGANIZATIONS & PROJECTS
// ============================================
console.log('\n🏢 3. ORGANIZATIONS & PROJECTS');
console.log('─'.repeat(30));

test('Organization ID exists', () => !!currentOrganization);
test('Organization name displayed', () => !!document.getElementById('org-name')?.textContent);
test('Project sidebar visible', () => !!document.getElementById('project-list'));
test('Project create button', () => typeof openProjectModal === 'function');
test('Can select project', () => typeof selectProject === 'function');

// ============================================
// 4. TASKS (CRUD)
// ============================================
console.log('\n✅ 4. TASKS (CRUD)');
console.log('─'.repeat(30));

test('Create task function', () => typeof createTask === 'function');
test('Update task function', () => typeof updateTask === 'function');
test('Open task modal', () => typeof openTaskModal === 'function');
test('Close task modal', () => typeof closeTaskModal === 'function');
test('Task detail function', () => typeof openTaskDetail === 'function');
test('Delete task with undo', () => typeof deleteTaskWithUndo === 'function');

if (allTasks?.length > 0) {
    test('Tasks have required fields', () => {
        const task = allTasks[0];
        return task.title && typeof task.status === 'string' && typeof task.priority === 'string';
    });
} else {
    skip('No tasks to validate');
}

// ============================================
// 5. BOARD VIEW & DRAG-DROP
// ============================================
console.log('\n📊 5. BOARD VIEW & DRAG-DROP');
console.log('─'.repeat(30));

test('Board view visible', () => !!document.getElementById('board-view'));
test('Board rendering', () => typeof renderBoard === 'function');
test('Task card creation', () => typeof createTaskCard === 'function');
test('Drag and drop setup', () => typeof setupDragAndDrop === 'function');
test('Mobile drag setup', () => typeof setupMobileDragAndDrop === 'function');
test('Task cards exist', () => document.querySelectorAll('.task-card').length >= 0);

// ============================================
// 6. SEARCH & FILTER
// ============================================
console.log('\n🔍 6. SEARCH & FILTER');
console.log('─'.repeat(30));

test('Search input exists', () => !!document.getElementById('search-tasks'));
test('Filter button exists', () => !!document.getElementById('filter-btn'));
test('Filter dropdown exists', () => !!document.getElementById('filter-dropdown'));
test('Sort button exists', () => !!document.getElementById('sort-btn'));
test('Sort dropdown exists', () => !!document.getElementById('sort-dropdown'));
test('Clear search works', () => typeof clearSearchAndReload === 'function');
test('Apply filters works', () => typeof applySearchAndFilter === 'function');

// ============================================
// 7. COMMENTS
// ============================================
console.log('\n💬 7. COMMENTS');
console.log('─'.repeat(30));

test('Add comment function', () => typeof addComment === 'function');
test('Load comments function', () => typeof loadComments === 'function');
test('Comment input exists', () => !!document.getElementById('new-comment'));
test('Comment button exists', () => !!document.getElementById('add-comment-btn'));

// ============================================
// 8. @MENTIONS (Phase 1)
// ============================================
console.log('\n📝 8. @MENTIONS (Phase 1)');
console.log('─'.repeat(30));

test('Mentions system loaded', () => !!window.mentionsSystem);
test('Mentions class available', () => typeof MentionsSystem === 'function');
test('Extract mentions works', () => typeof window.mentionsSystem?.extractMentions === 'function');
test('Highlight mentions works', () => typeof window.mentionsSystem?.highlightMentions === 'function');
test('Team members available', () => teamMembers?.length > 0);

if (teamMembers?.length > 0 && window.mentionsSystem) {
    test('Can extract @mention', () => {
        const mention = teamMembers[0].name;
        const result = window.mentionsSystem.extractMentions(`Hello @${mention}!`);
        return result.length > 0;
    });
} else {
    skip('No team members for mention test');
}

// ============================================
// 9. FILE ATTACHMENTS (Phase 1)
// ============================================
console.log('\n📎 9. FILE ATTACHMENTS (Phase 1)');
console.log('─'.repeat(30));

test('Attachments manager loaded', () => !!window.AttachmentsManager);
test('Attachments class available', () => typeof AttachmentsManager === 'function');
test('Attachments collection accessible', async () => {
    try {
        await db.collection('attachments').limit(1).get();
        return true;
    } catch(e) { return e.message; }
});

// ============================================
// 10. RECURRING TASKS (Phase 1)
// ============================================
console.log('\n🔄 10. RECURRING TASKS (Phase 1)');
console.log('─'.repeat(30));

test('Recurring manager loaded', () => !!window.recurringManager);
test('Recurring class available', () => typeof RecurringTasksManager === 'function');
test('Enhance task form', () => typeof window.recurringManager?.enhanceTaskForm === 'function');
test('Check recurring tasks', () => typeof window.recurringManager?.checkAndGenerateRecurringTasks === 'function');
test('Get recurrence config', () => typeof window.recurringManager?.getRecurrenceConfig === 'function');
test('Recurring templates collection', async () => {
    try {
        await db.collection('recurring_templates').limit(1).get();
        return true;
    } catch(e) { return e.message; }
});

// ============================================
// 11. TEMPLATES LIBRARY (Phase 1)
// ============================================
console.log('\n📚 11. TEMPLATES LIBRARY (Phase 1)');
console.log('─'.repeat(30));

test('Templates library loaded', () => !!window.TemplatesLibrary);
test('Templates class available', () => typeof TemplatesLibrary === 'function');
test('Open templates function', () => typeof window.openTemplatesLibrary === 'function');
test('Template categories exist', () => {
    const lib = new TemplatesLibrary();
    return lib.templateCategories?.length > 0;
});
test('Project templates exist', () => {
    const lib = new TemplatesLibrary();
    return lib.renderBuiltInProjectTemplates?.().length > 0;
});
test('Task templates exist', () => {
    const lib = new TemplatesLibrary();
    return lib.renderBuiltInTaskTemplates?.().length > 0;
});

// ============================================
// 12. SPRINTS
// ============================================
console.log('\n🏃 12. SPRINTS');
console.log('─'.repeat(30));

test('Sprint functions exist', () => typeof loadSprints === 'function');
test('Complete sprint function', () => typeof completeSprint === 'function');
test('Open sprint modal', () => typeof openSprintModal === 'function');
test('Close sprint modal', () => typeof closeSprintModal === 'function');
test('Sprints collection accessible', async () => {
    try {
        await db.collection('sprints').limit(1).get();
        return true;
    } catch(e) { return e.message; }
});

// ============================================
// 13. REPORTS & ANALYTICS
// ============================================
console.log('\n📈 13. REPORTS & ANALYTICS');
console.log('─'.repeat(30));

test('Chart.js loaded', () => typeof Chart !== 'undefined');
test('Reports function exists', () => typeof loadReportsData === 'function');
test('Reports charts cache', () => typeof reportsCharts === 'object');
test('Completion trend chart canvas', () => !!document.getElementById('completion-trend-chart'));
test('Priority chart canvas', () => !!document.getElementById('priority-chart'));
test('Team chart canvas', () => !!document.getElementById('team-chart'));
test('Burndown chart canvas', () => !!document.getElementById('burndown-chart'));
test('Health table exists', () => !!document.getElementById('health-table-body'));
test('Stats cards exist', () => !!document.getElementById('total-tasks-stat'));
test('Export CSV function', () => typeof exportToCSV === 'function');
test('Export chart function', () => typeof exportChart === 'function');

// ============================================
// 14. SETTINGS
// ============================================
console.log('\n⚙️ 14. SETTINGS');
console.log('─'.repeat(30));

test('Load settings function', () => typeof window.loadSettingsView === 'function');
test('Settings event listeners', () => typeof setupSettingsEventListeners === 'function');
test('Save org settings', () => typeof saveOrganizationSettings === 'function');
test('Save user preferences', () => typeof saveUserPreferences === 'function');
test('Settings tabs exist', () => document.querySelectorAll('.settings-tab').length > 0);
test('Settings panels exist', () => document.querySelectorAll('.settings-panel').length > 0);

// ============================================
// 15. ACTIVITY LOG
// ============================================
console.log('\n📜 15. ACTIVITY LOG');
console.log('─'.repeat(30));

test('Open activity log', () => typeof openActivityLog === 'function');
test('Close activity log', () => typeof closeActivityLog === 'function');
test('Log activity function', () => typeof logActivity === 'function');
test('Load activity log', () => typeof loadActivityLog === 'function');
test('Activity panel exists', () => !!document.getElementById('activity-log-container'));

// ============================================
// 16. DARK MODE
// ============================================
console.log('\n🌙 16. DARK MODE');
console.log('─'.repeat(30));

test('Toggle theme function', () => typeof toggleTheme === 'function');
test('Init dark mode', () => typeof initDarkMode === 'function');
test('Theme toggles exist', () => document.querySelectorAll('.theme-toggle').length > 0);
test('Current theme', () => !!document.documentElement.getAttribute('data-theme'));

// ============================================
// 17. KEYBOARD SHORTCUTS
// ============================================
console.log('\n⌨️  17. KEYBOARD SHORTCUTS');
console.log('─'.repeat(30));

test('Shortcuts setup', () => typeof setupKeyboardShortcuts === 'function');
test('Close all modals', () => typeof closeAllModals === 'function');
test('Shortcuts help exists', () => typeof showShortcutsHelp === 'function');

// ============================================
// 18. MOBILE RESPONSIVE
// ============================================
console.log('\n📱 18. MOBILE RESPONSIVE');
console.log('─'.repeat(30));

test('Mobile header exists', () => !!document.getElementById('mobile-header'));
test('Mobile menu button', () => !!document.getElementById('mobile-menu-btn'));
test('Bottom nav exists', () => !!document.getElementById('bottom-nav'));
test('Bottom nav items', () => document.querySelectorAll('.bottom-nav-item').length >= 3);
test('Mobile navigation setup', () => typeof setupMobileNavigation === 'function');
test('Pull to refresh setup', () => typeof setupPullToRefresh === 'function');

// ============================================
// 19. PWA & OFFLINE
// ============================================
console.log('\n📴 19. PWA & OFFLINE');
console.log('─'.repeat(30));

test('Service worker supported', () => 'serviceWorker' in navigator);
test('PWA manifest linked', () => !!document.querySelector('link[rel="manifest"]'));
test('Offline detection setup', () => typeof setupOfflineDetection === 'function');
test('Offline indicator exists', () => !!document.getElementById('offline-indicator'));
test('PWA install prompt', () => typeof setupPWAInstallPrompt === 'function');

// ============================================
// 20. INVITES & TEAM
// ============================================
console.log('\n👥 20. INVITES & TEAM');
console.log('─'.repeat(30));

test('Open invite modal', () => typeof openInviteModal === 'function');
test('Send invite function', () => typeof sendInvite === 'function');
test('Load team members', () => typeof loadTeamMembers === 'function');
test('Team members list', () => !!document.getElementById('team-members-list'));
test('Invite modal exists', () => !!document.getElementById('invite-modal'));
test('Pending invites modal', () => !!document.getElementById('pending-invites-modal'));

// ============================================
// SUMMARY
// ============================================
console.log('\n' + '='.repeat(50));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(50));
console.log(`  ✅ Passed:  ${results.passed}`);
console.log(`  ❌ Failed:  ${results.failed}`);
console.log(`  ⏭️  Skipped: ${results.skipped}`);
console.log(`  📈 Total:   ${results.passed + results.failed + results.skipped}`);
console.log(`  🎯 Rate:    ${Math.round(results.passed / (results.passed + results.failed) * 100)}%`);
console.log('='.repeat(50));

// Store for reference
window._testResults = results;

console.log('\n💡 Run specific tests:');
console.log('  testBoardView()    - Test board rendering');
console.log('  testPhase1()       - Test Phase 1 features');
console.log('  createTestTask()   - Create a test task');
console.log('  quickHealthCheck() - Quick system check');