# Product Requirements Document — Chief Project Manager v1.0.0

## Vision

Chief Project Manager (CPM) is a lightweight, multi-disciplinary resource planning tool that gives project managers a clear overview of team allocation, project timelines, and time tracking — without the complexity of enterprise PM software.

## Target Users

1. **Project Managers** in architecture, engineering, and consulting firms who manage 5–50 team members across multiple projects.
2. **Team Leads** who need visibility into their discipline's workload and individual schedules.
3. **Individual Contributors** who track their own time and tasks.

---

## Feature Specifications

### F1: Workspace Management
- Create, rename, and delete workspaces
- Each workspace is an isolated project environment
- Per-user workspace ownership with shared sample projects

### F2: Discipline Setup
- Define discipline categories with unique colors
- Add/remove disciplines at any time
- Sort order support for display consistency

### F3: Sticker Wall (Panel 1)
- Per-user sticky notes organized by project
- Free-text content editing
- AI-powered sticker analysis (via edge function)

### F4: Discipline Overview (Panel 2)
- Monthly grid view with weekly columns
- Projects grouped under disciplines
- Member stickers showing per-person, per-project weekly hours
- Inline project renaming via double-click
- Deadline flags with categories (due, milestone, review, presentation)
- Task lists per project per week
- Add/remove projects and team members

### F5: Personal Schedule (Panel 3)
- Individual user view across all assigned projects
- Weekly hour cells for planning and recording
- User creation with discipline assignment

### F6: Project Management (Panel 4)
- Project-centric task management
- Gantt chart visualization with start/end dates
- Time summary tables (planned vs recorded)
- Project creation with manager assignment

### F7: Plan vs Record Mode
- Toggle between planning and recording contexts
- Automatic baseline copy from plan to record
- Independent editing in each mode
- Visual theme differentiation (light/dark)

### F8: User Identity
- Simple name-based sign-in (no email/password required)
- LocalStorage-backed session persistence
- Per-user workspace filtering

---

## Data Model Overview

| Entity | Key Fields |
|--------|-----------|
| workspaces | name, owner_id |
| disciplines | name, color, sort_order, workspace_id |
| app_users | name, discipline_id, workspace_id |
| projects | name, job_number, discipline_id, manager_id, start/end dates, workspace_id |
| hours | user_id, project_id, date, planned_hours, recorded_hours, workspace_id |
| tasks | description, project_id, user_id, week_start, start/end dates, is_planned, is_completed |
| stickers | content, user_id, project_id, workspace_id |
| deadlines | name, date, category, type, project_id, created_by, visible_to |
| assignments | user_id, project_id, week_start, workspace_id |
| profiles | display_name |

---

## Future Roadmap

- [ ] Export to PDF/Excel reports
- [ ] Real-time collaboration (multi-user live editing)
- [ ] Email notifications for deadline reminders
- [ ] Dashboard analytics with charts
- [ ] Mobile-responsive optimizations
- [ ] Role-based permissions (admin, editor, viewer)
