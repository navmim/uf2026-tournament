# UF2026 Tournament Site

A tournament tracker for UF2026, split into a public read-only site and a password-protected admin panel, backed by a small Node/Express API.

## Architecture

- **`server/`** — Express API. Serves `/api/state` (public, read-only) and a set of `/api/admin/*` write endpoints protected by a password login (`/api/login` returns a short-lived token). Data is stored in `server/data/state.json`.
- **`public/`** — static frontend, served by the same Express app.
  - `index.html` — public view: schedule, live-computed group standings, and the knockout bracket. Polls the API every 15s. No edit controls.
  - `admin.html` — password-gated admin view: edit scores, rename teams, and fill in the knockout bracket (winners auto-advance). Every change saves immediately to the backend and is visible on the public page.

Because there's a real backend now, this is **not** a static site anymore — it needs to run as a Node process, not GitHub Pages.

## Local development

```
npm install
ADMIN_PASSWORD=yourpassword JWT_SECRET=some-long-random-string npm start
```

Visit `http://localhost:3000` for the public view and `http://localhost:3000/admin.html` to log in as admin.

See `.env.example` for the environment variables used.

## Deploying

Deploy anywhere that runs Node (Render, Railway, Fly.io, etc.). On Render, for example:

1. New **Web Service** → connect this GitHub repo
2. Build command: `npm install`
3. Start command: `npm start`
4. Add environment variables: `ADMIN_PASSWORD` (your chosen password) and `JWT_SECRET` (a long random string)
5. Deploy — the public site and `/admin.html` are both served from the same URL

**Note on persistence:** match data is stored in a JSON file on disk (`server/data/state.json`). Most free hosting tiers wipe the filesystem on redeploy/restart, so admin edits could be lost when the service restarts. Fine for a short tournament; ask if you want it backed by a real database instead.

### GitHub Pages

This repo previously deployed to GitHub Pages as a static site. That's no longer possible now that there's a backend — Pages can't run Node. If Pages is still enabled for this repo, disable it (Settings → Pages → Source: None) to avoid it serving a stale, disconnected version of the site.
