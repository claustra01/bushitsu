# Schedule Poll App Specification

## 1. Overview

This project is a small schedule coordination web application similar in purpose to Chouseisan.

The application lets a user create a schedule poll, share a public URL, and let participants submit availability for a timetable-style grid such as:

- a date range selected when creating the poll
- a period range selected from 0th through 9th period when creating the poll
- yes / maybe / no availability per slot

The application is intended for personal or small-group use. It should be simple, low-cost, and deployable on Cloudflare Pages free-tier-compatible infrastructure.

## 2. Core Architecture

Use the following architecture:

```text
Cloudflare Pages
  ├─ Frontend: Vite + React + TypeScript
  ├─ Backend: Cloudflare Pages Functions
  └─ Database: Cloudflare D1
```

D1 is used in a JSON-record style:

```text
polls
  One row per schedule poll.

responses
  One row per participant response.
  Each response row stores the participant's whole availability map as JSON.
```

Do not model each timetable cell as a separate database row for the initial implementation.

## 3. Design Principle

The main persistence model is:

```text
1 poll = 1 schedule page
1 response = 1 participant's full answer JSON
summary = computed by the API at read time
```

This is intentionally not fully normalized.

Rationale:

- A timetable grid of up to 14 days × 10 periods has at most 140 cells.
- A participant usually submits or edits all answers as a unit.
- Reading one row per participant is cheaper and simpler than reading one row per participant-slot pair.
- Slot-level analytics are not a primary requirement.
- Future normalization remains possible by adding an index table later.

## 4. Non-Goals for Initial Version

Do not implement the following unless explicitly requested later:

- User accounts
- Password login
- OAuth
- Email notifications
- Google Calendar integration
- Real-time collaboration
- WebSocket updates
- Recurring event series
- Payment or billing
- Multi-tenant admin dashboard
- Full audit log
- Slot-level normalized `availability` table
- Workers KV as primary storage
- Durable Objects as primary storage

## 5. Technology Stack

Use:

```text
Runtime:
  Cloudflare Pages + Pages Functions

Frontend:
  Vite
  React
  TypeScript

Backend:
  Cloudflare Pages Functions
  TypeScript
  D1 binding named DB

Database:
  Cloudflare D1

Testing:
  Vitest for pure TypeScript logic
  Optional lightweight API tests if practical

Styling:
  Plain CSS modules or simple global CSS
  No heavy UI framework unless already present
```

Avoid unnecessary dependencies.

Acceptable dependencies:

- `@vitejs/plugin-react`
- `vite`
- `typescript`
- `vitest`
- `wrangler`
- React packages

Do not add a large framework, ORM, authentication library, or component library unless the task explicitly requires it.

## 6. Repository Structure

Use this structure unless the repository already has a conflicting structure:

```text
.
├─ AGENTS.md
├─ SPEC.md
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ wrangler.toml
├─ migrations/
│  └─ 0001_initial.sql
├─ functions/
│  └─ api/
│     └─ polls/
│        ├─ index.ts
│        ├─ [slug].ts
│        ├─ [slug]/
│        │  ├─ close.ts
│        │  └─ responses/
│        │     ├─ index.ts
│        │     └─ [responseId].ts
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ routes/
│  │  ├─ HomePage.tsx
│  │  ├─ NewPollPage.tsx
│  │  ├─ PollPage.tsx
│  │  ├─ AdminPage.tsx
│  │  └─ EditResponsePage.tsx
│  ├─ components/
│  │  ├─ ScheduleGrid.tsx
│  │  ├─ SummaryGrid.tsx
│  │  └─ ResponseList.tsx
│  ├─ lib/
│  │  ├─ api.ts
│  │  ├─ ids.ts
│  │  ├─ schema.ts
│  │  ├─ summary.ts
│  │  └─ validation.ts
│  └─ styles.css
└─ test/
   ├─ summary.test.ts
   └─ validation.test.ts
```

If using React Router is not already configured, keep routing simple and implement route detection from `window.location.pathname`.

## 7. Database Schema

