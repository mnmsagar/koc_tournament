# Kingdom of Chess — Real-time Scholastic Tournament Platform

A real-time chess tournament and automated matchmaking web platform built with **NestJS 11**, **Drizzle ORM**, **PostgreSQL**, **Socket.IO**, **Next.js (App Router)**, **React 19**, and **chess.js**.

---

## 1. Quick Start & Prerequisites

- **Node.js**: `v20.x` or higher
- **PostgreSQL**: Local, Docker, or hosted instance

### A. Environment Configuration

1. Configure your PostgreSQL database credentials in `backend/.env`:
   ```env
   PORT=3001
   NODE_ENV=development
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/koc
   JWT_SECRET=koc_tournament_jwt_super_secret_key_2026_kingdom_of_chess
   JWT_EXPIRES_IN=1d
   FRONTEND_URL=http://localhost:3000
   COOKIE_DOMAIN=localhost
   COOKIE_SECURE=false
   ```
2. Frontend configuration in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_WS_URL=http://localhost:3001
   ```

### B. Database Migration & Seed

Once your PostgreSQL database password is set in `backend/.env`:
```bash
# Apply Drizzle database migrations
npm run db:migrate

# Seed default coach, 4 students, and initial open tournament
npm run db:seed
```

### C. Running the Platform Locally

From the root folder (or inside `backend` and `frontend` folders directly):
```bash
# Start backend API (NestJS 11 on port 3001)
npm run dev:backend

# Start frontend Web App (Next.js App Router on port 3000)
npm run dev:frontend
```

### D. One-Command Docker Compose Setup (Recommended)

Run the entire platform (PostgreSQL, NestJS API, and Next.js Web App with automatic migrations and seed data applied on startup) in a single command:
```bash
# Build and launch all 3 containers
docker compose up --build -d

# View real-time logs across all services
docker compose logs -f

# Stop all services
docker compose down
```
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API Endpoint**: [http://localhost:3001/api/v1](http://localhost:3001/api/v1)
- **PostgreSQL**: `localhost:5432`

---

## 2. Seeded Test Accounts

The seed script creates the following pre-configured test users for local evaluation (each with 1-click login buttons on `/login`):

| Role | Name | Email | Password |
|---|---|---|---|
| **Coach** (Organizer) | Coach Fischer | `coach@koc.com` | `CoachPassword123!` |
| **Student** | Alice Chen | `alice@koc.com` | `StudentPassword123!` |
| **Student** | Bob Smith | `bob@koc.com` | `StudentPassword123!` |
| **Student** | Charlie Brown | `charlie@koc.com` | `StudentPassword123!` |
| **Student** | Diana Prince | `diana@koc.com` | `StudentPassword123!` |

### User Registration (Sign Up Feature)
In addition to the pre-seeded evaluation accounts, any user can create a brand-new account directly via the web interface:
- **Web Route:** Navigate to [`/signup`](http://localhost:3000/signup) or click the **Sign Up** button in the header.
- **Form Details:** Full Name, Email, Password (min. 6 characters), Confirm Password, and Role selection (**Student Competitor** or **Coach / Organizer**).
- **Auto-Login:** Upon successful registration, an authenticated JWT session is issued immediately via secure httpOnly cookies and the user is redirected to the tournament arena.
- **REST API Endpoint:** `POST /api/v1/auth/register` (payload: `{ name, email, password, role }`). Email uniqueness is strictly enforced with `409 Conflict` feedback.
- **Authenticated Route Protection:** If an authenticated user attempts to visit [`/login`](http://localhost:3000/login) or [`/signup`](http://localhost:3000/signup), the client-side router immediately intercepts the request and redirects them to the active tournament dashboard (`/tournaments`), preventing redundant sessions or form flashing.

### Account & Player Hub ([`/account`](http://localhost:3000/account))
Logged-in users can view their comprehensive profile by clicking their avatar in the header or selecting the **Account** tab:
- **Player License & Badges:** Official Student ID (`#KC-XXXXXX`), Role title (`Gold Candidate / Coach`), and Royal Academy certification.
- **Career Telemetry:** Current Blitz rating with daily delta (`1640 +18 today`), active streak (`🔥 3 Wins`), tournaments joined, win/draw/loss counts, and win rate.
- **Security & Session Details:** Password encryption status (Bcrypt), HttpOnly cookie session status, and real-time Socket.IO WebSocket sync.
- **Direct Actions:** Fast access to enter active tournament rounds and a 1-click Sign Out button.

