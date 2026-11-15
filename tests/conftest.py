import pytest

import server


@pytest.fixture(autouse=True)
def no_precomputed(monkeypatch):
    """Tests check the live computation, not the precomputed files in data/results_cache."""
    monkeypatch.setattr(server, "PRECOMPUTED", {})
