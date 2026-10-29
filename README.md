# Fintarg

Fintarg is a responsive personal-finance and life-management platform for Sri Lankan individuals and small businesses. It uses an Express/Mongoose REST backend and a Next.js App Router frontend.

## Structure

```text
backend/
  src/
    config/          Environment, MongoDB, and logger setup
    controllers/     REST request handlers
    middleware/      Authentication, validation, DB readiness, errors
    models/          Mongoose schemas
    routes/          Auth, profile, records, files, cron, health
    services/        Auth, record, mail, reset, and file logic
    utils/           JWT, password hashing, async handler
    validations/     Zod request schemas
  .env.example
  package.json
frontend/
  src/
    app/             Next.js routes, layouts, API proxies
    actions/         Server actions calling the backend
    components/      Shared and domain UI
    context/store    Global application state
    hooks/           Reusable React hooks
    lib/             Server API client and finance logic
    services/        Browser API client
    types/           API and domain types
    utils/           Formatting helpers
  .env.local.example
  package.json
```

## Local setup

1. Install all workspace dependencies from the repository root:

   ```powershell
   npm install
   ```

2. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI`, `MONGODB_DB`, and a production-quality `JWT_SECRET`.
3. Copy `frontend/.env.local.example` to `frontend/.env.local`. Set `BACKEND_API_URL=http://localhost:5000` for local development.
4. Start both projects from the root:

   ```powershell
   npm run dev
   ```

   The Next.js frontend runs at `http://localhost:3000`; Express runs at `http://localhost:5000`.

To run one side only, use `npm --prefix frontend run dev` or `npm --prefix backend run dev`. Verify with `npm --prefix backend run typecheck`, `npm --prefix frontend run typecheck`, `npm test`, and `npm run build` (run from the repository root).

## Backend environment

`MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, and `FILE_ENCRYPTION_KEY` belong in `backend/.env` locally and in the backend host's secret settings in production. `FRONTEND_ORIGIN` configures credentialed CORS. `RESEND_API_KEY` and `MAIL_FROM` enable password reset and email reminders. `CRON_SECRET` protects scheduled endpoints.

Never commit `.env`, `.env.local`, or production credentials. Rotate any database credential previously pasted into chat before production deployment.

## Deployment

The frontend (Next.js) is deployed on Netlify and the backend (Express) on Vercel, as separate services. Set `BACKEND_API_URL` in the frontend to the backend's HTTPS URL, keep MongoDB, JWT, file-encryption and cron secrets on the backend host only, and set the frontend origin (`FRONTEND_ORIGIN`, `APP_ORIGIN`) on the backend. MongoDB Atlas must allow the backend host's network egress.

See [docs/DEPLOY.md](docs/DEPLOY.md) for the step-by-step guide, environment variable tables, scheduled jobs, the validation checklist and troubleshooting.
