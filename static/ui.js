// Small display helpers for the UI only (no statistics are computed here).

const VAR_TOPIC = {
  precip: "water", evap: "water", runoff: "water", soil: "water",
  t2m: "temp", lake_lst: "temp", airs_t: "temp",
  no2: "air", ndvi: "veg",
};

// Topic colour class for a variable id: t-water, t-temp, t-air, t-veg
function topicClass(id) {
  return "t-" + (VAR_TOPIC[id] || "water");
}

// Tiny inline sparkline: yearly means of the anomaly series + the Sen's slope line.
function spark(r, w = 96, h = 28) {
  if (!r || !r.anomaly || !r.anomaly.length) return "";
  const a = r.anomaly, t = r.trend || [];
  const yearly = [];
  for (let i = 0; i < a.length; i += 12) {
    const chunk = a.slice(i, i + 12).filter(x => x !== null && !isNaN(x));
    if (chunk.length) yearly.push(chunk.reduce((s, x) => s + x, 0) / chunk.length);
  }
  const tr0 = t.length ? t[0] : 0, tr1 = t.length ? t[t.length - 1] : 0;
  const all = yearly.concat([tr0, tr1]);
  const lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1;
  const x = i => (i / Math.max(1, yearly.length - 1)) * (w - 4) + 2;
  const y = v => h - 3 - ((v - lo) / span) * (h - 6);
  const d = yearly.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1)).join("");
  const cls = r.significant ? "sig" : "unc";
  return `<svg class="spark ${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">` +
    `<path class="sp-a" d="${d}"/>` +
    `<line class="sp-t" x1="2" y1="${y(tr0).toFixed(1)}" x2="${w - 2}" y2="${y(tr1).toFixed(1)}"/></svg>`;
}

// Count-up for numbers like "~70%", "28.41 m", "~185 hm³". Other text is shown as-is.
function countUp(el, text) {
  const s = String(text ?? "");
  const m = s.match(/^([~+\-]?)(\d+(?:\.\d+)?)(.*)$/);
  if (el._cu) cancelAnimationFrame(el._cu);
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!m || /^[\d–\-]/.test(m[3]) || reduce) { el.textContent = s; return; }
  const [, pre, num, post] = m;
  const target = parseFloat(num), dec = (num.split(".")[1] || "").length;
  const t0 = performance.now(), dur = 750;
  const step = now => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = pre + (target * e).toFixed(dec) + post;
    if (p < 1) el._cu = requestAnimationFrame(step);
  };
  el._cu = requestAnimationFrame(step);
}

// ---------------------------------------------------------------------------
// Hero Earth globe (canvas + d3-geo). Purely decorative: it turns to the
// place each tab is about. Needs d3-array + d3-geo and window.EARTH_LAND.
// ---------------------------------------------------------------------------
const EARTH_THEMES = {
  // land: 5 colour stops from top to bottom of the globe
  case1:   { o0: "#13665A", o1: "#04201C", land: ["#B9F2D3", "#4FCB8C", "#2FA56B", "#4FCB8C", "#B9F2D3"], edge: "#A8F5CB", glow: "#4FE3A0" },
  case2:   { o0: "#2160B8", o1: "#061A40", land: ["#D2E3FF", "#6EA2F0", "#4C83D6", "#6EA2F0", "#D2E3FF"], edge: "#BCD6FF", glow: "#6FA8FF" },
  compare: { o0: "#17708A", o1: "#05203A", land: ["#BDF3DD", "#4CC48F", "#3BA7A0", "#4C8FD9", "#C9DCFF"], edge: "#A9EEDC", glow: "#5FD3C6" },
  explore: { o0: "#2E7FD8", o1: "#03102A", land: ["#EEF3F6", "#5E9A4C", "#CDAE70", "#4E8E3E", "#EEF3F6"], edge: "#F2F6EC", glow: "#9CCBFF" },
};

