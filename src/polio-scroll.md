---
title: The Rise and Fall of Polio
toc: false
---

<style>
#polio-root {
  font-family: var(--sans-serif);
}
#scroll-section {
  position: relative;
}
.sticky-charts {
  position: sticky;
  top: 0;
  background: var(--theme-background, #fff);
  padding: 8px 0 4px;
  z-index: 5;
}
.chart-svg text {
  fill: var(--theme-foreground, #111);
}
.chart-svg .domain {
  stroke: var(--theme-foreground-muted, #888);
}
.chart-svg .tick line {
  stroke: var(--theme-foreground-muted, #888);
}
.scroll-hint {
  text-align: center;
  font-size: 0.9rem;
  color: var(--theme-foreground-muted, #666);
  margin: 0.5rem 0 0;
  letter-spacing: 0.03em;
}
.section-below {
  max-width: 860px;
  margin: 3rem auto;
  padding: 0 1rem;
}
.callout {
  background: var(--theme-background-alt, #f8f9fa);
  border-left: 4px solid #3b82f6;
  padding: 1rem 1.25rem;
  border-radius: 0 6px 6px 0;
  margin: 1.5rem 0;
}
.callout.red { border-left-color: #ef4444; }
</style>

# The Rise and Fall of Polio in the United States

Polio paralyzed tens of thousands of Americans every year at its peak. Two vaccines changed everything.

**Scroll down** to watch more than a century of cases and deaths unfold in real time — from the first recorded outbreaks to near-eradication.

```js
import * as d3 from "npm:d3";

const rawData = await FileAttachment("data/reported-paralytic-polio-cases-and-deaths-in-the-united-states-since-1910.csv").csv({typed: true});

const data = rawData
  .map(d => ({ year: +d.Year, cases: +d.Cases, deaths: +d.Deaths }))
  .filter(d => !isNaN(d.year) && !isNaN(d.cases))
  .sort((a, b) => a.year - b.year);

const MIN_YEAR = 1910;
const MAX_YEAR = 2023;
const START_YEAR = 1915;

const maxCases  = d3.max(data, d => d.cases);
const maxDeaths = d3.max(data, d => d.deaths);

// ── Layout ──────────────────────────────────────────────────────────────────
const margin = { top: 48, right: 30, bottom: 42, left: 75 };
const totalWidth = 860;
const W = totalWidth - margin.left - margin.right;
const H_CASES  = 300;
const H_DEATHS = 240;

// ── Root container ───────────────────────────────────────────────────────────
const root = d3.create("div").attr("id", "polio-root");

// ── Scroll section: sticky chart + tall spacer ───────────────────────────────
const scrollSection = root.append("div").attr("id", "scroll-section");
const sticky = scrollSection.append("div").attr("class", "sticky-charts");

// ── Helper: build one chart SVG ───────────────────────────────────────────────
function buildChart({ title, fillColor, strokeColor, height, yScale, selector }) {
  const svg = sticky.append("svg")
    .attr("class", "chart-svg")
    .attr("width", totalWidth)
    .attr("height", height + margin.top + margin.bottom)
    .style("display", "block");

  // Title
  svg.append("text")
    .attr("x", totalWidth / 2).attr("y", 24)
    .attr("text-anchor", "middle")
    .style("font-size", "14px").style("font-weight", "bold")
    .text(title);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Y-grid
  g.append("g").attr("class", "grid-y")
    .call(d3.axisLeft(yScale).tickSize(-W).tickFormat(""))
    .call(gr => gr.select(".domain").remove())
    .call(gr => gr.selectAll("line").attr("stroke", "#e5e7eb").attr("stroke-opacity", 0.8));

  // Y axis
  g.append("g").attr("class", "y-axis")
    .call(d3.axisLeft(yScale).tickFormat(d3.format(",~s")));

  // Y label
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -62).attr("x", -height / 2)
    .attr("text-anchor", "middle").style("font-size", "12px")
    .text(selector === "cases" ? "Cases" : "Deaths");

  // X axis group (updated on scroll)
  const xAxisG = g.append("g").attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

  // X label (only on deaths chart)
  if (selector === "deaths") {
    g.append("text")
      .attr("x", W / 2).attr("y", height + 38)
      .attr("text-anchor", "middle").style("font-size", "12px")
      .text("Year");
  }

  // Area path
  const areaPath = g.append("path")
    .attr("fill", fillColor).attr("fill-opacity", 0.7)
    .attr("stroke", strokeColor).attr("stroke-width", 1.5);

  // Vaccine lines + labels (cases chart only)
  const vaccineEls = {};
  if (selector === "cases") {
    const vaccines = [
      { year: 1955, label: "IPV (1955)", dy: -95 },
      { year: 1961, label: "OPV (1961)", dy: -70 },
    ];
    vaccines.forEach(v => {
      vaccineEls[`line-${v.year}`] = g.append("line")
        .attr("y1", 0).attr("y2", height)
        .attr("stroke", "#11910f").attr("stroke-dasharray", "4,3")
        .attr("opacity", 0);
      vaccineEls[`label-${v.year}`] = g.append("text")
        .attr("fill", "#0b7509").style("font-size", "11px")
        .attr("opacity", 0).text(v.label);
      vaccineEls[`_dy_${v.year}`] = v.dy;
    });
  } else {
    // Deaths chart also gets vaccine lines (no label)
    [1955, 1961].forEach(yr => {
      vaccineEls[`line-${yr}`] = g.append("line")
        .attr("y1", 0).attr("y2", height)
        .attr("stroke", "#16a34a").attr("stroke-dasharray", "4,3")
        .attr("opacity", 0);
    });
  }

  // Hover overlay, crosshair, dot
  const hoverLine = g.append("line")
    .attr("stroke", "#666").attr("stroke-width", 1)
    .attr("y1", 0).attr("y2", height).attr("opacity", 0).attr("pointer-events", "none");

  const hoverDot = g.append("circle")
    .attr("r", 5).attr("fill", strokeColor).attr("opacity", 0).attr("pointer-events", "none");

  g.append("rect")
    .attr("width", W).attr("height", height).attr("fill", "transparent")
    .on("mousemove", function(event) {
      const [mx] = d3.pointer(event, this);
      // currentX is closure'd from outer scope
      const yr = Math.round(currentX.invert(mx));
      const d = data.find(p => p.year === yr);
      if (!d || d.year > currentMaxYear) {
        hoverLine.attr("opacity", 0);
        hoverDot.attr("opacity", 0);
        tooltip.style("opacity", 0);
        return;
      }
      const cx = currentX(d.year);
      const val = selector === "cases" ? d.cases : d.deaths;
      const cy  = selector === "cases" ? yCases(d.cases) : yDeaths(d.deaths);
      hoverLine.attr("x1", cx).attr("x2", cx).attr("opacity", 1);
      hoverDot.attr("cx", cx).attr("cy", cy).attr("opacity", 1);
      tooltip
        .style("left",  (event.clientX + 14) + "px")
        .style("top",   (event.clientY - 36) + "px")
        .style("opacity", 1)
        .html(`<strong>${d.year}</strong><br>${selector === "cases" ? "Cases" : "Deaths"}: <strong>${d3.format(",")(val)}</strong>`);
    })
    .on("mouseleave", () => {
      hoverLine.attr("opacity", 0);
      hoverDot.attr("opacity", 0);
      tooltip.style("opacity", 0);
    });

  return { areaPath, xAxisG, vaccineEls };
}

// ── Scales ───────────────────────────────────────────────────────────────────
// x scale — domain updated on scroll; range fixed
const yCases  = d3.scaleLinear().domain([0, maxCases  * 1.05]).range([H_CASES,  0]);
const yDeaths = d3.scaleLinear().domain([0, maxDeaths * 1.05]).range([H_DEATHS, 0]);

// currentX is the live x scale used in mousemove closures
let currentX = d3.scaleLinear().domain([MIN_YEAR, START_YEAR]).range([0, W]);
let currentMaxYear = START_YEAR;

// ── Area generators ───────────────────────────────────────────────────────────
const areaCasesGen = d3.area()
  .x(d => currentX(d.year)).y0(H_CASES).y1(d => yCases(d.cases))
  .curve(d3.curveMonotoneX);

const areaDeathsGen = d3.area()
  .x(d => currentX(d.year)).y0(H_DEATHS).y1(d => yDeaths(d.deaths))
  .curve(d3.curveMonotoneX);

// ── Tooltip (fixed position, appended to body) ────────────────────────────────
const tooltip = d3.select("body").append("div")
  .style("position", "fixed")
  .style("background", "rgba(15,15,15,0.82)")
  .style("color", "#fff")
  .style("padding", "6px 11px")
  .style("border-radius", "6px")
  .style("font-size", "13px")
  .style("pointer-events", "none")
  .style("opacity", 0)
  .style("z-index", "1000")
  .style("transition", "opacity 0.1s");

// ── Build charts ──────────────────────────────────────────────────────────────
const casesChart  = buildChart({
  title: "Recorded Polio Cases, United States (1910–2023)",
  fillColor: "#3b82f6", strokeColor: "#1e40af",
  height: H_CASES, yScale: yCases, selector: "cases",
});

const deathsChart = buildChart({
  title: "Recorded Polio Deaths, United States (1910–2023)",
  fillColor: "#ef4444", strokeColor: "#991b1b",
  height: H_DEATHS, yScale: yDeaths, selector: "deaths",
});

// ── Scroll hint ───────────────────────────────────────────────────────────────
sticky.append("p").attr("class", "scroll-hint").html("↓ Scroll to reveal more data");

// ── Scroll spacer ─────────────────────────────────────────────────────────────
scrollSection.append("div").style("height", "5000px");

// ── Update function ───────────────────────────────────────────────────────────
function update(maxYr) {
  currentMaxYear = maxYr;
  currentX = d3.scaleLinear().domain([MIN_YEAR, maxYr]).range([0, W]);

  // Re-bind area generators to updated scale
  areaCasesGen.x(d => currentX(d.year));
  areaDeathsGen.x(d => currentX(d.year));

  const filtered = data.filter(d => d.year <= maxYr);
  if (filtered.length === 0) return;

  // Update area paths
  casesChart.areaPath.attr("d", areaCasesGen(filtered));
  deathsChart.areaPath.attr("d", areaDeathsGen(filtered));

  // Update x axes — fewer ticks when range is narrow
  const range = maxYr - MIN_YEAR;
  const tickCount = range <= 8 ? range : range <= 20 ? 5 : range <= 50 ? 8 : 12;
  const xAxisFn = d3.axisBottom(currentX).tickFormat(d3.format("d")).ticks(tickCount);
  casesChart.xAxisG.call(xAxisFn);
  deathsChart.xAxisG.call(xAxisFn);

  // Vaccine markers
  [1955, 1961].forEach(yr => {
    const show = maxYr >= yr;
    const vx = currentX(yr);

    // Cases chart line + label
    casesChart.vaccineEls[`line-${yr}`]
      .attr("x1", vx).attr("x2", vx).attr("opacity", show ? 1 : 0);
    if (casesChart.vaccineEls[`label-${yr}`]) {
      casesChart.vaccineEls[`label-${yr}`]
        .attr("x", vx + 5)
        .attr("y", H_CASES + casesChart.vaccineEls[`_dy_${yr}`])
        .attr("opacity", show ? 1 : 0);
    }

    // Deaths chart line
    deathsChart.vaccineEls[`line-${yr}`]
      .attr("x1", vx).attr("x2", vx).attr("opacity", show ? 1 : 0);
  });

  // Hide scroll hint once we've seen all data
  if (maxYr >= MAX_YEAR - 2) {
    sticky.select(".scroll-hint").style("opacity", 0);
  } else {
    sticky.select(".scroll-hint").style("opacity", 1);
  }
}

// ── Scroll listener ───────────────────────────────────────────────────────────
function onScroll() {
  const sec = document.getElementById("scroll-section");
  if (!sec) return;
  const rect      = sec.getBoundingClientRect();
  const scrolled  = -rect.top;
  const scrollable = sec.offsetHeight - window.innerHeight;
  const progress  = Math.max(0, Math.min(1, scrolled / scrollable));
  const targetYear = START_YEAR + progress * (MAX_YEAR - START_YEAR);
  update(targetYear);
}

window.addEventListener("scroll", onScroll, { passive: true });

// Initial render
update(START_YEAR);

display(root.node());
```

---

## What the data shows

<div class="section-below">

<div class="callout">
<strong>Before vaccines</strong> — Polio epidemics struck the U.S. repeatedly from the early 1900s. The worst year on record was <strong>1952</strong>, with <strong>57,879 cases</strong> — roughly one American in every 3,000.
</div>

<div class="callout">
<strong>The Salk vaccine (IPV, 1955)</strong> — Jonas Salk's inactivated poliovirus vaccine was declared safe and effective in April 1955. Within three years, cases fell by over 80%.
</div>

<div class="callout red" style="border-left-color: #ef4444">
<strong>The Sabin vaccine (OPV, 1961)</strong> — Albert Sabin's oral polio vaccine was licensed in 1961. Easier to administer and longer-lasting in communities, it drove cases into the single digits within a decade.
</div>

By the 1970s, indigenous polio transmission had effectively ended in the United States. The last case of wild poliovirus in the U.S. was reported in **1979**.

</div>
