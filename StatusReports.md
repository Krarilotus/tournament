# Phase 1 Implementation Report — Tournament Manager  
  
## ✅ Completed Work  
  
**Core Environment & Structure**  
- Created full Next.js 16 (App Router) project using TypeScript, Tailwind CSS, and ESLint.   
- Implemented the directory structure according to the Phase 1 specification:  
  - `/app/(auth)/` for authentication pages   
  - `/app/api/auth/` for route handlers   
  - `/app/(dashboard)/dashboard/` for protected views   
  - `/lib/` for database connection, Auth.js config, models, and mailer   
  - `/components/auth/` for reusable client components  
  
**Authentication Flow**  
- Implemented `next-auth@5 beta` with the official Mongoose Adapter for MongoDB.  
- Local database connection (`mongodb://localhost:27017/tournament_dev`) configured and working.  
- User registration with secure password hashing (`bcryptjs`) and duplicate-email check.  
- Email verification flow implemented using `nodemailer` and Ethereal Email test inbox.  
  - Automatic token creation and expiration after 24 hours.  
  - Verified link redirects user correctly to the login page.  
- Login flow with proper error handling:  
  - Invalid credentials.  
  - Unverified users prevented from logging in until verification.  
- Session persistence and protection middleware operational (`/dashboard` guarded by NextAuth middleware).  
- Password-reset flow implemented (`forgot-password` → email → reset → login).  
- Added modular `SignOutButton` component and integrated logout functionality.  
- Verified all user flows end-to-end locally.  
  
**UI**  
- Minimal functional interfaces for Register, Login, Forgot Password, Reset Password, and Dashboard.  
- Tailwind CSS used consistently for styling.  
- Authentication pages tested and working.  
  
## ⚙️ Technical Adjustments vs Original Plan  
  
| Area | Original Plan | Final Implementation | Reason |  
|------|----------------|----------------------|---------|  
| **Next.js runtime handling** | `middleware.ts` (Edge) | Replaced with `proxy.ts` using Node runtime | Next 16 deprecated `middleware`; `proxy` avoids `crypto` errors |  
| **Auth.js session strategy** | Database session | Implemented JWT session (default) for stability with Next 16 | Database sessions caused config error; JWT works identically in this prototype |  
| **Email verification model** | Use built-in VerificationToken model | Custom `EmailToken` schema for full control | Prevented version mismatches with @auth/core and simplified token cleanup |  
| **Sign-out** | Inline button | Extracted reusable `SignOutButton` component | Cleaner component reuse for future UI |  
| **UI framework** | Simple forms only | Added Tailwind structure | Enhances clarity and testability |  
  
## 🧩 Pending / Confirmation Needed Before Phase 2  
  
1. **Server-side MongoDB Instance (Production)**   
   - Local MongoDB (Docker container `local-mongo`) used for development.   
   - Production instance (`tournament-mongo` on port 27018) not yet set up.   
   - Confirm whether to configure and test the Dockerized MongoDB on the Debian server now, or postpone until Phase 2 deployment.  
  
2. **Session Storage Strategy**   
   - Currently using **JWT-based sessions** (modern Auth.js default).   
   - Original spec requested **database sessions**; confirm which strategy the team wants long-term before implementing Phase 2 roles & permissions.  
  
3. **UI Polish / Branding**   
   - Pages are fully functional but use minimal placeholder UI.   
   - Confirm if we should apply design system components (e.g., shadcn/ui) before proceeding.  
  
4. **Environment Variable Validation**   
   - `.env.local` works locally.   
   - Server environment variables (systemd unit) still pending configuration.  
  
## ✅ Next Steps if Approved  
- Set up and connect the production MongoDB Docker container (`tournament-mongo`) on the Debian server.   
- Configure the environment variables directly inside the systemd service file.   
- Begin **Phase 2: Tournament Management & Dashboard Features** (CRUD for Tournaments, Participants, Rounds, Matches).  
  
---  
  
