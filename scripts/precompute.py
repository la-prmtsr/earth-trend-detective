"""Precompute the API answers for the case files and every cached preset place.

Usage (from the project folder):  python scripts/precompute.py
Writes data/results_cache/*.json. The server sends these files as they are, so the free
Render server does no statistics on a click. Run it again whenever data/ changes, and commit."""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import server  # noqa: E402

out_dir = server.RESULTS
out_dir.mkdir(parents=True, exist_ok=True)
for old in out_dir.glob("*.json"):
    old.unlink()


def save(key, obj):
    (out_dir / f"{key}.json").write_text(json.dumps(obj, separators=(",", ":")), encoding="utf-8")
    print("wrote", f"data/results_cache/{key}.json")


for c in server.CASES:
    save("case_" + c, server._case(c))
for p in server.PLACES.values():
    lat, lon = round(p["lat"], 2), round(p["lon"], 2)
    for var_id, v in server.VARS.items():
        if v.get("power_param") and server.load_power_cache(server.POWER_CACHE, lat, lon, v["power_param"]) is not None:
            save(server.power_key(var_id, lat, lon), server._power_payload(var_id, lat, lon))
