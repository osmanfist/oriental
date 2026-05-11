/**
 * Oriental - Dashboard Core
 * Auth, globals, utilities, caching
 */

// ============================================
// GLOBAL VARIABLES
// ============================================

// Undo Delete
let deletedItem = null;
let deletedItemType = null;
let undoTimeout = null;
const UNDO_DURATION = 20000;

// User & Organization
let currentUser = null;
let currentOrganization = null;
let currentProject = null;
let currentView = 'board';
let currentTaskForComments = null;

// Tasks
let allTasks = [];
let filteredTasks = [];
let searchTerm = '';
let currentSort = 'created-desc';
let activeFilters = { priorities: [], statuses: [], dueDates: [], assignees: [] };

// Team
let teamMembers = [];

// Realtime
let unsubscribeTasks = null;
let taskReloadTimeout = null;

// UI State
let isActivityLogOpen = false;

// Cache
let projectsCache = null;
let projectsCacheTime = 0;
const CACHE_DURATION = 30000;

// Offline
let pendingWrites = [];
let isOnline = navigator.onLine;

// Reports
let reportsCharts = {};

// Sprints
let currentSprint = null;
let availableTasks = [];

// Phase 1
let phase1FeaturesEnabled = true;
let currentAttachmentsManager = null;

// Settings
let currentSettingsTab = 'general';

