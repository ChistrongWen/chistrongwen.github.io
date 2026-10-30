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
root.add(new THREE.Mesh(new THREE.SphereGeometry(1.018,64,48),new THREE.MeshBasicMaterial({color:0x4aa4d5,transparent:true,opacity:.085,side:THREE.BackSide})));
scene.add(new THREE.AmbientLight(0xffffff,1.7));const light=new THREE.DirectionalLight(0xffffff,1.7);light.position.set(3,2,5);scene.add(light);
let running=true,values=[],limits=1,overlayTexture=null;
const overlay=new THREE.Mesh(new THREE.SphereGeometry(1.007,144,96),new THREE.MeshBasicMaterial({transparent:true,opacity:.92,depthWrite:false,side:THREE.FrontSide}));
overlay.visible=false;root.add(overlay);
const $=id=>document.getElementById(id);$('year').textContent=new Date().getFullYear();
function heat(v,max){const t=Math.max(-1,Math.min(1,v/max));const neg=new THREE.Color('#244da1'),zero=new THREE.Color('#f3f4ed'),pos=new THREE.Color('#b32434');return (t<0?zero.clone().lerp(neg,-t):zero.clone().lerp(pos,t));}
function clearOverlay(){overlay.visible=false;overlay.material.map=null;if(overlayTexture){overlayTexture.dispose();overlayTexture=null;}overlay.material.needsUpdate=true;}
function renderField(){
  clearOverlay();if(!values.length)return;
  // Robust symmetric color scale: 98th percentile of absolute values; larger values are clipped only in color.
  const sorted=values.map(d=>Math.abs(d.value)).sort((a,b)=>a-b);
  limits=Math.max(sorted[Math.floor(.98*(sorted.length-1))],1e-12);
  // Equirectangular 1 degree cells, no interpolation and no data subsampling.
  // Pixel x=0 maps to -180°, pixel y=0 maps to 90°N.
  const cvs=document.createElement('canvas');cvs.width=360;cvs.height=180;
  const ctx=cvs.getContext('2d');const img=ctx.createImageData(360,180);
  const cneg=new THREE.Color('#244da1'),czer=new THREE.Color('#f3f4ed'),cpos=new THREE.Color('#b32434');
  for(const d of values){
    const x=((Math.round(d.lon)+180)%360+360)%360;
    const y=Math.min(179,Math.max(0,Math.round(90-d.lat)));
    const t=Math.max(-1,Math.min(1,d.value/limits));
    const col=(t<0?czer.clone().lerp(cneg,-t):czer.clone().lerp(cpos,t));
    const k=4*(y*360+x);img.data[k]=Math.round(col.r*255);img.data[k+1]=Math.round(col.g*255);img.data[k+2]=Math.round(col.b*255);img.data[k+3]=255;
  }
  ctx.putImageData(img,0,0);
  overlayTexture=new THREE.CanvasTexture(cvs);
  overlayTexture.colorSpace=THREE.SRGBColorSpace;
  overlayTexture.magFilter=THREE.NearestFilter;overlayTexture.minFilter=THREE.NearestFilter;
  overlay.material.map=overlayTexture;overlay.material.needsUpdate=true;overlay.visible=true;
  $('low').textContent=(-limits).toPrecision(3);$('high').textContent=limits.toPrecision(3);
  $('legend').hidden=false;
  const info=$('scaleInfo');if(info)info.textContent='Symmetric scale at 98th percentile of |value|; extreme values are color-clipped. Original data unchanged.';
}
function parseCSV(text){const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);const head=lines.shift().split(',').map(x=>x.trim().toLowerCase());const x=head.indexOf('lon'),y=head.indexOf('lat'),v=head.indexOf('value');if(x<0||y<0||v<0)throw Error('Header must include lon,lat,value');let result=[];for(const line of lines){const a=line.split(',');let lon=Number(a[x]),lat=Number(a[y]),value=Number(a[v]);if(!a[x]?.trim()||!a[y]?.trim()||!a[v]?.trim()||![lon,lat,value].every(Number.isFinite)||lat < -90||lat>90)continue;lon=((lon+180)%360+360)%360-180;result.push({lon,lat,value});}if(!result.length)throw Error('No valid numeric rows found');return result;}
$('file').addEventListener('change',async e=>{let file=e.target.files?.[0];if(!file)return;try{if(file.size>12_000_000)throw Error('File exceeds 12 MB; reduce grid resolution first');values=parseCSV(await file.text());customValues=values;renderField();$('layer').value='data';download.hidden=true;overlay.visible=true;$('summary').textContent=`${$('title').value||file.name}: ${values.length.toLocaleString()} valid locations; ${values.length.toLocaleString()} rendered (1° grid; no subsampling).`;}catch(err){$('summary').textContent='Error: '+err.message;}});
const preset={
  gia_vlm:['gia_vlm.csv','Caron 2018 · VLM mean','mm/yr'],
  gia_vlm_std:['gia_vlm_std.csv','Caron 2018 · VLM uncertainty (std.)','mm/yr'],
  gia_geoid:['gia_geoid.csv','Caron 2018 · Geoid rate mean','mm/yr'],
  gia_geoid_std:['gia_geoid_std.csv','Caron 2018 · Geoid rate uncertainty (std.)','mm/yr'],
  gia_gravity:['gia_gravity.csv','Caron 2018 · Gravity rate mean','mm/yr WHE'],
  gia_gravity_std:['gia_gravity_std.csv','Caron 2018 · Gravity rate uncertainty (std.)','mm/yr WHE']
};
let customValues=[];
const download=$('downloadCsv');
async function selectLayer(key){
  if(key==='earth') {overlay.visible=false;$('legend').hidden=true;download.hidden=true;$('summary').textContent='Earth base map, no model overlay.';return;}
  if(key==='data') {download.hidden=true; values=customValues;overlay.visible=true;
    if(values.length){renderField();$('summary').textContent=`Custom CSV: ${values.length.toLocaleString()} locations.`;}
    else {clearOverlay();$('legend').hidden=true;$('summary').textContent='Choose a local CSV file below.';}return;}
  const [filename,title,unit]=preset[key];
  if(!filename)return;
  download.href='data/'+filename;download.download=filename;download.hidden=false;
  $('summary').textContent='Loading '+title+' …';
  try {
    const response=await fetch('data/'+filename);
    if(!response.ok) throw Error('HTTP '+response.status+' for '+filename);
    const records=parseCSV(await response.text());
    if($('layer').value!==key)return;
    values=records; $('title').value=title;$('units').value=unit;
    try { renderField(); } catch(error) { clearOverlay(); console.error('GIA render failed',error); $('summary').textContent='GIA rendering error: '+error.message; return; }
    $('summary').textContent=`${title}: ${values.length.toLocaleString()} grid points · ${values.length.toLocaleString()} rendered (1° grid; no subsampling). Source grid 1° × 1°.`;
  }catch(err){clearOverlay();$('summary').textContent='Unable to load preset CSV: '+err.message;console.error('GIA layer load failed',err);}
}
$('layer').addEventListener('change',e=>selectLayer(e.target.value));
// Load after the base globe has painted, so dataset errors cannot block the globe.
$('layer').value='earth';
setTimeout(()=>{ $('layer').value='gia_vlm'; selectLayer('gia_vlm'); },800);
$('rotateBtn').onclick=()=>{running=!running;$('rotateBtn').textContent=running?'⏸ Pause rotation':'▶ Resume rotation';};
$('resetBtn').onclick=()=>{camera.position.set(0,0,3.55);controls.target.set(0,0,0);root.rotation.set(0,0,0);controls.update();};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();renderer.domElement.addEventListener('click',event=>{const rect=renderer.domElement.getBoundingClientRect();pointer.x=2*(event.clientX-rect.left)/rect.width-1;pointer.y=1-2*(event.clientY-rect.top)/rect.height;raycaster.setFromCamera(pointer,camera);let p=raycaster.intersectObject(globe)[0];if(!p)return;const local=root.worldToLocal(p.point.clone()).normalize();const lat=THREE.MathUtils.radToDeg(Math.asin(local.y));const lon=((THREE.MathUtils.radToDeg(Math.atan2(-local.x,-local.z))+540)%360)-180;let msg=`Lat ${lat.toFixed(2)}°, Lon ${lon.toFixed(2)}°`;if(values.length&&$('layer').value!=='earth'){const nearest=values.reduce((best,d)=>{const dl=((((d.lon-lon)+540)%360)-180)*Math.cos(lat*Math.PI/180);const dist=dl*dl+(d.lat-lat)**2;return dist<best.dist?{d,dist}:best},{dist:Infinity});if(Math.sqrt(nearest.dist)<5)msg+=` · Nearby sample ${nearest.d.value.toPrecision(4)} ${$('units').value}`;} $('tip').textContent=msg;});
function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}new ResizeObserver(resize).observe(container);resize();
let last=performance.now();function render(time=last){requestAnimationFrame(render);const dt=Math.min((time-last)/1000,.05);last=time;if(running)root.rotation.y+=dt*.055;controls.update();renderer.render(scene,camera);}render();
