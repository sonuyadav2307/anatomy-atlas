import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {RAW_MODEL_CHUNK_BYTES,rawModelPaths} from '../lib/anatomy/model-format.mjs';
const manifest=JSON.parse(await readFile(new URL('../public/models/manifest.json',import.meta.url),'utf8'));
const ids=new Set();const expected=['skeletal','muscular','nervous','organs','ligaments'];
assert(!manifest.some(s=>/^(Skeletal system|Muscular system|Nervous system & Sense organs|Visceral systems)\./i.test(s.sourceName)), 'Source title cards must not be included as anatomical structures');
for(const system of expected){
 const entries=manifest.filter(s=>s.system===system);assert(entries.length>0,`${system} has no structures`);
 const expectedBytes=Math.max(...entries.map(s=>s.indexOffset+s.indices*4));
 const chunks=await Promise.all(rawModelPaths(system,expectedBytes).map(name=>readFile(new URL(`../public/models/${name}`,import.meta.url))));
 assert(chunks.every((chunk,i)=>chunk.length===Math.min(RAW_MODEL_CHUNK_BYTES,expectedBytes-i*RAW_MODEL_CHUNK_BYTES)),`${system} fallback chunk size mismatch`);
 const raw=Buffer.concat(chunks);const compressed=await readFile(new URL(`../public/models/${system}.mesh`,import.meta.url));assert(compressed.length<=25*1024*1024,`${system} compressed asset exceeds hosting limit`);assert(raw.equals(gunzipSync(compressed)),`${system} compressed data mismatch`);
 let lastEnd=0,triangles=0;
 for(const s of entries){assert(!ids.has(s.id),`Duplicate ID ${s.id}`);ids.add(s.id);assert(s.name&&s.sourceName,`Missing name or provenance ${s.id}`);assert(s.offset===lastEnd,`Unexpected offset ${s.id}`);assert(s.offset%4===0&&s.indexOffset%4===0,`Unaligned mesh ${s.id}`);assert(s.indexOffset===s.offset+s.vertices*12,`Position length mismatch ${s.id}`);assert(s.indices%3===0,`Incomplete triangle ${s.id}`);lastEnd=s.indexOffset+s.indices*4;assert(lastEnd<=raw.length,`Out-of-range buffer ${s.id}`);
  for(let i=0;i<s.vertices*3;i++){const value=raw.readFloatLE(s.offset+i*4);assert(Number.isFinite(value),`Nonfinite vertex ${s.id}`);const axis=i%3;assert(value>=s.bounds[axis]-.001&&value<=s.bounds[axis+3]+.001,`Invalid bounds ${s.id}`)}
  for(let i=0;i<s.indices;i++)assert(raw.readUInt32LE(s.indexOffset+i*4)<s.vertices,`Invalid index ${s.id}`);
  assert(s.bounds.slice(0,3).every((n,i)=>Number.isFinite(n)&&n<=s.bounds[i+3]),`Invalid box ${s.id}`);triangles+=s.indices/3;
 }
 assert(lastEnd===raw.length,`${system} unexplained bytes`);console.log(`PASS ${system}: ${entries.length} structures, ${triangles.toLocaleString()} triangles, ${(compressed.length/1e6).toFixed(1)} MB compressed`);
}
for(const name of ['Right femur','Left femur','Heart','Right sciatic nerve','Left sciatic nerve','White matter of spinal cord','Right long plantar ligament'])assert(manifest.some(s=>s.name===name),`Missing essential structure: ${name}`);
console.log(`PASS ${manifest.length} unique labeled structures; complete bounds, buffers, indices, compression, and source provenance.`);
