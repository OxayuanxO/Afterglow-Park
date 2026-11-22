// Exercise the source/module server without leaving an extra preview running.
import {createServer} from 'vite';
import {spawn} from 'node:child_process';
// Keep Vite's normal same-origin WebSocket on the ephemeral HTTP port.
// The client module still attempts a connection if only the socket is disabled.
const vite=await createServer({server:{host:'127.0.0.1',port:0,strictPort:true}});
try{
  await vite.listen();
  const address=vite.httpServer.address();
  if(!address||typeof address==='string')throw Error('Vite did not bind a local TCP port.');
  const target=`http://127.0.0.1:${address.port}/`;
  process.exitCode=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['scripts/smoke.mjs'],{stdio:'inherit',env:{...process.env,PARK_URL:target,TARGET:'dev',BACKEND:'webgl'}});
    child.on('error',reject);child.on('exit',code=>resolve(code??1));
  });
}finally{await vite.close();}
