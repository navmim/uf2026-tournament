/* Standings and bracket-resolution logic shared between the public
   (read-only) and admin (editable) pages. Both operate on a `state`
   object shaped like { teams, groupScores, bracketPicks, bracketScores }
   fetched from /api/state. */

function teamName(state, id) {
  return (id && state.teams[id]) || "—";
}

function computeStandings(state, groupName) {
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
  rows.sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf || teamName(state, x.id).localeCompare(teamName(state, y.id)));
  return rows;
}

function bracketMatchById(id) {
  return BRACKET.find((m) => m.id === id);
}

function resolveSlot(state, matchId, slot) {
  const match = bracketMatchById(matchId);
  const source = match[slot];
  if (source.type === "fixed") return source.team;
  if (source.type === "manual") {
    return (state.bracketPicks[matchId] && state.bracketPicks[matchId][slot]) || null;
  }
  if (source.type === "winner") {
    return getWinner(state, source.match);
  }
  return null;
}

function getWinner(state, matchId) {
  const scores = state.bracketScores[matchId];
  if (!scores || scores.score1 === "" || scores.score2 === "" || scores.score1 == null || scores.score2 == null) return null;
  const s1 = Number(scores.score1);
  const s2 = Number(scores.score2);
  if (Number.isNaN(s1) || Number.isNaN(s2) || s1 === s2) return null;
  const team1 = resolveSlot(state, matchId, "team1");
  const team2 = resolveSlot(state, matchId, "team2");
  return s1 > s2 ? team1 : team2;
}
