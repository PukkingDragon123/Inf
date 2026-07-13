/* ============================================================
   INFINITE CHOCO.CO
   You rent a tiny run-down shop with a knife, a board and a
   block of chocolate. Cut by hand, cook it in a pot, fill the
   order notes, and grow from there.
   ============================================================ */
'use strict';

/* ---------- utils ---------- */
const clamp = (v,a,b)=>v<a?a:(v>b?b:v);
const lerp = (a,b,t)=>a+(b-a)*t;
const rnd = (a=1,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
const rndi = (a,b)=>Math.floor(rnd(a,b+1));
const dist = (ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const easeOut = t=>1-Math.pow(1-t,3);
const easeIO = t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
function fmt(n){ n=Math.floor(n); if(n<1000)return''+n; const u=['K','M','B','T'];let x=n,i=-1;while(x>=1000&&i<u.length-1){x/=1000;i++;}return (x>=100?Math.floor(x):x.toFixed(1).replace(/\.0$/,''))+u[i]; }

/* ---------- audio (tiny WebAudio synth, no assets) ---------- */
const Snd={ac:null,vol:.3,
  init(){ if(this.ac)return; try{ this.ac=new (window.AudioContext||window.webkitAudioContext)(); this.master=this.ac.createGain(); this.master.gain.value=this.vol; this.master.connect(this.ac.destination);}catch(e){} },
  resume(){ if(this.ac&&this.ac.state==='suspended')this.ac.resume(); },
  tone(f,d,type='sine',vol=1,slide=0,delay=0){ if(!this.ac||S.muted)return; const t0=this.ac.currentTime+delay; const o=this.ac.createOscillator(),g=this.ac.createGain(); o.type=type;o.frequency.setValueAtTime(f,t0); if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t0+d); g.gain.setValueAtTime(vol*.5,t0); g.gain.exponentialRampToValueAtTime(.001,t0+d); o.connect(g);g.connect(this.master);o.start(t0);o.stop(t0+d+.02); },
  noise(d,vol=1,freq=1200,delay=0){ if(!this.ac||S.muted)return; const t0=this.ac.currentTime+delay,len=Math.max(1,(d*this.ac.sampleRate)|0); const buf=this.ac.createBuffer(1,len,this.ac.sampleRate),dt=buf.getChannelData(0); for(let i=0;i<len;i++)dt[i]=Math.random()*2-1; const s=this.ac.createBufferSource();s.buffer=buf; const f=this.ac.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=.7; const g=this.ac.createGain();g.gain.setValueAtTime(vol*.4,t0);g.gain.exponentialRampToValueAtTime(.001,t0+d); s.connect(f);f.connect(g);g.connect(this.master);s.start(t0); }
};
const sfx={
  chop:()=>{Snd.noise(.05,.6,1400);Snd.tone(200,.08,'square',.4,-90);},
  plop:()=>Snd.tone(320,.12,'sine',.7,260),
  grab:()=>Snd.tone(500,.05,'sine',.4),
  drop:()=>Snd.tone(240,.1,'sine',.5,120),
  bubble:()=>{for(let i=0;i<3;i++)Snd.tone(rnd(180,400),.09,'sine',.3,80,i*.06);},
  pour:()=>{Snd.noise(.4,.4,500);Snd.tone(180,.4,'sine',.4,120);},
  coin:()=>{Snd.tone(988,.06,'square',.5);Snd.tone(1319,.14,'square',.5,0,.06);},
  ding:()=>Snd.tone(1568,.25,'triangle',.5),
  click:()=>Snd.tone(680,.04,'sine',.4),
  buy:()=>[523,659,784].forEach((f,i)=>Snd.tone(f,.1,'triangle',.4,0,i*.06)),
  fanfare:()=>[523,659,784,1046].forEach((f,i)=>Snd.tone(f,.14,'square',.45,0,i*.09)),
  nope:()=>Snd.tone(160,.12,'square',.4,-40),
  click2:()=>Snd.tone(880,.05,'square',.35,0,.02)
};

/* ============================================================
   DATA
   ============================================================ */
const FLAVORS={
  milk:   {name:'Milk',    mult:1,   base:'#8a5a2b',light:'#c08a4e',dark:'#5c3317',price:0},
  dark:   {name:'Dark',    mult:1.9, base:'#4d2e17',light:'#7a4d2a',dark:'#2f1a0b',price:120},
  white:  {name:'White',   mult:3,   base:'#e6cfa0',light:'#f7ecd2',dark:'#c2a878',price:450},
  ruby:   {name:'Ruby',    mult:5,   base:'#d4708c',light:'#eb9cb2',dark:'#a84e68',price:1600},
  mint:   {name:'Mint',    mult:9,   base:'#79d3b4',light:'#a6ecd2',dark:'#4a9c7d',price:6000},
  gold:   {name:'Gold',    mult:20,  base:'#e9c04a',light:'#ffe08a',dark:'#b58a1e',price:22000}
};
const FLAV_ORDER=['milk','dark','white','ruby','mint','gold'];

const KNIVES=[
  {id:'rusty',  name:'Rusty Knife',   price:0,    shave:1, cd:0.30, desc:'The one that came with the shop. 1 piece per swipe.'},
  {id:'chef',   name:"Chef's Knife",  price:90,   shave:1, cd:0.18, desc:'Sharper & faster — quicker swipes.'},
  {id:'cleaver',name:'Big Cleaver',   price:600,  shave:2, cd:0.16, desc:'Shaves 2 pieces every swipe.'},
  {id:'gold',   name:'Golden Blade',  price:5000, shave:3, cd:0.12, desc:'3 pieces per swipe, buttery smooth.'}
];
const GEAR=[
  {id:'pot2', name:'Bigger Pot',  price:250,  desc:'Pot holds 9 pieces (was 6).', apply:g=>g.potCap=9},
  {id:'pot3', name:'Cauldron',    price:1400, desc:'Pot holds 12 pieces.', apply:g=>g.potCap=12, needs:'pot2'},
  {id:'boil2',name:'Turbo Burner',price:400,  desc:'Chocolate melts 70% faster.', apply:g=>g.boil=1.7},
  {id:'boil3',name:'Plasma Burner',price:3000,desc:'Melts 3× faster.', apply:g=>g.boil=3, needs:'boil2'},
];
const EMPLOYEES=[
  {id:'cutter', name:'Pippa',  emoji:'🐭', role:'Cutter', price:800,  desc:'Chops a fresh piece every few seconds so the board is never empty.'},
  {id:'cook',   name:'Cocoa',  emoji:'🐻', role:'Cook',   price:2500, desc:'Loads the pot, cranks the burner and pours bars automatically.'},
  {id:'runner', name:'Nadia',  emoji:'🦊', role:'Runner', price:6000, desc:'Delivers finished orders the moment they are ready.'}
];

/* ============================================================
   STATE + SAVE
   ============================================================ */
const SAVE_KEY='infchoco.co.v1';
function defaultState(){
  return{
    money:0, ordersDone:0, rep:1,
    flavors:['milk'], knife:'rusty',
    gear:{potCap:6, boil:1}, gearOwned:[],
    emp:{cutter:false,cook:false,runner:false},
    potFlavor:'milk',
    tray:{bars:{}},
    order:null,
    muted:false, seenIntro:false, won:false,
    last:Date.now()
  };
}
let S=defaultState();
let resetting=false;

function save(){ if(resetting)return; try{ S.last=Date.now(); localStorage.setItem(SAVE_KEY,JSON.stringify(S)); const n=document.getElementById('save-note'); if(n){n.textContent='● saved';setTimeout(()=>n.textContent='',1000);} }catch(e){} }
function load(){ try{ const raw=localStorage.getItem(SAVE_KEY); if(!raw)return false; const d=JSON.parse(raw),def=defaultState(); for(const k in def){ if(d[k]===undefined)continue; if(typeof def[k]==='object'&&def[k]&&!Array.isArray(def[k])) S[k]=Object.assign({},def[k],d[k]); else S[k]=d[k]; }
  if(!Array.isArray(S.flavors)||!S.flavors.includes('milk'))S.flavors=['milk'];
  S.flavors=S.flavors.filter(f=>FLAVORS[f]);
  if(!FLAVORS[S.potFlavor]||!S.flavors.includes(S.potFlavor))S.potFlavor='milk';
  if(!KNIVES.find(k=>k.id===S.knife))S.knife='rusty';
  S.money=+S.money||0; S.ordersDone=+S.ordersDone||0; S.rep=clamp(+S.rep||1,1,5);
  if(!S.tray||typeof S.tray!=='object')S.tray={bars:{}};
  if(!S.tray.bars)S.tray.bars={};
  return true; }catch(e){return false;} }

const knife=()=>KNIVES.find(k=>k.id===S.knife)||KNIVES[0];
const barsOf=f=>S.tray.bars[f]||0;

/* ============================================================
   ORDERS
   ============================================================ */
function itemValue(it){ return it.type==='piece'?5:Math.round(16*FLAVORS[it.flavor].mult); }
function makeOrder(){
  const n=S.ordersDone;
  let items;
  if(n===0) items=[{type:'piece',flavor:'milk',qty:2}];
  else if(n===1) items=[{type:'piece',flavor:'milk',qty:4}];
  else if(n===2) items=[{type:'bar',flavor:'milk',qty:1}];
  else if(n===3) items=[{type:'piece',flavor:'milk',qty:3},{type:'bar',flavor:'milk',qty:1}];
  else{
    items=[];
    const kinds=rndi(1,2);
    for(let i=0;i<kinds;i++){
      const wantBar=Math.random()<0.6;
      if(wantBar){ const fl=S.flavors[rndi(0,S.flavors.length-1)]; items.push({type:'bar',flavor:fl,qty:rndi(1,Math.min(4,2+Math.floor(n/6)))}); }
      else items.push({type:'piece',flavor:'milk',qty:rndi(3,Math.min(10,4+Math.floor(n/4)))});
    }
    // merge dup bar flavors
    const seen={}; items=items.filter(it=>{ const k=it.type+it.flavor; if(seen[k]){seen[k].qty+=it.qty;return false;} seen[k]=it; return true; });
  }
  let reward=0; items.forEach(it=>reward+=itemValue(it)*it.qty);
  reward=Math.round(reward*(1+n*0.05)*rnd(1.1,1.35));
  S.order={items:items.map(it=>({...it})), reward};
}
function loosePieceCount(){ let c=0; for(const p of pieces) if(!p.inPot&&p.state!=='fly'&&p.state!=='pot') c++; return c; }
function orderProgress(){
  if(!S.order)return{done:false,lines:[]};
  let all=true; const lines=[];
  for(const it of S.order.items){
    const have=it.type==='piece'?loosePieceCount():barsOf(it.flavor);
    const ok=have>=it.qty; if(!ok)all=false;
    lines.push({it,have:Math.min(have,it.qty),ok});
  }
  return{done:all,lines};
}
function deliver(){
  const pr=orderProgress(); if(!pr.done){sfx.nope();return;}
  // consume
  for(const it of S.order.items){
    if(it.type==='bar') S.tray.bars[it.flavor]=barsOf(it.flavor)-it.qty;
    else {
      let need=it.qty;
      // fly loose pieces to the note
      for(const p of pieces){ if(need<=0)break; if(!p.inPot&&p.state!=='fly'&&p.state!=='pot'){ p.state='fly'; p.ft=0; need--; } }
    }
  }
  const rw=S.order.reward;
  S.money+=rw; S.ordersDone++;
  S.rep=clamp(1+Math.floor(S.ordersDone/4),1,5);
  sfx.coin(); sfx.ding();
  popStat('stat-money'); popStat('stat-orders');
  ktoast('Order complete!  +$'+fmt(rw),true);
  coinBurst();
  if(!S.won && S.money>=100000){ S.won=true; setTimeout(()=>showOverlay('🏆','Franchise Time!','You turned a run-down shop into a <b>$100,000</b> chocolate legend. The block is still infinite. Keep going forever, boss.','Keep cooking'),400); }
  makeOrder();
  save(); syncHUD(); renderOrder();
}

/* ============================================================
   KITCHEN — canvas, physics, cutting, cooking
   ============================================================ */
const W=900,H=560;
const cv=document.getElementById('kitchen');
const ctx=cv.getContext('2d');
const FLOOR=402, WALL_L=46, WALL_R=524;
const BOARD={x:66,y:250,w:300,h:26};
const BLOCK={x:96,y:196,w:206,h:80};              // infinite chocolate slab
const CUTX=BLOCK.x+BLOCK.w;                         // right edge = cut line
const STOVE={x:560,y:300,w:308,h:150};
const POT={cx:690,cy:322,rx:80,ry:26,bot:412};
const KNOB={cx:812,cy:474,r:26};
const PER_BAR=3;

let tool='knife';   // 'knife' | 'hand'
const pieces=[];    // physics chocolate pieces
const pot={pieces:0, heat:0, temp:0, melt:0, flav:'milk'};
const fx=[];        // transient particles (crumbs, bubbles, steam, splash, coins)
let nowT=0, shakeT=0, shakeMag=0;

/* pointer */
const ptr={x:0,y:0,down:false,px:0,py:0,vx:0,vy:0,grab:null,path:[]};
let shaveCD=0;

function shake(m,d){shakeMag=m;shakeT=d;}

function mkPiece(x,y,vx,vy){
  pieces.push({x,y,vx,vy,r:16,rot:rnd(-.3,.3),vr:rnd(-4,4),state:'live',inPot:false,ft:0,squish:0});
  if(pieces.length>26){ // keep the board from overflowing: remove oldest settled
    const i=pieces.findIndex(p=>p.state==='live'&&!p.inPot); if(i>=0)pieces.splice(i,1);
  }
}
function shave(count){
  for(let i=0;i<count;i++){
    if(loosePieceCount()>=18){ ktoast('Board is full — cook or deliver!'); return; }
    mkPiece(CUTX+8, BLOCK.y+rnd(14,BLOCK.h-8), rnd(120,240), -rnd(120,240));
  }
  sfx.chop(); shake(4,.12);
  for(let i=0;i<7;i++) fx.push({type:'crumb',x:CUTX+rnd(-4,6),y:BLOCK.y+rnd(6,BLOCK.h),vx:rnd(40,180),vy:-rnd(40,220),g:900,t:0,life:rnd(.4,.8),c:Math.random()<.5?'#5c3317':'#8a5a2b',s:rndi(2,4)});
}

/* physics */
function stepPhysics(dt){
  for(let i=pieces.length-1;i>=0;i--){
    const p=pieces[i];
    if(p.squish>0)p.squish=Math.max(0,p.squish-dt*4);
    if(p.state==='fly'){ // flying to the order note
      p.ft+=dt*2.2; const tx=cv.getBoundingClientRect?820:820;
      p.x=lerp(p.x,806,easeIO(Math.min(1,p.ft))); p.y=lerp(p.y,60,easeIO(Math.min(1,p.ft)));
      if(p.ft>=1){ pieces.splice(i,1); } continue;
    }
    if(p.state==='pot'){ // sucked into pot
      p.ft+=dt*3; p.x=lerp(p.x,POT.cx,easeIO(Math.min(1,p.ft))); p.y=lerp(p.y,POT.cy,easeIO(Math.min(1,p.ft)));
      if(p.ft>=1){ pot.pieces++; sfx.plop(); splash(); pieces.splice(i,1); } continue;
    }
    if(p===ptr.grab)continue; // dragged pieces handled by pointer
    p.vy+=1500*dt;
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.rot+=p.vr*dt;
    // walls
    if(p.x<WALL_L+p.r){p.x=WALL_L+p.r;p.vx=Math.abs(p.vx)*.45;}
    if(p.x>WALL_R-p.r){p.x=WALL_R-p.r;p.vx=-Math.abs(p.vx)*.45;}
    // floor
    if(p.y>FLOOR-p.r){ p.y=FLOOR-p.r; if(p.vy>60){p.squish=Math.min(1,p.vy/700);} p.vy*=-.32; p.vx*=.7; p.vr*=.6; if(Math.abs(p.vy)<40)p.vy=0; }
    p.vx*=(1-1.6*dt); p.vr*=(1-1.2*dt);
  }
  // simple separation so pieces pile instead of overlapping
  for(let a=0;a<pieces.length;a++)for(let b=a+1;b<pieces.length;b++){
    const p=pieces[a],q=pieces[b]; if(p.inPot||q.inPot||p.state!=='live'||q.state!=='live')continue;
    const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||.01,min=p.r+q.r-2;
    if(d<min){ const push=(min-d)/2,nx=dx/d,ny=dy/d; if(p!==ptr.grab){p.x-=nx*push;p.y-=ny*push;} if(q!==ptr.grab){q.x+=nx*push;q.y+=ny*push;} }
  }
}

/* cooking */
function stepCook(dt){
  const target=pot.heat/3;
  pot.temp+=(target-pot.temp)*Math.min(1,dt*0.9);
  const boiling=pot.temp>0.45 && pot.pieces>0;
  if(boiling){ pot.melt=clamp(pot.melt+dt*0.22*S.gear.boil*(pot.temp),0,1); if(Math.random()<dt*7*pot.temp)fx.push({type:'bub',x:POT.cx+rnd(-POT.rx*.6,POT.rx*.6),y:POT.cy+rnd(-4,6),t:0,life:rnd(.4,.8),r:rnd(2,5)}); if(Math.random()<dt*2)sfxBubbleThrottle(); }
  else pot.melt=Math.max(0,pot.melt-dt*0.05);
  if(pot.temp>0.3 && Math.random()<dt*4){ fx.push({type:'steam',x:POT.cx+rnd(-30,30),y:POT.cy-6,vx:rnd(-10,10),vy:-rnd(20,40),t:0,life:rnd(1,1.8),r:rnd(5,10)}); }
}
let _bubT=0; function sfxBubbleThrottle(){ if(nowT-_bubT>.5){_bubT=nowT;sfx.bubble();} }
function canPour(){ return pot.melt>=0.98 && pot.pieces>=PER_BAR; }
function pour(){
  if(!canPour()){sfx.nope();return;}
  const bars=Math.floor(pot.pieces/PER_BAR);
  S.tray.bars[pot.flav]=barsOf(pot.flav)+bars;
  pot.pieces=0; pot.melt=0;
  sfx.pour(); shake(3,.2);
  for(let i=0;i<16;i++)fx.push({type:'crumb',x:POT.cx+rnd(-40,40),y:POT.cy,vx:rnd(-120,120),vy:-rnd(60,200),g:800,t:0,life:rnd(.4,.9),c:FLAVORS[pot.flav].base,s:rndi(2,4)});
  ktoast('Poured '+bars+' '+FLAVORS[pot.flav].name+' bar'+(bars>1?'s':'')+'!',true);
  syncTray(); renderOrder(); save();
}
function splash(){ for(let i=0;i<6;i++)fx.push({type:'crumb',x:POT.cx+rnd(-20,20),y:POT.cy,vx:rnd(-80,80),vy:-rnd(40,140),g:800,t:0,life:rnd(.3,.6),c:FLAVORS[pot.flav].light,s:2}); }
function coinBurst(){ for(let i=0;i<14;i++)fx.push({type:'coin',x:806+rnd(-10,10),y:64,vx:rnd(-120,120),vy:rnd(40,180),g:600,t:0,life:rnd(.6,1),delay:i*.03}); }

function stepFx(dt){
  if(shakeT>0)shakeT-=dt;
  for(let i=fx.length-1;i>=0;i--){ const f=fx[i]; if(f.delay&&f.delay>0){f.delay-=dt;continue;} f.t+=dt; if(f.t>=f.life){fx.splice(i,1);continue;} if(f.type==='bub'){f.y-=18*dt;} else if(f.type==='steam'){f.x+=f.vx*dt;f.y+=f.vy*dt;} else {f.vy+=(f.g||0)*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;} }
}

/* ---------- kitchen input ---------- */
function canvasPos(e){ const r=cv.getBoundingClientRect(); return{x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)}; }
function pieceAt(x,y){ for(let i=pieces.length-1;i>=0;i--){const p=pieces[i]; if(p.inPot||p.state!=='live')continue; if(dist(x,y,p.x,p.y)<p.r+4)return p;} return null; }
function overPot(x,y){ return ((x-POT.cx)*(x-POT.cx))/(POT.rx*POT.rx)+((y-POT.cy)*(y-POT.cy))/((POT.ry+30)*(POT.ry+30))<=1.4; }
function inKnob(x,y){ return dist(x,y,KNOB.cx,KNOB.cy)<KNOB.r+6; }
function inPourBtn(x,y){ return canPour()&&dist(x,y,POT.cx,POT.cy-70)<30; }

