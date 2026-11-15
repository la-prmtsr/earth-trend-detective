"""Save NASA POWER data for every preset place, so the app answers instantly.

Usage (from the project folder, needs internet):
    python scripts/cache_power.py
Writes one file per place to data/power_cache/ (e.g. 40.69_30.27.json). Commit these files.
The server reads them first; places that are not cached are still fetched live."""
import json
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from core.config import PLACES  # noqa: E402
from core.data_sources import fetch_power_raw, power_cache_path  # noqa: E402

CATALOG = json.loads((ROOT / "core" / "catalog.json").read_text(encoding="utf-8"))
PARAMS = tuple(sorted({v["power_param"] for v in CATALOG["variables"] if v.get("power_param")}))
FOLDER = ROOT / "data" / "power_cache"
START, END = 1981, 2025

FOLDER.mkdir(parents=True, exist_ok=True)
print("Parameters:", ", ".join(PARAMS))
for key, p in PLACES.items():
    lat, lon = round(p["lat"], 2), round(p["lon"], 2)
    t = time.time()
    for attempt in range(3):
        try:
            data = fetch_power_raw(lat, lon, PARAMS, START, END)
            break
        except Exception as e:  # network hiccup: wait and retry
            print(f"  {key}: attempt {attempt + 1} failed ({e})")
            time.sleep(5)
    else:
        print(f"SKIPPED {key}")
        continue
    out = {"source": "NASA POWER monthly point API (community AG)", "place": p["name"],
           "lat": lat, "lon": lon, "start": START, "end": END,
           "parameter": {k: data[k] for k in PARAMS}}
    path = power_cache_path(FOLDER, lat, lon)
    path.write_text(json.dumps(out), encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}  ({p['name']}, {time.time() - t:.1f} s)")
