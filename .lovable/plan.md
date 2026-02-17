

# Multi-Discipline Work Hour Management System

## Overview
A centralized web app replacing spreadsheet-based work hour tracking. Three role-specific panels share a unified backend, with Plan and Record modes offering parallel data sets for scheduling vs. actuals.

---

## Phase 1: Foundation & Data Layer

### Lovable Cloud Backend Setup
- **Database tables**: Disciplines, Users, Projects, Hours (with planned/recorded fields), Tasks, Deadlines
- **Default data seeding**: 5 disciplines (Urban Planning, Urban Design, Landscape, Mainland, Leave), 5 default users (Ayaan, Leo, Fischer, Eleen, Gary), 4 default projects with job numbers
- **Color mapping**: Each discipline gets its signature color family (pink, green, orange, purple, blue)

### App Shell & Navigation
- **Header bar** with three panel buttons: Discipline Overview, Personal Schedule, Project Management
- **Plan/Record mode toggle** in the header — Record mode triggers a dark theme across the entire UI
- **Simple user selector** (no login in v1 — dropdown to pick your identity)

---

## Phase 2: Panel 2 — Personal Work Schedule (Team Member View)

*Built first as the most interactive panel and core data entry point.*

### Weekly Calendar Grid
- Monday–Sunday columns, weeks stacked vertically
- Default view: current month's weeks, with controls to add/remove weeks
- Discipline-colored project rows grouped by discipline

### Drag-and-Drop Hour Entry (Plan Mode)
- Drag horizontally across day cells to create a colored hour block for a project
- Click into block to enter numeric hours
- Blocks color-coded by discipline color family

### Record Mode Enhancements
- Existing blocks can be resized and hours edited independently
- Brackets show difference from planned (e.g., "+2h" / "−1.5h"), green if under/equal, red if over
- Slightly desaturated block colors to visually distinguish from Plan mode

### Task List per Week
- Task descriptions next to each week row, grouped by project
- Plan mode: add/edit task text
- Record mode: checkbox to mark complete (strikethrough on completion)

### Deadlines
- Global deadlines shown as small icons on date cells
- Personal reminders: add local-only deadline entries with a distinct visual style

### Totals & Summary
- Weekly totals (right of Sunday): Total Hours + OT (anything over 40h)
- Monthly time booking summary at bottom: Normal Hours vs. OT per project

---

## Phase 3: Panel 1 — Discipline Overview (Team Leader View)

### Calendar Table Layout
- Columns: weeks grouped by month (default: 2 months starting from current)
- Rows: projects under the selected discipline
- Controls to add/remove visible months

### Project & Team Management
- Expand a project row to see assigned team members
- Add/remove users from projects
- Numeric hour input per user per week

### Deadlines in Grid
- Add/delete deadlines with name + date per project
- Small deadline icon appears on the corresponding week cell

### Record Mode View
- Cells show recorded hours with bracketed difference from planned
- Color-coded: green (on track), red (over)

### Cross-Panel Navigation
- Double-click a project header → jump to Panel 3 for that project

---

## Phase 4: Panel 3 — Project Management (PM View)

### Project Selector & Details
- Dropdown to choose project, with add/edit/delete controls
- Editable fields: Project Name, Job Number, PM/Coordinator

### Team Hour Grid
- Same week/month column structure as Panel 1
- Rows: users assigned to the project
- Plan mode: numeric hour input per user per week

### Record Mode with Aggregation
- Hours auto-populated from actual entries in Panel 2
- Each cell shows bracketed planned vs. recorded difference
- Total Hours row at bottom sums all users per week

### Task Assignment
- Below each user row: task list the PM can add/edit/delete
- Tasks sync automatically to the user's Panel 2 view

### Visual Comparisons
- Color-coded cells or small bar charts for planned vs. recorded hours
- Per-user and per-week comparison summaries

---

## Phase 5: Polish & Integration

### Plan ↔ Record Data Sync
- First switch to Record mode copies all Plan data as the baseline
- Subsequent Record edits are fully independent
- Comparison highlights throughout all panels

### Cross-Panel Features
- Double-click navigation between panels (project headers, user names)
- Global deadline consistency across all three panels
- Auto-save with debounce on all inputs

### Visual Polish
- Dark theme for Record mode (dark gray background, light text, subdued accent colors)
- Discipline color coding consistent everywhere
- Tooltips, keyboard navigation, responsive layout for 1280×768+

