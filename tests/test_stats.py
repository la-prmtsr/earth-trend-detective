"""Sentetik veriyle istatistik motorunun dogru calistigini test eder.
Calistirma: proje klasorunde  python -m pytest -q"""
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
