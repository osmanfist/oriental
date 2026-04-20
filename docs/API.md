# API Reference

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

**Example Document:**
```json
{
    "name": "John Doe",
    "email": "john@example.com",
    "currentOrganization": "org_abc123",
    "organizations": ["org_abc123"],
    "createdAt": "2024-01-15T10:30:00Z",
    "preferences": {
        "notifications": true,
        "emailDigest": "daily"
    }
}

Organizations Collection

Collection ID: organizations
Field	Type	Description
name	string	Organization name
slug	string	URL-friendly identifier
createdBy	string	User ID of creator
createdAt	timestamp	Creation timestamp
members	array	Array of user IDs in the organization
settings	object	Organization settings

Example Document:
json

{
    "name": "Acme Inc",
    "slug": "acme-inc",
    "createdBy": "user_abc123",
    "createdAt": "2024-01-15T10:30:00Z",
    "members": ["user_abc123", "user_def456"],
    "settings": {
        "defaultView": "board",
        "theme": "light"
    }
}

Projects Collection

Collection ID: projects
Field	Type	Description
name	string	Project name
description	string	Project description
organizationId	string	Parent organization ID
createdBy	string	User ID of creator
createdAt	timestamp	Creation timestamp
isArchived	boolean	Whether project is archived
color	string	Project color (hex)
Tasks Collection

Collection ID: tasks
Field	Type	Description
title	string	Task title
description	string	Task description
status	enum	todo, in-progress, done
priority	enum	low, medium, high
assignedTo	string	User name of assignee
assignedToId	string	User ID of assignee
dueDate	date	Due date
estimatedHours	number	Estimated hours to complete
tags	array	Array of tag strings
projectId	string	Parent project ID
createdBy	string	User ID of creator
createdAt	timestamp	Creation timestamp
updatedAt	timestamp	Last update timestamp
order	number	Display order
Sprints Collection

Collection ID: sprints
Field	Type	Description
name	string	Sprint name
goal	string	Sprint goal
organizationId	string	Parent organization ID
projectId	string	Parent project ID
startDate	date	Sprint start date
endDate	date	Sprint end date
status	enum	active, completed, planned
tasks	array	Array of task IDs in sprint
createdAt	timestamp	Creation timestamp
completedAt	timestamp	Completion timestamp
Comments Collection

Collection ID: comments
Field	Type	Description
content	string	Comment text
taskId	string	Parent task ID
userId	string	Author user ID
userName	string	Author display name
createdAt	timestamp	Creation timestamp
Activity Logs Collection

Collection ID: activity_logs
Field	Type	Description
action	string	Action type (create_task, update_task, etc.)
entityType	string	Type of entity (task, project, comment)
entityId	string	ID of the entity
entityName	string	Name/title of the entity
userId	string	User who performed action
userName	string	User's display name
userEmail	string	User's email
details	object	Additional action details
createdAt	timestamp	Action timestamp
Invites Collection

Collection ID: invites
Field	Type	Description
email	string	Invited email address
organizationId	string	Organization ID
organizationName	string	Organization name
role	enum	admin, member, viewer
invitedBy	string	User ID of inviter
invitedByEmail	string	Inviter's email
token	string	Unique invite token
status	enum	pending, accepted, cancelled, expired
expiresAt	timestamp	Expiration timestamp
createdAt	timestamp	Creation timestamp
acceptedAt	timestamp	Acceptance timestamp
acceptedBy	string	User ID of acceptor
JavaScript API
Authentication Functions
javascript

// Login
await auth.signInWithEmailAndPassword(email, password);

// Signup
await auth.createUserWithEmailAndPassword(email, password);

// Google Sign-in
const provider = new firebase.auth.GoogleAuthProvider();
await auth.signInWithPopup(provider);

// Logout
await auth.signOut();

Task Functions
javascript

// Create task
async function createTask(taskData) {
    return await db.collection('tasks').add(taskData);
}

// Update task
async function updateTask(taskId, updates) {
    return await db.collection('tasks').doc(taskId).update(updates);
}

// Delete task
async function deleteTask(taskId) {
    return await db.collection('tasks').doc(taskId).delete();
}

// Get tasks for project
async function getTasks(projectId) {
    const snapshot = await db.collection('tasks')
        .where('projectId', '==', projectId)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

Project Functions
javascript

// Create project
async function createProject(projectData) {
    return await db.collection('projects').add(projectData);
}

// Get projects for organization
async function getProjects(organizationId) {
    const snapshot = await db.collection('projects')
        .where('organizationId', '==', organizationId)
        .where('isArchived', '==', false)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

Comment Functions
javascript

// Add comment
async function addComment(taskId, content) {
    return await db.collection('comments').add({
        taskId: taskId,
        content: content,
        userId: currentUser.uid,
        userName: currentUser.displayName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// Get comments for task
async function getComments(taskId) {
    const snapshot = await db.collection('comments')
        .where('taskId', '==', taskId)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

Security Rules
javascript

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Organizations - members can read, owners can write
    match /organizations/{orgId} {
      allow read: if request.auth != null && 
        resource.data.members.hasAny([request.auth.uid]);
      allow write: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
    }
    
    // Projects - organization members only
    match /projects/{projectId} {
      allow read, write: if request.auth != null;
    }
    
    // Tasks - project members only
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
    
    // Comments - anyone can read/write
    match /comments/{commentId} {
      allow read, write: if request.auth != null;
    }
    
    // Activity logs - organization members can read
    match /activity_logs/{logId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Invites - anyone can read invites (for accept page)
    match /invites/{inviteId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
  }
}

Rate Limits
Operation	Limit
Firestore reads	50K per day (free tier)
Firestore writes	20K per day (free tier)
Authentication	50K MAU (free tier)
EmailJS	200 emails per day (free tier)
Error Codes
Code	Description
auth/invalid-email	Invalid email format
auth/user-not-found	User doesn't exist
auth/wrong-password	Incorrect password
auth/email-already-in-use	Email already registered
auth/weak-password	Password too weak
auth/popup-blocked	Popup blocked by browser
auth/unauthorized-domain	Domain not authorized