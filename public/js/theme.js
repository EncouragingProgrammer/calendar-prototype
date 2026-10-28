// Seasonal colour theme.
// Sets <html data-season="..."> so style.css can swap colours by season.
// Loaded in <head> so the page never flashes the wrong colours.
//
// Preview any season by adding ?season=fall (or another name) to the URL.

const SEASONS = [
  // name, start month/day, end month/day (inclusive). Months are 1 to 12.
  { name: 'fall', start: [9, 21], end: [12, 21] },
  // TODO: add winter, spring and summer themes here and in style.css
];

function currentSeason(date = new Date()) {
  const md = (date.getMonth() + 1) * 100 + date.getDate(); // e.g. Oct 27 -> 1027
  for (const s of SEASONS) {
    const start = s.start[0] * 100 + s.start[1];
    const end = s.end[0] * 100 + s.end[1];
    // Handles ranges that wrap past New Year too (e.g. Dec 22 to Mar 19)
    const inRange = start <= end ? md >= start && md <= end : md >= start || md <= end;
    if (inRange) return s.name;
  }
  return 'default';
}

const override = new URLSearchParams(window.location.search).get('season');
document.documentElement.dataset.season = override || currentSeason();
