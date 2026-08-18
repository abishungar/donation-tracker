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

**Requirements:** Node.js 18+ installed.

```bash
# 1. Open the project folder in VS Code, then in the integrated terminal:
npm run setup
```

`npm run setup` will:
- install all dependencies (root, server, client)
- create the local SQLite database and tables
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

### Environment variables (optional)
Copy `server/.env.example` to `server/.env` if you want to customize the JWT
secret or seed admin credentials before running `npm run setup`.

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
via "Blueprint" deploy:

1. Go to https://dashboard.render.com → **New** → **Blueprint**.
2. Connect your GitHub repo.
3. Render will read `render.yaml` and create one Web Service.
4. Set the `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` env vars in the Render
   dashboard (marked `sync: false` so you enter them yourself, not commit them).
5. Deploy. After the first successful deploy, open a Render **Shell** for the
   service and run `npm run seed -w server` once to create your admin account.

**Important limitation:** this app uses SQLite for simplicity. Render's **free**
web service plan has no persistent disk, so the database resets on every deploy
or restart. The included `render.yaml` requests a small persistent disk, which
requires a **paid (Starter) plan** — do this for anything beyond testing/demo use.

If you'd rather stay on the free plan permanently, the cleanest path is to switch
to Render's free Postgres database instead of SQLite:
1. In `server/prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
2. Create a free Postgres instance on Render and copy its connection string into
   the `DATABASE_URL` env var.
3. Remove the `disk:` block from `render.yaml`.
4. Run `npx prisma migrate dev` locally once against that connection string to
   generate a fresh migration for Postgres.

Happy to make this switch for you now if you'd rather start on Postgres — just say so.

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
