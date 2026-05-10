/**
 * Oriental v3.0 - Console Testing Commands
 * Copy and paste these into the browser console for quick testing
 */

// ============================================
// QUICK TEST SUITE
// ============================================

// Run all tests
async function testAll() {
    console.clear();
    console.log('🧪 %cOriental v3.0 Console Test Suite', 'font-size: 20px; color: #7c3aed;');
    console.log('═══════════════════════════════════════\n');
    
    await testConnection();
    await testAuth();
    await testDatabase();
    await testProjects();
    await testTasks();
    await testBoard();
    await testOffline();
    await testPerformance();
    
    console.log('\n═══════════════════════════════════════');
    console.log('✅ %cTest suite complete!', 'color: #22c55e; font-weight: bold;');
}

// ============================================
// 1. CONNECTION TEST
// ============================================

async function testConnection() {
    console.group('📡 Connection Test');
    
    // Check online status
    console.log('Online:', navigator.onLine ? '✅' : '❌');
    
    // Check Firebase
    try {
        const testDoc = await db.collection('_test').doc('connection').get();
        console.log('Firebase:', '✅ Connected');
    } catch(e) {
        console.log('Firebase:', '❌', e.message);
    }
    
    // Check IndexedDB
    try {
        await localDB.init();
        console.log('IndexedDB:', localDB.db ? '✅ Ready' : '❌ Failed');
    } catch(e) {
        console.log('IndexedDB:', '❌', e.message);
    }
    
    // Network info
    const net = networkManager.getStatus();
    console.log('Network Quality:', net.quality);
    console.log('Connection Type:', net.effectiveType);
    console.log('Save Data Mode:', net.saveData);
    
    console.groupEnd();
}

// ============================================
// 2. AUTH TEST
// ============================================

async function testAuth() {
    console.group('🔐 Authentication Test');
    
    const user = authManager?.getCurrentUser() || auth?.currentUser;
    
    if (user) {
        console.log('✅ Logged in as:', user.email);
        console.log('   UID:', user.uid);
        console.log('   Display Name:', user.displayName || 'Not set');
        console.log('   Auth Method:', offlineAuth?.getAuthMethod?.() || 'firebase');
        
        // Check user document
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                console.log('   Organization ID:', data.currentOrganization || 'None');
                console.log('   Organizations:', data.organizations?.length || 0);
                console.log('   Preferences:', data.preferences ? 'Set' : 'Not set');
            } else {
                console.log('   ⚠️ User document not found in Firestore');
            }
        } catch(e) {
            console.log('   ⚠️ Could not fetch user document:', e.message);
        }
        
        // Check local cached user
        const cached = await localDB.get('userData', 'currentUser');
        console.log('   Cached Locally:', cached ? '✅ Yes' : '❌ No');
        
    } else {
        console.log('❌ Not logged in');
    }
    
    console.groupEnd();
}

// ============================================
// 3. DATABASE TEST
// ============================================

async function testDatabase() {
    console.group('🗄️ Database Test');
    
    const startTime = performance.now();
    
    // Test write
    try {
        await localDB.put('tasks', {
            id: '__test__',
            title: 'Console test task',
            status: 'planned',
            createdAt: Date.now()
        });
        console.log('Write:', '✅ Pass');
    } catch(e) {
        console.log('Write:', '❌', e.message);
    }
    
    // Test read
    try {
        const item = await localDB.get('tasks', '__test__');
        if (item && item.title === 'Console test task') {
            console.log('Read:', '✅ Pass');
        } else {
            console.log('Read:', '❌ Data mismatch');
        }
    } catch(e) {
        console.log('Read:', '❌', e.message);
    }
    
    // Test delete
    try {
        await localDB.delete('tasks', '__test__');
        const deleted = await localDB.get('tasks', '__test__');
        if (!deleted) {
            console.log('Delete:', '✅ Pass');
        } else {
            console.log('Delete:', '❌ Item still exists');
        }
    } catch(e) {
        console.log('Delete:', '❌', e.message);
    }
    
    // Storage stats
    const storage = await localDB.getStorageUsage();
    if (storage) {
        console.log(`Storage: ${storage.usage}KB / ${storage.quota}KB (${storage.percentage}%)`);
    }
    
    const duration = (performance.now() - startTime).toFixed(1);
    console.log(`⏱️ DB operations: ${duration}ms`);
    
    console.groupEnd();
}

