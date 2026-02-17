# Chief Project Manager — User Guide v1.0.0

## What is Chief Project Manager?

Chief Project Manager (CPM) is a web-based project resource planning tool designed for multi-disciplinary teams. It helps project managers allocate team members across projects, plan weekly hours, track recorded time against planned time, and manage tasks — all organized by discipline/category.

---

## Getting Started

### 1. Sign In
When you first open the app, enter your display name and click **Continue**. Your identity is stored locally so you'll be recognized on return visits.

### 2. Welcome Page
You'll see two options:
- **Create a project of your own** — starts a fresh workspace where you define your disciplines, team members, and projects.
- **Open existing project** — shows your saved workspaces as tiles. Hover to rename (pencil icon) or delete (trash icon).

### 3. Setup Disciplines
After creating a new workspace, you'll be taken to the Setup page where you define your discipline categories (e.g., Architecture, Engineering, Landscape). Each discipline gets a unique color.

---

## The Four Panels

### Panel 1: Sticker Wall
A kanban-style board where team members can post sticky notes organized by project. Select a user from the dropdown to view their stickers. Great for daily standups and quick task tracking.

### Panel 2: Discipline Overview
The main resource planning view. Shows all disciplines with their projects in a monthly grid.

**Key features:**
- **Add Group** button to create new discipline categories
- **Add Project** within each discipline
- **Double-click** project names to rename inline
- Weekly hour allocation per team member per project
- Member stickers showing hours across the week
- Deadline flags and task lists per project
- **Add/remove team members** within each discipline

### Panel 3: Personal Schedule
Shows a single team member's weekly schedule across all their assigned projects. Use the **Add User** button to create new team members and assign them to a discipline.

### Panel 4: Project Management
A project-centric view showing tasks, Gantt charts, and time summaries for each project. Use the **New Project** button to create projects and assign managers.

---

## Plan vs Record Mode

The toggle in the header switches between two parallel data sets:

- **Plan Mode** (light theme): Enter your planned hours for each person/project/week.
- **Record Mode** (dark theme): Enter actual hours worked. When plan data is first created, it's automatically copied to record mode as a baseline.

Changes in Record mode do **not** affect Plan mode, allowing comparison and variance analysis.

---

## Workspace Management

- **Double-click** the workspace name in the header to rename it
- Click **Exit** to return to the Welcome page
- Each user only sees their own workspaces plus any shared/sample workspaces

---

## Data Management

All data is stored in the cloud and organized by workspace. Each workspace contains its own:
- Disciplines and their colors
- Team members (app_users)
- Projects with job numbers and date ranges
- Hours (planned and recorded)
- Tasks with Gantt dates
- Stickers
- Deadlines and assignments
