# UF2026 Tournament Site

A static, no-build website for the UF2026 tournament, built from the draft schedule.

## Features

- **Schedule** — all 20 group-stage fixtures plus the knockout rounds (QF, SF, Final).
- **Standings** — group tables (P/W/D/L/GF/GA/GD/Pts) computed automatically as match scores are entered.
- **Knockout bracket** — pick the remaining quarter-final teams and enter scores; winners advance to the next round automatically.
- **Team names** — rename the placeholder teams (Team 01, Team 02, ...) to real team names; the change applies everywhere.

All data is stored locally in the browser (`localStorage`) — no backend or build step required.

## Running locally

Open `index.html` directly in a browser, or serve the folder:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploying

This is a static site (`index.html`, `css/`, `js/`) and can be hosted as-is on GitHub Pages, Netlify, Vercel, or any static host.
