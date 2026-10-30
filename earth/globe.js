import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const container = document.getElementById('globe');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
camera.position.set(0,0,3.55);
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);
const controls = new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=1.55;controls.maxDistance=7;
const root = new THREE.Group();scene.add(root);
const texture=new THREE.TextureLoader().load('assets/earth-map.png',()=>render());texture.colorSpace=THREE.SRGBColorSpace;
const globe=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0}));root.add(globe);
root.add(new THREE.Mesh(new THREE.SphereGeometry(1.018,64,48),new THREE.MeshBasicMaterial({color:0x4aa4d5,transparent:true,opacity:.085,side:THREE.BackSide})));
scene.add(new THREE.AmbientLight(0xffffff,1.7));const light=new THREE.DirectionalLight(0xffffff,1.7);light.position.set(3,2,5);scene.add(light);
let running=true,pointsGroup=new THREE.Group(),values=[],limits=1;root.add(pointsGroup);
const $=id=>document.getElementById(id);$('year').textContent=new Date().getFullYear();
function coords(lon,lat,r=1.012){const lo=THREE.MathUtils.degToRad(lon),la=THREE.MathUtils.degToRad(lat);return new THREE.Vector3(-r*Math.cos(la)*Math.sin(lo),r*Math.sin(la),-r*Math.cos(la)*Math.cos(lo));}
// Three.js built-in texture UV uses longitude=0 at the front-left of the x/z convention below.
function heat(v,max){const t=Math.max(-1,Math.min(1,v/max));const neg=new THREE.Color('#244da1'),zero=new THREE.Color('#f3f4ed'),pos=new THREE.Color('#b32434');return (t<0?zero.clone().lerp(neg,-t):zero.clone().lerp(pos,t));}
function renderPoints(){pointsGroup.clear();if(!values.length)return;const maxPoints=3500,step=Math.max(1,Math.ceil(values.length/maxPoints));limits=Math.max(...values.map(v=>Math.abs(v.value)),1e-12);const geometry=new THREE.SphereGeometry(.011,7,5);for(let i=0;i<values.length;i+=step){let d=values[i];let mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:heat(d.value,limits)}));mesh.position.copy(coords(d.lon,d.lat));mesh.userData=d;pointsGroup.add(mesh);} $('low').textContent=(-limits).toPrecision(3);$('high').textContent=limits.toPrecision(3);$('legend').hidden=false;}
function parseCSV(text){const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);const head=lines.shift().split(',').map(x=>x.trim().toLowerCase());const x=head.indexOf('lon'),y=head.indexOf('lat'),v=head.indexOf('value');if(x<0||y<0||v<0)throw Error('Header must include lon,lat,value');let result=[];for(const line of lines){const a=line.split(',');let lon=Number(a[x]),lat=Number(a[y]),value=Number(a[v]);if(!a[x]?.trim()||!a[y]?.trim()||!a[v]?.trim()||![lon,lat,value].every(Number.isFinite)||lat < -90||lat>90)continue;lon=((lon+180)%360+360)%360-180;result.push({lon,lat,value});}if(!result.length)throw Error('No valid numeric rows found');return result;}
$('file').addEventListener('change',async e=>{let file=e.target.files?.[0];if(!file)return;try{if(file.size>12_000_000)throw Error('File exceeds 12 MB; reduce grid resolution first');values=parseCSV(await file.text());renderPoints();$('layer').value='data';pointsGroup.visible=true;$('summary').textContent=`${$('title').value||file.name}: ${values.length.toLocaleString()} valid locations; ${pointsGroup.children.length.toLocaleString()} displayed.`;}catch(err){$('summary').textContent='Error: '+err.message;}});
$('layer').addEventListener('change',e=>{pointsGroup.visible=e.target.value==='data';if(pointsGroup.visible&&!values.length)$('summary').textContent='Choose a CSV file first.';});
$('clearBtn').onclick=()=>{values=[];pointsGroup.clear();$('file').value='';$('layer').value='earth';$('legend').hidden=true;$('summary').textContent='No research dataset loaded.';};
$('rotateBtn').onclick=()=>{running=!running;$('rotateBtn').textContent=running?'⏸ Pause rotation':'▶ Resume rotation';};
$('resetBtn').onclick=()=>{camera.position.set(0,0,3.55);controls.target.set(0,0,0);root.rotation.set(0,0,0);controls.update();};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();renderer.domElement.addEventListener('click',event=>{const rect=renderer.domElement.getBoundingClientRect();pointer.x=2*(event.clientX-rect.left)/rect.width-1;pointer.y=1-2*(event.clientY-rect.top)/rect.height;raycaster.setFromCamera(pointer,camera);let p=raycaster.intersectObject(globe)[0];if(!p)return;const local=root.worldToLocal(p.point.clone()).normalize();const lat=THREE.MathUtils.radToDeg(Math.asin(local.y));const lon=((THREE.MathUtils.radToDeg(Math.atan2(-local.x,-local.z))+540)%360)-180;let msg=`Lat ${lat.toFixed(2)}°, Lon ${lon.toFixed(2)}°`;if(values.length&&$('layer').value==='data'){const nearest=values.reduce((best,d)=>{const dl=((((d.lon-lon)+540)%360)-180)*Math.cos(lat*Math.PI/180);const dist=dl*dl+(d.lat-lat)**2;return dist<best.dist?{d,dist}:best},{dist:Infinity});if(Math.sqrt(nearest.dist)<5)msg+=` · Nearby sample ${nearest.d.value.toPrecision(4)} ${$('units').value}`;} $('tip').textContent=msg;});
function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}new ResizeObserver(resize).observe(container);resize();
let last=performance.now();function render(time=last){requestAnimationFrame(render);const dt=Math.min((time-last)/1000,.05);last=time;if(running)root.rotation.y+=dt*.055;controls.update();renderer.render(scene,camera);}render();
