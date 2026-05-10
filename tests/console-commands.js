/**
 * Oriental v3.0 - Console Testing Commands
 * Simple, robust version that waits for modules
 */

// Wait for modules to be ready
function waitForReady(timeout = 8000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        function check() {
            // Check if critical modules are loaded
            if (window.localDB && window.db && window.app) {
                console.log('%c✅ All modules ready for testing', 'color: #22c55e;');
                resolve(true);
                return;
            }
            
            if (Date.now() - startTime > timeout) {
                console.warn('⚠️ Some modules not loaded after timeout');
                console.log('   localDB:', !!window.localDB);
                console.log('   db:', !!window.db);
                console.log('   app:', !!window.app);
                resolve(false);
                return;
            }
            
            setTimeout(check, 200);
        }
        
        check();
    });
}

// ============================================
// TEST COMMANDS
// ============================================

async function testAll() {
    console.clear();
    console.log('%c🧪 Oriental v3.0 Test Suite', 'font-size: 18px; color: #7c3aed; font-weight: bold;');
    console.log('');
    
    const ready = await waitForReady();
    if (!ready) {
        console.log('%c❌ Cannot run tests - modules not loaded', 'color: #ef4444;');
        console.log('%c💡 Try refreshing the page and waiting a few seconds', 'color: #94a3b8;');
        return;
    }
    
    await testConnection();
    await testDatabase();
    await testProjects();
    await testBoard();
    
    console.log('');
    console.log('%c✅ Tests complete!', 'color: #22c55e; font-weight: bold;');
}

async function testConnection() {
    console.log('%c📡 Connection', 'font-weight: bold;');
    console.log('  Browser Online:', navigator.onLine ? '✅' : '❌');
    console.log('  Firebase DB:', db ? '✅' : '❌');
    console.log('  IndexedDB:', localDB?.db ? '✅' : '❌');
    console.log('  App Ready:', app?.initialized ? '✅' : '❌');
}

async function testDatabase() {
    console.log('%c🗄️ Database', 'font-weight: bold;');
    
    if (!localDB?.db) {
        console.log('  ❌ IndexedDB not ready');
        return;
    }
    
    try {
        // Quick write test
        const id = '__test__' + Date.now();
        await localDB.put('tasks', { id, title: 'Test', status: 'planned' });
        const item = await localDB.get('tasks', id);
        await localDB.delete('tasks', id);
        
        console.log('  Write/Read/Delete:', item ? '✅ Working' : '❌ Failed');
    } catch(e) {
        console.log('  ❌ Error:', e.message);
    }
    
    // Storage info
    try {
        const storage = await localDB.getStorageUsage();
        if (storage) {
            console.log(`  Storage: ${storage.usage}KB / ${storage.quota}KB`);
        }
    } catch(e) {}
}

async function testProjects() {
    console.log('%c📁 Projects', 'font-weight: bold;');
    
    const orgId = app?.state?.currentOrganization;
    if (!orgId) {
        console.log('  ⚠️ No organization');
        return;
    }
    
    try {
        const projects = await localDB.getByIndex('projects', 'organizationId', orgId);
        console.log(`  Count: ${projects.length}`);
        
        if (projects.length > 0) {
            projects.forEach(p => console.log(`    📁 ${p.name}`));
        } else {
            console.log('  💡 No projects yet - create one with: quickCreateProject("My Project")');
        }
        
        if (app?.state?.currentProject) {
            console.log(`  Selected: ${app.state.currentProject.name}`);
        } else if (projects.length > 0) {
            console.log('  ⚠️ No project selected');
        }
    } catch(e) {
        console.log('  ❌ Error:', e.message);
    }
}

async function testBoard() {
    console.log('%c📋 Board', 'font-weight: bold;');
    
    const columns = document.querySelectorAll('.board-column');
    console.log(`  Columns: ${columns.length}`);
    
    if (columns.length === 0) {
        console.log('  💡 Board not rendered - select a project first');
        return;
    }
    
    let totalTasks = 0;
    columns.forEach(col => {
        const state = col.dataset.state;
        const tasks = col.querySelectorAll('.task-card').length;
        console.log(`    ${state}: ${tasks} tasks`);
        totalTasks += tasks;
    });
    
    console.log(`  Total: ${totalTasks} tasks`);
}