**Summary:**   
Phase 1 authentication foundation is complete and verified locally.   
Awaiting confirmation on MongoDB server setup and session strategy before proceeding with Phase 2.    
This report details the successful completion of Phase 2. We have implemented the complete "application shell," including all static pages, layouts, and core providers. The application is now fully themed (dark mode by default), responsive, and ready for Phase 3 (Tournament CRUD).## ✅ Phase 2 Completed Work### 1. Core UI & Theming Setup
 * **`shadcn/ui` Initialized:** Successfully set up `shadcn/ui` (using the new `shadcn` CLI) with the **Slate** theme.
 * **Dependencies Installed:** Added all necessary components (`button`, `dropdown-menu`, `sheet`, `avatar`, `card`, `input`, `label`) and plugins (`@tailwindcss/typography`, `tailwindcss-animate`).
 * **Dark Mode & Theme Provider:** Implemented `next-themes` to provide a default **dark mode** and a `ThemeToggle` component to switch between Light, Dark, and System themes. This provider is wrapped at the root of the application.### 2. Layouts & Routing
 * **Consolidated Public Layout (`app/(public)`):** 
 * **Change from Plan:** We merged the original `(auth)` folder into the `app/(public)` route group. 
 * **Reason:** This ensures all public-facing pages (Login, Register, Impressum, Privacy) share one consistent layout, which includes the header and footer. 
 * **Dynamic Header:** The public header now checks the user's session, showing a "Login" button to guests and a "Dashboard" button to authenticated users.
 * **Responsive Dashboard Layout (`app/(dashboard)`):** * Implemented the full, responsive application shell for logged-in users. * Features a persistent desktop sidebar (using `md:grid`) and a mobile `Sheet` menu. * The header includes the `ThemeToggle` and the user-avatar `DropdownMenu`.
 * **Root URL Redirect (`app/page.tsx`):** * Replaced the default Next.js starter page with a dynamic redirect. * Users visiting `/` are now intelligently sent to `/dashboard` (if logged in) or `/login` (if logged out).### 3. Core Components
 * **`SessionProvider`:** Added the standard `next-auth` `SessionProvider` to the root layout. This was a necessary addition (not tech debt) to power client-side auth hooks (like `signOut()`) which are required for our `SignOutButton`.
 * **Reusable `<Footer />`:** Created a single `components/layout/Footer.tsx` component to avoid code duplication. This component is now used in both the public and dashboard layouts.
 * **Refactored `SignOutButton`:** Rebuilt the `SignOutButton` to be a wrapper around `DropdownMenuItem`. This isolates its `"use client"` logic and—most importantly—fixes the styling bug, ensuring it perfectly matches the "Settings" item in the menu.
 * **`ThemeToggle` Component:** Created a standard, reusable toggle component to manage theme state.### 4. Static Pages
 * **Impressum & Privacy:** * Rebuilt both pages using `shadcn`'s `<Card>` component instead of the basic `prose` class. This provides a much more professional, structured, and "finished" look. * Filled pages with more complete boilerplate text and project-specific details (`shc-tournaments`, `unofficialcrusaderpatch.com`). 
 * **Bug Fix:** Corrected a critical HTML nesting error (`<ul>` inside `<p>`) on the Privacy page, which eliminated a React hydration error.## ⚙️ Key Technical Adjustments
 * **`tailwind.config.ts`:** We had to manually create this file, as the `init` command was configured to skip it (due to an empty `config` path in `components.json`).
 * **Dependency Fixes:** Manually installed `tailwindcss-animate` which was missed by the `init` process.
 * **Provider Architecture:** The root layout (`app/layout.tsx`) is now cleanly wrapped with our three core providers: `ThemeProvider` (for themes), `SessionProvider` (for client auth), and `Toaster` (for future notifications).## 🟢 Current Status  
All verification steps have passed.* The application is fully responsive and dark-mode-first.* All public and private layouts are in place.* Authentication state is correctly reflected in all headers.* All known UI bugs (styling, hydration) have been resolved.  
  
Phase 2 is complete. We are ready to begin **Phase 3: Tournament CRUD** (building the "Create New Tournament" form).    
# Phase 3 Report: Tournament CRUD & "Critical UI"  
  
Phase 3 is now 100% complete. This was a complex phase where the primary work involved not just building the planned features, but adapting our Next.js 14-based plan to the realities of our **Next.js 16 / React 19** stack.  
  
We successfully built the full **Create, Read, Update, and Delete (CRUD)** loop for tournaments, including the "Critical UI" for tie-breakers. All bugs found during our extensive debugging have been resolved.  
  
---  
  