const Earth = {
  canvas: null, ctx: null, w: 0, h: 0, dpr: 1,
  rot: [-30.27, -36], from: null, to: null, t0: 0, dur: 1400,
  pal: null, palFrom: null, palTo: null,
  marks: [], tab: "case1", raf: 0, visible: true,
  reduce: false, pending: null,

  init(canvas) {
    if (!window.d3 || !d3.geoOrthographic || !window.EARTH_LAND) return;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    this.proj = d3.geoOrthographic().clipAngle(90).precision(0.6);
    this.path = d3.geoPath(this.proj, this.ctx);
    this.grat = d3.geoGraticule10();
    this.pal = clonePal(EARTH_THEMES.case1);
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(canvas.parentElement);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(es => {
        this.visible = es[0].isIntersecting;
        if (this.visible) this.loop();
      }).observe(canvas);
    }
    document.addEventListener("visibilitychange", () => { if (!document.hidden) this.loop(); });
    this.resize();
    if (this.pending) { this.focus(...this.pending, true); this.pending = null; }
    this.loop();
  },

  resize() {
    const el = this.canvas.parentElement;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = el.clientWidth; this.h = el.clientHeight;
    this.canvas.width = this.w * this.dpr; this.canvas.height = this.h * this.dpr;
    this.canvas.style.width = this.w + "px"; this.canvas.style.height = this.h + "px";
    this.draw(performance.now());
  },

  focus(tab, marks, instant) {
    if (!this.ctx) { this.pending = [tab, marks]; return; }
    const key = tab + JSON.stringify(marks);
    if (key === this._key) return;
    this._key = key;
    this.tab = tab; this.marks = marks;
    let lon = 30, lat = 40;
    if (marks.length) {
      lon = marks.reduce((s, m) => s + m.lon, 0) / marks.length;
      lat = marks.reduce((s, m) => s + m.lat, 0) / marks.length;
    }
    const target = [-lon, -lat * (tab === "explore" ? 0.45 : 0.85)];
    const theme = EARTH_THEMES[tab] || EARTH_THEMES.explore;
    if (instant || this.reduce) {
      this.rot = target; this.pal = clonePal(theme); this.to = null;
    } else {
      this.from = this.rot.slice(); this.to = target;
      // turn the short way round
      let d = this.to[0] - this.from[0];
      if (d > 180) this.to[0] -= 360; else if (d < -180) this.to[0] += 360;
      this.palFrom = clonePal(this.pal); this.palTo = clonePal(theme);
      this.t0 = performance.now();
    }
    this.loop();
  },

  loop() {
    if (!this.ctx || this.raf) return;
    const tick = now => {
      this.raf = 0;
      this.draw(now);
      if (!this.reduce && this.visible && !document.hidden) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  },

  geom() {
    const mobile = this.w < 760;
    const r = mobile ? Math.min(this.w * 0.5, 210) : Math.min(this.h * 0.6, this.w * 0.29, 380);
    const cx = mobile ? this.w - r * 0.55 : this.w * 0.79;
    const cy = mobile ? r * 0.85 : this.h * 0.5;
    return { r, cx, cy, mobile };
  },

  draw(now) {
    const ctx = this.ctx; if (!ctx || !this.w) return;
    if (this.to) {
      const p = Math.min(1, (now - this.t0) / this.dur);
      const e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      this.rot = [this.from[0] + (this.to[0] - this.from[0]) * e, this.from[1] + (this.to[1] - this.from[1]) * e];
      this.pal = lerpPal(this.palFrom, this.palTo, e);
      if (p >= 1) { this.to = null; this.rot[0] = ((this.rot[0] + 540) % 360) - 180; }
    }
    const { r, cx, cy, mobile } = this.geom();
    const pal = this.pal;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalAlpha = mobile ? 0.42 : 0.92;
    this.proj.rotate(this.rot).translate([cx, cy]).scale(r);

    // orbit (back half), behind the globe
    const ang = this.reduce ? 0.6 : (now / 1000) * 0.32;
    this.orbit(cx, cy, r, ang, "back");

    // atmosphere glow
    let g = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.22);
    g.addColorStop(0, rgba(pal.glow, 0.42)); g.addColorStop(1, rgba(pal.glow, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.22, 0, 7); ctx.fill();

    // ocean with a light side (upper left) and night side (lower right)
    g = ctx.createRadialGradient(cx - r * 0.45, cy - r * 0.5, r * 0.1, cx, cy, r * 1.05);
    g.addColorStop(0, pal.o0); g.addColorStop(1, pal.o1);
    ctx.fillStyle = g; ctx.beginPath(); this.path({ type: "Sphere" }); ctx.fill();

    // graticule
    ctx.beginPath(); this.path(this.grat);
    ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 0.8; ctx.stroke();

    // land
    g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    pal.land.forEach((c, i) => g.addColorStop(i / 4, c));
    ctx.beginPath(); this.path(EARTH_LAND);
    ctx.fillStyle = g; ctx.globalAlpha *= 0.82; ctx.fill(); ctx.globalAlpha = mobile ? 0.42 : 0.92;
    ctx.strokeStyle = rgba(pal.edge, 0.55); ctx.lineWidth = 0.7; ctx.stroke();

    // terminator shading for a round, "sheer" look
    g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.2, cx + r * 0.1, cy + r * 0.1, r * 1.15);
    g.addColorStop(0, "rgba(255,255,255,0.10)"); g.addColorStop(0.55, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,12,0.55)");
    ctx.fillStyle = g; ctx.beginPath(); this.path({ type: "Sphere" }); ctx.fill();

    // rim light
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7);
    ctx.strokeStyle = rgba(pal.glow, 0.5); ctx.lineWidth = 1.2; ctx.stroke();

    // markers (dimmed on phones, where the globe sits behind the title)
    ctx.globalAlpha = mobile ? 0.45 : 1;
    const center = [-this.rot[0], -this.rot[1]];
    const pts = this.marks.map(m => ({ m, p: this.proj([m.lon, m.lat]) }));
    pts.forEach(({ m, p }, i) => {
      if (d3.geoDistance([m.lon, m.lat], center) > Math.PI / 2 - 0.05) return;
      const [x, y] = p;
      // with two markers, the left one gets its label on the left so they don't overlap
      const leftLabel = pts.length > 1 && pts.every((o, j) => j === i || o.p[0] >= x);
      const k = this.reduce ? 0.4 : ((now / 1600) % 1);
      ctx.beginPath(); ctx.arc(x, y, 5 + k * 16, 0, 7);
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7);
      ctx.fillStyle = "#FC3D21"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
      if (m.label && !mobile) {
        ctx.font = "500 12px 'IBM Plex Mono', ui-monospace, monospace";
        const tw = ctx.measureText(m.label).width;
        ctx.fillStyle = "rgba(4,10,24,0.72)";
        const bx = leftLabel ? x - 12 - (tw + 14) : x + 12;
        roundRect(ctx, bx, y - 11, tw + 14, 22, 6); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillText(m.label, bx + 7, y + 4);
      }
    });

    ctx.globalAlpha = mobile ? 0.42 : 0.92;
    this.orbit(cx, cy, r, ang, "front");
    ctx.globalAlpha = 1;
  },

  // tilted orbit ellipse with a small satellite
  orbit(cx, cy, r, ang, half) {
    const ctx = this.ctx, rx = r * 1.42, ry = r * 0.34, tilt = -0.32;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
    ctx.beginPath();
    if (half === "back") ctx.ellipse(0, 0, rx, ry, 0, Math.PI, 2 * Math.PI);
    else ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1; ctx.setLineDash([2, 5]); ctx.stroke(); ctx.setLineDash([]);
    const a = ang % (2 * Math.PI), sx = Math.cos(a) * rx, sy = Math.sin(a) * ry;
    const inFront = Math.sin(a) > 0;
    if ((half === "front") === inFront) {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sx, sy, 2.8, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(143,184,255,0.9)";
      ctx.fillRect(sx - 9, sy - 1.2, 5, 2.4); ctx.fillRect(sx + 4, sy - 1.2, 5, 2.4);
    }
    ctx.restore();
  },
};

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbHex(c) { return "#" + c.map(v => Math.round(v).toString(16).padStart(2, "0")).join(""); }
function lerpHex(a, b, t) { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map((v, i) => v + (y[i] - v) * t)); }
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
function clonePal(p) { return { o0: p.o0, o1: p.o1, edge: p.edge, glow: p.glow, land: p.land.slice() }; }
function lerpPal(a, b, t) {
  return { o0: lerpHex(a.o0, b.o0, t), o1: lerpHex(a.o1, b.o1, t), edge: lerpHex(a.edge, b.edge, t),
           glow: lerpHex(a.glow, b.glow, t), land: a.land.map((c, i) => lerpHex(c, b.land[i], t)) };
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function earthInit(el) { Earth.init(el); }

// Called from an Alpine x-effect, so it re-runs when tab / places / selections change.
function earthFocus(app) {
  const tab = app.tab, P = app.places || {};
  let marks = [];
  if (tab === "case1") marks = [{ lon: 30.27, lat: 40.69, label: "Sapanca" }];
  else if (tab === "case2") marks = [{ lon: 28.98, lat: 41.01, label: "Istanbul" }];
  else if (tab === "compare") {
    ["a", "b"].forEach(slot => {
      const p = app.cmpPlace ? app.cmpPlace(slot) : P[app.cmp[slot]];
      if (p) marks.push({ lon: +p.lon, lat: +p.lat, label: p.name.split(",")[0] });
    });
  } else {
    const lat = Number(app.ex.lat), lon = Number(app.ex.lon);
    const p = app.ex.place !== "custom" ? P[app.ex.place] : null;
    if (isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180)
      marks = [{ lon, lat, label: p ? p.name : `${lat.toFixed(1)}°, ${lon.toFixed(1)}°` }];
  }
  Earth.focus(tab, marks);
}
