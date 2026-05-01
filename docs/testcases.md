## 1. Authentication & User Management

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| A1 | Email Sign Up | 1. Click "Sign Up"<br>2. Enter name, email, password<br>3. Submit form | Account created, organization prompt appears | ⬜ |
| A2 | Email Sign In | 1. Enter email and password<br>2. Click "Sign In" | Redirected to dashboard | ⬜ |
| A3 | Google Sign In | 1. Click "Sign in with Google"<br>2. Select Google account | Redirected to dashboard | ⬜ |
| A4 | Sign Out | 1. Click logout button in sidebar | Redirected to login page | ⬜ |
| A5 | Session Persistence | 1. Sign in<br>2. Close browser<br>3. Reopen app | Still signed in | ⬜ |

---

## 2. Organizations & Projects

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| O1 | Create Organization | 1. Sign up as new user<br>2. Enter organization name | Organization created, default project appears | ⬜ |
| O2 | Create Project | 1. Click "+" in Projects section<br>2. Enter name and description<br>3. Save | Project appears in sidebar | ⬜ |
| O3 | Switch Projects | 1. Click different project in sidebar | Board updates with that project's tasks | ⬜ |
| O4 | Delete Project | 1. Hover over project<br>2. Click trash icon<br>3. Confirm | Project removed, tasks deleted, undo toast appears | ⬜ |
| O5 | Undo Delete Project | 1. Delete project<br>2. Click "Undo" in toast | Project and tasks restored | ⬜ |
| O6 | Project Task Count | 1. Create tasks in project | Task count badge updates in sidebar | ⬜ |

---

## 3. Tasks - CRUD Operations

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| T1 | Create Task | 1. Click "New Task"<br>2. Fill title, description<br>3. Select priority, assignee, due date<br>4. Save | Task appears in "To Do" column | ⬜ |
| T2 | Create Task (Minimal) | 1. Click "New Task"<br>2. Enter only title<br>3. Save | Task created with default values | ⬜ |
| T3 | Edit Task | 1. Click task card<br>2. Modify fields<br>3. Click "Save Changes" | Task updates, changes reflected on board | ⬜ |
| T4 | Delete Task | 1. Open task detail<br>2. Click "Delete Task"<br>3. Confirm | Task removed, undo toast appears | ⬜ |
| T5 | Undo Delete Task | 1. Delete task<br>2. Click "Undo" in toast | Task restored to original column | ⬜ |
| T6 | Task with Tags | 1. Create task with tags "frontend, bug"<br>2. View task | Tags displayed, filterable | ⬜ |
| T7 | Task with Due Date | 1. Set due date to yesterday<br>2. View board | Overdue indicator (red) displayed | ⬜ |
| T8 | Task with Due Date (Today) | 1. Set due date to today | Today indicator (yellow) displayed | ⬜ |

---

## 4. Board View & Drag-Drop

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| B1 | Drag Task Between Columns | 1. Drag task from "To Do" to "In Progress" | Task moves, status updates in database | ⬜ |
| B2 | Drag Task (Mobile) | 1. Long press task<br>2. Drag to another column<br>3. Release | Task moves (touch devices) | ⬜ |
| B3 | Column Task Count | 1. Move tasks between columns | Column header count updates correctly | ⬜ |
| B4 | Empty Board | 1. Delete all tasks | Empty state message with "Create Task" button appears | ⬜ |

---

## 5. Search & Filter

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| S1 | Search Tasks | 1. Type in search box | Tasks filter in real-time, matching text highlighted | ⬜ |
| S2 | Clear Search | 1. Type search term<br>2. Click "X" in search box | All tasks reappear | ⬜ |
| S3 | Filter by Priority | 1. Click Filter<br>2. Check "High"<br>3. Apply | Only high priority tasks shown | ⬜ |
| S4 | Filter by Status | 1. Filter for "Done" tasks | Only completed tasks shown | ⬜ |
| S5 | Filter by Assignee | 1. Filter for specific team member | Only their tasks shown | ⬜ |
| S6 | Clear All Filters | 1. Apply multiple filters<br>2. Click "Clear All" | All filters removed, all tasks shown | ⬜ |
| S7 | Remove Single Filter | 1. Apply filter<br>2. Click "X" on filter badge | That filter removed | ⬜ |

