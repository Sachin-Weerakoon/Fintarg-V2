# Deployment guide

Fintarg runs as two separate services:

| Part | Host | What runs there |
|---|---|---|
| Frontend | **Netlify** | Next.js 15 (App Router) with the Netlify Next.js Runtime |
| Backend | **Vercel** | Express + Mongoose API as a Vercel Function |
| Database | **MongoDB Atlas** | One cluster, one database per environment |

```text
Browser ──HTTPS──> Netlify (Next.js)
                     │  server-side proxy: /api/backend/*, /api/cron/*, server actions
                     │  uses BACKEND_API_URL
                     ▼
                   Vercel (Express API) ──TLS──> MongoDB Atlas
                     ▲
                   Vercel Cron (daily) → /api/cron/maintenance, /api/cron/reminders
```

The browser only talks to Netlify. The Next.js server calls the backend, so the
auth cookie (`fintarg_token`, httpOnly) is set on the Netlify domain.

> The root `vercel.json` describes a single-project Vercel setup (frontend and
> backend as Vercel services). This guide describes the split Netlify + Vercel
> setup. Do not use both at once.

---

## 1) MongoDB Atlas

1. Create a cluster (staging used a free M0 in AWS `us-east-1`, close to the
   Vercel function region `iad1`).
2. **Database Access:** create a database user with a long random password
   (read/write to the app database only). Do not reuse the password anywhere.
3. **Network Access:** Vercel functions do not have fixed outbound IPs, so the
   backend needs `0.0.0.0/0`.
   - Set an **expiry** on that rule for testing environments.
   - For production, prefer a paid option with fixed egress (Vercel Static IPs,
     or Atlas Private Endpoint / peering) and remove `0.0.0.0/0`.
   - Add your own IP (`/32`) separately if you need to connect locally.
4. Copy the `mongodb+srv://...` connection string. Use a different database name
   per environment (`MONGODB_DB=fintarg_staging`, `fintarg`, ...).

Indexes are created by Mongoose when the backend starts. There is no separate
setup script. One-off maintenance scripts are in `backend/package.json`
(`db:drop-locked-until-ttl`, `db:drop-profile-ttl`,
`db:backfill-medical-expenses`). Run them only when asked to.

---

## 2) Generate secrets

Run once per environment and store the values in a password manager, never in Git:

```bash
openssl rand -hex 32      # JWT_SECRET  (64 chars, min 32)
openssl rand -hex 32      # CRON_SECRET (64 chars, min 32)
openssl rand -base64 32   # FILE_ENCRYPTION_KEY (must be exactly 44 chars)
```

`FILE_ENCRYPTION_KEY` encrypts uploaded files. **If it changes, existing
uploads can no longer be decrypted.** Back it up.

---

## 3) Backend on Vercel

### Project settings

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Framework Preset | `Express` |
| Install / Build | `npm install` / `npm run build` |
| Node.js | 20.x or newer |

With the CLI (from the repo root):

```bash
npm install -g vercel
vercel login
cd backend
vercel link            # create or pick the project, Root Directory = backend
```

If `vercel link` from the repo root detects the root `vercel.json` services,
set **Root Directory = backend** and **Framework = Express** in
Project Settings instead.

### Environment variables (Production)

The backend validates these on start-up (`backend/src/config/env.ts`). A missing
or invalid value stops the server with `Invalid backend environment`.

| Name | Required | Example / rule |
|---|---|---|
| `NODE_ENV` | yes | `production` (also turns on the `secure` cookie flag) |
| `MONGODB_URI` | yes | Atlas `mongodb+srv://...` string |
| `MONGODB_DB` | no (default `fintarg`) | `fintarg_staging` |
| `JWT_SECRET` | yes | min 32 chars |
| `FILE_ENCRYPTION_KEY` | yes | exactly 44 chars (base64 of 32 bytes) |
| `CRON_SECRET` | yes | min 32 chars |
| `FRONTEND_ORIGIN` | yes | `https://<site>.netlify.app` (comma-separated list allowed) |
| `APP_ORIGIN` | yes | same as `FRONTEND_ORIGIN`, used in email links |
| `COOKIE_NAME` | no (default `fintarg_token`) | must match the frontend `AUTH_COOKIE_NAME` |
| `RESEND_API_KEY` | no | needed for password reset and reminder emails |
| `MAIL_FROM` | no | verified sender, e.g. `Fintarg <no-reply@your-domain>` |
| `LOG_LEVEL` | no (default `info`) | `info`, `warn`, `error` |

```bash
vercel env add JWT_SECRET production     # paste the value when asked
# ...repeat for each variable
vercel env ls
```

Variables only apply to **new** deployments. Redeploy after changing them.

### Deploy and check

```bash
vercel deploy --prod
curl https://<backend>.vercel.app/api/health
```

Expected: `ok` status with the database connected.

### Scheduled jobs (Vercel Cron)

`backend/vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/maintenance", "schedule": "0 20 * * *" },
    { "path": "/api/cron/reminders",   "schedule": "30 2 * * *" }
  ]
}
```