## ✅ Phase 3 Completed Work  
  

 * **Database Models:** Created all four required Mongoose models (`Tournament`, `Participant`, `Round`, `Match`) that were prerequisites for the API. Confirmed our "separated collections" (referencing) architecture is the correct long-term, scalable solution over a monolithic document.  

 * **Full CRUD API:** Built all backend API endpoints:  
    * `POST /api/tournaments` (Create)  
    * `GET /api/tournaments` (Read All)  
    * `GET /api/tournaments/[id]` (Read One)  
    * `PUT /api/tournaments/[id]` (Update)  
    * `DELETE /api/tournaments/[id]` (Delete)  

 * **Dynamic Dashboard (Read):** The `/dashboard` page is no longer static. It's now a Server Component that fetches all tournaments from the DB and renders them as cards.  

 * **Create/Delete Flow:** Implemented the `DeleteTournamentButton` (with `AlertDialog`) and the "Create Tournament" form. The full C-R-D loop is verified:  
    1.  User creates a tournament.  
    2.  User is redirected to the dashboard, where the new tournament appears.  
    3.  User can delete the tournament, and it is removed from the UI (via `router.refresh()`).  

 * **Update (Settings) Page:** Built the dynamic `/dashboard/[id]/settings` page, which fetches and pre-fills form data for a specific tournament.  

 * **"Critical UI" (Custom Stats):** Implemented the UI on the settings page for adding and removing custom stat fields (e.g., "Kills"), which saves to the `tournament.settings.customStats` array.  

 * **"Critical UI" (D&D Tie-Breakers):** Built the full-featured, drag-and-drop `TieBreakerDnd` component, which correctly integrates with `react-hook-form` to manage the `tournament.settings.tieBreakers` array.  
  
---  
  
## 🚀 Next.js 16/React 19: Critical Findings  
  
The most significant challenge of this phase was adapting to our experimental stack. The original plan's assumptions were based on Next.js 14, and the new architecture is fundamentally different.  
  
**The core finding is that Dynamic APIs are now Asynchronous.**  
  
The `params` prop (which gives us the `[id]` from the URL) is no longer a plain object. **It is now a `Promise`**. Accessing it synchronously was the root cause of all our `undefined` ID bugs.  
  
We have implemented the correct "Zero Tech Debt" fixes for this stack:  
  
1. **On the Server (`route.ts`):** In our API handlers, we must `await` the `context.params` object.      
 * **Old (Next 14):** `function DELETE(req, { params }) { ... }`      
 * **New (Next 16):** `async function DELETE(req, context) { const params = await context.params; ... }`  
  
2.  **On the Client (`page.tsx`):** In any Client Component that receives `params` (like our settings page), we must use **`React.use()`** to unwrap the promise.      
 * **Old (Next 14):** `export default function Page({ params }) { ... }`      
 * **New (React 19):** `export default function Page(props) { const params = React.use(props.params); ... }`  
  
Mastering this concept was key to unblocking this phase.  
  
---  
  
## ⚙️ Key Technical Adjustments & Decisions  
  
We encountered several other intricacies and made key decisions to prevent tech debt.  
  
| Area | Original Plan / Assumption | Final Implementation & Decision |  
| :--- | :--- | :--- |  
| **Auth Session** | `session.user` would contain the user's ID. | **Bug Found:** The `session.user` object was missing the `.id` field, breaking all `ownerId` queries. |  
| | | **Fix:** We modified `lib/auth.ts`. We added the `jwt` and `session` callbacks to **explicitly add the `user.id`** to the JWT token on login. This fixed the bug at its source. |  
| **Form Validation** | Use `z.coerce.number()` and `.default()` in the Zod schema to manage form data. | **Bug Found:** This created a critical type mismatch between Zod's *input* type (`number | undefined`) and *output* type (`number`), which broke `react-hook-form`. |  
| | | **Fix:** We moved all `defaultValues` from Zod into the `useForm` hook. We use `z.number()` in Zod and `valueAsNumber: true` in the form. This provides a clean separation of concerns. |  
| **D&D Schema** | `tieBreakers` was planned as a simple `z.array(z.string())`. | **Bug Found:** `react-hook-form`'s `useFieldArray` hook is designed for *arrays of objects*, not strings. This caused major type errors. |  
| | | **Fix:** We refactored the schema to be `z.array(z.object({ value: z.string() }))`. We now "flatten" this data (to `string[]`) when saving to the DB and "un-flatten" it (to `object[]`) when loading it into the form. This is the correct, robust solution. |  
| **D&D Logic** | The "points" tie-breaker should be "locked" at the top. | **Bug Found:** The locking logic was complex and buggy, causing items to "snap back" to their old positions. |  
| | | **Decision:** We removed all locking logic for a simpler, fully moveable list (including "points"). This fixed all D&D bugs and gives the user more control. |  
| **Route Structure** | The path for the create page was ambiguous. | **Bug Found:** We had a 404 error because our links pointed to `/dashboard/create` but the file was at `/create`. |  
| | | **Decision:** We moved the file to `app/(dashboard)/dashboard/create/page.tsx`. This is the correct, "less tech debt" nested resource path for a CRUD application. |  
| **API Data** | The `GET` API route returned the raw Mongoose document. | **Bug Found:** The `pointSystem` (a `Map`) was serializing as an empty `Object` (`{}`), causing the settings form to load with empty fields. |  
| | | **Fix:** We updated the `GET /api/tournaments/[id]` route to manually build and return a **clean, flat JSON object** instead of the Mongoose document. This ensures the client gets predictable data. |  
  
