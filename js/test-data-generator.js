/**
 * Oriental - Test Data Generator
 * Creates comprehensive test data for development/testing
 * Run in browser console: testDataGenerator.generateAll()
 */

const testDataGenerator = {
    // ============================================
    // CONFIGURATION
    // ============================================
    config: {
        teamMembers: {
            admins: 1,
            members: 4,      // Will create 3-5 random
            viewers: 1
        },
        projects: {
            min: 3,
            max: 5
        },
        tasks: {
            perProject: 25
        },
        milestones: {
            perTaskMin: 2,
            perTaskMax: 5
        },
        comments: {
            chancePerTask: 0.4,  // 40% of tasks get comments
            maxPerTask: 4
        },
        sprints: {
            perProjectMin: 1,
            perProjectMax: 3
        }
    },

    // ============================================
    // DATA POOLS
    // ============================================
    names: [
        'Sarah Chen', 'Marcus Rodriguez', 'Aisha Patel', 'James Wilson',
        'Elena Kowalski', 'David Kim', 'Fatima Hassan', 'Alex Thompson',
        'Maria Garcia', 'Ryan O\'Brien', 'Yuki Tanaka', 'Omar Mahmoud',
        'Nina Johansson', 'Carlos Mendez', 'Leila Abdi'
    ],

    emails: [
        'sarah.c@example.com', 'marcus.r@example.com', 'aisha.p@example.com',
        'james.w@example.com', 'elena.k@example.com', 'david.k@example.com',
        'fatima.h@example.com', 'alex.t@example.com', 'maria.g@example.com',
        'ryan.o@example.com', 'yuki.t@example.com', 'omar.m@example.com'
    ],

    projectNames: [
        { name: 'Website Redesign', color: '#0ea5e9', desc: 'Complete overhaul of the company website with modern design and improved UX' },
        { name: 'Mobile App v2', color: '#8b5cf6', desc: 'Native mobile application for iOS and Android with offline support' },
        { name: 'API Platform', color: '#f59e0b', desc: 'RESTful API platform for third-party integrations and partner access' },
        { name: 'DevOps Migration', color: '#10b981', desc: 'Migrate infrastructure to Kubernetes with CI/CD pipeline automation' },
        { name: 'Customer Portal', color: '#ef4444', desc: 'Self-service customer portal for account management and support tickets' },
        { name: 'Data Analytics', color: '#6366f1', desc: 'Real-time analytics dashboard with custom reporting and exports' },
        { name: 'Security Audit', color: '#ec4899', desc: 'Comprehensive security audit and implementation of SOC2 compliance measures' }
    ],

    taskTemplates: [
        { title: 'Design system components', priority: 'high', tags: ['design', 'frontend'], hours: 8 },
        { title: 'Implement authentication flow', priority: 'high', tags: ['backend', 'security'], hours: 16 },
        { title: 'Create database schema', priority: 'high', tags: ['backend', 'database'], hours: 12 },
        { title: 'Write unit tests', priority: 'medium', tags: ['testing', 'qa'], hours: 6 },
        { title: 'Setup CI/CD pipeline', priority: 'medium', tags: ['devops', 'automation'], hours: 10 },
        { title: 'Design landing page', priority: 'medium', tags: ['design', 'frontend'], hours: 8 },
        { title: 'API documentation', priority: 'low', tags: ['documentation', 'api'], hours: 4 },
        { title: 'Performance optimization', priority: 'high', tags: ['performance', 'backend'], hours: 14 },
        { title: 'User acceptance testing', priority: 'medium', tags: ['testing', 'qa'], hours: 8 },
        { title: 'Database migration script', priority: 'high', tags: ['database', 'backend'], hours: 6 },
        { title: 'Email notification system', priority: 'medium', tags: ['backend', 'notifications'], hours: 10 },
        { title: 'Responsive layout fixes', priority: 'low', tags: ['frontend', 'bug'], hours: 4 },
        { title: 'Search functionality', priority: 'medium', tags: ['backend', 'frontend'], hours: 12 },
        { title: 'File upload component', priority: 'medium', tags: ['frontend', 'feature'], hours: 8 },
        { title: 'Error logging system', priority: 'high', tags: ['backend', 'devops'], hours: 6 },
        { title: 'User profile page', priority: 'low', tags: ['frontend', 'feature'], hours: 6 },
        { title: 'Rate limiting implementation', priority: 'medium', tags: ['backend', 'security'], hours: 5 },
        { title: 'Dashboard widgets', priority: 'medium', tags: ['frontend', 'feature'], hours: 8 },
        { title: 'Data export feature', priority: 'low', tags: ['feature', 'backend'], hours: 6 },
        { title: 'Accessibility audit', priority: 'medium', tags: ['qa', 'frontend'], hours: 8 },
        { title: 'Cache layer implementation', priority: 'high', tags: ['backend', 'performance'], hours: 10 },
        { title: 'Onboarding tutorial', priority: 'low', tags: ['feature', 'ux'], hours: 6 },
        { title: 'Webhook integration', priority: 'medium', tags: ['backend', 'api'], hours: 8 },
        { title: 'Dark mode support', priority: 'low', tags: ['frontend', 'feature'], hours: 6 },
        { title: 'Load testing', priority: 'high', tags: ['testing', 'devops'], hours: 8 }
    ],

    commentTemplates: [
        'Working on this now, should have an update by EOD.',
        'Need clarification on the requirements. @team can someone review?',
        'This is blocked by the API changes. Waiting on backend team.',
        'Initial implementation is complete. Ready for code review.',
        'Found an edge case that needs handling. Added to the description.',
        'Great progress! The design looks clean.',
        'Deployed to staging. Please test when you get a chance.',
        'Updated the estimates based on new requirements.',
        'Fixed the bug reported in testing. Ready for re-test.',
        'Added documentation for this feature.',
        'Merged the PR. Moving this to done.',
        'Need to sync with the design team before proceeding.',
        'Performance benchmarks look good. Below the threshold.',
        'This is taking longer than expected. Might need to split into subtasks.',
        'Dependencies are resolved. Unblocked and moving forward.'
    ],

    milestoneNames: [
        'Requirements gathering',
        'Design approval',
        'Initial prototype',
        'Code review passed',
        'Testing complete',
        'Documentation done',
        'Staging deployment',
        'Client approval',
        'Performance validated',
        'Security review',
        'Integration testing',
        'UAT sign-off',
        'Production deployment',
        'Monitoring setup',
        'Handoff complete'
    ],

    statuses: ['planned', 'started', 'in-progress', 'waiting', 'done'],
    priorities: ['high', 'medium', 'low'],

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    randomDate(daysBack, daysForward = 0) {
        const date = new Date();
        date.setDate(date.getDate() - this.randomInt(0, daysBack));
        if (daysForward > 0) {
            date.setDate(date.getDate() + this.randomInt(0, daysForward));
        }
        return date.toISOString().split('T')[0];
    },

    randomSubset(arr, min, max) {
        const count = this.randomInt(min, Math.min(max, arr.length));
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // ============================================
    // GENERATION FUNCTIONS
    // ============================================

    async generateTeamMembers() {
        console.log('👥 Generating team members...');
        
        const members = [];
        const usedEmails = new Set();
        
        // Generate admins
        for (let i = 0; i < this.config.teamMembers.admins; i++) {
            const name = this.names[i];
            const email = `admin${i + 1}@oriental-test.dev`;
            members.push({ name, email, role: 'admin' });
            usedEmails.add(email);
        }
        
        // Generate regular members
        const memberCount = this.randomInt(this.config.teamMembers.members - 1, this.config.teamMembers.members + 1);
        for (let i = 0; i < memberCount; i++) {
            const idx = this.config.teamMembers.admins + i;
            const name = this.names[idx] || this.randomElement(this.names);
            const email = `member${i + 1}@oriental-test.dev`;
            members.push({ name, email, role: 'member' });
            usedEmails.add(email);
        }
        
        // Generate viewers
        for (let i = 0; i < this.config.teamMembers.viewers; i++) {
            const name = this.randomElement(this.names);
            const email = `viewer${i + 1}@oriental-test.dev`;
            members.push({ name, email, role: 'viewer' });
            usedEmails.add(email);
        }
        
        console.log(`  ✅ Created ${members.length} team members (${this.config.teamMembers.admins} admin, ${memberCount} members, ${this.config.teamMembers.viewers} viewer)`);
        return members;
    },

    async generateProjects() {
        console.log('📁 Generating projects...');
        
        const projectCount = this.randomInt(this.config.projects.min, this.config.projects.max);
        const selectedProjects = this.randomSubset(this.projectNames, projectCount, projectCount);
        const projects = [];
        
        for (const project of selectedProjects) {
            const docRef = await db.collection('projects').add({
                organizationId: currentOrganization,
                name: project.name,
                description: project.desc,
                color: project.color,
                isArchived: false,
                createdBy: currentUser.uid,
                createdAt: this.randomPastTimestamp(30),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            projects.push({ id: docRef.id, ...project });
            console.log(`  ✅ Created project: ${project.name}`);
            await this.delay(100);
        }
        
        return projects;
    },

    randomPastTimestamp(maxDaysAgo) {
        const date = new Date();
        date.setDate(date.getDate() - this.randomInt(0, maxDaysAgo));
        date.setHours(this.randomInt(0, 23), this.randomInt(0, 59));
        return firebase.firestore.Timestamp.fromDate(date);
    },

    async generateTasks(project, teamMembers) {
        console.log(`  📝 Generating tasks for: ${project.name}`);
        
        const taskCount = this.config.tasks.perProject;
        const tasks = [];
        const assignableMembers = teamMembers.filter(m => m.role !== 'viewer');
        
        for (let i = 0; i < taskCount; i++) {
            const template = this.randomElement(this.taskTemplates);
            const assignee = Math.random() > 0.2 ? this.randomElement(assignableMembers) : null;
            const status = this.randomElement(this.statuses);
            const dueDate = this.randomDate(14, 21); // -14 to +21 days from now
            
            // Generate milestones
            const milestoneCount = this.randomInt(this.config.milestones.perTaskMin, this.config.milestones.perTaskMax);
            const selectedMilestones = this.randomSubset(this.milestoneNames, milestoneCount, milestoneCount);
            const milestones = selectedMilestones.map((name, index) => ({
                id: `ms-${Date.now().toString(36)}-${i}-${index}`,
                name: `${name} for ${template.title}`,
                completed: status === 'done' ? true : (status === 'in-progress' ? Math.random() > 0.5 : false),
                createdAt: new Date().toISOString()
            }));
            
            const task = {
                projectId: project.id,
                title: `${template.title} - ${this.generateTaskSuffix()}`,
                description: `Task for ${project.name}: ${template.title}. This involves ${template.tags.join(', ')} related work.`,
                priority: template.priority,
                status: status,
                assignedTo: assignee ? assignee.name : null,
                assignedToId: assignee ? `test-${assignee.email}` : null,
                dueDate: dueDate,
                estimatedHours: template.hours,
                tags: template.tags,
                milestones: milestones,
                order: i * 100,
                createdBy: currentUser.uid,
                createdAt: this.randomPastTimestamp(21),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const docRef = await db.collection('tasks').add(task);
            tasks.push({ id: docRef.id, ...task });
            
            // Generate comments for some tasks
            if (Math.random() < this.config.comments.chancePerTask) {
                await this.generateComments(docRef.id, project.name, task.title, teamMembers);
            }
            
            if ((i + 1) % 5 === 0) {
                console.log(`    📝 ${i + 1}/${taskCount} tasks created...`);
                await this.delay(50);
            }
        }
        
        console.log(`  ✅ Created ${tasks.length} tasks for ${project.name}`);
        return tasks;
    },

    generateTaskSuffix() {
        const suffixes = [
            'Phase 1', 'Initial Setup', 'Core Feature', 'MVP', 'v1.0',
            'Refactor', 'Optimization', 'Bug Fix', 'Enhancement', 'Integration'
        ];
        return this.randomElement(suffixes);
    },

    async generateComments(taskId, projectName, taskTitle, teamMembers) {
        const commentCount = this.randomInt(1, this.config.comments.maxPerTask);
        const activeMembers = teamMembers.filter(m => m.role !== 'viewer');
        
        for (let i = 0; i < commentCount; i++) {
            const author = this.randomElement(activeMembers);
            const comment = {
                taskId: taskId,
                userId: `test-${author.email}`,
                userName: author.name,
                content: this.randomElement(this.commentTemplates),
                createdAt: this.randomPastTimestamp(14)
            };
            await db.collection('comments').add(comment);
        }
    },

    async generateSprints(project, tasks, teamMembers) {
        console.log(`  🏃 Generating sprints for: ${project.name}`);
        
        const sprintCount = this.randomInt(this.config.sprints.perProjectMin, this.config.sprints.perProjectMax);
        const sprints = [];
        
        for (let i = 0; i < sprintCount; i++) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - (14 * (sprintCount - i)));
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 14);
            
            const sprintTasks = this.randomSubset(tasks, 5, 12);
            const taskIds = sprintTasks.map(t => t.id);
            const completedTasks = sprintTasks.filter(t => t.status === 'done');
            
            const sprint = {
                organizationId: currentOrganization,
                projectId: project.id,
                name: `Sprint ${i + 1} - ${project.name}`,
                goal: `Complete ${sprintTasks.length} tasks for ${project.name} sprint ${i + 1}`,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                status: i === sprintCount - 1 ? 'active' : 'completed',
                tasks: taskIds,
                createdAt: firebase.firestore.Timestamp.fromDate(startDate),
                completedAt: i < sprintCount - 1 ? firebase.firestore.Timestamp.fromDate(endDate) : null
            };
            
            const docRef = await db.collection('sprints').add(sprint);
            sprints.push({ id: docRef.id, ...sprint });
            
            // Log activity
            await this.generateActivity('sprint', docRef.id, sprint.name, 
                i === sprintCount - 1 ? 'create_sprint' : 'complete_sprint');
            
            console.log(`    ✅ Sprint ${i + 1}: ${sprint.name} (${taskIds.length} tasks, ${completedTasks.length} done)`);
            await this.delay(50);
        }
        
        return sprints;
    },

    async generateActivityLog(tasks, projects, sprints) {
        console.log('📋 Generating activity logs...');
        
        const activities = [
            { action: 'create_project', entity: 'project', items: projects },
            { action: 'create_task', entity: 'task', items: tasks.slice(0, 15) },
            { action: 'update_task', entity: 'task', items: tasks.slice(10, 20) },
            { action: 'add_comment', entity: 'comment', items: tasks.slice(0, 8) },
            { action: 'create_sprint', entity: 'sprint', items: sprints }
        ];
        
        let count = 0;
        for (const activity of activities) {
            for (const item of activity.items) {
                if (!item) continue;
                await db.collection('activity_logs').add({
                    organizationId: currentOrganization,
                    userId: currentUser.uid,
                    userName: currentUser.displayName || 'Test User',
                    userEmail: currentUser.email,
                    action: activity.action,
                    entityType: activity.entity,
                    entityId: item.id || 'test-id',
                    entityName: item.name || item.title || 'Test Item',
                    details: { generated: true, timestamp: new Date().toISOString() },
                    createdAt: this.randomPastTimestamp(14)
                });
                count++;
            }
        }
        
        console.log(`  ✅ Generated ${count} activity log entries`);
    },

    // ============================================
    // MAIN GENERATOR
    // ============================================

    async generateAll() {
        console.log('🚀 ========================================');
        console.log('🚀 ORIENTAL TEST DATA GENERATOR');
        console.log('🚀 ========================================');
        console.log('');
        
        if (!currentUser) {
            console.error('❌ Not authenticated! Please log in first.');
            return;
        }
        
        if (!currentOrganization) {
            console.error('❌ No organization found! Please create or select an organization.');
            return;
        }
        
        console.log(`👤 Current user: ${currentUser.email}`);
        console.log(`🏢 Organization: ${currentOrganization}`);
        console.log('');
        
        const startTime = Date.now();
        
        try {
            // Step 1: Generate team members
            const teamMembers = await this.generateTeamMembers();
            await this.delay(200);
            
            // Step 2: Generate projects
            const projects = await this.generateProjects();
            await this.delay(200);
            
            // Step 3: Generate tasks for each project
            const allTasks = [];
            const allSprints = [];
            
            for (const project of projects) {
                const tasks = await this.generateTasks(project, teamMembers);
                allTasks.push(...tasks);
                await this.delay(100);
                
                const sprints = await this.generateSprints(project, tasks, teamMembers);
                allSprints.push(...sprints);
                await this.delay(100);
            }
            
            // Step 4: Generate activity logs
            await this.generateActivityLog(allTasks, projects, allSprints);
            
            // Step 5: Invalidate cache and reload
            invalidateCache();
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            
            console.log('');
            console.log('🎉 ========================================');
            console.log('🎉 GENERATION COMPLETE!');
            console.log('🎉 ========================================');
            console.log(`⏱️  Duration: ${duration}s`);
            console.log(`👥 Team Members: ${teamMembers.length}`);
            console.log(`📁 Projects: ${projects.length}`);
            console.log(`📝 Total Tasks: ${allTasks.length}`);
            console.log(`💬 Tasks with comments: ${allTasks.filter(t => Math.random() < 0.4).length} (approx)`);
            console.log(`🏃 Sprints: ${allSprints.length}`);
            console.log('');
            console.log('🔄 Reloading dashboard in 2 seconds...');
            
            setTimeout(() => {
                location.reload();
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error generating test data:', error);
            console.error(error.stack);
        }
    },

    // ============================================
    // CLEANUP FUNCTION
    // ============================================

    async clearAllTestData() {
        console.log('🗑️  Clearing all test data...');
        
        if (!confirm('This will delete ALL data in your current organization. Are you sure?')) {
            console.log('❌ Cancelled.');
            return;
        }
        
        if (prompt('Type "DELETE ALL" to confirm:') !== 'DELETE ALL') {
            console.log('❌ Cancelled.');
            return;
        }
        
        try {
            // Delete tasks and comments
            const tasksSnapshot = await db.collection('tasks')
                .where('projectId', '>=', '')
                .get();
            
            for (const doc of tasksSnapshot.docs) {
                const commentsSnapshot = await db.collection('comments')
                    .where('taskId', '==', doc.id)
                    .get();
                commentsSnapshot.forEach(c => c.ref.delete());
                await doc.ref.delete();
            }
            
            // Delete sprints
            const sprintsSnapshot = await db.collection('sprints')
                .where('organizationId', '==', currentOrganization)
                .get();
            sprintsSnapshot.forEach(doc => doc.ref.delete());
            
            // Delete projects
            const projectsSnapshot = await db.collection('projects')
                .where('organizationId', '==', currentOrganization)
                .get();
            projectsSnapshot.forEach(doc => doc.ref.delete());
            
            // Delete activity logs
            const logsSnapshot = await db.collection('activity_logs')
                .where('organizationId', '==', currentOrganization)
                .get();
            logsSnapshot.forEach(doc => doc.ref.delete());
            
            console.log('✅ All test data cleared! Reloading...');
            setTimeout(() => location.reload(), 1000);
            
        } catch (error) {
            console.error('❌ Error clearing data:', error);
        }
    }
};

// ============================================
// USAGE INSTRUCTIONS
// ============================================
console.log('📋 Test Data Generator Ready!');
console.log('');
console.log('Commands:');
console.log('  testDataGenerator.generateAll()     - Generate all test data');
console.log('  testDataGenerator.clearAllTestData() - Delete all test data');
console.log('');
console.log('⚠️  Make sure you are logged in and have an organization selected.');