async function testOffline() {
    console.log('%c📡 Offline Readiness', 'font-weight: bold;');
    
    // Service Worker
    if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        console.log('  Service Worker:', reg?.active ? '✅ Active' : '⚠️ Not active');
    }
    
    // Local data
    try {
        const tasks = await localDB.getAll('tasks');
        const projects = await localDB.getAll('projects');
        console.log(`  Local Data: ${tasks.length} tasks, ${projects.length} projects`);
        console.log(`  Offline Ready: ${tasks.length > 0 ? '✅ YES' : '⚠️ Need data'}`);
    } catch(e) {
        console.log('  ❌ Error:', e.message);
    }
}

// ============================================
// UTILITY COMMANDS
// ============================================

function showState() {
    console.log('%c📊 App State', 'font-weight: bold; font-size: 14px;');
    console.log('  Version:', app?.version || 'N/A');
    console.log('  Organization:', app?.state?.currentOrganization || 'None');
    console.log('  Project:', app?.state?.currentProject?.name || 'None');
    console.log('  View:', app?.state?.currentView || 'N/A');
    console.log('  Role:', app?.state?.userRole?.role || 'N/A');
    console.log('  Online:', navigator.onLine);
    console.log('  DB Ready:', !!localDB?.db);
    console.log('  Modules:', Object.keys(app?.modules || {}).join(', ') || 'None');
}

async function quickCreateProject(name) {
    name = name || 'Test ' + new Date().toLocaleTimeString();
    
    const orgId = app?.state?.currentOrganization;
    if (!orgId) {
        console.log('❌ No organization');
        return;
    }
    
    try {
        const ref = await db.collection('projects').add({
            name, organizationId: orgId,
            createdBy: auth.currentUser?.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isArchived: false, color: '#7c3aed'
        });
        
        await localDB.put('projects', { id: ref.id, name, organizationId: orgId });
        console.log(`✅ Created: "${name}"`);
        
        // Refresh if function exists
        if (typeof loadProjectsList === 'function') {
            await loadProjectsList();
        }
    } catch(e) {
        console.log('❌', e.message);
    }
}

async function quickCreateTask(title) {
    title = title || 'Task ' + new Date().toLocaleTimeString();
    
    const project = app?.state?.currentProject;
    if (!project) {
        console.log('❌ Select a project first');
        return;
    }
    
    try {
        await db.collection('tasks').add({
            title, status: 'planned', priority: 'medium',
            projectId: project.id,
            organizationId: app.state.currentOrganization,
            createdBy: auth.currentUser?.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isTestData: true
        });
        
        console.log(`✅ Created: "${title}"`);
        app.modules?.board?.render();
    } catch(e) {
        console.log('❌', e.message);
    }
}

async function selectFirstProject() {
    const projects = await localDB.getByIndex('projects', 'organizationId', app.state.currentOrganization);
    if (projects.length === 0) {
        console.log('❌ No projects');
        return;
    }
    
    await app.selectProjectById(projects[0].id);
    console.log(`✅ Selected: ${projects[0].name}`);
}

function help() {
    console.log('%c🧪 Oriental Commands', 'font-size: 16px; color: #7c3aed; font-weight: bold;');
    console.log('');
    console.log('%cTests:', 'font-weight: bold;');
    console.log('  testAll()       - Run all tests');
    console.log('  testConnection()- Connection check');
    console.log('  testDatabase()  - Database check');
    console.log('  testProjects()  - Projects check');
    console.log('  testBoard()     - Board check');
    console.log('  testOffline()   - Offline check');
    console.log('');
    console.log('%cActions:', 'font-weight: bold;');
    console.log('  showState()     - Show app state');
    console.log('  help()          - This menu');
    console.log('  quickCreateProject("Name")');
    console.log('  quickCreateTask("Title")');
    console.log('  selectFirstProject()');
}

// ============================================
// AUTO-INIT
// ============================================

(async function() {
    console.log('%c⏳ Waiting for modules... %c(up to 8 seconds)',
        'color: #f59e0b;', 'color: #94a3b8;');
    
    const ready = await waitForReady(8000);
    
    if (ready) {
        console.log('%c✅ Ready! Type %chelp() %cfor commands',
            'color: #22c55e;', 'color: #7c3aed; font-weight: bold;', 'color: #94a3b8;');
    } else {
        console.log('%c⚠️ Modules not fully loaded', 'color: #f59e0b;');
        console.log('%c💡 Try: Refresh page → Wait 5 seconds → Type help()', 'color: #94a3b8;');
    }
})();