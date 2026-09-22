/* Admin panel: password login, then the full editable UI. Every write
   goes straight to the backend via authenticated API calls. */

const TOKEN_KEY = "uf2026-admin-token";

let state = { teams: {}, groupScores: {}, bracketPicks: {}, bracketScores: {} };

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

function showLogin(message) {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("admin-app").style.display = "none";
  document.getElementById("login-error").textContent = message || "";
}

function showAdmin() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("admin-app").style.display = "block";
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) {
    clearToken();
    showLogin("Session expired - please log in again.");
    throw new Error("unauthorized");
  }
  return res;
}

async function login(password) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Login failed");
  }
  const { token } = await res.json();
  setToken(token);
}

async function fetchState() {
  const res = await fetch("/api/state");
  state = await res.json();
  renderAll();
}

/* ---------- Shared row builder (editable) ---------- */

function matchRow({ stage, date, time, fixture, group, team1Name, team2Name, score, onScoreChange, editableTeams, onTeamChange }) {
  const row = document.createElement("div");
  row.className = "match-row";

  const meta = document.createElement("div");
  meta.className = "match-meta";
  meta.innerHTML = `<span class="match-stage">${stage}</span><span class="match-date">${date}${time ? " · " + time : ""}</span><span class="match-fixture">${fixture}${group ? " · " + group : ""}</span>`;
  row.appendChild(meta);

  const teamsWrap = document.createElement("div");
  teamsWrap.className = "match-teams";

  teamsWrap.appendChild(teamCell(team1Name, editableTeams && editableTeams.team1, (v) => onTeamChange && onTeamChange("team1", v)));

  const scoreWrap = document.createElement("div");
  scoreWrap.className = "match-score";
  scoreWrap.appendChild(scoreInput(score.score1, (v) => onScoreChange("score1", v)));
  const dash = document.createElement("span");
  dash.textContent = "–";
  scoreWrap.appendChild(dash);
  scoreWrap.appendChild(scoreInput(score.score2, (v) => onScoreChange("score2", v)));
  teamsWrap.appendChild(scoreWrap);

  teamsWrap.appendChild(teamCell(team2Name, editableTeams && editableTeams.team2, (v) => onTeamChange && onTeamChange("team2", v)));

  row.appendChild(teamsWrap);
  return row;
}

function teamCell(name, editableOptions, onChange) {
  if (editableOptions) {
    const select = document.createElement("select");
    select.className = "team-select";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Select team…";
    select.appendChild(blank);
    editableOptions.options.forEach((id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = teamName(state, id);
      if (id === editableOptions.selected) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", (e) => onChange(e.target.value || null));
    return select;
  }
  const span = document.createElement("span");
  span.className = "team-name" + (name === "—" ? " team-tbd" : "");
  span.textContent = name;
  return span;
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function scoreInput(value, onChange) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.className = "score-input";
  input.value = value === undefined || value === null ? "" : value;
  const debounced = debounce((v) => onChange(v), 500);
  input.addEventListener("input", (e) => debounced(e.target.value === "" ? "" : e.target.value));
  return input;
}

/* ---------- Schedule ---------- */

function renderSchedule() {
  const container = document.getElementById("schedule-body");
  container.innerHTML = "";
  GROUP_MATCHES.forEach((m) => {
    container.appendChild(matchRow({
      stage: "Group Stage",
      date: m.date,
      time: m.time,
      fixture: m.fixture,
      group: m.group,
      team1Name: teamName(state, m.team1),
      team2Name: teamName(state, m.team2),
      score: state.groupScores[m.id] || {},
      onScoreChange: async (field, value) => {
        const current = state.groupScores[m.id] || {};
        const body = { score1: current.score1 ?? "", score2: current.score2 ?? "" };
        body[field] = value;
        const res = await apiFetch(`/api/admin/scores/${m.id}`, { method: "PUT", body: JSON.stringify(body) });
        if (res.ok) {
          const data = await res.json();
          state.groupScores = data.groupScores;
          renderStandings();
        }
      },
    }));
  });
}

/* ---------- Standings (read-only, computed) ---------- */

function renderStandings() {
  const container = document.getElementById("standings-body");
  container.innerHTML = "";
  Object.keys(GROUPS).forEach((groupName) => {
    const rows = computeStandings(state, groupName);
    const table = document.createElement("table");
    table.className = "standings-table";
    table.innerHTML = `
      <caption>${groupName}</caption>
      <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody></tbody>`;
    const tbody = table.querySelector("tbody");
    rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      if (i < 2) tr.className = "qualified";
      tr.innerHTML = `<td>${i + 1}</td><td class="standings-team">${teamName(state, r.id)}</td><td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd}</td><td><strong>${r.points}</strong></td>`;
      tbody.appendChild(tr);
    });
    container.appendChild(table);
  });
}

