# Changelog

All notable changes to Oriental will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2024-04-22

### 🚀 Phase 1 Features Added

#### @Mentions System
- Type `@` in comments or task descriptions to mention team members
- Autocomplete dropdown with team member suggestions
- Arrow key navigation (↑/↓) and keyboard selection (Enter/Tab)
- Mentioned users receive email notifications
- Mentions are highlighted in displayed comments with `@username` styling
- Click on highlighted mention to view user profile (coming soon)
- Escape key to dismiss mention dropdown

#### File Attachments (Free Tier)
- Upload files up to 1MB as Base64 directly in Firestore
- Drag and drop file upload support
- Click to upload via file picker
- Image preview modal with zoom capability
- PDF preview in embedded iframe
- Download attachments with original filename
- Delete attachments with confirmation dialog
- Supported formats: JPEG, PNG, GIF, WebP, PDF, TXT, CSV
- File size validation with user-friendly error messages
- Upload progress indicator

#### Recurring Tasks
- Create tasks that repeat daily, weekly, or monthly
- Custom recurrence intervals (e.g., every 2 weeks)
- Weekly: Select specific days of the week (Mon/Wed/Fri)
- Monthly: Day of month (1st, 15th) or nth weekday (2nd Tuesday)
- Start date and end conditions (never, after X occurrences, on date)
- Automatic next occurrence calculation
- Recurring badge indicator (🔄) on task cards
- Client-side generation (no Cloud Function required for free tier)
- Recurrence section integrated into task creation form

#### Templates Library
- **6+ Built-in Project Templates:**
  - Agile Software Development (sprints, backlog, releases)
  - Marketing Campaign (content calendar, assets, launch)
  - Product Launch (research, beta, documentation, press)
  - Design Sprint (5-day process)
  - Hiring Process (job post to offer)
  - Content Calendar (blog, social, email, video)
- **4+ Built-in Task Templates:**
  - Bug Report (steps, expected, actual, environment)
  - Feature Request (user story, acceptance criteria)
  - Weekly Report (accomplishments, priorities, blockers)
  - Meeting Notes (attendees, agenda, action items)
- Preview templates before using
- Create projects from templates with pre-defined columns and tasks
- Create tasks from templates with pre-filled descriptions
- Save current project as custom template
- Filter templates by category and search
- Template usage analytics tracking

#### Settings Page
- **General Tab:**
  - Organization profile (name, slug)
  - Appearance (theme: light/dark/system, density: comfortable/compact)
  - Default project settings (view, priority, auto-assign)
- **Notifications Tab:**
  - Email notification preferences (task assigned, completed, mentions)
  - Digest frequency (never, daily, weekly, monthly)
  - Digest time selection
  - Push notifications (coming soon placeholder)
- **Team Tab:**
  - Role permissions matrix (Admin/Member/Viewer)
  - Default role for new members
  - Invitation expiry settings
  - Security options (2FA, SSO - coming soon)
- **Integrations Tab:**
  - Slack, GitHub, Google Calendar (coming soon placeholders)
  - API & Webhooks (coming soon)
- **Danger Zone:**
  - Archive projects management
  - Export all organization data (JSON format)
  - Leave organization
  - Delete organization (with confirmation)

### ✨ Enhancements
- Added Settings to main navigation sidebar
- Added Settings to mobile bottom navigation
- Added Templates button in dashboard header actions
- Added recurrence section in task creation form
- Added attachments section in task detail modal
- Added mentions dropdown with avatar initials
- Added comprehensive animations throughout UI:
  - Fade in/out, slide, scale, pop, bounce effects
  - Hover lift effects on cards and buttons
  - Ripple effect on button clicks
  - Shimmer loading skeletons
  - Progress bar animations
  - Toast slide-in notifications
- Improved dark mode support for all new components
- Added `prefers-reduced-motion` media query support
- Added `color-scheme` CSS property for better dark mode
- Refactored CSS with 28 organized sections
- Added CSS animation utility classes

### 🐛 Bug Fixes
- Fixed bottom navigation display conflict in CSS (`display: none; display: flex;`)
- Fixed sidebar scroll issues on mobile devices
- Fixed filter dropdown positioning on mobile
- Fixed task card drag state visual feedback
- Fixed activity log panel z-index layering
- Fixed real-time subscription memory leak (added cleanup)
- Fixed sprint form race condition in DOMContentLoaded
- Fixed reports view not appearing due to browser cache
- Fixed assignee dropdown not updating after team member changes

