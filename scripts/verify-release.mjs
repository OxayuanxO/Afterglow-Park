// Test the actual playable archive over a nested HTTP path with no SPA fallback.
// Python handles ZIP integrity; Node holds the local HTTP listener until the
// browser check ends, then closes it and removes the temporary extraction.
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {mkdtemp,mkdir,readFile,readdir,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const archive=path.resolve(process.argv[2]||'../winter-wonderland-playable.zip');
const work=await mkdtemp(path.join(tmpdir(),'ww-archive-'));
const prefix='parks/winter/',root=path.join(work,prefix);
const run=(bin,args,options={})=>new Promise((resolve,reject)=>{
  const p=spawn(bin,args,{stdio:'inherit',...options});p.once('error',reject);
  p.once('exit',(code,signal)=>code===0?resolve():reject(Error(`${bin}: ${code??signal}`)));
});
const mime={'.html':'text/html; charset=utf-8','.md':'text/plain; charset=utf-8','.json':'application/json','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'};
let server;
try{
  const bytes=await readFile(archive),sha256=createHash('sha256').update(bytes).digest('hex');
  await mkdir(root,{recursive:true});
  const python=process.env.PYTHON||'python3';
  await run(python,['-c',`import sys, zipfile
from pathlib import PurePosixPath
with zipfile.ZipFile(sys.argv[1]) as z:
    assert not z.testzip(), 'Archive CRC validation failed'
    def safe(name):
        p = PurePosixPath(name)
        return not p.is_absolute() and '..' not in p.parts and chr(92) not in name
    assert all(safe(n) for n in z.namelist()), 'Archive has an unsafe path'
    assert 'index.html' in z.namelist(), 'Missing playable index'
    z.extractall(sys.argv[2])
`,archive,root]);
  const gather=async dir=>{
    const parts=await readdir(dir,{withFileTypes:true});const found=[];
    for(const p of parts){const f=path.join(dir,p.name);found.push(...(p.isDirectory()?await gather(f):[path.relative(root,f).split(path.sep).join('/')]));}
    return found;
  };
  const files=(await gather(root)).filter(f=>!f.startsWith('docs/')&&!['README.md','CREDITS.md','START_HERE.md'].includes(f)).sort();
  const runtime=createHash('sha256');
  for(const f of files){runtime.update(f+'\0');runtime.update(createHash('sha256').update(await readFile(path.join(root,f))).digest());}
  const payloadSha256=runtime.digest('hex');
  server=createServer(async(req,res)=>{
    try{
      const url=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      const target=path.resolve(work,'.'+(url.endsWith('/')?url+'index.html':url));
      if(!target.startsWith(root)||!['GET','HEAD'].includes(req.method))throw Error('Not a playable asset');
      const meta=await stat(target);if(!meta.isFile())throw Error('Not a file');
      res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Content-Length':meta.size,'Cache-Control':'no-store'});
      if(req.method==='HEAD')res.end();else createReadStream(target).on('error',()=>res.destroy()).pipe(res);
    }catch{res.writeHead(404).end('Not Found');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  await run(process.execPath,['scripts/archive-check.mjs'],{env:{...process.env,BACKEND:'webgl',PARK_URL:`http://127.0.0.1:${server.address().port}/${prefix}`,PARK_ARCHIVE_NAME:path.basename(archive),PARK_ARCHIVE_SHA256:sha256,PARK_RUNTIME_SHA256:payloadSha256}});
  console.log(`Archive passes the nested HTTP test: ${path.basename(archive)} (${bytes.length} bytes, ${sha256})`);
}finally{
  if(server){server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));}
  await rm(work,{recursive:true,force:true});
}
