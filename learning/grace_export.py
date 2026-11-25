#!/usr/bin/env python3
"""Convert a CF-decoded monthly regular-grid EWH NetCDF into browser JSON.
No corrections, rebaselining, interpolation or smoothing are performed.
Verify product metadata and units before running.
"""
import argparse
import json
from pathlib import Path
import numpy as np
import xarray as xr

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("input")
p.add_argument("--var", required=True)
p.add_argument("--unit", choices=["cm", "mm", "m", "kg/m2"], required=True)
p.add_argument("--source", required=True)
p.add_argument("--baseline", required=True)
p.add_argument("--lat", default="lat")
p.add_argument("--lon", default="lon")
p.add_argument("--time", default="time")
p.add_argument("--start", default="2002-01")
p.add_argument("--end", default="2099-12")
p.add_argument("--out", default="grace_monthly")
a = p.parse_args()
factor = {"cm": 1., "mm": .1, "m": 100., "kg/m2": .1}[a.unit]
out = Path(a.out)
out.mkdir(parents=True, exist_ok=True)
with xr.open_dataset(a.input, decode_times=True) as ds:
    v = ds[a.var]
    if set(v.dims) != {a.time, a.lat, a.lon}:
        raise ValueError("Expected exactly time, latitude and longitude dimensions; inspect the NetCDF metadata.")
    v = v.assign_coords({a.lon: ((v[a.lon] + 180) % 360) - 180}).sortby(a.lon).sortby(a.lat)
    lat = np.asarray(v[a.lat], dtype=float)
    lon = np.asarray(v[a.lon], dtype=float)
    for arr, lower, upper in [(lat, -90, 90), (lon, -180, 180)]:
        diff = np.diff(arr)
        if len(arr) < 2 or not np.all(np.isfinite(arr)) or arr.min() < lower or arr.max() > upper or np.any(diff <= 0) or not np.allclose(diff, diff[0], atol=1e-5, rtol=0):
            raise ValueError("Expected ascending regular grid centers without duplicate coordinates.")
    if lat.size * lon.size > 3000000:
        raise ValueError("Grid is too large for this browser explorer.")
    months = v[a.time].dt.strftime("%Y-%m").values
    used = set()
    for i, month in enumerate(months):
        month = str(month)
        if not a.start <= month <= a.end:
            continue
        if month in used:
            raise ValueError("Multiple acquisitions in one calendar month: choose monthly product or resolve dates explicitly.")
        used.add(month)
        z = np.asarray(v.isel({a.time: i}).transpose(a.lat, a.lon), dtype=float).ravel() * factor
        data = dict(month=month, source=a.source, baseline=a.baseline, unit="cm",
                    lat=lat.tolist(), lon=lon.tolist(),
                    values=[round(float(x), 5) if np.isfinite(x) else None for x in z])
        path = out / (month + ".json")
        path.write_text(json.dumps(data, separators=(",", ":"), allow_nan=False), encoding="utf-8")
        print(path)
    if not used:
        raise ValueError("No observations within requested dates.")
