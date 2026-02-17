

# Plan: Fix Add Group visibility, Editable Workspace Name, Auth, Docs, and Pre-Publish

## Summary

This plan addresses all outstanding items before publishing to GitHub: fixing the "Add Group" button visibility concern, making the workspace name editable via double-click in the header, adding simple username-based authentication (no Google -- just a name input), generating documentation files (README, PRD, Architecture), and preparing the repository for open-source release.

---

## 1. "Add Group" Button in Panel 1

The "Add Group" button already exists in the code (line 342 of DisciplineOverview.tsx) and is visible in the UI. It appears this may have been a browser cache issue on your end. No code changes needed here -- it is functional.

## 2. Editable Workspace Name via Double-Click (AppHeader)

Currently the workspace name in the header (top-left, next to "Exit") is a static `<span>`. We will:

- Add double-click handler on the workspace name text
- On double-click, replace the `<span>` with an `<Input>` field pre-filled with the current name
- Save on Enter or blur, cancel on Escape
- Use the existing `useUpdateWorkspace` hook to persist the change

**File:** `src/components/AppHeader.tsx`

## 3. Simple Username-Based Auth (No Google)

Instead of Google OAuth, we will implement a lightweight identity system where users simply enter a display name to "sign in." This keeps the app accessible without requiring email verification or OAuth setup.

**Approach:**
- Add a `profiles` table: `id (uuid PK)`, `display_name (text)`, `created_at`
- On the Welcome Page, before showing the workspace options, check if a profile exists in `localStorage` (stored profile ID)
- If no profile, show a simple "Enter your name to get started" input
- Once entered, insert into `profiles` table, store the profile ID in localStorage
- Add `owner_id` column to `workspaces` table referencing `profiles.id`
- Filter workspaces by `owner_id` so each user only sees their own projects
- The "Sample Project" workspace will have `owner_id = NULL` and be visible to everyone as a demo/template

**Database migration:**
```sql
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.workspaces ADD COLUMN owner_id UUID REFERENCES public.profiles(id);
```

**New files:**
- `src/hooks/useProfile.ts` -- manages profile creation/retrieval from localStorage + database
- Update `src/contexts/AppContext.tsx` -- add `profileId` to context

**Modified files:**
- `src/pages/WelcomePage.tsx` -- add name input gate before showing workspace options; filter workspaces by owner
- `src/hooks/useWorkspaces.ts` -- include `owner_id` in creates, filter by profile

## 4. Documentation Files

Generate three documentation files for the repository:

**`docs/README_v1.0.0.md`** -- Comprehensive usage guide covering:
- What is Chief Project Manager
- Getting started (welcome page flow)
- Creating workspaces and disciplines
- Using the 4 panels (Sticker Wall, Discipline Overview, Personal Schedule, Project Management)
- Plan vs Record mode
- Data management

**`docs/PRD_v1.0.0.md`** -- Product Requirements Document covering:
- Product vision and goals
- User personas
- Feature specifications for each panel
- Data model overview
- Future roadmap

**`docs/ARCHITECTURE_v1.0.0.md`** -- Technical architecture document with:
- Technology stack overview
- Component hierarchy (Mermaid diagram)
- Data flow between panels
- Database schema (Mermaid ER diagram)
- Hook and context patterns

## 5. Update Root README.md

Replace the default Lovable README with a proper project README covering:
- Project description and features
- Screenshots placeholder
- Quick start instructions
- Link to detailed docs in `/docs`
- License (MIT)

## 6. Add LICENSE File

Add an MIT LICENSE file at the repository root.

## 7. Compact Sample Data

The existing "Sample Project: Urban Planning Firm" workspace already has all your data preserved in the database. No additional compaction is needed -- it is already scoped by `workspace_id`.

---

## Technical File Changes Summary

| File | Action |
|------|--------|
| `src/components/AppHeader.tsx` | Add double-click editing for workspace name |
| `src/contexts/AppContext.tsx` | Add `profileId` to context |
| `src/hooks/useProfile.ts` | New -- profile CRUD with localStorage |
| `src/hooks/useWorkspaces.ts` | Filter by `owner_id`, include in creates |
| `src/pages/WelcomePage.tsx` | Add name input gate, filter workspaces |
| `docs/README_v1.0.0.md` | New -- usage guide |
| `docs/PRD_v1.0.0.md` | New -- product requirements |
| `docs/ARCHITECTURE_v1.0.0.md` | New -- architecture docs |
| `README.md` | Rewrite for open-source |
| `LICENSE` | New -- MIT license |
| Database migration | Add `profiles` table, `owner_id` to workspaces |

## Implementation Order

1. Database migration (profiles table + owner_id)
2. Profile hook and context updates
3. Welcome page name gate and workspace filtering
4. AppHeader workspace name double-click editing
5. Documentation files (README, PRD, Architecture)
6. LICENSE file