// All Projects
let showAllProjects = false;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const icons = { 
        success: 'fa-check-circle', 
        error: 'fa-exclamation-circle', 
        warning: 'fa-exclamation-triangle', 
        info: 'fa-info-circle' 
    };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function generateSlug(text) {
    if (!text) return 'my-team';
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getDueDateStatus(dueDate) {
    if (!dueDate) return 'none';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
    if (due.getTime() === today.getTime()) return 'today';
    const weekFromNow = new Date(today); weekFromNow.setDate(today.getDate() + 7);
    if (due <= weekFromNow) return 'week';
    return 'future';
}

function getDueDateDisplay(dueDate) {
    if (!dueDate) return null;
    const status = getDueDateStatus(dueDate);
    const date = new Date(dueDate).toLocaleDateString();
    const labels = { 
        overdue: `⚠️ Overdue: ${date}`, 
        today: `📅 Today: ${date}`, 
        week: `📆 Due: ${date}`, 
        future: `📅 Due: ${date}` 
    };
    return labels[status] || `📅 ${date}`;
}

function getDateFilter(range) {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    switch(range) {
        case 'week': start.setDate(end.getDate() - 7); break;
        case 'month': start.setMonth(end.getMonth() - 1); break;
        case 'quarter': start.setMonth(end.getMonth() - 3); break;
        case 'year': start.setFullYear(end.getFullYear() - 1); break;
        case 'all': start.setFullYear(2020, 0, 1); break;
        default: start.setMonth(end.getMonth() - 1);
    }
    return { start, end };
}

function escapeCsvField(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// ============================================
// PERMISSION SYSTEM
// ============================================

const PERMISSIONS = {
    viewer: {
        viewTasks: true,
        viewProjects: true,
        viewReports: true,
        completeTasks: false,
        comment: false,
        createTasks: false,
        deleteTasks: false,
        createSprints: false,
        manageTeam: false,
        createProjects: false,
        deleteProjects: false,
        fullAuthority: false
    },
    member: {
        viewTasks: true,
        viewProjects: true,
        viewReports: true,
        completeTasks: true,
        comment: true,
        createTasks: false,
        deleteTasks: false,
        createSprints: false,
        manageTeam: false,
        createProjects: false,
        deleteProjects: false,
        fullAuthority: false
    },
    manager: {
        viewTasks: true,
        viewProjects: true,
        viewReports: true,
        completeTasks: true,
        comment: true,
        createTasks: true,
        deleteTasks: true,
        createSprints: true,
        manageTeam: false,
        createProjects: false,
        deleteProjects: false,
        fullAuthority: false
    },
    admin: {
        viewTasks: true,
        viewProjects: true,
        viewReports: true,
        completeTasks: true,
        comment: true,
        createTasks: true,
        deleteTasks: true,
        createSprints: true,
        manageTeam: true,
        createProjects: true,
        deleteProjects: true,
        fullAuthority: true
    }
};

let currentUserRole = 'admin'; // Default for safety

function getUserPermissions() {
    return PERMISSIONS[currentUserRole] || PERMISSIONS.viewer;
}

function can(permission) {
    const perms = getUserPermissions();
    return perms[permission] || perms.fullAuthority || false;
}

function requirePermission(permission) {
    if (!can(permission)) {
        showToast('You do not have permission to perform this action', 'error');
        return false;
    }
    return true;
}

/**
 * Update UI based on user permissions
 */
function applyPermissionUI() {
    const perms = getUserPermissions();
    
    // Create Task button
    const createTaskBtn = document.getElementById('create-task-btn');
    const bottomAddBtn = document.getElementById('bottom-add-btn');
    if (createTaskBtn) createTaskBtn.style.display = perms.createTasks ? 'flex' : 'none';
    if (bottomAddBtn) bottomAddBtn.style.display = perms.createTasks ? 'flex' : 'none';
    
    // Create Project button
    const addProjectBtn = document.getElementById('add-project-btn');
    if (addProjectBtn) addProjectBtn.style.display = perms.createProjects ? 'flex' : 'none';
    
    // Templates button
    const templatesBtn = document.getElementById('templates-btn');
    if (templatesBtn) templatesBtn.style.display = perms.createTasks ? 'flex' : 'none';
    
    // Invite button
    const inviteBtn = document.getElementById('invite-btn');
    if (inviteBtn) inviteBtn.style.display = perms.manageTeam ? 'flex' : 'none';
    
    // Delete project buttons (hide for non-admins)
    document.querySelectorAll('.delete-project-btn').forEach(btn => {
        btn.style.display = perms.deleteProjects ? '' : 'none';
    });
    
    // Sprint buttons
    const createSprintBtn = document.getElementById('create-sprint-btn');
    const completeSprintBtn = document.getElementById('complete-sprint-btn');
    const addToSprintBtn = document.getElementById('add-to-sprint-btn');
    if (createSprintBtn) createSprintBtn.style.display = perms.createSprints ? 'flex' : 'none';
    if (addToSprintBtn) addToSprintBtn.style.display = perms.createSprints ? 'flex' : 'none';
    
    // Settings tabs
    document.querySelectorAll('.settings-tab[data-tab="team"]').forEach(tab => {
        tab.style.display = perms.manageTeam ? 'flex' : 'none';
    });
    
    // Danger zone in settings
    document.querySelectorAll('.danger-item-critical').forEach(item => {
        item.style.display = perms.deleteProjects ? 'flex' : 'none';
    });
    
    // Export buttons
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportCsvBtn) exportCsvBtn.style.display = perms.viewReports ? 'flex' : 'none';
    if (exportPdfBtn) exportPdfBtn.style.display = perms.viewReports ? 'flex' : 'none';
    
    console.log('🔒 Permissions applied for role:', currentUserRole, perms);
}

// ============================================
// SMART FEATURES - AI/Algorithmic
// ============================================

/**
 * Smart Priority Suggestion System
 * Analyzes task properties and suggests optimal priority
 */
function suggestPriority(taskData, allContextTasks) {
    let score = 0;
    const reasons = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // === DUE DATE URGENCY (max 50 points) ===
    if (taskData.dueDate) {
        const due = new Date(taskData.dueDate);
        due.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0) {
            score += 50;
            reasons.push(`🚨 ${Math.abs(daysUntilDue)} days overdue`);
        } else if (daysUntilDue === 0) {
            score += 45;
            reasons.push('🚨 Due today');
        } else if (daysUntilDue <= 1) {
            score += 35;
            reasons.push('⏰ Due tomorrow');
        } else if (daysUntilDue <= 3) {
            score += 25;
            reasons.push(`📅 Due in ${daysUntilDue} days`);
        } else if (daysUntilDue <= 7) {
            score += 10;
            reasons.push(`📅 Due in ${daysUntilDue} days`);
        }
    } else {
        // No due date = less urgent
        score -= 10;
        reasons.push('📅 No due date set');
    }
    
    // === TITLE KEYWORD ANALYSIS (max 30 points) ===
    const title = (taskData.title || '').toLowerCase();
    const urgentKeywords = [
        { word: 'critical', points: 25, reason: '🔴 Critical keyword' },
        { word: 'urgent', points: 25, reason: '🔴 Urgent keyword' },
        { word: 'security', points: 25, reason: '🔒 Security issue' },
        { word: 'crash', points: 25, reason: '💥 Crash/bug' },
        { word: 'outage', points: 25, reason: '🚨 Outage' },
        { word: 'blocker', points: 20, reason: '🚫 Blocker' },
        { word: 'bug', points: 15, reason: '🐛 Bug fix' },
        { word: 'fix', points: 15, reason: '🔧 Fix needed' },
        { word: 'hotfix', points: 25, reason: '🔥 Hotfix' },
        { word: 'production', points: 20, reason: '🏭 Production issue' },
        { word: 'release', points: 15, reason: '📦 Release' },
        { word: 'deploy', points: 10, reason: '🚀 Deployment' },
    ];
    
    urgentKeywords.forEach(({ word, points, reason }) => {
        if (title.includes(word)) {
            score += points;
            reasons.push(reason);
        }
    });
    
    // Low priority keywords
    const lowKeywords = ['documentation', 'docs', 'readme', 'chore', 'cleanup', 'refactor', 'minor'];
    lowKeywords.forEach(word => {
        if (title.includes(word)) {
            score -= 10;
            reasons.push('📝 Maintenance/low-priority keyword');
        }
    });
    
    // === DESCRIPTION ANALYSIS (max 15 points) ===
    const desc = (taskData.description || '').toLowerCase();
    if (desc.includes('client') || desc.includes('customer') || desc.includes('stakeholder')) {
        score += 15;
        reasons.push('👤 Client/stakeholder mentioned');
    }
    if (desc.includes('revenue') || desc.includes('money') || desc.includes('payment')) {
        score += 15;
        reasons.push('💰 Revenue impact');
    }
    
    // === TAGS ANALYSIS (max 15 points) ===
    const tags = taskData.tags || [];
    const highPriorityTags = ['critical', 'urgent', 'security', 'production', 'hotfix', 'bug'];
    tags.forEach(tag => {
        if (highPriorityTags.includes(tag.toLowerCase())) {
            score += 15;
            reasons.push(`🏷️ High-priority tag: ${tag}`);
        }
    });
    
    // === ASSIGNEE WORKLOAD (max 20 points) ===
    if (taskData.assignedTo && allContextTasks) {
        const assigneeTasks = allContextTasks.filter(t =>
            t.assignedTo === taskData.assignedTo &&
            t.status !== 'done' &&
            t.status !== 'planned'
        );
        const workload = assigneeTasks.length;
        
        if (workload > 10) {
            score += 20;
            reasons.push(`👤 ${taskData.assignedTo} has heavy workload (${workload} active tasks)`);
        } else if (workload > 7) {
            score += 10;
            reasons.push(`👤 Moderate workload (${workload} active tasks)`);
        } else if (workload <= 2) {
            score -= 5;
            reasons.push(`👤 Light workload (${workload} active tasks)`);
        }
    }
    
    // === ESTIMATED HOURS (max 10 points) ===
    const hours = parseFloat(taskData.estimatedHours) || 0;
    if (hours > 20) {
        score += 10;
        reasons.push(`⏱️ Large task (${hours}h estimated)`);
    } else if (hours > 8) {
        score += 5;
        reasons.push(`⏱️ Medium task (${hours}h estimated)`);
    }
    
    // === DETERMINE PRIORITY ===
    let suggestedPriority;
    if (score >= 50) suggestedPriority = 'high';
    else if (score >= 20) suggestedPriority = 'medium';
    else suggestedPriority = 'low';
    
    return {
        priority: suggestedPriority,
        score: score,
        confidence: Math.min(Math.abs(score) / 80 * 100, 100).toFixed(0),
        reasons: reasons,
        summary: `Score: ${score}/100 — Suggested: ${suggestedPriority.toUpperCase()}`
    };
}

