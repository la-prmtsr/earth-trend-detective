"""Vaka dosyalari ve hazir yerler (Uye B). CSV'ler data/ altindaki klasorlere konur.

CONVERT: Giovanni CSV'sindeki ham birimi katalogdaki birime cevirir: deger * scale + offset.
ONEMLI: Her CSV'nin basligindaki birimi okuyun. Asagidaki sayilar tipik durum icindir;
CSV'nizdeki birim farkliysa sayiyi degistirin. (Trend testi birimden etkilenmez, karttaki sayi etkilenir.)"""

CONVERT = {
    "precip": {"scale": 24, "offset": 0},          # IMERG mm/hr -> mm/gun
    "evap": {"scale": 86400, "offset": 0},         # GLDAS kg m-2 s-1 -> mm/gun
    "runoff": {"scale": 8, "offset": 0},           # GLDAS Qs_acc (3 saatlik birikim) -> mm/gun
    "soil": {"scale": 1, "offset": 0},             # GLDAS kg m-2 (degisiklik yok)
    "t2m": {"scale": 1, "offset": -273.15},        # MERRA-2 K -> °C
    "lake_lst": {"scale": 1, "offset": 0},         # convert_appeears.py zaten °C yazar
    "no2": {"scale": 1e-15, "offset": 0},          # OMI molekul/cm2 -> 10^15 molekul/cm2
    "airs_t": {"scale": 1, "offset": -273.15},     # AIRS K -> °C
}

CASES = {
    "case1": {
        "title": "Sapanca Lake basin",
        "subtitle": "Land and water cycle",
        "intro": ("Sapanca Lake supplies about 70% of Sakarya's drinking water. Which climate variables around "
                  "the lake show a long-term trend? The lake is actively managed; this tool shows the climate "
                  "side only and does not model withdrawals or transfers."),
        "folder": "data/case1_sapanca",
        "files": {"precip": "precip.csv", "evap": "evap.csv", "runoff": "runoff.csv",
                  "soil": "soil.csv", "t2m": "t2m.csv", "lake_lst": "lake_lst.csv"},
    },
    "case2": {
        "title": "The air above Istanbul",
        "subtitle": "Atmosphere above a large city",
        "intro": ("Is the air above a large city changing? Note: the 2020 lockdown drop is a step change, "
                  "not a trend."),
        "folder": "data/case2_istanbul",
        "files": {"no2": "no2.csv", "airs_t": "airs_t.csv", "t2m": "t2m.csv"},
    },
}

PLACES = {  # yaklasik koordinatlar
    "sapanca": {"name": "Sapanca Lake", "lat": 40.69, "lon": 30.27, "type": "lake_basin"},
    "istanbul": {"name": "Istanbul", "lat": 41.01, "lon": 28.98, "type": "big_city"},
    "konya": {"name": "Konya", "lat": 37.87, "lon": 32.49, "type": "dry_inland"},
    "rize": {"name": "Rize", "lat": 41.02, "lon": 40.52, "type": "coast_forest"},
}
