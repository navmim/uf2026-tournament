/* UF2026 tournament site: state, persistence, and rendering */

const STORAGE_KEY = "uf2026-state-v1";

function loadState() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (e) {
    saved = null;
  }
  const state = {
    teams: { ...DEFAULT_TEAMS, ...(saved && saved.teams) },
    groupScores: (saved && saved.groupScores) || {},
    bracketPicks: (saved && saved.bracketPicks) || {},
    bracketScores: (saved && saved.bracketScores) || {},
  };
  return state;
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function teamName(id) {
  return (id && state.teams[id]) || "—";
}

/* ---------- Standings ---------- */

function computeStandings(groupName) {
  const teams = GROUPS[groupName];
  const table = {};
  teams.forEach((id) => {
    table[id] = { id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
  });

  GROUP_MATCHES.filter((m) => m.group === groupName).forEach((m) => {
    const s = state.groupScores[m.id];
    if (!s || s.score1 === "" || s.score2 === "" || s.score1 == null || s.score2 == null) return;
    const s1 = Number(s.score1);
    const s2 = Number(s.score2);
    if (Number.isNaN(s1) || Number.isNaN(s2)) return;

    const a = table[m.team1];
    const b = table[m.team2];
    a.played++; b.played++;
    a.gf += s1; a.ga += s2;
    b.gf += s2; b.ga += s1;
    if (s1 > s2) { a.won++; a.points += 3; b.lost++; }
    else if (s1 < s2) { b.won++; b.points += 3; a.lost++; }
    else { a.drawn++; b.drawn++; a.points += 1; b.points += 1; }
  });

  const rows = Object.values(table);
  rows.forEach((r) => { r.gd = r.gf - r.ga; });
  rows.sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf || teamName(x.id).localeCompare(teamName(y.id)));
  return rows;
}

/* ---------- Bracket resolution ---------- */

function bracketMatchById(id) {
  return BRACKET.find((m) => m.id === id);
}

function resolveSlot(matchId, slot) {
  const match = bracketMatchById(matchId);
  const source = match[slot];
  if (source.type === "fixed") return source.team;
  if (source.type === "manual") {
    return (state.bracketPicks[matchId] && state.bracketPicks[matchId][slot]) || null;
  }
  if (source.type === "winner") {
    return getWinner(source.match);
  }
  return null;
}

function getWinner(matchId) {
  const scores = state.bracketScores[matchId];
  if (!scores || scores.score1 === "" || scores.score2 === "" || scores.score1 == null || scores.score2 == null) return null;
  const s1 = Number(scores.score1);
  const s2 = Number(scores.score2);
  if (Number.isNaN(s1) || Number.isNaN(s2) || s1 === s2) return null;
  const team1 = resolveSlot(matchId, "team1");
  const team2 = resolveSlot(matchId, "team2");
  return s1 > s2 ? team1 : team2;
}

/* ---------- Rendering: Schedule tab ---------- */

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
      team1Name: teamName(m.team1),
      team2Name: teamName(m.team2),
      score: state.groupScores[m.id] || {},
      onScoreChange: (field, value) => {
        state.groupScores[m.id] = state.groupScores[m.id] || {};
        state.groupScores[m.id][field] = value;
        saveState();
        renderStandings();
      },
    }));
  });
}

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
      opt.textContent = teamName(id);
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

function scoreInput(value, onChange) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.className = "score-input";
  input.value = value === undefined || value === null ? "" : value;
  input.addEventListener("input", (e) => onChange(e.target.value === "" ? "" : e.target.value));
  return input;
}

/* ---------- Rendering: Standings tab ---------- */

function renderStandings() {
  const container = document.getElementById("standings-body");
  container.innerHTML = "";

  Object.keys(GROUPS).forEach((groupName) => {
    const rows = computeStandings(groupName);
    const table = document.createElement("table");
    table.className = "standings-table";
    table.innerHTML = `
      <caption>${groupName}</caption>
      <thead>
        <tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>
      </thead>
      <tbody></tbody>`;
    const tbody = table.querySelector("tbody");
    rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      if (i < 2) tr.className = "qualified";
      tr.innerHTML = `<td>${i + 1}</td><td class="standings-team">${teamName(r.id)}</td><td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd}</td><td><strong>${r.points}</strong></td>`;
      tbody.appendChild(tr);
    });
    container.appendChild(table);
  });
}

/* ---------- Rendering: Bracket tab ---------- */

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
      const team1Id = resolveSlot(id, "team1");
      const team2Id = resolveSlot(id, "team2");

      const editableTeams = {};
      if (m.team1.type === "manual") editableTeams.team1 = { options: allTeamIds, selected: state.bracketPicks[id] && state.bracketPicks[id].team1 };
      if (m.team2.type === "manual") editableTeams.team2 = { options: allTeamIds, selected: state.bracketPicks[id] && state.bracketPicks[id].team2 };

      const row = matchRow({
        stage: m.stage,
        date: m.date,
        time: m.time,
        fixture: m.fixture,
        group: "",
        team1Name: teamName(team1Id),
        team2Name: teamName(team2Id),
        score: state.bracketScores[id] || {},
        onScoreChange: (field, value) => {
          state.bracketScores[id] = state.bracketScores[id] || {};
          state.bracketScores[id][field] = value;
          saveState();
          renderBracket();
        },
        editableTeams: Object.keys(editableTeams).length ? editableTeams : null,
        onTeamChange: (slot, value) => {
          state.bracketPicks[id] = state.bracketPicks[id] || {};
          state.bracketPicks[id][slot] = value;
          saveState();
          renderBracket();
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

/* ---------- Rendering: Settings tab ---------- */

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
      input.addEventListener("input", (e) => {
        state.teams[id] = e.target.value || DEFAULT_TEAMS[id];
        saveState();
        renderAll();
      });
      row.appendChild(input);
      section.appendChild(row);
    });
    container.appendChild(section);
  });

  const resetBtn = document.getElementById("reset-btn");
  resetBtn.onclick = () => {
    if (confirm("Reset all team names, scores and bracket picks? This cannot be undone.")) {
      localStorage.removeItem(STORAGE_KEY);
      state = loadState();
      renderAll();
    }
  };
}

/* ---------- Tabs ---------- */

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
  renderAll();
});
