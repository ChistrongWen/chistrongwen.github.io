# Interactive Earth — minimal scoped update

## What changes
- Existing six Caron 2018 layer options, page design, 3D interaction, coastline overlay and slider are preserved.
- Adds automatic data catalog reading; all discovered CSV layers append to the existing Visualization select.
- Includes actual `sea_level_trend_1993_2025.csv` with original five columns. This CSV produces two entries: `trend_mm_yr` and `se_mm_yr`.
- One-time GitHub Action regenerates `earth/data/layers.json` on subsequent new/modified CSV uploads.
- Original GIA CSV files stay exactly as-is in the online repository; do not delete them.

## Upload into your existing repository (merge, do not replace entire folders)
Upload these files at their exact paths:
- `earth/index.html` (replace)
- `earth/globe.js` (replace)
- `earth/assets/coastlines.png` (same previous coastline layer)
- `earth/build_layers.py` (new)
- `earth/data/layers.json` (new, initial catalog)
- `earth/data/sea_level_trend_1993_2025.csv` (new, original data)
- `.github/workflows/update-earth-layers.yml` (new, automatic catalog update)

Keep `earth/style.css`, `earth/assets/earth-map.png`, and all six `earth/data/gia_*.csv` files.
Do NOT replace root `index.html`, notes, cv, images, or analytics.

## Future CSV uploads
Push a CSV under `earth/data/` with a header containing `lon,lat,value` or `lon,lat,trend_mm_yr,se_mm_yr`.
On push to `main`, the workflow regenerates `earth/data/layers.json` and commits it back to `main`.
If workflow cannot push due to branch protection or repository settings, run `python3 earth/build_layers.py` locally and upload the resulting `earth/data/layers.json` manually.
Check GitHub > Actions > Update Interactive Earth CSV catalog for workflow result.

Avoid editing `layers.json` manually. Names of entries are derived from file and column names; columns `n_months`, `n_obs` and `count` are not visualized.
The original sea-level uncertainty field is OLS 1 SE as supplied, not autocorrelation-corrected.

### Note on rendering
Global 1-degree GIA CSVs use 360x180 cells; your satellite altimetry is plotted on a finer approximately 0.25-degree raster (with missing land pixels transparent). No spatial interpolation or filtering is applied; color clipping is controlled by existing slider and only changes display color.
