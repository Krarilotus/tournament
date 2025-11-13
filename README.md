# Tournament Manager

An implementation for creating online, team-based tournaments. This application is built on a modern Next.js 16 / React 19 stack and is designed for flexibility, rapid management, and long-term "Zero Tech Debt."

---

## Key Features

* **Full Authentication:** Secure user registration, login, email verification, and password reset (via Auth.js v5).
* **Tournament CRUD:** Create, read, update, and delete tournaments, including settings for custom stats and tie-breakers.
* **Advanced Participant Management:**
    * Full participant CRUD.
    * **Batch-Add:** Add multiple participants at once.
    * **Multi-Paste:** Paste data directly from spreadsheets into the "Add Participants" dialog.
* **Team Management:**
    * Persistent team entities with custom names.
    * Automatic team generation (random, balanced) or manual creation.
    * Team-based standings.
* **Modular Matchmaking Engine:**
    * **Swiss (1v1):** FIDE Dutch pairing logic with rematch avoidance.
    * **N-Player FFA (Free-for-All):** Simple chunk or Swiss-style grouping.
    * **Team (2v2):** Pairs persistent teams.
    * **Custom Pairings:** Full drag-and-drop UI for manually seeding a round.
* **Modular Scoring Engine:**
    * Calculates points, Buchholz, and custom stats.
    * Respects per-round overrides for scoring.
* **Dynamic Control Panel:**
    * View all rounds and matches.
    * **Auto-Saving:** Match results are saved inline, instantly.
    * **Surgical Swapping:** Swap participants between matches, the bench, or bye-matches without a full re-seed.
* **Modern UI/UX:**
    * Built with **shadcn/ui** (Slate theme).
    * Default **dark mode** with a theme toggle.
    * Fully responsive mobile, tablet, and desktop layouts.

---

## Technology Stack

* **Framework:** Next.js 16 (App Router) / React 19
* **Database:** MongoDB (with Mongoose)
* **Orchestration:** Docker (for local `local-mongo` database)
* **Authentication:** Auth.js (NextAuth v5)
* **UI:** Tailwind CSS & **shadcn/ui**
* **State Management:** `useSWR` (client-side fetching) & `React.useState`
* **Validation:** Zod
* **Theming:** `next-themes`

---

## Getting Started

Follow these steps to get your local development environment up and running.

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/tournament.git
cd tournament

# Install dependencies
npm install
```

### 2. Set Up Environment Variables

Create a local environment file.

```bash
cp .env.example .env.local
```

Now, open `.env.local` and fill in the required values:

* `MONGODB_URI` (e.g., `mongodb://localhost:27017/tournament_dev`)
* `AUTH_SECRET` (Generate a strong secret, e.g., `openssl rand -hex 32`)
* `AUTH_URL` (e.g., `http://localhost:3000`)
* `SMTP_` values (for Ethereal or another email service)

### 3. Run the MongoDB Database

You must have the `local-mongo` Docker container running.

**➡️ Option A: Start the existing container**

If the container already exists from a previous run (check with `docker ps -a`), simply start it:

```bash
docker start local-mongo
```

**➡️ Option B: Run the container for the first time**

If this is your first time or you've removed the container, run this command to create and start it:

```bash
docker run -d -p 27017:27017 --name local-mongo mongo
```

### 4. Run the Application

Once the database is running, start the Next.js development server.

```bash
npm run dev
```

### 5. Access the App

Your application is now running.

* **Main Site:** Open [http://localhost:3000](http://localhost:3000)
* **Test Workflow:** Register at `/register`, click the verification link, and log in to access the `/dashboard`.

---

## 🧠 Core Philosophy & Architecture

This project's single most important goal is **"Zero Tech Debt."** We prioritize clean, maintainable, and scalable solutions over "quick fixes." New developers **must** understand these core architectural patterns.

### 1. The "Logic Engine" Design

API routes (in `app/api/`) are kept "thin." They are **Orchestrators**, not implementations.
* **API Route:** Validates user input (via Zod) and session, authenticates the user, and gathers data.
* **Logic Engine (`lib/`):** All core business logic (matchmaking, scoring, sorting) lives in pure, testable functions within the `/lib` directory (e.g., `lib/matchmaking/`, `lib/standings/`). The API route calls these functions to do the actual work.

### 2. Next.js 16 / React 19: Critical Architecture

Our stack is experimental and has specific patterns you must follow.

#### The "Promise Props" Problem
In Next.js 16 / React 19, dynamic `params` from the URL are no longer plain objects. **They are now `Promise`s.** Accessing them synchronously will cause bugs.

* **In Server Components (`page.tsx`, `layout.tsx`):**
    * You must `await` the prop or use `React.use()` to unwrap it.
    * **Old (Next 14):** `export default function Page({ params }) { ... }`
    * **New (Next 16):** `export default function Page(props) { const params = React.use(props.params); ... }`

* **In API Handlers (`route.ts`):**
    * The `context` object (which holds `params`) must also be awaited.
    * **Old (Next 14):** `function DELETE(req, { params }) { ... }`
    * **New (Next 16):** `async function DELETE(req, context) { const params = await context.params; ... }`

#### The Control Panel Pattern (RSC vs. Client)
A parent Server Component and a child Server Component **cannot** both unwrap the *same* `props.params` promise. This causes a `Expected a suspended thenable` crash.

We use a "Zero Tech Debt" pattern for all control panel pages:

1.  **`layout.tsx` (Server Component):** Is the *only* server component that unwraps the `params` promise (`await params`). It fetches server-side data (like the tournament name) and renders the tabbed navigation.
2.  **`page.tsx` (Client Component):** The actual page (`/participants`, `/rounds`) is a **Client Component (`"use client"`)**. It receives the `params` as a *resolved, plain object* from the layout and uses `useSWR` to fetch its own data from the API.

This pattern eliminates the promise conflict and provides a stable, scalable architecture.

### 3. Auth.js v5 JWT Configuration

The default Auth.js `session.user` object **does not** include the user's database `id`. This breaks all "owner" queries.

**Fix:** We explicitly add the `id` to the token in `lib/auth.ts` using the `jwt` and `session` callbacks. This ensures `session.user.id` is always available.

### 4. Data Integrity (BSON vs. JSON)

Data from MongoDB (Server Components, API routes) is BSON and includes types like `ObjectId`. Data passed to Client Components must be serializable JSON.

**Pattern:** We create explicit `Serialized` types (e.g., `SerializedParticipant`) where properties like `_id` are typed as `string`. We *always* manually serialize data (`_id: p._id.toString()`) before passing it from the server to the client to ensure 100% type safety.