/**
 * Smart Assignee Suggestion System
 * Suggests best team member based on workload, expertise, and availability
 */
function suggestAssignee(taskData, teamMembersList, allContextTasks) {
    if (!teamMembersList || teamMembersList.length === 0) return null;
    
    const memberScores = teamMembersList
        .filter(m => m.role !== 'viewer') // Viewers can't be assigned
        .map(member => {
            let score = 50; // Start at neutral
            const reasons = [];
            
            // === WORKLOAD BALANCE (max -30 points for busy, +10 for free) ===
            const activeTasks = allContextTasks.filter(t =>
                t.assignedTo === member.name &&
                t.status !== 'done'
            );
            const workload = activeTasks.length;
            
            if (workload === 0) {
                score += 10;
                reasons.push('🟢 No active tasks');
            } else if (workload <= 3) {
                score += 5;
                reasons.push(`🟢 Light load (${workload} tasks)`);
            } else if (workload <= 6) {
                score += 0;
                reasons.push(`🟡 Moderate load (${workload} tasks)`);
            } else if (workload <= 9) {
                score -= 15;
                reasons.push(`🟠 Busy (${workload} tasks)`);
            } else {
                score -= 30;
                reasons.push(`🔴 Overloaded (${workload} tasks)`);
            }
            
            // === TAG/EXPERTISE MATCHING (max +25 points) ===
            const taskTags = (taskData.tags || []).map(t => t.toLowerCase());
            if (taskTags.length > 0) {
                const completedTasks = allContextTasks.filter(t =>
                    t.assignedTo === member.name &&
                    t.status === 'done'
                );
                
                let tagMatches = 0;
                taskTags.forEach(tag => {
                    const matches = completedTasks.filter(t =>
                        t.tags?.some(ct => ct.toLowerCase() === tag)
                    ).length;
                    tagMatches += matches;
                });
                
                if (tagMatches > 5) {
                    score += 25;
                    reasons.push(`⭐ Expert in: ${taskTags.join(', ')} (${tagMatches} similar tasks)`);
                } else if (tagMatches > 2) {
                    score += 15;
                    reasons.push(`📚 Experience with: ${taskTags.join(', ')}`);
                } else if (tagMatches > 0) {
                    score += 8;
                    reasons.push(`📖 Some experience with these tags`);
                }
            }
            
            // === PAST PERFORMANCE (max +15 points) ===
            const completionRate = member.totalAssigned > 0
                ? (member.completedCount / member.totalAssigned) * 100
                : 0;
            
            if (completionRate > 80 && member.totalAssigned > 5) {
                score += 15;
                reasons.push(`🏆 High completion rate (${completionRate.toFixed(0)}%)`);
            } else if (completionRate > 60) {
                score += 8;
                reasons.push(`✅ Good completion rate (${completionRate.toFixed(0)}%)`);
            }
            
            // === RECENT ACTIVITY (max +10 points) ===
            const recentTasks = completedByMember.filter(t => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return t.updatedAt?.toDate() > weekAgo;
            }).length;
            
            if (recentTasks > 3) {
                score += 10;
                reasons.push('🔄 Recently active');
            } else if (recentTasks > 0) {
                score += 5;
                reasons.push('👀 Some recent activity');
            } else {
                score -= 10;
                reasons.push('💤 No recent activity');
            }
            
            // === ROLE/POSITION (max +10 points) ===
            if (member.role === 'admin') {
                score -= 5;
                reasons.push('👑 Admin (may delegate)');
            } else if (member.role === 'manager') {
                score += 5;
                reasons.push('📋 Manager (oversees work)');
            } else if (member.role === 'member') {
                score += 8;
                reasons.push('👤 Team member (executor)');
            }
            
            return {
                member,
                score,
                confidence: Math.min((score / 100) * 100, 100).toFixed(0),
                reasons,
                summary: `${member.name} — Score: ${score}/100`
            };
        });
    
    // Sort by score descending
    memberScores.sort((a, b) => b.score - a.score);
    
    return {
        topPick: memberScores[0],
        allSuggestions: memberScores,
        bestName: memberScores[0]?.member.name || null
    };
}

