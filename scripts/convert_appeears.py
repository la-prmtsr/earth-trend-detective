"""AppEEARS 'Point Sample' CSV'sini (MODIS LST) uygulamanin okudugu aylik CSV'ye cevirir.
Kullanim:  python scripts/convert_appeears.py indirilen.csv data/case1_sapanca/lake_lst.csv
- Birden fazla gol noktasi varsa her tarih icin ortalama alinir.
- Deger 1000'den buyukse once 0.02 ile carpilir (olcek faktoru); sonra Kelvin -> Celsius."""
import sys

import pandas as pd

src, dst = sys.argv[1], sys.argv[2]
df = pd.read_csv(src)
col = next(c for c in df.columns if "LST_Day" in c and "QC" not in c)
v = pd.to_numeric(df[col], errors="coerce")
v = v.where(v > 0)
if v.median() > 1000:
    v = v * 0.02
v = v - 273.15
s = pd.Series(v.values, index=pd.to_datetime(df["Date"])).groupby(level=0).mean()
monthly = s.resample("MS").mean().dropna()
with open(dst, "w", encoding="utf-8") as f:
    f.write("Source: MODIS MOD11A2 LST via AppEEARS (converted)\n\ntime,lake_lst_C\n")
    for d, x in monthly.items():
        f.write(f"{d:%Y-%m-%d},{x:.3f}\n")
print("wrote", dst, len(monthly), "months")
