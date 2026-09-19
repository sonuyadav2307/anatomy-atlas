import {spawn} from 'node:child_process';
import {openSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const url='http://127.0.0.1:5173/';
try {const r=await fetch(url,{signal:AbortSignal.timeout(1500)});if(r.ok){console.log(`Anatomy Atlas is already running at ${url}`);process.exit(0)}} catch {}
mkdirSync(new URL('../work',import.meta.url),{recursive:true});
const logPath=fileURLToPath(new URL('../work/local-preview.log',import.meta.url));
const log=openSync(logPath,'a');
const child=spawn(process.execPath,['scripts/run-framework.mjs','dev','--hostname','127.0.0.1'],{cwd:root,detached:true,stdio:['ignore',log,log],env:process.env});
child.unref();writeFileSync(new URL('../work/local-preview.pid',import.meta.url),String(child.pid));
console.log(`Starting Anatomy Atlas at ${url}\nLog: ${logPath}\nPID: ${child.pid}`);
