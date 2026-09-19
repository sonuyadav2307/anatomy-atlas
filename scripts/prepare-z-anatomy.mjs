/** Extract labeled, indexed meshes from licensed Z-Anatomy GLBs.
 * Bakes each node's world transform, then changes meters to viewer units.
 * Keeps source names and provenance; never invents missing geometry.
 */
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import {Matrix4,Vector3} from 'three';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {writeModelFiles} from './write-model-files.mjs';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco.createDecoderModule()});
const old=JSON.parse(await readFile('public/models/manifest.json','utf8'));const oldByName=new Map(old.map(s=>[s.name.toLowerCase(),s]));
const systems={skeletal:[],muscular:[],nervous:[],organs:[],ligaments:[]};
const clean=(name)=>{const side=/\.r(?:\.|$)/.test(name)?'Right ':/\.l(?:\.|$)/.test(name)?'Left ':'';name=name.replace(/\.(r|l|j|i|s)(?=\.|$)/g,'').replace(/\.\d+$/,'').replace(/_/g,' ').trim();if(side)name=side+name[0].toLowerCase()+name.slice(1);return name;};
function geometry(node){const pos=[],index=[],matrix=new Matrix4().fromArray(node.getWorldMatrix()),point=new Vector3();for(const primitive of node.getMesh().listPrimitives()){
 const a=primitive.getAttribute('POSITION'),offset=pos.length/3;for(let i=0;i<a.getCount();i++){const v=a.getElement(i,[]);point.set(...v).applyMatrix4(matrix);pos.push(point.x*10,point.y*10-8.5,point.z*10);}
 const ids=primitive.getIndices()?.getArray()||Array.from({length:a.getCount()},(_,i)=>i);for(let i=0;i<ids.length;i+=3){if(matrix.determinant()<0)index.push(ids[i]+offset,ids[i+2]+offset,ids[i+1]+offset);else index.push(ids[i]+offset,ids[i+1]+offset,ids[i+2]+offset)}
 }return{pos,index};}
const taken=new Set();
function add(node,system,source){let name=clean(node.getName());if(taken.has(system+name))return;taken.add(system+name);const g=geometry(node),legacy=oldByName.get(name.toLowerCase());const id=legacy?.system===system?legacy.id:'Z_'+system+'_'+name.toLowerCase().replace(/[^a-z0-9]+/g,'_');const bounds=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];for(let i=0;i<g.pos.length;i++){const a=i%3;bounds[a]=Math.min(bounds[a],g.pos[i]);bounds[a+3]=Math.max(bounds[a+3],g.pos[i]);}systems[system].push({id,name,system,fma:legacy?.fma||'',source:'Z-Anatomy / BodyParts3D',sourceFile:source,sourceName:node.getName(),center:[0,1,2].map(i=>(bounds[i]+bounds[i+3])/2),bounds,...g});}
for(const [file,system] of [['skeleton','skeletal'],['muscular','muscular'],['nervous','nervous'],['visceral','organs']]){
 const doc=await io.read(`work/${file}.glb`);for(const n of doc.getRoot().listNodes()){if(!n.getMesh())continue;const name=n.getName();
 // Source title cards are text geometry, not anatomical structures.
 if(/^(Skeletal system|Muscular system|Nervous system & Sense organs|Visceral systems)\./i.test(name))continue;
 if(system==='skeletal'&&/sinus|cavity|foramen|impression|facet|insertion/i.test(name))continue;
 if(system==='muscular'&&/insertion|^Plane|^Cube|^Sphere/i.test(name))continue;
 if(system==='nervous'&&/suspensory ligament/i.test(name))continue;
 // Sulci, ventricles, and coverings are legitimate CNS landmarks and retain exact names.
 if(system==='organs'&&/penis|testi|epididym|prostat|seminal|deferens|scrot/i.test(name))continue;
 add(n,system,file+'.glb');
 }
}
// Keep only actual ligament meshes, excluding attachment-site patches and eyeball suspensory tissue.
const ligDoc=await io.read('work/z-anatomy.glb');for(const n of ligDoc.getRoot().listNodes()){if(!n.getMesh()||!/ligament/i.test(n.getName()))continue;const path=n.getExtras().anatomy_collection_path||'';if(/insertions/i.test(path)||/suspensory ligament of eyeball/i.test(n.getName()))continue;add(n,'ligaments','z-anatomy.glb');}
// A coherent heart outer-wall composite, preserving all transforms.
const cardio=await io.read('work/cardiovascular.glb');
const cardiac=cardio.getRoot().listNodes().filter(n=>n.getMesh()&&/^(Right|Left) (atrium|ventricle)|^Heart|^Myocardium|^Interventricular septum|^Interatrial septum|^Atrium|^Ventricle of heart/i.test(clean(n.getName())));
console.log('Heart components',cardiac.map(n=>n.getName()));
if(cardiac.length){const parts=cardiac.map(geometry),pos=[],index=[];for(const p of parts){const o=pos.length/3;for(const i of p.index)index.push(i+o);for(const v of p.pos)pos.push(v)}const bounds=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];for(let i=0;i<pos.length;i++){const a=i%3;bounds[a]=Math.min(bounds[a],pos[i]);bounds[a+3]=Math.max(bounds[a+3],pos[i]);}systems.organs.push({id:'FMA7088',name:'Heart',fma:'FMA7088',system:'organs',source:'Z-Anatomy / BodyParts3D',sourceFile:'cardiovascular.glb',sourceName:cardiac.map(n=>n.getName()).join('; '),center:[0,1,2].map(i=>(bounds[i]+bounds[i+3])/2),bounds,pos,index});}
const manifest=[];await mkdir('public/models',{recursive:true});
for(const [system,items]of Object.entries(systems)){
 let offset=0;const chunks=[];for(const s of items){const p=Buffer.from(new Float32Array(s.pos).buffer),i=Buffer.from(new Uint32Array(s.index).buffer);s.offset=offset;s.vertices=s.pos.length/3;chunks.push(p);offset+=p.length;s.indexOffset=offset;s.indices=s.index.length;chunks.push(i);offset+=i.length;delete s.pos;delete s.index;manifest.push(s);}
 const data=Buffer.concat(chunks);await writeModelFiles(system,data);console.log(system,items.length,'structures',Math.round(data.length/1e6*100)/100,'MB raw;',Math.round(gzipSync(data).length/1e6*100)/100,'MB gzip');
}
await writeFile('public/models/manifest.json',JSON.stringify(manifest));
console.log('TOTAL',manifest.length);