/**
 * Calculate member statistics for smart suggestions
 */
function calculateMemberStats(memberName, allTasks) {
    const memberTasks = allTasks.filter(t => t.assignedTo === memberName);
    const completed = memberTasks.filter(t => t.status === 'done');
    
    return {
        totalAssigned: memberTasks.length,
        completedCount: completed.length,
        completionRate: memberTasks.length > 0 
            ? ((completed.length / memberTasks.length) * 100).toFixed(0) 
            : 0,
        activeCount: memberTasks.filter(t => t.status !== 'done').length,
        recentActivity: completed.filter(t => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return t.updatedAt?.toDate() > weekAgo;
        }).length
    };
}

// ============================================
// CACHING
// ============================================

async function getCachedProjects() {
    const now = Date.now();
    if (projectsCache && (now - projectsCacheTime) < CACHE_DURATION) return projectsCache;
    
    const snapshot = await db.collection('projects')
        .where('organizationId', '==', currentOrganization)
        .where('isArchived', '==', false)
        .get();
    
    projectsCache = [];
    snapshot.forEach(doc => projectsCache.push({ id: doc.id, ...doc.data() }));
    projectsCacheTime = now;
    return projectsCache;
}

function invalidateCache() {
    projectsCache = null;
    projectsCacheTime = 0;
}

