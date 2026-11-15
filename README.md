# Trend Detective: Earth System Case Files

NASA Space Apps Challenge 2026 · Challenge: *Be An Earth System Trend Detective!* · Local event: Sakarya, Türkiye

**Live app:** <add Render link> · **Demo:** <add video/slides link>

## What it does
Pick what you want to investigate, where, and what kind of place it is. The app suggests NASA variables
that can show trends there, plots the monthly time series, removes the seasonal cycle, and tells you
how fast it is changing and whether the change is statistically significant.

Case files: (1) Sapanca Lake basin (land & water cycle), (2) the atmosphere above Istanbul,
(3) the same variable in two regions.

## Methods
Monthly anomalies (seasonal cycle removed) · Sen's slope with 95% block-bootstrap interval ·
Seasonal Mann-Kendall · autocorrelation-corrected Mann-Kendall (Hamed-Rao) · Benjamini-Hochberg FDR
across the suspect board · years-to-detect (Weatherhead et al., 1998).

## Tech
Python (FastAPI, pandas, pymannkendall, statsmodels, SciPy) for all numbers · plain HTML/CSS/JS front end
(Alpine.js, Plotly.js, Lucide icons; vendored in `static/vendor/`, no build step).

## NASA data
GPM IMERG, GLDAS Noah, MERRA-2, OMI NO2, AIRS (via Giovanni) · MODIS MOD11A2 LST (via AppEEARS) · NASA POWER API.

## Run locally
```
python -m venv .venv
# Windows: .venv\Scripts\activate   |   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload      # open http://127.0.0.1:8000
python -m pytest -q
```

## Use of AI
<describe honestly; see the handbook>

## Team
<names>
