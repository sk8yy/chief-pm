

# Phase 1 Implementation: Foundation, Data Layer, and App Shell

This phase sets up the Lovable Cloud (Supabase) backend, seeds default data, and builds the app shell with navigation and Plan/Record mode toggle. The Excel screenshots you provided will guide the visual structure of Panel 2 in Phase 2.

---

## Step 1: Enable Lovable Cloud (Supabase)

Provision the Supabase backend to host all shared data (disciplines, users, projects, hours, tasks, deadlines).

---

## Step 2: Database Schema

Create the following tables via SQL migration:

**disciplines**
- `id` (uuid, PK), `name` (text), `color` (text -- hex or keyword), `sort_order` (int)

**app_users** (named to avoid conflict with Supabase auth.users)
- `id` (uuid, PK), `name` (text), `discipline_id` (FK to disciplines)

**projects**
- `id` (uuid, PK), `name` (text), `job_number` (text, default 'xxxxxx-xx'), `discipline_id` (FK), `manager_id` (FK to app_users, nullable), `sort_order` (int)

**hours**
- `id` (uuid, PK), `user_id` (FK), `project_id` (FK), `date` (date), `planned_hours` (numeric), `recorded_hours` (numeric, nullable)

**tasks**
- `id` (uuid, PK), `description` (text), `project_id` (FK), `user_id` (FK), `week_start` (date), `is_planned` (boolean), `is_completed` (boolean, default false)

**deadlines**
- `id` (uuid, PK), `name` (text), `date` (date), `project_id` (FK, nullable), `created_by` (FK to app_users), `type` (text -- 'global' or 'personal')

All tables get RLS policies allowing full access (no auth in v1).

---

## Step 3: Seed Default Data

Insert via SQL migration:

**Disciplines** (with color families matching your Excel):
| Name | Color Family |
|------|-------------|
| Landscape | Green (#4CAF50 family) |
| Urban Design | Pink/Orange (#FF7043 family) |
| Urban Planning | Orange (#FF9800 family) |
| Mainland | Purple (#7E57C2 family) |
| Leave | Blue (#42A5F5 family) |

**Users:**
| Name | Discipline |
|------|-----------|
| Ayaan | Mainland |
| Leo | Urban Design |
| Fischer | Urban Design |
| Eleen | Landscape |
| Gary | Landscape |

**Projects:**
| Name | Job Number | Discipline |
|------|-----------|-----------|
| AAHK EIA | 276007-01 | Urban Planning |
| HX TOD | 308070-07 | Urban Design |
| Ludan Village | xxxxxx-xx | Landscape |
| Qianwan Park | xxxxxx-xx | Mainland |

---

## Step 4: App Shell and Layout

**New files to create:**

- `src/contexts/AppContext.tsx` -- Global state: active panel, current user, plan/record mode
- `src/components/AppHeader.tsx` -- Header bar with:
  - Three panel buttons (Discipline Overview, Personal Schedule, Project Management)
  - Plan/Record toggle switch
  - User selector dropdown (populated from app_users table)
- `src/pages/Index.tsx` -- Renders header + conditionally renders the active panel component (placeholder panels for now)

**Visual behavior:**
- Plan mode: Light theme (default Tailwind/shadcn styles)
- Record mode: Adds `dark` class to root, applying dark background, light text, subdued accent colors
- Active panel button is highlighted; inactive ones are muted

**Placeholder panel components** (to be built in later phases):
- `src/components/panels/DisciplineOverview.tsx`
- `src/components/panels/PersonalSchedule.tsx`
- `src/components/panels/ProjectManagement.tsx`

Each placeholder shows the panel name and a brief description so you can verify navigation works.

---

## Step 5: Data Hooks

Create React Query hooks for fetching seed data:

- `src/hooks/useUsers.ts` -- fetch all app_users with discipline info
- `src/hooks/useProjects.ts` -- fetch all projects with discipline info
- `src/hooks/useDisciplines.ts` -- fetch all disciplines

These hooks will be used by the header (user selector) and all panels.

---

## Step 6: Discipline Color Utility

Create `src/lib/colors.ts` with:
- A mapping from discipline name/id to color values (background, text, border, desaturated variant for Record mode)
- Helper functions: `getDisciplineColor(disciplineId)`, `getDisciplineColorRecord(disciplineId)`
- Colors match the Excel reference: green rows for Landscape, orange for Urban Design/Planning, purple for Mainland, blue-ish for Leave

---

## What This Phase Delivers

After Phase 1, you will see:
1. A working header with three panel buttons that switch views
2. A Plan/Record toggle that switches the entire UI between light and dark themes
3. A user dropdown populated with the 5 default users from the database
4. Three placeholder panels confirming navigation works
5. A fully provisioned database with all tables and seed data ready for Phase 2

Phase 2 (Personal Schedule panel) will follow immediately, using the Excel layout you shared as the visual reference -- weekly rows with discipline-grouped project rows, day columns, colored hour blocks, weekly summary, OT calculation, and the Time Booking Summary table at the bottom.

