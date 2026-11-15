//  Earth Trend Detective Frontend Logic (Member C)
// Connects directly to FastAPI endpoints (/api/catalog, /api/case/{id}, /api/power).
// No statistical formulas are computed in JavaScript; all numbers come from Python.

const VAR_ICONS = {
  precip: "cloud-rain",
  evap: "cloud-sun",
  runoff: "waves",
  soil: "droplets",
  t2m: "thermometer",
  lake_lst: "thermometer-sun",
  no2: "factory",
  airs_t: "layers",
  ndvi: "leaf",
};

const TOPIC_ICONS = {
  water: "droplets",
  temperature: "thermometer",
  air: "wind",
  vegetation: "leaf",
};

const PLACE_ICONS = {
  lake_basin: "waves",
  big_city: "building-2",
  dry_inland: "sun",
  coast_forest: "tree-pine",
};

function svgIcon(name, size = 20) {
  const key = name.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  const node = window.lucide && lucide.icons[key];
  if (!node) return "";
  const el = lucide.createElement(node);
  el.setAttribute("width", size);
  el.setAttribute("height", size);
  return el.outerHTML;
}

function drawChart(elId, r) {
  const el = document.getElementById(elId);
  if (!el || !r) return;

  const isIstanbulNo2 = r.id === "no2";
  const shapes = [];
  const annotations = [];

  // Mark 2020 COVID lockdown step change on Istanbul NO2
  if (isIstanbulNo2) {
    shapes.push({
      type: "line",
      x0: "2020-03-01",
      x1: "2020-03-01",
      y0: 0,
      y1: 1,
      yref: "paper",
      line: { color: "#DC2626", width: 1.6, dash: "dot" },
    });
    annotations.push({
      x: "2020-03-01",
      y: 0.96,
      yref: "paper",
      text: "2020 Lockdown (Step change)",
      showarrow: false,
      xanchor: "left",
      font: { size: 11, color: "#DC2626", family: "JetBrains Mono, monospace" },
      bgcolor: "rgba(254, 242, 242, 0.9)",
    });
  }

  Plotly.react(
    el,
    [
      {
        x: r.dates,
        y: r.anomaly,
        type: "scatter",
        mode: "lines",
        name: "Monthly anomaly (season removed)",
        line: { color: "rgba(2, 132, 199, 0.65)", width: 1.5 },
      },
      {
        x: r.dates,
        y: r.trend,
        type: "scatter",
        mode: "lines",
        name: "Trend (Sen's slope)",
        line: { color: "#F59E0B", width: 3, dash: "dash" },
      },
    ],
    {
      margin: { l: 52, r: 14, t: 12, b: 36 },
      height: el.classList.contains("big") ? 295 : 220,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: {
        family: "'Plus Jakarta Sans', Inter, -apple-system, sans-serif",
        size: 12,
        color: "#374151",
      },
      yaxis: {
        title: { text: `Difference from normal (${r.unit})`, font: { size: 11 } },
        gridcolor: "#E5E2DC",
        zerolinecolor: "#9CA3AF",
      },
      xaxis: { gridcolor: "#F3F1ED" },
      legend: { orientation: "h", y: -0.22 },
      shapes,
      annotations,
    },
    { displayModeBar: false, responsive: true }
  );
}

