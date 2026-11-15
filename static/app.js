// Trend Detective - on yuz mantigi (Uye C). Alpine.js ile; derleme adimi yok.
// Butun sayilar sunucudan (/api/...) gelir; burada sadece gosterilir.

const VAR_ICONS = {
  precip: "cloud-rain", evap: "cloud-sun", runoff: "waves", soil: "droplets",
  t2m: "thermometer", lake_lst: "thermometer-sun", no2: "factory", airs_t: "layers", ndvi: "leaf",
};
const TOPIC_ICONS = { water: "droplets", temperature: "thermometer", air: "wind", vegetation: "leaf" };
const PLACE_ICONS = { lake_basin: "waves", big_city: "building-2", dry_inland: "sun", coast_forest: "tree-pine" };

// "cloud-rain" -> lucide.icons.CloudRain -> <svg>...</svg>
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
  Plotly.react(el, [
    { x: r.dates, y: r.anomaly, type: "scatter", mode: "lines", name: "Monthly anomaly",
      line: { color: "rgba(0,122,255,0.55)", width: 1.4 } },
    { x: r.dates, y: r.trend, type: "scatter", mode: "lines", name: "Trend (Sen's slope)",
      line: { color: "#FF9500", width: 3, dash: "dash" } },
  ], {
    margin: { l: 48, r: 12, t: 8, b: 32 }, height: el.classList.contains("big") ? 300 : 220,
    paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, 'Segoe UI', Roboto, sans-serif", size: 12, color: "#3C3C43" },
    yaxis: { title: { text: `Difference from normal (${r.unit})`, font: { size: 11 } }, gridcolor: "#E5E5EA", zerolinecolor: "#C7C7CC" },
    xaxis: { gridcolor: "#F2F2F7" },
    legend: { orientation: "h", y: -0.2 },
  }, { displayModeBar: false, responsive: true });
}

function trendApp() {
  return {
    tabs: [
      { id: "case1", label: "Sapanca", icon: "waves" },
      { id: "case2", label: "Istanbul air", icon: "wind" },
      { id: "compare", label: "Two regions", icon: "arrow-left-right" },
      { id: "explore", label: "Explore", icon: "compass" },
    ],
    tab: "case1",
    catalog: { topics: {}, place_types: {}, variables: [] },
    places: {}, cases: {}, caseData: {},
    loading: false, busy: false, error: "", sheet: null,
    cmp: { var: "t2m", a: "rize", b: "konya", results: [] },
    ex: { topic: "water", place: "sapanca", type: "lake_basin", lat: 40.69, lon: 30.27 },

    async init() {
      const res = await fetch("/api/catalog").then(r => r.json());
      this.catalog = res.catalog; this.places = res.places; this.cases = res.cases;
      const h = location.hash.slice(1);
      this.go(this.tabs.some(t => t.id === h) ? h : "case1");
      // Detay sayfasi acilma animasyonu bitince ciz (yoksa grafik sikisir)
      this.$watch("sheet", v => { if (v) setTimeout(() => drawChart("sheet-chart", v), 320); });
    },
    icon: svgIcon,
    varIcon: id => VAR_ICONS[id] || "chart-line",
    topicIcon: k => TOPIC_ICONS[k] || "sparkles",
    placeIcon: k => PLACE_ICONS[k] || "map-pin",

    go(id) {
      this.tab = id; this.error = ""; history.replaceState(null, "", "#" + id);
      if (id === "case1" || id === "case2") this.loadCase(id);
    },
    async loadCase(id) {
      if (this.caseData[id]) return;
      this.loading = true;
      try { this.caseData[id] = await fetch(`/api/case/${id}`).then(r => r.json()); }
      finally { this.loading = false; }
    },
    open(r) { this.sheet = r; },

    liveVars() { return this.catalog.variables.filter(v => v.power_param); },
    suggestions() {
      return this.catalog.variables.filter(v => v.topic === this.ex.topic && v.place_types.includes(this.ex.type));
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
      this.busy = true; this.error = "";
      try { this.sheet = await this.fetchPower(varId, this.ex.lat, this.ex.lon); }
      catch (e) { this.error = e.message; }
      finally { this.busy = false; }
    },
    async compare() {
      this.busy = true; this.error = ""; this.cmp.results = [];
      try {
        const a = this.places[this.cmp.a], b = this.places[this.cmp.b];
        this.cmp.results = await Promise.all([
          this.fetchPower(this.cmp.var, a.lat, a.lon), this.fetchPower(this.cmp.var, b.lat, b.lon)]);
        this.$nextTick(() => this.cmp.results.forEach((r, i) => drawChart(`cmp-chart-${i}`, r)));
      } catch (e) { this.error = e.message; }
      finally { this.busy = false; }
    },

    // Bicimlendirme
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
      return n ? `~${Math.round(n)} years` : "—";
    },
    fmtP: p => (p === null || p === undefined) ? "—" : (p < 0.001 ? "< 0.001" : p.toFixed(3)),
    pClass: p => (p !== null && p < 0.05) ? "green" : "gray",
    downloadCsv(r) {
      const rows = ["date,value"].concat(r.dates.map((d, i) => `${d},${r.values[i]}`));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
      a.download = `${r.id}.csv`; a.click();
    },
  };
}
