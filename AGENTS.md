# AGENTS.md

## Project Summary

This repository implements a personal schedule coordination web app.

The target architecture is:

```text
Cloudflare Pages
  + Vite React TypeScript frontend
  + Cloudflare Pages Functions backend
  + Cloudflare D1 database
```

The core persistence model is intentionally JSON-record-oriented:

```text
polls:
  one schedule page per row

responses:
  one participant's full answer per row
  answers are stored as JSON text
```

Do not normalize each timetable cell into a separate row unless explicitly requested.

## Primary Implementation Rule

Follow `SPEC.md`.

If the user request conflicts with `SPEC.md`, prefer the user request and update `SPEC.md` in the same change when appropriate.

## Important Architectural Decisions

Use D1 as a JSON-record store with minimal indexes.

Do:

```text
poll = one row in polls
participant response = one row in responses
answers = JSON object stored in responses.answers_json
summary = computed in TypeScript at read time
```

Do not do these in the initial implementation:

```text
- Do not use Workers KV as primary storage.
- Do not use Durable Objects as primary storage.
- Do not add an ORM.
- Do not add user accounts.
- Do not add OAuth.
- Do not add email delivery.
- Do not add Google Calendar integration.
- Do not create an availability row per participant-slot cell.
- Do not use dangerouslySetInnerHTML.
```

## Tech Stack Constraints

Use:

```text
Frontend:
  Vite
  React
  TypeScript

Backend:
  Cloudflare Pages Functions
  TypeScript

Database:
  Cloudflare D1
  binding name: DB

Tests:
  Vitest
```

Avoid adding dependencies unless they materially reduce complexity.

Before adding any dependency, check whether the same result is straightforward with platform APIs or small local helpers.

## Source Layout

Use this structure unless the repository already has a working structure:

```text
migrations/
functions/api/
src/
src/components/
src/lib/
src/routes/
test/
```

Keep shared pure logic in `src/lib/`.

Do not duplicate validation or summary logic across frontend and backend if it can be safely shared.

## Commands

Expected commands:

```bash
npm run typecheck
npm run test
npm run build
```

Run these before considering work complete.

If a command fails because scripts are not yet defined, add or fix the relevant script.

## Database Rules

Use SQL migrations under `migrations/`.

Use prepared statements for all SQL.

Never concatenate user input into SQL.

Use `CHECK (json_valid(...))` for JSON text columns.

Initial tables:

```text
polls
responses
```

Required indexes:

```text
responses(poll_slug)
responses(poll_slug, updated_at)
responses(edit_token_hash) unique
```

`responses.edit_token_hash` is an internal opaque random hash in the current prototype. Do not expose or require response edit tokens in client flows.

Do not add a `slots` table in the first implementation.

Slot definitions belong in `polls.config_json`.

## JSON Rules

`polls.config_json` must use:

```text
schemaVersion: 1
timezone
grid.days
grid.periods
grid.slots
statusLabels
```

`responses.answers_json` must use:

```text
schemaVersion: 1
answers: Record<slotId, "yes" | "maybe" | "no">
```

Missing answer means unanswered.

Do not treat missing as `no`.

Validate JSON structure in TypeScript before inserting or updating D1.

## Token and Security Rules

The app uses secret URLs, not user accounts.

Each poll has an admin token.

Participant responses are editable by response ID in the current prototype.

Never store raw tokens.

Never log raw tokens.

Store only:

```text
SHA-256(TOKEN_PEPPER + ":" + raw_token)
```

Use Web Crypto APIs.

Required environment variable:

```text
TOKEN_PEPPER
```

Never expose environment variables to frontend code.

Do not include admin token values in public poll responses.

Do not include token hashes in any API response.

## API Rules

All API responses must be JSON except `204 No Content`.

Error response shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Use stable error codes from `SPEC.md`.

Set API response headers:

```text
Content-Type: application/json; charset=utf-8
Cache-Control: no-store
```

Required API endpoints:

```text
POST   /api/polls
GET    /api/polls/:slug
POST   /api/polls/:slug/responses
PUT    /api/polls/:slug/responses/:responseId
DELETE /api/polls/:slug/responses/:responseId
POST   /api/polls/:slug/close
```

Use optimistic locking for response updates:

```text
version must match current stored version
successful update increments version
stale version returns 409
```

## Validation Rules

Enforce limits from `SPEC.md`.

Critical checks:

```text
- title required
- name required
- valid slot IDs only
- valid statuses only
- JSON object shape only
- max request body size
- max string lengths
- closed poll rejects response creation/update
```

Reject malformed input with `400`.

Reject invalid admin token with `403`.

Reject version conflict with `409`.

## Frontend Rules

Default UI language is Japanese.

Use simple, legible UI.

Required pages:

```text
/
  home

/new
  create poll

/p/:slug
  public poll page

/p/:slug/admin?token=...
  admin page

/p/:slug/edit/:responseId
  edit response page
```

The timetable grid should support the default 7 × 7 layout.

The grid may scroll horizontally on mobile.

Use one-click controls for availability: each slot should expose ○ / △ / × buttons directly rather than a dropdown.

Do not rely on color alone to represent status.

Use Japanese status labels:

```text
○ = yes
△ = maybe
× = no
未回答 = unanswered
```

## Summary Computation

Compute summary in TypeScript.

Do not use SQL JSON aggregation unless explicitly requested.

Summary output per slot:

```ts
type SummaryCell = {
  yes: number;
  maybe: number;
  no: number;
  unanswered: number;
};
```

Add or maintain tests for summary behavior.

## Testing Expectations

At minimum, add unit tests for:

```text
summary computation
answer validation
slot ID validation
status validation
version-independent pure helpers
```

Run:

```bash
npm run typecheck
npm run test
npm run build
```

If using Cloudflare-specific runtime APIs, isolate them so pure logic remains testable in Vitest.

## Cloudflare Runtime Constraints

Prefer Web Platform APIs.

Do not rely on Node-only APIs unless Cloudflare Workers compatibility is explicit.

Avoid filesystem access at runtime.

Use `context.env.DB` for D1 access inside Pages Functions.

Use `context.env.TOKEN_PEPPER` for token hashing.

## Coding Style

Use TypeScript strictly.

Prefer:

```text
- small pure functions
- explicit types
- discriminated error helpers
- prepared SQL helpers
- centralized validation
```

Avoid:

```text
- broad `any`
- duplicated JSON parsing
- hidden global state
- large untyped API handlers
- silent catch blocks
```

If `any` is unavoidable for JSON parsing, narrow immediately.

## Definition of Done

A task is complete only when:

```text
- SPEC.md remains accurate
- migrations are present for schema changes
- API handlers validate input
- tokens are hashed, not stored raw
- no user content is rendered with dangerouslySetInnerHTML
- typecheck passes
- tests pass
- production build passes
```

If a task changes architecture or persistence, update both `SPEC.md` and this file.

## Working Method for Codex

For multi-file or multi-step tasks:

```text
1. Inspect existing repository structure.
2. Compare it with SPEC.md.
3. Make a short implementation plan.
4. Implement the smallest coherent vertical slice.
5. Add or update tests.
6. Run typecheck, tests, and build.
7. Summarize changes and remaining gaps.
```

Do not rewrite unrelated code.

Do not introduce broad refactors unless necessary for the requested task.

Do not remove existing tests unless they are demonstrably obsolete and replaced with equivalent coverage.