### Coach Tournament Director & Arbiter Console
The platform delivers a role-specific experience tailored for Academy Coaches (`role: 'coach'`):
- **Coach Operations & Tournament Hub:** In the tournament directory, coaches view their dedicated Arbiter Command Center with live statistics (Total Arenas, Active Rounds, Total Competitors, and Chief Director credentials).
- **Creator Event Isolation:** Coaches only manage tournaments they personally hosted, keeping their dashboard focused and secure.
- **Director Console (`/tournaments/:id`):** An arbiter command deck featuring:
  - **Competitors Roster:** Real-time student roster with search filter and student invite link generator.
  - **Live Arbiter Deck:** Real-time board monitoring with filters for active live matches and completed pairings.
  - **Live Standings:** Instant ranking table reflecting FIDE Buchholz and Sonneborn-Berger tiebreaks.
  - **Rules & Config:** Authoritative time controls, move legality verification, and FIDE strict rules.
  - **Lifecycle Actions:** 1-click buttons to Launch Tournament Round, Conclude Tournament, or Delete draft events.

### Tournament Scheduling: Start Date & Optional End Date
Tournaments support versatile scheduling for both single-session arenas and multi-day scholastic championships:
- **PostgreSQL Database Support:** Built-in `start_date` and `end_date` timestamp columns on the `tournaments` table.
- **Host Tournament Dialog:**
  - **Start Date & Time:** Required start date with one-tap quick presets: `⚡ Today`, `🌅 Tomorrow 6 PM`, `🏆 Saturday 11 AM`, `👑 Sunday 4 PM`.
  - **End Date & Time (Optional):** Optional end date for multi-day championships with automatic duration offset chips: `+2 Hours` (Same-day arena), `+1 Day` (Next day finale), `+2 Days` (Weekend championship), and `✕ Clear`.
- **Intelligent Schedule Formatting:**
  - **Single-Day Arena:** `12 Oct 2026 • 06:00 PM`
  - **Same-Day Duration:** `12 Oct 2026 • 06:00 PM – 09:00 PM`
  - **Multi-Day Championship:** `12 Oct – 14 Oct 2026`
- **Schedule Visibility:** Displayed on tournament cards, Director Console hero, and student tournament matchmaking radar.

### Tournament Enrollment & Isolated Card State
The tournament directory features isolated per-card mutation tracking and authoritative student enrollment verification:
- **Authoritative `isJoined` Verification:** The backend (`GET /api/v1/tournaments`) verifies the authenticated student's session and returns an `isJoined: boolean` flag for each tournament.
- **Isolated Mutation State:** Clicking "Join" on any tournament card targets only that specific card ID (`joiningTournamentId === t.id`), showing an isolated loading spinner without disabling or dimming other tournament cards on the screen.
- **Enrolled vs. Unenrolled Card Distinction:**
  - **Enrolled Tournaments:** Display a distinct `✓ Enrolled` green badge and an orange `Enter Arena & Radar` CTA.
  - **Unenrolled Tournaments:** Display `View Details` and an active `Join` CTA.
- **Unauthenticated Handling:** Guests clicking "Join" are automatically redirected to `/login?redirect=/tournaments`.

---

## 3. How to Test the End-to-End Match Flow (2 Browsers)

1. Open **Browser A** (e.g. Chrome) to `http://localhost:3000/login`.
   - Click the quick test button **Alice (Student)** and sign in.
   - Go to **Tournaments** and open **"Kingdom Championship 2026"**.
   - Click **Find Opponent** to enter the matchmaking queue.
2. Open **Browser B** (e.g. Incognito or Firefox) to `http://localhost:3000/login`.
   - Click the quick test button **Bob (Student)** and sign in.
   - Go to **Tournaments** and open **"Kingdom Championship 2026"**.
   - Click **Find Opponent**.
3. **Automated Matchmaking Pairing**:
   - The server instantly pairs Alice and Bob atomically in a database transaction.
   - Both browser screens transition directly to the **Live Match Arena** without manual refresh!
4. **Live Match Play**:
   - Board orientations reflect White and Black respectively.
   - Legal moves are validated server-side and mirrored in real-time over Socket.IO.
   - Remaining clocks tick down and synchronize across turns.
   - When a player resigns or checkmates, the game concludes, scores are saved (Win: 1 pt, Draw: 0.5 pt, Loss: 0 pt), and players can immediately re-queue or review the live tournament leaderboard.

---

## 4. Socket.IO Real-Time Event Reference

