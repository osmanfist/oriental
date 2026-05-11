# Oriental API Reference

> Version: 2.3.0 | Last Updated: 2026-05-11

## Overview

Oriental uses Firebase Firestore as its backend. This document describes the complete data schema, available operations, and all feature APIs.

## Firebase Configuration

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
```

---

## Firestore Database Schema

### Users Collection

**Collection ID:** `users`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | User's display name |
| `email` | string | User's email address |
| `role` | enum | `admin`, `manager`, `member`, `viewer` |
| `currentOrganization` | string | Currently selected organization ID |
| `organizations` | array | Array of organization IDs the user belongs to |
| `createdAt` | timestamp | Account creation timestamp |
| `preferences` | object | User preferences |

**preferences Object:**
```json
{
    "notifications": true,
    "notifyTaskAssigned": true,
    "notifyTaskCompleted": true,
    "notifyCommentMention": true,
    "notifyProjectUpdates": true,
    "notifySprintUpdates": true,
    "digestFrequency": "weekly",
    "digestTime": "08:00",
    "theme": "system",
    "density": "comfortable",
    "showTaskCounts": true,
    "defaultView": "board",
    "defaultPriority": "medium",
    "autoAssignTasks": false
}
```

**Example Document:**
```json
{
    "name": "Sarah Chen",
    "email": "sarah@example.com",
    "role": "manager",
    "currentOrganization": "org_abc123",
    "organizations": ["org_abc123", "org_xyz789"],
    "createdAt": "2026-01-15T10:30:00Z",
    "preferences": {
        "theme": "dark",
        "defaultView": "board",
        "notifications": true
    }
}
```

---

### Organizations Collection

**Collection ID:** `organizations`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Organization name |
| `slug` | string | URL-friendly identifier |
| `createdBy` | string | User ID of creator |
| `createdAt` | timestamp | Creation timestamp |
| `updatedAt` | timestamp | Last update timestamp |
| `members` | array | Array of user IDs in the organization |
| `settings` | object | Organization settings |

**Example Document:**
```json
{
    "name": "Acme Inc",
    "slug": "acme-inc",
    "createdBy": "user_abc123",
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-05-10T14:22:00Z",
    "members": ["user_abc123", "user_def456"],
    "settings": {
        "defaultView": "board",
        "defaultRole": "member",
        "inviteExpiry": 7
    }
}
```

---

### Projects Collection

**Collection ID:** `projects`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Project name |
| `description` | string | Project description |
| `organizationId` | string | Parent organization ID |
| `createdBy` | string | User ID of creator |
| `createdAt` | timestamp | Creation timestamp |
| `isArchived` | boolean | Whether project is archived |
| `color` | string | Project color (hex code) |

**Example Document:**
```json
{
    "name": "Website Redesign",
    "description": "Complete overhaul of company website",
    "organizationId": "org_abc123",
    "createdBy": "user_abc123",
    "createdAt": "2026-02-01T09:00:00Z",
    "isArchived": false,
    "color": "#0ea5e9"
}
```

---

### Tasks Collection

**Collection ID:** `tasks`

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Task title |
| `description` | string | Task description (supports @mentions) |
| `status` | enum | `planned`, `started`, `in-progress`, `waiting`, `done` |
| `priority` | enum | `low`, `medium`, `high` |
| `assignedTo` | string | User name of assignee |
| `assignedToId` | string | User ID of assignee |
| `dueDate` | string | ISO date string (YYYY-MM-DD) |
| `estimatedHours` | number | Estimated hours to complete |
| `tags` | array | Array of tag strings |
| `milestones` | array | Array of milestone objects |
| `milestones[].id` | string | Unique milestone ID |
| `milestones[].name` | string | Milestone description |
| `milestones[].completed` | boolean | Completion status |
| `milestones[].createdAt` | string | ISO creation timestamp |
| `projectId` | string | Parent project ID |
| `createdBy` | string | User ID of creator |
| `createdAt` | timestamp | Creation timestamp |
| `updatedAt` | timestamp | Last update timestamp |
| `order` | number | Display order |
| `recurringTemplateId` | string | Reference to recurring template |

**Status Flow:**
```
planned → started → in-progress → waiting → done
                                  ↑          │
                                  └──────────┘ (reopened)
