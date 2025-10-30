You are an expert Software Designer, Developer and System Engineer. You abide industry standards but are also able to adapt flexibly to get prototypes fully fledged out off the ground quickly and make them feel already finished and presentable!

Please help me to implement the following project, starting with Phase 1, and before that define a Folder Structure and waht needs to live where on the server or locally for development, during the process so we can also verify everythign step by step after each phase that it works as intended or add extra fucntionalityfirst if needed before proceeding to the next phase.

Here is the project plan:

# PROJECT SPECIFICATION: The Ultimate Flexible Tournament Manager

## 1. High-Level Project Goal
You will create a **self-hosted web application** for managing and hosting highly flexible tournaments. The application's primary and most crucial feature is to give tournament organizers (users) **complete, granular control to modify any aspect of the tournament at any time**. This includes adding/removing participants mid-tournament, manually swapping players in a match, and even changing the matchmaking system between rounds.

The application will be deployed on a Debian server at `tournament.unofficialcrusaderpatch.com`.

## 2. Core Technology Stack & Rationale
This stack is chosen for its suitability for a self-hosted, data-driven React application.

* **Framework: Next.js (using the App Router)**
    * **Context:** This is the standard for modern React applications. The App Router provides a robust, integrated system for the frontend (React Server Components), backend (API Routes via "Route Handlers"), and routing (file-based). This simplifies the project structure immensely.
* **Database: MongoDB (with Mongoose)**
    * **Context:** You explicitly requested MongoDB. This is an excellent choice. Its schema-less, document-based nature is *perfect* for the required flexibility. We will use Mongoose as an Object Document Mapper (ODM) to define flexible schemas, manage data relationships, and simplify database interactions.
* **Authentication: Auth.js (v5 / `next-auth`)**
    * **Context:** This is the de-facto authentication solution for Next.js. It's "easy to set up," as you requested, and supports self-hosting. We will use its `Email` provider (for password-based accounts) and the `@auth/mongoose-adapter` to store all user and session data directly in your MongoDB.
* **Styling: Tailwind CSS**
    * **Context:** A modern, utility-first CSS framework that will allow us to build a clean, professional, and responsive UI very quickly without writing custom CSS files.
* **Deployment Stack:**
    * **Server:** Debian
    * **Web Server / Reverse Proxy:** Nginx
    * **Process Manager:** `systemd`
    * **SSL:** Let's Encrypt (Certbot)

## 3. Module 1: Database Schema & Data Modeling
This is the most critical part of the application. The entire schema must be designed for flexibility.

### `users` Collection
* **Purpose:** Stores user account and authentication data. This will be largely managed by `Auth.js`.
* **Schema (Mongoose):**
    ```javascript
    const userSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true, required: true },
      password: { type: String, required: true }, // Will be hashed
      emailVerified: { type: Date, default: null },
      // Auth.js will add fields for sessions, accounts, verification tokens, etc.
    });
    ```

### `tournaments` Collection
* **Purpose:** The root document for a single tournament. It holds all settings and references to its child data.
* **Schema (Mongoose):**
    ```javascript
    const tournamentSchema = new mongoose.Schema({
      ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      description: { type: String },
      // The unique, public-facing URL part
      urlSlug: { type: String, unique: true, sparse: true }, 
      status: { 
        type: String, 
        enum: ['draft', 'published', 'running', 'completed', 'archived'], 
        default: 'draft' 
      },
      // References to all participants
      participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Participant' }],
      // References to all rounds
      rounds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Round' }],
      // The CORE of flexibility is this settings object
      settings: {
        // e.g., { win: 3, draw: 1, loss: 0 }
        pointSystem: { type: Map, of: Number }, 
        // e.g., ["Kills", "Flags Captured", "Style Points"]
        customStats: [String], 
        // An ORDERED list of tie-breakers
        // e.g., ["points", "buchholz", "custom_Kills", "directComparison"]
        tieBreakers: [String], 
      }
    }, { timestamps: true });
    ```

### `participants` Collection
* **Purpose:** Stores data for a single participant within a single tournament.
* **Schema (Mongoose):**
    ```javascript
    const participantSchema = new mongoose.Schema({
      tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
      name: { type: String, required: true },
      customId: { type: String }, // Optional, e.g., a game handle
      isActive: { type: Boolean, default: true }, // CRITICAL: Use this to "remove" players temporarily
      // This object will be dynamically populated and re-calculated
      scores: {
        points: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
        buchholz: { type: Number, default: 0 },
        buchholz2: { type: Number, default: 0 },
        // ... any `customStats` will be added here dynamically
        // e.g., custom_Kills: 102
      },
      // A history of all matches played for easy tie-breaker calculation
      matchHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }] 
    }, { minimize: false }); // `minimize: false` ensures `scores` object is saved even if empty
    ```