| Event | Direction | Payload | Description |
|---|---|---|---|
| `matchmaking:join` | Client → Server | `{ tournamentId }` | Queues player for tournament matchmaking |
| `matchmaking:queued` | Server → Client | `{ tournamentId, status, message }` | Confirms queue registration |
| `matchmaking:matched` | Server → Client | `{ matchId, tournamentId, side, match }` | Delivers assigned match and player color |
| `matchmaking:cancel` | Client → Server | `{ tournamentId }` | Cancels queue registration |
| `match:join` | Client → Server | `{ matchId }` | Authenticated room join for participants |
| `match:state` | Server → Client | Canonical board FEN, turn, clocks, moves | Authoritative match state snapshot |
| `match:move` | Client → Server | `{ matchId, from, to, promotion }` | Submits candidate chess move |
| `match:move-accepted` | Server → Client | Updated FEN, SAN, clocks, status | Broadcasts validated move to both players |
| `match:move-rejected` | Server → Client | `{ matchId, reason }` | Rejects illegal, stale, or out-of-turn move |
| `match:resign` | Client → Server | `{ matchId }` | Resigns active match |
| `match:timeout` | Client → Server | `{ matchId }` | Claims authoritative clock timeout when player runs out of time |
| `match:ended` | Server → Client | `{ matchId, result, terminationReason, fen, pgn }` | Concludes match and updates standings |

---

## 5. Clock Mechanics & FIDE Timeout Rules

### A. Turn-Based Countdown Clocks
- In adherence to official **FIDE Chess Rules**, digital chess clocks are **turn-based**.
- **White moves first:** At the start of every match, White's clock begins counting down while Black's clock remains **paused** at `05:00`.
- Once White executes a move, White's clock safely pauses and **Black's clock immediately begins ticking down**.
- The UI provides clear `● RUNNING` and `⏸ PAUSED` status indicators along with an informative turn banner so both competitors always know whose turn it is.

### B. What Happens When a Clock Hits 00:00 (Timeout / Flag Fall)?
- If a player runs out of time before a checkmate or draw occurs:
  1. The server authoritatively verifies that the elapsed time has exceeded the player's allotted time control.
  2. The player whose clock reached `00:00` **loses on time** (`Loss via timeout`).
  3. The opponent **wins the match** (`Win via timeout`).
  4. The match status transitions to `completed` with `terminationReason: 'timeout'`.
  5. The tournament leaderboard updates instantly:
     - **Winner:** `+1.0 point`
     - **Loser:** `+0.0 points`
  6. A Victory / Match Finished modal displays the outcome with direct buttons to queue for the next round or inspect the tournament standings.

---

## 6. Architectural Decisions & Trade-Offs

- **Server-Authoritative Game State:**
  Move validation, legal king safety, checkmate detection, and clock verification are executed on the backend via `chess.js`. A modified or tampered client cannot submit illegal moves or falsify remaining time.
- **Concurrency-Safe Matchmaking:**
  Matchmaking uses atomic PostgreSQL queries to prevent double-booking or matching a student with themselves. Eligible students are paired FIFO and immediately dropped into live matches via private Socket.IO rooms.
- **Idempotent Scoring:**
  Match completions are recorded in database transactions ensuring duplicate result events cannot award points twice. Leaderboard scoring follows standard FIDE rules: Win = 1.0, Draw = 0.5, Loss = 0.0.
- **HttpOnly Cookie Authentication & Route Guards:**
  JWT tokens are stored in `httpOnly` secure cookies to prevent XSS credential theft. Route guards protect authenticated pages:
  - Unauthenticated users attempting to access `/account` are immediately redirected to `/login`.
  - Authenticated users attempting to access `/login` or `/signup` are automatically redirected to `/tournaments`.

---

## 7. Automated Tests

Run unit tests covering leaderboard scoring, chess rules, and tournament invariants:
```bash
npm run test:backend
```
All 10 test suites pass.

---

## 8. Mobile-First Responsive Experience

The web platform is fully responsive and optimized for mobile devices (360px–430px smartphone viewports) as well as tablets and desktops:
- **Zero Horizontal Overflow:** Desktop tables (`min-w-[560px]`) seamlessly transition into native mobile cards for leaderboard standings and round pairings.
- **Single-Screen Game Arena:** On mobile screens, the opponent header, chessboard, player header, and digital clocks fit within the visible viewport without requiring vertical scrolling.
- **Touch-Friendly Controls (`touch-action: none`):**
  - **Tap-to-Move:** Tap a piece to highlight legal destination squares with amber markers, then tap the target square to execute the move.
  - **Drag-and-Drop:** Smooth touch dragging with browser scrolling disabled during chess piece movement.
