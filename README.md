# Earth Trend Detective: Earth System Case Files

NASA Space Apps Challenge 2026 · Challenge: *Be An Earth System Trend Detective!* · Local event: Sakarya, Türkiye

**Live app:** <add Render link> · **Demo:** <add video/slides link>

## What it does
Pick what you want to investigate, where, and what kind of place it is. The app suggests NASA variables
that can show trends there, plots the monthly time series, removes the seasonal cycle, and tells you
how fast it is changing and whether the change is statistically significant.

It answers four questions: **what** is changing, **where**, **how much**, and **is the change real?**

| Screen | What it shows | Data |
|---|---|---|
| Case 1: Sapanca Lake basin | A "suspect board" of water-cycle and temperature variables, tested together | Giovanni, AppEEARS |
| Case 2: The air above Istanbul | NO2 and air temperature at 500 hPa; the 2020 lockdown is marked as a step change, not a trend | Giovanni |
| Case 3: Two regions | The same variable side by side in two places: do the trends point in opposite directions? | NASA POWER (live) |
| Explore | Three short questions, suggested variables, live analysis for any coordinates | NASA POWER (live) |

The tool measures trends. It does not give advice, simulate scenarios, forecast, or attribute causes.

## Who it is for
Anyone who needs to check a climate claim before repeating it: a local journalist, a teacher, a student,
or municipal staff writing a report. Example: "rainfall is decreasing around Sapanca" is a common claim.
The data shows no significant precipitation trend there, while air temperature is rising significantly.

## Methods
All numbers are computed by the Python code in `core/stats_engine.py`; the front end only displays them.

1. **Monthly anomalies**: each month minus that calendar month's long-term mean (removes the seasonal cycle).
2. **Rate of change**: Sen's slope, with a 95% interval from a moving-block bootstrap (12-month blocks).
3. **Significance**: seasonal Mann-Kendall, autocorrelation-corrected Mann-Kendall (Hamed-Rao), and a
   t-test on anomalies with an effective-sample-size correction.
4. **Many tests at once**: Benjamini-Hochberg false discovery rate across each suspect board.
5. **Not significant yet?** Years of data needed to detect the trend at this noise level (Weatherhead et al., 1998).
6. **Simple vs corrected**: a plain regression on raw data is shown next to the corrected tests, because it can
   both invent trends (autocorrelation) and miss real ones (seasonal cycle).

Months without data (for example cloudy months in satellite records) stay as gaps on a regular monthly grid,
so months keep their season and slopes are measured against real time.

## NASA data
| Variable | Dataset | Access |
|---|---|---|
| Precipitation | GPM IMERG monthly (GPM_3IMERGM) | [Giovanni](https://giovanni.gsfc.nasa.gov/giovanni/) |
| Evapotranspiration, surface runoff, soil moisture | GLDAS Noah monthly 0.25° (GLDAS_NOAH025_M) | Giovanni |
| Air temperature at 2 m | MERRA-2 monthly (M2TMNXSLV) | Giovanni |
| Tropospheric NO2 | OMI (OMNO2d) | Giovanni |
| Air temperature at 500 hPa | AIRS monthly (AIRS3STM) | Giovanni |
| Lake surface temperature | MODIS MOD11A2 land surface temperature | [AppEEARS](https://appeears.earthdatacloud.nasa.gov/) |
| Live point data (temperature, precipitation, soil wetness) | NASA POWER monthly | [POWER API](https://power.larc.nasa.gov/) |

The Giovanni files in `data/` are area-averaged time series, stored as downloaded; each file header keeps the
URL that reproduces the request. `data/case1_sapanca/lake_lst.csv` is a generated file: it was produced from an
AppEEARS point-sample export with `scripts/convert_appeears.py`.

## Tech
Python (FastAPI, pandas, NumPy, SciPy, statsmodels, pymannkendall) for all numbers · plain HTML/CSS/JS front end
(Alpine.js, Plotly.js, Lucide icons; vendored in `static/vendor/`, no build step).

## Run locally
```
python -m venv .venv
# Windows: .venv\Scripts\activate   |   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload      # open http://127.0.0.1:8000
python -m pytest -q
```

Case files read CSVs from `data/case1_sapanca/` and `data/case2_istanbul/`. A missing file only hides its card.

Helper scripts:
- `python scripts/convert_appeears.py <download.csv> data/case1_sapanca/lake_lst.csv`: AppEEARS point sample to monthly CSV
- `python scripts/find_opposite_pairs.py`: scan places with live POWER data for opposite trends (Case 3)
- `python scripts/cross_check_power.py`: compare the Giovanni series with NASA POWER for the same place

## Limitations
- Grid cells are large (about 25 km for GLDAS, about 50 km for POWER): results describe a basin and its surroundings, not a district.
- Sapanca Lake is actively managed; the tool shows the climate side only, not withdrawals or transfers.
- A trend that is not significant is not proof of no change; it may only need a longer record.

## References
- Sen, P. K. (1968). Estimates of the regression coefficient based on Kendall's tau. *J. Am. Stat. Assoc.*
- Hirsch, R. M., Slack, J. R., & Smith, R. A. (1982). Techniques of trend analysis for monthly water quality data. *Water Resour. Res.*
- Hamed, K. H., & Rao, A. R. (1998). A modified Mann-Kendall trend test for autocorrelated data. *J. Hydrol.*
- Weatherhead, E. C., et al. (1998). Factors affecting the detection of trends. *J. Geophys. Res.*
- Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate. *J. R. Stat. Soc. B.*
- Hussain, M., & Mahmud, I. (2019). pyMannKendall: a Python package for non parametric Mann Kendall family of trend tests. *J. Open Source Softw.*

## Use of AI
The team chose the challenge and made the project decisions. An AI coding assistant was used to learn about
NASA datasets and trend statistics, to review the plan, and to help write and test parts of the code
(including the statistics engine, the API server and the front end). No AI model runs inside the app:
every number is computed by deterministic Python code and every explanation comes from a fixed template.

## Team
Team StarlightX · NASA Space Apps Challenge 2026, Sakarya local event

| Name | Role |
|---|---|
| Alviola Permatasari | Repository, deployment |
| İrem Güzel | NASA data, trend statistics, tests |
| Mutia Kusuma | Frontend and interface design |
