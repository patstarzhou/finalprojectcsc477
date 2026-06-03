---
title: The Impact of COVID-19 Vaccines
toc: false
---

<style>
#covid-root {
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

/* ── Interactive section ── */
#interactive-root { font-family: var(--sans-serif); }
.i-controls {
  display: flex; flex-wrap: wrap; gap: 0.45rem;
  align-items: center; justify-content: center; margin: 0.75rem 0;
}
.i-btn {
  padding: 4px 12px; border-radius: 5px; border: 1px solid #ccc;
  cursor: pointer; font-size: 12.5px;
  background: var(--theme-background, #fff);
  color: var(--theme-foreground, #111);
  transition: background 0.15s, color 0.15s;
}
.i-btn:hover { background: var(--theme-background-alt, #f0f0f0); }
.i-btn.toggle { border-color: #3b82f6; color: #3b82f6; }
.i-btn.toggle.mort { border-color: #d97706; color: #d97706; }
.i-btn.toggle.on { background: #3b82f6; color: #fff; }
.i-btn.toggle.mort.on { background: #d97706; color: #fff; border-color: #d97706; }
.i-sep { border-left: 1px solid #ccc; height: 22px; display: inline-block; margin: 0 2px; }
.i-sliders {
  display: flex; align-items: center; gap: 0.6rem;
  justify-content: center; margin: 0.3rem 0 0.8rem; flex-wrap: wrap;
}
.sl-val { font-size: 13px; min-width: 38px; font-variant-numeric: tabular-nums; text-align: center; font-weight: 600; }
.sl-hint { font-size: 11.5px; color: var(--theme-foreground-muted, #888); margin-left: 0.5rem; }
.sl-handle { filter: drop-shadow(0 1px 3px rgba(0,0,0,0.25)); }
.i-stats {
  text-align: center;
  font-size: 13px;
  color: var(--theme-foreground-muted, #555);
  margin: 0.2rem 0 0.6rem;
  letter-spacing: 0.01em;
}
.i-stats strong { color: var(--theme-foreground, #111); }
.ichart text { fill: var(--theme-foreground, #111); }
.ichart .domain { stroke: var(--theme-foreground-muted, #888); }
.ichart .tick line { stroke: var(--theme-foreground-muted, #888); }
</style>

# The Impact of COVID-19 Vaccines in the United States

COVID-19 killed over a million of Americans within the span of 3 years.

**Scroll down** to watch six years of cases and deaths unfold in real time.

```js
import * as d3 from "npm:d3";

const rawData = await FileAttachment("data/covid-weekly.csv").csv({typed: true});

const data = rawData
  .map(d => ({ date: new Date(d.Week), cases: +d.Cases, deaths: +d.Deaths }))
  .filter(d => !isNaN(d.date.getTime()) && !isNaN(d.cases))
  .sort((a, b) => a.date - b.date);

const dataByTime = new Map(data.map(d => [d.date.getTime(), d]));

const MIN_DATE = new Date("2020-01-05");
const MAX_DATE = new Date("2026-05-05");
const START_DATE = new Date("2020-02-01");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_WINDOW_MS = WEEK_MS;

const fmtAxisShort = d3.utcFormat("%b %-d");
const fmtAxisMonth = d3.utcFormat("%b %Y");
const fmtTip = d3.utcFormat("%b %-d, %Y");

function clampDate(ms) {
  return new Date(Math.max(MIN_DATE.getTime(), Math.min(MAX_DATE.getTime(), ms)));
}

function snapToWeek(dateLike) {
  const ms = dateLike instanceof Date ? dateLike.getTime() : +dateLike;
  const snapped = MIN_DATE.getTime() + Math.round((ms - MIN_DATE.getTime()) / WEEK_MS) * WEEK_MS;
  return clampDate(snapped);
}

function getTickInterval(minDate, maxDate) {
  const weeks = (maxDate - minDate) / WEEK_MS;
  if (weeks <= 12) return d3.utcWeek.every(1);
  if (weeks <= 24) return d3.utcWeek.every(2);
  if (weeks <= 60) return d3.utcMonth.every(1);
  if (weeks <= 120) return d3.utcMonth.every(2);
  return d3.utcMonth.every(4);
}

function makeTimeAxis(scale, minDate, maxDate) {
  const weeks = (maxDate - minDate) / WEEK_MS;
  const interval = getTickInterval(minDate, maxDate);
  const formatter = weeks <= 14 ? fmtAxisShort : fmtAxisMonth;
  return d3.axisBottom(scale).ticks(interval).tickFormat(formatter);
}

function styleTimeAxisLabels(axisG) {
  axisG.selectAll("text")
    .style("text-anchor", "end")
    .attr("transform", "rotate(-35)")
    .attr("dx", "-0.55em")
    .attr("dy", "0.35em");
}

const maxCases  = d3.max(data, d => d.cases);
const maxDeaths = d3.max(data, d => d.deaths);

// ── Layout ──────────────────────────────────────────────────────────────────
const margin = { top: 48, right: 30, bottom: 42, left: 75 };
const totalWidth = 860;
const W = totalWidth - margin.left - margin.right;
const H_CASES  = 300;
const H_DEATHS = 240;

// ── Root container ───────────────────────────────────────────────────────────
const root = d3.create("div").attr("id", "covid-root");

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
      // .text("Year");
  }

  // Area path
  const areaPath = g.append("path")
    .attr("fill", fillColor).attr("fill-opacity", 0.7)
    .attr("stroke", strokeColor).attr("stroke-width", 1.5);

  // Vaccine lines + labels (cases chart only)
  const vaccineEls = {};
  if (selector === "cases") {
    const vaccines = [
      { date: new Date("2020-12-14"), label: "Vaccines (Dec 2020)", dy: -90 },
    ];
    vaccines.forEach(v => {
      const key = v.date.toISOString().split("T")[0];  // "2020-12-14"
      vaccineEls[`line-${key}`] = g.append("line")
        .attr("y1", 0).attr("y2", height)
        .attr("stroke", "#11910f").attr("stroke-dasharray", "4,3")
        .attr("opacity", 0);
      vaccineEls[`label-${key}`] = g.append("text")
        .attr("fill", "#0b7509").style("font-size", "11px")
        .attr("opacity", 0).text(v.label);
      vaccineEls[`_dy_${key}`] = v.dy;
    });
  } else {
    // Deaths chart also gets vaccine lines (no label)
    const vdate = new Date("2020-12-14");
    const key = vdate.toISOString().split("T")[0];
    vaccineEls[`line-${key}`] = g.append("line")
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "#16a34a").attr("stroke-dasharray", "4,3")
      .attr("opacity", 0);
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
      const d = dataByTime.get(snapToWeek(currentX.invert(mx)).getTime());
      if (!d || d.date > currentMaxYear) {
        hoverLine.attr("opacity", 0);
        hoverDot.attr("opacity", 0);
        tooltip.style("opacity", 0);
        return;
      }
      const cx = currentX(d.date);
      const val = selector === "cases" ? d.cases : d.deaths;
      const cy  = selector === "cases" ? yCases(d.cases) : yDeaths(d.deaths);
      hoverLine.attr("x1", cx).attr("x2", cx).attr("opacity", 1);
      hoverDot.attr("cx", cx).attr("cy", cy).attr("opacity", 1);
      tooltip
        .style("left",  (event.clientX + 14) + "px")
        .style("top",   (event.clientY - 36) + "px")
        .style("opacity", 1)
        .html(`<strong>${fmtTip(d.date)}</strong><br>${selector === "cases" ? "Cases" : "Deaths"}: <strong>${d3.format(",")(val)}</strong>`);
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
let currentX = d3.scaleTime().domain([MIN_DATE, START_DATE]).range([0, W]);
let currentMaxYear = START_DATE;

// ── Area generators ───────────────────────────────────────────────────────────
const areaCasesGen = d3.area()
  .x(d => currentX(d.date)).y0(H_CASES).y1(d => yCases(d.cases))
  .curve(d3.curveMonotoneX);

const areaDeathsGen = d3.area()
  .x(d => currentX(d.date)).y0(H_DEATHS).y1(d => yDeaths(d.deaths))
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
  title: "Recorded COVID-19 Cases, United States (Jan 2020 – May 2026)",
  fillColor: "#3b82f6", strokeColor: "#1e40af",
  height: H_CASES, yScale: yCases, selector: "cases",
});

const deathsChart = buildChart({
  title: "Recorded COVID-19 Deaths, United States (Jan 2020 – May 2026)",
  fillColor: "#ef4444", strokeColor: "#991b1b",
  height: H_DEATHS, yScale: yDeaths, selector: "deaths",
});

// ── Scroll hint ───────────────────────────────────────────────────────────────
sticky.append("p").attr("class", "scroll-hint").html("↓ Scroll to reveal more data");

// ── Scroll spacer ─────────────────────────────────────────────────────────────
scrollSection.append("div").style("height", "5000px");

// ── Update function ───────────────────────────────────────────────────────────
function update(maxYr) {
  currentMaxYear = snapToWeek(maxYr);
  currentX = d3.scaleTime().domain([MIN_DATE, currentMaxYear]).range([0, W]);

  // Re-bind area generators to updated scale
  areaCasesGen.x(d => currentX(d.date));
  areaDeathsGen.x(d => currentX(d.date));

  const filtered = data.filter(d => d.date <= currentMaxYear);
  if (filtered.length === 0) return;

  // Update area paths
  casesChart.areaPath.attr("d", areaCasesGen(filtered));
  deathsChart.areaPath.attr("d", areaDeathsGen(filtered));

  // Update x axes — fewer ticks when range is narrow
  const xAxisFn = makeTimeAxis(currentX, MIN_DATE, currentMaxYear);
  casesChart.xAxisG.call(xAxisFn);
  deathsChart.xAxisG.call(xAxisFn);
  styleTimeAxisLabels(casesChart.xAxisG);
  styleTimeAxisLabels(deathsChart.xAxisG);

  // Vaccine markers
  const vaccineDate = new Date("2020-12-14");
  const vaccKey = "2020-12-14";  // ISO string key
  const show = currentMaxYear >= vaccineDate;
  const vx = currentX(vaccineDate);

  // Cases chart line + label
  casesChart.vaccineEls[`line-${vaccKey}`]
    .attr("x1", vx).attr("x2", vx).attr("opacity", show ? 1 : 0);
  if (casesChart.vaccineEls[`label-${vaccKey}`]) {
    casesChart.vaccineEls[`label-${vaccKey}`]
      .attr("x", vx + 5)
      .attr("y", H_CASES + casesChart.vaccineEls[`_dy_${vaccKey}`])
      .attr("opacity", show ? 1 : 0);
  }

  // Deaths chart line
  deathsChart.vaccineEls[`line-${vaccKey}`]
    .attr("x1", vx).attr("x2", vx).attr("opacity", show ? 1 : 0);

  // Hide scroll hint once we've seen all data
  if (currentMaxYear >= MAX_DATE - WEEK_MS) {
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
  const targetYear = START_DATE.getTime() + progress * (MAX_DATE.getTime() - START_DATE.getTime());
  update(targetYear);
}

window.addEventListener("scroll", onScroll, { passive: true });

// Initial render
update(START_DATE);

display(root.node());
```

---

## Explore the Data

Adjust the year range with the sliders, drag on the **cases chart** to zoom in, or use the preset buttons for key eras. Double-click either chart to reset. Overlay the mortality rate (deaths ÷ cases) to see how treatment improved.

```js
/* Interactive section */

let iMinDate = MIN_DATE, iMaxDate = MAX_DATE;
let iShowMortality = false;

const IM  = { top: 50, right: 70, bottom: 42, left: 78 };
const ITW = 860;
const IW  = ITW - IM.left - IM.right;
const IHC = 290;   // cases chart inner height
const IHD = 220;   // deaths chart inner height

// ── Root ────────────────────────────────────────────────────────────────────
const iRoot = d3.create("div").attr("id", "interactive-root");

// ── Controls ─────────────────────────────────────────────────────────────────
const iCtrl = iRoot.append("div").attr("class", "i-controls");

const iPresets = [
  { label: "Early 2020",       min: new Date("2020-01-01"), max: new Date("2020-06-30") },
  { label: "Pre-Vaccine Peak", min: new Date("2020-10-01"), max: new Date("2021-01-31") },
  { label: "Post-Vaccine",     min: new Date("2021-01-01"), max: new Date("2022-12-31") },
  { label: "All Years",        min: MIN_DATE, max: MAX_DATE },
];
iPresets.forEach(p => {
  iCtrl.append("button").attr("class", "i-btn preset").text(p.label)
    .on("click", () => { iMinDate = p.min; iMaxDate = p.max; iUpdate(); iSyncSliders(); });
});

iCtrl.append("span").attr("class", "i-sep");

const iMortBtn = iCtrl.append("button").attr("class", "i-btn toggle mort").text("Mortality Rate %")
  .on("click", function () {
    iShowMortality = !iShowMortality;
    d3.select(this).classed("on", iShowMortality);
    iUpdate();
  });

// ── Dual-handle year range slider (D3 SVG) ────────────────────────────────────
const SLIDER_W   = 620;
const SLIDER_PAD = 14;   // room for handle radius at each end
const SLIDER_TW  = SLIDER_W - SLIDER_PAD * 2;
const sliderScale = d3.scaleTime().domain([MIN_DATE, MAX_DATE]).range([0, SLIDER_TW]).clamp(true);

const sliderWrap = iRoot.append("div").attr("class", "i-sliders");
const slMinLbl = sliderWrap.append("span").attr("class", "sl-val").text("Jan 2020");

const sliderSvg = sliderWrap.append("svg")
  .attr("width", SLIDER_W).attr("height", 44).style("vertical-align", "middle").style("overflow","visible");
const slG = sliderSvg.append("g").attr("transform", `translate(${SLIDER_PAD},22)`);

// Background track
slG.append("line").attr("x1", 0).attr("x2", SLIDER_TW)
  .attr("stroke", "#ddd").attr("stroke-width", 5).attr("stroke-linecap", "round");
// Active track (between handles)
const slActive = slG.append("line")
  .attr("stroke", "#3b82f6").attr("stroke-width", 5).attr("stroke-linecap", "round");
// Year tick marks
d3.utcYear.range(d3.utcYear.floor(MIN_DATE), d3.utcYear.offset(MAX_DATE, 1)).forEach(dt => {
  slG.append("line").attr("x1", sliderScale(dt)).attr("x2", sliderScale(dt))
    .attr("y1", 6).attr("y2", 11).attr("stroke", "#bbb").attr("stroke-width", 1);
});
// Handles
const slMinH = slG.append("circle").attr("r", 10).attr("class","sl-handle")
  .attr("fill","#3b82f6").attr("stroke","#fff").attr("stroke-width",2.5).style("cursor","ew-resize");
const slMaxH = slG.append("circle").attr("r", 10).attr("class","sl-handle")
  .attr("fill","#3b82f6").attr("stroke","#fff").attr("stroke-width",2.5).style("cursor","ew-resize");

const slMaxLbl = sliderWrap.append("span").attr("class", "sl-val").text("May 2026");
sliderWrap.append("span").attr("class", "sl-hint").text("drag handles · double-click chart to reset");

// ── Stats row (sits between slider and charts, updates with range) ────────────
const iStatsEl = iRoot.append("div").attr("class", "i-stats");

function sliderRender() {
  const x0 = sliderScale(iMinDate), x1 = sliderScale(iMaxDate);
  slMinH.attr("cx", x0);
  slMaxH.attr("cx", x1);
  slActive.attr("x1", x0).attr("x2", x1);
  slMinLbl.text(fmtAxisMonth(iMinDate));
  slMaxLbl.text(fmtAxisMonth(iMaxDate));
}

slMinH.call(d3.drag().on("drag", function (event) {
  const candidate = snapToWeek(sliderScale.invert(event.x));
  const upper = new Date(iMaxDate.getTime() - MIN_WINDOW_MS);
  iMinDate = new Date(Math.max(MIN_DATE.getTime(), Math.min(upper.getTime(), candidate.getTime())));
  sliderRender(); iUpdate();
}));
slMaxH.call(d3.drag().on("drag", function (event) {
  const candidate = snapToWeek(sliderScale.invert(event.x));
  const lower = new Date(iMinDate.getTime() + MIN_WINDOW_MS);
  iMaxDate = new Date(Math.min(MAX_DATE.getTime(), Math.max(lower.getTime(), candidate.getTime())));
  sliderRender(); iUpdate();
}));

// ── Scales ────────────────────────────────────────────────────────────────────
const ix = d3.scaleTime().range([0, IW]);
let iyCases, iyDeaths, iyMort;

function iComputeScales() {
  const vis  = data.filter(d => d.date >= iMinDate && d.date <= iMaxDate);
  const maxC = d3.max(vis, d => d.cases)  || 1;
  const maxD = d3.max(vis, d => d.deaths) || 1;
  // Mortality capped at 100%: deaths can't exceed cases in reality
  const maxM = Math.min(100, d3.max(vis.filter(d => d.cases > 0), d => d.deaths / d.cases * 100) || 1);
  ix.domain([iMinDate, iMaxDate]);
  iyCases  = d3.scaleLinear().domain([0, maxC * 1.05]).range([IHC, 0]);
  iyDeaths = d3.scaleLinear().domain([0, maxD * 1.05]).range([IHD, 0]);
  iyMort   = d3.scaleLinear().domain([0, maxM * 1.1]).range([IHC, 0]);
}

// ── SVG builders ──────────────────────────────────────────────────────────────
function makeiSVG(h, clipId, titleText) {
  const svg = iRoot.append("svg").attr("class","ichart")
    .attr("width", ITW).attr("height", h + IM.top + IM.bottom)
    .style("display","block").style("overflow","visible");
  svg.append("defs").append("clipPath").attr("id", clipId)
    .append("rect").attr("width", IW).attr("height", h);
  svg.append("text").attr("x", ITW / 2).attr("y", 22).attr("text-anchor","middle")
    .style("font-size","14px").style("font-weight","bold").text(titleText);
  return { svg, g: svg.append("g").attr("transform", `translate(${IM.left},${IM.top})`) };
}

const { svg: iSvgC, g: iGC } = makeiSVG(IHC, "iclip-c", "Recorded COVID-19 Cases, United States");
const { svg: iSvgD, g: iGD } = makeiSVG(IHD, "iclip-d", "Recorded COVID-19 Deaths, United States");

// ── Persistent chart elements ─────────────────────────────────────────────────
const iGrC  = iGC.append("g").attr("class","igrid-y");
const iGrD  = iGD.append("g").attr("class","igrid-y");
const iYAC  = iGC.append("g").attr("class","iy-axis");
const iYAD  = iGD.append("g").attr("class","iy-axis");
const iXAC  = iGC.append("g").attr("class","ix-axis").attr("transform",`translate(0,${IHC})`);
const iXAD  = iGD.append("g").attr("class","ix-axis").attr("transform",`translate(0,${IHD})`);

// Y labels
iGC.append("text").attr("transform","rotate(-90)").attr("y",-65).attr("x",-IHC/2).attr("text-anchor","middle").style("font-size","12px").text("Cases");
iGD.append("text").attr("transform","rotate(-90)").attr("y",-65).attr("x",-IHD/2).attr("text-anchor","middle").style("font-size","12px").text("Deaths");
// X label (deaths only)
// iGD.append("text").attr("x",IW/2).attr("y",IHD+36).attr("text-anchor","middle").style("font-size","12px").text("Year");

// Area paths
const iPathC = iGC.append("path").attr("clip-path","url(#iclip-c)").attr("fill","#3b82f6").attr("fill-opacity",0.7).attr("stroke","#1e40af").attr("stroke-width",1.5);
const iPathD = iGD.append("path").attr("clip-path","url(#iclip-d)").attr("fill","#ef4444").attr("fill-opacity",0.7).attr("stroke","#991b1b").attr("stroke-width",1.5);

// Mortality line + right axis
const iMortPath  = iGC.append("path").attr("clip-path","url(#iclip-c)").attr("fill","none").attr("stroke","#d97706").attr("stroke-width",2.5).attr("opacity",0);
const iMortAxisG = iGC.append("g").attr("transform",`translate(${IW},0)`);
const iMortAxisLbl = iSvgC.append("text")
  .attr("transform","rotate(-90)").attr("x",-(IM.top + IHC/2)).attr("y", ITW - IM.right + 55)
  .attr("text-anchor","middle").style("font-size","11px").style("fill","#d97706")
  .attr("opacity",0).text("Mortality Rate (%)");

// Vaccine markers (added before brush so they're behind the brush overlay)
const iVaccC = {}, iVaccD = {};
const vaccKey = "2020-12-14";
iVaccC[vaccKey] = {
  line:  iGC.append("line").attr("y1",0).attr("y2",IHC).attr("stroke","#11910f").attr("stroke-dasharray","4,3"),
  label: iGC.append("text").attr("fill","#0b7509").style("font-size","11px").text("Vaccines (Dec 2020)"),
};
iVaccD[vaccKey] = {
  line: iGD.append("line").attr("y1",0).attr("y2",IHD).attr("stroke","#16a34a").attr("stroke-dasharray","4,3"),
};

// Hover crosshair elements (below brush overlay in z-order, visible because overlay is transparent)
const iHLC = iGC.append("line").attr("stroke","#666").attr("stroke-width",1).attr("y1",0).attr("y2",IHC).attr("opacity",0).attr("pointer-events","none");
const iHDC = iGC.append("circle").attr("r",5).attr("fill","#1e40af").attr("stroke","#fff").attr("stroke-width",1.5).attr("opacity",0).attr("pointer-events","none");
const iHLD = iGD.append("line").attr("stroke","#666").attr("stroke-width",1).attr("y1",0).attr("y2",IHD).attr("opacity",0).attr("pointer-events","none");
const iHDD = iGD.append("circle").attr("r",5).attr("fill","#991b1b").attr("stroke","#fff").attr("stroke-width",1.5).attr("opacity",0).attr("pointer-events","none");

// ── Shared tooltip ────────────────────────────────────────────────────────────
const iTip = d3.select("body").append("div")
  .style("position","fixed").style("background","rgba(15,15,15,0.85)").style("color","#fff")
  .style("padding","7px 12px").style("border-radius","7px").style("font-size","13px")
  .style("pointer-events","none").style("opacity",0).style("z-index","2000")
  .style("transition","opacity 0.1s");

// ── Brush (cases chart — controls both) ──────────────────────────────────────
const iBrush = d3.brushX()
  .extent([[0, 0], [IW, IHC]])
  .on("end", function (event) {
    if (!event.selection) return;
    const [x0, x1] = event.selection;
    let nextMin = snapToWeek(ix.invert(x0));
    let nextMax = snapToWeek(ix.invert(x1));

    if (nextMax.getTime() - nextMin.getTime() < MIN_WINDOW_MS) {
      nextMax = new Date(nextMin.getTime() + MIN_WINDOW_MS);
    }
    if (nextMax > MAX_DATE) {
      nextMax = MAX_DATE;
      nextMin = new Date(Math.max(MIN_DATE.getTime(), nextMax.getTime() - MIN_WINDOW_MS));
    }

    iMinDate = nextMin;
    iMaxDate = nextMax;
    iBrushG.call(iBrush.move, null);  // clear the brush rectangle
    iUpdate();
    iSyncSliders();
  });

const iBrushG = iGC.append("g").attr("class", "brush");
iBrushG.call(iBrush);

// Attach hover events onto the brush's own overlay so both brush and hover coexist
iBrushG.select(".overlay")
  .on("mousemove.hover", function (event) {
    const [mx] = d3.pointer(event, this);
    const d = dataByTime.get(snapToWeek(ix.invert(mx)).getTime());
    if (!d || d.date < iMinDate || d.date > iMaxDate) {
      iHLC.attr("opacity", 0); iHDC.attr("opacity", 0); iTip.style("opacity", 0); return;
    }
    const cx  = ix(d.date);
    const ccy = iyCases(d.cases);
    iHLC.attr("x1", cx).attr("x2", cx).attr("opacity", 1);
    iHDC.attr("cx",  cx).attr("cy",  ccy).attr("opacity", 1);
    let html = `<strong>${fmtTip(d.date)}</strong><br>Cases: <strong>${d3.format(",")(d.cases)}</strong>`;
    if (iShowMortality && d.cases > 0) html += `<br>Mortality: <strong>${Math.min(100, d.deaths / d.cases * 100).toFixed(1)}%</strong>`;
    iTip.style("left", (event.clientX + 14) + "px").style("top", (event.clientY - 40) + "px")
      .style("opacity", 1).html(html);
  })
  .on("mouseleave.hover", () => { iHLC.attr("opacity", 0); iHDC.attr("opacity", 0); iTip.style("opacity", 0); });

// Deaths chart hover (no brush → separate overlay rect)
iGD.append("rect").attr("width", IW).attr("height", IHD).attr("fill", "transparent")
  .on("mousemove", function (event) {
    const [mx] = d3.pointer(event, this);
    const d = dataByTime.get(snapToWeek(ix.invert(mx)).getTime());
    if (!d || d.date < iMinDate || d.date > iMaxDate) {
      iHLD.attr("opacity", 0); iHDD.attr("opacity", 0); iTip.style("opacity", 0); return;
    }
    const cx  = ix(d.date);
    const cdy = iyDeaths(d.deaths);
    iHLD.attr("x1", cx).attr("x2", cx).attr("opacity", 1);
    iHDD.attr("cx",  cx).attr("cy",  cdy).attr("opacity", 1);
    iTip.style("left", (event.clientX + 14) + "px").style("top", (event.clientY - 40) + "px")
      .style("opacity", 1).html(`<strong>${fmtTip(d.date)}</strong><br>Deaths: <strong>${d3.format(",")(d.deaths)}</strong>`);
  })
  .on("mouseleave", () => { iHLD.attr("opacity", 0); iHDD.attr("opacity", 0); iTip.style("opacity", 0); });

// Double-click either chart to reset range
iSvgC.on("dblclick", () => { iMinDate = MIN_DATE; iMaxDate = MAX_DATE; iUpdate(); iSyncSliders(); });
iSvgD.on("dblclick", () => { iMinDate = MIN_DATE; iMaxDate = MAX_DATE; iUpdate(); iSyncSliders(); });

// ── Update function ───────────────────────────────────────────────────────────
// NOTE: We deliberately avoid d3.transition() (root transition ID=1) because
// Observable Framework's runtime invalidates it between cell re-runs.
// Instead, every selection gets its own .transition().duration() call.
function iUpdate(animate = true) {
  if (iMaxDate.getTime() - iMinDate.getTime() < MIN_WINDOW_MS) {
    iMaxDate = new Date(Math.min(MAX_DATE.getTime(), iMinDate.getTime() + MIN_WINDOW_MS));
  }

  iComputeScales();
  const vis = data.filter(d => d.date >= iMinDate && d.date <= iMaxDate);
  const dur = animate ? 350 : 0;
  const ease = d3.easeCubicOut;

  // X axes
  const xFn = makeTimeAxis(ix, iMinDate, iMaxDate);
  iXAC.transition().duration(dur).ease(ease).call(xFn);
  iXAD.transition().duration(dur).ease(ease).call(xFn);
  iXAC.call(g => styleTimeAxisLabels(g));
  iXAD.call(g => styleTimeAxisLabels(g));

  // Y axes
  const yFmt = d3.format(",~s");
  iYAC.transition().duration(dur).ease(ease).call(d3.axisLeft(iyCases).tickFormat(yFmt).ticks(6));
  iYAD.transition().duration(dur).ease(ease).call(d3.axisLeft(iyDeaths).tickFormat(yFmt).ticks(5));

  // Y grids — call axis then strip domain/colorize lines after transition
  iGrC.transition().duration(dur).ease(ease)
    .call(d3.axisLeft(iyCases).tickSize(-IW).tickFormat("").ticks(6))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("line").attr("stroke", "#e5e7eb"));
  iGrD.transition().duration(dur).ease(ease)
    .call(d3.axisLeft(iyDeaths).tickSize(-IW).tickFormat("").ticks(5))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("line").attr("stroke", "#e5e7eb"));

  // Area paths
  const areaC = d3.area().x(d => ix(d.date)).y0(IHC).y1(d => iyCases(d.cases)).curve(d3.curveMonotoneX);
  const areaD = d3.area().x(d => ix(d.date)).y0(IHD).y1(d => iyDeaths(d.deaths)).curve(d3.curveMonotoneX);
  iPathC.transition().duration(dur).ease(ease).attr("d", areaC(vis));
  iPathD.transition().duration(dur).ease(ease).attr("d", areaD(vis));

  // Mortality overlay — rate capped at 100%
  if (iShowMortality) {
    const mVis  = vis.filter(d => d.cases > 0).map(d => ({ date: d.date, rate: Math.min(100, d.deaths / d.cases * 100) }));
    const lineM = d3.line().x(d => ix(d.date)).y(d => iyMort(d.rate)).curve(d3.curveMonotoneX);
    iMortPath.transition().duration(dur).ease(ease).attr("d", lineM(mVis)).attr("opacity", 1);
    iMortAxisG.transition().duration(dur).ease(ease)
      .call(d3.axisRight(iyMort).tickFormat(d => d.toFixed(0) + "%").ticks(5))
      .call(g => {
        g.select(".domain").remove();
        g.selectAll("text").attr("fill", "#d97706");
        g.selectAll("line").attr("stroke", "#d97706").attr("stroke-opacity", 0.4);
      });
    iMortAxisLbl.transition().duration(dur).ease(ease).attr("opacity", 1);
  } else {
    iMortPath.transition().duration(dur).ease(ease).attr("opacity", 0);
    iMortAxisG.selectAll("*").remove();
    iMortAxisLbl.transition().duration(dur).ease(ease).attr("opacity", 0);
  }

  // Stats row — total cases and deaths for the visible range
  const totalCases  = d3.sum(vis, d => d.cases);
  const totalDeaths = d3.sum(vis, d => d.deaths);
  iStatsEl.html(
    `<strong>${fmtTip(iMinDate)}–${fmtTip(iMaxDate)}</strong>` +
    ` &nbsp;·&nbsp; Total Cases: <strong>${d3.format(",")(totalCases)}</strong>` +
    ` &nbsp;·&nbsp; Total Deaths: <strong>${d3.format(",")(totalDeaths)}</strong>`
  );

  // Vaccine markers (no transition needed — position snaps with scale)
  const vaccineDate = new Date("2020-12-14");
  const vaccKey = "2020-12-14";
  const vaccLabelY = { [vaccKey]: IHC * 0.25 };
  const show = vaccineDate >= iMinDate && vaccineDate <= iMaxDate;
  const vx = ix(vaccineDate);
  
  iVaccC[vaccKey].line.attr("x1", vx).attr("x2", vx).attr("opacity", show ? 0.7 : 0);
  iVaccC[vaccKey].label.attr("x", vx + 5).attr("y", vaccLabelY[vaccKey]).attr("opacity", show ? 1 : 0);
  iVaccD[vaccKey].line.attr("x1", vx).attr("x2", vx).attr("opacity", show ? 0.7 : 0);
}

// ── Sync slider to state (called by brush and preset buttons) ─────────────────
function iSyncSliders() {
  sliderRender();
}

// ── Initial render ─────────────────────────────────────────────────────────────
iComputeScales();
sliderRender();   // place handles at full COVID range before first paint
iUpdate(false);
display(iRoot.node());
```

<div class="section-below">

<div class="callout">
<strong>Before vaccines</strong> - COVID-19 deaths rose sharply through 2020 in the United States, with large winter surges placing sustained pressure on hospitals and public health systems.
</div>

<div class="callout">
<strong>Pfizer-BioNTech rollout (Dec 14, 2020)</strong> - The first U.S. COVID-19 vaccine doses were administered to the public on December 14, 2020, marking the start of mass immunization.
</div>

<div class="callout">
<strong>Moderna rollout (Dec 21, 2020)</strong> - One week later, Moderna doses began public deployment, expanding vaccine supply.
</div>

As vaccine coverage increased through 2021, deaths declined substantially relative to the largest pre-vaccine waves, even as new variants continued to drive case surges.

</div>
