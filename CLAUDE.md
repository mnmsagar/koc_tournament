# CLAUDE.md — Kingdom of Chess Tournament Platform

> Project instructions for Claude Code. Treat the assignment PDF as the source of truth for product requirements. Database connection details, existing repository structure, and any additional preferences will be provided separately.
>
> **Primary objective:** deliver a working end-to-end flow: sign in → join tournament → get automatically matched → play a real-time chess match → save result → see updated leaderboard.

## 1. How to work on this repository

1. **Inspect before changing.** Start by checking the repository tree, package manifests, existing application structure, current Git status, environment files, and available scripts. Do not overwrite existing work or replace a working architecture without explaining why.
2. **Respect the required stack.** Use the technologies in Section 2. If the repository already contains a compatible setup, build on it rather than recreating it.
3. **Do not invent database details.** Database credentials, host, port, database name, SSL requirements, and any existing schema will be supplied later. Until then, use environment-variable placeholders and prepare migrations/schema without hardcoding credentials.
4. **Plan briefly, then implement in small vertical slices.** Keep changes focused and runnable. Prefer small, meaningful Git commits if asked to commit; never commit secrets.
5. **Keep the application type-safe.** TypeScript strict mode, DTO validation, explicit response types, and clear domain boundaries are expected.
6. **Do not claim work is complete without verification.** Run relevant lint, type-check, tests, migrations, and build scripts where available. Report anything that could not be run and why.
7. **Do not add unnecessary dependencies or stretch features before core requirements work.**
8. **Explain meaningful trade-offs.** Record important decisions and caveats in the README.

## 2. Required technology stack

### Backend
- NestJS 11
- TypeScript with strict mode
- Drizzle ORM
- PostgreSQL
- Socket.IO for real-time match play
- `class-validator` and `class-transformer` for REST DTO validation
- JWT authentication stored in an **httpOnly cookie**
- Database migrations checked into the repository

### Frontend
- Next.js using the App Router
- React 19, strict mode
- Tailwind CSS and shadcn/ui
- TanStack React Query for REST state, caching, and invalidation
- Socket.IO client for live match play
- `chess.js` for chess rules, move validation, and PGN
- A maintained chessboard UI library such as `react-chessboard`, compatible with the selected React version

### Local development
- Docker Compose configuration is desirable for a one-command local setup.
- PostgreSQL may run locally, in Docker, or on a managed service. Document the selected setup.
- Provide `.env.example` files with placeholders only. Never put real secrets in Git.

Do not substitute a different ORM, backend framework, frontend framework, or chess rules engine without first asking.

## 3. Product roles and permissions

### Coach
A coach can:
- Sign in and access coach-only pages and endpoints.
- Create, read, update, and delete tournaments, subject to tournament lifecycle rules.
- Configure tournament name, time control, start date/time, and status.
- View tournament participants, matches, results, statistics, leaderboard, rankings, and winner after completion.

A coach must not be treated as a student player unless the product requirements are explicitly changed.

### Student
A student can:
- Sign in and access student pages and endpoints.
- Browse open and ongoing tournaments.
- Join an open tournament.
- Request an opponent through automatic matchmaking.
- Play a live match, resign, and view the move list/PGN.
- Re-queue after a match finishes.
- View their ranking, leaderboard, schedule, and match history.

### Authorization rules
- Enforce authorization on **both the backend and frontend**. Hiding a button is not authorization.
- A student must never call coach-only endpoints successfully, and vice versa.
- `GET /api/v1/me` returns the authenticated user and role.
- Validate identity and match participation on every protected Socket.IO connection/event.
- Only the two actual participants of a match may join its private room or submit moves/resignation for it.
- Never trust a user ID, role, result, clock value, or board state supplied by the client when it can be derived or validated on the server.

## 4. Implementation priorities

Follow this order unless the repository already has a working portion that can be reused.

### P0 — Inspect and establish the project
- Inspect repository and identify frontend/backend entry points.
- Confirm Node/package-manager versions and existing scripts.
- Identify environment variable conventions and migration tooling.
- Summarize the existing architecture and propose the smallest implementation plan.
- Do not delete or regenerate existing files blindly.

### P1 — Data model and migrations
Design a relational model that supports at least:
- Users and roles
- Tournaments and their lifecycle
- Tournament participants
- Matches and participants/colours
- Match moves or persisted PGN
- Match result and termination reason
- Any queue/locking representation needed for reliable matchmaking