cv.addEventListener('pointerdown',e=>{ Snd.init();Snd.resume(); const p=canvasPos(e); ptr.down=true;ptr.x=p.x;ptr.y=p.y;ptr.px=p.x;ptr.py=p.y;ptr.path=[[p.x,p.y]]; cv.setPointerCapture(e.pointerId);
  if(inPourBtn(p.x,p.y)){ pour(); ptr.down=false; return; }
  if(inKnob(p.x,p.y)){ pot.heat=(pot.heat+1)%4; sfx.click2(); return; }
  if(tool==='hand'){ const pc=pieceAt(p.x,p.y); if(pc){ ptr.grab=pc; pc.vx=pc.vy=0; sfx.grab(); cv.classList.add('grabbing'); } }
});
cv.addEventListener('pointermove',e=>{ const p=canvasPos(e); ptr.vx=p.x-ptr.x;ptr.vy=p.y-ptr.y; ptr.x=p.x;ptr.y=p.y;
  if(ptr.down){ ptr.path.push([p.x,p.y]); if(ptr.path.length>16)ptr.path.shift(); }
  if(ptr.grab){ ptr.grab.x=p.x;ptr.grab.y=p.y; }
  else if(ptr.down&&tool==='knife'){ // swipe shave
    const speed=Math.hypot(ptr.vx,ptr.vy);
    if(speed>3 && p.x>BLOCK.x-10 && p.x<CUTX+34 && p.y>BLOCK.y-14 && p.y<BLOCK.y+BLOCK.h+14 && shaveCD<=0){ shave(knife().shave); shaveCD=knife().cd; }
  }
});
function endPtr(){ if(ptr.grab){ const g=ptr.grab; if(overPot(g.x,g.y)&&pot.pieces<S.gear.potCap){ g.state='pot';g.ft=0; } else { g.vx=clamp(ptr.vx*40,-600,600); g.vy=clamp(ptr.vy*40,-600,600); } ptr.grab=null; cv.classList.remove('grabbing'); }
  ptr.down=false; ptr.path=[]; }