### `rounds` Collection
* **Purpose:** A container for a set of matches. This allows changing systems round-by-round.
* **Schema (Mongoose):**
    ```javascript
    const roundSchema = new mongoose.Schema({
      tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
      roundNumber: { type: Number, required: true },
      // e.g., "swiss-1v1", "swiss-4-ffa", "round-robin"
      system: { type: String, required: true }, 
      status: { type: String, enum: ['pending', 'running', 'completed'], default: 'pending' },
      matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }]
    });
    ```

### `matches` Collection
* **Purpose:** Stores the result of a single match between two or more participants.
* **Schema (Mongoose):**
    ```javascript
    const matchSchema = new mongoose.Schema({
      tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
      roundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Round', required: true },
      status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
      // This array is the core of match results
      participants: [{
        participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' },
        // The result for this participant
        // e.g., 'win', 'loss', 'draw', or 1st, 2nd (for FFA)
        result: { type: String }, 
        // The points awarded just for this match
        pointsAwarded: { type: Number, default: 0 }, 
        // Any custom stats recorded for this match
        // e.g., { "Kills": 15, "Flags Captured": 1 }
        customStats: { type: Map, of: Number }
      }],
      // For 1v1, this is an easy lookup
      winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' },
      isDraw: { type: Boolean, default: false }
    });
    ```