// ============================================
// ACTIVITY LOGGING
// ============================================

async function logActivity(action, entityType, entityId, entityName, details = {}) {
    if (!currentOrganization) return;
    const writeOp = async () => {
        await db.collection('activity_logs').add({
            organizationId: currentOrganization,
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            userEmail: currentUser.email,
            action, entityType, entityId, entityName, details,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    };
    if (isOnline) {
        try { await writeOp(); } catch (e) { console.error('Activity log error:', e); }
    } else {
        pendingWrites.push(writeOp);
    }
}

// ============================================
// AUTH & USER DATA
// ============================================

async function checkAuth() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (!user) { window.location.href = 'login.html'; reject(); }
            else { currentUser = user; resolve(); }
        });
    });
}

async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            currentOrganization = userData.currentOrganization;
            document.getElementById('org-name').textContent = userData.name || currentUser.email;
            document.getElementById('user-name').textContent = userData.name || currentUser.displayName || 'User';
            document.getElementById('user-email').textContent = currentUser.email;
            if (currentOrganization) await loadProjectsOptimized();
        } else {
            document.getElementById('user-name').textContent = currentUser.displayName || currentUser.email.split('@')[0];
            document.getElementById('user-email').textContent = currentUser.email;
            await createMissingUserDocument();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
    }
}

async function createMissingUserDocument() {
    try {
        const orgsSnapshot = await db.collection('organizations')
            .where('members', 'array-contains', currentUser.uid).get();
        let orgId;
        if (!orgsSnapshot.empty) {
            orgId = orgsSnapshot.docs[0].id;
        } else {
            const orgName = prompt('Welcome! Enter your organization name:', 'My Team');
            if (!orgName) return;
            const orgRef = await db.collection('organizations').add({
                name: orgName, slug: generateSlug(orgName),
                createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                members: [currentUser.uid],
                settings: { defaultView: 'board', theme: 'light' }
            });
            orgId = orgRef.id;
            await db.collection('projects').add({
                name: 'Getting Started',
                description: 'Welcome to Oriental! This is your first project.',
                organizationId: orgId, createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isArchived: false, color: '#16a34a'
            });
        }
        await db.collection('users').doc(currentUser.uid).set({
            name: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email,
            currentOrganization: orgId, organizations: [orgId],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            preferences: { notifications: true, emailDigest: 'daily' }
        });
        currentOrganization = orgId;
        await loadProjectsOptimized();
        showToast('Organization created successfully', 'success');
    } catch (error) {
        console.error('Error:', error);
        showToast('Error setting up account', 'error');
    }
}

