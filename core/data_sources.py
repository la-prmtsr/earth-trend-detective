"""Data access: Giovanni CSV files and the live NASA POWER API."""
import io
import json
from pathlib import Path

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


def fetch_power_raw(lat: float, lon: float, params=("T2M", "PRECTOTCORR"),
                    start: int = 1981, end: int = 2025) -> dict:
    """Raw NASA POWER monthly point response: {param: {"YYYYMM": value}} (no API key needed)."""
    q = {
        "parameters": ",".join(params), "community": "AG",
        "latitude": lat, "longitude": lon,
        "start": start, "end": end, "format": "JSON",
    }
    r = requests.get(POWER_URL, params=q, timeout=60)
    r.raise_for_status()
    return r.json()["properties"]["parameter"]


def power_frame(data: dict, params) -> pd.DataFrame:
    """Turn a raw POWER parameter dict into a monthly DataFrame.
    Note: the response includes a month '13' for every year (the annual mean); it is dropped.
    -999 = missing value."""
    out = {}
    for p in params:
        vals = {k: v for k, v in data[p].items() if not k.endswith("13")}
        s = pd.Series(vals, dtype=float)
        s.index = pd.to_datetime(s.index, format="%Y%m")
        s[s <= -999] = np.nan
        out[p] = s
    return pd.DataFrame(out).sort_index()


def power_cache_path(folder, lat: float, lon: float) -> Path:
    """File for one place in the POWER cache, e.g. data/power_cache/40.69_30.27.json."""
    return Path(folder) / f"{lat:.2f}_{lon:.2f}.json"


def load_power_cache(folder, lat: float, lon: float, param: str):
    """Monthly Series for one parameter from the saved POWER cache, or None if not cached."""
    path = power_cache_path(folder, lat, lon)
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))["parameter"]
    if param not in data:
        return None
    return power_frame(data, (param,))[param]


def fetch_power(lat: float, lon: float, params=("T2M", "PRECTOTCORR"),
                start: int = 1981, end: int = 2025) -> pd.DataFrame:
    """NASA POWER monthly point data (no API key needed).
    Note: the response includes a month '13' for every year (the annual mean); it is dropped.
    -999 = missing value."""
    data = fetch_power_raw(lat, lon, params, start, end)
    out = {}
    for p in params:
        vals = {k: v for k, v in data[p].items() if not k.endswith("13")}
        s = pd.Series(vals, dtype=float)
        s.index = pd.to_datetime(s.index, format="%Y%m")
        s[s <= -999] = np.nan
        out[p] = s
    return pd.DataFrame(out).sort_index()