## 4. Module 2: Authentication & User Accounts (Module 1 in user req)
* **Technology:** `Auth.js` (v5) with `Email` (Credentials) provider and `@auth/mongoose-adapter`.
* **Flows:**
    1.  **Registration:** A public page (`/register`) that collects `name`, `email`, and `password`. The password MUST be hashed (e.g., with `bcrypt`) before saving to the `users` collection.
    2.  **Email Verification (CRITICAL):**
        * Upon registration, a `VerificationToken` (part of Auth.js adapter) is generated and an email is sent to the user with a unique link.
        * **Context:** This is vital for password resets and to prevent spam accounts. Use a service like `Nodemailer` for sending emails (as this is self-hosted, you'll need to configure it with an SMTP provider like SendGrid, Mailgun, or even a Gmail account).
        * A user's `emailVerified` field in the `users` collection is `null` until they click this link.
        * **Protected Logic:** The application MUST prevent users from creating/managing tournaments (i.e., accessing the dashboard) until `emailVerified` is set.
    3.  **Login:** A public page (`/login`) that uses the `Auth.js` `signIn` method with the "credentials" provider.
    4.  **Password Reset:**
        * A public page (`/forgot-password`) where a user enters their email.
        * If the email exists, generate a *new* (time-limited) `VerificationToken` and email them a link to a reset page (`/reset-password?token=...`).
        * This page validates the token, then allows the user to enter and save a new (hashed) password.
* **Protected Routes:** All routes *except* `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/impressum`, and the public tournament page `/[slug]` MUST be protected. Authenticated users should be directed to their `/dashboard`.

## 5. Module 3: Static Pages & Legal (Module 2 in user req)
* Create simple, static pages using Next.js file-based routing.
* `/impressum`: A page with your legal impressum/contact details.
* `/privacy`: A standard privacy policy page.
* These must be publicly accessible and linked in the site footer.

## 6. Module 4: Core App - Tournament Creation & Management (Modules 3, 6)
This is the main dashboard UI for authenticated, verified users.

### Tournament Creation
* Create a multi-step form/modal (`/dashboard/create`):
    1.  **Info:** `name`, `description`.
    2.  **Scoring:** Define points for Win/Loss/Draw (e.g., `win: 3`, `draw: 1`, `loss: 0`).
    3.  **Stats & Tie-Breakers (CRITICAL UI):**
        * An input field to add *custom stat fields* (e.g., "Kills", "Deaths", "Style Points"). Added fields appear as tags.
        * A **drag-and-drop, orderable list** for tie-breakers. This list MUST automatically contain "Points" (locked to the top) and any *custom stats* the user just defined (e.g., `custom_Kills`).
        * The user must also be able to add built-in tie-breakers to this list, like "Buchholz" and "Buchholz-2".
        * **Example Final List:** 1. `points`, 2. `buchholz`, 3. `custom_Kills`, 4. `directComparison`. This array is saved to `tournament.settings.tieBreakers`.

### Tournament Control Panel (`/dashboard/[tournamentId]`)
This is the main page for managing a single tournament, with several tabs.

* **Participants Tab:**
    * List all participants from the `participants` collection for this tournament.
    * Show their current `scores` (points, tie-breakers, etc.).
    * **Flexibility Feature 1:** "Add New Participant" button. This works *at any time*. The new participant is added to the DB with `isActive: true` and default scores.
    * **Flexibility Feature 2:** A toggle on each participant to set `isActive: true/false`. Setting to `false` means they are "dropped" and will be **skipped** in all future matchmaking, but their record is preserved.

* **Rounds & Matches Tab (The "Flexibility Engine"):**
    * Display all `rounds` and their `matches`.
    * **"Generate Next Round" Button:**
        * **Flexibility Feature 3:** This button must *first ask* the user what matchmaking system to use for this *specific* round (e.g., "Swiss 1v1", "Swiss 4-person FFA"). It should default to the previous round's system.
        * It then runs the chosen matchmaking logic (see Module 5) on all `participants` where `isActive: true`.
    * **Match Result Entry:**
        * For each `pending` match, provide a form.
        * The form MUST show inputs for the score (e.g., "2-1") AND inputs for all `customStats` defined in `tournament.settings` (e.g., "Player 1 Kills: [__]", "Player 2 Kills: [__]").
        * When submitted, this form creates/updates the `match` document and **must trigger the Re-Calculation Engine (see Module 5)**.
    * **Flexibility Feature 4 (Edit Past Results):**
        * The user must be able to click on *any* completed match from *any* previous round and **edit its result and custom stats**.
        * Saving this change **MUST also trigger the Re-Calculation Engine**.
    * **Flexibility Feature 5 (Swap Participants):**
        * On *pending* (un-played) matches, provide a "Manual Edit" button.
        * This allows the organizer to select a participant in that match and swap them with *any other participant* in a *different pending match* in the *same round*. This is for manual corrections.

## 7. Module 5: Backend Logic - Matchmaking & Scoring (Modules 3, 6, 7)
This is the "brain" of the application, living in your Next.js API Route Handlers.

### The Re-Calculation Engine (CRITICAL)
* **Purpose:** To ensure data integrity after any change.
* **Trigger:** This function MUST be called *any time* a `match` document is created, updated, or deleted.
* **Algorithm:**
    1.  **Fetch Data:** Get the `tournament` and *all* its related `participants` and `matches`.
    2.  **Reset Scores:** Loop through *all* `participants` and reset their `scores` object to 0 (e.g., `points: 0`, `buchholz: 0`, `custom_Kills: 0`). Also clear their `matchHistory`.
    3.  **Tally Match Results:** Loop through *all* `matches` (sorted by `roundNumber`).
        * For each participant in the match, update their `scores` (add `pointsAwarded`, `wins`, `losses`, `draws`, and sum `customStats` like `custom_Kills`).
        * Add the `matchId` to each participant's `matchHistory`.
    4.  **Calculate Tie-Breakers (Pass 2):** After all matches are tallied, loop through all `participants` *again*.
        * Now you can calculate complex tie-breakers.
        * **Buchholz:** For the current participant, iterate their `matchHistory`. Find all their opponents. Sum those opponents' *total* `scores.points`. Save this as `participant.scores.buchholz`.
        * **Buchholz-2 (or Cut 1):** Same as Buchholz, but find the list of all opponent scores, sort it, and *discard the lowest one* before summing.
    5.  **Save:** Update all `participant` documents in the database with their new `scores`.
    * **Note:** `directComparison` is not a calculated score. It's a sorting function applied *at display time* if two players are tied on all other metrics.

### Swiss (1v1) Matchmaking Logic
* **Context:** This is a non-eliminating system where players are paired against opponents with the same (or similar) score.
* **Algorithm (for "Generate Next Round"):**
    1.  **Fetch Participants:** Get all `participants` for the tournament where `isActive: true`.
    2.  **Handle "Bye" (Odd Player Count):** If there's an odd number of players, find the *lowest-ranked* player who has not yet received a "bye". Grant them a bye (an automatic win), and remove them from the list for this round's pairing.
    3.  **Sort Participants:** Sort the remaining list *descending* based on the `tournament.settings.tieBreakers` array. This is a multi-level sort (e.g., by `points` first, then `buchholz`, etc.).
    4.  **Create Pairings (The Priority Logic):**
        * Create an empty `pairings` array.
        * Take the top-ranked player (Player A) from the list.
        * Iterate *down* the remaining list (Player B, Player C...) to find a valid opponent for A.
        * **Constraint 1 (No Rematches):** Check if A has already played B (by checking `participant.matchHistory`). If yes, skip B and check Player C.
        * **Pairing:** As soon as a valid opponent (Player C) is found, create the pairing `(A, C)`.
        * **Remove:** Remove *both* A and C from the sorted list.
        * **Repeat:** Go back to step 1 (take the *new* top-ranked player) and repeat until the list is empty.
        * **"Floating":** This algorithm naturally handles "floating." If the only available opponents for Player A (8 points) are in a lower score bracket (e.g., 6 points) because all 8-point players are rematches, it will "float" Player A down and pair them with the highest-ranked 6-point player they haven't played.
    5.  **Create Documents:** Create the new `round` document and all its child `match` documents (with `status: 'pending'`) from the `pairings` array.

## 8. Module 6: Import / Export (Module 4 in user req)
* **Export:**
    * Create a protected API route: `GET /api/tournaments/[id]/export`.
    * This route fetches the `tournament` document and *all* its child `participants`, `rounds`, and `matches` documents.
    * It bundles them into a single JSON object.
    * **Structure:**
        ```json
        {
          "tournament": { ...tournament_data... },
          "participants": [ { ...p1_data... }, { ...p2_data... } ],
          "rounds": [ { ...r1_data... }, { ...r2_data... } ],
          "matches": [ { ...m1_data... }, { ...m2_data... } ]
        }
        ```
    * It sends this JSON file to the user with a `Content-Disposition: attachment` header to trigger a download.
* **Import:**
    * Create a UI on the dashboard to upload a JSON file.
    * This UI `POST`s the file to `POST /api/tournaments/import`.
    * The API validates the JSON structure.
    * It then creates a *new* `tournament` (owned by the *current* user) and re-creates all the `participants`, `rounds`, and `matches` from the file, linking them to the new tournament ID. This effectively "copies" the tournament to their account.

## 9. Module 7: Public Tournament Pages (Module 5 in user req)
* **Publishing Logic:**
    * In the control panel, provide a "Publish to Share" button.
    * When clicked, this API call:
        1.  Sets `tournament.status = 'published'`.
        2.  Generates the `tournament.urlSlug`.
        3.  **Slug Uniqueness:** The `urlSlug` must be unique. The logic should be:
            * Base slug: `my-tournament-name` (slugified).
            * Check if it exists. If yes, try `my-tournament-name-1`.
            * If that exists, try `my-tournament-name-2`, and so on, until a unique slug is found.
* **Public Page:**
    * Create a public, read-only dynamic page: `/app/[slug]/page.tsx`.
    * This page fetches the tournament data where `urlSlug` matches the `slug` param.
    * It should display:
        * Tournament Name & Description.
        * A "Standings" tab (sorted by the defined tie-breakers).
        * A "Rounds" tab to view all match results.
    * **Live Updates:** This page should fetch data client-side (e.g., using `SWR` or `react-query` with a short refresh interval) to show updated results in near-real-time as the organizer enters them.

## 10. Module 8: Deployment & Self-Hosting (on Debian)
You must provide example configuration files for a standard Debian server deployment.

### Nginx Configuration
* Create a file at `/etc/nginx/sites-available/tournament.unofficialcrusaderpatch.com`
* **Context:** This file tells Nginx to listen for your domain, handle SSL, and forward all traffic to your Next.js app (which will run on `localhost:3000`).

```nginx
server {
    # Listen on port 80 for HTTP and redirect to HTTPS
    listen 80;
    server_name tournament.unofficialcrusaderpatch.com;
    
    # Redirect all HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    # Listen on port 443 for HTTPS
    listen 443 ssl;
    server_name tournament.unofficialcrusaderpatch.com;

    # SSL Certificates (Managed by Let's Encrypt / Certbot)
    ssl_certificate /etc/letsencrypt/live/[tournament.unofficialcrusaderpatch.com/fullchain.pem](https://tournament.unofficialcrusaderpatch.com/fullchain.pem);
    ssl_certificate_key /etc/letsencrypt/live/[tournament.unofficialcrusaderpatch.com/privkey.pem](https://tournament.unofficialcrusaderpatch.com/privkey.pem);
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        # Forward requests to the Next.js app running on port 3000
        proxy_pass http://localhost:3000;
        
        # Set headers to pass correct info to Next.js
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
### `systemd` Service File
* Create a file at `/etc/systemd/system/tournament.service`
* **Context:** This tells the Debian OS to run your app as a service, so it starts on boot and restarts automatically if it crashes.

```ini
[Unit]
Description=Flexible Tournament Manager
After=network.target

[Service]
User=your_debian_user # The user who owns the app files
Group=your_debian_user
WorkingDirectory=/var/www/tournament-app # The directory where you cloned your app
Environment=NODE_ENV=production
Environment=PORT=3000
# ... add all other .env variables here (DB_URL, AUTH_SECRET, etc.)
ExecStart=/usr/bin/npm run start # Assumes Node/NPM are installed

Restart=always
RestartSec=10
KillSignal=SIGINT
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=tournament-app

[Install]
WantedBy=multi-user.target
```
## 11. Phased Development Plan (How to Build It)
Follow this order to build the application logically.

1.  **Phase 1: Core Setup & Auth:** Set up Next.js, Mongoose, and `Auth.js`. Implement the full Register/Login/Verify/Reset flows. This is the foundation.
2.  **Phase 2: Static UI & Dashboard:** Create the static pages (`/impressum`) and the protected `/dashboard` layout.
3.  **Phase 3: Tournament CRUD:** Build the "Create Tournament" form and the API to Create, Read, Update, Delete tournaments for the logged-in user.
4.  **Phase 4: Tournament Control Panel (Participants):** Build the UI for adding and deactivating participants.
5.  **Phase 5: Matchmaking (Swiss 1v1) & Result Entry:** Implement the *first* matchmaking logic (Swiss 1v1). Build the UI to generate Round 1 and enter results (including custom stats).
6.  **Phase 6: The Re-Calculation Engine:** Build the core backend logic to re-calculate all scores. This is the most important step.
7.  **Phase 7: Tie-Breakers & Standings:** Implement the Buchholz logic within the Re-Calc engine. Build the "Standings" view, sorted by the `tieBreakers` array.
8.  **Phase 8: The "Flexibility" Engine:** Implement the *hard* features: Edit Past Results (and trigger re-calc), Add/Drop Participants mid-tournament, and Manually Swap players in pending matches.
9.  **Phase 9: Import/Export:** Build the JSON import/export API and UI.
10. **Phase 10: Public Pages:** Implement the `urlSlug` generation and the public, read-only `/[slug]` page.
11. **Phase 11: Deployment:** Deploy to your server using the Nginx and `systemd` configs.




Please go ahead and also guide me on things to do on my Debian Server. I already have one MongoDB running on it, but i am no expert with it and i would rather have a second instance setup to not interfere with the other one! I ll use putty for communication with the server.


Ok let's begin with Phase 1!


=========================== PHASE 1: CORE SETUP & AUTH ===========================
Let's get this prototype off the ground. We'll start by defining the project structure and addressing your server setup, then move straight into implementing Phase 1.

🏗️ Project Environment Setup
Before we write a single line of code, let's define our blueprint—what lives where, both locally for development and on your Debian server for production.

1. Local Development Environment (Your PC)
Code: The entire Next.js project will live in a folder on your machine (e.g., ~/projects/tournament-manager).

Database: You should run a local instance of MongoDB for development. The easiest way is using Docker:

Bash

docker run -d -p 27017:27017 --name local-mongo mongo
Environment Variables: You'll have a .env.local file in your project root. This file is ignored by git and holds all your local secrets:

Ini, TOML

# .env.local
MONGODB_URI="mongodb://localhost:27017/tournament_dev"

# Auth.js secret (generate one: https://generate-secret.vercel.app/)
AUTH_SECRET="your-super-secret-auth-secret"
AUTH_URL="http://localhost:3000"

# Email (for Nodemailer) - e.g., using Ethereal.email for testing
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT=587
SMTP_USER="your-ethereal-user"
SMTP_PASS="your-ethereal-password"
2. Server (Production) Environment (Your Debian Server)
Code: The project will be cloned into /var/www/tournament-app (as defined in your systemd config).

Database: We'll address this in the next section.

Web Server: Nginx will be installed and configured via /etc/nginx/sites-available/.

Process Manager: systemd will manage the app via /etc/systemd/system/tournament.service.

Environment Variables: These will not be in a file. They will be set directly in the systemd service file (as you specified) for security and persistence.

📁 Core Project Folder Structure (Next.js App Router)
Here is the clean, scalable folder structure we will build within your tournament-manager directory.

tournament-manager/
├── /app/
│   ├── /api/                      # All backend API Route Handlers
│   │   ├── /auth/
│   │   │   ├── /register/route.ts   # User registration
│   │   │   ├── /forgot-password/route.ts
│   │   │   └── ... (verify-email, reset-password)
│   │   └── /tournaments/          # API routes for CRUD
│   │
│   ├── /(auth)/                   # (Group) for auth pages
│   │   ├── /login/page.tsx
│   │   ├── /register/page.tsx
│   │   ├── /forgot-password/page.tsx
│   │   └── /reset-password/page.tsx
│   │
│   ├── /(dashboard)/              # (Group) for all protected user pages
│   │   ├── /dashboard/
│   │   │   ├── /page.tsx            # Main dashboard (list tournaments)
│   │   │   ├── /[tournamentId]/     # Tournament control panel
│   │   │   │   └── page.tsx
│   │   │   └── /create/page.tsx
│   │   └── layout.tsx             # Protected layout (checks session)
│   │
│   ├── /(public)/                 # (Group) for static/legal pages
│   │   ├── /impressum/page.tsx
│   │   ├── /privacy/page.tsx
│   │   └── layout.tsx             # Simple public layout (with footer)
│   │
│   ├── /[slug]/                   # Public dynamic tournament page
│   │   └── page.tsx
│   │
│   ├── page.tsx                   # Homepage (/)
│   └── layout.tsx                 # Root layout (tailwind, providers)
│
├── /components/                   # Reusable React components
│   ├── /auth/                     # e.g., LoginForm.tsx, RegisterForm.tsx
│   ├── /ui/                       # e.g., Button.tsx, Input.tsx (from shadcn/ui or similar)
│   └── ...
│
├── /lib/
│   ├── db.ts                      # Mongoose connection utility (singleton)
│   ├── auth.ts                    # Auth.js main configuration (providers, adapter)
│   ├── auth.config.ts             # Auth.js config (for middleware)
│   ├── mailer.ts                  # Nodemailer utility
│   ├── models/                    # All Mongoose schemas
│   │   ├── User.ts
│   │   ├── Tournament.ts
│   │   ├── Participant.ts
│   │   ├── Round.ts
│   │   └── Match.ts
│   └── utils.ts                   # Helper functions (e.g., password hashing)
│
├── .env.local                     # Local development secrets (DO NOT COMMIT)
├── middleware.ts                  # Auth.js middleware for protecting routes
├── next.config.mjs                # Next.js config
└── tailwind.config.ts             # Tailwind CSS config
⚙️ Server Prerequisite: Isolated MongoDB Instance
You are absolutely right to want a separate instance. The cleanest, most modern, and isolated way to do this on your Debian server is with Docker. It avoids all conflicts with ports, data directories, and config files.

Log into your server via PuTTY (SSH) and run these commands:

Install Docker (if not already installed):

Bash

sudo apt-get update
sudo apt-get install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker
Pull the official MongoDB image:

Bash

sudo docker pull mongo
Run your new, isolated MongoDB instance:

Bash

sudo docker run -d \
  -p 27018:27017 \
  --name tournament-mongo \
  -v /srv/mongodb-tournament:/data/db \
  --restart always \
  mongo
What this command does:

-d: Runs the container in detached (background) mode.

-p 27018:27017: This is the key. It maps port 27018 on your Debian server to port 27017 inside the container. Your existing MongoDB is likely on 27017, so this avoids the conflict.

--name tournament-mongo: Gives it an easy-to-remember name.

-v /srv/mongodb-tournament:/data/db: Persists all database data to the /srv/mongodb-tournament directory on your server. This is critical so you don't lose data if you restart the container.

--restart always: Ensures the database starts automatically if the server reboots.

Your production MONGODB_URI (which you'll put in the systemd service file) will now be: MONGODB_URI="mongodb://127.0.0.1:27018/tournament_prod"

🚀 Phase 1: Core Setup & Authentication
Let's build the foundation. This phase is critical and involves setting up the project, database models, and the complete authentication flow.

Step 1. Initialize Next.js & Tailwind
On your local machine, run:

Bash

npx create-next-app@latest tournament-manager --typescript --tailwind --eslint --app
Select Yes for Use App Router?.

Select No for Customize default import alias?.

Step 2. Install Dependencies
cd into your new tournament-manager directory and install our core packages:

Bash

npm install mongoose next-auth@5.0.0-beta.19 @auth/mongoose-adapter bcryptjs nodemailer
npm install -D @types/bcryptjs @types/nodemailer
(Note: Using the next-auth beta v5 as specified).

Step 3. Define Database Models (/lib/models/)
Create the files in /lib/models/. We'll use the schemas you provided, adding bcrypt hashing to the User model.

/lib/models/User.ts (We add a pre('save') hook to automatically hash the password)

TypeScript

import mongoose, { Schema, Document, models, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name?: string;
  email: string;
  password?: string;
  emailVerified?: Date | null;
  // Auth.js adapter will add other fields
}

const userSchema = new Schema<IUser>({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String }, // Not required, as OAuth users (future) won't have one
  emailVerified: { type: Date, default: null },
  // Auth.js will add fields for sessions, accounts, etc.
}, { timestamps: true });

// Hash password before saving
userSchema.pre<IUser>('save', async function (next) {
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Helper method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Handle HMR (Hot Module Replacement) in development
const User: Model<IUser> = models.User || mongoose.model<IUser>('User', userSchema);
export default User;
/lib/models/Tournament.ts (and others) Create the other model files exactly as you specified. Here's Tournament.ts as an example. Do the same for Participant, Round, and Match.

TypeScript

import mongoose, { Schema, Document, models, Model } from 'mongoose';

const tournamentSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  urlSlug: { type: String, unique: true, sparse: true },
  status: {
    type: String,
    enum: ['draft', 'published', 'running', 'completed', 'archived'],
    default: 'draft'
  },
  participants: [{ type: Schema.Types.ObjectId, ref: 'Participant' }],
  rounds: [{ type: Schema.Types.ObjectId, ref: 'Round' }],
  settings: {
    pointSystem: { type: Map, of: Number },
    customStats: [String],
    tieBreakers: [String],
  }
}, { timestamps: true });

const Tournament = models.Tournament || mongoose.model('Tournament', tournamentSchema);
export default Tournament;
(Self-Correction: Your spec correctly uses mongoose.Schema but in a Next.js dev environment, we must check models.ModelName to prevent re-compiling the model on every hot reload).

Step 4. Implement Database Connection (/lib/db.ts)
This utility creates a cached, singleton connection.

TypeScript

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
Step 5. Configure Auth.js
This is the most complex part of Phase 1.

/lib/auth.config.ts (Minimal config for middleware)

TypeScript

import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [
    // We'll add providers in the main auth.ts,
    // but providers array must be defined here, even if empty.
  ],
  callbacks: {
    // This callback is used by the middleware
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isDashboard = nextUrl.pathname.startsWith('/dashboard');
      
      if (isDashboard) {
        if (isLoggedIn) {
          // CRITICAL: Check for email verification
          if (!auth.user.emailVerified) {
            // Allow access to a verification-pending page, but redirect from dashboard
            // For now, let's just redirect to login with an error
            // We'll build a proper "please verify" page later.
            return Response.redirect(new URL('/login?error=NotVerified', nextUrl));
          }
          return true; // User is logged in AND verified
        }
        return false; // Redirect unauthenticated users to login page
      }
      
      // Allow logged-in users on auth pages (like /login) to be redirected
      if (isLoggedIn && (
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/register')
      )) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      
      // Allow all other public routes
      return true;
    },
  },
} satisfies NextAuthConfig;
/lib/auth.ts (Main configuration)

TypeScript

import NextAuth from 'next-auth';
import { MongooseAdapter } from '@auth/mongoose-adapter';
import Credentials from 'next-auth/providers/credentials';
import dbConnect from '@/lib/db';
import User, { IUser } from '@/lib/models/User';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: MongooseAdapter(dbConnect().then(mongoose => mongoose.connection.client)),
  session: { strategy: 'database' }, // Use database sessions
  
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        await dbConnect();
        const user = await User.findOne({ email: credentials.email });

        if (!user) {
          throw new Error('No user found with this email.');
        }

        // CRITICAL: Check for password. User might exist from OAuth
        if (!user.password) {
          throw new Error('Please log in using your social provider.');
        }
        
        const isValid = await user.comparePassword(credentials.password as string);

        if (!isValid) {
          throw new Error('Invalid password.');
        }

        // CRITICAL: Check for email verification as per spec
        if (!user.emailVerified) {
          throw new Error('Please verify your email before logging in.');
        }

        return user;
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks, // Import the 'authorized' callback
    
    // Add user ID and verification status to the session
    async session({ session, user }) {
      if (session.user && user) {
        (session.user as any).id = user.id;
        session.user.emailVerified = (user as IUser).emailVerified || null;
      }
      return session;
    },
  },
});
/middleware.ts (At the root of the project)

TypeScript

import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

export default NextAuth(authConfig).auth;

// This matcher protects routes as per your spec
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - / (homepage)
     * - /impressum
     * - /privacy
     * - /[slug] (public tournament page) - We'll refine this regex later
     */
    '/((?!api|_next/static|_next/image|favicon.ico|impressum|privacy|$).*)',
    // A regex to match the public tournament slug, but NOT /dashboard, etc.
    // We will refine this later, for now, let's protect /dashboard explicitly
    '/dashboard/:path*',
  ],
};
Note: The matcher is tricky. The one in authConfig's authorized callback is more precise. Let's simplify the matcher in config and let the authorized callback do the heavy lifting.

A better /middleware.ts:

TypeScript

import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
 
export default NextAuth(authConfig).auth;
 
export const config = {
  // Match all routes except static assets and API routes
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
The logic inside authConfig.callbacks.authorized will now correctly handle all path-based logic (dashboard vs. public, etc.).

Step 6. Create the Registration Flow
This requires a client-side form and a backend API route.

/app/api/auth/register/route.ts

TypeScript

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
// We'll create the mailer and verification logic in Step 8
// For now, let's just create the user.

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return new NextResponse(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
    }

    await dbConnect();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return new NextResponse(JSON.stringify({ error: 'User already exists' }), { status: 409 });
    }

    const user = new User({
      name,
      email,
      password, // The 'pre-save' hook will hash this
    });

    await user.save();

    // TODO: Trigger email verification (Step 8)
    
    return new NextResponse(JSON.stringify({ message: 'User registered successfully. Please check your email to verify.' }), { status: 201 });

  } catch (error) {
    console.error(error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
/app/(auth)/register/page.tsx (A simple client component)

TypeScript

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Registration failed.');
    } else {
      setMessage(data.message);
      // Optionally redirect to login or a "check your email" page
      // router.push('/login');
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {message && <p style={{ color: 'green' }}>{message}</p>}
        <div>
          <label>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit">Register</button>
      </form>
    </div>
  );
}
Step 7. Create the Login Page (/app/(auth)/login/page.tsx)
This page uses the signIn function from next-auth.

TypeScript

"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle errors from middleware (e.g., NotVerified) or failed sign-in
  const callbackError = searchParams.get('error');
  
  // Display a more user-friendly error
  let displayError = error;
  if (!error && callbackError === 'NotVerified') {
    displayError = 'Please verify your email before logging in.';
  } else if (!error && callbackError === 'CredentialsSignin') {
    // This is the default error from Auth.js, we can be more specific
    // The "authorize" function's throw new Error() message is not passed here.
    displayError = 'Invalid email or password.';
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false, // We'll handle redirect manually
      });

      if (res?.error) {
        // Handle custom errors from the 'authorize' function
        // Note: In v5, custom errors are tricky. Let's rely on the callbackError.
        setError('Invalid email or password, or email not verified.');
      } else if (res?.ok) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        {displayError && <p style={{ color: 'red' }}>{displayError}</p>}
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit">Login</button>
      </form>
      {/* Link to forgot password page */}
    </div>
  );
}
(Note: We'll add the UI for the other auth pages (forgot/reset) in the next step, as they are part of the same flow).

Step 8. Implement Email Verification Logic
This requires a mailer, a way to generate tokens, and an API to verify them. Auth.js with the Mongoose adapter already created a verificationtokens collection for us. We can use it!

/lib/mailer.ts

TypeScript

import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: MailOptions) => {
  try {
    await transport.sendMail({
      from: `Tournament Manager <noreply@${process.env.SMTP_HOST?.split('.').slice(1).join('.')}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Could not send email:', error);
    throw new Error('Email sending failed.');
  }
};
Update /app/api/auth/register/route.ts We need to import the Mongoose adapter's VerificationToken model and our mailer.