async function loadOrganization() {
    if (!currentOrganization) return;
    try {
        const orgDoc = await db.collection('organizations').doc(currentOrganization).get();
        if (orgDoc.exists) document.getElementById('org-name').textContent = orgDoc.data().name;
    } catch (error) { console.error('Error loading organization:', error); }
}

// ============================================
// TEAM MEMBERS
// ============================================

async function loadTeamMembers() {
    if (!currentOrganization) return;
    try {
        const usersSnapshot = await db.collection('users')
            .where('organizations', 'array-contains', currentOrganization).get();
        teamMembers = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            teamMembers.push({ id: doc.id, name: userData.name || userData.email.split('@')[0], email: userData.email, avatar: userData.avatar || null });
        });
        if (!teamMembers.some(m => m.id === currentUser.uid)) {
            teamMembers.unshift({ id: currentUser.uid, name: currentUser.displayName || currentUser.email.split('@')[0], email: currentUser.email });
        }
        updateAssigneeDropdowns();
        loadTeamMembersDisplay();
    } catch (error) { console.error('Error loading team members:', error); }
}

function updateAssigneeDropdowns() {
    const options = '<option value="">Unassigned</option>' + teamMembers.map(m => 
        `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)} (${escapeHtml(m.email)})</option>`
    ).join('');
    ['task-assignee', 'edit-task-assignee'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { const currentValue = el.value; el.innerHTML = options; if (currentValue && id === 'edit-task-assignee') el.value = currentValue; }
    });
}

async function loadTeamMembersDisplay() {
    if (!currentOrganization) return;
    try {
        const teamContainer = document.getElementById('team-members-list');
        if (!teamContainer) return;
        teamContainer.innerHTML = '';
        teamMembers.forEach(member => {
            const isCurrentUser = member.id === currentUser.uid;
            const div = document.createElement('div');
            div.className = 'team-member-item';
            div.innerHTML = `
                <div class="team-member-avatar"><i class="fas fa-user-circle"></i></div>
                <div class="team-member-info">
                    <div class="team-member-name">${escapeHtml(member.name)}</div>
                    <div class="team-member-email">${escapeHtml(member.email)}</div>
                </div>
                ${isCurrentUser ? '<span class="team-member-badge">You</span>' : ''}
            `;
            teamContainer.appendChild(div);
        });
    } catch (error) { console.error('Error loading team display:', error); }
}

// ============================================
// CONFIRMATION DIALOG
// ============================================

function showConfirmDialog(title, message, type = 'danger') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        const okClass = type === 'danger' ? 'confirm-ok' : 'confirm-ok-success';
        const okText = type === 'danger' ? 'Delete' : 'Confirm';
        dialog.innerHTML = `
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(message)}</p>
            <div class="confirm-dialog-actions">
                <button class="confirm-cancel">Cancel</button>
                <button class="${okClass}">${okText}</button>
            </div>
        `;
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        const cleanup = () => overlay.remove();
        dialog.querySelector('.confirm-cancel').addEventListener('click', () => { cleanup(); resolve(false); });
        dialog.querySelector(`.${okClass}`).addEventListener('click', () => { cleanup(); resolve(true); });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) { cleanup(); resolve(false); } });
    });
}

// ============================================
// PWA & OFFLINE
// ============================================

let deferredPrompt;

function setupPWAInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const pwaPrompt = document.createElement('div');
        pwaPrompt.className = 'pwa-install-prompt';
        pwaPrompt.innerHTML = `
            <p><i class="fas fa-download"></i> Install Oriental for a better experience!</p>
            <button id="install-pwa-btn">Install</button>
            <button class="close-pwa-prompt" id="close-pwa-prompt">&times;</button>
        `;
        document.body.appendChild(pwaPrompt);
        document.getElementById('install-pwa-btn').addEventListener('click', async () => {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            if (result.outcome === 'accepted') console.log('PWA installed');
            pwaPrompt.remove();
            deferredPrompt = null;
        });
        document.getElementById('close-pwa-prompt').addEventListener('click', () => pwaPrompt.remove());
        pwaPrompt.classList.add('show');
    });
}

