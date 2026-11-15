// Earth Trend Detective Frontend Logic (Member C)
// Connects directly to FastAPI endpoints (/api/catalog, /api/case/{id}, /api/power).
// Supports instant EN | TR bilingual switching. No statistical formulas are computed in JS.

const I18N = {
  en: {
    brandSub: "Earth system case files with NASA data",
    tab_case1: "Sapanca",
    tab_case2: "Istanbul air",
    tab_compare: "Two regions",
    tab_explore: "Explore",
    introBtn: "Intro",
    replayTitle: "Replay NASA Orbital Intro",
    loadingRecords: "Loading NASA satellite records from Python engine...",
    missingTitle: "Waiting for NASA CSV files:",
    missingHint: " — Place CSVs in data/ folder to populate these suspect cards automatically.",
    suspectTitle: "Suspect board",
    suspectSub: "which variables are really changing?",
    fdrNote: "Benjamini-Hochberg FDR corrected across all cards",
    sigPill: "Significant change",
    uncPill: "Not certain yet",
    sigShort: "Significant",
    uncShort: "Not certain",
    yrsUnit: "yrs",
    decadeUnit: "decade",
    alreadyDetected: "Already significant",
    yrsTotal: "yrs total",
    veryLong: "Very long",
    flowTitle: "How trend detection works",
    flowDesc: "All numbers are computed deterministically by Python (core/stats_engine.py); no AI model generates or estimates statistics.",
    step1Title: "1. NASA Time Series",
    step1Desc: "Monthly satellite & reanalysis series (2000–2026)",
    step2Title: "2. Seasonal Removal",
    step2Desc: "Subtract monthly climatology to expose anomalies",
    step3Title: "3. Sen's Slope & MK",
    step3Desc: "Autocorrelation-corrected Hamed-Rao significance test",
    step4Title: "4. FDR & Years Needed",
    step4Desc: "Multi-test adjustment & Weatherhead detection horizon",
    cmpStep1: "1. Select NASA Variable (Live POWER API)",
    cmpStep2: "2. Region A",
    cmpStep3: "3. Region B",
    compareBtn: "Compare Two Regions",
    fetchingPower: "Fetching NASA POWER series...",
    inspectProof: "Open details",
    exQ1: "What do you want to investigate?",
    exQ2: "Where?",
    exQ3: "What kind of place is it?",
    customCoords: "Other location",
    searchPh: "Type a city or district, e.g. Sapanca",
    searchOther: "Other location",
    cmpPickPlace: "Choose a place from the search results first.",
    cmpTooClose: "These two places may fall in the same ~50 km data cell, so their results will be almost the same.",
    cmpSlow: "Live data from NASA POWER: this can take 20–40 seconds.",
    searchBtn: "Search",
    searchNone: "No matching city or district found. Try another spelling, or enter coordinates.",
    searchError: "Place search is not available right now. You can enter coordinates.",
    enterCoords: "Enter coordinates instead",
    hideCoords: "Hide coordinates",
    tooLarge: "This is a very large area; its centre does not represent all of it. Choose a city or district for a better result.",
    cellNote: "The analysis represents the area of about 50 km around this point.",
    placeSearching: "Finding the place…",
    placeUnknown: "No named place here (open sea?)",
    osmCredit: "Place names © OpenStreetMap contributors",
    latLabel: "Latitude (-90 to 90)",
    lonLabel: "Longitude (-180 to 180)",
    suggestedTitle: "Suggested NASA variables",
    suggestedSub: "tailored to your place type",
    analyzeLive: "Analyze Live",
    analyzing: "Analyzing...",
    inCaseFiles: "In case files",
    seeCase1: "See in Case 1 →",
    seeCase2: "See in Case 2 →",
    comingSoon: "Coming soon",
    noMatch: "No variable in the catalog matches this combination yet.",
    quickGuideLabel: "Quick guide:",
    quickGuideText: "Check the 10-year change first, then see if the p-value is below 0.05 to know if it is statistically significant.",
    m1Label: "1. Trend per decade",
    m2Label: "2. 95% range per decade",
    m3Label: "3. p-value (autocorrelation-corrected)",
    m3LabelFdr: "3. p-value (FDR-adjusted across this board)",
    m4Label: "4. Years of data",
    m5Label: "5. Estimated record length needed",
    naiveTitle: "Simple regression vs. corrected tests",
    naiveRow1: "Simple regression on raw data (naive)",
    naiveRow2: "Seasonal Mann-Kendall",
    naiveRow3: "Mann-Kendall, autocorrelation-corrected",
    naiveRow4: "t-test on anomalies, autocorrelation-corrected",
    naiveRow5: "t-test on anomalies (seasonal cycle removed), no autocorrelation correction",
    downloadCsv: "Download Monthly Series CSV",
    footerText: "Numbers are computed by deterministic Python code; explanations are template-based. Data: NASA GPM, GLDAS, MERRA-2, MODIS, OMI, AIRS, POWER.",
    chartAnomaly: "Monthly anomaly (season removed)",
    chartTrend: "Trend (Sen's slope)",
    chartYAxis: "Difference from normal",
    chartLockdown: "2020 Lockdown (Step change)",
    colVar: "Variable",
    colShape: "Yearly shape",
    colTrend: "Trend / decade",
    colRecord: "Record",
    colDetect: "Confirmation",
    colStatus: "Status",
    sensorsLabel: "Data",
    methodTitle: "Method",
  },
  tr: {
    brandSub: "NASA verileriyle Yer sistemi vaka dosyaları",
    tab_case1: "Sapanca",
    tab_case2: "İstanbul havası",
    tab_compare: "İki bölge",
    tab_explore: "Keşfet",
    introBtn: "Giriş",
    replayTitle: "NASA Yörünge Girişini Tekrar Oynat",
    loadingRecords: "Python motorundan NASA uydu kayıtları yükleniyor...",
    missingTitle: "NASA CSV dosyaları bekleniyor:",
    missingHint: " — Şüpheli kartlarını otomatik doldurmak için CSV dosyalarını data/ klasörüne ekleyin.",
    suspectTitle: "Şüpheli panosu",
    suspectSub: "hangi değişkenler gerçekten değişiyor?",
    fdrNote: "Tüm kartlarda Benjamini-Hochberg FDR düzeltmesi uygulandı",
    sigPill: "Anlamlı değişim",
    uncPill: "Henüz kesin değil",
    sigShort: "Anlamlı",
    uncShort: "Kesin değil",
    yrsUnit: "yıl",
    decadeUnit: "on yıl",
    alreadyDetected: "Zaten anlamlı",
    yrsTotal: "yıl toplam",
    veryLong: "Çok uzun",
    flowTitle: "Trend tespiti nasıl çalışır?",
    flowDesc: "Tüm sayılar Python (core/stats_engine.py) tarafından deterministik olarak hesaplanır; hiçbir yapay zeka istatistik üretmez.",
    step1Title: "1. NASA Zaman Serisi",
    step1Desc: "Aylık uydu ve yeniden analiz serileri (2000–2026)",
    step2Title: "2. Mevsimsellik Arındırma",
    step2Desc: "Anomalileri ortaya çıkarmak için aylık iklim ortalaması çıkarılır",
    step3Title: "3. Sen Eğimi & MK",
    step3Desc: "Otokorelasyon düzeltmeli Hamed-Rao anlamlılık testi",
    step4Title: "4. FDR & Gerekli Süre",
    step4Desc: "Çoklu test düzeltmesi ve Weatherhead tespit ufku",
    cmpStep1: "1. NASA Değişkeni Seçin (Canlı POWER API)",
    cmpStep2: "2. Bölge A",
    cmpStep3: "3. Bölge B",
    compareBtn: "İki Bölgeyi Karşılaştır",
    fetchingPower: "NASA POWER serileri alınıyor...",
    inspectProof: "Ayrıntıları aç",
    exQ1: "Neyi araştırmak istiyorsunuz?",
    exQ2: "Nerede?",
    exQ3: "Burası nasıl bir yer?",
    customCoords: "Diğer konum",
    searchPh: "Şehir veya ilçe yazın, örn. Sapanca",
    searchOther: "Diğer konum",
    cmpPickPlace: "Önce arama sonuçlarından bir yer seçin.",
    cmpTooClose: "İki yer aynı ~50 km'lik veri hücresinde olabilir; sonuçlar neredeyse aynı çıkar.",
    cmpSlow: "NASA POWER'dan canlı veri çekiliyor; 20–40 sn sürebilir.",
    searchBtn: "Ara",
    searchNone: "Eşleşen şehir veya ilçe bulunamadı. Başka bir yazım deneyin ya da koordinat girin.",
    searchError: "Yer arama şu an kullanılamıyor. Koordinat girebilirsiniz.",
    enterCoords: "Bunun yerine koordinat gir",
    hideCoords: "Koordinatları gizle",
    tooLarge: "Bu çok geniş bir alan; merkezi alanın tamamını temsil etmez. Daha doğru sonuç için şehir veya ilçe seçin.",
    cellNote: "Analiz bu noktanın çevresindeki yaklaşık 50 km'lik alanı temsil eder.",
    placeSearching: "Yer aranıyor…",
    placeUnknown: "Burada adı bilinen bir yer yok (açık deniz olabilir)",
    osmCredit: "Yer adları © OpenStreetMap katkıcıları",
    latLabel: "Enlem (-90 ile 90 arası)",
    lonLabel: "Boylam (-180 ile 180 arası)",
    suggestedTitle: "Önerilen NASA değişkenleri",
    suggestedSub: "seçtiğiniz bölge tipine göre",
    analyzeLive: "Canlı Analiz Et",
    analyzing: "Analiz ediliyor...",
    inCaseFiles: "Vaka dosyalarında",
    seeCase1: "Vaka 1'de gör →",
    seeCase2: "Vaka 2'de gör →",
    comingSoon: "Yakında",
    noMatch: "Bu kombinasyonla eşleşen bir değişken henüz katalogda yok.",
    quickGuideLabel: "Hızlı rehber:",
    quickGuideText: "Önce 10 yıllık değişime bakın, ardından değişimin istatistiksel olarak anlamlı olup olmadığını görmek için p-değerinin 0.05 altında olup olmadığını kontrol edin.",
    m1Label: "1. On yıllık eğilim",
    m2Label: "2. On yıllık %95 aralık",
    m3Label: "3. p-değeri (otokorelasyon düzeltmeli)",
    m3LabelFdr: "3. p-değeri (panodaki testlerle birlikte FDR düzeltmeli)",
    m4Label: "4. Veri süresi",
    m5Label: "5. Tahmini gerekli kayıt süresi",
    naiveTitle: "Basit regresyon ve düzeltilmiş testler",
    naiveRow1: "Ham veri üzerinde basit regresyon (naif)",
    naiveRow2: "Mevsimsel Mann-Kendall",
    naiveRow3: "Otokorelasyon düzeltmeli Mann-Kendall",
    naiveRow4: "Anomaliler üzerinde t-testi (otokorelasyon düzeltmeli)",
    naiveRow5: "Anomaliler üzerinde t-testi (mevsim çıkarılmış, otokorelasyon düzeltmesiz)",
    downloadCsv: "Aylık Veri Serisini İndir (CSV)",
    footerText: "Sayılar deterministik Python koduyla hesaplanır; açıklamalar şablon tabanlıdır. Veriler: NASA GPM, GLDAS, MERRA-2, MODIS, OMI, AIRS, POWER.",
    chartAnomaly: "Aylık anomali (mevsimsellik çıkarılmış)",
    chartTrend: "Eğilim (Sen eğimi)",
    chartYAxis: "Normalden fark",
    chartLockdown: "2020 Kapanması (Ani düşüş)",
    colVar: "Değişken",
    colShape: "Yıllık seyir",
    colTrend: "Eğilim / on yıl",
    colRecord: "Kayıt",
    colDetect: "Doğrulama",
    colStatus: "Durum",
    sensorsLabel: "Veri",
    methodTitle: "Yöntem",
  }
};