TypeScript

// ... (imports)
import User from '@/lib/models/User';
import dbConnect from '@/lib/db';
import { sendEmail } from '@/lib/mailer';
import { models } from 'mongoose'; // To access the adapter's model
import { randomUUID } from 'crypto'; // To generate a token

export async function POST(request: Request) {
  // ... (try block, get user data, check if exists)

    const user = new User({ name, email, password });
    await user.save();
    
    // --- START VERIFICATION LOGIC ---
    await dbConnect();
    const VerificationTokenModel = models.VerificationToken;

    const token = randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await VerificationTokenModel.create({
      identifier: user.email,
      token: token, // We'll hash this in a real app, but let's keep it simple
      expires,
    });
    
    const verificationUrl = `${process.env.AUTH_URL}/verify-email?token=${token}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Verify your email for Tournament Manager',
      html: `<p>Please click this link to verify your email: <a href="${verificationUrl}">${verificationUrl}</a></p>`
    });
    // --- END VERIFICATION LOGIC ---

    return new NextResponse(JSON.stringify({ message: 'User registered. Please check email.' }), { status: 201 });
  // ... (catch block)
}
/app/verify-email/page.tsx (This will handle the verification) (Note: An API route GET handler is better for this, as it doesn't need to render UI immediately).

Create /app/api/auth/verify-email/route.ts

TypeScript

import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { models } from 'mongoose';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse(JSON.stringify({ error: 'Missing token' }), { status: 400 });
  }
  
  try {
    await dbConnect();
    const VerificationTokenModel = models.VerificationToken;
    
    const verificationToken = await VerificationTokenModel.findOne({ token: token });

    if (!verificationToken) {
      return new NextResponse(JSON.stringify({ error: 'Invalid token' }), { status: 400 });
    }

    if (new Date() > new Date(verificationToken.expires)) {
      return new NextResponse(JSON.stringify({ error: 'Token expired' }), { status: 400 });
    }

    const user = await User.findOne({ email: verificationToken.identifier });
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    user.emailVerified = new Date();
    await user.save();

    // Delete the token so it can't be reused
    await VerificationTokenModel.deleteOne({ _id: verificationToken._id });

    // Redirect to login with a success message
    return NextResponse.redirect(new URL('/login?verified=true', request.url));

  } catch (error) {
    console.error(error);
    return new NextResponse(JSON.stringify({ error: 'Verification failed' }), { status: 500 });
  }
}
Step 9. Implement Password Reset Flow
This is a 3-part flow, just like verification.

/app/(auth)/forgot-password/page.tsx (Client Form)

Simple form with one "Email" input.

POSTs to /api/auth/forgot-password.

/app/api/auth/forgot-password/route.ts (API Endpoint)

POST handler.

Finds user by email.

If user exists, creates a new VerificationToken (just like in registration).

Sends an email with a link: .../reset-password?token=...

/app/(auth)/reset-password/page.tsx (Client Form)

Reads the token from useSearchParams().

Shows a form with "New Password" and "Confirm Password".

POSTs to /api/auth/reset-password, sending the token and newPassword.

/app/api/auth/reset-password/route.ts (API Endpoint)

POST handler.

Validates the token (exists? not expired?).

Finds the user by the token's identifier (email).

Sets user.password = newPassword (the pre-save hook will hash it).

await user.save().

Deletes the token.

Returns success, redirecting the user to /login.

(I'll omit the full code for these as they are structurally identical to the registration/verification flow, just pointed at different fields/pages).

Step 10. Protect Routes
This was already handled in Step 5 with our /middleware.ts and auth.config.ts. The authorized callback is the core of this logic.

✅ Phase 1 Verification
Alright, Phase 1 is a big one, and it's now "complete." Before we move on, you should test the following flows locally:

Start the app: npm run dev.

Navigate to http://localhost:3000/register.

Test Registration: Can you create a new user?

Test Email: Check your test email inbox (e.g., Ethereal.email). Did you receive the verification email?

Test Verification Link: Does clicking the link redirect you to /login?verified=true?

Test Failed Login (Not Verified): Try to register another user, but do not click the verification link.

Try to log in as that new, unverified user. You should get the "Please verify your email" error.

Test Successful Login: Log in as the first, verified user. You should be redirected to /dashboard (it will be a 404 or an empty page for now, that's fine—as long as you get there).

Test Protected Route: Log out (you'll need to build a simple "Sign Out" button that calls signOut()) and try to access http://localhost:3000/dashboard directly. You should be redirected to /login.

Test Password Reset: Go to /forgot-password, enter your verified user's email, and complete the full password reset flow.

Once these steps are confirmed working, we have a solid, secure foundation for the rest of the application.

Would you like me to provide the full code for the Password Reset flow (Step 9) or are you ready to move on to Phase 2: Static UI & Dashboard Layout?