function setupOfflineDetection() {
    window.addEventListener('online', () => {
        isOnline = true;
        const indicator = document.getElementById('offline-indicator');
        if (indicator) indicator.classList.remove('show');
        showToast('Back online!', 'success');
    });
    window.addEventListener('offline', () => {
        isOnline = false;
        const indicator = document.getElementById('offline-indicator');
        if (indicator) indicator.classList.add('show');
        showToast('You are offline', 'warning');
    });
    if (!isOnline) document.getElementById('offline-indicator')?.classList.add('show');
}

// ============================================
// CLIENT-SIDE INDEXEDDB CACHE
// ============================================

const CACHE_DB_NAME = 'OrientalCache';
const CACHE_VERSION = 1;

function openCacheDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CACHE_DB_NAME, CACHE_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('tasks')) {
                db.createObjectStore('tasks', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('projects')) {
                db.createObjectStore('projects', { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function cacheDataOffline(storeName, data) {
    try {
        const db = await openCacheDB();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        for (const item of data) {
            await store.put(item);
        }
        await tx.complete;
        console.log(`📦 Cached ${data.length} items in ${storeName}`);
    } catch (error) {
        console.warn('Cache write failed:', error);
    }
}

async function getCachedData(storeName) {
    try {
        const db = await openCacheDB();
        const tx = db.transaction(storeName, 'readonly');
        const data = await tx.objectStore(storeName).getAll();
        await tx.complete;
        return data;
    } catch (error) {
        console.warn('Cache read failed:', error);
        return [];
    }
}

// Cache tasks after loading
// Add this line after loadTasks() and loadAllProjectsTasks():
// cacheDataOffline('tasks', allTasks);

// ============================================
// DARK MODE
// ============================================

function initDarkMode() {
    const savedTheme = localStorage.getItem('oriental_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const isDark = currentTheme === 'dark';
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('oriental_theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('oriental_theme', 'dark');
    }
    showToast(isDark ? 'Light mode' : 'Dark mode', 'info');
}

function setupThemeToggle() {
    document.querySelectorAll('.theme-toggle').forEach(toggle => {
        toggle.addEventListener('click', toggleTheme);
    });
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const isTyping = e.target.matches('input, textarea, select, [contenteditable]');
        if (e.key === 'Escape') { closeAllModals(); return; }
        if (isTyping) return;
        if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openTaskModal(); }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); openProjectModal(); }
        if (e.key === '/') { e.preventDefault(); document.getElementById('search-tasks')?.focus(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); if (deletedItem) undoDelete(); }
    });
}

// ============================================
// MOBILE NAVIGATION
// ============================================

function setupMobileNavigation() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const openSidebar = () => { sidebar?.classList.add('open'); overlay?.classList.add('active'); };
    const closeSidebar = () => { sidebar?.classList.remove('open'); overlay?.classList.remove('active'); };
    
    document.getElementById('mobile-menu-btn')?.addEventListener('click', openSidebar);
    document.getElementById('sidebar-close-btn')?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);
}

// ============================================
// GLOBAL CLEANUP
// ============================================

function cleanup() {
    if (unsubscribeTasks) unsubscribeTasks();
    if (taskReloadTimeout) clearTimeout(taskReloadTimeout);
    if (undoTimeout) clearTimeout(undoTimeout);
    Object.values(reportsCharts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') chart.destroy();
    });
}

function closeAllModals() {
    ['task-modal','project-modal','sprint-modal','comment-modal','invite-modal','pending-invites-modal','add-to-sprint-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.classList.remove('active'); }
    });
    document.getElementById('filter-dropdown')?.classList.remove('show');
    document.getElementById('sort-dropdown')?.classList.remove('show');
}

console.log('✅ dashboard-core.js loaded');