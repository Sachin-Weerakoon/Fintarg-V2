# Changelog Fixes & Stability Audit

## Phase 0 — Baseline and Test Hygiene

### 0.1 Test Environment & Safe Dummies
- **What was wrong:** Running `npm test` on a clean clone without `.env` failed because `src/config/env.ts` throws when `MONGODB_URI`, `JWT_SECRET`, origins, encryption keys, and cron secret are unset. Integration tests could also inadvertently hit external MongoDB instances.
- **What changed:** Added `backend/src/test/setup.ts` providing safe dummy fallback environment variables when `NODE_ENV=test`. Configured `backend/package.json` to load it via `tsx --import ./src/test/setup.ts`. Updated `backend/src/integration/api.test.ts` to dynamically instantiate and manage in-memory MongoDB with graceful skips and pre-warmed model indexes.
- **How verified:** Verified with `DOTENV_CONFIG_PATH=.env.nonexistent npm test` and `npm test` at root without `.env`. All 51 backend tests pass.

### 0.2 `mongodb-memory-server` Packaging & Dynamic Import
- **What was wrong:** `mongodb-memory-server` was listed under production `dependencies` in `backend/package.json` and statically imported at module evaluation time in `src/config/database.ts`, unnecessarily bloating production container images.
- **What changed:** Moved `mongodb-memory-server` to `devDependencies` in `backend/package.json`. Replaced top-level static import with dynamic import loaded only in non-production environments when fallback is triggered.
- **How verified:** Ran backend `npm run typecheck` and `npm test`. No bundle or build warnings.

### 0.3 Database Connection Event Logging
- **What was wrong:** `connectDatabase()` logged `logger.info(..., 'MongoDB connected')` unconditionally on every single incoming HTTP request processed by the database middleware.
- **What changed:** Attached a single listener to `mongoose.connection.on('connected', ...)` to log connection success once, eliminating noisy request-level log spam.
- **How verified:** Inspected test logs and confirmed connection message logs once on connection establishment.

### 0.4 GitHub Actions CI Workflow
- **What was wrong:** Repository lacked an automated GitHub Actions CI pipeline to gate pull requests.
- **What changed:** Created `.github/workflows/ci.yml` running backend typecheck + tests and frontend typecheck + lint + vitest + build on pull requests and pushes to `main`. Excludes all secret credentials.
- **How verified:** Ran root `npm test` successfully (all 51 backend tests and 26 frontend tests pass).
