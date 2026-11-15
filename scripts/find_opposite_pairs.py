"""Candidate scan for Case 3: in which two places does the same variable trend in OPPOSITE directions?
Usage (from the project folder):  python scripts/find_opposite_pairs.py
Uses live NASA POWER data and the same analyze() as the app; no number is typed in by hand.
Output: a slope/p table per place for each variable, and the strongest opposite pair.

The scan runs many tests (places x variables) and then picks the striking ones, so significance is
judged on the Benjamini-Hochberg adjusted p across the WHOLE scan, not on each raw p.
A pair found here is a candidate only: POWER is a single, reanalysis-based product, so check it against
an independent dataset (for precipitation, GPM IMERG) before presenting it."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from core.data_sources import fetch_power  # noqa: E402
from core.stats_engine import analyze, fdr_adjust  # noqa: E402

ALPHA = 0.05
CANDIDATES = {  # approximate coordinates (latitude, longitude)
    "Sapanca Lake": (40.69, 30.27), "Istanbul": (41.01, 28.98), "Konya": (37.87, 32.49),
    "Rize": (41.02, 40.52), "Antalya": (36.89, 30.71), "Izmir": (38.42, 27.14),
    "Ankara": (39.93, 32.86), "Sanliurfa": (37.16, 38.79), "Van": (38.50, 43.38),
    "Erzurum": (39.90, 41.27), "Mugla": (37.21, 28.36), "Trabzon": (41.00, 39.72),
    "Niamey (Sahel)": (13.51, 2.11), "Cape Town": (-33.92, 18.42), "Santiago": (-33.45, -70.67),
    "Bergen": (60.39, 5.32), "Fresno (California)": (36.74, -119.79), "Nairobi": (-1.29, 36.82),
}
PARAMS = {"PRECTOTCORR": "Precipitation (mm/day)", "GWETROOT": "Root-zone soil wetness (0-1)",
          "T2M": "Air temperature 2 m (°C)"}


def main():
    results = {}  # (place, param) -> (slope per decade, corrected p, seasonal MK p)
    for place, (lat, lon) in CANDIDATES.items():
        try:
            df = fetch_power(lat, lon, params=tuple(PARAMS))
        except Exception as e:  # network error: skip this place
            print(f"skip {place}: {e}")
            continue
        for p in PARAMS:
            r = analyze(df[p].dropna())
            results[(place, p)] = (r["sen_slope_per_year"] * 10, r["hamed_rao_p"], r["seasonal_mk_p"])

    p_adj = fdr_adjust({k: v[1] for k, v in results.items()})  # one family: every test in the scan
    print(f"{len(results)} tests in the scan; 'BH p' is adjusted across all of them.")

    for p, label in PARAMS.items():
        rows = sorted((k for k in results if k[1] == p), key=lambda k: results[k][0])
        print(f"\n== {label}: trend per decade ==")
        for k in rows:
            slope, p_hr, p_smk = results[k]
            flag = "SIGNIFICANT" if p_adj[k] < ALPHA else ""
            print(f"  {k[0]:22s} {slope:+9.4f}   corrected p={p_hr:.4f}   BH p={p_adj[k]:.4f}   "
                  f"seasonal MK p={p_smk:.4f}  {flag}")
        up = [k for k in rows if results[k][0] > 0 and p_adj[k] < ALPHA]
        down = [k for k in rows if results[k][0] < 0 and p_adj[k] < ALPHA]
        if up and down:
            a, b = max(up, key=lambda k: results[k][0]), min(down, key=lambda k: results[k][0])
            print(f"  -> candidate pair (both significant after BH): {a[0]} ({results[a][0]:+.4f}) "
                  f"vs {b[0]} ({results[b][0]:+.4f}); check against an independent dataset before use")
        else:
            print("  -> no pair where both directions are significant after BH")


if __name__ == "__main__":
    main()
