#!/usr/bin/env python3
"""Build public CSV layer catalog from earth/data; no data values are modified."""
from pathlib import Path
import csv, json, re
ROOT=Path(__file__).resolve().parent
DATA=ROOT/'data'
known={'gia_vlm','gia_vlm_std','gia_geoid','gia_geoid_std','gia_gravity','gia_gravity_std'}
def pretty(s):
    return re.sub(r'\s+',' ',s.replace('_',' ').replace('-',' ')).strip().title()
def unit(column):
    return 'mm/yr' if column.endswith('_mm_yr') else ('mm/yr WHE' if 'gravity' in column else 'mm/yr' if 'gia_' in column else 'value')
layers=[]
for p in sorted(DATA.glob('*.csv')):
    if p.stem in known: continue   # Existing Caron entries remain unchanged.
    with p.open('r',encoding='utf-8-sig',newline='') as fh:
        header=next(csv.reader(fh),[])
    names=[s.strip() for s in header]
    lower=[s.lower() for s in names]
    if not {'lon','lat'}.issubset(lower):
        print('Skip CSV missing lon/lat:',p.name);continue
    cols=[name for name in names if name.lower() not in {'lon','lat','n_months','n_obs','count','year','month','day'}]
    # Prefer recognized scientific quantities; if only one value column it is treated as a layer.
    selected=[c for c in cols if c.lower() in {'value','trend_mm_yr','se_mm_yr','uncertainty_mm_yr','std_mm_yr'}]
    if not selected: selected=cols[:1]
    for col in selected:
        is_trend=(col.lower()=='trend_mm_yr')
        is_se=col.lower() in ('se_mm_yr','uncertainty_mm_yr','std_mm_yr')
        label=(pretty(p.stem) if len(selected)==1 else (f'{pretty(p.stem)} — Trend' if is_trend else f'{pretty(p.stem)} — Uncertainty (1 SE)' if is_se else f'{pretty(p.stem)} — {pretty(col)}'))
        layers.append({'id':f'csv:{p.name}:{col}', 'label':label,'file':p.name,'column':col,'unit':unit(col.lower()),'kind':'uncertainty' if is_se else 'trend' if is_trend else 'generic'})
output=DATA/'layers.json'
output.write_text(json.dumps({'layers':layers},indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(f'Wrote {output}: {len(layers)} dynamic layers')