---

## 6. Sorting

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| SO1 | Sort by Priority (High-Low) | 1. Click Sort<br>2. Select "Priority (High to Low)" | Tasks ordered: High → Medium → Low | ⬜ |
| SO2 | Sort by Due Date (Earliest) | 1. Select "Due Date (Earliest first)" | Tasks ordered by due date ascending | ⬜ |
| SO3 | Sort by Created (Newest) | 1. Select "Created (Newest first)" | Most recent tasks first | ⬜ |

---

## 7. Comments

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| C1 | Add Comment | 1. Open task<br>2. Type comment<br>3. Click "Add Comment" | Comment appears in list | ⬜ |
| C2 | Comment Timestamp | 1. Add comment | Timestamp displays correctly | ⬜ |
| C3 | Multiple Comments | 1. Add several comments | Comments ordered newest first | ⬜ |
| C4 | Empty Comments | 1. Open task with no comments | "No comments yet" message appears | ⬜ |

---

## 8. @Mentions (Phase 1)

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| M1 | Mention Dropdown | 1. Open task<br>2. Type "@" in comment box | Dropdown with team members appears | ⬜ |
| M2 | Filter Mentions | 1. Type "@jo" | Dropdown filters to matching members | ⬜ |
| M3 | Select Mention (Click) | 1. Click on member in dropdown | Member inserted as "@username" | ⬜ |
| M4 | Select Mention (Keyboard) | 1. Type "@"<br>2. Use arrow keys to navigate<br>3. Press Enter | Member inserted | ⬜ |
| M5 | Escape Dropdown | 1. Type "@"<br>2. Press Escape | Dropdown closes | ⬜ |
| M6 | Mention Highlighting | 1. Post comment with @mention | Mention appears highlighted in blue | ⬜ |
| M7 | Self-Mention | 1. @mention yourself | No notification sent to self | ⬜ |
| M8 | Mention Notification | 1. @mention another user<br>2. Check console/network | Email notification triggered | ⬜ |

---

## 9. File Attachments (Phase 1)

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| AT1 | Upload Image | 1. Open task<br>2. Click "Add Attachment"<br>3. Select image < 1MB | Image appears in attachments list | ⬜ |
| AT2 | Upload PDF | 1. Upload PDF file | PDF icon displayed, clickable | ⬜ |
| AT3 | Upload Text File | 1. Upload .txt file | Text file icon displayed | ⬜ |
| AT4 | File Size Limit | 1. Try to upload file > 1MB | Error toast: "exceeds 1MB limit" | ⬜ |
| AT5 | File Type Restriction | 1. Try to upload .exe file | Error toast: "file type not allowed" | ⬜ |
| AT6 | Drag & Drop Upload | 1. Drag file onto attachments area | File uploads successfully | ⬜ |
| AT7 | Preview Image | 1. Click on uploaded image | Image preview modal opens | ⬜ |
| AT8 | Download Attachment | 1. Click download button on attachment | File downloads | ⬜ |
| AT9 | Delete Attachment | 1. Click delete button<br>2. Confirm | Attachment removed | ⬜ |
| AT10 | Multiple Attachments | 1. Upload 3 files | All 3 appear in list | ⬜ |

---

## 10. Recurring Tasks (Phase 1)

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| R1 | Enable Recurring | 1. Click "New Task"<br>2. Check "Recurring Task" | Recurrence options appear | ⬜ |
| R2 | Daily Recurrence | 1. Select "Daily"<br>2. Set interval to 2<br>3. Create task | Task created with recurring badge | ⬜ |
| R3 | Weekly Recurrence | 1. Select "Weekly"<br>2. Check Mon/Wed/Fri<br>3. Create task | Weekday selector works | ⬜ |
| R4 | Monthly Recurrence | 1. Select "Monthly"<br>2. Create task | Monthly recurrence saved | ⬜ |
| R5 | Recurring Badge | 1. View board with recurring task | 🔄 badge appears on task card | ⬜ |
| R6 | Disable Recurring | 1. Uncheck "Recurring Task" | Options hidden | ⬜ |

