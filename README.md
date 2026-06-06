# Khaman CRM

Khaman CRM is a modern WhatsApp-first CRM platform for small B2B and B2C teams. It keeps the fast shared inbox, clean pipeline, tasks, calls, analytics, and AI summaries, and now includes a repair-company workspace profile with project execution modules.

## Stack

- Frontend: Next.js 15, TypeScript, TailwindCSS, shadcn-style components, Framer Motion
- Backend: NestJS, JWT auth, role-based access, WebSockets
- Database: PostgreSQL with Prisma schema
- Product shape: shared WhatsApp inbox, pipeline, deal details, tasks, team, settings, analytics
- Repair-company vertical: generated landing subsite, repair project management, worker accounts, materials, payments, photo reports, documents, approvals, and client cabinet
- First seeded platform client: Gulvira Group

## Workspace

```bash
npm install
npm run dev:web
npm run dev:api
```

The project requires Node.js 20.11 or newer. The local machine currently reports an older Node version, so install dependencies and run the app from a Node 20+ shell.

## Key Files

- `apps/web`: customer-facing CRM web app
- `apps/api`: NestJS API and realtime gateway
- `apps/api/prisma/schema.prisma`: production database model
- `packages/types`: shared product/domain types
- `docs/product-architecture.md`: product structure, wireframes, UX rules
- `docs/api-structure.md`: REST and realtime API map

## Product Principle

Every screen is optimized for 1 to 2 click action. The app avoids heavy dashboards, dense forms, and CRM jargon. WhatsApp, calls, reminders, and deals are connected around the daily workflow of a small sales team.

## Repair Company Flow

When a new workspace registers as a repair company, Khaman CRM creates a repair pipeline and unlocks the `Ремонты` module. New repair objects are also added to the normal sales pipeline, so the company can move from lead to measurement, estimate, contract, and active project without leaving Khaman CRM.

The repair profile also creates a GG-style platform inside Khaman CRM:

- `/site` is the public landing subsite for the repair company. Landing requests become CRM leads.
- `/repair` is the internal workspace for projects, stages, workers, materials, payments, and reports.
- `/client` is the client cabinet with project progress, payments, documents, photo reports, and approvals.
- `/team` manages staff accounts so designers, foremen, and workers can sign in through Khaman CRM.
