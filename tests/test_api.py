"""API tests: check that the server returns correct JSON, using synthetic CSV and synthetic POWER data."""
import json

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

import server


def fake_series(trend=0.05, seed=0):
    rng = np.random.default_rng(seed)
    idx = pd.date_range("2000-01-01", periods=300, freq="MS")
    return pd.Series(10 + 5 * np.sin(2 * np.pi * idx.month / 12) + trend * np.arange(300) / 12
                     + rng.normal(0, 0.5, 300), index=idx)


def test_catalog():
    c = TestClient(server.app).get("/api/catalog").json()
    assert "variables" in c["catalog"] and "sapanca" in c["places"]


def test_power_endpoint(monkeypatch):
    monkeypatch.setattr(server, "fetch_power",
                        lambda lat, lon, params: pd.DataFrame({params[0]: fake_series()}))
    server._power.cache_clear(); server._power_payload.cache_clear()
    r = TestClient(server.app).get("/api/power", params={"var_id": "t2m", "lat": 40.7, "lon": 30.3})
    assert r.status_code == 200
    body = r.json()
    assert body["significant"] is True and len(body["dates"]) == len(body["trend"]) == 300


def test_case_without_data_does_not_crash(monkeypatch, tmp_path):
    monkeypatch.setitem(server.CASES["case2"], "folder", str(tmp_path))
    server._case.cache_clear()
    body = TestClient(server.app).get("/api/case/case2").json()
    assert body["variables"] == [] and len(body["missing"]) == 3
    server._case.cache_clear()


def test_index_served():
    assert "Trend Detective" in TestClient(server.app).get("/").text


def test_case_applies_unit_conversion(monkeypatch, tmp_path):
    s = fake_series() + 280  # looks like Kelvin
    (tmp_path / "t2m.csv").write_text("Title: t\n\ntime,mean\n" + "\n".join(
        f"{d:%Y-%m-%d},{x:.3f}" for d, x in s.items()))
    monkeypatch.setitem(server.CASES["case2"], "folder", str(tmp_path))
    server._case.cache_clear()
    body = TestClient(server.app).get("/api/case/case2").json()
    t2m = next(v for v in body["variables"] if v["id"] == "t2m")
    assert abs(t2m["values"][0] - (s.iloc[0] - 273.15)) < 0.01 and t2m["unit"] == "°C"
    server._case.cache_clear()


def test_case_marks_events_and_survives_missing_months(monkeypatch, tmp_path):
    s = fake_series()
    s = s[~s.index.month.isin([12, 1])]  # like satellite data: some months absent
    (tmp_path / "no2.csv").write_text("Title: t\n\ntime,mean\n" + "\n".join(
        f"{d:%Y-%m-%d},{x * 1e15:.6e}" for d, x in s.items()))
    monkeypatch.setitem(server.CASES["case2"], "folder", str(tmp_path))
    server._case.cache_clear()
    body = TestClient(server.app).get("/api/case/case2").json()
    no2 = next(v for v in body["variables"] if v["id"] == "no2")
    assert no2["events"] and no2["events"][0]["label"] == "2020 lockdown"
    assert no2["stats"]["n_missing"] > 0 and no2["significant"] is True
    assert len(no2["dates"]) == len(no2["anomaly"]) == len(no2["trend"]) == len(s)
    server._case.cache_clear()


def test_power_uses_saved_cache_without_network(monkeypatch, tmp_path):
    from core.data_sources import power_cache_path
    s = fake_series()
    data = {"T2M": {f"{d:%Y%m}": float(x) for d, x in s.items()}}
    data["T2M"].update({f"{y}13": 0.0 for y in range(2000, 2025)})  # POWER's annual-mean month
    power_cache_path(tmp_path, 40.69, 30.27).write_text(json.dumps({"parameter": data}))

    def no_network(*a, **k):
        raise AssertionError("network should not be used for a cached place")
    monkeypatch.setattr(server, "POWER_CACHE", tmp_path)
    monkeypatch.setattr(server, "fetch_power", no_network)
    server._power.cache_clear(); server._power_payload.cache_clear()
    r = TestClient(server.app).get("/api/power", params={"var_id": "t2m", "lat": 40.69, "lon": 30.27})
    assert r.status_code == 200 and len(r.json()["dates"]) == 300
    server._power.cache_clear(); server._power_payload.cache_clear()
