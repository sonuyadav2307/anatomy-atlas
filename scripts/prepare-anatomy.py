"""Build a local, indexed mesh library from the official BodyParts3D 4.0 archive.
Run from the project root after downloading inputs to work/ (see README).
Geometry is only transformed from millimeters/Z-up to centered scene units/Y-up.
"""
import csv, collections, json, re, struct, zipfile, pathlib, hashlib
root=pathlib.Path(__file__).resolve().parent.parent
maps={}
for namespace, filename in [('isa','elements.tsv'),('partof','partof-elements.tsv')]:
 data=collections.defaultdict(set)
 for row in list(csv.reader(open(root/'work'/filename), delimiter='\t'))[1:]:
  if len(row)>2:data[row[0]].add(row[2])
 maps[namespace]=data
archives={key:zipfile.ZipFile(root/'work'/filename) for key,filename in [('isa','bodyparts.zip'),('partof','bodyparts-partof.zip')]}
filemaps={key:{pathlib.PurePosixPath(n).stem:n for n in z.namelist() if n.endswith('.obj')} for key,z in archives.items()}
def read(fj,namespace):
 text=archives[namespace].read(filemaps[namespace][fj]).decode();v=[];tri=[]
 for line in text.splitlines():
  if line.startswith('v '):
   a=list(map(float,line.split()[1:4]));v.append([a[0]/100,(a[2]-800)/100,(-a[1]-90)/100])
  elif line.startswith('f '):
   face=[int(s.split('/')[0])-1 for s in line.split()[1:]]
   for j in range(1,len(face)-1):tri.extend([face[0],face[j],face[j+1]])
 match=re.search(r'# English name : (.+)',text);name=match.group(1).strip() if match else fj
 fma=re.search(r'# Concept ID : (.+)',text)
 return v,tri,name,fma.group(1).strip() if fma else ''
cache={}
def get(fj,namespace='isa'):
 key=(namespace,fj)
 if key not in cache:cache[key]=read(fj,namespace)
 return cache[key]
items=[]
def individual(fjs,system,namespace='isa'):
 for fj in sorted(fjs):
  if fj not in filemaps[namespace]:continue
  vs,ids,name,fma=get(fj,namespace)
  if system=='nervous' and any(s in name.lower() for s in ['ventricle','aqueduct','central canal']):continue
  if system=='ligaments' and 'ligament' not in name.lower():continue
  items.append(dict(id=('P_' if namespace=='partof' else '')+fj,system=system,name=name[0].upper()+name[1:],fma=fma,v=vs,i=ids))
individual(maps['isa']['FMA5018'],'skeletal')
individual(maps['isa']['FMA5022'],'muscular')
individual(maps['partof']['FMA7157'],'nervous','partof')
individual(maps['isa']['FMA5913']|maps['isa']['FMA52570'],'nervous')
individual(maps['isa']['FMA21496'],'ligaments')
# Major organs: preserve their source spatial relationships and identify each organ as a single structure.
organs=[('FMA7088','Heart'),('FMA7309','Right lung'),('FMA7310','Left lung'),('FMA7197','Liver'),('FMA7148','Stomach'),('FMA7204','Right kidney'),('FMA7205','Left kidney'),('FMA7198','Pancreas'),('FMA7196','Spleen'),('FMA7200','Small intestine'),('FMA7201','Large intestine'),('FMA15900','Urinary bladder'),('FMA7394','Trachea'),('FMA7131','Esophagus'),('FMA7202','Gallbladder')]
for fma,name in organs:
 vs=[];indices=[]
 namespace='partof' if maps['partof'][fma] else 'isa'
 for fj in sorted(maps[namespace][fma]):
  if fj not in filemaps[namespace]:continue
  v,i,_,_=get(fj,namespace);indices.extend(idx+len(vs) for idx in i);vs.extend(v)
 if vs:items.append(dict(id=fma,system='organs',name=name,fma=fma,v=vs,i=indices))
output=root/'public/models';output.mkdir(exist_ok=True,parents=True)
manifest=[]
for system in ['skeletal','muscular','nervous','organs','ligaments']:
 data=bytearray()
 for item in [s for s in items if s['system']==system]:
  vs=item.pop('v');indices=item.pop('i');flat=[n for v in vs for n in v]
  lo=[min(v[a] for v in vs) for a in range(3)];hi=[max(v[a] for v in vs) for a in range(3)]
  item.update(center=[round((a+b)/2,4) for a,b in zip(lo,hi)],bounds=[round(n,4) for n in lo+hi],offset=len(data),vertices=len(vs))
  data.extend(struct.pack('<%sf'%len(flat),*flat));item.update(indexOffset=len(data),indices=len(indices));data.extend(struct.pack('<%sI'%len(indices),*indices));manifest.append(item)
 (output/f'{system}.bin').write_bytes(data)
 print(system,len([x for x in manifest if x['system']==system]),'meshes',round(len(data)/1e6,2),'MB')
(output/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')))
(root/'work/anatomy-checksums.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in output.iterdir()},indent=2))
print('Total structures:',len(manifest));print('Source license: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html')