window.addEventListener('pointerup',endPtr);
window.addEventListener('pointercancel',endPtr);
cv.addEventListener('lostpointercapture',endPtr);

/* ---------- drawing helpers (glossy / rounded / 3D-ish) ---------- */
function rr(x,y,w,h,r){ ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(x,y,w,h,r); else{ r=Math.min(r,w/2,h/2); ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath(); } }
function softShadow(fn,blur=12,oy=6,a=.3){ ctx.save(); ctx.shadowColor=`rgba(40,20,6,${a})`; ctx.shadowBlur=blur; ctx.shadowOffsetY=oy; fn(); ctx.restore(); }

function drawBG(){
  // wall
  let g=ctx.createLinearGradient(0,0,0,300); g.addColorStop(0,'#caa07a');g.addColorStop(1,'#b98a63'); ctx.fillStyle=g; ctx.fillRect(0,0,W,300);
  // subtle tiles
  ctx.strokeStyle='rgba(90,50,20,.10)';ctx.lineWidth=2; for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,300);ctx.stroke();} for(let y=40;y<300;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  // window with sky (top-left charm)
  softShadow(()=>{ctx.fillStyle='#8a5c34';rr(40,36,150,120,14);ctx.fill();},10,4,.25);
  g=ctx.createLinearGradient(0,44,0,150); g.addColorStop(0,'#bfe6ff');g.addColorStop(1,'#e9f6ff'); ctx.fillStyle=g; rr(50,46,130,100,8); ctx.fill();
  ctx.fillStyle='#fff6c4'; ctx.beginPath();ctx.arc(150,74,14,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.85)'; const cx=70+((nowT*8)%120); ctx.beginPath();ctx.ellipse(cx,96,18,8,0,0,7);ctx.ellipse(cx+14,90,12,7,0,0,7);ctx.fill();
  ctx.fillStyle='#8a5c34'; ctx.fillRect(112,46,6,100); ctx.fillRect(50,90,130,6);
  // "for rent -> OPEN" sign
  softShadow(()=>{ctx.fillStyle='#5b8f6b';rr(360,40,180,54,12);ctx.fill();},8,4,.25);
  ctx.fillStyle='#eafff2';ctx.font='700 26px Baloo, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('OPEN',450,60);
  ctx.font='500 12px Baloo, sans-serif';ctx.fillStyle='#d6f5e2';ctx.fillText('est. today',450,80);
  ctx.textAlign='left';
  // counter
  g=ctx.createLinearGradient(0,300,0,H); g.addColorStop(0,'#a9713f');g.addColorStop(.12,'#8a5c34');g.addColorStop(1,'#6d4626'); ctx.fillStyle=g; ctx.fillRect(0,300,W,H-300);
  ctx.fillStyle='rgba(255,240,210,.18)'; ctx.fillRect(0,300,W,6);
  ctx.strokeStyle='rgba(60,34,14,.25)';ctx.lineWidth=2; for(let y=340;y<H;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
}

function drawBoard(){
  softShadow(()=>{ ctx.fillStyle='#c79a5f'; rr(BOARD.x,BOARD.y,BOARD.w,BOARD.h,8); ctx.fill(); },10,6,.3);
  ctx.fillStyle='#b98a4e'; rr(BOARD.x,BOARD.y,BOARD.w,6,6); ctx.fill();
  ctx.strokeStyle='rgba(120,80,40,.4)';ctx.lineWidth=1.5; for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(BOARD.x+i*BOARD.w/5,BOARD.y+3);ctx.lineTo(BOARD.x+i*BOARD.w/5,BOARD.y+BOARD.h-3);ctx.stroke();}
}
function drawBlock(){
  const wob=Math.sin(nowT*3)*(shakeT>0?1.5:0);
  softShadow(()=>{ const g=ctx.createLinearGradient(BLOCK.x,BLOCK.y,BLOCK.x,BLOCK.y+BLOCK.h); g.addColorStop(0,'#7a4d29');g.addColorStop(1,'#4a2c15'); ctx.fillStyle=g; rr(BLOCK.x,BLOCK.y+wob,BLOCK.w,BLOCK.h,10); ctx.fill(); },14,8,.34);
  // molded squares
  const cols=4,rows=2,pad=8,cw=(BLOCK.w-pad*(cols+1))/cols,ch=(BLOCK.h-pad*(rows+1))/rows;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){ const x=BLOCK.x+pad+c*(cw+pad),y=BLOCK.y+wob+pad+r*(ch+pad); const g=ctx.createLinearGradient(x,y,x,y+ch); g.addColorStop(0,'#9a6636');g.addColorStop(1,'#5c3317'); ctx.fillStyle=g; rr(x,y,cw,ch,6);ctx.fill(); ctx.fillStyle='rgba(255,235,200,.22)'; rr(x+3,y+3,cw-6,4,3);ctx.fill(); }
  // glossy top sheen
  ctx.fillStyle='rgba(255,240,215,.16)'; rr(BLOCK.x+6,BLOCK.y+wob+5,BLOCK.w-12,10,6); ctx.fill();
  // cut-line hint
  ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.lineDashOffset=-nowT*12; ctx.beginPath();ctx.moveTo(CUTX+2,BLOCK.y-6);ctx.lineTo(CUTX+2,BLOCK.y+BLOCK.h+6);ctx.stroke();ctx.setLineDash([]);
}

