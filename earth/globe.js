import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const container = document.getElementById('globe');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
camera.position.set(0,0,3.55);
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();document.getElementById('tip').textContent='WebGL graphics context lost. Reload this page to restore the globe.';});
const controls = new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=1.55;controls.maxDistance=7;
const root = new THREE.Group();scene.add(root);
const texture=new THREE.TextureLoader().load('assets/earth-map.png');texture.colorSpace=THREE.SRGBColorSpace;
const globe=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0}));root.add(globe);
// Coastline outlines from the existing earth-map.png, rendered above scientific overlays.
const coastlineTexture=new THREE.TextureLoader().load('assets/coastlines.png');coastlineTexture.colorSpace=THREE.SRGBColorSpace;
const coastlines=new THREE.Mesh(new THREE.SphereGeometry(1.014,144,96),new THREE.MeshBasicMaterial({map:coastlineTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));root.add(coastlines);
root.add(new THREE.Mesh(new THREE.SphereGeometry(1.018,64,48),new THREE.MeshBasicMaterial({color:0x4aa4d5,transparent:true,opacity:.085,side:THREE.BackSide})));
scene.add(new THREE.AmbientLight(0xffffff,1.7));const light=new THREE.DirectionalLight(0xffffff,1.7);light.position.set(3,2,5);scene.add(light);
let running=true,values=[],limits=1,overlayTexture=null,autoLimits=1,manualScaleRatio=1;
const overlay=new THREE.Mesh(new THREE.SphereGeometry(1.007,144,96),new THREE.MeshBasicMaterial({transparent:true,opacity:.92,depthWrite:false,side:THREE.FrontSide}));
overlay.visible=false;root.add(overlay);
const $=id=>document.getElementById(id);$('year').textContent=new Date().getFullYear();
// Approximate web color ramps inspired by commonly used scientific CPTs.
// The original polar endpoint/neutral colors are preserved as the default.
const cptStops={
  polar:[[0,'#244da1'],[.5,'#f3f4ed'],[1,'#b32434']],
  seis:[[0,'#001a85'],[.25,'#4c8aca'],[.5,'#ffffff'],[.75,'#ef7b68'],[1,'#a50013']],
  vik:[[0,'#001c48'],[.25,'#4f89a0'],[.5,'#efeee9'],[.75,'#c77f69'],[1,'#5c1525']],
  viridis:[[0,'#440154'],[.25,'#3b528b'],[.5,'#21918c'],[.75,'#5ec962'],[1,'#fde725']],
  turbo:[[0,'#30123b'],[.18,'#4669ed'],[.35,'#1ac7d6'],[.5,'#a5fc3c'],[.68,'#ffbf23'],[.85,'#f34b19'],[1,'#7a0403']],
  jet:[[0,'#000080'],[.125,'#0000ff'],[.375,'#00ffff'],[.5,'#80ff80'],[.625,'#ffff00'],[.875,'#ff0000'],[1,'#800000']],
  gray:[[0,'#222222'],[.5,'#919191'],[1,'#ffffff']]
};
const paletteCache=Object.fromEntries(Object.entries(cptStops).map(([key,stops])=>[key,stops.map(([v,hex])=>[v,[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))])]));
let activeCpt='polar';
function paletteRGB(t){
  const stops=paletteCache[activeCpt]||paletteCache.polar;
  t=Math.max(0,Math.min(1,t));
  let hi=1;while(hi<stops.length-1&&t>stops[hi][0])hi++;
  const [a,ca]=stops[hi-1],[b,cb]=stops[hi];
  const f=(t-a)/(b-a||1);
  return [0,1,2].map(i=>Math.round(ca[i]+f*(cb[i]-ca[i])));
}
function updatePaletteLegend(){
  const stops=cptStops[activeCpt]||cptStops.polar;
  $('cptGradient').style.background='linear-gradient(to right,'+stops.map(([v,color])=>`${color} ${v*100}%`).join(',')+')';
  $('cptCaption').textContent=['polar','seis','vik'].includes(activeCpt)?'Blue: negative · Red: positive.':'Colors progress from the low to high limits.';
}

