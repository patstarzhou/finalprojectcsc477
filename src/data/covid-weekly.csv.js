// Observable Framework data loader: aggregate daily COVID data to weekly
import {csvParse, csvFormat} from "d3-dsv";
import {utcParse} from "d3-time-format";
import {readFileSync} from "fs";

// Get the Sunday (week start) for a given date
function getSunday(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? 0 : -day;  // if Sunday, 0; else go back to previous Sunday
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
}

// Read raw WHO daily data
const raw = readFileSync("src/data/WHO-covid19-daily-reports-deaths.csv", "utf-8");
const data = csvParse(raw);

// Parse dates (M/D/YYYY format) and extract US data
const parseDate = utcParse("%m/%d/%Y");
const parsed = data
  .filter(d => d.Country_code === "US")
  .map(d => {
    const date = parseDate(d.Date_reported);
    return {
      date,
      cases: +d.New_cases || 0,
      deaths: +d.New_deaths || 0,
    };
  })
  .filter(d => d.date !== null)
  .sort((a, b) => a.date - b.date);

// Group by week (Sunday as week start)
const weekMap = new Map();
for (const d of parsed) {
  const weekKey = getSunday(d.date).getTime();
  if (!weekMap.has(weekKey)) {
    weekMap.set(weekKey, { cases: 0, deaths: 0 });
  }
  const week = weekMap.get(weekKey);
  week.cases += d.cases;
  week.deaths += d.deaths;
}

// Format for CSV output: Week (ISO date), Cases, Deaths
const weekly = Array.from(weekMap.entries())
  .map(([timestamp, totals]) => ({
    Week: new Date(timestamp).toISOString().split("T")[0],
    Cases: totals.cases,
    Deaths: totals.deaths,
  }))
  .sort((a, b) => new Date(a.Week) - new Date(b.Week));

// Output CSV to stdout
process.stdout.write(csvFormat(weekly));
