# Valenzuela Community Reporting System

**Ulat, Maagap, Alisto.**

A community issue reporting platform for Valenzuela City, covering **Barangay Ugong** and
**Barangay Gen. T. De Leon**. Residents file reports with photos and video, track them through
a six-stage timeline, read barangay announcements, post lost & found items and talk to an
AI-powered barangay help desk (Google Gemini, with a rules-based fallback). Field staff work
their assigned queue and upload proof of resolution.
Administrators verify, assign, close, export and publish.

```
valenzuela-crs/
├── backend/     Node.js + Express API (MySQL)
└── frontend/    React + Vite app
```

---

## 1. Requirements

| Software | Version |
| --- | --- |
| Node.js | 18 or newer (20+ recommended) |
| npm | 9 or newer |
| XAMPP | any recent build, with **MySQL** running |

Start **MySQL** in the XAMPP control panel before setting up the backend. Apache is optional —
the API and the React app run on their own Node servers.

---

## 2. Backend setup

From inside `valenzuela-crs/backend/`:

```bash
npm install
npm run db:import
npm start
```

That is the whole setup. What each step does:

1. **`npm install`** — installs Express, mysql2, bcryptjs, JWT, helmet, multer and the rest.
2. **`npm run db:import`** — connects to MySQL, creates the `valenzuela_crs` database if it is
   missing, builds every table from `database/schema.sql`, then loads `database/seed.sql`.
   It prints row counts and the test accounts when it finishes.
   Use `npm run db:fresh` to drop the database first and start completely clean.
3. **`npm start`** — checks the MySQL connection, then serves the API on
   <http://localhost:5050>. A health check lives at <http://localhost:5050/api/health>.

### Environment file

`backend/.env` is already present with working XAMPP defaults, and `backend/.env.example`
documents every value. Edit `.env` only if your setup differs:

```ini
PORT=5050
CLIENT_URL=http://localhost:5173

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root          # XAMPP default
DB_PASSWORD=          # XAMPP default is an empty password
DB_NAME=valenzuela_crs

JWT_ACCESS_SECRET=...  # change both secrets before any real deployment
JWT_REFRESH_SECRET=...

GEMINI_API_KEY=       # AI Help Desk — leave empty to use the rules-based fallback
GEMINI_MODEL=gemini-flash-latest
```

### AI Help Desk (Google Gemini)

The Help Desk page (`/messages`) is available to **every signed-in user** — resident, field
staff, and admin — and is powered by Google's Gemini API. The API call happens server-side
only — the key never reaches the browser.

1. Get an API key from [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key).
2. Open `backend/.env` and set `GEMINI_API_KEY=your-key-here`.
3. (Optional) change `GEMINI_MODEL` — the default `gemini-flash-latest` is Google's
   recommended free-tier alias for new projects.
4. Restart the backend.
5. Open **Help desk** in the app and ask a question.

If `GEMINI_API_KEY` is left empty, the built-in rules-based assistant answers instead, so
the page keeps working without a key. Gemini failures are logged on the server only; users
always see a friendly message.

Help Desk API (all three require a signed-in session and are automatically scoped to the
authenticated user — no user id or conversation id is ever accepted from the client):

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/helpdesk/chat` | Send a message, get the AI reply |
| `GET` | `/api/helpdesk/conversation` | The current user's own conversation |
| `GET` | `/api/helpdesk/messages` | The current user's own message history |

### Importing through phpMyAdmin instead

If you would rather not run the script:

1. Open <http://localhost/phpmyadmin>.
2. Create a database named `valenzuela_crs` (collation `utf8mb4_unicode_ci`).
3. Select it, open **Import**, and run `backend/database/schema.sql`.
4. Import `backend/database/seed.sql` the same way.

---

## 3. Frontend setup

From inside `valenzuela-crs/frontend/`:

```bash
npm install
npm run dev
```

The app opens on <http://localhost:5173> and talks to the API on port 5050.
`frontend/.env` holds `VITE_API_URL` and `VITE_API_ORIGIN`; change them only if you moved the
backend off port 5050. `npm run build` produces a production bundle in `dist/`.

Keep the backend running in one terminal and the frontend in another.

---

## 4. Test accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@valenzuela.gov.ph` | `Admin@123` |
| Staff | `staff@valenzuela.gov.ph` | `Staff@123` |
| Resident | `resident@valenzuela.gov.ph` | `Resident@123` |