function clearOverlay(){overlay.visible=false;overlay.material.map=null;if(overlayTexture){overlayTexture.dispose();overlayTexture=null;}overlay.material.needsUpdate=true;}
function renderField(){
  clearOverlay();if(!values.length)return;
  const sorted=values.map(d=>Math.abs(d.value)).sort((a,b)=>a-b);
  autoLimits=Math.max(sorted[Math.floor(.98*(sorted.length-1))],1e-12);
  limits=autoLimits*manualScaleRatio;
  // Render the native geographic grid as contiguous raster CELLS, not
  // isolated rounded centre pixels. This prevents artificial dark meridian/
  // parallel stripes at half-pixel coordinates (e.g., 0.25-degree centres).
  // Missing ocean/land cells remain transparent; no interpolation is applied.
  const coordinateStep=(key)=>{
    const u=Array.from(new Set(values.slice(0,Math.min(values.length,20000))
      .map(d=>Math.round(d[key]*1000000)))).sort((a,b)=>a-b);
    let smallest=Infinity;
    for(let i=1;i<u.length;i++){
      const delta=(u[i]-u[i-1])/1000000;
      if(delta>1e-6 && delta<smallest)smallest=delta;
    }
    return smallest;
  };
  const dx=coordinateStep('lon'),dy=coordinateStep('lat');
  // Preserve native spacing for regular lat/lon grids (1°, 0.5°, 0.25°).
  // The GPU cap is a rendering constraint, NOT a data transformation.
  const gridStep=Math.max(360/4096,180/2048,
    Math.min(Number.isFinite(dx)?dx:1,Number.isFinite(dy)?dy:1));
  const width=Math.max(360,Math.round(360/gridStep));
  const height=Math.max(180,Math.round(180/gridStep));
  const cvs=document.createElement('canvas');cvs.width=width;cvs.height=height;
  const ctx=cvs.getContext('2d',{willReadFrequently:false});
  const img=ctx.createImageData(width,height);
  updatePaletteLegend();
  const pixelX=360/width,pixelY=180/height;
  for(const d of values){
    const [r,g,b]=paletteRGB(.5+.5*Math.max(-1,Math.min(1,d.value/limits)));
    // Half-open source-cell footprint. Wrap longitude at the antimeridian.
    const west=d.lon-(Number.isFinite(dx)?dx:pixelX)/2;
    const east=d.lon+(Number.isFinite(dx)?dx:pixelX)/2;
    const north=d.lat+(Number.isFinite(dy)?dy:pixelY)/2;
    const south=d.lat-(Number.isFinite(dy)?dy:pixelY)/2;
    const x0=Math.floor((west+180)/pixelX+1e-8);
    const x1=Math.ceil((east+180)/pixelX-1e-8);
    const y0=Math.max(0,Math.floor((90-north)/pixelY+1e-8));
    const y1=Math.min(height,Math.ceil((90-south)/pixelY-1e-8));
    for(let py=y0;py<y1;py++)for(let px=x0;px<x1;px++){
      const xx=((px%width)+width)%width;
      const k=4*(py*width+xx);
      img.data[k]=r;img.data[k+1]=g;img.data[k+2]=b;img.data[k+3]=255;
    }
  }
  ctx.putImageData(img,0,0);
  overlayTexture=new THREE.CanvasTexture(cvs);overlayTexture.colorSpace=THREE.SRGBColorSpace;
  overlayTexture.magFilter=THREE.NearestFilter;overlayTexture.minFilter=THREE.NearestFilter;
  overlay.material.map=overlayTexture;overlay.material.needsUpdate=true;overlay.visible=true;
  $('low').textContent=(-limits).toPrecision(3);$('high').textContent=limits.toPrecision(3);
  $('scaleLimit').textContent=limits.toPrecision(3)+' '+$('units').value;
  $('legend').hidden=false;
  const info=$('scaleInfo');if(info)info.textContent='Symmetric scale at 98th percentile of |value|; extreme values are color-clipped. Original data unchanged.';
}
function parseCSV(text,column='value'){
  const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  const head=lines.shift().split(',').map(x=>x.trim().toLowerCase());
  const x=head.indexOf('lon'),y=head.indexOf('lat'),v=head.indexOf(column.toLowerCase());
  if(x<0||y<0||v<0)throw Error('Header must include lon,lat,'+column);
  const result=[];
  for(const line of lines){const a=line.split(',');const lonRaw=Number(a[x]),lat=Number(a[y]),value=Number(a[v]);
    if(!a[x]?.trim()||!a[y]?.trim()||!a[v]?.trim()||![lonRaw,lat,value].every(Number.isFinite)||lat < -90||lat>90)continue;
    const lon=((lonRaw+180)%360+360)%360-180;
    result.push({lon,lat,value});
  }
  if(!result.length)throw Error('No valid numeric rows found');return result;
}
$('file').addEventListener('change',async e=>{let file=e.target.files?.[0];if(!file)return;try{if(file.size>60_000_000)throw Error('File exceeds 60 MB');values=parseCSV(await file.text());customValues=values;renderField();$('layer').value='data';download.hidden=true;overlay.visible=true;$('summary').textContent=`${$('title').value||file.name}: ${values.length.toLocaleString()} valid locations; ${values.length.toLocaleString()} rendered (1° grid; no subsampling).`;}catch(err){$('summary').textContent='Error: '+err.message;}});
const preset={
  gia_vlm:['gia_vlm.csv','Caron 2018 · VLM mean','mm/yr'],
  gia_vlm_std:['gia_vlm_std.csv','Caron 2018 · VLM uncertainty (std.)','mm/yr'],
  gia_geoid:['gia_geoid.csv','Caron 2018 · Geoid rate mean','mm/yr'],
  gia_geoid_std:['gia_geoid_std.csv','Caron 2018 · Geoid rate uncertainty (std.)','mm/yr'],
  gia_gravity:['gia_gravity.csv','Caron 2018 · Gravity rate mean','mm/yr WHE'],
  gia_gravity_std:['gia_gravity_std.csv','Caron 2018 · Gravity rate uncertainty (std.)','mm/yr WHE']
};
let customValues=[];
let activeRequest=0;
const dynamicLayers={};
// The menu's existing entries and styling are untouched; only append CSV options.
async function loadDynamicCatalog(){
  try {
    const response=await fetch('data/layers.json?ts='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status);
    const catalog=await response.json();
    for(const item of (catalog.layers||[])){
      if(!item.id||!item.file||!item.column||dynamicLayers[item.id])continue;
      dynamicLayers[item.id]=item;
      const option=document.createElement('option');option.value=item.id;option.textContent=item.label;
      const custom=$('layer').querySelector('option[value="data"]');
      $('layer').insertBefore(option,custom);
    }
  }catch(err){console.warn('Automatic CSV catalog unavailable; existing GIA layers remain usable.',err);}
}
loadDynamicCatalog();
const download=$('downloadCsv');
async function selectLayer(key){
  const request=++activeRequest;
  manualScaleRatio=1;$('colorRange').value='1';
  if(key==='earth') {overlay.visible=false;$('legend').hidden=true;download.hidden=true;$('summary').textContent='Earth base map, no model overlay.';return;}
  if(key==='data') {download.hidden=true; values=customValues;overlay.visible=true;
    if(values.length){renderField();$('summary').textContent=`Custom CSV: ${values.length.toLocaleString()} locations.`;}
    else {clearOverlay();$('legend').hidden=true;$('summary').textContent='Choose a local CSV file below.';}return;}
  const entry=dynamicLayers[key];
  const settings=entry ? [entry.file,entry.label,entry.unit] : preset[key];
  if(!settings)return;
  const [filename,title,unit]=settings;
  download.href='data/'+filename;download.download=filename;download.hidden=false;
  $('summary').textContent='Loading '+title+' …';
  try {
    const response=await fetch('data/'+filename);
    if(!response.ok) throw Error('HTTP '+response.status+' for '+filename);
    const records=parseCSV(await response.text(),entry?.column||'value');
    if($('layer').value!==key||request!==activeRequest)return;
    values=records; $('title').value=title;$('units').value=unit;
    try { renderField(); } catch(error) { clearOverlay(); console.error('GIA render failed',error); $('summary').textContent='GIA rendering error: '+error.message; return; }
    $('summary').textContent=`${title}: ${values.length.toLocaleString()} valid source grid points; rendered without subsampling or interpolation.`;
  }catch(err){clearOverlay();$('summary').textContent='Unable to load CSV: '+err.message;console.error('GIA layer load failed',err);}
}
$('colorRange').addEventListener('input',event=>{manualScaleRatio=Number(event.target.value);if(values.length&&$('layer').value!=='earth')renderField();});
$('cptSelect').addEventListener('change',event=>{activeCpt=event.target.value;updatePaletteLegend();if(values.length&&$('layer').value!=='earth')renderField();});
updatePaletteLegend();
$('layer').addEventListener('change',e=>selectLayer(e.target.value));
// Load after the base globe has painted, so dataset errors cannot block the globe.
$('layer').value='earth';
setTimeout(()=>{ $('layer').value='gia_vlm'; selectLayer('gia_vlm'); },800);
$('rotateBtn').onclick=()=>{running=!running;$('rotateBtn').textContent=running?'⏸ Pause rotation':'▶ Resume rotation';};
$('resetBtn').onclick=()=>{camera.position.set(0,0,3.55);controls.target.set(0,0,0);root.rotation.set(0,0,0);controls.update();};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();renderer.domElement.addEventListener('click',event=>{const rect=renderer.domElement.getBoundingClientRect();pointer.x=2*(event.clientX-rect.left)/rect.width-1;pointer.y=1-2*(event.clientY-rect.top)/rect.height;raycaster.setFromCamera(pointer,camera);let p=raycaster.intersectObject(globe)[0];if(!p)return;const local=root.worldToLocal(p.point.clone()).normalize();const lat=THREE.MathUtils.radToDeg(Math.asin(local.y));const lon=((THREE.MathUtils.radToDeg(Math.atan2(-local.x,-local.z))+540)%360)-180;let msg=`Lat ${lat.toFixed(2)}°, Lon ${lon.toFixed(2)}°`;if(values.length&&$('layer').value!=='earth'){const nearest=values.reduce((best,d)=>{const dl=((((d.lon-lon)+540)%360)-180)*Math.cos(lat*Math.PI/180);const dist=dl*dl+(d.lat-lat)**2;return dist<best.dist?{d,dist}:best},{dist:Infinity});if(Math.sqrt(nearest.dist)<5)msg+=` · Nearby sample ${nearest.d.value.toPrecision(4)} ${$('units').value}`;} $('tip').textContent=msg;});
function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}new ResizeObserver(resize).observe(container);resize();
let last=performance.now();function render(time=last){requestAnimationFrame(render);const dt=Math.min((time-last)/1000,.05);last=time;if(running)root.rotation.y+=dt*.055;controls.update();renderer.render(scene,camera);}render();
