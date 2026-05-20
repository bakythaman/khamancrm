# Khaman CRM

Khaman CRM is a modern WhatsApp-first CRM for small B2B and B2C sales teams. It is designed for managers who want a fast shared inbox, a clean pipeline, simple tasks, calls, analytics, and AI summaries without enterprise CRM clutter.

## Stack

- Frontend: Next.js 15, TypeScript, TailwindCSS, shadcn-style components, Framer Motion
- Backend: NestJS, JWT auth, role-based access, WebSockets
- Database: PostgreSQL with Prisma schema
- Product shape: shared WhatsApp inbox, pipeline, deal details, tasks, team, settings, analytics

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
