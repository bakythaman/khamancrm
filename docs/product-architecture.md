# Khaman CRM Product Architecture

## Positioning

Khaman CRM is a convenient CRM platform for B2B and B2C teams that sell through WhatsApp and phone calls. It focuses on speed, shared visibility, and automatic activity capture, with vertical workspace profiles for industries that need deeper operational modules.

## Primary Personas

- Owner: wants clear sales status without learning complex CRM logic.
- Sales manager: needs a clean pipeline, follow-ups, and fast replies.
- Team lead: monitors response time, lost leads, workload, and conversion.
- Repair-company owner: registers a company and immediately gets a GG-style platform with a public landing subsite, repair project workspace, staff accounts, and a client cabinet.

## Product Modules

1. Dashboard: daily focus, revenue, response time, overdue work, recent conversations.
2. Pipeline: Kanban stages with drag and drop, simple cards, deal value, owner, next step.
3. WhatsApp Inbox: shared conversation queue, assignment, tags, quick replies, AI summary.
4. Deal Details: contact, timeline, calls, messages, tasks, notes, AI call notes.
5. Tasks: follow-ups, overdue work, owner filters, quick completion.
6. Analytics: lead conversion, response time, manager activity, lost reasons, sales performance.
7. Settings: workspace profile, WhatsApp connection, telephony, automation preferences.
8. Team Management: roles, seats, workload, activity, invitation flow.
9. Repair Platform: a vertical workspace for repair companies with a generated landing subsite, object projects, stages, worker tasks, materials, payments, documents, approvals, photo reports, and a client cabinet.

## Wireframe Descriptions

### Login

Centered auth panel with workspace name, email, password, and a WhatsApp-colored sign-in action. No marketing hero. The page feels calm and direct.

### Dashboard

Left navigation, top search, compact KPI row, two-column work area. The first visible objects are "Today's follow-ups", "Hot conversations", and "Pipeline health". The dashboard is operational, not decorative.

### Pipeline

Horizontal Kanban board with five stages: New, Contacted, Qualified, Proposal, Won. Deal cards show contact, source, value, owner, and next task. Dragging a card changes stage locally in the UI and maps to `PATCH /deals/:id/stage`.

### WhatsApp Inbox

Three-pane responsive layout: conversation list, active chat, right context panel. On mobile it collapses into a single conversation-first workflow. Fast replies and assignment actions stay visible near the composer.

### Deal Details

Header with contact, value, stage, owner, click-to-call, WhatsApp action. Body uses timeline, tasks, AI summary, and call history. Editing is inline and focused.

### Tasks

List-first layout grouped by overdue, today, and upcoming. Completion is one click. Filters are simple chips for owner and status.

### Analytics

Scannable metrics with small charts. No oversized executive dashboard. The screen emphasizes conversion, response time, lost leads, and team activity.

### Settings

Workspace, integrations, automation, and notification panels. Each panel is short and task-based.

### Team Management

Team table with roles, open conversations, closed deals, response time, and status. Invitation action is always available from the header.

### Repair Projects

Available only for workspaces registered as repair companies. The module keeps Gulvira Group-style operations inside Khaman CRM as a platform, not a separate app:

- `/site`: public landing subsite for the company with services, portfolio, estimate calculator, and lead capture.
- `/repair`: internal workspace with objects, client details, budget, payments, stages, task execution, materials, and reports.
- `/client`: client cabinet with progress, visible stages, photo reports, documents, payments, and approvals.
- `/team`: staff accounts for designers, foremen, workers, managers, and owners.

Creating a new repair object also creates a matching sales deal in the standard pipeline, so the company moves from lead to measurement, estimate, contract, and active project without leaving Khaman CRM. Gulvira Group is seeded as the first repair-company client and provides the starter content for the repair vertical.

## UX Rules

- Use plain language and short labels.
- Keep primary actions close to the object they affect.
- Avoid nested settings and long forms.
- Keep cards to individual repeated items only.
- Use WhatsApp green only for messaging and positive system accents.
- Use neutral UI with small blue, amber, and rose status accents where useful.
- Design mobile as a real workflow, not a squeezed desktop.

## Data Flow

WhatsApp and telephony events enter the NestJS API through webhooks. The API writes messages, calls, tasks, and timeline events to PostgreSQL. WebSocket events update the inbox, pipeline, and notifications in real time. AI workers create message summaries, voice transcriptions, and call notes asynchronously.