function drawPieceShape(x,y,r,rot,squish,fl){
  const F=FLAVORS[fl||'milk'];
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(1+squish*.25,1-squish*.35);
  ctx.save();ctx.shadowColor='rgba(30,14,4,.35)';ctx.shadowBlur=6;ctx.shadowOffsetY=4;
  const g=ctx.createLinearGradient(-r,-r,r,r); g.addColorStop(0,F.light);g.addColorStop(.5,F.base);g.addColorStop(1,F.dark);
  ctx.fillStyle=g; rr(-r,-r,r*2,r*2,6); ctx.fill(); ctx.restore();
  // score cross
  ctx.strokeStyle='rgba(30,14,4,.35)';ctx.lineWidth=1.5; ctx.beginPath();ctx.moveTo(0,-r+3);ctx.lineTo(0,r-3);ctx.moveTo(-r+3,0);ctx.lineTo(r-3,0);ctx.stroke();
  // gloss
  ctx.fillStyle='rgba(255,245,225,.4)'; rr(-r+3,-r+3,r-2,4,2);ctx.fill();
  ctx.restore();
}
function drawPieces(){
  // shadows on the counter
  for(const p of pieces){ if(p.inPot||p.state!=='live')continue; const gy=FLOOR+2, sc=clamp(1-(gy-p.y)/260,.3,1); ctx.fillStyle=`rgba(40,20,6,${.28*sc})`; ctx.beginPath();ctx.ellipse(p.x,gy,p.r*sc,4*sc,0,0,7);ctx.fill(); }
  for(const p of pieces){ if(p.inPot)continue; drawPieceShape(p.x,p.y,p.r,p.rot,p.squish,'milk'); }
}

