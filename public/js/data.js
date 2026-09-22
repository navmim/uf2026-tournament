/* UF2026 tournament data: fixtures and bracket structure (static),
   transcribed from Unite_Fiesta_Edition_1_Group_Stage_Schedule.xlsx
   (the post-draw group stage schedule). Team names and results are
   dynamic and come from the backend at /api/state.

   Format: single round-robin within each 5-team group; top 4 from
   each group advance to the quarter-finals. */

const GROUPS = {
  "GROUP A": ["T01", "T03", "T05", "T07", "T09"],
  "GROUP B": ["T02", "T04", "T06", "T08", "T10"],
};

/* Group stage fixtures, exactly as listed in the post-draw schedule */
const GROUP_MATCHES = [
  { id: "M01", date: "Thu 24 Sep", time: "3:00 PM", fixture: "Group Match 01", group: "GROUP A", team1: "T05", team2: "T03" },
  { id: "M02", date: "Thu 24 Sep", time: "4:00 PM", fixture: "Group Match 02", group: "GROUP A", team1: "T09", team2: "T01" },
  { id: "M03", date: "Thu 24 Sep", time: "5:00 PM", fixture: "Group Match 03", group: "GROUP B", team1: "T02", team2: "T04" },
  { id: "M04", date: "Fri 25 Sep", time: "3:00 PM", fixture: "Group Match 04", group: "GROUP B", team1: "T10", team2: "T08" },
  { id: "M05", date: "Fri 25 Sep", time: "4:00 PM", fixture: "Group Match 05", group: "GROUP A", team1: "T07", team2: "T03" },
  { id: "M06", date: "Fri 25 Sep", time: "5:00 PM", fixture: "Group Match 06", group: "GROUP A", team1: "T05", team2: "T09" },
  { id: "M07", date: "Sat 26 Sep", time: "3:00 PM", fixture: "Group Match 07", group: "GROUP B", team1: "T06", team2: "T04" },
  { id: "M08", date: "Sat 26 Sep", time: "4:00 PM", fixture: "Group Match 08", group: "GROUP B", team1: "T02", team2: "T10" },
  { id: "M09", date: "Sat 26 Sep", time: "5:00 PM", fixture: "Group Match 09", group: "GROUP A", team1: "T07", team2: "T01" },
  { id: "M10", date: "Sun 27 Sep", time: "3:00 PM", fixture: "Group Match 10", group: "GROUP A", team1: "T03", team2: "T09" },
  { id: "M11", date: "Sun 27 Sep", time: "4:00 PM", fixture: "Group Match 11", group: "GROUP B", team1: "T06", team2: "T08" },
  { id: "M12", date: "Sun 27 Sep", time: "5:00 PM", fixture: "Group Match 12", group: "GROUP B", team1: "T04", team2: "T10" },
  { id: "M13", date: "Mon 28 Sep", time: "3:00 PM", fixture: "Group Match 13", group: "GROUP A", team1: "T07", team2: "T09" },
  { id: "M14", date: "Mon 28 Sep", time: "4:00 PM", fixture: "Group Match 14", group: "GROUP A", team1: "T01", team2: "T05" },
  { id: "M15", date: "Mon 28 Sep", time: "5:00 PM", fixture: "Group Match 15", group: "GROUP B", team1: "T06", team2: "T10" },
  { id: "M16", date: "Tue 29 Sep", time: "3:00 PM", fixture: "Group Match 16", group: "GROUP B", team1: "T08", team2: "T02" },
  { id: "M17", date: "Tue 29 Sep", time: "4:00 PM", fixture: "Group Match 17", group: "GROUP A", team1: "T07", team2: "T05" },
  { id: "M18", date: "Tue 29 Sep", time: "5:00 PM", fixture: "Group Match 18", group: "GROUP A", team1: "T01", team2: "T03" },
  { id: "M19", date: "Wed 30 Sep", time: "3:00 PM", fixture: "Group Match 19", group: "GROUP B", team1: "T06", team2: "T02" },
  { id: "M20", date: "Wed 30 Sep", time: "4:00 PM", fixture: "Group Match 20", group: "GROUP B", team1: "T08", team2: "T04" },
];

/* Knockout bracket. team1/team2 sources:
   { type: "fixed", team: "T01" }  - team locked in
   { type: "manual" }              - admin picks the team manually
   { type: "winner", match: "QF1" }- auto-filled once that match has a result

   The schedule doesn't specify a fixed crossover (e.g. 1A vs 4B), so all
   eight quarter-final slots are picked manually once group standings
   are final. */
const BRACKET = [
  { id: "QF1", stage: "Quarter-final", date: "Thu 1 Oct", time: "8:00 PM", fixture: "QF1", team1: { type: "manual" }, team2: { type: "manual" } },
  { id: "QF2", stage: "Quarter-final", date: "Thu 1 Oct", time: "9:00 PM", fixture: "QF2", team1: { type: "manual" }, team2: { type: "manual" } },
  { id: "QF3", stage: "Quarter-final", date: "Thu 1 Oct", time: "10:00 PM", fixture: "QF3", team1: { type: "manual" }, team2: { type: "manual" } },
  { id: "QF4", stage: "Quarter-final", date: "Thu 1 Oct", time: "11:00 PM", fixture: "QF4", team1: { type: "manual" }, team2: { type: "manual" } },
  { id: "SF1", stage: "Semi-final", date: "Fri 2 Oct", time: "8:00 PM", fixture: "SF1", team1: { type: "winner", match: "QF1" }, team2: { type: "winner", match: "QF2" } },
  { id: "SF2", stage: "Semi-final", date: "Fri 2 Oct", time: "9:15 PM", fixture: "SF2", team1: { type: "winner", match: "QF3" }, team2: { type: "winner", match: "QF4" } },
  { id: "FINAL", stage: "Final", date: "Sat 3 Oct", time: "9:00 PM", fixture: "GRAND FINAL", team1: { type: "winner", match: "SF1" }, team2: { type: "winner", match: "SF2" } },
];

const NO_BREAK_DAY = { date: "Sat 3 Oct", label: "No break day - Final day" };

const QUALIFIERS_PER_GROUP = 4;