- Times are **UTC**: maintenance 01:30 and reminders 08:00 Sri Lanka time.
- Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically. The
  backend also accepts an `x-cron-secret` header.
- Hobby plan: once per day per job, and it may run any time within that hour.
  Pro allows more frequent schedules.
- `maintenance` deletes expired sessions and password-reset tokens.
  `reminders` sends due email reminders (needs `RESEND_API_KEY` + `MAIL_FROM`).
- Check runs in **Settings → Cron Jobs** (there is a manual **Run** button) and
  in the function logs (user agent `vercel-cron/1.0`).

---

## 4) Frontend on Netlify

### Config

`netlify.toml` (repo root):

```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "frontend/.next"

[build.environment]
  NODE_VERSION = "20"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Notes:

- Link and deploy from the **repo root**, not from `frontend/`. Deploying from
  `frontend/` uploads the static files without the Next.js server function,
  and every page returns "Page not found".
- `publish` is resolved from the repo root, so it must be `frontend/.next`.

### Environment variables

| Name | Required | Value |
|---|---|---|
| `BACKEND_API_URL` | **yes** | `https://<backend>.vercel.app` (no trailing slash) |
| `AUTH_COOKIE_NAME` | no (default `fintarg_token`) | must match backend `COOKIE_NAME` |

> If `BACKEND_API_URL` is missing, the frontend silently falls back to
> `http://localhost:5000` and every API call fails. Always set it.

### Deploy with the CLI

```bash
npm install -g netlify-cli
netlify login
netlify sites:create --name <site-name>     # or use an existing site
netlify link --id <project-id>              # run from the repo root
netlify env:set BACKEND_API_URL https://<backend>.vercel.app
netlify env:set AUTH_COOKIE_NAME fintarg_token
netlify deploy --prod
```

Then check `https://<site>.netlify.app/api/backend/health` returns `ok`.

Netlify team sites can be **private** (visitor password / team login). Plain
`curl` then gets `401`. Test in a logged-in browser.

> The Vercel and Netlify CLIs add `.vercel` / `.netlify` lines to `.gitignore`.
> Put them in `.git/info/exclude` instead and run `git restore .gitignore`.

---

## 5) Production validation checklist

- Health: backend `/api/health` and frontend `/api/backend/health` both `ok`.
- Log in with a new account (password needs a special character).
- Log out and in again. Cookie `fintarg_token` is `HttpOnly`, `Secure`,
  `SameSite=Strict`.
- Complete onboarding and choose a work mode.
- Add, edit, and delete a few income and expense entries.
- Confirm the dashboard net position and any shortfall messaging appear correctly.
- Verify uploads work and that wrong file types are rejected.
- Check password reset flow (needs `RESEND_API_KEY` and `MAIL_FROM`).
- Test the cron routes with and without the secret (expect `401` without, `200` with):

  ```bash
  curl -i https://<backend>.vercel.app/api/cron/maintenance
  curl -i -H "Authorization: Bearer $CRON_SECRET" https://<backend>.vercel.app/api/cron/maintenance
  ```

- Verify the account deletion flow and export feature.

---

## 6) Login protection (know before testing)

- **Account lockout:** 5 wrong passwords lock that account for 15 minutes
  (stored in MongoDB). Shows "Account temporarily locked. Try again later."
  A successful password reset clears it.
- **IP rate limit:** `/api/auth/login` and `/api/auth/register` allow
  20 requests per 15 minutes per IP (`express-rate-limit`, in-memory).
  Shows "Too many requests, please try again later."
- Both return HTTP `429`. Read the message to tell them apart.
- Known limitation of this setup: requests reach the backend from Netlify's
  server, so the IP limiter sees Netlify's IP rather than the user's, and the
  in-memory counter is per function instance. Treat the account lockout as the
  main protection until this is changed.

---

## 7) Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Backend `500` / `Invalid backend environment` in logs | Missing or wrong env var (length rules above) | Fix in Vercel env settings, redeploy |
| Health shows database not connected / timeouts | Wrong `MONGODB_URI`, or Atlas Network Access missing `0.0.0.0/0` / rule expired | Check URI and Atlas access list |
| Netlify "Page not found" on every page | Deployed from `frontend/`, or plugin/publish path wrong | Use the root `netlify.toml` above, deploy from repo root |
| Frontend loads but every API call fails | `BACKEND_API_URL` not set (falls back to localhost) | Set it in Netlify, redeploy |
| Login works but you are logged out right away | `COOKIE_NAME` ≠ `AUTH_COOKIE_NAME`, or `FRONTEND_ORIGIN` wrong | Make them match, redeploy both |
| CORS errors | `FRONTEND_ORIGIN` does not exactly match the site URL | Use the full `https://` origin, no trailing slash |
| `429` on login | Account lockout or IP limit (section 6) | Wait 15 minutes |
| Cron returns `401` | `CRON_SECRET` differs or header missing | Check the Vercel env value |
| Password reset / reminder emails not sent | `RESEND_API_KEY` / `MAIL_FROM` not set (logged as `Email provider is not configured`) | Add both, redeploy |

Logs: **Vercel → Project → Logs** (backend, includes the error digest) and
**Netlify → Logs → Functions** (Next.js server).