function drawStove(){
  softShadow(()=>{ const g=ctx.createLinearGradient(STOVE.x,STOVE.y,STOVE.x,STOVE.y+STOVE.h); g.addColorStop(0,'#cfd6de');g.addColorStop(1,'#9aa3ad'); ctx.fillStyle=g; rr(STOVE.x,STOVE.y,STOVE.w,STOVE.h,16);ctx.fill(); },14,8,.34);
  // top plate
  ctx.fillStyle='#7f8791'; rr(STOVE.x+10,STOVE.y+8,STOVE.w-20,60,12);ctx.fill();
  // burner glow under pot
  const gl=pot.temp;
  if(gl>0.02){ const g=ctx.createRadialGradient(POT.cx,POT.bot-6,4,POT.cx,POT.bot-6,80); g.addColorStop(0,`rgba(255,${140+gl*80|0},40,${.5*gl})`);g.addColorStop(1,'rgba(255,120,20,0)'); ctx.fillStyle=g; ctx.beginPath();ctx.arc(POT.cx,POT.bot-2,80,0,7);ctx.fill();
    // little flames
    for(let i=0;i<6;i++){ const fx2=POT.cx-40+i*16, fl=6+Math.sin(nowT*12+i)*4*gl+gl*10; ctx.fillStyle=`rgba(255,${160+40*Math.sin(nowT*10+i)|0},50,${.7*gl})`; ctx.beginPath();ctx.ellipse(fx2,POT.bot+2,4,fl,0,0,7);ctx.fill(); }
  }
  drawPot();
  drawKnob();
  // hood label
  ctx.fillStyle='#6b737d';ctx.font='700 13px Baloo, sans-serif';ctx.textAlign='center';ctx.fillText('STOVE',STOVE.x+STOVE.w/2,STOVE.y-6);ctx.textAlign='left';
}
function drawPot(){
  const F=FLAVORS[pot.flav];
  // body
  ctx.save();ctx.shadowColor='rgba(20,10,4,.4)';ctx.shadowBlur=12;ctx.shadowOffsetY=8;
  const g=ctx.createLinearGradient(POT.cx-POT.rx,0,POT.cx+POT.rx,0); g.addColorStop(0,'#3b4046');g.addColorStop(.4,'#7d858e');g.addColorStop(.55,'#aab2bb');g.addColorStop(1,'#4a4f56');
  ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(POT.cx-POT.rx,POT.cy); ctx.lineTo(POT.cx-POT.rx+6,POT.bot); ctx.quadraticCurveTo(POT.cx,POT.bot+14,POT.cx+POT.rx-6,POT.bot); ctx.lineTo(POT.cx+POT.rx,POT.cy); ctx.closePath(); ctx.fill(); ctx.restore();
  // handles
  ctx.strokeStyle='#3b4046';ctx.lineWidth=8;ctx.lineCap='round'; ctx.beginPath();ctx.arc(POT.cx-POT.rx-2,POT.cy+20,12,-0.4,2.4);ctx.stroke(); ctx.beginPath();ctx.arc(POT.cx+POT.rx+2,POT.cy+20,12,0.75,3.55);ctx.stroke();
  // contents
  if(pot.pieces>0){ const fill=clamp(pot.pieces/S.gear.potCap,0,1); const surfY=POT.bot-8-(POT.bot-POT.cy-8)*fill;
    const melted=pot.melt; const cg=ctx.createLinearGradient(0,surfY,0,POT.bot); cg.addColorStop(0,F.light);cg.addColorStop(1,F.dark); ctx.fillStyle=cg;
    ctx.beginPath();ctx.moveTo(POT.cx-POT.rx+8,surfY);ctx.lineTo(POT.cx-POT.rx+7,POT.bot-6);ctx.quadraticCurveTo(POT.cx,POT.bot+8,POT.cx+POT.rx-7,POT.bot-6);ctx.lineTo(POT.cx+POT.rx-8,surfY);ctx.closePath();ctx.fill();
    // if not melted, show chunky lumps
    if(melted<0.9){ ctx.fillStyle=F.dark; for(let i=0;i<pot.pieces;i++){ const a=i*2.3, lx=POT.cx+Math.cos(a)*rnd(6,POT.rx*.5), ly=surfY+8+Math.sin(a)*6+(i%3)*4; rr(lx-7,ly-6,14,12,4);ctx.fill(); } }
    // surface sheen ellipse
    ctx.fillStyle='rgba(255,255,255,'+(.12+melted*.2)+')'; ctx.beginPath();ctx.ellipse(POT.cx,surfY,POT.rx-10,6,0,0,7);ctx.fill();
  }
  // rim
  const rg=ctx.createLinearGradient(POT.cx-POT.rx,0,POT.cx+POT.rx,0); rg.addColorStop(0,'#5a6068');rg.addColorStop(.5,'#c3ccd4');rg.addColorStop(1,'#5a6068');
  ctx.fillStyle=rg; ctx.beginPath();ctx.ellipse(POT.cx,POT.cy,POT.rx,POT.ry,0,0,7);ctx.fill();
  ctx.fillStyle='#2b2f34'; ctx.beginPath();ctx.ellipse(POT.cx,POT.cy,POT.rx-8,POT.ry-6,0,0,7);ctx.fill();
  if(pot.pieces===0){ ctx.fillStyle='rgba(255,255,255,.12)'; ctx.beginPath();ctx.ellipse(POT.cx,POT.cy,POT.rx-8,POT.ry-6,0,0,7);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.5)';ctx.font='600 12px Baloo, sans-serif';ctx.textAlign='center';ctx.fillText('drop pieces in',POT.cx,POT.cy+1);ctx.textAlign='left'; }
  // POUR button
  if(canPour()){ const by=POT.cy-70, pulse=1+Math.sin(nowT*6)*.06; ctx.save();ctx.translate(POT.cx,by);ctx.scale(pulse,pulse); softShadow(()=>{ctx.fillStyle='#f4b942';ctx.beginPath();ctx.arc(0,0,26,0,7);ctx.fill();},8,4,.3); ctx.fillStyle='#7a4d09';ctx.font='700 13px Baloo, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('POUR',0,1);ctx.textAlign='left'; ctx.restore();
    ctx.strokeStyle='rgba(244,185,66,.7)';ctx.lineWidth=3;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(POT.cx,POT.cy-44);ctx.lineTo(POT.cx,POT.cy-14);ctx.stroke();ctx.setLineDash([]); }
}
function drawKnob(){
  softShadow(()=>{ const g=ctx.createRadialGradient(KNOB.cx-6,KNOB.cy-8,3,KNOB.cx,KNOB.cy,KNOB.r); g.addColorStop(0,'#fdfefe');g.addColorStop(1,'#b9c0c8'); ctx.fillStyle=g; ctx.beginPath();ctx.arc(KNOB.cx,KNOB.cy,KNOB.r,0,7);ctx.fill(); },6,4,.3);
  ctx.strokeStyle='#7d858e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(KNOB.cx,KNOB.cy,KNOB.r,0,7);ctx.stroke();
  // ticks
  for(let i=0;i<4;i++){ const a=Math.PI*0.75+i*(Math.PI*1.5/3); const c=i<=pot.heat?'#e0685a':'#9aa3ad'; ctx.fillStyle=c; ctx.beginPath();ctx.arc(KNOB.cx+Math.cos(a)*(KNOB.r+8),KNOB.cy+Math.sin(a)*(KNOB.r+8),3,0,7);ctx.fill(); }
  // pointer
  const ang=Math.PI*0.75+pot.heat*(Math.PI*1.5/3); ctx.strokeStyle='#c0392b';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(KNOB.cx,KNOB.cy);ctx.lineTo(KNOB.cx+Math.cos(ang)*(KNOB.r-6),KNOB.cy+Math.sin(ang)*(KNOB.r-6));ctx.stroke();
  ctx.fillStyle='#6b737d';ctx.font='600 11px Baloo, sans-serif';ctx.textAlign='center';ctx.fillText('HEAT',KNOB.cx,KNOB.cy+KNOB.r+16);ctx.textAlign='left';
}
function drawKnife(){
  if(tool!=='knife')return;
  let x,y,ang;
  if(ptr.down&&ptr.path.length){ x=ptr.x;y=ptr.y; const pp=ptr.path[Math.max(0,ptr.path.length-3)]; ang=Math.atan2(y-pp[1],x-pp[0]); // slash trail
    ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath(); for(let i=0;i<ptr.path.length;i++){const q=ptr.path[i]; i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);} ctx.stroke();
  } else { x=CUTX+26; y=BLOCK.y+BLOCK.h+8+Math.sin(nowT*3)*3; ang=-0.9; }
  ctx.save();ctx.translate(x,y);ctx.rotate(ang+Math.PI*0.25);
  // blade
  ctx.save();ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=5;ctx.shadowOffsetY=3;
  const g=ctx.createLinearGradient(0,-6,0,6);g.addColorStop(0,'#eef2f6');g.addColorStop(1,'#aab4bd'); ctx.fillStyle=g; rr(-4,-6,34,11,4);ctx.fill(); ctx.restore();
  ctx.fillStyle='#e8edf1';rr(-2,-6,30,3,2);ctx.fill();
  // handle
  ctx.fillStyle='#5b3a22';rr(28,-7,20,13,5);ctx.fill(); ctx.fillStyle='#7a5233';rr(28,-7,20,4,3);ctx.fill();
  ctx.restore();
}
function drawWorkers(){
  // hired employees appear at their stations
  const y=352;
  if(S.emp.cutter) drawWorkerChip(CUTX+30,BLOCK.y+BLOCK.h+26,'🐭');
  if(S.emp.cook) drawWorkerChip(POT.cx+POT.rx+26,POT.cy+30,'🐻');
  if(S.emp.runner) drawWorkerChip(806,150,'🦊');
}
function drawWorkerChip(x,y,emoji){ const bob=Math.sin(nowT*3+x)*2; ctx.save();ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=6;ctx.shadowOffsetY=3; ctx.fillStyle='#fff'; ctx.beginPath();ctx.arc(x,y+bob,15,0,7);ctx.fill(); ctx.restore(); ctx.font='18px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(emoji,x,y+bob+1);ctx.textAlign='left';ctx.textBaseline='alphabetic'; }

function drawFx(){
  for(const f of fx){ if(f.delay&&f.delay>0)continue; const k=f.t/f.life;
    if(f.type==='crumb'){ ctx.globalAlpha=1-k*k; ctx.fillStyle=f.c; rr(f.x,f.y,f.s,f.s,1);ctx.fill(); ctx.globalAlpha=1; }
    else if(f.type==='bub'){ ctx.strokeStyle=`rgba(255,255,255,${.5*(1-k)})`;ctx.lineWidth=2; ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1+k),0,7);ctx.stroke(); }
    else if(f.type==='steam'){ ctx.fillStyle=`rgba(255,255,255,${.28*(1-k)})`; ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1+k*1.5),0,7);ctx.fill(); }
    else if(f.type==='coin'){ ctx.save();ctx.translate(f.x,f.y); const g=ctx.createRadialGradient(-2,-2,1,0,0,7);g.addColorStop(0,'#ffe08a');g.addColorStop(1,'#d99521'); ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,7,0,7);ctx.fill(); ctx.fillStyle='#a56f12';ctx.font='700 9px Baloo';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('$',0,1);ctx.restore();ctx.textAlign='left';ctx.textBaseline='alphabetic'; }
  }
}

