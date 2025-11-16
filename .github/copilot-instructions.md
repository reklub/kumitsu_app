Project: kumitsu_app — Express/EJS tournament manager

Quick orientation
- Entry point: `app.js` — initializes Express, connects to MongoDB (`mongodb://localhost:27017/tournaments`), registers routes, sessions, Passport (local strategy) and global error handler. App listens on `PORT` (default 5000).
- MVC-ish layout: `routes/` (routing + thin handlers) and `controllers/` (business logic). `models/` are Mongoose schemas.
- Views: server-rendered EJS with `ejs-mate` layouts under `views/` (see `views/layouts/boilerplate.ejs`).
- Static/public: `public/` (CSS/JS). Uploaded tournament images stored under `public/uploads/tournaments` (created at runtime).

What an AI agent should know (concrete, actionable)
- Database: uses MongoDB via Mongoose. Development DB is opened in `app.js` with a hard-coded `mongodb://localhost:27017/tournaments`. Ensure `mongod` is running before starting the app.
- Auth: passport-local is used with the `User` model (see `models/User.js`). Passport setup (serialize/deserialize) happens in `app.js`.
- Error handling: Project uses `utils/expressError.js` (custom Error class) and a global error handler in `app.js`. Many routes use try/catch; there is a helper `utils/catchAsync.js` that can wrap async route handlers.
- Flash & session: `express-session` + `connect-flash` used. Templates expect `res.locals.success` / `res.locals.error` and `res.locals.currentUser` to be set by middleware in `app.js`.

Patterns & conventions to follow
- Route organization: Each file in `routes/` mounts at a path in `app.js`. When adding a route file, export an Express `router` and mount it in `app.js`.
  Example: new `routes/foo.js` -> in `app.js` add `app.use('/foo', require('./routes/foo'))`.
- Controllers: Put DB logic and business behaviour in `controllers/*.js`. Routes should delegate (call controller functions) and use `authMiddleware` for protected endpoints.
  Example: `routes/tournaments.js` calls `tournamentController.createTournament` for POST `/'`.
- Auth guard: Use `middlewares/authMiddleware.js`. It sets `req.session.returnTo` and `res.locals.returnTo` (see `storeReturnTo`) for return-to flow after login.
- Async handlers: Prefer wrapping async route handlers with `catchAsync` to forward errors to Express error handler (instead of duplicating try/catch). Example usage:
  const catchAsync = require('../utils/catchAsync');
  router.get('/', catchAsync(async (req, res) => { /* ... */ }));
- Flash/UI feedback: Server-rendered flows rely on `req.flash` messages and redirects — preserve this behaviour when changing flows.

Important files to reference when coding
- `app.js` — server bootstrap, DB connection, passport, session config, global error handling.
- `routes/` — where endpoints live (e.g., `routes/tournaments.js`, `routes/admin.js`). Use these for URL patterns and view rendering.
- `controllers/tournamentController.js` — complex business logic: bracket generation, grouping, bracket storage (`brackets-manager`, `brackets-json-db`). This file shows many patterns for updating related models and saving many documents.
- `middlewares/authMiddleware.js` — login guard and return-to pattern.
- `utils/catchAsync.js`, `utils/expressError.js`, `utils/tournamentHelpers.js` — utilities and helpers used across controllers and routes.
- `scripts/` and `seeders/` — e.g., `scripts/initBeltRanks.js`, `seeders/beltRanks.js` show how belt ranks are seeded; use them to reproduce initial data.

Running & developer workflows (concrete commands)
- Start MongoDB (Windows): run mongod (or start the MongoDB service) before launching the app.
- Run the app (development):
  - From repo root: `node app.js` (listens on `PORT` or 5000).
- Seed belt ranks: run the seed/init scripts directly with Node:
  - `node scripts/initBeltRanks.js` or `node scripts/seedBeltRanks.js` (these scripts reference models and expect local MongoDB).

Integration & dependencies to be aware of
- External packages of note: `passport-local`, `brackets-manager`, `brackets-json-db`, `ejs-mate`. Look in `package.json` to confirm versions before upgrading.
- File uploads: controller code accepts base64 images and writes files into `public/uploads/tournaments` (no external storage configured). Keep this in mind when changing upload logic.

Mini-style rules for the codebase
- Prefer `async/await` and propagate errors to Express error handler (use `catchAsync`).
- When modifying a controller that updates multiple collections (e.g., generating brackets), preserve transactional semantics as best-effort: the code currently performs sequential DB operations — be conservative with refactors.
- Keep server-rendered patterns intact: many admin flows redirect with flash messages, and front-end templates read those values.

Examples from codebase (copyable snippets)
- Use auth guard for protected page:
  router.get('/create-tournament', authMiddleware, (req, res) => res.render('tournaments/new'));
- Use `catchAsync` to wrap an async route handler:
  const catchAsync = require('../utils/catchAsync');
  router.get('/', catchAsync(async (req, res) => { const tournaments = await Tournament.find(); res.render('tournaments/index', { tournaments }); }));

When unsure, check these files first: `app.js`, `routes/tournaments.js`, `controllers/tournamentController.js`, `middlewares/authMiddleware.js`, `utils/tournamentHelpers.js`.

If this file is unclear or missing examples you need, tell me which area to expand (routing, auth, seeding, bracket generation, file uploads, or view conventions) and I'll update this guidance.
