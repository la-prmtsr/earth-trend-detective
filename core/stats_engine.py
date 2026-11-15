"""Trend Dedektifi - istatistik motoru.

Tum sayilar burada, deterministik olarak hesaplanir. LLM sayi uretmez.
Girdi: aylik pandas Series (index = ayin ilk gunu, DatetimeIndex).
"""
import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy import stats
from statsmodels.stats.multitest import multipletests


def monthly_anomaly(s: pd.Series) -> pd.Series:
    """Mevsimselligi cikar: her degerden o ayin uzun donem ortalamasini cikar."""
    s = s.astype(float)
    clim = s.groupby(s.index.month).transform("mean")
    return s - clim


def lag1_autocorr(x: np.ndarray) -> float:
    x = x[~np.isnan(x)]
    if len(x) < 3:
        return 0.0
    return float(np.corrcoef(x[:-1], x[1:])[0, 1])


def naive_ols(s: pd.Series) -> dict:
    """Ham seriye duz regresyon (rakip takimlarin yapacagi 'naif' analiz)."""
    s = s.dropna()
    t_years = np.asarray((s.index - s.index[0]).days) / 365.25
    res = stats.linregress(t_years, s.values)
    return {"slope_per_year": float(res.slope), "p": float(res.pvalue)}


def ols_corrected(anom: pd.Series) -> dict:
    """Anomali serisine OLS + otokorelasyona gore etkin orneklem duzeltmesi."""
    a = anom.dropna()
    t_years = np.asarray((a.index - a.index[0]).days) / 365.25
    res = stats.linregress(t_years, a.values)
    resid = a.values - (res.intercept + res.slope * t_years)
    r1 = lag1_autocorr(resid)
    n = len(a)
    n_eff = max(3.0, n * (1 - r1) / (1 + r1)) if r1 > 0 else n
    se = res.stderr * np.sqrt((n - 2) / max(n_eff - 2, 1))
    t = res.slope / se if se > 0 else 0.0
    p = 2 * stats.t.sf(abs(t), df=max(n_eff - 2, 1))
    return {"slope_per_year": float(res.slope), "p": float(p), "r1": r1, "n_eff": float(n_eff)}


def sen_slope_per_year(anom: pd.Series) -> float:
    """Sen egimi: aylik adim basina egim x 12 = yillik egim."""
    a = anom.dropna().values
    return float(mk.sens_slope(a).slope * 12)


def block_bootstrap_ci(anom: pd.Series, n_boot: int = 300, block: int = 12, seed: int = 42):
    """Sen egimi icin %95 guven araligi (hareketli blok bootstrap, 12 aylik bloklar)."""
    a = anom.dropna().values
    n = len(a)
    rng = np.random.default_rng(seed)
    t = np.arange(n)
    trend = sen_slope_per_year(anom) / 12 * t
    resid = a - trend
    slopes = []
    n_blocks = int(np.ceil(n / block))
    for _ in range(n_boot):
        starts = rng.integers(0, n - block + 1, n_blocks)
        sample = np.concatenate([resid[s:s + block] for s in starts])[:n]
        slopes.append(mk.sens_slope(sample + trend).slope * 12)
    lo, hi = np.percentile(slopes, [2.5, 97.5])
    return float(lo), float(hi)


def years_to_detect(anom: pd.Series, slope_per_year: float) -> float:
    """Weatherhead ve ark. (1998): bu gurultuyle trendin tespiti icin gereken yil sayisi.
    n* = [ (3.3 * sigma_N / |w0|) * sqrt((1+phi)/(1-phi)) ] ** (2/3)
    sigma_N: trend cikarilmis aylik anomalilerin standart sapmasi, phi: lag-1 otokorelasyon,
    w0: yillik trend. Aylik veri icindir; sonuc yil cinsindendir."""
    if slope_per_year == 0:
        return float("inf")
    a = anom.dropna()
    t_years = np.asarray((a.index - a.index[0]).days) / 365.25
    resid = a.values - slope_per_year * t_years
    resid = resid - resid.mean()
    sigma = float(np.std(resid, ddof=1))
    phi = min(max(lag1_autocorr(resid), -0.95), 0.95)
    return float(((3.3 * sigma / abs(slope_per_year)) * np.sqrt((1 + phi) / (1 - phi))) ** (2 / 3))


def autocorr_corrected_p(x: np.ndarray) -> float:
    """Otokorelasyon duzeltmeli Mann-Kendall p-degeri.
    Once Hamed-Rao; sayisal sorun (NaN) olursa Yue-Wang, o da olmazsa on-beyazlatma (pre-whitening)."""
    for test in (mk.hamed_rao_modification_test, mk.yue_wang_modification_test,
                 mk.pre_whitening_modification_test):
        try:
            p = float(test(x).p)
        except Exception:
            continue
        if not np.isnan(p):
            return p
    return float("nan")


def analyze(s: pd.Series) -> dict:
    """Tek bir aylik seri icin tum kartlarin ihtiyac duydugu sayilar."""
    s = s.astype(float).dropna()
    anom = monthly_anomaly(s)
    seasonal = mk.seasonal_test(s.values, period=12)
    acp = autocorr_corrected_p(anom.values)
    sen = sen_slope_per_year(anom)
    lo, hi = block_bootstrap_ci(anom)
    years = (s.index[-1] - s.index[0]).days / 365.25
    return {
        "n_months": int(len(s)),
        "years": round(years, 1),
        "naive": naive_ols(s),
        "ols_corrected": ols_corrected(anom),
        "seasonal_mk_p": float(seasonal.p),
        "hamed_rao_p": acp,
        "sen_slope_per_year": sen,
        "ci95": (lo, hi),
        "years_to_detect": years_to_detect(anom, sen),
        "anomaly": anom,
    }


def fdr_adjust(pvals: dict) -> dict:
    """Supheli panosundaki tum testlere Benjamini-Hochberg (FDR) duzeltmesi."""
    names = list(pvals)
    _, p_adj, _, _ = multipletests([pvals[k] for k in names], method="fdr_bh")
    return dict(zip(names, map(float, p_adj)))