function drawKitchen(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,W,H);
  ctx.save();
  if(shakeT>0){ const k=shakeT/.2; ctx.translate(rnd(-1,1)*shakeMag*k,rnd(-1,1)*shakeMag*k); }
  drawBG();
  drawStove();      // right side (draw behind pieces so thrown pieces overlap)
  drawBoard();
  drawBlock();
  drawPieces();
  drawFx();
  drawWorkers();
  drawKnife();
  ctx.restore();
}

/* ============================================================
   EMPLOYEE AUTOMATION
   ============================================================ */
let empT={cut:0,cook:0,run:0};
function stepEmployees(dt){
  if(S.emp.cutter){ empT.cut-=dt; if(empT.cut<=0){ empT.cut=1.6; if(loosePieceCount()<10) shave(1); } }
  if(S.emp.cook){ empT.cook-=dt; if(empT.cook<=0){ empT.cook=0.7;
    pot.heat=3;
    // reserve the loose pieces the current order still wants; only cook the surplus
    const reserve=S.order?S.order.items.filter(it=>it.type==='piece').reduce((a,it)=>a+it.qty,0):0;
    if(pot.pieces<S.gear.potCap && loosePieceCount()>reserve){ const p=pieces.find(q=>q.state==='live'&&!q.inPot); if(p){p.state='pot';p.ft=0;} }
    if(canPour()) pour();
  } }
  if(S.emp.runner){ empT.run-=dt; if(empT.run<=0){ empT.run=1.2; if(scene==='kitchen'||true){ const pr=orderProgress(); if(pr.done)deliver(); } } }
}

/* ============================================================
   HTML UI — HUD, order note, tray, tools, store, computer
   ============================================================ */
const $=id=>document.getElementById(id);
function popStat(id){ const el=$(id); el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop'); }
function ktoast(msg,gold){ const box=$('k-toasts'); const el=document.createElement('div'); el.className='k-toast'+(gold?' gold':''); el.textContent=msg; box.appendChild(el); while(box.children.length>3)box.removeChild(box.firstChild); setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),360);},2200); }

function repStars(){ return '★'.repeat(S.rep)+'☆'.repeat(5-S.rep); }
function syncHUD(){ $('money').textContent=fmt(S.money); $('orders-done').textContent=S.ordersDone; $('rep').textContent=repStars(); }

function barIcon(fl,w=20,h=11){ const F=FLAVORS[fl]; return `<span class="bar-ico" style="background:linear-gradient(180deg,${F.light},${F.base});width:${w}px;height:${h}px"></span>`; }
function syncTray(){ $('tray-pieces').textContent=loosePieceCount();
  const owned=S.flavors.filter(f=>barsOf(f)>0);
  $('tray-bars').innerHTML=owned.length?owned.map(f=>`<span class="tb">${barIcon(f)}${barsOf(f)}</span>`).join(''):'<span style="color:var(--ink-soft);font-size:11px">no bars yet</span>';
}
function renderPotFlavors(){ const box=$('pot-flavor'); box.innerHTML=''; for(const f of S.flavors){ const F=FLAVORS[f]; const d=document.createElement('div'); d.className='flav-dot'+(S.potFlavor===f?' sel':''); d.style.background=`linear-gradient(135deg,${F.light},${F.dark})`; d.title=F.name+' bars'; d.onclick=()=>{S.potFlavor=f;pot.flav=f;sfx.click();renderPotFlavors();save();}; box.appendChild(d);} }

