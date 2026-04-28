# 🌄 Oriental

**Open-source task management for development teams**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)

Oriental is a modern, open-source task management platform designed specifically for software development teams. It combines intuitive UX with powerful features for agile project management — all running on Firebase's free tier.

![Oriental Dashboard](https://via.placeholder.com/800x400?text=Oriental+Dashboard+Screenshot)

> **Try it live:** [oriental.vercel.app](https://oriental.vercel.app)

---

## ✨ Features

### Core Features

| Feature | Status | Description |
|---------|--------|-------------|
| 🔐 Authentication | ✅ Complete | Email/Password + Google OAuth |
| 🏢 Organizations | ✅ Complete | Multi-tenant team workspaces |
| 📋 Projects | ✅ Complete | Organize work into projects with colors |
| ✅ Tasks | ✅ Complete | Full CRUD with priority and assignment |
| 📊 Board View | ✅ Complete | Drag-and-drop Kanban board |
| 💬 Comments | ✅ Complete | Threaded discussions on tasks |
| 🏃 Sprints | ✅ Complete | Time-boxed iterations with progress tracking |
| 🔍 Search & Filter | ✅ Complete | Find tasks quickly with advanced filters |
| 📅 Due Dates | ✅ Complete | Date tracking with visual indicators |
| 🏷️ Tags | ✅ Complete | Categorize and organize tasks |
| 👥 Team Members | ✅ Complete | Real assignees from your organization |
| 📧 Invitations | ✅ Complete | Email invitations via EmailJS |
| 📜 Activity Log | ✅ Complete | Full audit trail of all actions |
| 📱 Mobile Responsive | ✅ Complete | Works on all devices |
| 🌙 Dark Mode | ✅ Complete | Theme switcher (light/dark/system) |
| ⌨️ Keyboard Shortcuts | ✅ Complete | Power user productivity |
| ⚡ Real-time Updates | ✅ Complete | Live sync across users |
| 🔄 Undo Delete | ✅ Complete | Ctrl+Z to restore deleted items |
| 📊 Analytics | ✅ Complete | Google Analytics integration |
| 📴 Offline Support | ✅ Complete | PWA with offline capability |
| 📈 Reports | ✅ Complete | Charts, stats, and project health |

### Phase 1 Features ✅ Complete

| Feature | Status | Description |
|---------|--------|-------------|
| 💬 @Mentions | ✅ Complete | Type `@` to mention team members with autocomplete |
| 📎 File Attachments | ✅ Complete | Upload images, PDFs, and files (Base64, max 1MB) |
| 🔄 Recurring Tasks | ✅ Complete | Daily, weekly, monthly recurring tasks |
| 📚 Templates Library | ✅ Complete | 6+ project templates, 4+ task templates |
| ⚙️ Settings Page | ✅ Complete | Organization, notifications, team, integrations |

### Phase 2 Features 🚧 Planned

| Feature | Status | Description |
|---------|--------|-------------|
| 💬 Real-time Chat | 🚧 Planned | Per-task and project chat rooms |
| ⏱️ Time Tracking | 🚧 Planned | Start/stop timer with billable hours |
| 📊 Gantt Charts | 🚧 Planned | Timeline view with dependencies |
| 🔧 Custom Fields | 🚧 Planned | Text, number, date, dropdown custom fields |
| 🔗 Integrations | 🚧 Planned | Slack, GitHub, Google Calendar |
---

## 🚀 Quick Start

### Prerequisites

- Firebase account (free Spark tier works)
- EmailJS account (free: 200 emails/month)
- Modern web browser
- (Optional) Vercel/Netlify account for deployment

### One-Click Deploy

Deploy your own instance in minutes:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/osmanfist/oriental)

### Manual Installation

1. **Clone the repository**
```bash
git clone https://github.com/osmanfist/oriental.git
cd oriental
```

2. **Set up Firebase**
   - Create a project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password + Google)
   - Create Firestore Database
   - Copy your Firebase config to `js/firebase-config.js`

