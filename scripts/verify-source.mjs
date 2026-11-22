// Verify the source delivery, not the working tree: extract, install the
// locked dependencies, run the units and rebuild the identical runtime.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,readdir,rm,stat,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,basename} from 'node:path';
const archive=resolve(process.argv[2]||'../winter-wonderland-source.zip');
const referenceDir=resolve(process.env.WW_REFERENCE_DIST||'dist');
const temp=await mkdtemp(join(tmpdir(),'ww-source-'));
const root=join(temp,'winter-wonderland');
const log=process.env.WW_SOURCE_PROOF||'docs/evidence/source-rebuild.json';
const sha=data=>createHash('sha256').update(data).digest('hex');
const run=(file,args,cwd)=>new Promise((res,rej)=>{
  const proc=spawn(file,args,{cwd,stdio:'inherit'});proc.once('error',rej);proc.once('exit',(code,sig)=>code===0?res():rej(Error(`${file} ${args.join(' ')}: ${code??sig}`)));
});
async function digest(dir,prefix=''){
  const r=[];
  for(const e of await readdir(join(dir,prefix),{withFileTypes:true})){
    const key=prefix+e.name;
    if(e.isDirectory())r.push(...await digest(dir,key+'/'));
    else if(e.isFile())r.push([key,sha(await readFile(join(dir,key)))]);
  }
  return r.sort(([k],[a])=>k<a?-1:k>a?1:0);
}
const p={archive:basename(archive),when:new Date().toISOString(),node:process.version,offlineInstall:process.env.WW_OFFLINE==='1'};
try{
  p.archiveBytes=(await stat(archive)).size;p.archiveSha256=sha(await readFile(archive));
  await run(process.env.PYTHON||'python3',['-c',`from pathlib import PurePosixPath
import sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    assert not z.testzip(), 'Archive CRC validation failed'
    def safe(name):
        p = PurePosixPath(name)
        return len(p.parts)>1 and p.parts[0]=='winter-wonderland' and '..' not in p.parts and chr(92) not in name
    assert all(safe(n) for n in z.namelist()), 'Archive has an unsafe path'
    z.extractall(sys.argv[2])
`,archive,temp],process.cwd());
  await run('npm',['ci','--no-audit','--ignore-scripts',...(p.offlineInstall?['--offline']:[])],root);
  await run('npm',['run','test:unit'],root);p.unitTests=true;
  await run('npm',['run','build'],root);p.compiled=true;
  const expected=await digest(referenceDir),actual=await digest(join(root,'dist'));
  assert.deepEqual(actual,expected,'Source archive produced a different runtime');
  const runtime=createHash('sha256');for(const [key,hash] of actual){runtime.update(key+'\0');runtime.update(Buffer.from(hash,'hex'));}
  p.runtimeSha256=runtime.digest('hex');p.files=actual.length;p.ok=true;
  console.log(`Rebuilt all ${actual.length} runtime files byte for byte (${p.runtimeSha256})`);
}catch(e){p.ok=false;p.failure=String(e);throw e;}
finally{await rm(temp,{recursive:true,force:true});await writeFile(log,JSON.stringify(p,null,2)+'\n');}
