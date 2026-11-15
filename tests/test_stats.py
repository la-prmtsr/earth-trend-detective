"""Check the statistics engine against synthetic series with a known trend.
Run from the project folder:  python -m pytest -q"""
import numpy as np
import pandas as pd

from core.stats_engine import analyze, fdr_adjust
from core.data_sources import load_giovanni_csv


def make_series(trend_per_year, noise=0.5, years=25, seed=0):
    rng = np.random.default_rng(seed)
    idx = pd.date_range("2000-01-01", periods=years * 12, freq="MS")
    t = np.arange(len(idx)) / 12
    season = 10 * np.sin(2 * np.pi * idx.month / 12)
    return pd.Series(15 + season + trend_per_year * t + rng.normal(0, noise, len(idx)), index=idx)


def test_detects_known_trend():
    r = analyze(make_series(0.05))
    assert abs(r["sen_slope_per_year"] - 0.05) < 0.01
    assert r["seasonal_mk_p"] < 0.05
    lo, hi = r["ci95"]
    assert lo < 0.05 < hi


def test_no_trend_is_not_significant():
    r = analyze(make_series(0.0, seed=3))
    assert r["hamed_rao_p"] > 0.05


def test_fdr_never_lowers_pvalues():
    raw = {"a": 0.01, "b": 0.04, "c": 0.30}
    adj = fdr_adjust(raw)
    assert all(adj[k] >= raw[k] for k in raw)


def test_giovanni_csv_parser():
    text = "Title: test\nUser Start Date: 2000-01-01\n\ntime,mean_X\n2000-01-01,1.5\n2000-02-01,-9999\n2000-03-01,2.0\n"
    s = load_giovanni_csv(text)
    assert len(s) == 2 and s.iloc[-1] == 2.0


def with_gaps(s, seed=1):
    """Like a real satellite record: 15% of months missing at random, plus every winter month absent."""
    rng = np.random.default_rng(seed)
    s = s.drop(s.index[rng.random(len(s)) < 0.15])
    return s[~s.index.month.isin([12, 1, 2])]


def test_missing_months_do_not_break_trend():
    full = analyze(make_series(0.05))
    gappy = analyze(with_gaps(make_series(0.05)))
    assert gappy["n_missing"] > 50
    assert gappy["seasonal_mk_p"] < 0.05                       # months stay in the right season
    assert abs(gappy["sen_slope_per_year"] - full["sen_slope_per_year"]) < 0.01   # slope is not inflated
    assert len(gappy["anomaly"]) == gappy["n_months"]


def test_missing_months_do_not_create_trend():
    r = analyze(with_gaps(make_series(0.0, seed=3)))
    assert r["hamed_rao_p"] > 0.05 and r["seasonal_mk_p"] > 0.05
    lo, hi = r["ci95"]
    assert lo < 0 < hi


def test_reports_which_corrected_test_ran():
    assert analyze(make_series(0.0, seed=3))["acp_method"] == "hamed_rao"
    # A very strong, smooth trend makes the Hamed-Rao variance correction negative (p = NaN);
    # the fallback must then be named, not reported as Hamed-Rao.
    assert analyze(make_series(0.05))["acp_method"] == "yue_wang"


def test_seasonal_cycle_hides_trend_from_simple_regression():
    """Same regression, one step at a time: raw data misses the trend, removing the seasonal cycle finds it."""
    r = analyze(make_series(0.05, years=25, seed=0))
    assert r["naive"]["p"] > 0.05
    assert r["ols_corrected"]["p_uncorrected"] < 0.05
    assert r["ols_corrected"]["p_uncorrected"] <= r["ols_corrected"]["p"]
