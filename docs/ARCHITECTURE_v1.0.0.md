# Architecture Document — Chief Project Manager v1.0.0

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State Management | TanStack React Query |
| Routing | React Router v6 |
| Backend | Supabase (PostgreSQL, Edge Functions) |
| Charts | Recharts |

---

## Component Hierarchy

```mermaid
graph TD
    App[App.tsx - Router] --> WP[WelcomePage]
    App --> SD[SetupDisciplines]
    App --> WV[WorkspaceView]
    
    WV --> AH[AppHeader]
    WV --> SW[StickerWall - Panel 1]
    WV --> DO[DisciplineOverview - Panel 2]
    WV --> PS[PersonalSchedule - Panel 3]
    WV --> PM[ProjectManagement - Panel 4]
    
    DO --> HC[HourCell]
    DO --> HB[HourBlock]
    DO --> MS[MemberSticker]
    DO --> TL[TaskList]
    DO --> ADD[AddDisciplineDialog]
    DO --> AMP[AddMemberDialog]
    DO --> CPD[CreateProjectDialog]
    
    PS --> HC
    PS --> AUD[AddUserDialog]
    
    PM --> TG[TaskGantt]
    PM --> TST[TimeSummaryTable]
    PM --> APD[AddProjectDialog]
```

---

## Data Flow

```mermaid
flowchart LR
    subgraph Context
        AC[AppContext<br/>activePanel, mode,<br/>workspaceId, userId, profileId]
    end
    
    subgraph Hooks
        UW[useWorkspaces]
        UD[useDisciplines]
        UU[useUsers]
        UP[useProjects]
        UH[useHours]
        UT[useTasks]
        US[useStickers]
        UDL[useDeadlines]
        UA[useAssignments]
        UPR[useProfile]
    end
    
    subgraph Database
        DB[(Supabase<br/>PostgreSQL)]
    end
    
    AC --> Hooks
    Hooks <-->|React Query| DB
```

---

## Database Schema (ER Diagram)

```mermaid
erDiagram
    profiles {
        uuid id PK
        text display_name
        timestamptz created_at
    }
    
    workspaces {
        uuid id PK
        text name
        uuid owner_id FK
        timestamptz created_at
    }
    
    disciplines {
        uuid id PK
        text name
        text color
        int sort_order
        uuid workspace_id FK
    }
    
    app_users {
        uuid id PK
        text name
        uuid discipline_id FK
        uuid workspace_id FK
    }
    
    projects {
        uuid id PK
        text name
        text job_number
        uuid discipline_id FK
        uuid manager_id FK
        date start_date
        date end_date
        int sort_order
        uuid workspace_id FK
    }
    
    hours {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        date date
        numeric planned_hours
        numeric recorded_hours
        uuid workspace_id FK
    }
    
    tasks {
        uuid id PK
        text description
        uuid project_id FK
        uuid user_id FK
        date week_start
        date start_date
        date end_date
        bool is_planned
        bool is_completed
        uuid workspace_id FK
    }
    
    stickers {
        uuid id PK
        text content
        uuid user_id FK
        uuid project_id FK
        uuid workspace_id FK
    }
    
    deadlines {
        uuid id PK
        text name
        date date
        text category
        text type
        uuid project_id FK
        uuid created_by FK
        uuid workspace_id FK
    }
    
    assignments {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        date week_start
        uuid workspace_id FK
    }
    
    profiles ||--o{ workspaces : "owns"
    workspaces ||--o{ disciplines : "contains"
    workspaces ||--o{ app_users : "contains"
    workspaces ||--o{ projects : "contains"
    disciplines ||--o{ app_users : "has members"
    disciplines ||--o{ projects : "categorizes"
    app_users ||--o{ hours : "logs"
    projects ||--o{ hours : "tracked in"
    app_users ||--o{ tasks : "assigned"
    projects ||--o{ tasks : "has"
    app_users ||--o{ stickers : "creates"
    projects ||--o{ deadlines : "has"
    app_users ||--o{ assignments : "assigned"
    projects ||--o{ assignments : "includes"
```

---

## Hook Patterns

All data hooks follow a consistent pattern:
1. **Query hooks** (`useProjects`, `useUsers`, etc.) — filter by `workspace_id` from `AppContext`
2. **Mutation hooks** — use `useMutation` with `onSuccess` invalidation of the parent query key
3. **Upsert pattern** — hours use upsert logic to handle create-or-update in a single operation
4. **Plan/Record sync** — when creating planned hours, `recorded_hours` is auto-populated as baseline

## Edge Functions

| Function | Purpose |
|----------|---------|
| `analyze-stickers` | AI-powered analysis of sticker content |
| `match-project` | AI-powered project matching from sticker text |