```

**Example Document:**
```json
{
    "title": "Design homepage mockup",
    "description": "Create Figma mockups for new homepage",
    "status": "in-progress",
    "priority": "high",
    "assignedTo": "Sarah Chen",
    "assignedToId": "user_abc123",
    "dueDate": "2026-05-20",
    "estimatedHours": 8,
    "tags": ["design", "frontend"],
    "milestones": [
        { "id": "ms-001", "name": "Wireframe approval", "completed": true, "createdAt": "2026-05-01" },
        { "id": "ms-002", "name": "High-fidelity design", "completed": false, "createdAt": "2026-05-01" },
        { "id": "ms-003", "name": "Stakeholder review", "completed": false, "createdAt": "2026-05-01" }
    ],
    "projectId": "proj_123",
    "createdBy": "user_manager",
    "createdAt": "2026-05-01T10:00:00Z",
    "updatedAt": "2026-05-10T15:30:00Z",
    "order": 1
}
```

---

### Comments Collection

**Collection ID:** `comments`

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | Comment text (supports @mentions) |
| `taskId` | string | Parent task ID |
| `userId` | string | Author user ID |
| `userName` | string | Author display name |
| `createdAt` | timestamp | Creation timestamp |

**Example Document:**
```json
{
    "content": "Wireframes approved. Moving to high-fidelity design. @john please review.",
    "taskId": "task_456",
    "userId": "user_abc123",
    "userName": "Sarah Chen",
    "createdAt": "2026-05-10T14:00:00Z"
}
```

---

### Attachments Collection

**Collection ID:** `attachments`

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | string | Parent task ID |
| `organizationId` | string | Organization ID |
| `fileName` | string | Original file name |
| `fileSize` | number | Size in bytes (max 1MB for Base64) |
| `fileType` | string | MIME type |
| `base64Data` | string | Base64 encoded file data |
| `uploadedBy` | string | Uploader user ID |
| `uploadedByName` | string | Uploader display name |
| `uploadedAt` | timestamp | Upload timestamp |

---

### Sprints Collection

**Collection ID:** `sprints`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Sprint name |
| `goal` | string | Sprint goal |
| `organizationId` | string | Parent organization ID |
| `projectId` | string | Parent project ID |
| `startDate` | string | Sprint start date (ISO) |
| `endDate` | string | Sprint end date (ISO) |
| `status` | enum | `active`, `completed` |
| `tasks` | array | Array of task IDs in sprint |
| `createdAt` | timestamp | Creation timestamp |
| `completedAt` | timestamp | Completion timestamp |

---

### Activity Logs Collection

**Collection ID:** `activity_logs`

| Field | Type | Description |
|-------|------|-------------|
| `action` | string | Action type |
| `entityType` | string | Type of entity acted upon |
| `entityId` | string | ID of the entity |
| `entityName` | string | Name/title of the entity |
| `organizationId` | string | Organization ID |
| `userId` | string | User who performed action |
| `userName` | string | User's display name |
| `userEmail` | string | User's email |
| `details` | object | Additional action details |
| `createdAt` | timestamp | Action timestamp |

**Action Types:**
`create_task`, `update_task`, `delete_task`, `complete_task`, `assign_task`, `create_project`, `update_project`, `delete_project`, `add_comment`, `create_sprint`, `complete_sprint`, `upload_attachment`, `delete_attachment`

---

### Invites Collection

**Collection ID:** `invites`

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | Invited email address |
| `organizationId` | string | Organization ID |
| `organizationName` | string | Organization name |
| `role` | enum | `admin`, `manager`, `member`, `viewer` |
| `invitedBy` | string | User ID of inviter |
| `token` | string | Unique invite token |
| `status` | enum | `pending`, `accepted`, `cancelled`, `expired` |
| `expiresAt` | timestamp | Expiration timestamp |
| `createdAt` | timestamp | Creation timestamp |

---

### Recurring Templates Collection

**Collection ID:** `recurring_templates`

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | string | Target project ID |
| `title` | string | Task title template |
| `description` | string | Task description template |
| `priority` | enum | `low`, `medium`, `high` |
| `assignedTo` | string | Default assignee name |
| `estimatedHours` | number | Default estimated hours |
| `tags` | array | Default tags |
| `isRecurring` | boolean | Always true |
| `recurrenceConfig` | object | Recurrence configuration |
| `nextOccurrence` | string | Next occurrence date (ISO) |
| `occurrencesCreated` | number | Count of tasks generated |
| `createdBy` | string | Creator user ID |
| `organizationId` | string | Organization ID |

**recurrenceConfig Object:**
```json
{
    "frequency": "weekly",
    "interval": 1,
    "startDate": "2026-05-01",
    "endType": "after",
    "occurrences": 12,
    "weekdays": [1, 3, 5]
}
```

---

### Custom Templates Collection

**Collection ID:** `custom_templates`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Template name |
| `description` | string | Template description |
| `type` | enum | `project`, `task` |
| `projectData` | object | Project configuration |
| `tasks` | array | Array of task templates |
| `createdBy` | string | Creator user ID |
| `organizationId` | string | Organization ID |
| `createdAt` | timestamp | Creation timestamp |

---

## JavaScript API Reference

### Permission System (v2.3.0)

```javascript
const PERMISSIONS = {
    viewer:  { viewTasks: true, viewProjects: true, viewReports: true, completeTasks: false, comment: false, createTasks: false, deleteTasks: false, createSprints: false, manageTeam: false, createProjects: false, deleteProjects: false },
    member:  { viewTasks: true, viewProjects: true, viewReports: true, completeTasks: true,  comment: true,  createTasks: false, deleteTasks: false, createSprints: false, manageTeam: false, createProjects: false, deleteProjects: false },
    manager: { viewTasks: true, viewProjects: true, viewReports: true, completeTasks: true,  comment: true,  createTasks: true,  deleteTasks: true,  createSprints: true,  manageTeam: false, createProjects: false, deleteProjects: false },
    admin:   { viewTasks: true, viewProjects: true, viewReports: true, completeTasks: true,  comment: true,  createTasks: true,  deleteTasks: true,  createSprints: true,  manageTeam: true,  createProjects: true,  deleteProjects: true }
};