- **Mobile Navigation Bar:** Sleek bottom navigation bar with active indicators (`Tournaments`, `Active Match`, `Standings`, `Account`), eliminating redundant hamburger menus.
- **Collapsible Scoresheet:** On mobile devices, the official SAN scoresheet is accessible via a one-tap expandable accordion beneath the game board.

---

## 9. Official Stitch Royal Academy Design System Integration

The platform integrates the Kingdom of Chess **Royal Academy & Tournament Platform** responsive design system (located in `stitch_responsive_ui_design_system/`):

1. **Brand Identity & Imagery Assets (`frontend/public/`):**
   - Official **Kingdom of Chess** high-resolution emblem logo (`/koc_logo.png`).
   - Authentic student and coach profile portraits (`/avatars/alex.png`, `/avatars/marcus.png`, `/avatars/coach.png`).
2. **Harmonious Color Palette & Design Tokens:**
   - **Canvas Canvas:** Warm intellectual parchment (`#faf8f5`).
   - **Surface Cards:** Crisp white cards (`#ffffff`) with hairline slate borders (`#e2e8f0`).
   - **Brand Navy:** Royal deep navy (`#0c2340`) for headline typography.
   - **Vibrant Accent:** Kingdom orange (`#f97316` / `#ea580c`) for primary CTAs and active states.
   - **Status Badges:** Emerald green (`#10b981`) for live gateway telemetry and Socket.IO status.
   - **Royal Academy Chessboard:** `#0A2942` dark navy squares and `#FFF3DF` warm ivory light squares per Stitch specification.
3. **Typography Hierarchy:**
   - **Headlines:** `Plus Jakarta Sans` font for modern scholastic boldness.
   - **Body:** `DM Sans` for legibility and comfortable reading.
   - **Clocks & Notation:** `JetBrains Mono` for tabular digit alignment and PGN scoresheets.
4. **Interactive Matchmaking Radar:**
   - Spinning radar sweep line with SVG concentric circles and ambient orange glow.
   - Live elapsed matchmaking timer with estimated queue duration and strict FIFO criteria.
   - Instant 3-second opponent found snapshot transition card before launching the live board.
5. **Redesigned Host Tournament Modal:**
   - Responsive non-overflowing modal window (`max-h-[90vh]`) with fixed royal navy gradient header, scrollable body, and sticky action footer.
   - Interactive time control cards with icons, category badges (`⚡ Blitz`, `⏱️ Rapid`, `⏳ Classical`, `♟️ Swiss`), and radio indicators.
   - Dual date pickers with one-tap presets and duration offsets.
6. **Mobile-First Shell:**
   - Clean top bar with Kingdom emblem, route badges, and authenticated user profile.
   - Fixed bottom navigation bar with active highlights and zero hamburger menu clutter.
7. **Tournament Arena Horizontal Slider & Searchable Dropdown (`/standings`):**
   - Compact dual-mode selector preventing vertical space clutter when numerous tournaments exist.
   - Smooth horizontal swipe/scroll slider track with desktop `<` and `>` navigation arrows.
   - Quick searchable floating dropdown with live status pills (`open`, `ongoing`, `completed`) and time controls.

---

## 10. Dynamic Scholastic Profile & Telemetry System (`/account`)

The Profile / Account page (`/account`) and navigation header are **100% dynamic** with zero hardcoded mock values:
- **Dedicated Backend Metrics (`GET /api/v1/me/stats`):** Computes authoritative statistics directly from PostgreSQL `users`, `tournaments`, `tournament_participants`, and `matches` tables.
- **Role-Tailored Telemetry:**
  - **Student View:**
    - Live Blitz Elo rating dynamically computed from match results (`1200 + (wins * 20) + (draws * 5) - (losses * 15)`).
    - Rating net change indicator (`+pts` / `Provisional`).
    - Consecutive win streak counter and state tag (`Hot Streak 🔥`, `Active Run`, `Ready to Play`).
    - Scholastic rank titles based on performance (`Academy Novice`, `Junior Scholar`, `Silver Candidate`, `Gold Candidate`, `Master Scholar`, `Grandmaster Candidate`).
    - Authoritative tournament records, match win/draw/loss counts, and win rates.
    - Recent tournament participations list with scores and completion status.
  - **Coach / Director View:**
    - Total tournaments hosted, active events, and concluded events count.
    - Total unique students enrolled across coach's tournaments.
    - Total matches arbitrated and overseen.
    - Certified Arbiter status and FIDE Fair-Play accreditation.
    - Live list of recently created tournaments with direct bracket links.
- **Dynamic User Monogram & Credentials:** Initials-based avatar fallback for custom player accounts, player license ID (`KC-...`), and real registration timestamp (`Member Since`).