Use foreign keys, appropriate unique constraints, indexes, timestamps, and explicit status values. Use migrations for all schema changes. Avoid storing duplicated derived values unless there is a clear reason.

Potential domain statuses (adapt to the actual schema when database details are provided):
- Tournament: `draft`, `open`, `ongoing`, `completed`
- Match: `waiting`/`active`/`completed` as appropriate
- Result: white win, black win, draw
- End reason: checkmate, resignation, timeout, stalemate, draw, or another explicitly supported rule

These are domain suggestions, not permission to change an existing schema silently.

### P2 — Authentication and authorization
- Email/password login.
- Hash passwords with a suitable password-hashing library; never store plaintext passwords.
- Set JWT in an httpOnly cookie with appropriate `secure`, `sameSite`, path, and expiry settings for the deployment environment.
- Implement logout and `GET /api/v1/me`.
- Protect REST endpoints and Socket.IO handshakes.
- Configure CORS and credential handling deliberately.
- Consider CSRF protection or an appropriate same-site strategy for cookie-authenticated state-changing requests.
- Return safe errors without exposing secrets, hashes, tokens, or stack traces.
- Seed one coach and at least four students for local testing. Document development credentials in README only if they are intentionally seeded test accounts; do not use real credentials.

### P3 — Tournament management and joining
- Implement tournament CRUD for authorized coaches.
- Validate name, time control, start date/time, and allowed status transitions.
- Students can browse open/ongoing tournaments and join only when rules permit.
- Joining must be idempotent or return a clear conflict response if already joined.
- Prevent invalid participation, duplicate entries, and joining a closed/completed tournament.
- Expose tournament details and participant data through versioned REST endpoints.

### P4 — Reliable matchmaking
- Student clicks **Find opponent** to enter a tournament queue.
- Server matches two eligible waiting students in the same tournament and notifies both clients over Socket.IO.
- Never match a student with themselves.
- A player may be in **at most one active match at a time** across the application.
- Prevent duplicate queue entries and double-booking when concurrent requests arrive.
- Use a database transaction and appropriate locking/constraints so two concurrent requests cannot assign the same player to multiple matches.
- FIFO is an acceptable baseline. Standings-based pairing is optional.
- Provide queue cancellation/leave behavior if practical and define what happens on disconnect.
- After a match ends, allow players to queue again.
- Do not require manual refresh to receive a match.

### P5 — Live chess match (highest product priority)
Use `chess.js` for chess legality and PGN. Do not implement chess rules from scratch.

- Render a usable board and current turn.
- Synchronize moves in both directions through Socket.IO.
- Validate every submitted move against the latest authoritative position and whose turn it is.
- Reject malformed, illegal, out-of-turn, stale, or unauthorized moves without corrupting state.
- Persist moves and final PGN.
- Both players should see the same game state and remaining clock.
- Support resignation, timeout, checkmate, and stalemate/draw.
- Persist the result exactly once and make result handling idempotent.
- Notify both players when the game ends and update standings.
- Show connection status, errors, opponent details, turn, clocks, move list, and final result.
- If feasible after the core flow works, implement reconnection that restores the board, PGN, active player, and clock.

### P6 — Leaderboard, rankings, and history
- Standard scoring: win = 1 point, draw = 0.5 points, loss = 0 points.
- Sort by points.
- Choose and document a deterministic tiebreaker (for example, wins, then head-to-head if implemented, then stable user ID/name ordering).
- Do not silently imply that a tiebreaker is part of the assignment; document the selected rule.
- Show match results, student ranking, history, and winner once the tournament is completed.
- Ensure duplicate result events cannot award points twice.

### P7 — Frontend experience
Required screens/flows:
- Login
- Coach tournament list and create/edit/detail views
- Coach tournament stats, matches, and leaderboard
- Student tournament browse/detail/join
- Student schedule/history/ranking
- Matchmaking queue/waiting state
- Live match board with clocks and PGN/move panel
- Match result and re-queue flow
- Unauthorized/not-found states where appropriate

