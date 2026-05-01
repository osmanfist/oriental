# Oriental API Reference

> Version: 2.0.0 | Last Updated: 2026

## Overview

Oriental uses Firebase Firestore as its backend. This document describes the complete data schema, available operations, and Phase 1 feature APIs.

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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage(); // Optional - Phase 1 uses Base64
```

---

## Firestore Database Schema

### Users Collection

**Collection ID:** `users`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | User's display name |
| `email` | string | User's email address |
| `currentOrganization` | string | Currently selected organization ID |
| `organizations` | array | Array of organization IDs the user belongs to |
| `createdAt` | timestamp | Account creation timestamp |
| `preferences` | object | User preferences (notifications, theme, etc.) |
| `avatar` | string | Optional - Avatar URL or Base64 |

**preferences Object:**
```json
{
    "notifications": true,
    "emailDigest": "daily",
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
    "name": "John Doe",
    "email": "john@example.com",
    "currentOrganization": "org_abc123",
    "organizations": ["org_abc123", "org_xyz789"],
    "createdAt": "2026-01-15T10:30:00Z",
    "preferences": {
        "notifications": true,
        "notifyCommentMention": true,
        "theme": "dark",
        "defaultView": "board"
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
| `admins` | array | Array of admin user IDs |
| `settings` | object | Organization settings |

**Example Document:**
```json
{
    "name": "Acme Inc",
    "slug": "acme-inc",
    "createdBy": "user_abc123",
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-02-20T14:22:00Z",
    "members": ["user_abc123", "user_def456", "user_ghi789"],
    "admins": ["user_abc123"],
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
| `color` | string | Project color (hex) |
| `fromTemplate` | string | Template ID if created from template |

**Example Document:**
```json
{
    "name": "Website Redesign",
    "description": "Complete overhaul of company website",
    "organizationId": "org_abc123",
    "createdBy": "user_abc123",
    "createdAt": "2026-02-01T09:00:00Z",
    "isArchived": false,
    "color": "#16a34a",
    "fromTemplate": "agile-dev"
}
```

---

### Tasks Collection

**Collection ID:** `tasks`

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Task title |
| `description` | string | Task description (supports @mentions) |
| `status` | enum | `todo`, `in-progress`, `done` |
| `priority` | enum | `low`, `medium`, `high` |
| `assignedTo` | string | User name of assignee |
| `assignedToId` | string | User ID of assignee |
| `dueDate` | string | ISO date string (YYYY-MM-DD) |
| `estimatedHours` | number | Estimated hours to complete |
| `tags` | array | Array of tag strings |
| `projectId` | string | Parent project ID |
| `createdBy` | string | User ID of creator |
| `createdAt` | timestamp | Creation timestamp |
| `updatedAt` | timestamp | Last update timestamp |
| `order` | number | Display order |
| `recurringTemplateId` | string | Reference to recurring template (Phase 1) |
| `occurrenceNumber` | number | Which occurrence this is (Phase 1) |
| `isTestData` | boolean | Flag for test data cleanup |

**Example Document:**
```json
{
    "title": "Design homepage mockup",
    "description": "Create Figma mockups for new homepage design. @sarah to review",
    "status": "in-progress",
    "priority": "high",
    "assignedTo": "John Doe",
    "assignedToId": "user_abc123",
    "dueDate": "2026-03-15",
    "estimatedHours": 8,
    "tags": ["design", "frontend", "priority"],
    "projectId": "proj_123",
    "createdBy": "user_manager",
    "createdAt": "2026-03-01T10:00:00Z",
    "updatedAt": "2026-03-10T15:30:00Z",
    "order": 1,
    "recurringTemplateId": "recur_daily_standup",
    "occurrenceNumber": 5
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
    "content": "I've updated the design. @jane can you review?",
    "taskId": "task_456",
    "userId": "user_abc123",
    "userName": "John Doe",
    "createdAt": "2026-03-10T14:00:00Z"
}
```

---

### Attachments Collection (Phase 1)

**Collection ID:** `attachments`

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | string | Parent task ID |
| `organizationId` | string | Organization ID |
| `fileName` | string | Original file name |
| `fileSize` | number | Size in bytes (max 1MB) |
| `fileType` | string | MIME type |
| `base64Data` | string | Base64 encoded file data |
| `uploadedBy` | string | Uploader user ID |
| `uploadedByName` | string | Uploader display name |
| `uploadedAt` | timestamp | Upload timestamp |
| `isTestData` | boolean | Flag for test data cleanup |

**Example Document:**
```json
{
    "taskId": "task_456",
    "organizationId": "org_abc123",
    "fileName": "homepage-mockup.png",
    "fileSize": 245760,
    "fileType": "image/png",
    "base64Data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "uploadedBy": "user_abc123",
    "uploadedByName": "John Doe",
    "uploadedAt": "2026-03-10T16:00:00Z"
}
```

---

### Recurring Templates Collection (Phase 1)

**Collection ID:** `recurring_templates`

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | string | Target project ID |
| `title` | string | Task title template |
| `description` | string | Task description template |
| `priority` | enum | `low`, `medium`, `high` |
| `assignedTo` | string | Default assignee name |
| `assignedToId` | string | Default assignee ID |
| `estimatedHours` | number | Default estimated hours |
| `tags` | array | Default tags |
| `isRecurring` | boolean | Always true for this collection |
| `recurrenceConfig` | object | Recurrence configuration |
| `nextOccurrence` | string | Next occurrence date (ISO) |
| `occurrencesCreated` | number | Count of tasks created |
| `createdBy` | string | Creator user ID |
| `organizationId` | string | Organization ID |
| `createdAt` | timestamp | Creation timestamp |
| `lastGenerated` | timestamp | Last generation timestamp |
| `isTestData` | boolean | Flag for test data cleanup |

**recurrenceConfig Object:**
```json
{
    "frequency": "weekly",
    "interval": 2,
    "startDate": "2026-03-01",
    "endType": "after",
    "occurrences": 10,
    "weekdays": [1, 3, 5]
}
```

**Example Document:**
```json
{
    "projectId": "proj_123",
    "title": "Weekly Team Sync",
    "description": "Review progress and blockers with the team. @team",
    "priority": "medium",
    "assignedTo": "Team Lead",
    "assignedToId": "user_lead",
    "isRecurring": true,
    "recurrenceConfig": {
        "frequency": "weekly",
        "interval": 1,
        "startDate": "2026-01-08",
        "endType": "never",
        "weekdays": [1]
    },
    "nextOccurrence": "2026-03-18",
    "occurrencesCreated": 10,
    "createdBy": "user_lead",
    "organizationId": "org_abc123",
    "createdAt": "2026-01-01T09:00:00Z"
}
```

---

### Custom Templates Collection (Phase 1)

**Collection ID:** `custom_templates`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Template name |
| `description` | string | Template description |
| `type` | enum | `project`, `task` |
| `projectData` | object | Project configuration (for project templates) |
| `tasks` | array | Array of task templates |
| `createdBy` | string | Creator user ID |
| `organizationId` | string | Organization ID |
| `createdAt` | timestamp | Creation timestamp |

**Example Document:**
```json
{
    "name": "Sprint Planning Template",
    "description": "Standard sprint planning tasks",
    "type": "project",
    "projectData": {
        "description": "Sprint planning and execution"
    },
    "tasks": [
        {
            "title": "Sprint Planning Meeting",
            "description": "Define sprint goals and select backlog items",
            "priority": "high"
        },
        {
            "title": "Daily Standup",
            "description": "Daily team sync",
            "priority": "medium"
        }
    ],
    "createdBy": "user_scrum",
    "organizationId": "org_abc123",
    "createdAt": "2026-02-15T11:00:00Z"
}
```

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

**Example Document:**
```json
{
    "name": "Sprint 5 - Authentication",
    "goal": "Complete user authentication flow",
    "organizationId": "org_abc123",
    "projectId": "proj_123",
    "startDate": "2026-03-01",
    "endDate": "2026-03-14",
    "status": "active",
    "tasks": ["task_001", "task_002", "task_003"],
    "createdAt": "2026-03-01T09:00:00Z"
}
```

---

### Activity Logs Collection

**Collection ID:** `activity_logs`

| Field | Type | Description |
|-------|------|-------------|
| `action` | string | Action type |
| `entityType` | string | Type of entity |
| `entityId` | string | ID of the entity |
| `entityName` | string | Name/title of the entity |
| `organizationId` | string | Organization ID |
| `userId` | string | User who performed action |
| `userName` | string | User's display name |
| `userEmail` | string | User's email |
| `details` | object | Additional action details |
| `createdAt` | timestamp | Action timestamp |

**Action Types:**
- `create_task`, `update_task`, `delete_task`, `complete_task`, `assign_task`
- `create_project`, `update_project`, `delete_project`
- `add_comment`, `mention_user`
- `upload_attachment`, `delete_attachment`
- `create_sprint`, `complete_sprint`
- `create_recurring_task`
- `invite_sent`, `invite_accepted`, `invite_cancelled`
- `export_data`, `update_organization`

**Example Document:**
```json
{
    "action": "mention_user",
    "entityType": "comment",
    "entityId": "comment_789",
    "entityName": "Homepage design task",
    "organizationId": "org_abc123",
    "userId": "user_abc123",
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "details": {
        "mentionedUser": "Jane Smith",
        "mentionedUserId": "user_def456"
    },
    "createdAt": "2026-03-10T14:00:00Z"
}
```

---

### Invites Collection

**Collection ID:** `invites`

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | Invited email address |
| `organizationId` | string | Organization ID |
| `organizationName` | string | Organization name |
| `role` | enum | `admin`, `member`, `viewer` |
| `invitedBy` | string | User ID of inviter |
| `invitedByEmail` | string | Inviter's email |
| `token` | string | Unique invite token |
| `status` | enum | `pending`, `accepted`, `cancelled`, `expired` |
| `expiresAt` | timestamp | Expiration timestamp |
| `createdAt` | timestamp | Creation timestamp |
| `acceptedAt` | timestamp | Acceptance timestamp |
| `acceptedBy` | string | User ID of acceptor |

**Example Document:**
```json
{
    "email": "newmember@example.com",
    "organizationId": "org_abc123",
    "organizationName": "Acme Inc",
    "role": "member",
    "invitedBy": "user_admin",
    "invitedByEmail": "admin@example.com",
    "token": "abc123xyz789",
    "status": "pending",
    "expiresAt": "2026-03-24T09:00:00Z",
    "createdAt": "2026-03-17T09:00:00Z"
}
```

---

## JavaScript API Reference

### Authentication

```javascript
// Email/Password Login
await auth.signInWithEmailAndPassword(email, password);

// Email/Password Signup
await auth.createUserWithEmailAndPassword(email, password);

// Google Sign-in
const provider = new firebase.auth.GoogleAuthProvider();
await auth.signInWithPopup(provider);

// Sign out
await auth.signOut();

// Get current user
const user = auth.currentUser;

// Auth state listener
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User signed in:', user.email);
    } else {
        console.log('User signed out');
    }
});
```

---

### Task Operations

```javascript
// Create task
async function createTask(taskData) {
    const task = {
        ...taskData,
        status: 'todo',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    return await db.collection('tasks').add(task);
}

// Update task
async function updateTask(taskId, updates) {
    return await db.collection('tasks').doc(taskId).update({
        ...updates,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// Delete task (with comments cleanup)
async function deleteTask(taskId) {
    const batch = db.batch();
    
    // Delete comments
    const comments = await db.collection('comments')
        .where('taskId', '==', taskId).get();
    comments.forEach(doc => batch.delete(doc.ref));
    
    // Delete attachments
    const attachments = await db.collection('attachments')
        .where('taskId', '==', taskId).get();
    attachments.forEach(doc => batch.delete(doc.ref));
    
    // Delete task
    batch.delete(db.collection('tasks').doc(taskId));
    
    return await batch.commit();
}

// Get tasks for project
async function getTasks(projectId) {
    const snapshot = await db.collection('tasks')
        .where('projectId', '==', projectId)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Real-time task subscription
function subscribeToTasks(projectId, callback) {
    return db.collection('tasks')
        .where('projectId', '==', projectId)
        .onSnapshot((snapshot) => {
            const tasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(tasks);
        });
}
```

---

### Project Operations

```javascript
// Create project
async function createProject(projectData) {
    const project = {
        ...projectData,
        isArchived: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    return await db.collection('projects').add(project);
}

// Get projects for organization
async function getProjects(organizationId) {
    const snapshot = await db.collection('projects')
        .where('organizationId', '==', organizationId)
        .where('isArchived', '==', false)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Archive project
async function archiveProject(projectId) {
    return await db.collection('projects').doc(projectId).update({
        isArchived: true
    });
}
```

---

### Comment Operations

```javascript
// Add comment
async function addComment(taskId, content) {
    const comment = {
        taskId: taskId,
        content: content,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    return await db.collection('comments').add(comment);
}

// Get comments for task
async function getComments(taskId) {
    const snapshot = await db.collection('comments')
        .where('taskId', '==', taskId)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Delete comment
async function deleteComment(commentId) {
    return await db.collection('comments').doc(commentId).delete();
}
```

---

### Phase 1 Feature APIs

#### Mentions System

```javascript
// Initialize mentions on input
mentionsSystem.initMentions(inputElement, {
    maxSuggestions: 8,
    onMention: (mention) => {
        console.log('User mentioned:', mention.userName);
        trackAnalytics('user_mentioned', { mentionedUserId: mention.userId });
    }
});

// Extract mentions from text
const mentions = mentionsSystem.extractMentions('Hello @john and @jane!');
// Returns: [{ userId: '...', userName: 'John', userEmail: 'john@...' }, ...]

// Highlight mentions in display
const html = mentionsSystem.highlightMentions('Hello @john!');
// Returns: 'Hello <span class="mention-highlight">@John</span>!'

// Send mention notifications
await mentionsSystem.sendMentionNotifications(
    taskId, 
    taskTitle, 
    mentionedUsers, 
    mentionerName
);
```

#### Attachments Manager

```javascript
// Initialize attachments UI
const manager = new AttachmentsManager();
manager.initAttachmentsUI('container-id', {
    taskId: currentTaskId,
    organizationId: currentOrganization,
    onAttachmentAdded: (attachment) => {
        console.log('File added:', attachment.fileName);
    },
    onAttachmentDeleted: (attachment) => {
        console.log('File deleted:', attachment.fileName);
    }
});

// Upload file as Base64
const file = document.getElementById('file-input').files[0];
await manager.uploadFileAsBase64(file);

// Load attachments
await manager.loadAttachments();

// Download attachment
manager.downloadAttachment(attachment);

// Delete attachment
await manager.deleteAttachment(attachment);

// Validate file
const isValid = manager.validateFile(file);
```

#### Recurring Tasks Manager

```javascript
// Enhance task form with recurrence options
const manager = new RecurringTasksManager();
manager.enhanceTaskForm();

// Get recurrence configuration from form
const config = manager.getRecurrenceConfig();
// Returns: { frequency: 'weekly', interval: 2, weekdays: [1,3,5] }

// Create recurring template
await manager.createRecurringTaskTemplate(taskData, recurrenceConfig);

// Calculate next occurrence
const nextDate = manager.calculateNextOccurrence('2026-03-01', {
    frequency: 'weekly',
    interval: 1
});

// Generate next occurrence (client-side)
await manager.generateNextOccurrence(templateId);

// Check and generate all due recurring tasks
await manager.checkAndGenerateRecurringTasks();
```

#### Templates Library

```javascript
// Open templates modal
const library = new TemplatesLibrary();
library.openTemplatesLibrary();

// Use project template
await window.useProjectTemplate('agile-dev');

// Use task template
window.useTaskTemplate('bug-report');

// Save current project as template
await library.saveCurrentProjectAsTemplate();

// Load custom templates
await library.loadCustomTemplates();

// Filter templates
library.filterTemplates(modal, 'marketing');
library.filterTemplatesByCategory(modal, 'software');
```

---

### Activity Logging

```javascript
// Log activity
async function logActivity(action, entityType, entityId, entityName, details = {}) {
    await db.collection('activity_logs').add({
        action: action,
        entityType: entityType,
        entityId: entityId,
        entityName: entityName,
        organizationId: currentOrganization,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        userEmail: currentUser.email,
        details: details,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// Usage examples
await logActivity('create_task', 'task', taskId, taskTitle);
await logActivity('mention_user', 'comment', taskId, taskTitle, { 
    mentionedUser: 'Jane Smith' 
});
await logActivity('upload_attachment', 'attachment', taskId, fileName);
```

---

### Invite Operations

```javascript
// Send invite
async function sendInvite(email, role) {
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    return await db.collection('invites').add({
        email: email.toLowerCase(),
        organizationId: currentOrganization,
        role: role,
        token: token,
        status: 'pending',
        expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// Accept invite
async function acceptInvite(token) {
    const snapshot = await db.collection('invites')
        .where('token', '==', token)
        .where('status', '==', 'pending')
        .limit(1)
        .get();
    
    if (snapshot.empty) throw new Error('Invalid or expired invite');
    
    const invite = snapshot.docs[0];
    const inviteData = invite.data();
    
    // Add user to organization
    await db.collection('organizations').doc(inviteData.organizationId).update({
        members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
    });
    
    // Update invite status
    await invite.ref.update({
        status: 'accepted',
        acceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
        acceptedBy: currentUser.uid
    });
}
```

---

### Utility Functions

```javascript
// Show toast notification
function showToast(message, type = 'info') {
    // types: 'success', 'error', 'warning', 'info'
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas fa-${getIcon(type)}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Track analytics
function trackAnalytics(eventName, eventParams = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventParams);
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Generate unique ID
function generateId() {
    return Math.random().toString(36).substring(2, 15) + 
           Date.now().toString(36);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
```

---

## Security Rules

### Firestore Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOrgMember(orgId) {
      return isAuthenticated() && 
        request.auth.uid in get(/databases/$(database)/documents/organizations/$(orgId)).data.members;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Organizations collection
    match /organizations/{orgId} {
      allow read, write: if isOrgMember(orgId);
    }
    
    // Projects collection
    match /projects/{projectId} {
      allow read, write: if isAuthenticated() && 
        isOrgMember(resource.data.organizationId);
    }
    
    // Tasks collection
    match /tasks/{taskId} {
      allow read, write: if isAuthenticated();
    }
    
    // Comments collection
    match /comments/{commentId} {
      allow read, write: if isAuthenticated();
    }
    
    // Attachments collection (Phase 1)
    match /attachments/{attachmentId} {
      allow read, write: if isAuthenticated();
    }
    
    // Recurring templates (Phase 1)
    match /recurring_templates/{templateId} {
      allow read, write: if isAuthenticated();
    }
    
    // Custom templates (Phase 1)
    match /custom_templates/{templateId} {
      allow read, write: if isAuthenticated();
    }
    
    // Sprints collection
    match /sprints/{sprintId} {
      allow read, write: if isAuthenticated();
    }
    
    // Activity logs
    match /activity_logs/{logId} {
      allow read, write: if isAuthenticated();
    }
    
    // Invites collection
    match /invites/{inviteId} {
      allow read: if true;
      allow write: if isAuthenticated();
    }
  }
}
```

---

## Rate Limits & Quotas

| Operation | Free Tier (Spark) | Blaze Plan |
|-----------|-------------------|------------|
| Firestore Reads | 50,000 / day | $0.06 per 100K |
| Firestore Writes | 20,000 / day | $0.18 per 100K |
| Firestore Deletes | 20,000 / day | $0.02 per 100K |
| Authentication | 50,000 MAU | $0.01 per additional |
| EmailJS | 200 / month | Paid tiers |
| File Attachment Size | 1MB (Base64) | Unlimited with Storage |

---

## Error Codes

| Code | Description |
|------|-------------|
| `auth/invalid-email` | Invalid email format |
| `auth/user-not-found` | User doesn't exist |
| `auth/wrong-password` | Incorrect password |
| `auth/email-already-in-use` | Email already registered |
| `auth/weak-password` | Password too weak |
| `auth/popup-blocked` | Popup blocked by browser |
| `auth/unauthorized-domain` | Domain not authorized |
| `permission-denied` | Firestore permission denied |
| `unavailable` | Network unavailable |
| `not-found` | Document not found |
| `already-exists` | Document already exists |
| `resource-exhausted` | Quota exceeded |
| `failed-precondition` | Operation failed precondition |

---

## Changelog

### Version 2.1.1 (Current)
- Fixed recurring tasks initialization
- Fixed mentions dropdown positioning
- Fixed attachments container placement
- Added auto-initialization for RecurringTasksManager
- Modular CSS architecture (12 files)

### Version 2.0.0 (Phase 1 Release)
- Added `attachments` collection for file storage
- Added `recurring_templates` collection
- Added `custom_templates` collection
- Added `mentions` support in comments
- Added `preferences` object to users collection
- Added `admins` array to organizations collection
- Added `recurringTemplateId` to tasks collection

### Version 1.0.0 (Initial Release)
- Core collections: users, organizations, projects, tasks, comments, sprints, activity_logs, invites
```