### 📚 Documentation
- Added comprehensive `API.md` with complete Firestore schema
- Updated `DEPLOYMENT.md` with Phase 1 deployment instructions
- Updated `CONTRIBUTING.md` with new feature guidelines
- Updated `README.md` with Phase 1 features and badges
- Added inline JSDoc comments throughout codebase

### 🔧 Technical Changes
- **New Firestore Collections:**
  - `attachments` - Base64 file storage for task attachments
  - `recurring_templates` - Recurring task templates
  - `custom_templates` - User-saved project/task templates
- **New JavaScript Modules:**
  - `mentions.js` - @mentions system with autocomplete
  - `attachments.js` - File upload manager with Base64 storage
  - `recurring-tasks.js` - Recurring task handler and scheduler
  - `templates.js` - Templates library with built-in templates
- **Updated Files:**
  - `dashboard.html` - Added Phase 1 UI elements and script references
  - `dashboard.js` - Integrated Phase 1 features
  - `styles.css` - Added ~500 lines of Phase 1 styles
  - `firebase-config.js` - Added storage reference (optional)
- **Security Rules:**
  - Updated `firestore.rules` for new collections
  - Added `storage.rules` (optional, for future Storage use)

### 📊 Analytics Events Added
- `user_mentioned` - When @mention is used
- `attachment_added` / `attachment_deleted` / `attachment_downloaded`
- `template_used` / `template_created`
- `recurring_task_created`
- `settings_viewed` / `preferences_updated`
- `data_exported`

---

## [2.0.0] - 2024-04-17

### Added
- **Dark Mode:** Theme switcher with persistent preference (light/dark/system)
- **Activity Log:** Slide-out panel tracking all user actions with categorized icons
- **Email Notifications:** Task assignments and comments via EmailJS
- **PWA Support:** 
  - Service worker for offline capability
  - Web app manifest
  - Install prompt
  - Offline indicator
- **Google Analytics:** Integration with event tracking
- **Performance Optimizations:**
  - 30-second cache for projects
  - Debounced real-time updates (100ms)
  - Content-visibility for off-screen content
  - Skeleton loading states
- **Sprints Feature:**
  - Active sprint with progress tracking
  - Sprint tasks board (Planned/In Progress/Completed)
  - Burndown chart
  - Past sprints history
  - Add tasks to sprint modal
- **Team Invitations:** EmailJS integration with 7-day expiry tokens
- **Real Assignees:** Team member dropdown from organization members
- **Keyboard Shortcuts:**
  - `N` - New Task
  - `P` - New Project
  - `/` - Focus Search
  - `S` - Focus Filter
  - `B` - Board View
  - `R` - Sprints View
  - `Esc` - Close Modal / Clear Search
  - `?` - Show Shortcuts Help
  - `Ctrl+Z` / `⌘+Z` - Undo Delete
- **Pull to Refresh:** Mobile gesture to reload data
- **Loading Skeletons:** Animated placeholders for projects, tasks, and columns
- **Confirmation Dialogs:** Reusable dialog for destructive actions
- **Undo Delete:** 20-second window to restore deleted tasks/projects
- **Due Date Indicators:** Visual badges (overdue/today/this week/future)
- **Task Sorting:** Priority, due date, and creation date (asc/desc)
- **Assignee Filtering:** Filter tasks by team member
- **Mobile Responsive:** Hamburger menu, bottom navigation, FAB

### Changed
- Improved Firestore query performance with caching layer
- Debounced real-time updates to reduce database reads
- Optimized task card rendering with `contain: content`
- Enhanced mobile drag and drop with touch events
- Refactored CSS with CSS variables for theming
- Improved offline persistence error handling

### Fixed
- Google Sign-in user document creation flow
- Organization loading on mobile devices
- Create Project button functionality
- Task count updates after project deletion
- Filter dropdown outside click detection
- Multiple modal stacking z-index issues

---

## [1.0.0] - 2024-04-10

### Added
- **Initial Release**
- User authentication (Email/Password + Google OAuth)
- Organization creation and management
- Project management with color coding
- Task CRUD operations (Create, Read, Update, Delete)
- Kanban board with three columns (To Do, In Progress, Done)
- Drag and drop between columns
- Comments system on tasks
- Search functionality
- Filter by priority, status, due date
- Due date tracking
- Tag system for categorization
- Real-time Firestore updates
- Basic responsive design

