---
title: The Rise and Fall of Measles
toc: false
---

<style>
#measles-root {
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

/* Interactive section */
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

# The Rise and Fall of Measles in the United States

Measles infected hundreds of thousands of Americans each year at its peak until its first vaccine was created in 1963.

Where yearly data is missing, values are linearly interpolated between the nearest years.

**Scroll down** to watch decades of measles cases and deaths visualized in real time.

```js
import * as d3 from "npm:d3";

const rawData = await FileAttachment("data/measles-cases-and-death.csv").csv({typed: true});

const toNumberOrNull = (v) => (v == null || v === "" || Number.isNaN(+v) ? null : +v);

const source = rawData
  .filter(d => d.Entity === "United States")
  .map(d => ({
    year: +d.Year,
    cases: toNumberOrNull(d["Measles cases"]),
    deaths: toNumberOrNull(d["Measles deaths"])
  }))
  .filter(d => !Number.isNaN(d.year))
  .sort((a, b) => a.year - b.year);

const MIN_YEAR = d3.min(source, d => d.year);
const MAX_YEAR = d3.max(source, d => d.year);
const START_YEAR = MIN_YEAR + 5;

const rowByYear = new Map(source.map(d => [d.year, d]));
const base = d3.range(MIN_YEAR, MAX_YEAR + 1).map(year => {
  const row = rowByYear.get(year);
  return {
    year,
    cases: row ? row.cases : null,
    deaths: row ? row.deaths : null
  };
});

function interpolateSeries(rows, key) {
  const known = rows.filter(d => d[key] != null).map(d => ({year: d.year, value: d[key]}));
  const bisect = d3.bisector(d => d.year).left;

  return rows.map(d => {
    if (d[key] != null) return d[key];

    const i = bisect(known, d.year);
    const left = known[i - 1];
    const right = known[i];

    // Only interpolate for gaps bounded by known values on both sides.
    if (!left || !right || left.year === right.year) return null;

    const t = (d.year - left.year) / (right.year - left.year);
    return left.value + (right.value - left.value) * t;
  });
}

const interpCases = interpolateSeries(base, "cases");
const interpDeaths = interpolateSeries(base, "deaths");

const data = base.map((d, i) => ({
  year: d.year,
  cases: interpCases[i],
  deaths: interpDeaths[i]
}));

const dataByYear = new Map(data.map(d => [d.year, d]));

const maxCases  = d3.max(data, d => d.cases ?? 0);
const maxDeaths = d3.max(data, d => d.deaths ?? 0);

// -- Layout -----------------------------------------------------------------
const margin = { top: 48, right: 30, bottom: 42, left: 75 };
const totalWidth = 860;
const W = totalWidth - margin.left - margin.right;
const H_CASES  = 300;
const H_DEATHS = 240;

// -- Root container ----------------------------------------------------------
const root = d3.create("div").attr("id", "measles-root");

// -- Scroll section: sticky chart + tall spacer ------------------------------
const scrollSection = root.append("div").attr("id", "scroll-section");
const sticky = scrollSection.append("div").attr("class", "sticky-charts");

// -- Helper: build one chart SVG ---------------------------------------------
function buildChart({ title, fillColor, strokeColor, height, yScale, selector }) {
  const svg = sticky.append("svg")
    .attr("class", "chart-svg")
    .attr("width", totalWidth)
    .attr("height", height + margin.top + margin.bottom)
    .style("display", "block");

  svg.append("text")
    .attr("x", totalWidth / 2).attr("y", 24)
    .attr("text-anchor", "middle")
    .style("font-size", "14px").style("font-weight", "bold")
    .text(title);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g").attr("class", "grid-y")
    .call(d3.axisLeft(yScale).tickSize(-W).tickFormat(""))
    .call(gr => gr.select(".domain").remove())
    .call(gr => gr.selectAll("line").attr("stroke", "#e5e7eb").attr("stroke-opacity", 0.8));

  g.append("g").attr("class", "y-axis")
    .call(d3.axisLeft(yScale).tickFormat(d3.format(",~s")));

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -62).attr("x", -height / 2)
    .attr("text-anchor", "middle").style("font-size", "12px")
    .text(selector === "cases" ? "Cases" : "Deaths");

  const xAxisG = g.append("g").attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

  if (selector === "deaths") {
    g.append("text")
      .attr("x", W / 2).attr("y", height + 38)
      .attr("text-anchor", "middle").style("font-size", "12px")
      .text("Year");
  }

  const areaPath = g.append("path")
    .attr("fill", fillColor).attr("fill-opacity", 0.7)
    .attr("stroke", strokeColor).attr("stroke-width", 1.5);

  const vaccineEls = {};
  if (selector === "cases") {
    const vaccines = [
      { year: 1963, label: "Measles Vaccine (1963)", dy: -130 },
      { year: 1971, label: "MMR (1971)", dy: -70 }
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
    [1963, 1971].forEach(yr => {
      vaccineEls[`line-${yr}`] = g.append("line")
        .attr("y1", 0).attr("y2", height)
        .attr("stroke", "#16a34a").attr("stroke-dasharray", "4,3")
        .attr("opacity", 0);
    });
  }

  const hoverLine = g.append("line")
    .attr("stroke", "#666").attr("stroke-width", 1)
    .attr("y1", 0).attr("y2", height).attr("opacity", 0).attr("pointer-events", "none");

  const hoverDot = g.append("circle")
    .attr("r", 5).attr("fill", strokeColor).attr("opacity", 0).attr("pointer-events", "none");

  g.append("rect")
    .attr("width", W).attr("height", height).attr("fill", "transparent")
    .on("mousemove", function(event) {
      const [mx] = d3.pointer(event, this);
      const yr = Math.round(currentX.invert(mx));
      const d = dataByYear.get(yr);
      const val = selector === "cases" ? d?.cases : d?.deaths;
      if (!d || d.year > currentMaxYear || val == null) {
        hoverLine.attr("opacity", 0);
        hoverDot.attr("opacity", 0);
        tooltip.style("opacity", 0);
        return;
      }
      const cx = currentX(d.year);
      const cy = selector === "cases" ? yCases(val) : yDeaths(val);
      hoverLine.attr("x1", cx).attr("x2", cx).attr("opacity", 1);
      hoverDot.attr("cx", cx).attr("cy", cy).attr("opacity", 1);
      tooltip
        .style("left", (event.clientX + 14) + "px")
        .style("top", (event.clientY - 36) + "px")
        .style("opacity", 1)
        .html(`<strong>${d.year}</strong><br>${selector === "cases" ? "Cases" : "Deaths"}: <strong>${d3.format(",")(Math.round(val))}</strong>`);
    })
    .on("mouseleave", () => {
      hoverLine.attr("opacity", 0);
      hoverDot.attr("opacity", 0);
      tooltip.style("opacity", 0);
    });

  return { areaPath, xAxisG, vaccineEls };
}

// -- Scales ------------------------------------------------------------------
const yCases  = d3.scaleLinear().domain([0, maxCases  * 1.05]).range([H_CASES,  0]);
const yDeaths = d3.scaleLinear().domain([0, maxDeaths * 1.05]).range([H_DEATHS, 0]);

let currentX = d3.scaleLinear().domain([MIN_YEAR, START_YEAR]).range([0, W]);
let currentMaxYear = START_YEAR;

// -- Area generators ----------------------------------------------------------
const areaCasesGen = d3.area()
  .x(d => currentX(d.year)).y0(H_CASES).y1(d => yCases(d.cases))
  .curve(d3.curveMonotoneX)
  .defined(d => d.cases != null);

const areaDeathsGen = d3.area()
  .x(d => currentX(d.year)).y0(H_DEATHS).y1(d => yDeaths(d.deaths))
  .curve(d3.curveMonotoneX)
  .defined(d => d.deaths != null);

// -- Tooltip -----------------------------------------------------------------
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

// -- Build charts -------------------------------------------------------------
const casesChart  = buildChart({
  title: `Recorded Measles Cases, United States (${MIN_YEAR}-${MAX_YEAR})`,
  fillColor: "#3b82f6", strokeColor: "#1e40af",
  height: H_CASES, yScale: yCases, selector: "cases"
});

const deathsChart = buildChart({
  title: `Recorded Measles Deaths, United States (${MIN_YEAR}-${MAX_YEAR})`,
  fillColor: "#ef4444", strokeColor: "#991b1b",
  height: H_DEATHS, yScale: yDeaths, selector: "deaths"
});

sticky.append("p").attr("class", "scroll-hint").html("↓ Scroll to reveal more data");
scrollSection.append("div").style("height", "5000px");

function update(maxYr) {
  currentMaxYear = maxYr;
  currentX = d3.scaleLinear().domain([MIN_YEAR, maxYr]).range([0, W]);

  areaCasesGen.x(d => currentX(d.year));
  areaDeathsGen.x(d => currentX(d.year));

  const filtered = data.filter(d => d.year <= maxYr);
  if (filtered.length === 0) return;

  casesChart.areaPath.attr("d", areaCasesGen(filtered));
  deathsChart.areaPath.attr("d", areaDeathsGen(filtered));

  const range = maxYr - MIN_YEAR;
  const tickCount = range <= 8 ? range : range <= 20 ? 5 : range <= 50 ? 8 : 12;
  const xAxisFn = d3.axisBottom(currentX).tickFormat(d3.format("d")).ticks(tickCount);
  casesChart.xAxisG.call(xAxisFn);
  deathsChart.xAxisG.call(xAxisFn);

  [1963, 1971].forEach(yr => {
    const show = maxYr >= yr;
    const vx = currentX(yr);

    casesChart.vaccineEls[`line-${yr}`]
      .attr("x1", vx).attr("x2", vx).attr("opacity", show ? 1 : 0);
    if (casesChart.vaccineEls[`label-${yr}`]) {
      casesChart.vaccineEls[`label-${yr}`]
        .attr("x", vx + 5)
        .attr("y", H_CASES + casesChart.vaccineEls[`_dy_${yr}`])
        .attr("opacity", show ? 1 : 0);
    }

    deathsChart.vaccineEls[`line-${yr}`]
      .attr("x1", vx).attr("x2", vx).attr("opacity", show ? 1 : 0);
  });

  if (maxYr >= MAX_YEAR - 2) {
    sticky.select(".scroll-hint").style("opacity", 0);
  } else {
    sticky.select(".scroll-hint").style("opacity", 1);
  }
}

function onScroll() {
  const sec = document.getElementById("scroll-section");
  if (!sec) return;
  const rect = sec.getBoundingClientRect();
  const scrolled = -rect.top;
  const scrollable = sec.offsetHeight - window.innerHeight;
  const progress = Math.max(0, Math.min(1, scrolled / scrollable));
  const targetYear = START_YEAR + progress * (MAX_YEAR - START_YEAR);
  update(targetYear);
}

window.addEventListener("scroll", onScroll, { passive: true });
update(START_YEAR);

display(root.node());
```

