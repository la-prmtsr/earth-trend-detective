"""Trend Detective - statistics engine.

Every number is computed here, deterministically.
Input: a monthly pandas Series (DatetimeIndex, first day of each month).

Missing months: real records have gaps (for example no satellite retrieval in cloudy months).
Instead of squeezing the series together, it is placed on a full monthly grid (gaps stay NaN),
so every month keeps its season and slopes are measured against real time.
"""
import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy import stats
from statsmodels.stats.multitest import multipletests


def monthly_grid(s: pd.Series) -> pd.Series:
    """Place the series on an unbroken monthly grid from first to last month; absent months become NaN."""
    return s.astype(float).dropna().resample("MS").mean()


def monthly_anomaly(s: pd.Series) -> pd.Series:
    """Remove the seasonal cycle: subtract each calendar month's long-term mean."""
    s = s.astype(float)
    clim = s.groupby(s.index.month).transform("mean")
    return s - clim


def lag1_autocorr(x: np.ndarray) -> float:
    """Lag-1 autocorrelation. On a monthly grid with NaN gaps, only pairs of consecutive observed months count."""
    x = np.asarray(x, dtype=float)
    a, b = x[:-1], x[1:]
    ok = ~np.isnan(a) & ~np.isnan(b)
    if ok.sum() < 3:
        return 0.0
    r = float(np.corrcoef(a[ok], b[ok])[0, 1])
    return 0.0 if np.isnan(r) else r


def naive_ols(s: pd.Series) -> dict:
    """Plain linear regression on the raw series (the 'naive' analysis, kept for comparison)."""
    s = s.dropna()
    t_years = np.asarray((s.index - s.index[0]).days) / 365.25
    res = stats.linregress(t_years, s.values)
    return {"slope_per_year": float(res.slope), "p": float(res.pvalue)}


def ols_corrected(anom: pd.Series) -> dict:
    """OLS on the anomalies with an effective-sample-size correction for autocorrelation (corrected t-test).
    p_uncorrected is the same regression before the autocorrelation correction, so the effect of each
    step can be seen separately: raw data (naive_ols) -> seasonal cycle removed -> autocorrelation corrected."""
    a = anom.dropna()
    t_years = np.asarray((a.index - a.index[0]).days) / 365.25
    res = stats.linregress(t_years, a.values)
    resid = pd.Series(a.values - (res.intercept + res.slope * t_years), index=a.index)
    r1 = lag1_autocorr(monthly_grid(resid).values)
    n = len(a)
    n_eff = max(3.0, n * (1 - r1) / (1 + r1)) if r1 > 0 else n
    se = res.stderr * np.sqrt((n - 2) / max(n_eff - 2, 1))
    t = res.slope / se if se > 0 else 0.0
    p = 2 * stats.t.sf(abs(t), df=max(n_eff - 2, 1))
    return {"slope_per_year": float(res.slope), "p": float(p), "p_uncorrected": float(res.pvalue),
            "r1": r1, "n_eff": float(n_eff)}


def sen_slope_per_year(anom: pd.Series) -> float:
    """Sen's slope: slope per monthly step x 12 = slope per year. Gaps do not shift the time axis."""
    return float(mk.sens_slope(monthly_grid(anom).values).slope * 12)


def block_bootstrap_ci(anom: pd.Series, n_boot: int = 300, block: int = 12, seed: int = 42):
    """95% confidence interval for Sen's slope (moving-block bootstrap, 12-month blocks)."""
    a = monthly_grid(anom).values
    n = len(a)
    rng = np.random.default_rng(seed)
    t = np.arange(n)
    trend = mk.sens_slope(a).slope * t
    resid = a - trend
    slopes = []
    n_blocks = int(np.ceil(n / block))
    for _ in range(n_boot):
        starts = rng.integers(0, n - block + 1, n_blocks)
        sample = np.concatenate([resid[s:s + block] for s in starts])[:n]
        slopes.append(mk.sens_slope(sample + trend).slope * 12)
    lo, hi = np.nanpercentile(slopes, [2.5, 97.5])
    return float(lo), float(hi)


def years_to_detect(anom: pd.Series, slope_per_year: float) -> float:
    """Weatherhead et al. (1998): years of data needed to detect the trend at this noise level.
    n* = [ (3.3 * sigma_N / |w0|) * sqrt((1+phi)/(1-phi)) ] ** (2/3)
    sigma_N: standard deviation of the detrended monthly anomalies, phi: lag-1 autocorrelation,
    w0: trend per year. Meant for monthly data; the result is in years."""
    if slope_per_year == 0:
        return float("inf")
    a = anom.dropna()
    t_years = np.asarray((a.index - a.index[0]).days) / 365.25
    resid = a.values - slope_per_year * t_years
    resid = resid - resid.mean()
    sigma = float(np.std(resid, ddof=1))
    phi = lag1_autocorr(monthly_grid(pd.Series(resid, index=a.index)).values)
    phi = min(max(phi, -0.95), 0.95)
    return float(((3.3 * sigma / abs(slope_per_year)) * np.sqrt((1 + phi) / (1 - phi))) ** (2 / 3))


AUTOCORR_TESTS = (("hamed_rao", mk.hamed_rao_modification_test),
                  ("yue_wang", mk.yue_wang_modification_test),
                  ("pre_whitening", mk.pre_whitening_modification_test))


def autocorr_corrected_test(x: np.ndarray) -> tuple[float, str]:
    """Autocorrelation-corrected Mann-Kendall p-value and the name of the method that produced it.
    Hamed-Rao first; on a numerical problem (NaN) fall back to Yue-Wang, then to pre-whitening."""
    for name, test in AUTOCORR_TESTS:
        try:
            p = float(test(x).p)
        except Exception:
            continue
        if not np.isnan(p):
            return p, name
    return float("nan"), "none"


def autocorr_corrected_p(x: np.ndarray) -> float:
    """p-value only (see autocorr_corrected_test)."""
    return autocorr_corrected_test(x)[0]


def analyze(s: pd.Series) -> dict:
    """All the numbers the cards need for one monthly series."""
    s = s.astype(float).dropna()
    grid = monthly_grid(s)                      # gaps stay NaN; seasons stay aligned
    anom = monthly_anomaly(grid).dropna()       # anomalies of the observed months
    seasonal = mk.seasonal_test(grid.values, period=12)
    acp, acp_method = autocorr_corrected_test(anom.values)
    sen = sen_slope_per_year(anom)
    lo, hi = block_bootstrap_ci(anom)
    years = (s.index[-1] - s.index[0]).days / 365.25
    return {
        "n_months": int(len(s)),
        "n_missing": int(grid.isna().sum()),
        "years": round(years, 1),
        "naive": naive_ols(s),
        "ols_corrected": ols_corrected(anom),
        "seasonal_mk_p": float(seasonal.p),
        "hamed_rao_p": acp,               # decision test; key name kept for the front end
        "acp_method": acp_method,         # which autocorrelation-corrected test actually ran
        "sen_slope_per_year": sen,
        "ci95": (lo, hi),
        "years_to_detect": years_to_detect(anom, sen),
        "anomaly": anom,
    }


def fdr_adjust(pvals: dict) -> dict:
    """Benjamini-Hochberg (FDR) correction across all tests on a suspect board."""
    names = list(pvals)
    _, p_adj, _, _ = multipletests([pvals[k] for k in names], method="fdr_bh")
    return dict(zip(names, map(float, p_adj)))
