// Fingerprint the dev server's inputs without folding in output reports.
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
const readDir=async dir=>{
  const all=await readdir(dir,{withFileTypes:true});
  return (await Promise.all(all.map(ent=>ent.isDirectory()?readDir(`${dir}/${ent.name}`):[`${dir}/${ent.name}`]))).flat();
};
export async function sourceDigest(){
  const files=['index.html','package.json','package-lock.json','vite.config.js',...await readDir('src'),...await readDir('public')].sort();
  const h=createHash('sha256');
  for(const f of files){h.update(f+'\0');h.update(createHash('sha256').update(await readFile(f)).digest());}
  return h.digest('hex');
}