UX requirements:
- Provide loading, error, success, and empty states. No silent failures or indefinitely spinning screens.
- Use TanStack Query for REST requests.
- Invalidate/update the relevant queries after mutations and match results.
- Use Socket.IO for live events, not polling as the primary match synchronization mechanism.
- Keep the UI responsive, accessible, and straightforward; avoid spending time on decorative complexity before functionality.
- Do not expose secrets or authorization decisions in client-only code.

### P8 — Tests, documentation, and handoff
- Unit-test leaderboard scoring.
- Test tournament join rules.
- Test move legality/turn validation.
- Test matchmaking invariants and concurrency-sensitive logic where practical.
- Test that a match result is applied only once.
- Add integration tests where the existing setup makes them reasonable.
- Document environment variables, database setup, migrations, seed procedure, commands, credentials for seeded demo users, and how to run two students in separate browsers.
- Document all Socket.IO events with event name, direction, payload, authorization, and expected behavior.
- Document architecture, assumptions, decisions, trade-offs, and known limitations.
- Verify a clean-machine setup as far as the environment permits.

## 5. Suggested architecture

Adapt to the existing repository rather than forcing this exact layout.

```text
/
  apps/
    api/                    # NestJS 11
      src/
        auth/
        users/
        tournaments/
        matchmaking/
        matches/
        leaderboard/
        common/
      drizzle/              # migrations/schema, depending on chosen setup
    web/                    # Next.js App Router
      app/
      components/
      features/
      lib/
  docker-compose.yml
  .env.example
  README.md
  CLAUDE.md
```

Backend modules should separate responsibilities:
- **Controller:** HTTP routing and DTO-bound inputs.
- **Service:** business rules and orchestration.
- **Repository/database layer:** Drizzle queries and transactions.
- **Gateway:** Socket.IO connection, room membership, event validation, and dispatch.
- **Domain helpers:** scoring, move validation, tournament rules, and result transitions.

Keep business logic out of React components and avoid putting all backend logic in a single service.

## 6. REST API conventions

- Prefix endpoints with `/api/v1`.
- Use consistent JSON response and error formats throughout the API. Choose a format and document it.
- Use correct HTTP status codes (`200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422` where appropriate, and `500` only for unexpected server failures).
- Use `class-validator` DTOs for every REST request body, query, and route input where applicable.
- Reject invalid input; do not silently coerce arbitrary strings into trusted values.
- Add pagination for lists if needed.
- Keep response DTOs separate from raw database rows so password hashes and internal fields cannot leak.
- Ensure errors are predictable and useful to the frontend without revealing sensitive implementation details.

Possible endpoint groups (confirm against the existing codebase before implementing):
- `/api/v1/auth/*`
- `/api/v1/me`
- `/api/v1/tournaments/*`
- `/api/v1/tournaments/:id/join`
- `/api/v1/tournaments/:id/queue`
- `/api/v1/tournaments/:id/leaderboard`
- `/api/v1/matches/:id`
- `/api/v1/matches/:id/history` or an equivalent PGN/move endpoint
- `/api/v1/matches/:id/resign`

Avoid implementing duplicate REST and socket pathways for the same action unless there is a clear reason.

## 7. Socket.IO conventions

Use a documented, consistent event naming scheme. The following is a suggested contract; adapt names to the existing project if necessary and keep client/server definitions synchronized.

| Event | Direction | Purpose |
|---|---|---|
| `matchmaking:join` | Client → Server | Request to queue for a tournament |
| `matchmaking:queued` | Server → Client | Confirm queue status |
| `matchmaking:matched` | Server → Client | Deliver newly assigned match ID and initial match state |
| `matchmaking:cancel` | Client → Server | Leave queue, if supported |
| `match:join` | Client → Server | Join a match room after server-side participant verification |
| `match:state` | Server → Client | Send authoritative board, turn, clocks, PGN/moves, and status |
| `match:move` | Client → Server | Submit a move with match ID and move representation |
| `match:move-accepted` | Server → Client | Acknowledge an accepted move and provide canonical state |
| `match:move-rejected` | Server → Client | Reject an invalid/stale/out-of-turn move with a safe reason |
| `match:clock` | Server → Client | Publish clock state/synchronization information |
| `match:resign` | Client → Server | Resign from the current match |
| `match:ended` | Server → Client | Final result, termination reason, and final PGN/state |
| `match:error` | Server → Client | Structured, non-sensitive event error |
| `match:reconnect` | Client → Server | Request restoration of an authorized active match, if supported |