---  
  
## 🟢 Current Status  
  
**Phase 3 is 100% complete, verified, and debugged.** The application now has a stable and fully functional core for managing tournament settings.  
  
We are ready to proceed with **Phase 4: Tournament Control Panel (Participants)**.  


# Phase 4 Implementation Report

To: Senior Partner  
From: Co-Developer Team  
Subject: Phase 4 (Participants CRUD) Completion & "Zero Tech Debt" Enhancements  

---

## 1. Executive Summary

Phase 4 is complete and verified. The core requirement—full CRUD functionality for tournament participants—has been successfully implemented.

During development, we made a critical **"Zero Tech Debt"** decision to deviate from the original single-add participant form. To better align with the project's key goals of **flexibility** and **rapid management**, we re-architected this feature to support **batch-adding participants** from the outset.

We also resolved a major **architecture-level bug** in Next.js 16 / React 19 related to `props.params` promise handling, establishing a stable and reusable pattern for all future control panel pages.

---

## 2. Core Functionality Implemented

### Participant CRUD API

- `GET /api/tournaments/[id]/participants` — Fetch all participants.  
- `POST /api/tournaments/[id]/participants` — Re-architected to accept an array of participants for efficient batch creation.  
- `PUT /api/participants/[id]` — Update a single participant (e.g., toggle `isActive`).  
- `DELETE /api/participants/[id]` — Delete a single participant.

### Control Panel UI

- `/[id]/(control-panel)/layout.tsx` — New **Server Component layout** providing tabbed navigation ("Participants" & "Rounds") and fetching the tournament name.  
- `/[id]/(control-panel)/page.tsx` — New **Client Component dashboard** that fetches and manages participants, following the stable architectural pattern established in the settings page.

---

## 3. Key Hurdles & “Zero Tech Debt” Decisions

This phase presented three major challenges, each resolved with long-term, debt-free architectural solutions.

### 1. Batch-Add vs. Single-Add

**Problem:**  
The original plan specified a single-add dialog, which conflicted with the project’s “rapid management” requirement.

**Decision:**  
We upgraded the feature from the start.

- **Schema:** Introduced `batchAddParticipantsSchema` using `zod.superRefine` to validate an array of participant rows.  
- **API:** Refactored the POST route to use `Participant.insertMany()` for efficient batch inserts.  
- **UI:** Built `AddParticipantDialog` with `useFieldArray` to handle dynamic lists and added **multi-paste support** (detecting newlines and tabs), allowing organizers to paste directly from spreadsheets.

---

### 2. RSC Promise-Conflict Crash

**Problem:**  
Encountered a recurring `Expected a suspended thenable` crash when navigating between control panel pages.

**Diagnosis:**  
Conflict between the Server Component layout (`layout.tsx`) and a child Server Component (`page.tsx`) both attempting to consume the `props.params` promise via `React.use()`.

**Decision:**  
Adopted the verified working pattern from the settings page:

- `layout.tsx` (Server Component) unwraps the `params` promise (`await params`), fetches the tournament name, and builds server-rendered tab links.  
- `page.tsx` (Client Component) receives resolved params (`{ id: string }`) as a plain object and fetches its own data from the API.  

This eliminates the conflict and provides a stable, scalable architecture for all future control panel pages.

---

### 3. Data Integrity (Server BSON vs. Client JSON)

**Problem:**  
TypeScript mismatches (e.g., `ObjectId` vs. `string`) occurred when passing data from Server Components to Client Components.

**Decision:**  
We created a dedicated `SerializedParticipant` type.  
All data fetched on the server (e.g., in `getParticipants`) is explicitly serialized (`_id: p._id.toString()`) before being passed to client components, ensuring **100% type safety** and eliminating type inconsistencies.

---

## 4. Bonus Flexibility Features Implemented

The new client-side architecture enabled several UX and reliability improvements beyond the original scope:

- **Persistent Table Layouts:**  
  Participant table settings (column visibility, sorting, order) are now stored in the database per tournament, preserving each user’s layout.

- **Callback-Driven Refreshes:**  
  `page.tsx` now provides an `onParticipantsChanged` callback to children, allowing silent API refreshes after add/delete/toggle actions without page reloads.

---

## 5. Conclusion

Phase 4 is complete, verified, and significantly more robust than originally planned.  
The **core participant management system** is now fully functional, and we have established a **definitive, scalable, "Zero Tech Debt" architecture** for all future tournament management modules.

