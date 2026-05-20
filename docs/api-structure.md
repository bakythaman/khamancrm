# API Structure

Base URL: `/api/v1`

## Auth

- `POST /auth/login`: email and password, returns access token and user.
- `POST /auth/refresh`: returns a fresh access token.
- `GET /auth/me`: current user and workspace role.

## Deals

- `GET /deals`: list deals by stage, owner, status, search.
- `POST /deals`: create deal.
- `GET /deals/:id`: deal, contact, timeline, tasks, calls.
- `PATCH /deals/:id`: update deal fields.
- `PATCH /deals/:id/stage`: move a deal to another stage.

## Conversations

- `GET /conversations`: shared inbox list.
- `GET /conversations/:id`: messages and context.
- `PATCH /conversations/:id/assign`: assign manager.
- `POST /conversations/:id/messages`: send WhatsApp reply.
- `POST /conversations/:id/tags`: attach tags.
- `POST /conversations/webhooks/whatsapp`: WhatsApp inbound webhook.

## Calls

- `GET /calls`: call history.
- `POST /calls`: create click-to-call request.
- `GET /calls/:id/recording`: signed recording URL.
- `POST /calls/webhooks/status`: telephony provider status webhook.

## Tasks

- `GET /tasks`: tasks by owner, status, due date.
- `POST /tasks`: create follow-up.
- `PATCH /tasks/:id`: update.
- `PATCH /tasks/:id/complete`: complete task.

## Analytics

- `GET /analytics/overview`: revenue, conversion, response time, lost leads.
- `GET /analytics/managers`: team activity.
- `GET /analytics/pipeline`: stage totals and conversion.

## Team and Settings

- `GET /users`: team list.
- `POST /users/invite`: invite teammate.
- `PATCH /users/:id/role`: update role.
- `GET /settings/integrations`: WhatsApp, telephony, AI.
- `PATCH /settings/workspace`: workspace settings.

## Realtime Events

Namespace: `/realtime`

- `conversation.created`
- `message.created`
- `conversation.assigned`
- `deal.updated`
- `deal.stageChanged`
- `task.created`
- `task.completed`
- `call.statusChanged`
- `analytics.refreshed`

Every event includes `organizationId`, `actorId`, `entityId`, `timestamp`, and a small payload optimized for UI refresh.