Registering a new account signs you in immediately — there is no verification code.
Forgot Password does not send email in this build: the reset link is returned in the
response and shown on screen so the flow can be completed end to end.

---

## 5. Replacing the auth background photo

Every authentication screen (Login, Register, Forgot Password, Reset Password) shares one image:

```
frontend/src/assets/images/auth-background.jpg
```

Drop your own picture in with that exact name and the pages pick it up. No code changes.
The photo is rendered with `object-fit: cover`, stays centred and sharp at any size, and if the
file is missing the panel falls back to the blue-to-green gradient instead of a blank box.

To tune how dark the overlay sits on top of your photo, edit one variable near the top of
`frontend/src/styles/globals.css`:

```css
--auth-overlay-opacity: 0.62;   /* 0.55–0.70 keeps white text readable */
--auth-overlay-from: 12, 34, 80;  /* gradient start, R,G,B */
--auth-overlay-to: 14, 78, 92;    /* gradient end, R,G,B */
```

Lower the opacity to let a dark photo show through more; raise it if your photo is bright and
busy. The form card itself is frosted glass, so the photo stays visible behind it.

---

## 6. What each role can do

**Resident** — dashboard with live counts, file a report (12 categories, manual priority,
multiple photos plus video, plain-text address, anonymous option, preview before submit),
report history with filters and the Submitted → Verified → Assigned → In Progress → Resolved →
Closed timeline, community feed with likes and comments, lost & found, notifications,
help desk chat, profile, and security settings.

**Staff** — assigned queue sorted by priority, status updates, field notes, resolution proof
photo uploads, completed history and performance stats.

**Admin** — KPI dashboard with monthly and volume-trend charts, report management with search,
filters, sorting, pagination and a detail modal (assign personnel, update status, close, delete),
resident activation, staff accounts with performance scores, announcements with
draft / published / scheduled states, and CSV / Excel export from live data.

---

## 7. Mobile & PWA (installable app)

The whole system is responsive: phones get a slide-out navigation drawer, stacked cards and
tables that scroll inside their own cards, full-screen Help Desk chat with the input pinned to
the bottom, and 16px inputs so iOS does not zoom on focus. Verified at 360 / 390 / 414 / 768 /
1024 / 1366 px widths.

The frontend is also an installable Progressive Web App:

- `frontend/public/manifest.webmanifest` — name, icons, `display: standalone`, theme colour.
- `frontend/public/sw.js` — service worker: cached app shell works offline; API and Gemini
  calls always go to the network (nothing user-specific is ever cached).
- `frontend/scripts/generate-pwa-icons.mjs` — regenerates the icon PNGs with
  `node scripts/generate-pwa-icons.mjs` (no image tools required).

To try it: run `npm run build && npm run preview` in `frontend/` (the service worker only
registers in production builds so it never interferes with dev hot-reload), then open
<http://localhost:5173> on a phone or in Chrome and use **Install / Add to Home Screen**.
The installed app opens without browser UI. When offline, the app shows:
*“You are currently offline. Internet connection is required for the AI Help Desk and
submitting new reports.”*

---

## 8. Security notes

Helmet headers, rate limiting (stricter on auth and password reset), express-validator on every
write endpoint, parameterised SQL everywhere, HTML escaping on request bodies, role-based route
guards on both the API and the UI, file-type and size checks on uploads, bcrypt password hashing,
and JWT access plus refresh tokens in httpOnly cookies with a token version that invalidates
sessions on demand.

Change `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `.env` before deploying anywhere real.

---

## 9. Troubleshooting

| Problem | Fix |
| --- | --- |
| `Cannot reach the server` in the UI | The backend is not running. Start it with `npm start` in `backend/`. |
| `db:import` cannot connect | MySQL is not started in XAMPP, or `DB_USER`/`DB_PASSWORD` in `.env` do not match your setup. |
| Port 5050 or 5173 already in use | Change `PORT` in `backend/.env` (and `VITE_API_URL` in `frontend/.env`), or the port in `frontend/vite.config.js`. |
| Uploaded photos do not display | Confirm `backend/uploads/` exists and is writable; it is served at `/uploads`. |
| Want a clean database | `npm run db:fresh` in `backend/`. |
