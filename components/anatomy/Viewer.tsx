"use client";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Structure, SystemId } from '@/lib/anatomy/content';
import { LoaderCircle, TriangleAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
export type ViewerHandle={reset:()=>void;zoom:(amount:number)=>void;orient:(side:'front'|'back'|'side')=>void;focus:()=>void};
type Props={system:SystemId;structures:Structure[];selected:string|null;isolated:boolean;opacity:number;context:boolean;labels:boolean;onSelect:(id:string)=>void;onReady:(system:SystemId)=>void};
type Mesh=THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
const colors:Record<SystemId,string>={skeletal:'#e3d4ac',muscular:'#b96154',nervous:'#dfb953',organs:'#bc7986',ligaments:'#6dabb8'};
const organColors:Record<string,string>={heart:'#ba5b56',lung:'#c58c9a',liver:'#996053',stomach:'#d29984',kidney:'#ae6462',pancreas:'#d1ad73',spleen:'#856889',intestine:'#c9a091',bladder:'#d3b58a',trachea:'#aec5c2'};
const LAYER_DEPTH=1.2;
const volumeOf=(bounds:number[])=>Math.abs(bounds[3]-bounds[0])*Math.abs(bounds[4]-bounds[1])*Math.abs(bounds[5]-bounds[2]);
const overlaps=(a:number[],b:number[])=>a[0]<=b[3]&&a[3]>=b[0]&&a[1]<=b[4]&&a[4]>=b[1]&&a[2]<=b[5]&&a[5]>=b[2];
const pickLayer=(hits:THREE.Intersection[],selectedId:string|null)=>{
 const unique:{mesh:Mesh;distance:number}[]=[];const seen=new Set<string>();
 for(const hit of hits){const mesh=hit.object as Mesh;const id=mesh.userData.id as string;if(!id||seen.has(id))continue;seen.add(id);unique.push({mesh,distance:hit.distance})}
 if(!unique.length)return;const start=unique[0].distance;
 const stack=unique.filter(h=>h.distance-start<=LAYER_DEPTH).map(h=>h.mesh);
 const index=stack.findIndex(mesh=>mesh.userData.id===selectedId);
 return index===-1?stack[0]:stack[(index+1)%stack.length];
};
const Viewer=forwardRef<ViewerHandle,Props>(function Viewer(props,ref){
 const container=useRef<HTMLDivElement>(null), state=useRef(props);state.current=props;
 const api=useRef<{reset:()=>void;focus:()=>void;zoom:(n:number)=>void;orient:(side:string)=>void;update:()=>void;load:(id:SystemId)=>Promise<void>}|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0),[hover,setHover]=useState('');
 const selectedLabel=useRef<HTMLDivElement>(null);
 useImperativeHandle(ref,()=>({reset:()=>api.current?.reset(),focus:()=>api.current?.focus(),zoom:n=>api.current?.zoom(n),orient:s=>api.current?.orient(s)}),[]);
 useEffect(()=>{
  const el=container.current;if(!el)return;
  let disposed=false,frame=0;const abort=new AbortController();
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{setError('The 3D viewer needs WebGL. Enable hardware acceleration in your browser, then retry. You can still browse all structures and study notes.');setLoading(false);return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));renderer.setClearColor(0xffffff,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  renderer.domElement.setAttribute('aria-label','Interactive 3D anatomy. Drag to rotate, scroll to zoom. Click a structure; click again on the same spot to select the muscle or organ underneath. Use the structure list for keyboard selection.');renderer.domElement.setAttribute('role','img');renderer.domElement.tabIndex=0;el.appendChild(renderer.domElement);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(32,1,.05,200);camera.position.set(0,0,34);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=1.1;controls.maxDistance=75;controls.enablePan=true;controls.target.set(0,0,0);controls.rotateSpeed=.7;
  scene.add(new THREE.HemisphereLight(0xffffff,0x9b9277,2.2));
  const key=new THREE.DirectionalLight(0xfff8ec,3);key.position.set(-8,12,16);scene.add(key);
  const fill=new THREE.DirectionalLight(0xe0efe7,1.7);fill.position.set(9,3,9);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffffff,2);rim.position.set(0,10,-12);scene.add(rim);
  const groups=new Map<SystemId,THREE.Group>(),meshes=new Map<string,Mesh>(),pending=new Map<SystemId,Promise<void>>();
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),down=new THREE.Vector2();let currentHover:Mesh|null=null;
  let tween:{position:THREE.Vector3;target:THREE.Vector3}|null=null;
  const fit=(box:THREE.Box3,dir=new THREE.Vector3(0,0,1))=>{const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const d=Math.max(size.y,size.x/camera.aspect)*.5/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*1.5; tween={position:center.clone().add(dir.normalize().multiplyScalar(Math.max(2,d))),target:center};};
  const reset=()=>{const g=groups.get('skeletal');if(g)fit(new THREE.Box3().setFromObject(g));else {tween={position:new THREE.Vector3(0,0,34),target:new THREE.Vector3()}}};
  const focus=()=>{const m=meshes.get(state.current.selected||'');if(m)fit(new THREE.Box3().setFromObject(m),camera.position.clone().sub(controls.target))};
  const orient=(side:string)=>{const distance=camera.position.distanceTo(controls.target);const direction=side==='back'?new THREE.Vector3(0,0,-1):side==='side'?new THREE.Vector3(1,0,0):new THREE.Vector3(0,0,1);tween={position:controls.target.clone().add(direction.multiplyScalar(distance)),target:controls.target.clone()};};
  const update=()=>{
   const p=state.current;
   const selectedMesh=p.selected?meshes.get(p.selected):undefined;
   const selectedBounds=selectedMesh?.userData.bounds as number[]|undefined;
   const selectedVolume=selectedMesh?.userData.volume as number|undefined;
   for(const [id,group] of groups){group.visible=id===p.system||(!p.isolated&&p.context&&id==='skeletal');}
   for(const [id,mesh]of meshes){const isSelected=id===p.selected;const sys=mesh.userData.system as SystemId;const isContext=sys!==p.system;
    const covering=!!(selectedBounds&&selectedVolume&&!isSelected&&sys===p.system&&overlaps(mesh.userData.bounds as number[],selectedBounds)&&mesh.userData.volume>selectedVolume*1.15);
    mesh.visible=(!p.isolated||isSelected)&&(!isContext||p.context);
    mesh.material.color.set(isSelected?'#4f9780':mesh.userData.color);
    mesh.material.emissive.set(isSelected?'#224e3e':'#000000');mesh.material.emissiveIntensity=isSelected?.2:0;
    mesh.material.opacity=isContext?.12:covering?Math.min(p.opacity/100,.22):p.opacity/100;mesh.material.transparent=mesh.material.opacity<1;mesh.material.depthWrite=mesh.material.opacity>.5;mesh.renderOrder=isContext?0:isSelected?2:1;
   }
  };
  const load=async(id:SystemId)=>{
   if(groups.has(id))return;if(pending.has(id))return pending.get(id);
   const task=(async()=>{const compressed=typeof DecompressionStream!=='undefined';const response=await fetch(`/models/${id}.${compressed?'mesh':'bin'}`,{signal:abort.signal});if(!response.ok)throw new Error('The model could not be loaded. Check the local server and try again.');const buffer=compressed&&response.body?await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():await response.arrayBuffer();if(disposed)return;
    const group=new THREE.Group();group.name=id;
    for(const s of state.current.structures.filter(s=>s.system===id)){
     const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(buffer,s.offset,s.vertices*3),3));geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer,s.indexOffset,s.indices),1));geometry.computeVertexNormals();geometry.computeBoundingSphere();
     const color=id==='organs'?(Object.entries(organColors).find(([key])=>s.name.toLowerCase().includes(key))?.[1]||colors[id]):colors[id];
     const material=new THREE.MeshStandardMaterial({color,roughness:.68,metalness:.03,side:THREE.DoubleSide});const mesh=new THREE.Mesh(geometry,material);mesh.name=s.name;mesh.userData={id:s.id,system:id,color,bounds:s.bounds,volume:volumeOf(s.bounds)};group.add(mesh);meshes.set(s.id,mesh);
    }
    groups.set(id,group);scene.add(group);update();
   })();pending.set(id,task);try{await task}finally{pending.delete(id)}
  };
  api.current={reset,focus,orient,update,load,zoom:n=>{const v=camera.position.clone().sub(controls.target);const d=THREE.MathUtils.clamp(v.length()*n,controls.minDistance,controls.maxDistance);tween={position:controls.target.clone().add(v.setLength(d)),target:controls.target.clone()}}};
  const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()};const ro=new ResizeObserver(resize);ro.observe(el);resize();
  const hit=(event:PointerEvent,selectedId=state.current.selected)=>{const bounds=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);raycaster.setFromCamera(pointer,camera);const objects=Array.from(meshes.values()).filter(m=>m.visible&&m.parent?.visible&&m.userData.system===state.current.system);return pickLayer(raycaster.intersectObjects(objects,false),selectedId)};
  const pointerDown=(e:PointerEvent)=>{down.set(e.clientX,e.clientY);tween=null};
  const pointerUp=(e:PointerEvent)=>{if(down.distanceTo(new THREE.Vector2(e.clientX,e.clientY))>5)return;const m=hit(e);if(m){state.current.onSelect(m.userData.id);const next=hit(e,m.userData.id);currentHover=next||null;setHover(next?.name||'');renderer.domElement.style.cursor=next?'pointer':'grab'}};
  const pointerMove=(e:PointerEvent)=>{if(e.buttons)return;const m=hit(e);if(m!==currentHover){currentHover=m||null;setHover(m?.name||'');renderer.domElement.style.cursor=m?'pointer':'grab'}};
  const leave=()=>{setHover('');currentHover=null};
  const keydown=(e:KeyboardEvent)=>{if(e.key==='+'||e.key==='='){e.preventDefault();api.current?.zoom(.85)}if(e.key==='-'){e.preventDefault();api.current?.zoom(1.15)}if(e.key==='0'){e.preventDefault();reset()}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const v=camera.position.clone().sub(controls.target);v.applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'?.15:-.15);camera.position.copy(controls.target).add(v)} };
  const lost=(e:Event)=>{e.preventDefault();setError('The 3D graphics context was interrupted. Retry to restore the viewer.');setLoading(false)};
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerleave',leave);renderer.domElement.addEventListener('keydown',keydown);renderer.domElement.addEventListener('webglcontextlost',lost);
  const animate=()=>{if(disposed)return;frame=requestAnimationFrame(animate);if(document.hidden)return;if(tween){camera.position.lerp(tween.position,.12);controls.target.lerp(tween.target,.12);if(camera.position.distanceTo(tween.position)<.005)tween=null;}controls.update();
   const label=selectedLabel.current,m=meshes.get(state.current.selected||'');if(label){if(m&&m.parent?.visible&&m.visible&&state.current.labels){const point=new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).project(camera);const x=(point.x*.5+.5)*el.clientWidth,y=(-point.y*.5+.5)*el.clientHeight;label.style.display=point.z<1&&x>30&&x<el.clientWidth-30&&y>100&&y<el.clientHeight-75?'block':'none';label.style.left=`${Math.max(60,Math.min(el.clientWidth-150,x+30))}px`;label.style.top=`${y}px`;}else label.style.display='none';}
   renderer.render(scene,camera);
  };animate();
  setLoading(true);setError('');load('skeletal').then(()=>{if(!disposed){reset();if(state.current.system==='skeletal'){setLoading(false);state.current.onReady('skeletal')}}}).catch(e=>{if(!disposed){setError(e.message);setLoading(false)}});
  return()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);ro.disconnect();controls.dispose();api.current=null;for(const mesh of meshes.values()){mesh.geometry.dispose();mesh.material.dispose()}renderer.dispose();renderer.domElement.remove();};
 },[retry,props.structures]);
 useEffect(()=>{let stale=false;setError('');setLoading(true);api.current?.load(props.system).then(()=>{if(!stale){setLoading(false);api.current?.update();props.onReady(props.system);if(props.isolated)api.current?.focus()}}).catch(e=>{if(!stale&&e.name!=='AbortError'){setLoading(false);setError(e.message)}});return()=>{stale=true}},[props.system,props.structures,retry]);
 useEffect(()=>{api.current?.update();if(props.isolated)api.current?.focus()},[props.selected,props.isolated,props.opacity,props.context]);
 const selected=props.structures.find(s=>s.id===props.selected);
 return <><div ref={container} className="three-viewport" data-testid="three-viewport"/><div ref={selectedLabel} className="anatomy-label" style={{display:'none'}}><span/>{selected?.name}</div>{hover&&!loading&&<div className="hover-label">{hover}</div>}{loading&&!error&&<div className="model-status" role="status"><LoaderCircle className="spin" size={22}/><span>Loading anatomical structures…</span></div>}{error&&<div className="model-error" role="alert"><TriangleAlert/><h3>Let’s restore your view</h3><p>{error}</p><Button onClick={()=>{setError('');setRetry(n=>n+1)}}><RefreshCw/>Retry viewer</Button></div>}</>;
});export default Viewer;
