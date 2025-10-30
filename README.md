# tournament
An implementation for creating online tournaments, based on a website hosted on a server, managing the data via an accountsystem centrally saving the data in a mongo DB


Phase 1 — Core Setup & Authentication ✅

Environment
- Next.js 16 (App Router, Turbopack)
- MongoDB in Docker (container: local-mongo, port 27017)
- Auth.js v5 (NextAuth v5) with MongoDBAdapter, JWT sessions
- Nodemailer via Ethereal for test email

Features
- Registration with server-side password hashing (bcrypt)
- Email verification (custom EmailToken model, 24h expiry)
- Login with Credentials (blocked until verified)
- Forgot password (1h reset token) + Reset password
- Route protection via proxy.ts + authorized callback
- Basic dashboard route for post-login landing

Notes / Deviations from spec
- NextAuth v5 + Credentials requires `session.strategy = "jwt"`. We kept Mongo for users/tokens, only sessions are JWT (not DB). If we *must* do DB sessions for credentials, that’s NextAuth v4 or OAuth providers in v5.

How to run
- `docker ps` → ensure `local-mongo` up (or `docker run -d -p 27017:27017 --name local-mongo mongo`)
- `.env.local` with MONGODB_URI, AUTH_SECRET, AUTH_URL, SMTP_* values
- `npm run dev` → open http://localhost:3000
- Register at /register → click verification link → login → /dashboard

Next
- Phase 2: static UI + dashboard layout and nav
- Add Tournament/Participant/Round/Match models and CRUD routes
- (Deployment) Set up production MongoDB in Docker on Debian (port 27018) and Nginx/systemd