// ============================================
// 4. PROJECTS TEST
// ============================================

async function testProjects() {
    console.group('📁 Projects Test');
    
    const orgId = app?.state?.currentOrganization;
    if (!orgId) {
        console.log('❌ No organization selected');
        console.groupEnd();
        return;
    }
    
    // Local projects
    const localProjects = await localDB.getByIndex('projects', 'organizationId', orgId);
    console.log(`Local projects: ${localProjects.length}`);
    localProjects.forEach(p => console.log(`   📁 ${p.name} (${p.id})`));
    
    // Firestore projects (if online)
    if (navigator.onLine) {
        try {
            const snapshot = await db.collection('projects')
                .where('organizationId', '==', orgId)
                .get();
            console.log(`Firestore projects: ${snapshot.size}`);
            snapshot.forEach(doc => {
                console.log(`   📁 ${doc.data().name} (${doc.id})`);
            });
        } catch(e) {
            console.log('Firestore:', '❌', e.message);
        }
    }
    
    // Current project
    if (app?.state?.currentProject) {
        console.log('Current project:', app.state.currentProject.name);
    } else {
        console.log('⚠️ No project selected');
    }
    
    console.groupEnd();
}

// ============================================
// 5. TASKS TEST
// ============================================

async function testTasks() {
    console.group('📝 Tasks Test');
    
    const project = app?.state?.currentProject;
    if (!project) {
        console.log('❌ No project selected - cannot test tasks');
        console.groupEnd();
        return;
    }
    
    // Create a test task
    try {
        const taskRef = await db.collection('tasks').add({
            title: '__Test Task from Console__',
            description: 'Created via console test command',
            status: 'planned',
            priority: 'medium',
            projectId: project.id,
            organizationId: app.state.currentOrganization,
            createdBy: auth.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            isTestData: true
        });
        
        console.log('✅ Created test task:', taskRef.id);
        
        // Save locally
        await localDB.put('tasks', {
            id: taskRef.id,
            title: '__Test Task from Console__',
            status: 'planned',
            priority: 'medium',
            projectId: project.id,
            organizationId: app.state.currentOrganization
        });
        
        // Count tasks
        const localTasks = await localDB.getByIndex('tasks', 'projectId', project.id);
        console.log(`   Tasks in project: ${localTasks.length}`);
        
        // Cleanup
        await taskRef.delete();
        await localDB.delete('tasks', taskRef.id);
        console.log('🗑️ Test task cleaned up');
        
    } catch(e) {
        console.log('❌ Task test failed:', e.message);
    }
    
    console.groupEnd();
}

// ============================================
// 6. BOARD TEST
// ============================================

async function testBoard() {
    console.group('📋 Board Test');
    
    // Check if board module exists
    if (!app?.modules?.board) {
        console.log('❌ Board module not initialized');
        console.groupEnd();
        return;
    }
    
    // Check board state
    const board = app.modules.board;
    console.log('Tasks loaded:', board.tasks?.length || 0);
    console.log('Collapsed columns:', board.collapsedColumns?.size || 0);
    
    // Check board DOM
    const columns = document.querySelectorAll('.board-column');
    console.log('Board columns rendered:', columns.length);
    
    columns.forEach(col => {
        const state = col.dataset.state;
        const taskCount = col.querySelectorAll('.task-card').length;
        const collapsed = col.querySelector('.tasks-container')?.classList.contains('collapsed');
        console.log(`   ${state}: ${taskCount} tasks ${collapsed ? '(collapsed)' : ''}`);
    });
    
    console.groupEnd();
}

// ============================================
// 7. OFFLINE TEST
// ============================================

