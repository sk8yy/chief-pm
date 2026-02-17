

# Plan: Welcome Page and Multi-Workspace System

## Overview

Transform the app from a single-firm tool into a universal project management platform where each user can create and manage independent "workspaces" (previously hardcoded to your firm's disciplines). The existing data becomes a "Sample Project" workspace accessible from a welcome screen.

---

## What You'll See

1. **Welcome Page** - A landing page with large, colorful animated "Welcome to Chief Project Manager!" text
2. **Two options**: "Create a project of your own" and "Open existing project" (which lists saved workspaces including "Sample Project")
3. **Discipline Setup Page** - When creating new, users define their own categories (replacing "Discipline") with a "+" button and "Continue" to proceed
4. **Exit Button** - Top-left of the working interface to return to the welcome page (auto-saves)

---

## Technical Details

### 1. Database Changes

Add a `workspaces` table and link all existing tables to it:

```text
workspaces
  - id (uuid, PK)
  - name (text) -- editable workspace name
  - created_at (timestamptz)

-- Add workspace_id to existing tables:
  disciplines    + workspace_id (uuid, FK -> workspaces)
  app_users      + workspace_id (uuid, FK -> workspaces)
  projects       + workspace_id (uuid, FK -> workspaces)
  hours          + workspace_id (uuid, FK -> workspaces)
  tasks          + workspace_id (uuid, FK -> workspaces)
  stickers       + workspace_id (uuid, FK -> workspaces)
  deadlines      + workspace_id (uuid, FK -> workspaces)
  assignments    + workspace_id (uuid, FK -> workspaces)
```

Migration will:
- Create the `workspaces` table
- Insert a "Sample Project" workspace
- Add `workspace_id` column (nullable initially) to all 8 tables
- Backfill all existing rows with the Sample Project workspace ID
- Make `workspace_id` NOT NULL after backfill

### 2. Color System Update

Replace the hardcoded discipline-to-color mapping in `src/lib/colors.ts` with a dynamic system that:
- Uses the `color` field already stored in the `disciplines` table
- Derives bg/text/border/bgMuted/bgLight variants from the stored hex color by converting to HSL
- Provides a preset palette of ~10 distinct hues for auto-assignment when creating new disciplines

### 3. New Pages and Routing

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `WelcomePage` | Landing with title animation and two action cards |
| `/setup/:workspaceId` | `SetupDisciplines` | Define categories for a new workspace |
| `/workspace/:workspaceId` | `WorkspaceView` | The current 4-panel interface |

### 4. AppContext Changes

- Add `workspaceId` to context so all hooks can filter queries by workspace
- All existing hooks (`useProjects`, `useDisciplines`, `useUsers`, `useHours`, etc.) will add `.eq('workspace_id', workspaceId)` to their queries

### 5. New Components

**WelcomePage** (`src/pages/WelcomePage.tsx`)
- Large gradient-animated "Welcome to Chief Project Manager!" heading
- Two cards side by side:
  - "Create a project of your own" -- navigates to `/setup/:newWorkspaceId`
  - "Open existing project" -- shows list of saved workspaces (including "Sample Project") as clickable cards with editable names

**SetupDisciplines** (`src/pages/SetupDisciplines.tsx`)
- Heading: "Define your Disciplines / Groups / Project Categories..."
- List of added categories with auto-assigned colors (colored pills)
- "+" button to add a new category (text input)
- "Continue" button that inserts disciplines to DB and navigates to `/workspace/:id`

**AppHeader Update**
- Add an Exit button (door/arrow icon) on the top-left that navigates back to `/`
- Current workspace name displayed next to it

### 6. File Changes Summary

| File | Change |
|------|--------|
| `src/App.tsx` | Add routes for `/`, `/setup/:id`, `/workspace/:id` |
| `src/pages/WelcomePage.tsx` | New - welcome landing page |
| `src/pages/SetupDisciplines.tsx` | New - discipline/category creation flow |
| `src/pages/WorkspaceView.tsx` | New - wraps current Index.tsx content with workspace context |
| `src/contexts/AppContext.tsx` | Add `workspaceId` to context, read from route params |
| `src/lib/colors.ts` | Replace hardcoded map with dynamic HSL derivation from DB color field |
| `src/hooks/useWorkspaces.ts` | New - CRUD for workspaces table |
| `src/hooks/useDisciplines.ts` | Filter by `workspace_id` |
| `src/hooks/useUsers.ts` | Filter by `workspace_id` |
| `src/hooks/useProjects.ts` | Filter by `workspace_id` |
| `src/hooks/useHours.ts` | Filter by `workspace_id` |
| `src/hooks/useTasks.ts` | Filter by `workspace_id` |
| `src/hooks/useStickers.ts` | Filter by `workspace_id` |
| `src/hooks/useAssignments.ts` | Filter by `workspace_id` |
| `src/hooks/useDeadlines.ts` | Filter by `workspace_id` |
| `src/hooks/useAllHours.ts` | Filter by `workspace_id` |
| `src/components/AppHeader.tsx` | Add Exit button, show workspace name |
| `src/pages/Index.tsx` | Redirect to `/` (welcome page) |

### 7. Auto-Save

The existing auto-save/debounce behavior already persists all changes. Clicking "Exit" simply navigates back -- no explicit save action needed since all mutations are already instant.

### 8. Color Palette for New Disciplines

A preset rotation of 10 visually distinct hues will be used for auto-assigning colors:

```text
Green (122), Coral (14), Orange (36), Purple (262), Blue (207),
Teal (174), Rose (340), Amber (45), Indigo (230), Lime (85)
```

Each new discipline gets the next unused hue in the rotation.

