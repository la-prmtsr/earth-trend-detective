"""Trend Detective - FastAPI server.
Run:  uvicorn server:app --reload     ->  open http://127.0.0.1:8000
Every number is computed by the Python code in core/; the front end (static/) only displays it."""
import json
import math
import pathlib
from functools import lru_cache

import numpy as np

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from core.config import CASES, CONVERT, PLACES
from core.data_sources import fetch_power, load_giovanni_csv, load_power_cache
from core.explain import explain, naive_vs_correct
from core.stats_engine import analyze, fdr_adjust

ROOT = pathlib.Path(__file__).resolve().parent
CAT = json.loads((ROOT / "core" / "catalog.json").read_text(encoding="utf-8"))
VARS = {v["id"]: v for v in CAT["variables"]}
POWER_CACHE = ROOT / "data" / "power_cache"  # saved POWER responses for the preset places (scripts/cache_power.py)
RESULTS = ROOT / "data" / "results_cache"    # precomputed API answers (scripts/precompute.py)


def _load_precomputed() -> dict:
    out = {}
    if RESULTS.exists():
        for f in RESULTS.glob("*.json"):
            out[f.stem] = json.loads(f.read_text(encoding="utf-8"))
    return out


PRECOMPUTED = _load_precomputed()  # served as-is, so the free server does no heavy math on a click


def power_key(var_id: str, lat: float, lon: float) -> str:
    return f"power_{var_id}_{lat:.2f}_{lon:.2f}"

app = FastAPI(title="Trend Detective")
import threading

def _warm_all():
    """Compute the case files and every cached preset place in the background,
    so the first click in the app is instant."""
    for c in CASES:
        if "case_" + c not in PRECOMPUTED:
            _case(c)
    for p in PLACES.values():
        for var_id, v in VARS.items():
            if power_key(var_id, round(p["lat"], 2), round(p["lon"], 2)) in PRECOMPUTED:
                continue
            if v.get("power_param") and load_power_cache(POWER_CACHE, p["lat"], p["lon"], v["power_param"]) is not None:
                try:
                    _power_payload(var_id, round(p["lat"], 2), round(p["lon"], 2))
                except Exception:
                    pass


@app.on_event("startup")
def warm_up():
    threading.Thread(target=_warm_all, daemon=True).start()

def clean(x):
    """Make a value JSON-safe: NaN/infinity -> None, numpy numbers -> float."""
    if isinstance(x, dict):
        return {k: clean(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [clean(v) for v in x]
    if hasattr(x, "item"):
        x = x.item()
    if isinstance(x, float) and (math.isnan(x) or math.isinf(x)):
        return None
    return x


def result_payload(var_id: str, s, p_adj: float | None = None, r: dict | None = None,
                   unit: str | None = None, events: list | None = None) -> dict:
    v = VARS[var_id]
    unit = unit or v["unit"]
    r = dict(r if r is not None else analyze(s))
    anom = r.pop("anomaly")
    p = p_adj if p_adj is not None else r["hamed_rao_p"]
    t = np.asarray((anom.index - anom.index[0]).days) / 365.25
    b = float(np.nanmedian(anom.values - r["sen_slope_per_year"] * t))
    return clean({
        "id": var_id, "name": v["name"], "unit": unit, "definition": v["definition"], "source": v["source"],
        "dates": [d.strftime("%Y-%m-%d") for d in s.index],
        "values": list(s.values), "anomaly": list(anom.values),
        "trend": list(b + r["sen_slope_per_year"] * t),
        "stats": r, "p_final": p, "significant": bool(p < 0.05),
        "explanation": explain(v["name"], unit, r, p_adj),
        "naive_vs_correct": naive_vs_correct(r),
        "events": [{k: e[k] for k in ("start", "end", "label")} for e in (events or [])],
    })


@app.get("/api/catalog")
def catalog():
    return {"catalog": CAT, "places": PLACES,
            "cases": {k: {kk: c[kk] for kk in ("title", "subtitle", "intro")} for k, c in CASES.items()}}


@lru_cache(maxsize=8)
def _case(case_id: str) -> dict:
    c = CASES[case_id]
    series = {}
    for var_id, fname in c["files"].items():
        path = ROOT / c["folder"] / fname
        if path.exists():
            cv = CONVERT.get(var_id, {"scale": 1, "offset": 0})
            series[var_id] = load_giovanni_csv(str(path)) * cv["scale"] + cv["offset"]
    missing = [VARS[k]["name"] for k in c["files"] if k not in series]
    if not series:
        return {"id": case_id, "variables": [], "missing": missing}
    results = {k: analyze(s) for k, s in series.items()}
    p_adj = fdr_adjust({k: r["hamed_rao_p"] for k, r in results.items()})
    events = c.get("events", [])
    return {"id": case_id, "missing": missing,
            "variables": [result_payload(k, s, p_adj[k], results[k],
                                         events=[e for e in events if k in e["vars"]])
                          for k, s in series.items()]}


@app.get("/api/case/{case_id}")
def case(case_id: str):
    if case_id not in CASES:
        raise HTTPException(404, "Unknown case")
    return PRECOMPUTED.get("case_" + case_id) or _case(case_id)


@lru_cache(maxsize=64)
def _power(lat: float, lon: float, param: str):
    """Saved cache first (instant, works offline); live NASA POWER request otherwise."""
    s = load_power_cache(POWER_CACHE, lat, lon, param)
    if s is None:
        s = fetch_power(lat, lon, params=(param,))[param]
    return s.dropna()


@lru_cache(maxsize=128)
def _power_payload(var_id: str, lat: float, lon: float) -> dict:
    v = VARS[var_id]
    return result_payload(var_id, _power(lat, lon, v["power_param"]), unit=v.get("power_unit", v["unit"]))


@app.get("/api/power")
def power(var_id: str, lat: float, lon: float):
    v = VARS.get(var_id)
    if not v or not v["power_param"]:
        raise HTTPException(400, "This variable is not available live")
    lat, lon = round(lat, 2), round(lon, 2)
    hit = PRECOMPUTED.get(power_key(var_id, lat, lon))
    if hit:
        return hit
    try:
        return _power_payload(var_id, lat, lon)
    except Exception as e:  # network error etc.
        raise HTTPException(502, f"NASA POWER request failed: {e}")


@app.get("/")
def index():
    return FileResponse(ROOT / "static" / "index.html")


app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")