The system is ready to proceed to **Phase 5: Matchmaking**.

Before beginning, we will expand our scope to include not only **Swiss 1v1** matchmaking but also **N-player Free-For-All (N-FFA)** and **2v2 team** formats. The matchmaking and scoring systems are tightly coupled; thus, both should be planned together as a unified logic phase.

This combined **Phase 5-6 planning stage** will define:
- Core matchmaking algorithms (Swiss, N-FFA, and 2v2).  
- Scoring and tie-breaker logic (points, Buchholz, and custom stats).  
- Round generation and dynamic format switching.  

Once finalized, this logic layer will serve as the computational “engine” of the entire application—everything else will depend on its precision and stability.

---

**Status:** ✅ Phase 4 Complete — Ready for Phase 5 (Matchmaking & Scoring Logic Planning)




# 🚀 Phase 5: Core Logic Engine - Detailed Implementation Report

This report provides a detailed summary of the architectural and feature-level work completed during the "Unified Logic Plan." The original plan was not just implemented but fundamentally re-architected to prioritize modularity, configurability, and long-term "Zero Tech Debt."

## 1. Executive Summary: From API to Engine

The most significant achievement of this phase was the "Zero Tech Debt" pivot from building three simple API routes to designing a **true, modular logic engine** located in `lib/matchmaking/`.

The API routes (`generate-round`, `standings`, etc.) are now correctly implemented as thin "Orchestrators" that validate user input and call this pure, testable engine.

This architectural shift enabled three massive feature upgrades not fully scoped in the original plan:

1.  **Persistent Team Entity (`lib/models/Team.ts`):** We now have a new database collection for `Teams`. This allows users to *name* their teams (e.g., "Blue Squad") and allows us to persist team structures across multiple rounds. This is the foundation for the new "Team Management" page.
2.  **Per-Round Configurability (`lib/models/Round.ts`):** The `Round` model was upgraded to store the *exact* `systemOptions` (e.g., FFA point-per-place) used to generate it. The Re-Calculation Engine now intelligently reads this per-round config, making it far more flexible.
3.  **Advanced UI & Custom Pairings:** The `GenerateRoundDialog` was completely rebuilt to expose all new engine configurations (e.g., "Team Method," "Avoid Rematches"). A new "Custom" tab was added, allowing organizers to manually drag-and-drop players into matches, fulfilling a major "flexibility" requirement ahead of schedule.

---

## 2. 🏛️ Architectural & Model Upgrades

The database schema was significantly enhanced to support the new engine.

* **`lib/models/Team.ts` (New Model):**
    * A new collection that permanently stores a team's members (`playerIds`), `ownerId`, and `tournamentId`.
    * **Critical Feature:** It includes a `lookupKey` (a sorted, `|`-delimited string of `playerIds`, e.g., "id1|id2|id3"). This key is indexed and used to guarantee team uniqueness and rapidly find existing teams.
    * Stores `customName` (user-defined) and `genericName` (e.g., "Team A").

* **`lib/models/Round.ts` (Upgraded):**
    * `systemOptions: Schema.Types.Mixed`: Stores the *exact* configuration object (e.g., `{ groupSize: 4, groupMethod: 'SIMPLE_CHUNK' }`) from `generate-round` for perfect historical accuracy.
    * `ffaPlacements: Map<string, number>`: A per-round override for FFA scoring (e.g., `"1st": 10, "2nd": 5`).
    * `pointSystem: Map<string, number>`: A per-round override for standard win/loss/draw points.

* **`lib/models/Match.ts` (Upgraded):**
    * `teamNames: Map<string, string>`: Stores a snapshot of team names at the time of match creation (e.g., `"A": "Blue Squad", "B": "Red Rebels"`). This ensures match cards don't change if a team is renamed later.

* **`lib/models/Participant.ts` (Upgraded):**
    * `scores: { type: Schema.Types.Mixed }`: Explicitly set to `Mixed` (and `strict: false`) to ensure Mongoose correctly saves all dynamic custom stat keys (e.g., `scores.Kills: 102`).

---

## 3. ⚙️ Module 5.1: The Re-Calculation Engine (The "Accountant")

The "Accountant" is now significantly more precise and robust, respecting per-round settings.

