/* Public, read-only view. Polls the backend so results show up live
   without a page reload, but has no way to write data. */

const POLL_INTERVAL_MS = 15000;

let state = { teams: {}, groupScores: {}, bracketPicks: {}, bracketScores: {} };

async function fetchState() {
  try {
    const res = await fetch("/api/state");
    if (!res.ok) throw new Error("bad response");
    state = await res.json();
    document.getElementById("load-error").style.display = "none";
    renderAll();
  } catch (e) {
    document.getElementById("load-error").style.display = "block";
  }
}

function readOnlyRow({ stage, date, time, fixture, group, team1Name, team2Name, score1, score2 }) {
  const row = document.createElement("div");
  row.className = "match-row";

  const meta = document.createElement("div");
  meta.className = "match-meta";
  meta.innerHTML = `<span class="match-stage">${stage}</span><span class="match-date">${date}${time ? " · " + time : ""}</span><span class="match-fixture">${fixture}${group ? " · " + group : ""}</span>`;
  row.appendChild(meta);

  const hasScore = score1 !== undefined && score1 !== null && score1 !== "" && score2 !== undefined && score2 !== null && score2 !== "";

  const teamsWrap = document.createElement("div");
  teamsWrap.className = "match-teams";
  teamsWrap.innerHTML = `
    <span class="team-name${team1Name === "—" ? " team-tbd" : ""}">${team1Name}</span>
    <span class="match-score-display">${hasScore ? `${score1} – ${score2}` : "vs"}</span>
    <span class="team-name${team2Name === "—" ? " team-tbd" : ""}" style="text-align:right">${team2Name}</span>`;
  row.appendChild(teamsWrap);

  return row;
}

function renderSchedule() {
  const container = document.getElementById("schedule-body");
  container.innerHTML = "";
  GROUP_MATCHES.forEach((m) => {
    const s = state.groupScores[m.id] || {};
    container.appendChild(readOnlyRow({
      stage: "Group Stage",
      date: m.date,
      time: m.time,
      fixture: m.fixture,
      group: m.group,
      team1Name: teamName(state, m.team1),
      team2Name: teamName(state, m.team2),
      score1: s.score1,
      score2: s.score2,
    }));
  });
}

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

function renderBracket() {
  const container = document.getElementById("bracket-body");
  container.innerHTML = "";
  const stages = [
    { title: "Quarter-finals", ids: ["QF1", "QF2", "QF3", "QF4"] },
    { title: "Semi-finals", ids: ["SF1", "SF2"] },
    { title: "Final", ids: ["FINAL"] },
  ];
  stages.forEach((stageDef) => {
    const stageWrap = document.createElement("div");
    stageWrap.className = "bracket-stage";
    const heading = document.createElement("h3");
    heading.textContent = stageDef.title;
    stageWrap.appendChild(heading);

    stageDef.ids.forEach((id) => {
      const m = bracketMatchById(id);
      const s = state.bracketScores[id] || {};
      stageWrap.appendChild(readOnlyRow({
        stage: m.stage,
        date: m.date,
        time: m.time,
        fixture: m.fixture,
        group: "",
        team1Name: teamName(state, resolveSlot(state, id, "team1")),
        team2Name: teamName(state, resolveSlot(state, id, "team2")),
        score1: s.score1,
        score2: s.score2,
      }));
    });
    container.appendChild(stageWrap);
  });

  const noBreak = document.createElement("p");
  noBreak.className = "bracket-note";
  noBreak.textContent = `${NO_BREAK_DAY.date}: ${NO_BREAK_DAY.label}`;
  container.appendChild(noBreak);
}

function renderAll() {
  renderSchedule();
  renderStandings();
  renderBracket();
}

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

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  fetchState();
  setInterval(fetchState, POLL_INTERVAL_MS);
});
