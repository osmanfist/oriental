# Changelog

All notable changes to Oriental will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-04-17

### Added
- Dark mode support with persistent preference
- Activity log for tracking all user actions
- Email notifications for task assignments and comments
- PWA support with offline capability
- Google Analytics integration
- Performance optimizations with caching
- Sprint feature with progress tracking
- Team invitation system via EmailJS
- Real assignees from team members
- Keyboard shortcuts (N, P, /, S, B, R, Esc, ?, Ctrl+Z)
- Pull to refresh on mobile devices
- Loading skeletons for better UX
- Confirmation dialogs for destructive actions
- Undo delete with Ctrl+Z
- Due date indicators with visual warnings
- Task sorting by priority, due date, and creation date
- Assignee filtering
- Mobile responsive design with hamburger menu

### Changed
- Improved Firestore query performance with caching
- Debounced real-time updates to reduce database reads
- Optimized task card rendering
- Enhanced mobile drag and drop

### Fixed
- Google Sign-in user document creation
- Organization loading on mobile devices
- Create Project button functionality
- Task count updates after project deletion

## [1.0.0] - 2024-04-10

### Added
- Initial release
- User authentication (Email/Password + Google)
- Organization and project management
- Task CRUD operations
- Kanban board with drag and drop
- Comments system
- Search and filter functionality
- Due date tracking
- Tag system
- Real-time updates

### Known Issues
- Google Sign-in users need manual organization creation
- Create Project button requires project selection
- No offline support