async function testOffline() {
    console.group('📡 Offline Capability Test');
    
    // Service Worker
    if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        console.log('Service Worker:', reg ? '✅ Registered' : '❌ Not registered');
        if (reg?.active) {
            console.log('   State:', reg.active.state);
            console.log('   Scope:', reg.scope);
        }
    } else {
        console.log('Service Worker:', '❌ Not supported');
    }
    
    // Cache API
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('Cache API:', '✅ Available');
        console.log('   Caches:', cacheNames.length);
        cacheNames.forEach(name => {
            console.log(`   📦 ${name}`);
        });
    }
    
    // Local data count
    const taskCount = (await localDB.getAll('tasks')).length;
    const projectCount = (await localDB.getAll('projects')).length;
    const memberCount = (await localDB.getAll('members')).length;
    
    console.log('\nLocal Data:');
    console.log(`   Tasks: ${taskCount}`);
    console.log(`   Projects: ${projectCount}`);
    console.log(`   Members: ${memberCount}`);
    
    // Can work offline?
    const canWorkOffline = localDB.db && taskCount > 0;
    console.log(`\nCan work offline: ${canWorkOffline ? '✅ YES' : '❌ NO (need cached data)'}`);
    
    console.groupEnd();
}

// ============================================
// 8. PERFORMANCE TEST
// ============================================

async function testPerformance() {
    console.group('⚡ Performance Test');
    
    // Page load metrics
    const perfData = performance.getEntriesByType('navigation')[0];
    if (perfData) {
        const metrics = {
            'DNS Lookup': perfData.domainLookupEnd - perfData.domainLookupStart,
            'Connection': perfData.connectEnd - perfData.connectStart,
            'First Byte': perfData.responseStart - perfData.requestStart,
            'DOM Ready': perfData.domContentLoadedEventEnd - perfData.fetchStart,
            'Page Load': perfData.loadEventEnd - perfData.fetchStart
        };
        
        console.table(metrics);
    }
    
    // Memory
    if (performance.memory) {
        const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        const total = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
        console.log(`Memory: ${used}MB / ${total}MB`);
    }
    
    // DB speed test
    const writeStart = performance.now();
    for (let i = 0; i < 100; i++) {
        await localDB.put('tasks', { id: `__perf_${i}__`, value: i });
    }
    const writeTime = performance.now() - writeStart;
    
    const readStart = performance.now();
    for (let i = 0; i < 100; i++) {
        await localDB.get('tasks', `__perf_${i}__`);
    }
    const readTime = performance.now() - readStart;
    
    // Cleanup
    for (let i = 0; i < 100; i++) {
        await localDB.delete('tasks', `__perf_${i}__`);
    }
    
    console.log(`\nDB Write (100 items): ${writeTime.toFixed(1)}ms (${(writeTime/100).toFixed(2)}ms avg)`);
    console.log(`DB Read (100 items): ${readTime.toFixed(1)}ms (${(readTime/100).toFixed(2)}ms avg)`);
    
    console.groupEnd();
}

// ============================================
// UTILITY COMMANDS
// ============================================

// Clear all local data
async function clearLocalData() {
    const stores = ['tasks', 'projects', 'sprints', 'milestones', 'subtasks', 'members', 'activity', 'syncQueue', 'userData'];
    for (const store of stores) {
        await localDB.clear(store);
    }
    localDB.clearAllCache();
    console.log('✅ All local data cleared');
    console.log('🔄 Reload page to see changes');
}

// Show app state
function showState() {
    console.group('📊 Application State');
    console.log('Version:', app?.version);
    console.log('Organization:', app?.state?.currentOrganization);
    console.log('Project:', app?.state?.currentProject?.name);
    console.log('View:', app?.state?.currentView);
    console.log('User Role:', app?.state?.userRole?.role);
    console.log('Theme:', app?.state?.theme);
    console.log('Online:', navigator.onLine);
    console.log('Auth Method:', offlineAuth?.getAuthMethod?.());
    console.log('Modules loaded:', Object.keys(app?.modules || {}));
    console.groupEnd();
}