---

## 11. Templates Library (Phase 1)

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TP1 | Open Templates | 1. Click "Templates" button in header | Templates modal opens | ⬜ |
| TP2 | View Project Templates | 1. Click "Project Templates" tab | 4+ templates displayed | ⬜ |
| TP3 | View Task Templates | 1. Click "Task Templates" tab | 4+ templates displayed | ⬜ |
| TP4 | Preview Template | 1. Click "Preview" on any template | Preview modal shows template details | ⬜ |
| TP5 | Use Project Template | 1. Click "Use Template" on Agile Dev | New project created with tasks | ⬜ |
| TP6 | Use Task Template | 1. Click "Use Template" on Bug Report | Task modal opens with pre-filled fields | ⬜ |
| TP7 | Close Templates | 1. Click "X" or "Close" | Modal closes | ⬜ |

---

## 12. Sprints

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| SP1 | View Sprints | 1. Click "Sprints" in navigation | Sprints view loads | ⬜ |
| SP2 | Create Sprint | 1. Click "Start Sprint"<br>2. Fill name, goal, dates<br>3. Save | Sprint created, active sprint displayed | ⬜ |
| SP3 | Sprint Progress | 1. Add tasks to sprint<br>2. Complete some tasks | Progress bar updates | ⬜ |
| SP4 | Add Tasks to Sprint | 1. Click "Add Tasks to Sprint"<br>2. Select tasks<br>3. Confirm | Tasks added to sprint board | ⬜ |
| SP5 | Complete Sprint | 1. Click "Complete Sprint"<br>2. Confirm | Sprint moves to Past Sprints | ⬜ |
| SP6 | View Past Sprints | 1. Scroll to Past Sprints section | Completed sprints listed | ⬜ |

---

## 13. Reports & Analytics

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| RP1 | View Reports | 1. Click "Reports" in navigation | Reports view loads | ⬜ |
| RP2 | Stats Cards | 1. View reports page | 6 stat cards show correct numbers | ⬜ |
| RP3 | Date Range Filter | 1. Change date range dropdown | Charts and stats update | ⬜ |
| RP4 | Completion Trend Chart | 1. View chart | Line chart displays correctly | ⬜ |
| RP5 | Priority Distribution Chart | 1. View chart | Doughnut chart shows priorities | ⬜ |
| RP6 | Team Performance Chart | 1. View chart | Bar chart shows team stats | ⬜ |
| RP7 | Burndown Chart | 1. Have active sprint with tasks | Burndown chart displays | ⬜ |
| RP8 | Project Health Table | 1. Scroll to table | Projects listed with completion % and status | ⬜ |
| RP9 | Export CSV | 1. Click "Export CSV" | CSV file downloads | ⬜ |
| RP10 | Export PDF | 1. Click "Export PDF" | Print dialog opens | ⬜ |
| RP11 | Export Chart | 1. Click download icon on any chart | PNG downloads | ⬜ |
| RP12 | Refresh Reports | 1. Click "Refresh" button | Reports reload | ⬜ |

---