* **`app/api/tournaments/[id]/recalculate/route.ts`:**
    * The engine now fetches all `Rounds` into a `Map` during its initial data-gathering pass.
    * **Upgraded Logic:** When tallying a `Match`, it finds its parent `Round` (via `roundsMap.get(match.roundId)`). It then *prioritizes* scoring based on the `round.ffaPlacements` or `round.pointSystem` *before* falling back to the global `tournament.settings.pointSystem`. This is the core of the new flexibility.
    * The Buchholz calculation was optimized to use a `Set<string>` of `opponentIds` populated during Pass 2, making Pass 3 (Buchholz-1) and Pass 4 (Buchholz-2) extremely fast.

* **`app/api/matches/[matchId]/report/route.ts`:**
    * **Critical "Zero Tech Debt" Fix:** The "fire-and-forget" `fetch` to `/recalculate` was **removed and replaced with an `await fetch(...)`**. This prevents a critical race condition where the client's UI would re-fetch standings *before* the recalculation was finished, leading to stale data. The UI now only refreshes *after* the new standings are 100% computed.
    * The logic was also upgraded to check if *all* matches in a round are `completed`, and if so, it automatically updates the `Round.status` to `completed`.

* **`app/api/tournaments/[id]/rounds/[roundId]/route.ts` (New Endpoint):**
    * A new `DELETE` endpoint was created to delete a round and all its associated matches.
    * This endpoint *also* correctly `await`s a full recalculation, ensuring that deleting a round instantly and accurately updates all participant scores.

---

## 4. 📊 Module 5.2: The Standings Engine (The "Sorter")

This module was successfully refactored and expanded to support both players and teams.

* **`lib/standings/getStandings.ts` (New Module):**
    * The core sorting logic was extracted from the API route and placed in this pure, reusable function. The API at `app/api/.../standings/route.ts` is now a thin, secure wrapper that authenticates the user and calls this module.

* **`app/api/.../team-standings/route.ts` (New Endpoint):**
    * A new, dedicated endpoint to power the "Team Standings" view.
    * It accepts a `seedRoundId` query param.
    * It calls the `reconstructTeamsFromMatches` helper to identify all teams that played in that round.
    * It fetches the *current* `Participant` documents for all members of those teams.
    * It calculates aggregate scores (`totalPoints`, `averagePoints`) for each team.
    * It returns a fully sorted list of these team entities.

---

## 5. 🚀 Module 5.3: The Matchmaking Engine (The "Pairer")

This is the largest and most significant upgrade. The simple API route was replaced with a fully modular, configurable, and pure logic engine.

* **`lib/validators.ts` (Upgraded):**
    * The `generateRoundBodySchema` was completely rewritten as a `discriminatedUnion` to be the "single source of truth."
    * It now contains comprehensive, nested option schemas for `swiss1v1`, `n-ffa`, `team-2v2`, and the new `custom` system.
    * All `.default()` calls were correctly removed from the schema and moved into the UI's `useState` and `onValueChange` handlers, fixing all `react-hook-form` / `zod` type conflicts.

* **`app/api/.../generate-round/route.ts` (The "Orchestrator"):**
    * This route's only job is to orchestrate.
    * 1. It validates the complex `generateRoundBodySchema`.
    * 2. It fetches all necessary context: `standings` (from `getStandings`), `allMatches`, and `allRounds`.
    * 3. It passes this single, large context object to the central `buildNextRound` function.

* **`lib/matchmaking/buildRound.ts` (The "Central Hub"):**
    * This new module is the "brain" of the engine.
    * It contains the main `switch (config.system)` statement.
    * It correctly dispatches to specialized, testable functions (`buildSwiss1v1Round`, `buildNffaRound`, `buildTeamRound`).
    * It correctly handles the `system: "custom"` case by passing the client-generated `config.matchSeeds` straight through.
    * It is responsible for creating/finding `Team` documents and attaching `teamNames` to match seeds.

* **`lib/matchmaking/core/` (The "Pure Engine"):**
    * **`swiss.ts`:** Contains the pure pairing logic. `pairSwiss` is a generic function that can pair *any* `SwissEntity`. `buildOpponentMap` is the core, reusable function for "Avoid Rematches" logic. `pairSwissFideDutch` correctly implements the high-low pairing within score brackets.
    * **`teamBuilding.ts`:** A pure "team factory." `buildNewTeams` handles the `BALANCE_FIRST_LAST` and `RANDOM` methods. `reconstructTeamsFromMatches` is a powerful helper that can rebuild team compositions from any past round, powering both the `team-standings` API and the "Team Persistence" feature.
    * **`ffa.ts`:** A pure "grouper." `groupFFA` implements two distinct methods: `SIMPLE_CHUNK` (simple top-N) and `SWISS_GROUPING` (smart grouping that *reuses* `buildOpponentMap` to avoid rematches).

---

## 6. 🖥️ Module 5.4: UI & Integration