Create `migrations/0001_initial.sql`.

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE polls (
  slug TEXT PRIMARY KEY,

  title TEXT NOT NULL,
  description TEXT,

  config_json TEXT NOT NULL CHECK (json_valid(config_json)),

  admin_token_hash TEXT NOT NULL,

  is_closed INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE responses (
  id TEXT PRIMARY KEY,

  poll_slug TEXT NOT NULL,

  name TEXT NOT NULL,
  comment TEXT,

  answers_json TEXT NOT NULL CHECK (json_valid(answers_json)),

  edit_token_hash TEXT NOT NULL,

  version INTEGER NOT NULL DEFAULT 1,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (poll_slug) REFERENCES polls(slug) ON DELETE CASCADE
);

CREATE INDEX idx_responses_poll_slug
ON responses(poll_slug);

CREATE INDEX idx_responses_poll_updated
ON responses(poll_slug, updated_at);

CREATE UNIQUE INDEX idx_responses_edit_token_hash
ON responses(edit_token_hash);
```

`responses.edit_token_hash` is retained as an internal opaque random hash in this prototype schema, but client-side response editing does not require or receive an edit token.

Do not create a `slots` table in the initial implementation. Slot definitions belong in `polls.config_json`.

## 8. D1 Binding

Use D1 binding name:

```text
DB
```

`wrangler.toml` should contain a D1 binding placeholder:

```toml
name = "akikoma"
compatibility_date = "2026-05-01"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "akikoma"
database_id = "REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID"
```

Do not hard-code production database IDs in source if this repository is intended to be public.

## 9. Environment Variables

Required:

```text
TOKEN_PEPPER
```

Optional:

```text
APP_ORIGIN
```

`TOKEN_PEPPER` is used to hash admin tokens and any internal token-like random values.

Do not store raw admin tokens in D1.

## 10. Token Model

Each poll has an admin token.

Participant responses are editable by response ID in this prototype. This is acceptable for the intended small, trusted group use case.

Public URL:

```text
/p/:slug
```

Admin URL:

```text
/p/:slug/admin?token=<raw_admin_token>
```

Edit URL:

```text
/p/:slug/edit/:responseId
```

Database stores only token hashes or internal opaque hashes.

Hashing rule:

```text
token_hash = SHA-256(TOKEN_PEPPER + ":" + raw_token)
```

Prefer Web Crypto APIs in the Cloudflare runtime.

Never log raw tokens.

Never return token hashes to clients.

## 11. ID Generation

Generate IDs with cryptographically secure randomness.

Required IDs:

```text
poll slug:
  short, URL-safe, unguessable enough for personal use

response id:
  URL-safe random id

admin token:
  high-entropy URL-safe token
```

Suggested format:

```text
slug:      10 to 14 URL-safe characters
response: 16 to 24 URL-safe characters
token:    32+ URL-safe characters
```

Do not use auto-increment IDs in public URLs.

## 12. JSON Shapes

### 12.1 Poll Config JSON

`polls.config_json` must use this shape:

```json
{
  "schemaVersion": 1,
  "timezone": "Asia/Tokyo",
  "grid": {
    "days": [
      { "id": "d0", "label": "5/7(木)", "date": "2026-05-07" },
      { "id": "d1", "label": "5/8(金)", "date": "2026-05-08" }
    ],
    "periods": [
      { "id": "p0", "label": "0限" },
      { "id": "p1", "label": "1限" },
      { "id": "p2", "label": "2限" },
      { "id": "p3", "label": "3限" }
    ],
    "slots": [
      { "id": "d0p0", "dayId": "d0", "periodId": "p0", "enabled": true },
      { "id": "d0p1", "dayId": "d0", "periodId": "p1", "enabled": true }
    ]
  },
  "statusLabels": {
    "yes": "○",
    "maybe": "△",
    "no": "×"
  }
}
```

For poll creation, generate every slot for the selected date range and selected period range:

```text
d0p0 ... dNp9
```

### 12.2 Response Answers JSON

`responses.answers_json` must use this shape:

```json
{
  "schemaVersion": 1,
  "answers": {
    "d0p0": "yes",
    "d0p1": "maybe",
    "d0p2": "no"
  }
}
```

Allowed statuses:

```text
yes
maybe
no
```

Missing slot key means unanswered.

Do not treat missing as `no`.

## 13. Validation Rules

### 13.1 Poll Creation

Validate:

```text
title:
  required
  max 100 characters

description:
  optional
  max 1000 characters

timezone:
  optional
  default "Asia/Tokyo"

startDate:
  optional in API
  required in UI
  YYYY-MM-DD

endDate:
  optional in API
  required in UI
  YYYY-MM-DD
  must be on or after startDate

startPeriod:
  optional in API
  required in UI
  integer 0 through 9
  default 1

endPeriod:
  optional in API
  required in UI
  integer 0 through 9
  default 7
  must be on or after startPeriod

days:
  derived from startDate through endDate inclusive
  max 14

periods:
  derived from startPeriod through endPeriod inclusive
  labels 0限 through 9限
  default 1限 through 7限
  max 10

enabled slots:
  max 140

config_json:
  must match schemaVersion 1
  all slot IDs must be unique
  each slot must reference existing dayId and periodId
```

The initial UI exposes date-range selection and period-range selection. It does not yet expose custom period labels or disabled slots.

### 13.2 Response Creation / Update

Validate:

```text
name:
  required
  max 50 characters

comment:
  optional
  max 500 characters

answers:
  object
  keys must be valid enabled slot IDs
  values must be "yes", "maybe", or "no"

answers_json:
  serialized length max 16 KB
```

Reject:

```text
unknown slot IDs
invalid statuses
invalid schemaVersion
non-object answers
arrays where objects are expected
overlong strings
closed poll updates
```

## 14. API Endpoints

All API responses must be JSON.

All API error responses must use this shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Use stable error codes.

### 14.1 Create Poll

```text
POST /api/polls
```

Request:

```json
{
  "title": "来週の予定調整",
  "description": "都合のよいコマを選択してください"
}
```

Response `201`:

```json
{
  "poll": {
    "slug": "abc123xyz0",
    "title": "来週の予定調整",
    "description": "都合のよいコマを選択してください",
    "isClosed": false
  },
  "publicPath": "/p/abc123xyz0",
  "adminPath": "/p/abc123xyz0/admin?token=RAW_ADMIN_TOKEN"
}
```

### 14.2 Read Poll

```text
GET /api/polls/:slug
```

Response `200`:

```json
{
  "poll": {
    "slug": "abc123xyz0",
    "title": "来週の予定調整",
    "description": "都合のよいコマを選択してください",
    "isClosed": false,
    "updatedAt": "2026-05-07 12:00:00"
  },
  "config": {
    "schemaVersion": 1
  },
  "responses": [
    {
      "id": "resp_abc",
      "name": "山田",
      "comment": "水曜は遅れる可能性あり",
      "answers": {
        "d0p0": "yes",
        "d0p1": "maybe"
      },
      "version": 1,
      "updatedAt": "2026-05-07 12:05:00"
    }
  ],
  "summary": {
    "d0p0": {
      "yes": 1,
      "maybe": 0,
      "no": 0,
      "unanswered": 0
    }
  }
}
```

Do not include admin token or token hashes in this response.

### 14.3 Create Response

```text
POST /api/polls/:slug/responses
```

Request:

```json
{
  "name": "山田",
  "comment": "水曜は遅れる可能性あり",
  "answers": {
    "d0p0": "yes",
    "d0p1": "maybe",
    "d0p2": "no"
  }
}
```

Response `201`:

```json
{
  "response": {
    "id": "resp_abc",
    "name": "山田",
    "comment": "水曜は遅れる可能性あり",
    "answers": {
      "d0p0": "yes",
      "d0p1": "maybe",
      "d0p2": "no"
    },
    "version": 1
  }
}
```

### 14.4 Update Response

```text
PUT /api/polls/:slug/responses/:responseId
```

Request:

```json
{
  "name": "山田",
  "comment": "更新後コメント",
  "answers": {
    "d0p0": "yes",
    "d0p1": "no"
  },
  "version": 1
}
```

Use optimistic locking:

```sql
WHERE id = ?
  AND poll_slug = ?
  AND version = ?
```

Response `200`:

```json
{
  "response": {
    "id": "resp_abc",
    "name": "山田",
    "comment": "更新後コメント",
    "answers": {
      "d0p0": "yes",
      "d0p1": "no"
    },
    "version": 2
  }
}
```

After a successful update in the frontend, redirect the user back to the public poll page summary view, `/p/:slug?tab=summary`.

Return `409` for version conflict.

### 14.5 Delete Response

```text
DELETE /api/polls/:slug/responses/:responseId
```

Response `204`.

### 14.6 Delete Poll

```text
DELETE /api/polls/:slug?token=RAW_ADMIN_TOKEN
```

Deletes the poll and all responses.

Response `204`.

Return `403` for an invalid admin token.

### 14.7 Close Poll

```text
POST /api/polls/:slug/close?token=RAW_ADMIN_TOKEN
```

Request:

```json
{
  "isClosed": true
}
```

Response `200`:

```json
{
  "poll": {
    "slug": "abc123xyz0",
    "isClosed": true
  }
}
```

Closed polls must reject response creation, response update, and response deletion with `403`.

## 15. HTTP Status Codes

Use:

```text
200 OK:
  successful read or update

201 Created:
  successful creation

204 No Content:
  successful deletion

400 Bad Request:
  malformed JSON or invalid input

403 Forbidden:
  invalid token or closed poll mutation

404 Not Found:
  poll or response not found

409 Conflict:
  optimistic locking conflict

413 Payload Too Large:
  request body too large

500 Internal Server Error:
  unexpected server error
```

## 16. API Implementation Rules

Use prepared statements for every SQL query.

Do not concatenate untrusted input into SQL.

For JSON storage:

```sql
INSERT INTO responses (..., answers_json, ...)
VALUES (..., json(?), ...)
```

Before saving, validate JSON in TypeScript.

Also keep SQL-level `CHECK (json_valid(...))`.

Set response headers:

```text
Content-Type: application/json; charset=utf-8
Cache-Control: no-store
```

For static frontend assets, normal Cloudflare caching is acceptable.

## 17. Summary Computation

Summary is computed in TypeScript at read time.

Input:

```text
slot IDs from config_json
response rows from D1
```

Output per slot:

```ts
type SummaryCell = {
  yes: number;
  maybe: number;
  no: number;
  unanswered: number;
};
```

Algorithm:

```text
For each enabled slot:
  initialize yes/maybe/no/unanswered to 0

For each response:
  parse answers_json
  for each enabled slot:
    if status is yes/maybe/no:
      increment that status
    else:
      increment unanswered
```

Do not use SQL `json_each` for the initial implementation unless necessary.

Summary UI should lightly highlight strong candidate slots:

```text
all participants can attend:
  yes count equals total participant count

all but one participant can attend:
  yes count equals total participant count minus one
  only applies when there are at least 2 participants
```

Do not rely on color alone; include a short text label such as `全員OK` or `あと1人`.

## 18. Frontend Requirements

### 18.1 Pages

Implement these UI pages:

```text
/
  Home page with link to create a poll and up to 10 recently accessed poll pages from localStorage.

/new
  Create poll page.

/p/:slug
  Public poll page.
  Shows schedule grid, summary, existing responses, and response form.

/p/:slug/admin?token=...
  Admin page.
  Shows admin controls such as close/reopen and poll deletion.

/p/:slug/edit/:responseId
  Edit response page.
```

### 18.2 UI Behavior

The home page should store and display recently accessed poll pages:

```text
storage:
  localStorage

max items:
  10

stored URL:
  public poll path only, `/p/:slug`
```

Do not store admin URLs, response edit URLs, raw tokens, or token hashes in localStorage.

The public poll page should show:

```text
- Poll title
- Description
- selected-date-range × selected-period-range timetable grid
- Summary counts per slot
- Existing participant responses
- Form for new response
```

The response form should allow:

```text
- participant name
- optional comment
- yes / maybe / no / unanswered for each slot
```

Use one-click controls for status selection. Each cell shows ○ / △ / × buttons; clicking the selected value again clears the cell back to unanswered.

Use Japanese UI labels by default:

```text
yes    => ○
maybe  => △
no     => ×
empty  => 未回答
```

### 18.3 Accessibility

Implement:

```text
- semantic buttons and form controls
- visible focus styles
- labels for inputs
- table headers for grid rows and columns
- no color-only status indication
```

### 18.4 Mobile Support

The desktop timetable grid may be horizontally scrollable on narrow intermediate viewports.

On mobile, keep the grid readable with stable cell sizes, touch-friendly controls, and a sticky row-header column where practical.

For availability input on mobile, do not require horizontal scrolling. Use a vertical layout grouped by date so a participant can complete the form with vertical scrolling only.

For the summary on mobile, preserve a compact table-like view similar to desktop and fit it within the viewport width where possible. Participant response status may use compact cards.

Do not sacrifice data clarity for layout compactness.

## 19. Security Requirements

Implement the following:

```text
- Never store raw tokens.
- Never log raw tokens.
- Validate all request bodies.
- Escape all user-generated content by relying on React rendering, not dangerouslySetInnerHTML.
- Do not use dangerouslySetInnerHTML.
- Do not expose token hashes.
- Do not expose environment variables to the frontend.
- Use prepared SQL statements.
- Enforce request body size limits.
- Reject closed poll mutations.
```

Optional later:

```text
- Cloudflare Turnstile for spam prevention
- IP-based rate limiting
```

## 20. Request Body Limits

Implement a helper that rejects large request bodies before parsing JSON.

Recommended limits:

```text
POST /api/polls:
  32 KB

POST /api/polls/:slug/responses:
  32 KB

PUT /api/polls/:slug/responses/:responseId:
  32 KB
```

## 21. Error Codes

Use these stable codes:

```text
INVALID_JSON
INVALID_INPUT
POLL_NOT_FOUND
RESPONSE_NOT_FOUND
INVALID_TOKEN
POLL_CLOSED
VERSION_CONFLICT
PAYLOAD_TOO_LARGE
INTERNAL_ERROR
```

## 22. Testing Requirements

Add tests for pure logic:

```text
summary.test.ts:
  - counts yes/maybe/no correctly
  - counts unanswered correctly
  - ignores unknown statuses
  - handles zero responses
  - handles missing answers

validation.test.ts:
  - rejects unknown slot IDs
  - rejects invalid statuses
  - rejects overlong name
  - rejects malformed answer object
  - accepts partial answers
```

If practical, add API tests later. Initial implementation may focus on build, typecheck, and pure logic tests.

## 23. Package Scripts

`package.json` should provide:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "cf:dev": "wrangler pages dev dist --persist-to .wrangler/state",
    "db:migrate:local": "wrangler d1 migrations apply akikoma --local",
    "db:migrate:remote": "wrangler d1 migrations apply akikoma --remote"
  }
}
```

If the exact local Pages Functions command requires adjustment, update scripts accordingly and document the final working command.

## 24. CI/CD

GitHub Actions should provide:

```text
CI:
  run on pull_request and push
  install with pnpm
  run pnpm run typecheck as its own job
  run pnpm run test as its own job
  run pnpm run build as its own job

Cloudflare Pages deploy:
  run on pushes to main and manual dispatch
  run typecheck, test, and build before deploy
  create the Cloudflare Pages project through the Cloudflare API if it does not already exist
  deploy dist with wrangler pages deploy
  read CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN from GitHub Secrets
  read CLOUDFLARE_D1_DATABASE_ID from GitHub Secrets
  keep wrangler.toml database_id as a placeholder in source

D1 migrations:
  run manually from GitHub Actions
  apply remote migrations with wrangler d1 migrations apply akikoma --remote
```

Cloudflare Pages project setup should include:

```text
Pages project:
  akikoma

D1 database:
  akikoma

Pages Function bindings:
  DB -> akikoma

Pages secrets:
  TOKEN_PEPPER
```

Keep deployment setup notes in `docs/deployment.md`.

## 25. Data Retention

Old poll records should be cleaned up opportunistically when creating a new poll.

```text
retention window:
  14 days since the last calendar date in polls.config_json grid.days

cleanup timing:
  poll creation

cleanup behavior:
  parse polls.config_json
  use the latest valid grid.days[].date as the poll calendar end date
  delete responses for expired polls first
  delete expired polls
```

A poll expires when its calendar end date is at least 14 days before the current date in the poll timezone.
Read-only access and response edits do not extend this calendar-based retention window.

## 26. Migration Policy

All database schema changes must be represented as SQL files under `migrations/`.

Do not modify an already-applied migration in a way that would break existing deployments.

Use incremental migration filenames:

```text
0001_initial.sql
0002_add_example.sql
```

## 27. Future Extension Path

If slot-level query requirements emerge, add a derived index table:

```sql
CREATE TABLE availability_index (
  poll_slug TEXT NOT NULL,
  response_id TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('yes', 'maybe', 'no')),

  PRIMARY KEY (poll_slug, response_id, slot_id),
  FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE
);

CREATE INDEX idx_availability_index_slot
ON availability_index(poll_slug, slot_id, status);
```

Do not add this table in the initial version.

The canonical source remains `responses.answers_json` unless a later migration explicitly changes that.
