

# Rewrite Project Management Panel

## Overview
Replace the current multi-project list view with a single-project-focused panel containing three sections: Project Info, Hour Management, and Deadlines. A discipline-categorized dropdown at the top lets the user switch between projects.

## Database Change
Add `start_date` and `end_date` columns to the `projects` table (both nullable `date` type). This requires a migration.

## New Hooks

### `useUpdateProject` (in `src/hooks/useProjects.ts`)
A mutation hook to update project fields (name, job_number, discipline_id, manager_id, start_date, end_date). Invalidates `['projects']` on success.

### `useProjectDeadlines` + `useAddDeadline` + `useDeleteDeadline` (new file `src/hooks/useDeadlines.ts`)
- Query deadlines filtered by `project_id`
- Insert mutation for adding a deadline (name, date, project_id, created_by)
- Delete mutation by deadline id

## UI Structure (`src/components/panels/ProjectManagement.tsx` -- full rewrite)

### Top Bar
- **Project Selector**: A `<Select>` dropdown with options grouped by discipline (using `<SelectGroup>` + `<SelectLabel>`). Selecting a project loads its data.
- **Month Navigation**: Prev/Next month arrows + month label (same pattern as current).

### Section 1: Project Info
An editable card with fields:
- **Project Name** -- text input, auto-saves on blur
- **Job Number** -- text input, auto-saves on blur
- **Discipline** -- `<Select>` from disciplines list
- **Project Manager** -- `<Select>` from all `app_users`
- **Start Date** / **End Date** -- date inputs

All changes call `useUpdateProject` on change/blur.

### Section 2: Hour Management
- **"Add Member" button** (top-right): Opens a popover/select to pick a user from `app_users` not already on the project. Adding a member inserts a zero-hour row for the current month's weeks.
- **Grid**: Columns = weeks of the month. Rows = members who have hours on this project.
  - Each cell shows planned hours and (in record mode) actual hours.
  - Member name column has an "x" button to remove the member (deletes their hour entries for this project in the visible range).
- **Totals row** at the bottom.
- **Bar chart visualization** below the grid using `recharts` (already installed). Grouped bar chart with one group per member per week, showing planned (blue) vs actual (red/green) bars.

### Section 3: Deadlines
- A list of deadlines for the selected project, each showing name + date.
- **"Add Deadline" button**: Inline form row with name input + date input + confirm button.
- Each deadline row has a delete "x" button.
- Sorted by date ascending.

## Technical Details

### Files Modified
1. **Migration** -- `ALTER TABLE public.projects ADD COLUMN start_date date; ALTER TABLE public.projects ADD COLUMN end_date date;`
2. **`src/hooks/useProjects.ts`** -- Add `useUpdateProject` mutation
3. **`src/hooks/useDeadlines.ts`** -- New file with query + add/delete mutations for project deadlines
4. **`src/components/panels/ProjectManagement.tsx`** -- Full rewrite with the three sections described above

### Member Management Logic
- "Add Member" inserts a placeholder hour entry (0 planned hours) for each day in the current week range so the user appears in the grid.
- "Remove Member (x)" deletes all `hours` rows for that user+project within the visible date range.

### Hour Visualization
Uses `recharts` `BarChart` with `Bar` components for planned vs actual, grouped by member name, one chart group per week. Only shown when there is data and mode is `record`.

