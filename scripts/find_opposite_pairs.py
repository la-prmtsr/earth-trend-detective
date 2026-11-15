"""Candidate scan for Case 3: in which two places does the same variable trend in OPPOSITE directions?
Usage (from the project folder):  python scripts/find_opposite_pairs.py
Uses live NASA POWER data and the same analyze() as the app; no number is typed in by hand.
Output: a slope/p table per place for each variable, and the strongest opposite pair."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from core.data_sources import fetch_power  # noqa: E402
from core.stats_engine import analyze  # noqa: E402

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
    rows = {p: [] for p in PARAMS}
    for place, (lat, lon) in CANDIDATES.items():
        try:
            df = fetch_power(lat, lon, params=tuple(PARAMS))
        except Exception as e:  # network error: skip this place
            print(f"skip {place}: {e}")
            continue
        for p in PARAMS:
            r = analyze(df[p].dropna())
            rows[p].append((place, r["sen_slope_per_year"] * 10, r["hamed_rao_p"], r["seasonal_mk_p"]))
    for p, label in PARAMS.items():
        print(f"\n== {label}: trend per decade ==")
        for place, slope, p_hr, p_smk in sorted(rows[p], key=lambda x: x[1]):
            flag = "SIGNIFICANT" if p_hr < 0.05 else ""
            print(f"  {place:22s} {slope:+9.4f}   corrected p={p_hr:.4f}   seasonal MK p={p_smk:.4f}  {flag}")
        up = [x for x in rows[p] if x[1] > 0 and x[2] < 0.05]
        down = [x for x in rows[p] if x[1] < 0 and x[2] < 0.05]
        if up and down:
            a, b = max(up, key=lambda x: x[1]), min(down, key=lambda x: x[1])
            print(f"  -> opposite and both significant: {a[0]} ({a[1]:+.4f}) vs {b[0]} ({b[1]:+.4f})")
        else:
            print("  -> no pair where both directions are significant")


if __name__ == "__main__":
    main()