The UI was built to expose the power of this new engine, resulting in several new features.

* **`app/.../rounds/page.tsx` (The Hub):**
    * This is the main "Rounds & Matches" tab.
    * It uses `useSWR` to fetch four data sources: `/rounds` (for matches), `/standings` (for the player standings card), `/tournament` (for `customStats`), and `/teams` (for the live team name map).
    * It passes the `liveTeamNameMap` to each `MatchCard`, allowing them to display custom team names.

* **`app/.../_components/GenerateRoundDialog.tsx` (The "Control Panel"):**
    * This component was completely rebuilt. It **no longer uses `react-hook-form`**, correctly identifying that its complex, conditional state is better managed with `React.useState`.
    * It is composed of sub-components (`SwissOptionsSection`, `FfaOptionsSection`, `TeamOptionsSection`) for maintainability.
    * It provides a UI for *all* new logic:
        * **Swiss:** Variant (FIDE/Generic), Avoid Rematches, Ignore Rounds.
        * **FFA:** Group Size, Group Method, Per-Place Scoring.
        * **Team:** Team Size, Team Method, Team Persistence (Reuse teams from Round X).
    * **New Feature:** A "Custom" tab (`CustomPairingsSection`) was added, providing a full drag-and-drop UI for manually creating matches, fulfilling a key "flexibility" goal.

* **`app/.../teams/page.tsx` (New Page):**
    * An entirely new page was created at the `/teams` tab.
    * It fetches all persistent teams from `GET /api/.../teams`.
    * It allows the user to filter teams by the round they played in.
    * It features the `RenameTeamForm`, which uses `PATCH /api/.../teams/[teamId]` to update a team's `customName`, with the change instantly reflected in the `rounds` page.

* **`app/.../_components/MatchResultForm.tsx` (Auto-Saving Form):**
    * This component was also built (correctly) *without* `react-hook-form`.
    * It uses `useState` to manage results and `React.useEffect` (on change) to **auto-save** data to the `POST /api/matches/[matchId]/report` endpoint.
    * This provides a robust, "live" feel where results are saved instantly as the user types them, with no "Save" button required.




# Project Workflow Report

This report outlines the major UI/UX improvements and critical bug fixes implemented, adhering to our "Zero Tech Debt" and "Diagnose First" principles.

---

## 1. 🎨 UI/UX Improvements

Our primary goal was to create a more compact, inline, and usable interface for match management.

### MatchCard & Result Reporting
* **Single-Line Header:** The `MatchCard` was completely refactored. The match title, status, and result inputs now all share a single, compact header row.
* **Inline Result Buttons:** Bulky `<Select>` dropdowns for 1v1 and Team matches were replaced with a `ResultButtonGroup` component, allowing 1-click result reporting.
* **Smart FFA Placements:** The FFA placement inputs were refactored. The match title (which can be long) now scrolls horizontally, leaving flexible space for the placement inputs, which also scroll horizontally if they overflow.
* **Compact Stats Table:**
    * The "Custom Stats" section is no longer a full-width button. It's a small `[>]` toggle icon on the left.
    * When clicked, the stats table appears *next to* the toggle, not below it, saving vertical space.
    * The table itself is now a 2-column layout (Static Players + Scrollable Stats) to fix all "sticky column" and alignment bugs.
    * All headers and inputs are now `left-aligned` to fix visual misalignment caused by number input spinners.
* **Default Collapsed State:** Completed rounds and matches (including their stats) now default to a *collapsed* state when the page is loaded, providing a clean, high-level overview.

### Dialog & Workflow Improvements
* **Standardized Dialogs:** The `GenerateRoundDialog` and `AddParticipantDialog` were both refactored to have a fixed, larger height (`80dvh`) with internally scrolling content, preventing jarring layout shifts.
* **Surgical Swap Feature:** Implemented the critical "Swap Participants" feature. This allows for surgical, 1-to-1 swaps between pending matches, bye matches, or the bench, without requiring a full round re-seed.

---

## 2. 🛠️ "Zero Tech Debt" Refactoring

* **`MatchCard` De-coupling:** The `MatchCard.tsx` component was identified as a monolith. All state management and API logic were extracted into a new `useMatchState.ts` hook. All input rendering was extracted to a new `MatchResultInputs.tsx` component. This makes `MatchCard.tsx` a clean, declarative, and maintainable container.

---

## 3. 🐞 Critical Bug Fix: The `ownerId` Crash

We diagnosed and fixed a critical bug that caused the "Rename Team" API to crash.