// List all collections in Firestore
async function listCollections() {
    if (!navigator.onLine) {
        console.log('❌ Offline - cannot list Firestore collections');
        return;
    }
    
    console.group('📦 Firestore Collections');
    try {
        const collections = await db.listCollections();
        for (const collection of collections) {
            const snapshot = await collection.limit(1).get();
            console.log(`   📁 ${collection.id} (has data: ${!snapshot.empty})`);
        }
    } catch(e) {
        console.log('❌', e.message);
    }
    console.groupEnd();
}

// Quick create test project
async function quickCreateProject(name) {
    name = name || 'Test Project ' + new Date().toLocaleTimeString();
    
    try {
        await db.collection('projects').add({
            name: name,
            description: 'Created via console',
            color: '#7c3aed',
            organizationId: app.state.currentOrganization,
            createdBy: auth.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isArchived: false
        });
        
        console.log(`✅ Project "${name}" created`);
        await loadProjectsList();
        console.log('🔄 Project list refreshed');
    } catch(e) {
        console.log('❌ Failed:', e.message);
    }
}

// Quick create test task
async function quickCreateTask(title) {
    title = title || 'Test Task ' + new Date().toLocaleTimeString();
    const project = app?.state?.currentProject;
    
    if (!project) {
        console.log('❌ No project selected');
        return;
    }
    
    try {
        const ref = await db.collection('tasks').add({
            title: title,
            description: 'Created via console',
            status: 'planned',
            priority: 'medium',
            projectId: project.id,
            organizationId: app.state.currentOrganization,
            createdBy: auth.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            isTestData: true
        });
        
        console.log(`✅ Task "${title}" created (${ref.id})`);
        await app.modules.board.render();
        console.log('🔄 Board refreshed');
    } catch(e) {
        console.log('❌ Failed:', e.message);
    }
}

// Toggle offline mode simulation
function simulateOffline() {
    const wasOnline = navigator.onLine;
    
    // Override navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
        get: () => !wasOnline,
        configurable: true
    });
    
    // Dispatch event
    window.dispatchEvent(new Event(!wasOnline ? 'offline' : 'online'));
    
    console.log(`📡 Simulated: ${!wasOnline ? 'OFFLINE' : 'ONLINE'}`);
    console.log('⚠️ This is a simulation - real network is unchanged');
}

// ============================================
// EXPORT COMMANDS TO GLOBAL SCOPE
// ============================================

// Test suite
window.testAll = testAll;
window.testConnection = testConnection;
window.testAuth = testAuth;
window.testDatabase = testDatabase;
window.testProjects = testProjects;
window.testTasks = testTasks;
window.testBoard = testBoard;
window.testOffline = testOffline;
window.testPerformance = testPerformance;

// Utilities
window.clearLocalData = clearLocalData;
window.showState = showState;
window.listCollections = listCollections;
window.quickCreateProject = quickCreateProject;
window.quickCreateTask = quickCreateTask;
window.simulateOffline = simulateOffline;

// ============================================
// AUTO-RUN ON LOAD
// ============================================

console.log('%c🧪 Oriental Console Commands Loaded %c v3.0',
    'font-weight: bold; color: #7c3aed;', 'color: #94a3b8;');
console.log('%cType %ctestAll() %cto run the full test suite',
    'color: #94a3b8;', 'color: #22c55e; font-weight: bold;', 'color: #94a3b8;');
console.log('%cAvailable commands:', 'color: #94a3b8;');
console.log('  testAll()          - Run full test suite');
console.log('  testConnection()   - Test connectivity');
console.log('  testAuth()         - Test authentication');
console.log('  testDatabase()     - Test IndexedDB');
console.log('  testProjects()     - Test projects');
console.log('  testTasks()        - Test tasks');
console.log('  testBoard()        - Test board state');
console.log('  testOffline()      - Test offline capability');
console.log('  testPerformance()  - Test performance');
console.log('  showState()        - Show app state');
console.log('  clearLocalData()   - Clear all local data');
console.log('  listCollections()  - List Firestore collections');
console.log('  quickCreateProject(name) - Create test project');
console.log('  quickCreateTask(title)   - Create test task');
console.log('  simulateOffline()  - Toggle offline simulation');
console.log('───────────────────────────────────────────\n');