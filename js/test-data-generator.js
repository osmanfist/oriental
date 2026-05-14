/**
 * Oriental - Test Data Generator
 * Thoroughly populates the workspace with projects, tasks, sprints, and activity.
 */

class OrientalTestDataGenerator {
    constructor() {
        this.projectNames = ["Project Phoenix", "Project Alpha", "Mobile Refactor", "Marketing Q3", "Design System"];
        this.taskTemplates = [
            { title: "Design Landing Page", tags: "design, ui", priority: "high", est: 8 },
            { title: "Fix Auth Bug", tags: "bug, security", priority: "high", est: 4 },
            { title: "Weekly Report", tags: "admin", priority: "low", est: 2 },
            { title: "Setup CI/CD", tags: "devops", priority: "medium", est: 6 },
            { title: "Refactor Database", tags: "backend", priority: "high", est: 12 },
            { title: "User Interview", tags: "research", priority: "medium", est: 3 },
            { title: "Write API Docs", tags: "docs", priority: "low", est: 5 }
        ];
        this.commentPool = [
            "Great progress on this! @${name} check this out.",
            "I'm blocked on this until the API is ready.",
            "Approved for production.",
            "Can we reconsider the priority here?",
            "Moving this to In Progress.",
            "@${name} please review the milestones."
        ];
    }

