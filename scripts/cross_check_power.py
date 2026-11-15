"""Cross-check: do the Giovanni CSVs (area average) and NASA POWER (point) tell the same story?
Usage (from the project folder):  python scripts/cross_check_power.py
Reads t2m.csv and precip.csv for Sapanca if present, fetches T2M and PRECTOTCORR from POWER for the
same place, and prints the anomaly correlation over the common months and both Sen's slopes per decade.
The sources are not independent (POWER is also MERRA-2 based; its T2M is the same field), so this is
a consistency check. Precipitation is the informative comparison: IMERG versus a MERRA-2 based product."""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core.config import CASES, CONVERT, PLACES  # noqa: E402
from core.data_sources import fetch_power, load_giovanni_csv  # noqa: E402
from core.stats_engine import monthly_anomaly, sen_slope_per_year  # noqa: E402

PAIRS = {"t2m": "T2M", "precip": "PRECTOTCORR"}  # catalog id -> POWER parameter


def main():
    case, place = CASES["case1"], PLACES["sapanca"]
    power = fetch_power(place["lat"], place["lon"], params=tuple(PAIRS.values()))
    for var_id, param in PAIRS.items():
        path = ROOT / case["folder"] / case["files"][var_id]
        if not path.exists():
            print(f"{var_id}: {path.name} not found, skipped")
            continue
        cv = CONVERT[var_id]
        gio = load_giovanni_csv(str(path)) * cv["scale"] + cv["offset"]
        pw = power[param].dropna()
        common = gio.index.intersection(pw.index)
        g, p = gio[common], pw[common]
        corr = monthly_anomaly(g).corr(monthly_anomaly(p))
        sg, sp = sen_slope_per_year(monthly_anomaly(g)) * 10, sen_slope_per_year(monthly_anomaly(p)) * 10
        agree = "same direction" if sg * sp > 0 else "OPPOSITE direction"
        print(f"{var_id}: {len(common)} common months ({common[0]:%Y-%m} to {common[-1]:%Y-%m})")
        print(f"  mean        Giovanni {g.mean():.3f}   POWER {p.mean():.3f}")
        print(f"  anomaly correlation  r = {corr:.3f}")
        print(f"  Sen slope / decade   Giovanni {sg:+.4f}   POWER {sp:+.4f}   -> {agree}")


if __name__ == "__main__":
    main()
