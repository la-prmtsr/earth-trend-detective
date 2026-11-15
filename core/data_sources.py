"""Veri okuma: Giovanni CSV dosyalari ve canli NASA POWER API."""
import io
import numpy as np
import pandas as pd
import requests

POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"


def load_giovanni_csv(path_or_text: str, value_col: int = 1) -> pd.Series:
    """Giovanni 'Time Series, Area-Averaged' CSV'sini okur.
    Dosyanin basinda aciklama satirlari olur; 'time' ile baslayan satiri bulup oradan okuruz.
    Bos/eksik degerler (ornegin -9999) NaN yapilir. Sonuc: aylik Series (index = ayin ilk gunu)."""
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
    s = s.resample("MS").mean()  # gunluk veri gelirse (ornegin OMI NO2) aylik ortalamaya cevirir
    return s.dropna()


def fetch_power(lat: float, lon: float, params=("T2M", "PRECTOTCORR"),
                start: int = 1981, end: int = 2025) -> pd.DataFrame:
    """NASA POWER aylik nokta verisi (API anahtari gerekmez).
    Dikkat: yanit her yil icin '13' numarali ay (yillik ortalama) icerir; onu atiyoruz.
    -999 = eksik veri."""
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