---

## Explore the Data

Adjust the year range with the sliders, drag on the **cases chart** to zoom in, or use the preset buttons for key eras. Double-click either chart to reset, or overlay mortality rate (deaths ÷ cases) to see how outcomes changed over time.

```js
// ============================================================================
// INTERACTIVE SECTION — brush-to-zoom, sliders, mortality overlay
// ============================================================================

let iMinYear = MIN_YEAR, iMaxYear = MAX_YEAR;
let iShowMortality = false;

const IM  = { top: 50, right: 70, bottom: 42, left: 78 };
const ITW = 860;
const IW  = ITW - IM.left - IM.right;
const IHC = 290;
const IHD = 220;

const iRoot = d3.create("div").attr("id", "interactive-root");
const iCtrl = iRoot.append("div").attr("class", "i-controls");

const iPresets = [
  { label: "Early Waves",    min: 1919, max: 1945 },
  { label: "Pre-Vaccine",    min: 1950, max: 1964 },
  { label: "Vaccine Era",    min: 1963, max: 1995 },
  { label: "Recent Resurge", min: 2000, max: 2025 },
  { label: "All Years",      min: MIN_YEAR, max: MAX_YEAR }
];
iPresets.forEach(p => {
  iCtrl.append("button").attr("class", "i-btn preset").text(p.label)
    .on("click", () => { iMinYear = p.min; iMaxYear = p.max; iUpdate(); iSyncSliders(); });
});

iCtrl.append("span").attr("class", "i-sep");

iCtrl.append("button").attr("class", "i-btn toggle mort").text("Mortality Rate %")
  .on("click", function () {
    iShowMortality = !iShowMortality;
    d3.select(this).classed("on", iShowMortality);
    iUpdate();
  });

const SLIDER_W = 620;
const SLIDER_PAD = 14;
const SLIDER_TW = SLIDER_W - SLIDER_PAD * 2;
const sliderScale = d3.scaleLinear().domain([MIN_YEAR, MAX_YEAR]).range([0, SLIDER_TW]).clamp(true);

const sliderWrap = iRoot.append("div").attr("class", "i-sliders");
const slMinLbl = sliderWrap.append("span").attr("class", "sl-val").text(MIN_YEAR);

const sliderSvg = sliderWrap.append("svg")
  .attr("width", SLIDER_W).attr("height", 44).style("vertical-align", "middle").style("overflow", "visible");
const slG = sliderSvg.append("g").attr("transform", `translate(${SLIDER_PAD},22)`);

slG.append("line").attr("x1", 0).attr("x2", SLIDER_TW)
  .attr("stroke", "#ddd").attr("stroke-width", 5).attr("stroke-linecap", "round");
const slActive = slG.append("line")
  .attr("stroke", "#3b82f6").attr("stroke-width", 5).attr("stroke-linecap", "round");

d3.range(Math.ceil(MIN_YEAR / 10) * 10, MAX_YEAR + 1, 10).forEach(yr => {
  slG.append("line").attr("x1", sliderScale(yr)).attr("x2", sliderScale(yr))
    .attr("y1", 6).attr("y2", 11).attr("stroke", "#bbb").attr("stroke-width", 1);
});

const slMinH = slG.append("circle").attr("r", 10).attr("class", "sl-handle")
  .attr("fill", "#3b82f6").attr("stroke", "#fff").attr("stroke-width", 2.5).style("cursor", "ew-resize");
const slMaxH = slG.append("circle").attr("r", 10).attr("class", "sl-handle")
  .attr("fill", "#3b82f6").attr("stroke", "#fff").attr("stroke-width", 2.5).style("cursor", "ew-resize");

const slMaxLbl = sliderWrap.append("span").attr("class", "sl-val").text(MAX_YEAR);
sliderWrap.append("span").attr("class", "sl-hint").text("drag handles · double-click chart to reset");

const iStatsEl = iRoot.append("div").attr("class", "i-stats");

function sliderRender() {
  const x0 = sliderScale(iMinYear), x1 = sliderScale(iMaxYear);
  slMinH.attr("cx", x0);
  slMaxH.attr("cx", x1);
  slActive.attr("x1", x0).attr("x2", x1);
  slMinLbl.text(iMinYear);
  slMaxLbl.text(iMaxYear);
}

slMinH.call(d3.drag().on("drag", function (event) {
  iMinYear = Math.max(MIN_YEAR, Math.min(iMaxYear - 2, Math.round(sliderScale.invert(event.x))));
  sliderRender(); iUpdate();
}));
slMaxH.call(d3.drag().on("drag", function (event) {
  iMaxYear = Math.min(MAX_YEAR, Math.max(iMinYear + 2, Math.round(sliderScale.invert(event.x))));
  sliderRender(); iUpdate();
}));

const ix = d3.scaleLinear().range([0, IW]);
let iyCases, iyDeaths, iyMort;

function iComputeScales() {
  const vis = data.filter(d => d.year >= iMinYear && d.year <= iMaxYear);
  const maxC = d3.max(vis, d => d.cases ?? 0) || 1;
  const maxD = d3.max(vis, d => d.deaths ?? 0) || 1;
  const maxM = Math.min(100, d3.max(vis.filter(d => d.cases > 0 && d.deaths != null), d => d.deaths / d.cases * 100) || 1);
  ix.domain([iMinYear, iMaxYear]);
  iyCases  = d3.scaleLinear().domain([0, maxC * 1.05]).range([IHC, 0]);
  iyDeaths = d3.scaleLinear().domain([0, maxD * 1.05]).range([IHD, 0]);
  iyMort   = d3.scaleLinear().domain([0, maxM * 1.1]).range([IHC, 0]);
}

function makeiSVG(h, clipId, titleText) {
  const svg = iRoot.append("svg").attr("class", "ichart")
    .attr("width", ITW).attr("height", h + IM.top + IM.bottom)
    .style("display", "block").style("overflow", "visible");
  svg.append("defs").append("clipPath").attr("id", clipId)
    .append("rect").attr("width", IW).attr("height", h);
  svg.append("text").attr("x", ITW / 2).attr("y", 22).attr("text-anchor", "middle")
    .style("font-size", "14px").style("font-weight", "bold").text(titleText);
  return { svg, g: svg.append("g").attr("transform", `translate(${IM.left},${IM.top})`) };
}

const { svg: iSvgC, g: iGC } = makeiSVG(IHC, "iclip-c", "Recorded Measles Cases, United States");
const { svg: iSvgD, g: iGD } = makeiSVG(IHD, "iclip-d", "Recorded Measles Deaths, United States");

const iGrC  = iGC.append("g").attr("class", "igrid-y");
const iGrD  = iGD.append("g").attr("class", "igrid-y");
const iYAC  = iGC.append("g").attr("class", "iy-axis");
const iYAD  = iGD.append("g").attr("class", "iy-axis");
const iXAC  = iGC.append("g").attr("class", "ix-axis").attr("transform", `translate(0,${IHC})`);
const iXAD  = iGD.append("g").attr("class", "ix-axis").attr("transform", `translate(0,${IHD})`);

iGC.append("text").attr("transform", "rotate(-90)").attr("y", -65).attr("x", -IHC / 2).attr("text-anchor", "middle").style("font-size", "12px").text("Cases");
iGD.append("text").attr("transform", "rotate(-90)").attr("y", -65).attr("x", -IHD / 2).attr("text-anchor", "middle").style("font-size", "12px").text("Deaths");
iGD.append("text").attr("x", IW / 2).attr("y", IHD + 36).attr("text-anchor", "middle").style("font-size", "12px").text("Year");

const iPathC = iGC.append("path").attr("clip-path", "url(#iclip-c)").attr("fill", "#3b82f6").attr("fill-opacity", 0.7).attr("stroke", "#1e40af").attr("stroke-width", 1.5);
const iPathD = iGD.append("path").attr("clip-path", "url(#iclip-d)").attr("fill", "#ef4444").attr("fill-opacity", 0.7).attr("stroke", "#991b1b").attr("stroke-width", 1.5);

const iMortPath  = iGC.append("path").attr("clip-path", "url(#iclip-c)").attr("fill", "none").attr("stroke", "#d97706").attr("stroke-width", 2.5).attr("opacity", 0);
const iMortAxisG = iGC.append("g").attr("transform", `translate(${IW},0)`);
const iMortAxisLbl = iSvgC.append("text")
  .attr("transform", "rotate(-90)").attr("x", -(IM.top + IHC / 2)).attr("y", ITW - IM.right + 55)
  .attr("text-anchor", "middle").style("font-size", "11px").style("fill", "#d97706")
  .attr("opacity", 0).text("Mortality Rate (%)");

const iVaccC = {}, iVaccD = {};
[{yr: 1963, lbl: "Measles Vaccine (1963)"}, {yr: 1971, lbl: "MMR (1971)"}].forEach(v => {
  iVaccC[v.yr] = {
    line:  iGC.append("line").attr("y1", 0).attr("y2", IHC).attr("stroke", "#11910f").attr("stroke-dasharray", "4,3"),
    label: iGC.append("text").attr("fill", "#0b7509").style("font-size", "11px").text(v.lbl)
  };
  iVaccD[v.yr] = {
    line: iGD.append("line").attr("y1", 0).attr("y2", IHD).attr("stroke", "#16a34a").attr("stroke-dasharray", "4,3")
  };
});

const iHLC = iGC.append("line").attr("stroke", "#666").attr("stroke-width", 1).attr("y1", 0).attr("y2", IHC).attr("opacity", 0).attr("pointer-events", "none");
const iHDC = iGC.append("circle").attr("r", 5).attr("fill", "#1e40af").attr("stroke", "#fff").attr("stroke-width", 1.5).attr("opacity", 0).attr("pointer-events", "none");
const iHLD = iGD.append("line").attr("stroke", "#666").attr("stroke-width", 1).attr("y1", 0).attr("y2", IHD).attr("opacity", 0).attr("pointer-events", "none");
const iHDD = iGD.append("circle").attr("r", 5).attr("fill", "#991b1b").attr("stroke", "#fff").attr("stroke-width", 1.5).attr("opacity", 0).attr("pointer-events", "none");

const iTip = d3.select("body").append("div")
  .style("position", "fixed").style("background", "rgba(15,15,15,0.85)").style("color", "#fff")
  .style("padding", "7px 12px").style("border-radius", "7px").style("font-size", "13px")
  .style("pointer-events", "none").style("opacity", 0).style("z-index", "2000")
  .style("transition", "opacity 0.1s");

const iBrush = d3.brushX()
  .extent([[0, 0], [IW, IHC]])
  .on("end", function (event) {
    if (!event.selection) return;
    const [x0, x1] = event.selection;
    iMinYear = Math.max(MIN_YEAR, Math.round(ix.invert(x0)));
    iMaxYear = Math.min(MAX_YEAR, Math.max(iMinYear + 2, Math.round(ix.invert(x1))));
    iBrushG.call(iBrush.move, null);
    iUpdate();
    iSyncSliders();
  });

const iBrushG = iGC.append("g").attr("class", "brush");
iBrushG.call(iBrush);

iBrushG.select(".overlay")
  .on("mousemove.hover", function (event) {
    const [mx] = d3.pointer(event, this);
    const yr = Math.round(ix.invert(mx));
    const d  = dataByYear.get(yr);
    if (!d || d.year < iMinYear || d.year > iMaxYear || d.cases == null) {
      iHLC.attr("opacity", 0); iHDC.attr("opacity", 0); iTip.style("opacity", 0); return;
    }
    const cx  = ix(d.year);
    const ccy = iyCases(d.cases);
    iHLC.attr("x1", cx).attr("x2", cx).attr("opacity", 1);
    iHDC.attr("cx", cx).attr("cy", ccy).attr("opacity", 1);
    let html = `<strong>${d.year}</strong><br>Cases: <strong>${d3.format(",")(Math.round(d.cases))}</strong>`;
    if (iShowMortality && d.cases > 0 && d.deaths != null) html += `<br>Mortality: <strong>${Math.min(100, d.deaths / d.cases * 100).toFixed(1)}%</strong>`;
    iTip.style("left", (event.clientX + 14) + "px").style("top", (event.clientY - 40) + "px")
      .style("opacity", 1).html(html);
  })
  .on("mouseleave.hover", () => { iHLC.attr("opacity", 0); iHDC.attr("opacity", 0); iTip.style("opacity", 0); });

iGD.append("rect").attr("width", IW).attr("height", IHD).attr("fill", "transparent")
  .on("mousemove", function (event) {
    const [mx] = d3.pointer(event, this);
    const yr = Math.round(ix.invert(mx));
    const d  = dataByYear.get(yr);
    if (!d || d.year < iMinYear || d.year > iMaxYear || d.deaths == null) {
      iHLD.attr("opacity", 0); iHDD.attr("opacity", 0); iTip.style("opacity", 0); return;
    }
    const cx  = ix(d.year);
    const cdy = iyDeaths(d.deaths);
    iHLD.attr("x1", cx).attr("x2", cx).attr("opacity", 1);
    iHDD.attr("cx", cx).attr("cy", cdy).attr("opacity", 1);
    iTip.style("left", (event.clientX + 14) + "px").style("top", (event.clientY - 40) + "px")
      .style("opacity", 1).html(`<strong>${d.year}</strong><br>Deaths: <strong>${d3.format(",")(Math.round(d.deaths))}</strong>`);
  })
  .on("mouseleave", () => { iHLD.attr("opacity", 0); iHDD.attr("opacity", 0); iTip.style("opacity", 0); });

iSvgC.on("dblclick", () => { iMinYear = MIN_YEAR; iMaxYear = MAX_YEAR; iUpdate(); iSyncSliders(); });
iSvgD.on("dblclick", () => { iMinYear = MIN_YEAR; iMaxYear = MAX_YEAR; iUpdate(); iSyncSliders(); });

function iUpdate(animate = true) {
  iComputeScales();
  const vis = data.filter(d => d.year >= iMinYear && d.year <= iMaxYear);
  const dur = animate ? 350 : 0;
  const ease = d3.easeCubicOut;

  const range = iMaxYear - iMinYear;
  const ticks = range <= 8 ? range : range <= 25 ? 5 : range <= 60 ? 8 : 12;
  const xFn = d3.axisBottom(ix).tickFormat(d3.format("d")).ticks(ticks);
  iXAC.transition().duration(dur).ease(ease).call(xFn);
  iXAD.transition().duration(dur).ease(ease).call(xFn);

  const yFmt = d3.format(",~s");
  iYAC.transition().duration(dur).ease(ease).call(d3.axisLeft(iyCases).tickFormat(yFmt).ticks(6));
  iYAD.transition().duration(dur).ease(ease).call(d3.axisLeft(iyDeaths).tickFormat(yFmt).ticks(5));

  iGrC.transition().duration(dur).ease(ease)
    .call(d3.axisLeft(iyCases).tickSize(-IW).tickFormat("").ticks(6))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("line").attr("stroke", "#e5e7eb"));
  iGrD.transition().duration(dur).ease(ease)
    .call(d3.axisLeft(iyDeaths).tickSize(-IW).tickFormat("").ticks(5))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("line").attr("stroke", "#e5e7eb"));

  const visCases = vis.filter(d => d.cases != null);
  const visDeaths = vis.filter(d => d.deaths != null);

  const areaC = d3.area().x(d => ix(d.year)).y0(IHC).y1(d => iyCases(d.cases)).curve(d3.curveMonotoneX).defined(d => d.cases != null);
  const areaD = d3.area().x(d => ix(d.year)).y0(IHD).y1(d => iyDeaths(d.deaths)).curve(d3.curveMonotoneX).defined(d => d.deaths != null);
  iPathC.transition().duration(dur).ease(ease).attr("d", areaC(visCases));
  iPathD.transition().duration(dur).ease(ease).attr("d", areaD(visDeaths));

  if (iShowMortality) {
    const mVis  = vis.filter(d => d.cases > 0 && d.deaths != null).map(d => ({ year: d.year, rate: Math.min(100, d.deaths / d.cases * 100) }));
    const lineM = d3.line().x(d => ix(d.year)).y(d => iyMort(d.rate)).curve(d3.curveMonotoneX);
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

  const totalCases = d3.sum(vis.filter(d => d.cases != null), d => d.cases);
  const totalDeaths = d3.sum(vis.filter(d => d.deaths != null), d => d.deaths);
  iStatsEl.html(
    `<strong>${iMinYear}-${iMaxYear}</strong>` +
    ` &nbsp;·&nbsp; Total Cases: <strong>${d3.format(",")(Math.round(totalCases))}</strong>` +
    ` &nbsp;·&nbsp; Total Deaths: <strong>${d3.format(",")(Math.round(totalDeaths))}</strong>`
  );

  const vaccLabelY = { 1963: IHC * 0.18, 1971: IHC * 0.36 };
  [1963, 1971].forEach(yr => {
    const show = yr >= iMinYear && yr <= iMaxYear;
    const vx = ix(yr);
    iVaccC[yr].line.attr("x1", vx).attr("x2", vx).attr("opacity", show ? 0.7 : 0);
    iVaccC[yr].label.attr("x", vx + 5).attr("y", vaccLabelY[yr]).attr("opacity", show ? 1 : 0);
    iVaccD[yr].line.attr("x1", vx).attr("x2", vx).attr("opacity", show ? 0.7 : 0);
  });
}

function iSyncSliders() {
  sliderRender();
}

iComputeScales();
sliderRender();
iUpdate(false);
display(iRoot.node());
```

<div class="section-below">

<div class="callout">
<strong>Before vaccination</strong> - Measles outbreaks were a routine feature of childhood in the United States, with very large epidemic years through the mid-20th century.
</div>

<div class="callout">
<strong>First measles vaccine (1963)</strong> - The first licensed measles vaccine marked the beginning of sustained reductions in both cases and deaths.
</div>

<div class="callout">
<strong>MMR era (from 1971)</strong> - Combined measles, mumps, and rubella immunization expanded protection and pushed measles rates below historical levels.
</div>

Measles was declared eliminated from the U.S. in **2000**.

</div>