function trendApp() {
  return {
    booting: true,
    bootProgress: 0,
    bootStatus: "Initializing NASA Earthdata telemetry...",
    _bootTimer: null,

    tabs: [
      { id: "case1", label: "Sapanca", icon: "waves" },
      { id: "case2", label: "Istanbul air", icon: "wind" },
      { id: "compare", label: "Two regions", icon: "arrow-left-right" },
      { id: "explore", label: "Explore", icon: "compass" },
    ],
    tab: "case1",
    catalog: { topics: {}, place_types: {}, variables: [] },
    places: {},
    cases: {},
    caseData: {},
    loading: false,
    busy: false,
    error: "",
    sheet: null,
    cmp: { var: "t2m", a: "rize", b: "konya", results: [] },
    ex: { topic: "water", place: "sapanca", type: "lake_basin", lat: 40.69, lon: 30.27 },

    startLoader() {
      if (this._bootTimer) clearInterval(this._bootTimer);
      this.booting = true;
      this.bootProgress = 0;
      this.bootStatus = "Aligning orbital sensors (GPM, GLDAS, MERRA-2)...";

      this._bootTimer = setInterval(() => {
        if (this.bootProgress < 42) {
          this.bootProgress += 7;
        } else if (this.bootProgress < 84) {
          this.bootProgress += 6;
          this.bootStatus = "Stripping seasonal cycles & checking autocorrelation...";
        } else if (this.bootProgress < 100) {
          this.bootProgress = Math.min(100, this.bootProgress + 4);
          this.bootStatus = "Calibrating FDR significance thresholds...";
        } else {
          clearInterval(this._bootTimer);
          this.bootStatus = "Telemetry locked.";
          setTimeout(() => {
            this.booting = false;
          }, 420);
        }
      }, 65);
    },

    replayLoader() {
      this.startLoader();
    },

    async init() {
      this.startLoader();
      try {
        const res = await fetch("/api/catalog").then(r => r.json());
        this.catalog = res.catalog;
        this.places = res.places;
        this.cases = res.cases;
      } catch (e) {
        this.error = "Could not load /api/catalog from server.";
      }

      const h = location.hash.slice(1);
      this.go(this.tabs.some(t => t.id === h) ? h : "case1");

      this.$watch("sheet", v => {
        if (v) setTimeout(() => drawChart("sheet-chart", v), 310);
      });
    },

    themeKey() {
      if (this.tab === "case1") return "sapanca";
      if (this.tab === "case2") return "istanbul";
      return "nasa";
    },

    regionBadge() {
      if (this.tab === "case1") return "SAKARYA · 40.69°N, 30.27°E";
      if (this.tab === "case2") return "ISTANBUL · 41.01°N, 28.98°E";
      if (this.tab === "compare") return "NASA POWER · DUAL REGION";
      return `${Number(this.ex.lat).toFixed(2)}°N, ${Number(this.ex.lon).toFixed(2)}°E`;
    },

    heroMeta() {
      if (this.tab === "case1") {
        return {
          kicker: "CASE 1 · SAPANCA LAKE BASIN",
          sensorNote: "GPM IMERG · GLDAS NOAH · MERRA-2 · MODIS LST",
          headline: this.cases.case1?.title || "Sapanca Lake basin: land and water cycle",
          desc:
            this.cases.case1?.intro ||
            "Sapanca Lake supplies about 70% of Sakarya's drinking water. Which climate variables around the lake show a long-term trend? The lake is actively managed; this tool shows the climate side only and does not model withdrawals or transfers.",
        };
      }
      if (this.tab === "case2") {
        return {
          kicker: "CASE 2 · ISTANBUL ATMOSPHERE",
          sensorNote: "OMI TROPOSPHERIC NO2 · AIRS · MERRA-2",
          headline: this.cases.case2?.title || "The air above Istanbul",
          desc:
            this.cases.case2?.intro ||
            "Is the air above a large city changing? Note: the 2020 lockdown drop is a step change, not a long-term climate trend.",
        };
      }
      if (this.tab === "compare") {
        return {
          kicker: "CASE 3 · REGIONAL CONTRAST",
          sensorNote: "NASA POWER MONTHLY POINT API (1981–2025)",
          headline: "Same variable, two regions",
          desc: "The same large-scale process can push a climate variable up in one region and down in another. Compare two locations side by side.",
        };
      }
      return {
        kicker: "EXPLORE · ANYWHERE ON EARTH",
        sensorNote: "GUIDED VARIABLE MATCHING + LIVE NASA POWER",
        headline: "Be a data detective anywhere",
        desc: "Answer three short questions. We suggest NASA variables that can show trends for this kind of place and test them deterministically.",
      };
    },

    heroKpis() {
      if (this.tab === "case1") {
        return [
          { label: "SAKARYA DRINKING WATER", value: "~70%", foot: "Supplied by Sapanca Lake · SASKİ", icon: "droplets" },
          { label: "RECORD LOW LEVEL", value: "28.41 m", foot: "January 2026 minimum", icon: "waves" },
          { label: "CRITICAL THRESHOLD", value: "~30 m", foot: "Oct 2026 recovery: ~30.56 m", icon: "gauge" },
          { label: "ANNUAL WATER BUDGET", value: "~185 hm³", foot: "~100 hm³ allocated to drinking water", icon: "clock" },
        ];
      }
      if (this.tab === "case2") {
        return [
          { label: "PRIMARY SENSOR", value: "OMI NO₂", foot: "Tropospheric column (2004–2026)", icon: "factory" },
          { label: "UPPER AIR LAYER", value: "AIRS 3D", foot: "Pressure-level temperature", icon: "layers" },
          { label: "2020 LOCKDOWN", value: "Step Drop", foot: "Short-term shock, not a trend", icon: "alert-circle" },
          { label: "CORRECTION METHOD", value: "Hamed-Rao", foot: "Autocorrelation-adjusted MK", icon: "shield-check" },
        ];
      }
      if (this.tab === "compare") {
        return [
          { label: "LIVE DATA SOURCE", value: "POWER API", foot: "Keyless NASA monthly records", icon: "satellite" },
          { label: "TIME COVERAGE", value: "1981–2025", foot: "Up to 45 years of monthly data", icon: "calendar" },
          { label: "GRID CELL SCALE", value: "~50 km", foot: "Regional climate signal scale", icon: "globe" },
          { label: "TREND ESTIMATOR", value: "Sen's Slope", foot: "Outlier-resistant 10-yr rate", icon: "trending-up" },
        ];
      }
      return [
        { label: "STEP 1 · TOPIC", value: "4 Domains", foot: "Water, temperature, air, vegetation", icon: "compass" },
        { label: "STEP 2 · LOCATION", value: "Any Coords", foot: "Preset cities or custom lat/lon", icon: "map-pin" },
        { label: "STEP 3 · PLACE TYPE", value: "4 Biomes", foot: "Lake, city, dry inland, coast/forest", icon: "tree-pine" },
        { label: "ZERO HALLUCINATION", value: "100% Code", foot: "Python stats + template text", icon: "cpu" },
      ];
    },

    icon: svgIcon,
    varIcon: id => VAR_ICONS[id] || "chart-line",
    topicIcon: k => TOPIC_ICONS[k] || "sparkles",
    placeIcon: k => PLACE_ICONS[k] || "map-pin",

    go(id) {
      this.tab = id;
      this.error = "";
      history.replaceState(null, "", "#" + id);
      if (id === "case1" || id === "case2") this.loadCase(id);
    },

    async loadCase(id) {
      if (this.caseData[id]) return;
      this.loading = true;
      try {
        this.caseData[id] = await fetch(`/api/case/${id}`).then(r => r.json());
      } catch (e) {
        this.error = "Failed to load case data from Python backend.";
      } finally {
        this.loading = false;
      }
    },

    open(r) {
      this.sheet = r;
    },

    liveVars() {
      return this.catalog.variables.filter(v => v.power_param);
    },

    suggestions() {
      return this.catalog.variables.filter(
        v => v.topic === this.ex.topic && v.place_types.includes(this.ex.type)
      );
    },

    pickPlace(k) {
      const p = this.places[k];
      Object.assign(this.ex, { place: k, lat: p.lat, lon: p.lon, type: p.type });
    },

    async fetchPower(varId, lat, lon) {
      const res = await fetch(`/api/power?var_id=${varId}&lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error((await res.json()).detail || "Request failed");
      return res.json();
    },

    async analyzeLive(varId) {
      this.busy = true;
      this.error = "";
      try {
        this.sheet = await this.fetchPower(varId, this.ex.lat, this.ex.lon);
      } catch (e) {
        this.error = e.message;
      } finally {
        this.busy = false;
      }
    },

    async compare() {
      this.busy = true;
      this.error = "";
      this.cmp.results = [];
      try {
        const a = this.places[this.cmp.a];
        const b = this.places[this.cmp.b];
        this.cmp.results = await Promise.all([
          this.fetchPower(this.cmp.var, a.lat, a.lon),
          this.fetchPower(this.cmp.var, b.lat, b.lon),
        ]);
        this.$nextTick(() =>
          this.cmp.results.forEach((r, i) => drawChart(`cmp-chart-${i}`, r))
        );
      } catch (e) {
        this.error = e.message;
      } finally {
        this.busy = false;
      }
    },

    // Formatting & Plain-English Lay Explanations (Zero math computed in frontend)
    perDecade(r) {
      const s = r.stats.sen_slope_per_year * 10;
      return `${s >= 0 ? "+" : ""}${Number(s.toPrecision(3))} ${r.unit} / decade`;
    },

    range(r) {
      const [lo, hi] = r.stats.ci95.map(x => Number((x * 10).toPrecision(3)));
      return `${lo} to ${hi}`;
    },

    detectText(r) {
      if (r.significant) return "Already detected";
      const n = r.stats.years_to_detect;
      return n ? `~${Math.round(n)} yrs total` : "Very long";
    },

    fmtP: p => (p === null || p === undefined ? "-" : p < 0.001 ? "< 0.001" : p.toFixed(3)),
    pClass: p => (p !== null && p < 0.05 ? "sig" : "unc"),

    metricHelp(r, key) {
      const s = r.stats.sen_slope_per_year * 10;
      const [lo, hi] = r.stats.ci95;
      if (key === "trend") {
        if (s > 0) return "Goes up by this amount every 10 years.";
        if (s < 0) return "Drops by this amount every 10 years.";
        return "Flat overall — no clear upward or downward shift.";
      }
      if (key === "range") {
        const sameSign = (lo > 0 && hi > 0) || (lo < 0 && hi < 0);
        return sameSign
          ? "Real 10-year change sits in this range (consistent direction)."
          : "Crosses zero — could still be slightly up or down.";
      }
      if (key === "pvalue") {
        return r.p_final < 0.05
          ? "Below 0.05 — real long-term shift, not random luck."
          : "0.05 or higher — too close to normal weather swings to be sure.";
      }
      if (key === "years") {
        return "Years of NASA satellite records checked here.";
      }
      if (key === "detect") {
        if (r.significant) return "Confirmed — current satellite record is long enough.";
        if (r.stats.years_to_detect) return "Total years needed to be sure. Not proven yet ≠ zero risk.";
        return "Change is near zero — would take decades to tell apart from noise.";
      }
      return "";
    },

    combinedSummary(r) {
      const s = r.stats.sen_slope_per_year * 10;
      const rateStr = `${s >= 0 ? "+" : ""}${Number(s.toPrecision(3))} ${r.unit}/decade`;
      const yrs = r.stats.years;
      const need = r.stats.years_to_detect;

      if (r.significant) {
        const dirWord = s >= 0 ? "rise" : "drop";
        return {
          badge: s >= 0 ? "Confirmed Upward Trend" : "Confirmed Downward Trend",
          lead: `In short: Across ${yrs} years of NASA data, ${r.name} shows a real, statistically confirmed ${dirWord} of ${rateStr} — not just normal seasonal swings.`,
        };
      }
      if (need) {
        const hint = s >= 0 ? "rising" : "falling";
        return {
          badge: "Needs Longer Record",
          lead: `In short: We see a ${hint} hint over ${yrs} years, but normal weather noise is still too high (p ≥ 0.05). About ${Math.round(need)} total years are needed to be sure — not proven yet does not mean zero risk.`,
        };
      }
      return {
        badge: "No Clear Shift Detected",
        lead: `In short: Over ${yrs} years of NASA records, ${r.name} stays essentially flat with no reliable upward or downward trend.`,
      };
    },

    downloadCsv(r) {
      const rows = ["date,value"].concat(r.dates.map((d, i) => `${d},${r.values[i]}`));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
      a.download = `${r.id}.csv`;
      a.click();
    },
  };
}