3. **Set up EmailJS**
   - Create account at [EmailJS](https://www.emailjs.com)
   - Create email service and templates
   - Update credentials in `js/dashboard.js`

4. **Run locally**
```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve .

# Or just open login.html in your browser
```

5. **Deploy** (Optional)
```bash
npm install -g vercel
vercel
```

---

## 📁 Project Structure

```
oriental/
├── index.html # Splash/entry point
├── login.html # Authentication page (split layout)
├── dashboard.html # Main application
├── manifest.json # PWA manifest
├── sw.js # Service Worker for offline
├── css/
│ ├── main.css # Main import file
│ ├── variables.css # CSS custom properties
│ ├── themes.css # Dark mode overrides
│ ├── reset.css # Reset & base styles
│ ├── animations.css # Keyframes & animation classes
│ ├── buttons.css # All button styles
│ ├── forms.css # Form elements
│ ├── layout.css # Dashboard, sidebar, header
│ ├── components.css # Cards, modals, badges, etc.
│ ├── views.css # Board, sprints, reports, settings
│ ├── utilities.css # Utility classes
│ ├── responsive.css # Media queries
│ ├── login.css # Login page styles
│ ├── effects.css # Visual enhancements
│ ├── confetti.css # Celebration animations
│ └── fab.css # Floating action button
├── js/
│ ├── firebase-config.js # Firebase initialization
│ ├── dashboard.js # Main application logic (v5.0.0)
│ ├── login.js # Authentication logic
│ ├── mentions.js # @Mentions system (Phase 1)
│ ├── attachments.js # File attachments (Phase 1)
│ ├── recurring-tasks.js # Recurring tasks (Phase 1) ✅ Fixed
│ └── templates.js # Templates library (Phase 1)
├── icons/ # App icons for PWA
└── docs/
├── API.md # Complete API reference
├── DEPLOYMENT.md # Deployment guide
├── CHANGELOG.md # Version history
└── CONTRIBUTING.md # Contribution guidelines
```

---

## 🏗️ Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **Backend** | Firebase (Authentication, Firestore) |
| **Real-time** | Firestore listeners |
| **File Storage** | Firestore (Base64, 1MB limit) |
| **Email** | EmailJS |
| **Charts** | Chart.js 4.4.0 |
| **PWA** | Service Worker + Manifest |
| **Deployment** | Vercel / Netlify / GitHub Pages |
| **Free Tier** | ✅ Runs entirely on Firebase Spark plan |

### Database Schema (Simplified)

```javascript
// Users collection
users/{userId} {
    name, email, currentOrganization, organizations, preferences
}

// Organizations collection
organizations/{orgId} {
    name, slug, createdBy, members, admins, settings
}

// Projects collection
projects/{projectId} {
    name, description, organizationId, createdBy, isArchived, color
}

// Tasks collection
tasks/{taskId} {
    title, description, status, priority, assignedTo, dueDate,
    projectId, tags, recurringTemplateId
}

// Attachments collection (Phase 1)
attachments/{attachmentId} {
    taskId, fileName, fileSize, fileType, base64Data, uploadedBy
}

// Recurring Templates (Phase 1)
recurring_templates/{templateId} {
    title, recurrenceConfig, nextOccurrence, occurrencesCreated
}

// Custom Templates (Phase 1)
custom_templates/{templateId} {
    name, type, projectData, tasks, createdBy
}

// Sprints, Comments, Activity Logs, Invites...
```

*See [API.md](docs/API.md) for complete schema documentation.*

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | New Task |
| `P` | New Project |
| `/` | Focus Search |
| `S` | Focus Filter |
| `B` | Board View |
| `R` | Sprints View |
| `Esc` | Close Modal / Clear Search |
| `?` | Show Shortcuts Help |
| `Ctrl+Z` / `⌘+Z` | Undo Delete |

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md).

### Development Setup

```bash
# Fork the repository
# Clone your fork
git clone https://github.com/YOUR_USERNAME/oriental.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes
# Test locally
python3 -m http.server 8000

# Commit and push
git commit -m 'Add amazing feature'
git push origin feature/amazing-feature

# Open a Pull Request
```

### Reporting Issues

Please use the [issue templates](https://github.com/osmanfist/oriental/issues/new/choose) to report bugs or request features.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [API Reference](docs/API.md) | Complete Firestore schema and JavaScript API |
| [Deployment Guide](docs/DEPLOYMENT.md) | Deploy to Vercel, Netlify, Firebase, or self-host |
| [Contributing Guide](docs/CONTRIBUTING.md) | How to contribute to Oriental |
| [Changelog](docs/CHANGELOG.md) | Detailed version history |

---

## 🎯 Roadmap

### ✅ Completed (v2.1.0 - Current)
- Core task management (Kanban, tasks, projects)
- Sprints with progress tracking
- Dark mode (light/dark/system)
- Activity log with audit trail
- PWA support (offline, installable)
- Reports & Analytics dashboard
- Settings page (5 tabs)
- **Phase 1:** @Mentions, Attachments, Recurring Tasks, Templates

### 🚧 In Progress (v2.2.0)
- [ ] File attachments with Firebase Storage (for larger files)
- [ ] Email digest (daily/weekly summaries)
- [ ] Bulk operations (multi-select tasks)
- [ ] Task dependencies (blocks/is blocked by)

### 🔮 Planned (v3.0.0)
- [ ] Real-time chat per task/project
- [ ] Time tracking with timer
- [ ] Gantt chart timeline view
- [ ] Custom fields for tasks
- [ ] Slack & GitHub integrations
- [ ] Native mobile apps (React Native)
- [ ] AI-powered task suggestions

*See [CHANGELOG.md](docs/CHANGELOG.md) for detailed version history.*

---

## 🙏 Acknowledgments

Oriental is built on the shoulders of giants:

- [Firebase](https://firebase.google.com) - Backend infrastructure
- [EmailJS](https://www.emailjs.com) - Email delivery
- [Chart.js](https://www.chartjs.org) - Analytics charts
- [Font Awesome](https://fontawesome.com) - Icons
- [Google Fonts](https://fonts.google.com) - Inter font
- [Vercel](https://vercel.com) - Hosting

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

## 📧 Contact & Community

- **GitHub Issues:** [Create an issue](https://github.com/osmanfist/oriental/issues)
- **Discussions:** [GitHub Discussions](https://github.com/osmanfist/oriental/discussions)
- **Email:** osmanfist@gmail.com

---

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

[![GitHub stars](https://img.shields.io/github/stars/osmanfist/oriental)](https://github.com/osmanfist/oriental/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/osmanfist/oriental)](https://github.com/osmanfist/oriental/network)
[![GitHub issues](https://img.shields.io/github/issues/osmanfist/oriental)](https://github.com/osmanfist/oriental/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/osmanfist/oriental)](https://github.com/osmanfist/oriental/pulls)
[![GitHub last commit](https://img.shields.io/github/last-commit/osmanfist/oriental)](https://github.com/osmanfist/oriental/commits/main)

---

**Built with ❤️ for development teams worldwide**