    async generateAll() {
        if (!currentUser || !currentOrganization) {
            showToast("Please ensure you are logged in and in an organization.", "error");
            return;
        }

        console.log("🚀 Starting Comprehensive Test Data Generation...");
        showToast("Generating test data...", "info");

        try {
            // 1. Ensure we have team members to assign things to
            if (teamMembers.length < 2) {
                console.log("⚠️ Low team member count. Data might look sparse.");
            }

            // 2. Generate Projects
            const projects = [];
            for (let i = 0; i < 3; i++) {
                const pName = this.projectNames[i];
                console.log(`Creating project: ${pName}`);
                const success = await createProject({
                    name: pName,
                    description: `Automated test project for ${pName}.`,
                    color: ['#14b8a6', '#8b5cf6', '#f59e0b', '#3b82f6'][i % 4]
                });
                
                // Since createProject updates global state, we fetch the latest project
                const snapshot = await db.collection('projects')
                    .where('organizationId', '==', currentOrganization)
                    .where('name', '==', pName)
                    .limit(1).get();
                
                if (!snapshot.empty) projects.push({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
            }

            // 3. Generate Tasks, Milestones, and Comments for each project
            for (const project of projects) {
                currentProject = project; // Set global context
                console.log(`Generating data for ${project.name}...`);

                const taskIds = [];
                for (let i = 0; i < 8; i++) {
                    const template = this.taskTemplates[Math.floor(Math.random() * this.taskTemplates.length)];
                    const status = ['planned', 'started', 'in-progress', 'waiting', 'done'][Math.floor(Math.random() * 5)];
                    const assignee = teamMembers.length > 0 ? teamMembers[Math.floor(Math.random() * teamMembers.length)].name : null;
                    
                    // Add some random milestones
                    const milestones = [
                        { id: 'm1', name: 'Drafting', completed: Math.random() > 0.5, createdAt: new Date().toISOString() },
                        { id: 'm2', name: 'Review', completed: Math.random() > 0.8, createdAt: new Date().toISOString() }
                    ];

                    const taskData = {
                        title: `${template.title} #${i + 1}`,
                        description: `Automatically generated description for ${template.title}.`,
                        priority: template.priority,
                        assignedTo: assignee,
                        dueDate: new Date(Date.now() + (Math.random() * 10 - 5) * 86400000).toISOString().split('T')[0],
                        estimatedHours: template.est,
                        tags: template.tags
                    };

                    // Directly add to bypass UI resets but use the logic
                    const matchedMember = teamMembers.find(m => m.name === taskData.assignedTo);
                    const taskId = await db.collection('tasks').add({
                        ...taskData,
                        projectId: project.id,
                        status: status,
                        assignedToId: matchedMember ? matchedMember.id : null,
                        milestones: milestones,
                        tags: taskData.tags.split(',').map(t => t.trim()),
                        order: Date.now() + i,
                        createdBy: currentUser.uid,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    taskIds.push(taskId.id);

                    // Log activity manually for the generation
                    await logActivity('create_task', 'task', taskId.id, taskData.title);

                    // Add random comment with @mention if system available
                    if (Math.random() > 0.4 && teamMembers.length > 0) {
                        const targetUser = teamMembers[Math.floor(Math.random() * teamMembers.length)];
                        const commentText = this.commentPool[Math.floor(Math.random() * this.commentPool.length)]
                            .replace('${name}', targetUser.name);
                        
                        await addComment(taskId.id, commentText);
                    }
                }

                // 4. Create a Sprint and assign some tasks
                console.log(`Starting sprint for ${project.name}`);
                const sprintName = `${project.name} - Sprint 1`;
                await createSprint({
                    name: sprintName,
                    goal: "Complete initial core features.",
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(Date.now() + 1209600000).toISOString().split('T')[0]
                });

                // Fetch the sprint we just created
                const sprintSnap = await db.collection('sprints')
                    .where('projectId', '==', project.id)
                    .where('name', '==', sprintName)
                    .limit(1).get();

                if (!sprintSnap.empty) {
                    const sprintId = sprintSnap.docs[0].id;
                    const selectedTasks = taskIds.slice(0, 4);
                    await db.collection('sprints').doc(sprintId).update({
                        tasks: selectedTasks
                    });
                }

                // 5. Create a Recurring Task Template
                if (window.recurringManager) {
                    console.log(`Setting up recurring task for ${project.name}`);
                    await window.recurringManager.createRecurringTaskTemplate({
                        projectId: project.id,
                        title: `Monthly Audit - ${project.name}`,
                        description: "Standard security and performance audit.",
                        priority: "medium",
                        estimatedHours: 4,
                        tags: ["audit", "system"]
                    }, {
                        frequency: "monthly",
                        interval: 1,
                        startDate: new Date().toISOString().split('T')[0],
                        endType: "never"
                    });
                }
            }

            // 6. Use a built-in template for one final project
            if (window.TemplatesLibrary) {
                console.log("Using 'agile' project template...");
                await useProjectTemplate('agile');
            }

            showToast("Test data generated successfully!", "success");
            console.log("✅ Generation complete. Refreshing view...");
            
            // Re-initialize view
            await loadProjectsOptimized();
            if (currentProject) await loadTasks(true);
            
        } catch (error) {
            console.error("❌ Generation failed:", error);
            showToast("Error generating test data", "error");
        }
    }

    async clearAllTestData() {
        const confirm = await showConfirmDialog("Wipe Data", "Are you sure? This will delete ALL projects, tasks, sprints, and logs for this organization.", "danger");
        if (!confirm) return;

        showToast("Wiping data...", "warning");
        
        try {
            const batch = db.batch();
            
            const collections = ['tasks', 'projects', 'sprints', 'comments', 'activity_logs', 'recurring_templates', 'attachments'];
            
            for (const coll of collections) {
                const snap = await db.collection(coll).where('organizationId', '==', currentOrganization).get();
                snap.forEach(doc => batch.delete(doc.ref));
            }

            // Also catch tasks by projectId if organizationId wasn't set correctly on some
            const projectsSnap = await db.collection('projects').where('organizationId', '==', currentOrganization).get();
            for (const pDoc of projectsSnap.docs) {
                const taskSnap = await db.collection('tasks').where('projectId', '==', pDoc.id).get();
                taskSnap.forEach(tDoc => batch.delete(tDoc.ref));
            }

            await batch.commit();
            invalidateCache();
            showToast("Workspace wiped clean.", "success");
            location.reload();
        } catch (error) {
            console.error("Clear failed:", error);
            showToast("Error wiping data", "error");
        }
    }
}

// Initialize and attach to window
window.orientalGenerator = new OrientalTestDataGenerator();

console.log(`
🛠️ Oriental Test Data Generator Loaded!
------------------------------------------
To generate a full dataset, run:
> await orientalGenerator.generateAll()

To wipe your organization data, run:
> await orientalGenerator.clearAllTestData()
------------------------------------------
`);