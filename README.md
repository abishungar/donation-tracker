# Donation Tracker

A donation tracking system with role-based logins, built to run locally in VS Code
and deploy free-ish on Render straight from GitHub.

## What's included

**Data model**
- `Contacts` — first name, last name, phone, email, active status, group
- `Groups` — name, manager (a linked User account)
- `Donations` — amount, contact, group *at the time of the donation*, date, type
- `Users` — login accounts with a role: `admin`, `manager`, or `user`
- `Logs` — every create/update/delete/login is recorded (who, what, when)

**Roles**
- **Admin** — full access to everything: create groups, assign managers, manage
  contacts/donations across all groups, manage user accounts, view the activity log.
- **Manager** — logs in with their own email, manages contacts and donations only
  for the group they were assigned to, sees their group's total raised.
- **User** (donor) — logs in with their own email, sees only their own total raised
  and their own donation history. A user account can be linked to a Contact by the admin.

**Extras I added since you said to include options if useful**
- Group totals shown live everywhere (admin overview, manager dashboard, and a
  donor only sees their own group's total, not other groups').
- Full activity log (admin-only) — logins, and every create/edit/delete.
- Mobile-friendly responsive layout (collapsing nav menu, responsive grids) using Tailwind.
- Donation `type` field (Cash / Check / Online / In-Kind) — easy to extend.
- A donation records which group the contact was in *at the time*, so historical
  totals stay correct even if you move a contact to a different group later.

If you want any of these changed (e.g., multiple managers per group, CSV export,
email notifications, password reset), just ask — the structure supports adding them.

---

## 1. Run it locally in VS Code

**Requirements:** Node.js 18+ installed, plus a Postgres database to connect to.
Easiest option (no local install, no card): create the free Render Postgres
database from Step 3 below first, then use its "External Database URL" for local
dev too. Alternatively, install Postgres locally or use Docker.

```bash
# In the project root:
cp server/.env.example server/.env
```

Open `server/.env` and set `DATABASE_URL` to your Postgres connection string
(from Render, Docker, or a local Postgres install).

```bash
npm run setup
```

`npm run setup` will:
- install all dependencies (root, server, client)
- create the tables in your Postgres database
- seed an admin account + a sample manager, contact, and donation

You'll see credentials printed in the terminal, e.g.:
```
Created admin user: admin@example.com / ChangeMe123!
  manager@example.com / Manager123!
  jane.doe@example.com / User123!
```

Then start both the backend and frontend together:

```bash
npm run dev
```

- Backend API: http://localhost:4000
- Frontend (open this in your browser): http://localhost:5173

Log in with any of the seeded accounts above. Change the admin password (or create
a new admin and delete the seed one) once you're set up.

> First-time setup note: `npm run setup` runs `prisma migrate dev`, which will
> prompt you to confirm the migration name in the terminal — press Enter to accept
> the default.

---

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: donation tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

(`.env` and the local `.db` file are already excluded via `.gitignore`.)

---

## 3. Deploy to Render

This repo includes a `render.yaml` so Render can configure everything automatically
via "Blueprint" deploy, entirely on Render's **free tier — no credit card required**:

1. Go to https://dashboard.render.com → **New** → **Blueprint**.
2. Connect your GitHub repo.
3. Render will read `render.yaml` and create **two** things: a free Postgres
   database (`donation-tracker-db`) and a free Web Service that's automatically
   wired up to it via `DATABASE_URL`.
4. Set the `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` env vars on the web
   service in the Render dashboard (marked `sync: false` so you enter them
   yourself, not commit them).
5. Deploy. After the first successful deploy, open a Render **Shell** for the
   web service and run `npm run seed -w server` once to create your admin account.

**Good to know about Render's free tier:**
- The free Postgres database is real, persistent storage — your data will
  **not** reset on redeploys or restarts (unlike SQLite on the free web service
  plan, which has no disk).
- Render's free Postgres databases **expire after 30 days** unless upgraded to
  a paid plan — you'll get an email warning before that happens. Free web
  services also "spin down" after 15 minutes of no traffic and take ~30–60
  seconds to wake back up on the next visit. Both fine for testing/demo use.

---

## Project structure

```
donation-tracker/
  server/            Express API + Prisma (SQLite)
    prisma/schema.prisma
    prisma/seed.js
    src/
      routes/         auth, users, contacts, groups, donations, reports, logs
      middleware/auth.js
  client/            React (Vite) + Tailwind, mobile-friendly UI
    src/
      pages/          Login, AdminDashboard, ManagerDashboard, UserDashboard, Logs
      context/AuthContext.jsx
  render.yaml
```

## API overview

| Route | Access |
|---|---|
| `POST /api/auth/login` | public |
| `GET /api/reports/group-totals` | any logged-in user (scoped by role) |
| `GET /api/reports/my-total` | any logged-in user with a linked contact |
| `/api/contacts` | admin (all), manager (own group) |
| `/api/groups` | admin (all), manager (read own) |
| `/api/donations` | admin (all), manager (own group), user (own, read-only) |
| `/api/users` | admin only |
| `/api/logs` | admin only |