let lastOrderKey='';
function renderOrder(){
  if(!S.order)makeOrder();
  const pr=orderProgress();
  const key=JSON.stringify(S.order)+pr.lines.map(l=>l.have).join(',')+pr.done;
  if(key===lastOrderKey)return; lastOrderKey=key;
  const body=$('order-body');
  body.innerHTML=S.order.items.map((it,i)=>{ const L=pr.lines[i]; const label=it.type==='piece'?'pieces':FLAVORS[it.flavor].name+' bar'+(it.qty>1?'s':''); const ico=it.type==='piece'?'🍫':barIcon(it.flavor,18,10);
    return `<div class="note-line ${L.ok?'done':''}"><span class="chk">${L.ok?'✔':''}</span><span>${ico} ${label}</span><span class="qty">${L.have}/${it.qty}</span></div>`; }).join('')
    +`<div style="text-align:center;margin-top:6px;color:var(--gold-d);font-weight:700">Reward $${fmt(S.order.reward)}</div>`;
  $('btn-deliver').disabled=!pr.done;
}

/* ---------- store ---------- */
let shopCat='flavors';
function iconCanvas(draw){ const c=document.createElement('canvas');c.width=60;c.height=60;const x=c.getContext('2d');draw(x,c);return c; }
function drawFlavIcon(fl){ return iconCanvas((x)=>{ const F=FLAVORS[fl]; const g=x.createLinearGradient(6,6,54,54);g.addColorStop(0,F.light);g.addColorStop(.5,F.base);g.addColorStop(1,F.dark); x.fillStyle=g; x.beginPath();(x.roundRect?x.roundRect(8,10,44,40,8):x.rect(8,10,44,40));x.fill(); x.strokeStyle='rgba(30,14,4,.4)';x.lineWidth=2; for(let i=1;i<3;i++){x.beginPath();x.moveTo(8+i*44/3,12);x.lineTo(8+i*44/3,48);x.stroke();} x.beginPath();x.moveTo(9,30);x.lineTo(51,30);x.stroke(); x.fillStyle='rgba(255,245,225,.5)';x.fillRect(11,13,38,5); }); }
function drawKnifeIcon(){ return iconCanvas((x)=>{ x.save();x.translate(30,34);x.rotate(-0.6); const g=x.createLinearGradient(0,-7,0,7);g.addColorStop(0,'#eef2f6');g.addColorStop(1,'#aab4bd');x.fillStyle=g;(x.roundRect?x.roundRect(-18,-7,34,13,4):x.rect(-18,-7,34,13));x.fill(); x.fillStyle='#5b3a22';(x.roundRect?x.roundRect(14,-8,16,15,5):x.rect(14,-8,16,15));x.fill(); x.restore(); }); }
function drawGearIcon(id){ return iconCanvas((x)=>{ if(id.startsWith('pot')){ const g=x.createLinearGradient(10,0,50,0);g.addColorStop(0,'#4a4f56');g.addColorStop(.5,'#aab2bb');g.addColorStop(1,'#4a4f56');x.fillStyle=g;(x.roundRect?x.roundRect(12,22,36,28,6):x.rect(12,22,36,28));x.fill(); x.fillStyle='#2b2f34';x.beginPath();x.ellipse(30,22,20,7,0,0,7);x.fill(); x.strokeStyle='#3b4046';x.lineWidth=4;x.beginPath();x.arc(12,30,7,0.6,2.6);x.stroke();x.beginPath();x.arc(48,30,7,0.5,2.5);x.stroke(); } else { x.fillStyle='#e0685a';for(let i=0;i<5;i++){const fx2=16+i*7;x.beginPath();x.ellipse(fx2,40,4,12+Math.sin(i)*3,0,0,7);x.fill();} x.fillStyle='#ffcf6b';for(let i=0;i<5;i++){const fx2=16+i*7;x.beginPath();x.ellipse(fx2,42,2,7,0,0,7);x.fill();} } }); }

function ownsGear(id){ return S.gearOwned.includes(id); }
function renderStore(){
  const grid=$('shop-grid'); grid.innerHTML='';
  let items=[];
  if(shopCat==='flavors'){ items=FLAV_ORDER.filter(f=>f!=='milk').map(f=>({kind:'flavor',id:f,name:FLAVORS[f].name+' Chocolate',price:FLAVORS[f].price,desc:`Sell bars for ${FLAVORS[f].mult}× more. Unlocks the ${FLAVORS[f].name} flavor in the pot.`,owned:S.flavors.includes(f),icon:()=>drawFlavIcon(f)})); }
  else if(shopCat==='knives'){ items=KNIVES.filter(k=>k.price>0).map(k=>({kind:'knife',id:k.id,name:k.name,price:k.price,desc:k.desc,owned:S.knife===k.id||KNIVES.findIndex(x=>x.id===k.id)<KNIVES.findIndex(x=>x.id===S.knife),icon:()=>drawKnifeIcon()})); }
  else{ items=GEAR.map(g=>({kind:'gear',id:g.id,name:g.name,price:g.price,desc:g.desc,owned:ownsGear(g.id),locked:g.needs&&!ownsGear(g.needs),icon:()=>drawGearIcon(g.id)})); }
  for(const it of items){
    const card=document.createElement('div'); card.className='shop-card'+(it.owned?' owned':'');
    const ic=document.createElement('div'); ic.className='shop-icon'; ic.style.background='linear-gradient(#fff,#ffe6c4)'; ic.appendChild(it.icon());
    card.appendChild(ic);
    const nm=document.createElement('div');nm.className='shop-name';nm.textContent=it.name;card.appendChild(nm);
    const de=document.createElement('div');de.className='shop-desc';de.textContent=it.desc;card.appendChild(de);
    if(it.owned){ const t=document.createElement('div');t.className='tag-owned';t.textContent=it.kind==='knife'?'✔ owned':'✔ owned';card.appendChild(t); }
    else{ const b=document.createElement('button');b.className='btn buy';b.textContent=it.locked?'🔒 locked':'$'+fmt(it.price); b.disabled=it.locked||S.money<it.price; b.onclick=()=>buy(it); card.appendChild(b); }
    grid.appendChild(card);
  }
}
function buy(it){
  if(S.money<it.price){sfx.nope();return;}
  S.money-=it.price; sfx.buy(); popStat('stat-money');
  if(it.kind==='flavor'){ if(!S.flavors.includes(it.id))S.flavors.push(it.id); renderPotFlavors(); }
  else if(it.kind==='knife'){ S.knife=it.id; }
  else if(it.kind==='gear'){ if(!ownsGear(it.id)){ S.gearOwned.push(it.id); const g=GEAR.find(x=>x.id===it.id); g.apply(S.gear); } }
  ktoast('Bought '+it.name+'!',true);
  save(); syncHUD(); renderStore(); syncTray();
}