// Check permission
function can(permission) {
    const perms = PERMISSIONS[currentUserRole];
    return perms[permission] || false;
}

// Guard action with permission
function requirePermission(permission) {
    if (!can(permission)) {
        showToast('You do not have permission to perform this action', 'error');
        return false;
    }
    return true;
}
```

### Task Operations

```javascript
// Create task with milestones
async function createTask(taskData) {
    if (!requirePermission('createTasks')) return false;

    const task = {
        ...taskData,
        status: 'planned',
        milestones: taskData.milestones || [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    return await db.collection('tasks').add(task);
}

// Update task status (drag-and-drop)
async function moveTask(taskId, newStatus) {
    await db.collection('tasks').doc(taskId).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// Toggle milestone completion
async function toggleMilestone(taskId, milestoneIndex) {
    const taskDoc = await db.collection('tasks').doc(taskId).get();
    const task = taskDoc.data();
    const milestones = task.milestones || [];
    milestones[milestoneIndex].completed = !milestones[milestoneIndex].completed;
    await db.collection('tasks').doc(taskId).update({ milestones });
}

// Calculate task progress
function calculateTaskProgress(task) {
    const milestones = task.milestones || [];
    if (milestones.length === 0) return null;
    const completed = milestones.filter(m => m.completed).length;
    return {
        percent: Math.round((completed / milestones.length) * 100),
        text: `${completed}/${milestones.length}`
    };
}

// Get due date display
function getDueDateInfo(dueDate, taskStatus) {
    if (!dueDate || taskStatus === 'done') return { html: '' };
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(dueDate); due.setHours(0,0,0,0);
    const diffDays = Math.ceil((due - today) / (1000*60*60*24));
    if (diffDays < 0) return { html: `<span class="overdue">+${Math.abs(diffDays)}d</span>`, isOverdue: true };
    if (diffDays === 0) return { html: '<span class="due-today">Today</span>' };
    return { html: `<span class="ahead">-${diffDays}d</span>`, isOverdue: false };
}
```

### Reports API

```javascript
// All 8 chart renderers
renderCompletionTrendChart(tasks, dateFilter)
renderPriorityDistributionChart(tasks)
renderTeamPerformanceChart(tasks)
renderBurndownChart(tasks)
renderCumulativeFlowChart(tasks, dateFilter)
renderTaskAgingChart(tasks)
renderWorkloadChart(tasks)
renderVelocityChart(tasks, dateFilter)

// Export functions
exportToCSV()     // Downloads CSV of filtered tasks
exportToPDF()     // Opens print dialog
exportChart(id)   // Downloads chart as PNG
```

---

## Permission Matrix

| Permission | Viewer | Member | Manager | Admin |
|-----------|--------|--------|---------|-------|
| View tasks & projects | ✅ | ✅ | ✅ | ✅ |
| View reports | ✅ | ✅ | ✅ | ✅ |
| Complete tasks & milestones | ❌ | ✅ | ✅ | ✅ |
| Add comments & @mentions | ❌ | ✅ | ✅ | ✅ |
| Create tasks | ❌ | ❌ | ✅ | ✅ |
| Delete tasks | ❌ | ❌ | ✅ | ✅ |
| Create & manage sprints | ❌ | ❌ | ✅ | ✅ |
| Create projects | ❌ | ❌ | ❌ | ✅ |
| Delete projects | ❌ | ❌ | ❌ | ✅ |
| Manage team members | ❌ | ❌ | ❌ | ✅ |
| Access danger zone | ❌ | ❌ | ❌ | ✅ |

---

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Users - read all, write own
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Organizations - members only
    match /organizations/{orgId} {
      allow read, write: if isAuthenticated() && 
        request.auth.uid in resource.data.members;
    }
    
    // All other collections - authenticated users
    match /{document=**} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

---

## Error Codes

| Code | Description | User Message |
|------|-------------|-------------|
| `auth/invalid-email` | Invalid email format | "Please enter a valid email" |
| `auth/user-not-found` | No account exists | "Account not found. Sign up?" |
| `auth/wrong-password` | Incorrect password | "Incorrect password" |
| `auth/email-already-in-use` | Email taken | "Email already registered" |
| `auth/weak-password` | Password too short | "Password must be 6+ characters" |
| `auth/popup-blocked` | Popup blocked | "Allow popups and try again" |
| `permission-denied` | Firestore rule blocked | "You don't have access" |
| `unavailable` | Network offline | "Check your connection" |