### Known Issues (Fixed in 2.0.0+)
- Google Sign-in users need manual organization creation
- Create Project button requires project selection
- No offline support
- Limited mobile optimization

---

## [Unreleased] - Phase 2 (Planned)

### 🚀 Planned Features

#### Real-Time Chat
- Per-task discussion threads
- Project-wide team chat
- Typing indicators
- Read receipts
- Emoji reactions

#### Time Tracking
- Start/stop timer on tasks
- Manual time entry
- Billable hours tracking
- Timesheet view
- Time reports export

#### Advanced Project Views
- Gantt chart timeline view
- Calendar view with drag-to-reschedule
- Workload/capacity view
- Project portfolio dashboard

#### Custom Fields
- Text, number, date, dropdown custom fields
- Field validation rules
- Field visibility by role

#### Task Relationships
- Parent/child subtasks
- "Blocks" / "Is blocked by" dependencies
- "Duplicates" / "Relates to" links
- Dependency graph visualization

#### Automation Rules
- If-this-then-that rule builder
- Scheduled actions
- Webhook triggers
- Email automation

#### Integrations
- Slack (notifications, slash commands)
- GitHub/GitLab (PR linking, auto-close)
- Google Calendar (two-way sync)
- Zapier/Make (webhook connector)
- Figma (design embedding)

#### Native Mobile Apps
- React Native iOS app
- React Native Android app
- Push notifications (FCM)
- Biometric authentication
- Offline-first architecture

#### Enterprise Features
- SSO/SAML authentication
- SCIM user provisioning
- Advanced audit logs
- Data residency options
- HIPAA/GDPR compliance tools
- Custom branding/white-label

---

## [Unreleased] - Phase 3 (Future)

### 🔮 Under Consideration

#### AI-Powered Features
- Task description generator from title
- Smart assignee suggestions based on workload
- Automated sprint summaries
- Predictive completion dates
- Sentiment analysis on comments

#### Advanced Analytics
- Custom report builder
- Scheduled report delivery
- Team velocity trends
- Bottleneck detection
- OKR/goal tracking

#### Client Portal
- Guest access for stakeholders
- Approval workflows
- White-label branding
- Feedback collection

#### Document Management
- Project wikis
- Meeting notes with action item extraction
- File version history
- Full-text search across documents

---

## Version History Summary

| Version | Date | Key Features |
|---------|------|--------------|
| [2.1.0] | 2024-04-22 | @Mentions, Attachments, Recurring Tasks, Templates, Settings |
| [2.0.0] | 2024-04-17 | Dark Mode, Activity Log, PWA, Sprints, Keyboard Shortcuts |
| [1.0.0] | 2024-04-10 | Initial Release: Auth, Tasks, Kanban, Comments |

---

## Upgrade Guide

### Upgrading from 2.0.0 to 2.1.0

1. **Pull latest code:**
   ```bash
   git pull origin main
   ```

2. **Add new script references to `dashboard.html`:**
   ```html
   <script src="js/mentions.js"></script>
   <script src="js/attachments.js"></script>
   <script src="js/recurring-tasks.js"></script>
   <script src="js/templates.js"></script>
   ```

3. **Update Firestore security rules** (see `firestore.rules`)

4. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)

5. **Test Phase 1 features** using the test suite in browser console:
   ```javascript
   runAllTests()
   ```

### Upgrading from 1.0.0 to 2.0.0

1. Deploy updated Firestore security rules
2. Enable EmailJS and configure template IDs
3. Add PWA manifest and service worker
4. Run database migration (none required - backward compatible)

---

## Breaking Changes

### 2.1.0
- None (all new features are additive)

### 2.0.0
- None (backward compatible with 1.0.0 data)

### 1.0.0
- Initial release

---

## Deprecation Notices

| Feature | Deprecated In | Removal Planned | Replacement |
|---------|--------------|-----------------|-------------|
| None currently | - | - | - |

---

## Security Advisories

### Firebase API Keys
- API keys are exposed in client-side code by design (Firebase architecture)
- Security is enforced through Firestore/Firebase rules, not API key secrecy
- Always restrict API keys to authorized domains in Google Cloud Console
- Use App Check for additional security (planned for Phase 2)

---

## Contributors

- Project Maintainer: [Your Name]
- Contributors: See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## License

This project is licensed under the MIT License - see [LICENSE](../LICENSE) for details.
```