/* ---------- computer / hiring ---------- */
function renderComputer(){
  const body=$('browser-body');
  body.innerHTML=`<div class="site-head"><h1>hire<b>.choco.co</b></h1><p>Find friendly staff to run your shop while you relax.</p></div><div class="hire-grid" id="hire-grid"></div>`;
  const grid=$('hire-grid');
  const avatarBg=['#ffe0e6','#e0f0ff','#e6ffe9'];
  EMPLOYEES.forEach((e,i)=>{
    const hired=S.emp[e.id];
    const card=document.createElement('div'); card.className='hire-card'+(hired?' hired':'');
    card.innerHTML=`<div class="hire-avatar" style="background:${avatarBg[i%3]}">${e.emoji}</div>`+
      `<div class="hire-name">${e.name}</div><div class="hire-role">${e.role}</div>`+
      `<div class="hire-desc">${e.desc}</div>`;
    if(hired){ const t=document.createElement('div');t.className='tag-hired';t.textContent='✔ On the team';card.appendChild(t); }
    else{ const b=document.createElement('button');b.className='btn';b.textContent='Hire · $'+fmt(e.price);b.disabled=S.money<e.price;b.onclick=()=>hire(e);card.appendChild(b); }
    grid.appendChild(card);
  });
}
function hire(e){
  if(S.money<e.price){sfx.nope();return;}
  S.money-=e.price; S.emp[e.id]=true; sfx.fanfare(); popStat('stat-money');
  ktoast(e.name+' joined the team!',true);
  save(); syncHUD(); renderComputer();
}

/* ============================================================
   SCENES / NAV / OVERLAY
   ============================================================ */
let scene='kitchen';
function setScene(s){ scene=s; document.querySelectorAll('.scene').forEach(el=>el.classList.toggle('active',el.id==='scene-'+s)); document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.scene===s)); sfx.click(); if(s==='store')renderStore(); if(s==='computer')renderComputer(); }
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{Snd.init();Snd.resume();setScene(t.dataset.scene);}));
$('shop-tabs').querySelectorAll('.shop-tab').forEach(t=>t.addEventListener('click',()=>{ shopCat=t.dataset.cat; document.querySelectorAll('.shop-tab').forEach(x=>x.classList.toggle('active',x===t)); sfx.click(); renderStore(); }));
$('tool-knife').addEventListener('click',()=>{tool='knife';$('tool-knife').classList.add('active');$('tool-hand').classList.remove('active');cv.classList.remove('hand');sfx.click();});
$('tool-hand').addEventListener('click',()=>{tool='hand';$('tool-hand').classList.add('active');$('tool-knife').classList.remove('active');cv.classList.add('hand');sfx.click();});
$('btn-deliver').addEventListener('click',()=>{Snd.init();Snd.resume();deliver();});
$('btn-sound').addEventListener('click',()=>{ S.muted=!S.muted; $('btn-sound').textContent=S.muted?'🔇':'🔊'; if(!S.muted){Snd.init();Snd.resume();sfx.click();} save(); });

let resetArmed=false,resetTmr=null;
$('btn-reset').addEventListener('click',()=>{ const b=$('btn-reset'); if(!resetArmed){resetArmed=true;b.textContent='sure? click again';b.classList.add('armed');resetTmr=setTimeout(()=>{resetArmed=false;b.textContent='reset save';b.classList.remove('armed');},2500);} else{clearTimeout(resetTmr);resetting=true;try{localStorage.removeItem(SAVE_KEY);}catch(e){}location.reload();} });

function showOverlay(emoji,title,text,btn,onClose){ $('overlay-emoji').textContent=emoji; $('overlay-title').textContent=title; $('overlay-text').innerHTML=text; $('overlay-btn').textContent=btn||'OK'; $('overlay').classList.add('show'); $('overlay-btn').onclick=()=>{Snd.init();Snd.resume();sfx.click();$('overlay').classList.remove('show');if(onClose)onClose();}; }

/* ============================================================
   MAIN LOOP
   ============================================================ */
let lastF=0,saveT=0;
function frame(ts){ const t=ts/1000; let dt=t-lastF; lastF=t; if(dt>0.1)dt=0.1; if(dt<0)dt=0; nowT=t;
  if(shaveCD>0)shaveCD-=dt;
  stepPhysics(dt); stepCook(dt); stepEmployees(dt); stepFx(dt);
  if(scene==='kitchen') drawKitchen();
  // light UI sync
  uiT+=dt; if(uiT>0.1){ uiT=0;
    if(scene==='kitchen'){ syncTray(); renderOrder(); pot.flav=S.potFlavor; }
    else if(scene==='store'&&S.money!==lastMoneyRender){ lastMoneyRender=S.money; renderStore(); }
    else if(scene==='computer'&&S.money!==lastMoneyRender){ lastMoneyRender=S.money; renderComputer(); }
  }
  saveT+=dt; if(saveT>6){saveT=0;save();}
  requestAnimationFrame(frame);
}
let uiT=0, lastMoneyRender=-1;

/* ============================================================
   BOOT
   ============================================================ */
function boot(){
  const had=load();
  pot.flav=S.potFlavor;
  // re-apply gear from owned list (in case of new defaults)
  S.gear={potCap:6,boil:1}; S.gearOwned.forEach(id=>{const g=GEAR.find(x=>x.id===id);if(g)g.apply(S.gear);});
  $('btn-sound').textContent=S.muted?'🔇':'🔊';
  if(!S.order)makeOrder();
  renderPotFlavors(); syncHUD(); syncTray(); renderOrder();
  // start with a couple pieces so the board isn't bare
  for(let i=0;i<2;i++)mkPiece(rnd(120,300),rnd(120,200),rnd(-40,40),0);
  if(!S.seenIntro){ S.seenIntro=true; save();
    showOverlay('🍫','Welcome to Infinite Choco.co',
      `You just rented a tiny, run-down shop. All you have is a <b>knife</b>, a <b>cutting board</b>, and one <b>endless block of chocolate</b>.<br><br>`+
      `<span class="small">Swipe the knife across the block to shave pieces · switch to the ✋ hand to drop pieces in the pot · turn up the HEAT to melt them · hit POUR to make bars · then fill the order note. Buy flavors & gear at the Store, and hire help on the Computer.</span>`,
      'Open the shop'); }
  else { $('overlay').classList.remove('show'); }
  requestAnimationFrame(t=>{lastF=t/1000;requestAnimationFrame(frame);});
}
window.addEventListener('beforeunload',()=>{ if(!document.hidden)save(); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden)save(); });

/* debug hooks for automated playtesting */
window.GAME={ get S(){return S;}, get pieces(){return pieces;}, get pot(){return pot;}, fmt, setScene, save,
  shave, deliver, makeOrder, pour, loosePieceCount, orderProgress,
  setTool:t=>{tool=t;}, dropAllToPot(){pieces.forEach(p=>{if(p.state==='live'&&!p.inPot&&pot.pieces<S.gear.potCap){p.state='pot';p.ft=0;}});}, setHeat:h=>{pot.heat=h;},
  give:n=>{S.money+=n;syncHUD();}, buyId:(cat,id)=>{shopCat=cat;renderStore();}, forcePour:pour,
  reset(){resetting=true;try{localStorage.removeItem(SAVE_KEY);}catch(e){}location.reload();} };

if(document.fonts&&document.fonts.load){ Promise.all([document.fonts.load('700 20px Baloo'),document.fonts.load('500 14px Baloo')]).catch(()=>{}).finally(boot); }
else boot();