// Kind of place returned by the place search (OpenStreetMap "addresstype").
const KIND_LABEL = {
  en: { country: "country", state: "region", region: "region", province: "province", county: "district", district: "district",
        city: "city", town: "town", village: "village", municipality: "municipality", water: "water body", lake: "lake",
        peak: "peak", mountain: "mountain", island: "island", forest: "forest" },
  tr: { country: "ülke", state: "bölge", region: "bölge", province: "il", county: "ilçe", district: "ilçe",
        city: "şehir", town: "ilçe", village: "köy", municipality: "belediye", water: "su kütlesi", lake: "göl",
        peak: "zirve", mountain: "dağ", island: "ada", forest: "orman" },
};

// Place search: ask our server first; if OpenStreetMap refuses the server (shared cloud IP),
// the browser asks OpenStreetMap directly and applies the same size rules as core/data_sources.py.
const NATURAL = ["natural", "water", "waterway", "landuse", "leisure"];
async function findPlaces(q, lang) {
  try {
    const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&lang=${lang}`).then(x => x.json());
    if (!r.error) return { results: r.results || [] };
  } catch (e) { /* fall through to the browser request */ }
  try {
    const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=15"
      + `&accept-language=${lang}&q=${encodeURIComponent(q)}`;
    const raw = await fetch(url).then(x => { if (!x.ok) throw new Error(x.status); return x.json(); });
    const out = [], seen = new Set();
    for (const x of raw) {
      const rank = Number(x.place_rank || 30), natural = NATURAL.includes(x.category);
      if (rank >= 21 && !natural) continue;
      const a = x.address || {};
      const name = x.name || (x.display_name || "").split(",")[0];
      const region = [...new Set([a.province || a.state, a.country].filter(Boolean))].join(", ");
      const kind = x.addresstype || x.type || "";
      const key = `${name}|${region}|${kind}`;
      if (!name || seen.has(key)) continue;
      seen.add(key);
      out.push({ name, region, kind, lat: Math.round(x.lat * 100) / 100, lon: Math.round(x.lon * 100) / 100,
                 scale: rank <= 10 && !natural ? "large" : "ok" });
      if (out.length >= 5) break;
    }
    return { results: out };
  } catch (e) {
    return { results: [], error: true };
  }
}

const VAR_TR = {
  precip: "Yağış miktarı",
  evap: "Evapotranspirasyon",
  runoff: "Yüzey akışı",
  soil: "Toprak nemi",
  t2m: "Hava sıcaklığı (2 m)",
  lake_lst: "Göl yüzey sıcaklığı",
  no2: "Troposferik NO₂",
  airs_t: "Üst atmosfer sıcaklığı",
  ndvi: "Bitki örtüsü indeksi (NDVI)",
};

const TOPIC_TR = {
  water: "Su döngüsü",
  temperature: "Sıcaklık",
  air: "Hava kalitesi",
  vegetation: "Bitki örtüsü",
};

const PLACE_TYPE_TR = {
  lake_basin: "Göl havzası",
  big_city: "Büyük şehir",
  dry_inland: "Kurak iç bölge",
  coast_forest: "Kıyı / orman",
};

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

function drawChart(elId, r, lang = "en") {
  const el = document.getElementById(elId);
  if (!el || !r) return;

  const dict = I18N[lang] || I18N.en;
  const accent =
    getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#2F6B4F";
  const isIstanbulNo2 = r.id === "no2";
  const shapes = [];
  const annotations = [];

  if (isIstanbulNo2) {
    shapes.push({
      type: "line",
      x0: "2020-03-01",
      x1: "2020-03-01",
      y0: 0,
      y1: 1,
      yref: "paper",
      line: { color: "#B4532A", width: 1.2, dash: "dot" },
    });
    annotations.push({
      x: "2020-03-01",
      y: 0.98,
      yref: "paper",
      text: dict.chartLockdown,
      showarrow: false,
      xanchor: "left",
      xshift: 4,
      font: { size: 11, color: "#B4532A", family: "'IBM Plex Mono', ui-monospace, monospace" },
      bgcolor: "rgba(255, 255, 255, 0.85)",
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
        name: dict.chartAnomaly,
        line: { color: "rgba(113, 113, 122, 0.55)", width: 1.1 },
      },
      {
        x: r.dates,
        y: r.trend,
        type: "scatter",
        mode: "lines",
        name: dict.chartTrend,
        line: { color: accent, width: 2.4 },
      },
    ],
    {
      margin: { l: 48, r: 8, t: 8, b: 30 },
      height: el.classList.contains("big") ? 295 : 220,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: {
        family: "'IBM Plex Sans', -apple-system, 'Segoe UI', sans-serif",
        size: 11.5,
        color: "#52525B",
      },
      yaxis: {
        title: { text: `${dict.chartYAxis} (${r.unit})`, font: { size: 11 } },
        gridcolor: "#EFEEEA",
        zerolinecolor: "#A1A1AA",
        zerolinewidth: 1,
      },
      xaxis: { gridcolor: "rgba(0,0,0,0)", linecolor: "#E4E3DF" },
      legend: { orientation: "h", y: -0.2, font: { size: 11.5 } },
      shapes,
      annotations,
    },
    { displayModeBar: false, responsive: true }
  );
}

// Language chosen on an earlier visit; English unless the visitor picked Turkish.
function savedLang() {
  try {
    return localStorage.getItem("lang") === "tr" ? "tr" : "en";
  } catch (e) {
    return "en";
  }
}

function trendApp() {
  return {
    lang: savedLang(),

    tabs: [
      { id: "case1", icon: "waves" },
      { id: "case2", icon: "wind" },
      { id: "compare", icon: "arrow-left-right" },
      { id: "explore", icon: "compass" },
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
    cmp: { var: "t2m", a: "rize", b: "konya", results: [],
           custom: { a: null, b: null },
           s: { a: { q: "", results: [], state: "" }, b: { q: "", results: [], state: "" } } },
    ex: { topic: "water", place: "sapanca", type: "lake_basin", lat: 40.69, lon: 30.27 },
    placeLabel: null, placeState: "", _placeTimer: null,
    q: "", results: [], searchState: "", showCoords: false, chosenScale: "",

    t(key) {
      return (I18N[this.lang] && I18N[this.lang][key]) || I18N.en[key] || key;
    },

    setLang(code) {
      this.lang = code;
      document.documentElement.lang = code;
      try {
        localStorage.setItem("lang", code);
      } catch (e) {}
      if (this.ex.place === "custom") this.lookupPlace();
      if (this.sheet) {
        this.$nextTick(() => drawChart("sheet-chart", this.sheet, this.lang));
      }
      if (this.cmp.results.length) {
        this.$nextTick(() =>
          this.cmp.results.forEach((r, i) => drawChart(`cmp-chart-${i}`, r, this.lang))
        );
      }
    },

    varName(v) {
      if (!v) return "";
      return this.lang === "tr" && VAR_TR[v.id] ? VAR_TR[v.id] : v.name;
    },

    topicName(k, fallback) {
      return this.lang === "tr" && TOPIC_TR[k] ? TOPIC_TR[k] : fallback;
    },

    placeTypeName(k, fallback) {
      return this.lang === "tr" && PLACE_TYPE_TR[k] ? PLACE_TYPE_TR[k] : fallback;
    },

    async init() {
      document.documentElement.lang = this.lang;
      try {
        const res = await fetch("/api/catalog").then(r => r.json());
        this.catalog = res.catalog;
        this.places = res.places;
        this.cases = res.cases;
      } catch (e) {
        this.error = "Could not load /api/catalog from server.";
      }

      const h = location.hash.slice(1);
      this.go(this.tabs.some(item => item.id === h) ? h : "case1");

      this.$watch("sheet", v => {
        if (v) setTimeout(() => drawChart("sheet-chart", v, this.lang), 310);
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
        if (this.lang === "tr") {
          return {
            kicker: "VAKA 1 · SAPANCA GÖLÜ HAVZASI",
            sensorNote: "GPM IMERG · GLDAS NOAH · MERRA-2 · MODIS LST",
            headline: "Sapanca Gölü havzası",
            desc: "Sapanca Gölü, Sakarya'nın içme suyunun yaklaşık %70'ini karşılar. Göl çevresindeki hangi iklim değişkenleri uzun vadeli eğilim gösteriyor? Göl aktif olarak yönetilmektedir; bu araç yalnızca iklim tarafını gösterir, su çekimlerini modellemez.",
          };
        }
        return {
          kicker: "CASE 1 · SAPANCA LAKE BASIN",
          sensorNote: "GPM IMERG · GLDAS NOAH · MERRA-2 · MODIS LST",
          headline: this.cases.case1?.title || "Sapanca Lake basin",
          desc:
            this.cases.case1?.intro ||
            "Sapanca Lake supplies about 70% of Sakarya's drinking water. Which climate variables around the lake show a long-term trend? The lake is actively managed; this tool shows the climate side only and does not model withdrawals or transfers.",
        };
      }
      if (this.tab === "case2") {
        if (this.lang === "tr") {
          return {
            kicker: "VAKA 2 · İSTANBUL ATMOSFERİ",
            sensorNote: "OMI TROPOSFERİK NO2 · AIRS · MERRA-2",
            headline: "İstanbul üzerindeki hava",
            desc: "Büyük bir şehrin üzerindeki hava değişiyor mu? Not: 2020 kapanma dönemindeki düşüş uzun vadeli bir iklim eğilimi değil, ani bir basamak değişimidir.",
          };
        }
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
        if (this.lang === "tr") {
          return {
            kicker: "VAKA 3 · BÖLGESEL KARŞILAŞTIRMA",
            sensorNote: "NASA POWER AYLIK NOKTA API (1981–2025)",
            headline: "Aynı değişken, iki farklı bölge",
            desc: "Aynı büyük ölçekli iklim süreci bir bölgede değişkeni yukarı çekerken başka bir bölgede aşağı itebilir. İki konumu yan yana karşılaştırın.",
          };
        }
        return {
          kicker: "CASE 3 · REGIONAL CONTRAST",
          sensorNote: "NASA POWER MONTHLY POINT API (1981–2025)",
          headline: "Same variable, two regions",
          desc: "The same large-scale process can push a climate variable up in one region and down in another. Compare two locations side by side.",
        };
      }
      if (this.lang === "tr") {
        return {
          kicker: "KEŞFET · DÜNYANIN HER YERİNDE",
          sensorNote: "REHBERLİ DEĞİŞKEN EŞLEŞTİRME + CANLI NASA POWER",
          headline: "Dünyanın her yerinde veri dedektifi olun",
          desc: "Üç kısa soruyu yanıtlayın. Bu tür bir konumda eğilim gösterebilecek NASA değişkenlerini önerip deterministik olarak test edelim.",
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
      const tr = this.lang === "tr";
      if (this.tab === "case1") {
        return [
          {
            label: tr ? "SAKARYA İÇME SUYU" : "SAKARYA DRINKING WATER",
            value: "~70%",
            foot: tr ? "Sapanca Gölü'nden karşılanır · SASKİ" : "Supplied by Sapanca Lake · SASKİ",
            icon: "droplets",
          },
          {
            label: tr ? "REKOR DÜŞÜK SEVİYE" : "RECORD LOW LEVEL",
            value: "28.41 m",
            foot: tr ? "Ocak 2026 minimum kotu" : "January 2026 minimum",
            icon: "waves",
          },
          {
            label: tr ? "KRİTİK EŞİK" : "CRITICAL THRESHOLD",
            value: "~30 m",
            foot: tr ? "Ekim 2026 toparlanma: ~30.56 m" : "Oct 2026 recovery: ~30.56 m",
            icon: "gauge",
          },
          {
            label: tr ? "YILLIK SU BÜTÇESİ" : "ANNUAL WATER BUDGET",
            value: "~185 hm³",
            foot: tr ? "~100 hm³ içme suyuna ayrılır" : "~100 hm³ allocated to drinking water",
            icon: "clock",
          },
        ];
      }
      if (this.tab === "case2") {
        return [
          {
            label: tr ? "BİRİNCİL SENSÖR" : "PRIMARY SENSOR",
            value: "OMI NO₂",
            foot: tr ? "Troposferik kolon (2004–2026)" : "Tropospheric column (2004–2026)",
            icon: "factory",
          },
          {
            label: tr ? "ÜST HAVA KATMANI" : "UPPER AIR LAYER",
            value: "AIRS 3D",
            foot: tr ? "Basınç seviyesi sıcaklığı" : "Pressure-level temperature",
            icon: "layers",
          },
          {
            label: tr ? "2020 KAPANMASI" : "2020 LOCKDOWN",
            value: tr ? "Ani Düşüş" : "Step Drop",
            foot: tr ? "Kısa süreli şok, iklim trendi değil" : "Short-term shock, not a trend",
            icon: "alert-circle",
          },
          {
            label: tr ? "DÜZELTME YÖNTEMİ" : "CORRECTION METHOD",
            value: "Hamed-Rao",
            foot: tr ? "Otokorelasyon düzeltmeli MK" : "Autocorrelation-adjusted MK",
            icon: "shield-check",
          },
        ];
      }
      if (this.tab === "compare") {
        return [
          {
            label: tr ? "CANLI VERİ KAYNAĞI" : "LIVE DATA SOURCE",
            value: "POWER API",
            foot: tr ? "Anahtarsız NASA aylık kayıtları" : "Keyless NASA monthly records",
            icon: "satellite",
          },
          {
            label: tr ? "ZAMAN ARALIĞI" : "TIME COVERAGE",
            value: "1981–2025",
            foot: tr ? "45 yıla kadar aylık veri" : "Up to 45 years of monthly data",
            icon: "calendar",
          },
          {
            label: tr ? "IZGARA ÖLÇEĞİ" : "GRID CELL SCALE",
            value: "~50 km",
            foot: tr ? "Bölgesel iklim sinyali ölçeği" : "Regional climate signal scale",
            icon: "globe",
          },
          {
            label: tr ? "EĞİLİM HESAPLAYICI" : "TREND ESTIMATOR",
            value: "Sen's Slope",
            foot: tr ? "Aykırı değerlere dirençli 10 yıllık hız" : "Outlier-resistant 10-yr rate",
            icon: "trending-up",
          },
        ];
      }
      return [
        {
          label: tr ? "ADIM 1 · KONU" : "STEP 1 · TOPIC",
          value: tr ? "4 Alan" : "4 Domains",
          foot: tr ? "Su, sıcaklık, hava, bitki örtüsü" : "Water, temperature, air, vegetation",
          icon: "compass",
        },
        {
          label: tr ? "ADIM 2 · KONUM" : "STEP 2 · LOCATION",
          value: tr ? "Her Koordinat" : "Any Coords",
          foot: tr ? "Hazır şehirler veya özel enlem/boylam" : "Preset cities or custom lat/lon",
          icon: "map-pin",
        },
        {
          label: tr ? "ADIM 3 · BÖLGE TİPİ" : "STEP 3 · PLACE TYPE",
          value: tr ? "4 Biyom" : "4 Biomes",
          foot: tr ? "Göl, şehir, kurak iç bölge, kıyı/orman" : "Lake, city, dry inland, coast/forest",
          icon: "tree-pine",
        },
        {
          label: tr ? "SIFIR HALÜSİNASYON" : "ZERO HALLUCINATION",
          value: tr ? "%100 Kod" : "100% Code",
          foot: tr ? "Python istatistiği + şablon metin" : "Python stats + template text",
          icon: "cpu",
        },
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

    // Which case file (case1 / case2) holds this variable; null if none yet.
    caseOf(varId) {
      for (const [k, c] of Object.entries(this.cases || {})) {
        if ((c.vars || []).includes(varId)) return k;
      }
      return null;
    },

    openCase(caseId) {
      this.go(caseId);
      window.scrollTo({ top: 0, behavior: "smooth" });
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

    // "Another place": search by name, the user picks one result (never a free-text question).
    async searchPlaces() {
      const q = this.q.trim();
      if (q.length < 2) return;
      this.searchState = "searching";
      this.results = [];
      const r = await findPlaces(q, this.lang);
      this.results = r.results;
      this.searchState = r.error ? "error" : (this.results.length ? "" : "none");
    },

    kindName(k) {
      return (KIND_LABEL[this.lang] || KIND_LABEL.en)[k] || k;
    },

    choosePlace(r) {
      Object.assign(this.ex, { place: "custom", lat: r.lat, lon: r.lon });
      this.placeLabel = r.region && r.region !== r.name ? `${r.name}, ${r.region}` : r.name;
      this.placeState = "found";
      this.chosenScale = r.scale;
      this.results = [];
      this.searchState = "";
    },

    // Custom coordinates: show the place name (OpenStreetMap via our server), with a short delay while typing.
    lookupPlace() {
      clearTimeout(this._placeTimer);
      this.chosenScale = "";
      const lat = Number(this.ex.lat), lon = Number(this.ex.lon);
      if (this.ex.place !== "custom" || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
      this.placeState = "searching";
      this._placeTimer = setTimeout(async () => {
        try {
          const r = await fetch(`/api/place?lat=${lat}&lon=${lon}&lang=${this.lang}`).then(x => x.json());
          this.placeLabel = r.name;
          this.placeState = r.name ? "found" : "unknown";
        } catch (e) {
          this.placeState = "";
        }
      }, 700);
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

    // Two regions: a preset place or any place found by search (same search as Explore).
    cmpPlace(slot) {
      const k = this.cmp[slot];
      return k === "custom" ? this.cmp.custom[slot] : this.places[k];
    },

    async cmpSearch(slot) {
      const st = this.cmp.s[slot];
      const q = st.q.trim();
      if (q.length < 2) return;
      st.state = "searching";
      st.results = [];
      const r = await findPlaces(q, this.lang);
      st.results = r.results;
      st.state = r.error ? "error" : (st.results.length ? "" : "none");
    },

    cmpChoose(slot, r) {
      const name = r.region && r.region !== r.name ? `${r.name}, ${r.region}` : r.name;
      this.cmp.custom[slot] = { name, lat: r.lat, lon: r.lon, scale: r.scale };
      this.cmp.s[slot].results = [];
      this.cmp.s[slot].state = "";
      this.cmp.results = [];
    },

    // POWER cells are 0.5° x 0.625°: closer than that, both places read (almost) the same data.
    cmpTooClose() {
      const a = this.cmpPlace("a"), b = this.cmpPlace("b");
      return !!(a && b && Math.abs(a.lat - b.lat) < 0.5 && Math.abs(a.lon - b.lon) < 0.625);
    },

    cmpIsLive() {
      return this.cmp.a === "custom" || this.cmp.b === "custom";
    },

    async compare() {
      this.error = "";
      const a = this.cmpPlace("a");
      const b = this.cmpPlace("b");
      if (!a || !b) {
        this.error = this.t("cmpPickPlace");
        return;
      }
      this.busy = true;
      this.cmp.results = [];
      try {
        this.cmp.results = await Promise.all([
          this.fetchPower(this.cmp.var, a.lat, a.lon),
          this.fetchPower(this.cmp.var, b.lat, b.lon),
        ]);
        this.$nextTick(() =>
          this.cmp.results.forEach((r, i) => drawChart(`cmp-chart-${i}`, r, this.lang))
        );
      } catch (e) {
        this.error = e.message;
      } finally {
        this.busy = false;
      }
    },

    perDecade(r) {
      const s = r.stats.sen_slope_per_year * 10;
      return `${s >= 0 ? "+" : ""}${Number(s.toPrecision(3))} ${r.unit} / ${this.t("decadeUnit")}`;
    },

    range(r) {
      const [lo, hi] = r.stats.ci95.map(x => Number((x * 10).toPrecision(3)));
      const connector = this.lang === "tr" ? " ile " : " to ";
      return `${lo}${connector}${hi}`;
    },

    detectText(r) {
      if (r.significant) return this.t("alreadyDetected");
      const n = r.stats.years_to_detect;
      return n ? `~${Math.round(n)} ${this.t("yrsTotal")}` : this.t("veryLong");
    },

    fmtP: p => (p === null || p === undefined ? "-" : p < 0.001 ? "< 0.001" : p.toFixed(3)),
    pText: p => (p === null || p === undefined ? "p = -" : p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`),
    pLabel(r) { return this.t(r.p_kind === "fdr_bh" ? "m3LabelFdr" : "m3Label"); },
    methodName(r) {
      const m = (r.stats && r.stats.acp_method) || r.p_method || "hamed_rao";
      return { hamed_rao: "Hamed-Rao", yue_wang: "Yue-Wang", pre_whitening: "pre-whitening" }[m] || m;
    },
    pClass: p => (p !== null && p < 0.05 ? "sig" : "unc"),

    metricHelp(r, key) {
      const s = r.stats.sen_slope_per_year * 10;
      const [lo, hi] = r.stats.ci95;
      const tr = this.lang === "tr";

      if (key === "trend") {
        if (s > 0) return tr ? "Her 10 yılda bu miktar kadar artış gösterir." : "Goes up by this amount every 10 years.";
        if (s < 0) return tr ? "Her 10 yılda bu miktar kadar düşüş gösterir." : "Drops by this amount every 10 years.";
        return tr ? "Genel olarak yatay — belirgin bir artış veya azalış yok." : "Flat overall — no clear upward or downward shift.";
      }
      if (key === "range") {
        const sameSign = (lo > 0 && hi > 0) || (lo < 0 && hi < 0);
        if (sameSign) {
          return tr
            ? "10 yıllık değişim %95 güvenle bu aralıkta; aralık sıfırı içermiyor (yön tutarlı)."
            : "The 10-year change lies in this range with 95% confidence; the range excludes zero (consistent direction).";
        }
        return tr
          ? "Sıfırı kesiyor — hala hafifçe yukarı veya aşağı olabilir."
          : "Crosses zero — could still be slightly up or down.";
      }
      if (key === "pvalue") {
        return r.p_final < 0.05
          ? tr
            ? "0.05 altında — istatistiksel olarak anlamlı; trend yokken böyle bir sonuç beklenmez."
            : "Below 0.05 — statistically significant; a result like this is unlikely if there were no trend."
          : tr
            ? "0.05 veya üzeri — anlamlı değil; değişim henüz doğal dalgalanmadan ayırt edilemiyor."
            : "0.05 or higher — not significant; the change cannot yet be told apart from natural variability.";
      }
      if (key === "years") {
        return tr
          ? "Bu konumda incelenen NASA uydu kayıtlarının toplam yılı."
          : "Years of NASA satellite records checked here.";
      }
      if (key === "detect") {
        if (r.significant) {
          return tr
            ? "Mevcut kayıtla zaten istatistiksel olarak anlamlı."
            : "Already statistically significant with the current record.";
        }
        if (r.stats.years_to_detect) {
          return tr
            ? "Bu eğilimi tespit etmek için gereken toplam kayıt süresinin kaba tahmini (hız ve gürültü aynı kalırsa). Anlamlı olmaması değişim olmadığı anlamına gelmez."
            : "Rough estimate of the total record length needed to detect this trend, if its rate and noise stay the same. Not significant does not mean no change.";
        }
        return tr
          ? "Değişim sıfıra çok yakın — gürültüden ayırt etmek on yıllar alır."
          : "Change is near zero — would take decades to tell apart from noise.";
      }
      return "";
    },

    combinedSummary(r) {
      const s = r.stats.sen_slope_per_year * 10;
      const rateStr = `${s >= 0 ? "+" : ""}${Number(s.toPrecision(3))} ${r.unit}/${this.t("decadeUnit")}`;
      const yrs = r.stats.years;
      const need = r.stats.years_to_detect;
      const vName = this.varName(r);
      const tr = this.lang === "tr";

      if (r.significant) {
        if (tr) {
          const dirWord = s >= 0 ? "artış" : "düşüş";
          return {
            badge: s >= 0 ? "İstatistiksel Olarak Anlamlı Artış" : "İstatistiksel Olarak Anlamlı Azalış",
            lead: `Özetle: ${yrs} yıllık NASA verisinde ${vName}, mevsimsel dalgalanmaların ötesinde istatistiksel olarak anlamlı bir ${dirWord} (${rateStr}) gösteriyor.`,
          };
        }
        const dirWord = s >= 0 ? "rise" : "drop";
        return {
          badge: s >= 0 ? "Statistically Significant Increase" : "Statistically Significant Decrease",
          lead: `In short: Across ${yrs} years of NASA data, ${vName} shows a statistically significant ${dirWord} of ${rateStr}, beyond normal seasonal swings.`,
        };
      }
      if (need) {
        if (tr) {
          const hint = s >= 0 ? "artış" : "düşüş";
          return {
            badge: "Daha Uzun Kayıt Gerekli",
            lead: `Özetle: ${yrs} yıllık veride hafif bir ${hint} işareti görülüyor ancak normal hava gürültüsü hala yüksek (p ≥ 0.05). Kaba bir tahminle toplam ~${Math.round(need)} yıllık kayıt gerekir — anlamlı olmaması değişim olmadığı anlamına gelmez.`,
          };
        }
        const hint = s >= 0 ? "rising" : "falling";
        return {
          badge: "Needs Longer Record",
          lead: `In short: We see a ${hint} hint over ${yrs} years, but normal weather noise is still too high (p ≥ 0.05). As a rough estimate, about ${Math.round(need)} years of record in total would be needed to detect it — not significant does not mean no change.`,
        };
      }
      if (tr) {
        return {
          badge: "Anlamlı Eğilim Tespit Edilmedi",
          lead: `Özetle: ${yrs} yıllık NASA kayıtlarında ${vName} için istatistiksel olarak anlamlı bir artış ya da azalış tespit edilmedi.`,
        };
      }
      return {
        badge: "No Significant Trend Detected",
        lead: `In short: Over ${yrs} years of NASA records, no statistically significant increase or decrease was detected for ${vName}.`,
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