/* ---------- Bracket ---------- */

function renderBracket() {
  const container = document.getElementById("bracket-body");
  container.innerHTML = "";
  const stages = [
    { title: "Quarter-finals", ids: ["QF1", "QF2", "QF3", "QF4"] },
    { title: "Semi-finals", ids: ["SF1", "SF2"] },
    { title: "Final", ids: ["FINAL"] },
  ];
  const allTeamIds = Object.keys(state.teams);

  stages.forEach((stageDef) => {
    const stageWrap = document.createElement("div");
    stageWrap.className = "bracket-stage";
    const heading = document.createElement("h3");
    heading.textContent = stageDef.title;
    stageWrap.appendChild(heading);

    stageDef.ids.forEach((id) => {
      const m = bracketMatchById(id);
      const team1Id = resolveSlot(state, id, "team1");
      const team2Id = resolveSlot(state, id, "team2");

      const editableTeams = {};
      if (m.team1.type === "manual") editableTeams.team1 = { options: allTeamIds, selected: state.bracketPicks[id] && state.bracketPicks[id].team1 };
      if (m.team2.type === "manual") editableTeams.team2 = { options: allTeamIds, selected: state.bracketPicks[id] && state.bracketPicks[id].team2 };

      const row = matchRow({
        stage: m.stage,
        date: m.date,
        time: m.time,
        fixture: m.fixture,
        group: "",
        team1Name: teamName(state, team1Id),
        team2Name: teamName(state, team2Id),
        score: state.bracketScores[id] || {},
        onScoreChange: async (field, value) => {
          const current = state.bracketScores[id] || {};
          const body = { score1: current.score1 ?? "", score2: current.score2 ?? "" };
          body[field] = value;
          const res = await apiFetch(`/api/admin/bracket/${id}/score`, { method: "PUT", body: JSON.stringify(body) });
          if (res.ok) {
            const data = await res.json();
            state.bracketScores = data.bracketScores;
            renderBracket();
          }
        },
        editableTeams: Object.keys(editableTeams).length ? editableTeams : null,
        onTeamChange: async (slot, value) => {
          const res = await apiFetch(`/api/admin/bracket/${id}/pick`, { method: "PUT", body: JSON.stringify({ slot, teamId: value }) });
          if (res.ok) {
            const data = await res.json();
            state.bracketPicks = data.bracketPicks;
            renderBracket();
          }
        },
      });
      stageWrap.appendChild(row);
    });
    container.appendChild(stageWrap);
  });

  const noBreak = document.createElement("p");
  noBreak.className = "bracket-note";
  noBreak.textContent = `${NO_BREAK_DAY.date}: ${NO_BREAK_DAY.label}`;
  container.appendChild(noBreak);
}

/* ---------- Teams ---------- */

function renderSettings() {
  const container = document.getElementById("settings-body");
  container.innerHTML = "";

  Object.keys(GROUPS).forEach((groupName) => {
    const section = document.createElement("div");
    section.className = "settings-group";
    const h = document.createElement("h3");
    h.textContent = groupName;
    section.appendChild(h);

    GROUPS[groupName].forEach((id) => {
      const row = document.createElement("label");
      row.className = "settings-row";
      row.innerHTML = `<span>${id}</span>`;
      const input = document.createElement("input");
      input.type = "text";
      input.value = state.teams[id];
      const debounced = debounce(async (value) => {
        const res = await apiFetch(`/api/admin/teams/${id}`, { method: "PUT", body: JSON.stringify({ name: value }) });
        if (res.ok) {
          const data = await res.json();
          state.teams = data.teams;
          renderAll();
        }
      }, 500);
      input.addEventListener("input", (e) => debounced(e.target.value));
      row.appendChild(input);
      section.appendChild(row);
    });
    container.appendChild(section);
  });
}

async function handleReset() {
  if (!confirm("Reset ALL scores, bracket picks and team names for everyone? This cannot be undone.")) return;
  const res = await apiFetch("/api/admin/reset", { method: "POST" });
  if (res.ok) {
    const data = await res.json();
    state = data.state;
    renderAll();
  }
}

/* ---------- Tabs, login wiring ---------- */

function initTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });
}

function renderAll() {
  renderSchedule();
  renderStandings();
  renderBracket();
  renderSettings();
}

document.addEventListener("DOMContentLoaded", () => {
  initTabs();

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("login-password").value;
    try {
      await login(password);
      showAdmin();
      await fetchState();
    } catch (err) {
      document.getElementById("login-error").textContent = err.message;
    }
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    clearToken();
    showLogin("");
  });

  document.getElementById("reset-btn").addEventListener("click", handleReset);

  if (getToken()) {
    showAdmin();
    fetchState().catch(() => showLogin("Session expired - please log in again."));
  } else {
    showLogin("");
  }
});
