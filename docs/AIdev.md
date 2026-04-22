## 📋 Context Prompt for New Chat

Copy and paste this into a new chat:

```
I'm continuing development on Oriental, an open-source task management platform built with vanilla JavaScript and Firebase.

Project State:
- Version: 2.1.0 (Phase 1 Complete)
- Core features: Authentication, Organizations, Projects, Kanban Board, Tasks, Comments, Sprints, Reports, Settings
- Phase 1 features: @Mentions system, File Attachments (Base64, 1MB limit), Recurring Tasks, Templates Library
- Tech stack: HTML5, CSS3, Vanilla JS (ES6+), Firebase (Auth, Firestore), EmailJS, Chart.js, PWA
- Free tier only (no Storage, no Cloud Functions)

File structure:
- dashboard.html (main app with all views)
- css/styles.css (refactored with animations, 28 sections)
- js/firebase-config.js
- js/dashboard.js (main logic)
- js/mentions.js (Phase 1)
- js/attachments.js (Phase 1)
- js/recurring-tasks.js (Phase 1)
- js/templates.js (Phase 1)
- docs/ (API.md, DEPLOYMENT.md, CHANGELOG.md, CONTRIBUTING.md, README.md)

Current status:
- All Phase 1 features are coded but not yet fully tested
- Documentation is updated to v2.1.0
- Test suite exists in dashboard.js (runAllTests())
- Need to test @mentions, attachments, recurring tasks, and templates library

Known issues to fix:
- Mentions dropdown may need CSS adjustments
- Attachments section may not appear in task modal
- Recurring checkbox may not show in task form
- Templates button needs to call openTemplatesLibrary()

What I need help with:
[Describe specific task - e.g., "Debug the @mentions dropdown not appearing", "Add bulk operations feature", "Review the recurring tasks logic"]

Previous conversation summary:
- Added Phase 1 features (mentions, attachments, recurring, templates)
- Refactored CSS with animations
- Updated all documentation
- Created test suite
- Ready to test and debug Phase 1 features
```

## 🎯 Shorter Version (if you want to be concise)

```
Continuing Oriental project (v2.1.0) - open-source task management with Firebase.

Phase 1 features added: @mentions, Base64 attachments, recurring tasks, templates library.
All code written but needs testing/debugging.

Tech: Vanilla JS, Firebase Free Tier, EmailJS, Chart.js, PWA.

Current issue: [describe what you want to fix/build]

Files to reference: dashboard.html, js/dashboard.js, js/mentions.js, js/attachments.js, js/recurring-tasks.js, js/templates.js, css/styles.css, docs/API.md

I can paste any files you need to see.
```

## 📎 Pro Tip

You can also attach the key files when starting the new chat. Most AI chat interfaces allow file uploads. Prioritize attaching:
1. `dashboard.html`
2. `js/dashboard.js`
3. `docs/API.md` (gives schema context)

This way, the new instance can read the actual code and understand the exact state of the project.