Rules:
- Authenticate the Socket.IO handshake.
- Never trust a client-provided user ID or role.
- Verify match membership before joining a room or handling match actions.
- Validate payloads and reject malformed events.
- Use acknowledgements or explicit rejection events for actions that can fail.
- Avoid broadcasting private data to a tournament-wide room.
- The server is authoritative for moves, turns, results, and ideally clocks.
- Document payload TypeScript types and event direction in the README.

## 8. Clock and match consistency

- Store a canonical time control (initial time and increment, even if the first version supports increment `0` only).
- Do not trust the client to report its own remaining time.
- Prefer persisting the active side, turn-start timestamp, remaining time snapshots, and match status so the server can calculate elapsed time.
- A client display may tick locally between authoritative updates, but the server decides whether a timeout occurred.
- Handle race conditions between a final legal move, resignation, and timeout. A match can have only one terminal result.
- Keep result finalization transactional: transition match status, persist PGN/result, and make standings reflect the result exactly once.
- Clearly document any simplified clock behavior if a fully authoritative clock is not implemented.

## 9. Database and transaction guidelines

Database connection details and existing schema are **pending user input**. Until provided:
- Read connection settings only from environment variables.
- Use obvious placeholders in `.env.example`.
- Do not run destructive commands against any database.
- Do not drop, truncate, or reset data unless the user explicitly authorizes it.
- Do not assume a database is empty or create a competing schema without inspecting the supplied schema/details.
- Create migrations for schema changes; do not rely on undocumented manual SQL.
- Use transactions for matchmaking, move persistence, and final result handling when multiple records must change together.
- Add constraints/indexes to enforce invariants at the database layer where practical.
- Be explicit about migration ordering and rollback limitations.

Before connecting to a supplied database, confirm whether it is a development database and whether schema-changing migrations are permitted.

## 10. Security and reliability checklist

- [ ] Passwords are securely hashed.
- [ ] JWT is not stored in localStorage.
- [ ] Cookies are configured for the deployment environment.
- [ ] REST routes enforce roles and ownership/participation.
- [ ] Socket handshake is authenticated.
- [ ] Match rooms/actions verify participants.
- [ ] DTOs validate untrusted inputs.
- [ ] CORS allows only intended origins and credential use is configured.
- [ ] No secrets in source, logs, screenshots, or Git.
- [ ] No client-trusted score, result, clock, role, or board state.
- [ ] Duplicate queue/move/result requests are handled safely.
- [ ] Concurrent matchmaking cannot double-book a player.
- [ ] Disconnects and reconnection behavior are defined.
- [ ] Logs do not leak cookies, JWTs, passwords, or sensitive data.

## 11. Definition of done

The core submission is not done until this end-to-end scenario works:

1. Start the project from documented instructions.
2. Sign in as a seeded student in browser A and another seeded student in browser B.
3. Both students join the same open tournament.
4. Both request an opponent; the server creates exactly one match and notifies both clients without refresh.
5. Both boards show the same initial position and appropriate sides/clocks.
6. A legal move from one browser is reflected in the other browser.
7. Illegal and out-of-turn moves are rejected.
8. The game can end by checkmate, resignation, timeout, or stalemate/draw as supported.
9. The final result and PGN are persisted.
10. The leaderboard awards the correct points exactly once and displays updated rankings.
11. A player can queue for another match after the previous one is complete.
12. Tests and README explain how the core behavior is verified.

## 12. Stretch goals — only after the core works

Do not prioritize these over the core match loop:
- Fully server-authoritative game state and clock
- Reconnection with board and clock restoration
- Coach spectator mode
- Draw offers, threefold repetition, 50-move rule, increment controls
- Standings-based matchmaking
- Full round-robin tournament completion
- Clickable move-list position review
- Consistent `DD/MM/YYYY` display and correct timezone handling

## 13. Communication expectations

At the start of a new task:
1. Briefly state what you found in the repository.
2. Identify missing information that blocks implementation (especially database connection/schema details).
3. Give a short, ordered plan.
4. Implement the smallest useful slice.
5. Report files changed, commands run, test/build results, and known issues.

Ask before making major architecture changes, deleting existing data/files, introducing a new paid service, or performing destructive database operations.

**Remember:** prioritize a reliable live match and result-to-leaderboard flow over broad but unfinished features.
