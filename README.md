# 🌄 Oriental

**Open-source task management for development teams**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com)

Oriental is a modern, open-source task management platform designed specifically for software development teams. It combines intuitive UX with powerful features for agile project management.

![Oriental Dashboard](https://via.placeholder.com/800x400?text=Oriental+Dashboard+Screenshot)

## ✨ Features

| Feature | Status | Description |
|---------|--------|-------------|
| 🔐 Authentication | ✅ Complete | Email/Password + Google OAuth |
| 🏢 Organizations | ✅ Complete | Multi-tenant team workspaces |
| 📋 Projects | ✅ Complete | Organize work into projects |
| ✅ Tasks | ✅ Complete | Full CRUD with priority and assignment |
| 📊 Board View | ✅ Complete | Drag-and-drop Kanban board |
| 💬 Comments | ✅ Complete | Threaded discussions on tasks |
| 🏃 Sprints | ✅ Complete | Time-boxed iterations with progress tracking |
| 🔍 Search & Filter | ✅ Complete | Find tasks quickly |
| 📅 Due Dates | ✅ Complete | Date tracking with visual indicators |
| 🏷️ Tags | ✅ Complete | Categorize tasks |
| 👥 Team Members | ✅ Complete | Real assignees from your organization |
| 📧 Invitations | ✅ Complete | Email invitations via EmailJS |
| 📜 Activity Log | ✅ Complete | Full audit trail of all actions |
| 📱 Mobile Responsive | ✅ Complete | Works on all devices |
| 🌙 Dark Mode | ✅ Complete | Theme switcher with persistence |
| ⌨️ Keyboard Shortcuts | ✅ Complete | Power user productivity |
| ⚡ Real-time Updates | ✅ Complete | Live sync across users |
| 🔄 Undo Delete | ✅ Complete | Ctrl+Z to restore deleted items |
| 📊 Analytics | ✅ Complete | Google Analytics integration |
| 📴 Offline Support | ✅ Complete | PWA with offline capability |

## 🚀 Quick Start

### Prerequisites

- Firebase account (free tier works)
- Modern web browser
- Basic knowledge of HTML/CSS/JavaScript (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/osmanfist/oriental.git
cd oriental

    Set up Firebase

        Create a project at Firebase Console

        Enable Authentication (Email/Password + Google)

        Create Firestore Database

        Copy your Firebase config to js/firebase-config.js

    Run locally

bash

# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve .

# Or just open login.html in your browser

    Deploy to Vercel (Optional)

bash

npm install -g vercel
vercel

📁 Project Structure
text

oriental/
├── index.html              # Entry point
├── login.html              # Authentication page
├── dashboard.html          # Main application
├── css/
│   └── styles.css         # Complete styling with dark mode
├── js/
│   ├── firebase-config.js # Firebase initialization
│   ├── auth.js            # Authentication logic
│   └── dashboard.js       # Main application logic
├── manifest.json          # PWA manifest
├── sw.js                  # Service Worker for offline
├── icons/                 # App icons for PWA
└── docs/                  # Documentation

🏗️ Architecture
Technology Stack
Layer	Technology
Frontend	HTML5, CSS3, Vanilla JavaScript (ES6+)
Backend	Firebase (Authentication, Firestore)
Real-time	Firestore listeners
Deployment	Vercel / Netlify / GitHub Pages
Email	EmailJS
Analytics	Google Analytics 4
PWA	Service Worker + Manifest
Database Schema
javascript

// Users collection
users/{userId} {
    name: string,
    email: string,
    currentOrganization: string,
    organizations: array,
    preferences: object
}

// Organizations collection
organizations/{orgId} {
    name: string,
    slug: string,
    createdBy: string,
    members: array,
    settings: object
}

// Projects collection
projects/{projectId} {
    name: string,
    description: string,
    organizationId: string,
    createdBy: string,
    isArchived: boolean
}

// Tasks collection
tasks/{taskId} {
    title: string,
    description: string,
    status: enum,
    priority: enum,
    assignedTo: string,
    dueDate: date,
    projectId: string,
    tags: array
}

// Sprints collection
sprints/{sprintId} {
    name: string,
    goal: string,
    projectId: string,
    startDate: date,
    endDate: date,
    status: enum,
    tasks: array
}

// Comments collection
comments/{commentId} {
    content: string,
    taskId: string,
    userId: string,
    createdAt: timestamp
}

// Activity Logs collection
activity_logs/{logId} {
    action: string,
    entityType: string,
    entityId: string,
    userId: string,
    details: object,
    createdAt: timestamp
}

// Invites collection
invites/{inviteId} {
    email: string,
    organizationId: string,
    role: string,
    token: string,
    status: enum,
    expiresAt: timestamp
}

⌨️ Keyboard Shortcuts
Shortcut	Action
N	New Task
P	New Project
/	Focus Search
S	Focus Filter
B	Board View
R	Sprints View
Esc	Close Modal / Clear Search
?	Show Shortcuts Help
Ctrl+Z / ⌘+Z	Undo Delete
🤝 Contributing

We welcome contributions! Please see our Contributing Guide.
Development Setup
bash

# Fork the repository
# Clone your fork
git clone https://github.com/YOUR_USERNAME/oriental.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes
# Commit and push
git commit -m 'Add amazing feature'
git push origin feature/amazing-feature

# Open a Pull Request

Reporting Issues

Please use the issue templates to report bugs or request features.
📚 Documentation

    API Reference - Firestore schema and functions

    Deployment Guide - Deploy to production

    Contributing Guide - How to contribute

    Changelog - Version history

🎯 Roadmap
Version 2.0 (Current)

    ✅ Core task management

    ✅ Sprints

    ✅ Dark mode

    ✅ Activity log

    ✅ PWA support

Version 2.1 (Planned)

    File attachments

    Email notifications

    Push notifications

    Export data (CSV/JSON)

Version 3.0 (Future)

    Mobile apps (React Native)

    Slack integration

    GitHub integration

    AI task suggestions

🙏 Acknowledgments

    Firebase - Backend infrastructure

    EmailJS - Email delivery

    Font Awesome - Icons

    Google Fonts - Inter font

📄 License

Distributed under the MIT License. See LICENSE for more information.
📧 Contact

    GitHub Issues: Create an issue

    Email: your-email@example.com

⭐ Show your support

Give a ⭐️ if this project helped you!

Built with ❤️ for development teams worldwide