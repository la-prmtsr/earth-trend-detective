"""Data access: Giovanni CSV files and the live NASA POWER API."""
import io
import numpy as np
import pandas as pd
import requests

POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"


def load_giovanni_csv(path_or_text: str, value_col: int = 1) -> pd.Series:
    """Read a Giovanni 'Time Series, Area-Averaged' CSV.
    The file starts with metadata lines; reading begins at the line that starts with 'time'.
    Fill values (for example -9999) become NaN. Returns a monthly Series (index = first day of month)."""
    try:
        text = open(path_or_text, encoding="utf-8").read()
    except (FileNotFoundError, OSError):
        text = path_or_text
    lines = text.splitlines()
    start = next(i for i, ln in enumerate(lines) if ln.lower().startswith("time"))
    df = pd.read_csv(io.StringIO("\n".join(lines[start:])))
    df["time"] = pd.to_datetime(df.iloc[:, 0])
    s = pd.to_numeric(df.iloc[:, value_col], errors="coerce")
    s[s < -9000] = np.nan
    s.index = df["time"]
    s = s.resample("MS").mean()  # daily input (for example OMI NO2) becomes a monthly mean
    return s.dropna()


def fetch_power(lat: float, lon: float, params=("T2M", "PRECTOTCORR"),
                start: int = 1981, end: int = 2025) -> pd.DataFrame:
    """NASA POWER monthly point data (no API key needed).
    Note: the response includes a month '13' for every year (the annual mean); it is dropped.
    -999 = missing value."""
    q = {
        "parameters": ",".join(params), "community": "AG",
        "latitude": lat, "longitude": lon,
        "start": start, "end": end, "format": "JSON",
    }
    r = requests.get(POWER_URL, params=q, timeout=60)
    r.raise_for_status()
    data = r.json()["properties"]["parameter"]
    out = {}
    for p in params:
        vals = {k: v for k, v in data[p].items() if not k.endswith("13")}
        s = pd.Series(vals, dtype=float)
        s.index = pd.to_datetime(s.index, format="%Y%m")
        s[s <= -999] = np.nan
        out[p] = s
    return pd.DataFrame(out).sort_index()