## 14. Settings Page (Phase 1)

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| SE1 | Open Settings | 1. Click "Settings" in navigation | Settings page loads | ⬜ |
| SE2 | General Tab | 1. View General tab | Organization profile, appearance settings visible | ⬜ |
| SE3 | Notifications Tab | 1. Click Notifications tab | Email notification toggles visible | ⬜ |
| SE4 | Team Tab | 1. Click Team tab | Permissions table visible | ⬜ |
| SE5 | Integrations Tab | 1. Click Integrations tab | Integration cards with "Coming Soon" visible | ⬜ |
| SE6 | Danger Zone Tab | 1. Click Danger Zone tab | Archive, Export, Leave, Delete options visible | ⬜ |
| SE7 | Save Organization Settings | 1. Change org name<br>2. Click "Save Changes" | Name updates in sidebar | ⬜ |
| SE8 | Theme Selector | 1. Change theme to Dark/Light/System | Theme changes immediately | ⬜ |
| SE9 | Notification Toggles | 1. Toggle switches<br>2. Page reload | Preferences saved | ⬜ |

---

## 15. Activity Log

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| AL1 | Open Activity Log | 1. Click clock icon in header | Activity panel slides in from right | ⬜ |
| AL2 | View Activities | 1. Perform actions (create task, etc.)<br>2. Open activity log | Actions logged with timestamps | ⬜ |
| AL3 | Close Activity Log | 1. Click "X" or overlay | Panel closes | ⬜ |
| AL4 | Activity Icons | 1. View different action types | Correct icons (create, update, delete, etc.) | ⬜ |

---

## 16. Dark Mode

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| D1 | Toggle Dark Mode | 1. Click moon/sun icon | Theme switches, icon updates | ⬜ |
| D2 | Persist Theme | 1. Switch to dark mode<br>2. Refresh page | Dark mode remains active | ⬜ |
| D3 | System Preference | 1. Set theme to "System" in Settings | Follows OS preference | ⬜ |

---

## 17. Mobile Responsiveness

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| MB1 | Mobile Header | 1. View on mobile width (<768px) | Hamburger menu visible | ⬜ |
| MB2 | Sidebar Toggle | 1. Click hamburger menu | Sidebar opens | ⬜ |
| MB3 | Close Sidebar | 1. Click "X" or overlay | Sidebar closes | ⬜ |
| MB4 | Bottom Navigation | 1. View on mobile | Bottom nav with 5 items visible | ⬜ |
| MB5 | Bottom Nav Navigation | 1. Click bottom nav items | View switches correctly | ⬜ |
| MB6 | New Task FAB | 1. Click "+" in bottom nav | Task modal opens | ⬜ |
| MB7 | Pull to Refresh | 1. Pull down from top of page | Refresh spinner, data reloads | ⬜ |

---

## 18. Keyboard Shortcuts

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| K1 | New Task | Press `N` | Task modal opens | ⬜ |
| K2 | New Project | Press `P` | Project modal opens | ⬜ |
| K3 | Focus Search | Press `/` | Search input focused | ⬜ |
| K4 | Focus Filter | Press `S` | Filter dropdown opens | ⬜ |
| K5 | Board View | Press `B` | Switches to Board view | ⬜ |
| K6 | Sprints View | Press `R` | Switches to Sprints view | ⬜ |
| K7 | Close Modal | Press `Escape` | Active modal closes | ⬜ |
| K8 | Show Shortcuts | Press `?` | Shortcuts help modal appears | ⬜ |
| K9 | Undo Delete | Press `Ctrl+Z` / `⌘+Z` | Restores deleted item | ⬜ |

---

## 19. Offline Support

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| OF1 | Offline Indicator | 1. Go offline (DevTools → Network → Offline) | Yellow banner appears | ⬜ |
| OF2 | Offline Task Creation | 1. Go offline<br>2. Create task | Task queued, toast notification | ⬜ |
| OF3 | Online Sync | 1. Go back online | Queued changes sync, success toast | ⬜ |

---

## 20. Team Invitations

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| I1 | Open Invite Modal | 1. Click "Invite" in sidebar | Invite modal opens | ⬜ |
| I2 | Send Invite | 1. Enter email<br>2. Select role<br>3. Submit | Success toast, email sent | ⬜ |
| I3 | View Pending Invites | 1. Click "View Pending Invites" | List of pending invites shown | ⬜ |
| I4 | Cancel Invite | 1. Click "Cancel" on pending invite | Invite cancelled | ⬜ |

