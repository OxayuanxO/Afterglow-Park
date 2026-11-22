// QA-only route finding over the actual browser collision map.
export function installNavigator(){
    const q=window.parkQA;
    const walk=[
      ['南門',[0,197]],['大道',[.2,150]],['大道',[0,92]],['廣場',[0,20]],['西步道',[-38.5,1]],
      ['草坪',[-75,6]],['草坪',[-108,-40]],['護林人小屋外',[-81,-91]],['觀景台接路',[-133,-109]],['觀景台',[-143,-130]],
      ['隱密花園',[-56,-153]],['古典花園',[9,-136]],['玻璃花房外',[62,-144]],['聖誕市集',[110,-102]],
      ['木玩具工坊外',[111,-142]],['壁爐小屋外',[132,-118]],['溜冰場西入口',[100,8]],
      ['溜冰場',[123,8]],['溜冰場東入口',[172,8]],['林地',[151,60]],['旋轉木馬外',[58,82]],
      ['燈籠林',[110,115]],['樹冠入口',[109,124]],['營火空地',[83,145]],['大道',[0,151]],
      ['池畔小徑',[-65,145]],['池畔小徑',[-122,142]],['湖畔長椅外',[-166,130]],['船屋外',[-178,116]],
      ['原木小屋外',[-160,68]],['湖畔松林',[-103,58]],['大道',[0,104]],['南門',[0,205]]
    ];
    // Local A* over actual capsule-clear terrain. The goal list follows the path
    // network. No place()/travel() calls between checkpoints or around a blockage.
    const dist=Math.hypot;const heapPush=(h,o)=>{let i=h.length;h.push(o);while(i){const j=(i-1)>>1;if(h[j].f<=o.f)break;h[i]=h[j];i=j;h[i]=o;}};
    const heapPop=h=>{const first=h[0],o=h.pop();if(h.length){let i=0;while(i*2+1<h.length){let c=i*2+1;if(h[c+1]&&h[c+1].f<h[c].f)c++;if(h[c].f>=o.f)break;h[i]=h[c];i=c;}h[i]=o;}return first;};
    const nav=(x,z)=>q.nav(x,z);
    function canLine(a,b){const d=dist(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(d/.39));let y=a.y??nav(a.x,a.z).y;
      for(let i=1;i<=n;i++){const f=i/n,x=a.x+(b.x-a.x)*f,z=a.z+(b.z-a.z)*f,v=q.nav(x,z,y);if(!v.clear||Math.abs(v.y-y)>.43)return false;y=v.y;}return true;}
    function plan(a,b){
      if(canLine(a,b))return [b];
      const size=.95,X=x=>Math.round(x/size),Z=z=>Math.round(z/size),tx=X(b.x),tz=Z(b.z),sx=X(a.x),sz=Z(a.z);
      const toWorld=(i,j)=>({x:i*size,z:j*size});const h=[],visited=new Map();const range=50;
      const x0=Math.min(sx,tx)-range,x1=Math.max(sx,tx)+range,z0=Math.min(sz,tz)-range,z1=Math.max(sz,tz)+range;
      for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){const x=sx+i,z=sz+j,v=toWorld(x,z),v2=nav(v.x,v.z);if(!v2.clear||!canLine(a,v))continue;const k=x+':'+z,g=dist(v.x-a.x,v.z-a.z)/size,r={x,z,k,g,y:v2.y,f:g+dist(tx-x,tz-z),p:null};heapPush(h,r);visited.set(k,r);}
      for(let steps=0;h.length&&steps<56000;steps++){
        const u=heapPop(h);if(visited.get(u.k)!==u)continue;const w=toWorld(u.x,u.z);w.y=u.y;
        if(dist(u.x-tx,u.z-tz)<2.5&&canLine(w,b)){
          const pts=[b,w];let prev=u.p;while(prev){const k=toWorld(prev.x,prev.z);k.y=prev.y;pts.push(k);prev=prev.p;}pts.reverse();const out=[];let i=0,here=a;
          while(i<pts.length){let j=Math.min(pts.length-1,i+30);while(j>i&&!canLine(here,pts[j]))j--;out.push(pts[j]);here=pts[j];i=j+1;}
          return out;
        }
        for(const [di,dj] of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
          const x=u.x+di,z=u.z+dj,k=x+':'+z;if(x<x0||x>x1||z<z0||z>z1)continue;
          const g=u.g+(di&&dj?1.414:1);if(g>=(visited.get(k)?.g??Infinity))continue;
          const v=toWorld(x,z),dp=q.nav(v.x,v.z,u.y);if(!dp.clear||Math.abs(dp.y-u.y)>.39||!canLine(w,v))continue;
          const opt={x,z,k,g,y:dp.y,f:g+dist(tx-x,tz-z)*1.035,p:u};visited.set(k,opt);heapPush(h,opt);
        }
      }
      return null;
    }
    window.parkNavigator={walk,dist,plan,canLine};
}
