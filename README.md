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
* **Email:** Resend
* **UI:** Tailwind CSS & **shadcn/ui**
* **State Management:** `useSWR` (client-side fetching) & `React.useState`
* **Validation:** Zod
* **Theming:** `next-themes`

---

## Getting Started (Local Development)

Follow these steps to get your local development environment up and running.

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone [https://github.com/your-username/tournament.git](https://github.com/your-username/tournament.git)
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
* `RESEND_API_KEY` (Your API-Schlüssel von Resend)

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

## Production Deployment (Self-Hosting)

This project is configured for a "Zero Tech Debt" deployment on a Linux server (Ubuntu) using **`pm2`** for process management, **`nginx`** as a reverse proxy, and **`certbot`** for SSL.

This guide assumes you are deploying as a dedicated non-root user (e.g., `tournament`) and the app is located in `/home/tournament/tournament/tournament-manager`.

---

### 1. Environment Configuration (Critical)

Our deployment uses a "Zero Tech Debt" two-file environment system to separate **runtime** variables from **build-time** variables.

#### A. Runtime: `ecosystem.config.js` (For PM2)

This is the **primary source of truth** for your *running* application. `pm2` injects these variables at runtime. Create this file in your project's root (`/home/tournament/tournament/tournament-manager/ecosystem.config.js`).

**CRITICAL:** Your MongoDB password **must be URL-encoded** if it contains special characters (`@`, `$`, `!`, etc.).
* **To Encode:** `node -e 'console.log(encodeURIComponent("YOUR_PASSWORD_HERE"))'`
* Use the **output** of this command in the `DATABASE_URL` string.

```javascript:ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'tournament-app',
      script: 'npm',
      args: 'start',
      // Correct CWD path
      cwd: '/home/tournament/tournament/tournament-manager',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',

        // App port (must be unused)
        PORT: 3001,

        // --- Database (Use URL-encoded password!) ---
        // Note: authSource MUST match the db where the user was created.
        DATABASE_URL: 'mongodb://tournament_user:YOUR_ENCODED_PASSWORD@localhost:27017/tournament_prod?authSource=tournament_prod',

        // --- Auth & URL Variables (MUST be HTTPS) ---
        // All three are required to prevent redirect/link errors
        NEXTAUTH_URL: 'https://tournament.unofficialcrusaderpatch.com',
        AUTH_URL: 'https://tournament.unofficialcrusaderpatch.com',
        NEXT_PUBLIC_SITE_URL: 'https://tournament.unofficialcrusaderpatch.com',

        // --- Secrets ---
        AUTH_SECRET: 'YOUR_AUTH_SECRET_HERE',
        RESEND_API_KEY: 'YOUR_RESEND_KEY_HERE',
      },
    },
  ],
};
```

#### B. Build-Time: `.env.production` (For `npm run build`)

This file is used **only** by the `npm run build` command. It is required so Next.js can connect to the database and Resend client *during* the build process.

Create `.env.production` in the same directory. Its content must match the `ecosystem.config.js` file.

```ini:.env.production
# This file is for 'npm run build' ONLY.

# Use the same encoded password and correct authSource
DATABASE_URL="mongodb://tournament_user:YOUR_ENCODED_PASSWORD@localhost:27017/tournament_prod?authSource=tournament_prod"

# All other secrets the build process needs
AUTH_SECRET="YOUR_AUTH_SECRET_HERE"
RESEND_API_KEY="YOUR_RESEND_KEY_HERE"
AUTH_URL="https://tournament.unofficialcrusaderpatch.com"
NEXT_PUBLIC_SITE_URL="https://tournament.unofficialcrusaderpatch.com"
NEXTAUTH_URL="https://tournament.unofficialcrusaderpatch.com"
```

---

### 2. Application Deployment & Maintenance (PM2)

We use `pm2` to run the app as a stable, auto-restarting service.

#### First-Time Setup
```bash
# Install dependencies
npm install

# Install pm2 globally
sudo npm install -g pm2

# Build the app
npm run build

# Start the app for the first time
pm2 start ecosystem.config.js

# Tell pm2 to auto-start on server reboots
pm2 startup
# (Run the command that pm2 startup gives you)

# Save the process list
pm2 save
```

#### Server Maintenance Commands
These are the commands you will use for updates and debugging.

```bash
# Check status of all apps
pm2 list

# Check logs for debugging (CRITICAL)
pm2 logs tournament-app

# Apply env changes (from ecosystem.config.js) or code updates (after 'git pull')
# 'reload' is a zero-downtime restart.
pm2 reload tournament-app

# Stop the app
pm2 stop tournament-app

# Fully restart the app (if 'reload' fails)
pm2 restart tournament-app
```

---

### 3. Web Server & SSL (Nginx & Certbot)

`nginx` acts as the reverse proxy, forwarding public traffic from port 443 (HTTPS) to our app on port 3001.

#### Nginx Configuration
This is the required configuration file, located at `/etc/nginx/sites-available/tournament.conf`.

```nginx:/etc/nginx/sites-available/tournament.conf
server {
    # CRITICAL: Listen on port 80 for Certbot verification
    listen 80;
    server_name tournament.unofficialcrusaderpatch.com;

    # This location block is required by Certbot to verify domain ownership
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # This single location block handles all app traffic by proxying to the PM2 port
    location / {
        # CRITICAL: Proxy to our running application on port 3001
        proxy_pass http://localhost:3001;

        # Standard proxy headers required for NextAuth (AUTH_URL fix) and general use
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Necessary headers for websocket/streaming compatibility
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_http_version 1.1;
        proxy_cache_bypass $http_upgrade;
        proxy_cache_revalidate on;
        proxy_cache_min_uses 1;
        proxy_cache off;
    }
}
```

#### SSL & Server Maintenance Commands
Run these commands as `root` or with `sudo`.

```bash
# Create the Nginx config file
sudo nano /etc/nginx/sites-available/tournament.conf

# Enable the config by creating a symbolic link
sudo ln -s /etc/nginx/sites-available/tournament.conf /etc/nginx/sites-enabled/

# Test Nginx syntax (ALWAYS do this before reloading)
sudo nginx -t

# Apply Nginx config changes
sudo systemctl reload nginx

# Install Certbot (first time)
sudo apt install certbot python3-certbot-nginx -y

# Run Certbot to get SSL (first time)
# This will auto-modify your .conf file to add HTTPS and redirects.
sudo certbot --nginx -d tournament.unofficialcrusaderpatch.com

# Test your SSL certificate renewal
sudo certbot renew --dry-run
```

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