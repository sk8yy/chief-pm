# Chief Project Manager

A multi-disciplinary resource planning and time tracking web application for project managers.

## Features

- **Multi-workspace** — Create and manage isolated project environments
- **Discipline-based organization** — Group projects and team members by category (Architecture, Engineering, etc.)
- **4-panel interface** — Sticker Wall, Discipline Overview, Personal Schedule, and Project Management
- **Plan vs Record mode** — Track planned hours against actual time with automatic baseline sync
- **Task management** — Per-project task lists with Gantt chart visualization
- **Deadline tracking** — Categorized deadlines (due, milestone, review, presentation)
- **Lightweight auth** — Simple name-based identity with per-user data isolation

## Quick Start

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd chief-project-manager

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Documentation

- [User Guide](docs/README_v1.0.0.md) — How to use the application
- [Product Requirements](docs/PRD_v1.0.0.md) — Feature specifications and roadmap
- [Architecture](docs/ARCHITECTURE_v1.0.0.md) — Technical overview with diagrams

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **State:** TanStack React Query
- **Backend:** Supabase (PostgreSQL, Edge Functions)
- **Charts:** Recharts

## License

[MIT](LICENSE)
