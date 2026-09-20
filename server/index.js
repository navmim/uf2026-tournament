const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = "12h";

if (!ADMIN_PASSWORD) {
  console.warn("WARNING: ADMIN_PASSWORD is not set. /api/login will always reject.");
}
if (!JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set. Using an insecure default — set this in production.");
}
const SECRET = JWT_SECRET || "dev-only-insecure-secret-change-me";

const STATE_FILE = path.join(__dirname, "data", "state.json");
const VALID_GROUP_MATCH_IDS = Array.from({ length: 20 }, (_, i) => `M${String(i + 1).padStart(2, "0")}`);
const VALID_BRACKET_IDS = ["QF1", "QF2", "QF3", "QF4", "SF1", "SF2", "FINAL"];

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch (e) {
    return { teams: {}, groupScores: {}, bracketPicks: {}, bracketScores: {} };
  }
}

function saveState(s) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

let state = loadState();
const VALID_TEAM_IDS = Object.keys(state.teams);

function isValidScoreValue(v) {
  return v === null || v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0 && String(v).length < 4);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Minimal in-memory rate limiter for the login endpoint (per-process; resets on restart).
const loginAttempts = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60_000;
  }
  entry.count += 1;
  loginAttempts.set(ip, entry);
  return entry.count > 10;
}

app.post("/api/login", (req, res) => {
  if (isRateLimited(req.ip)) {
    return res.status(429).json({ error: "Too many attempts. Try again in a minute." });
  }
  const { password } = req.body || {};
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }
  const token = jwt.sign({ role: "admin" }, SECRET, { expiresIn: TOKEN_TTL });
  res.json({ token });
});

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.role !== "admin") throw new Error("wrong role");
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.get("/api/state", (req, res) => {
  res.json(state);
});

app.put("/api/admin/teams/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name } = req.body || {};
  if (!VALID_TEAM_IDS.includes(id)) {
    return res.status(404).json({ error: "Unknown team id" });
  }
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  state.teams[id] = name.trim().slice(0, 60);
  saveState(state);
  res.json({ ok: true, teams: state.teams });
});

app.put("/api/admin/scores/:matchId", requireAdmin, (req, res) => {
  const { matchId } = req.params;
  const { score1, score2 } = req.body || {};
  if (!VALID_GROUP_MATCH_IDS.includes(matchId)) {
    return res.status(404).json({ error: "Unknown match id" });
  }
  if (!isValidScoreValue(score1) || !isValidScoreValue(score2)) {
    return res.status(400).json({ error: "scores must be non-negative integers" });
  }
  state.groupScores[matchId] = { score1, score2 };
  saveState(state);
  res.json({ ok: true, groupScores: state.groupScores });
});

app.put("/api/admin/bracket/:matchId/score", requireAdmin, (req, res) => {
  const { matchId } = req.params;
  const { score1, score2 } = req.body || {};
  if (!VALID_BRACKET_IDS.includes(matchId)) {
    return res.status(404).json({ error: "Unknown bracket match id" });
  }
  if (!isValidScoreValue(score1) || !isValidScoreValue(score2)) {
    return res.status(400).json({ error: "scores must be non-negative integers" });
  }
  state.bracketScores[matchId] = { score1, score2 };
  saveState(state);
  res.json({ ok: true, bracketScores: state.bracketScores });
});

app.put("/api/admin/bracket/:matchId/pick", requireAdmin, (req, res) => {
  const { matchId } = req.params;
  const { slot, teamId } = req.body || {};
  if (!VALID_BRACKET_IDS.includes(matchId)) {
    return res.status(404).json({ error: "Unknown bracket match id" });
  }
  if (!["team1", "team2"].includes(slot)) {
    return res.status(400).json({ error: "slot must be team1 or team2" });
  }
  if (teamId !== null && !VALID_TEAM_IDS.includes(teamId)) {
    return res.status(400).json({ error: "Unknown team id" });
  }
  state.bracketPicks[matchId] = state.bracketPicks[matchId] || {};
  state.bracketPicks[matchId][slot] = teamId || null;
  saveState(state);
  res.json({ ok: true, bracketPicks: state.bracketPicks });
});

app.post("/api/admin/reset", requireAdmin, (req, res) => {
  state = loadDefaultState();
  saveState(state);
  res.json({ ok: true, state });
});

function loadDefaultState() {
  return {
    teams: Object.fromEntries(VALID_TEAM_IDS.map((id) => [id, `Team ${id.slice(1)}`])),
    groupScores: {},
    bracketPicks: {},
    bracketScores: {},
  };
}

app.listen(PORT, () => {
  console.log(`UF2026 backend listening on port ${PORT}`);
});