* **Diagnosis (The Cause):** The new "Swap Participants" API (`POST .../rounds/[roundId]`) was correctly creating new persistent `Team` documents but was **forgetting to add the `ownerId`**.
* **Diagnosis (The Crash):** The "Rename Team" API (`PATCH .../teams/[teamId]`) expected `team.ownerId` to exist. When it tried to rename a "corrupted" team, it crashed on `team.ownerId.toString()`.
* **Fix 1 (The Cause):** The `POST` (Swap) API was updated to correctly query for the `tournament.ownerId` and insert it into all new `Team` documents.
* **Fix 2 (The Crash):** The `PATCH` (Rename) API was made defensive. It now (correctly) authorizes against the *parent tournament's* `ownerId`. It also *repairs* any old, corrupted team documents it finds by adding the `ownerId` before saving, thus fixing the validation error.
* **Fix 3 (Data Integrity):** We created and implemented a `runTeamGarbageCollector` function that is now called after any swap or round deletion. This function scans all matches and *deletes* any orphaned `Team` documents, preventing database bloat and fixing the UI bug where "Team A" would appear.




# Project Workflow & Collaboration Guidelines (V2)  
Hello and welcome to the team.  
Our single most important goal is to build a **"Zero Tech Debt"** application. To do this, we (you, me, and our AI assistant, Gemini) must follow a precise, diagnosis-driven workflow.  
Please adhere to these rules strictly.  
---  
### 1. 🧠 Diagnose First, Then Fix  
This is our most important rule. When a bug is reported (especially with a console log), **do not guess the solution.**  
 * **Ask:** Ask for any files (`.tsx`, `lib/models`, `package.json`) or logs needed to find the **root cause**.
 * **Diagnose:** State your diagnosis clearly in plain text. We must all understand *why* the bug is happening. (e.g., "The crash is a promise conflict between the Server Component layout and its child Server Component page.").
 * **Fix:** *After* we agree on the diagnosis, provide the clean, complete code for the fix.  

### 2. 💡 Challenge for "Zero Tech Debt"  
You are a guardian of the project's long-term health.  
 * **"Why" Before "What":** Always explain *why* a new feature is being built a certain way.
 * **Challenge Bad Solutions:** If a proposed solution (from anyone, including me or the AI) creates tech debt (e.g., bad schema, poor UX, "quick fixes"), you **must** challenge it.
 * **Propose the Clean Fix:** Propose the clean, maintainable, and scalable solution. (e.g., We build a "batch-add" form instead of a "single-add" form because it's the *right* UX).  

### 3. 🔄 Merge, Don't Replace  
My local files are the source of truth.
 * **Ask First:** Before providing code for any *existing* file, you **must** ask me to provide the current version.
 * **Merge Logic:** Your job is to **merge** the new logic with my existing code, not overwrite it.  

### 4. ⌨️ Strict Code & File Formatting  
This is our mandatory format for all code implementation.  
 * **File Creation:** For any *new* file, you **must** provide the explicit `mkdir -p` and `touch` commands.
 * **Full Code:** You **must** always provide the **full, complete code** for any new or changed file. Do not use snippets, diffs, or partial code.
 * **Code Blocks:** All file content **must** be in a separate markdown code block with the correct language and full filename (e.g., `typescript:app/(dashboard)/dashboard/[id]/(control-panel)/page.tsx`).  

### 5. ⚠️ Remember Our Architecture (Next 16 / React 19)  
Our biggest hurdles come from this stack. Be mindful of it.  
 * **Server vs. Client:** Be 100% clear on whether a component is a Server Component (default) or a Client Component (`"use client"`).
 * **Promise Props:** Be *extremely* careful with `props.params`.
    * A **Server Component** (`layout.tsx`, `page.tsx`) receives it as a `Promise`. It must be unwrapped with `React.use()` or `await`.
    * A **Client Component** (`"use client"`) *also* receives it as a `Promise`. It must be unwrapped with the `use()` hook.    
 * **The Conflict:** A parent Server Component and a child Server Component **cannot** both unwrap the *same* `props.params` promise. This is the bug we fixed in Phase 4.

### 6. 🤖 Our AI Assistant's Rules (For Reference)  
Our AI assistant (Gemini) must also follow these rules.  
 * **Text-Only:** The AI is restricted to text and code-based outputs only. It **will not** use a "canvas" or any non-text tools.
 * **Precision:** The AI must be precise. It must provide full filenames, correct commands, and must follow the "Diagnose First" rule just as we do.
 * **No Typos:** We must all be vigilant against typos or formatting errors (like non-breaking spaces ` ` or stray characters) that break code.  
---  
If we follow these rules, we'll avoid the circular debugging we've had in the past and build a clean, stable product.  
Let's get to work.