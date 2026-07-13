/* ============================================================
   INFINITE CHOCO.CO  — a back-alley chocolate hustle
   Cut the impossible bar, take jobs on your phone, and
   deliver across the city. Dark pixel-art, diegetic phone UI.
   ============================================================ */
'use strict';

/* ---------- utils ---------- */
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(a=1,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
const rndi=(a,b)=>Math.floor(rnd(a,b+1));
const pick=a=>a[rndi(0,a.length-1)];
const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const easeOut=t=>1-Math.pow(1-t,3);
const easeIO=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
function fmt(n){n=Math.floor(n);if(n<1000)return''+n;const u=['k','M','B'];let x=n,i=-1;while(x>=1000&&i<u.length-1){x/=1000;i++;}return(x>=100?Math.floor(x):x.toFixed(1).replace(/\.0$/,''))+u[i];}
const CUR='§';

/* ---------- audio ---------- */
const Snd={ac:null,vol:.28,
 init(){if(this.ac)return;try{this.ac=new(window.AudioContext||window.webkitAudioContext)();this.g=this.ac.createGain();this.g.gain.value=this.vol;this.g.connect(this.ac.destination);}catch(e){}},
 resume(){if(this.ac&&this.ac.state==='suspended')this.ac.resume();},
 t(f,d,ty='square',v=1,sl=0,dl=0){if(!this.ac||S.muted)return;const t0=this.ac.currentTime+dl,o=this.ac.createOscillator(),g=this.ac.createGain();o.type=ty;o.frequency.setValueAtTime(f,t0);if(sl)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+sl),t0+d);g.gain.setValueAtTime(v*.5,t0);g.gain.exponentialRampToValueAtTime(.001,t0+d);o.connect(g);g.connect(this.g);o.start(t0);o.stop(t0+d+.02);},
 n(d,v=1,fr=1200,dl=0){if(!this.ac||S.muted)return;const t0=this.ac.currentTime+dl,len=Math.max(1,(d*this.ac.sampleRate)|0),b=this.ac.createBuffer(1,len,this.ac.sampleRate),dt=b.getChannelData(0);for(let i=0;i<len;i++)dt[i]=Math.random()*2-1;const s=this.ac.createBufferSource();s.buffer=b;const fl=this.ac.createBiquadFilter();fl.type='bandpass';fl.frequency.value=fr;fl.Q.value=.7;const g=this.ac.createGain();g.gain.setValueAtTime(v*.4,t0);g.gain.exponentialRampToValueAtTime(.001,t0+d);s.connect(fl);fl.connect(g);g.connect(this.g);s.start(t0);}
};
const sfx={
 saw:()=>Snd.n(.05,.35,rnd(1600,2400)),
 snap:()=>{Snd.n(.08,.7,900);Snd.t(150,.09,'square',.6,-60);},
 slide:()=>Snd.t(300,.14,'sine',.5,180),
 pop:()=>{Snd.t(520,.09,'sine',.8,420);Snd.t(880,.12,'triangle',.4,0,.05);},
 collect:()=>{Snd.t(700,.05,'square',.5);Snd.t(1040,.09,'square',.5,0,.05);},
 coin:()=>{Snd.t(988,.06,'square',.5);Snd.t(1319,.14,'square',.5,0,.06);},
 tap:()=>Snd.t(620,.04,'square',.35),
 open:()=>Snd.t(400,.12,'sine',.4,300),
 lift:()=>Snd.t(160,.5,'sine',.3,60),
 knock:()=>{Snd.t(200,.06,'square',.5);Snd.t(200,.06,'square',.5,0,.12);},
 buy:()=>[440,587,740].forEach((f,i)=>Snd.t(f,.1,'triangle',.4,0,i*.06)),
 nope:()=>Snd.t(150,.12,'square',.4,-40),
 buzz:()=>Snd.t(90,.3,'sawtooth',.4,-20),
 ding:()=>Snd.t(1400,.25,'triangle',.5)
};

/* ============================================================
   DATA
   ============================================================ */
const FLAVORS={
 milk:  {name:'Milk',  mult:1,  base:'#7a4d29',lo:'#5c3317',hi:'#a9743d',wrap:'#c94f4f'},
 dark:  {name:'Dark',  mult:2,  base:'#43291a',lo:'#2a180d',hi:'#6a4429',wrap:'#2f2f38'},
 white: {name:'White', mult:3.5,base:'#d8c39a',lo:'#b09b6f',hi:'#f2e6c8',wrap:'#3a7d8f'},
 ruby:  {name:'Ruby',  mult:6,  base:'#b65b76',lo:'#8a3f57',hi:'#e293ac',wrap:'#7c2c47'},
 gold:  {name:'Gold',  mult:14, base:'#c9a13a',lo:'#96751f',hi:'#f4d97a',wrap:'#4a3a12'}
};
const FLAV_ORDER=['milk','dark','white','ruby','gold'];

const KNIVES=[
 {id:'kitchen',name:'Kitchen Knife',price:0,cd:0.30,bonus:1,desc:'Blunt. Slow sawing, 1 free piece per trick.'},
 {id:'chef',   name:"Chef's Knife", price:140,cd:0.18,bonus:1,desc:'Sharper — cuts through the bar faster.'},
 {id:'santoku',name:'Santoku',      price:900,cd:0.13,bonus:2,desc:'Clean, fast. +2 pieces per trick.'},
 {id:'gold',   name:'Gold Cleaver', price:7000,cd:0.09,bonus:3,desc:'Absurd. Near-instant cuts, +3 pieces.'}
];

/* things sold at the convenience store (dragged into the basket) */
function storeItems(){
 const items=[];
 FLAV_ORDER.filter(f=>f!=='milk').forEach(f=>items.push({id:'fl_'+f,kind:'flavor',flavor:f,name:FLAVORS[f].name+' Bar',price:flavorPrice(f),owned:S.flavors.includes(f),
   desc:'Cut '+FLAVORS[f].name+' — worth '+FLAVORS[f].mult+'× on jobs.'}));
 KNIVES.filter(k=>k.price>0).forEach(k=>{const cur=KNIVES.findIndex(x=>x.id===S.knife),idx=KNIVES.findIndex(x=>x.id===k.id);items.push({id:'kn_'+k.id,kind:'knife',knife:k.id,name:k.name,price:k.price,owned:idx<=cur,desc:k.desc});});
 items.push({id:'bag',kind:'perk',perk:'bag',name:'Insulated Bag',price:500,owned:S.perks.includes('bag'),desc:'+25% on every delivery payout.'});
 items.push({id:'cart',kind:'perk',perk:'cart',name:'Delivery Cart',price:1200,owned:S.perks.includes('cart'),desc:'Carry more — jobs can ask for bigger loads.'});
 return items;
}
function flavorPrice(f){return{dark:120,white:450,ruby:1800,gold:20000}[f]||0;}

/* apartment building */
const FLOORS=6, DOORS=['A','B','C','D'];
const BUILDING='Maple Court';

/* ============================================================
   STATE + SAVE
   ============================================================ */
const SAVE_KEY='infchoco.city.v1';
function defaultState(){return{
 money:0, ordersDone:0,
 flavors:['milk'], knife:'kitchen', perks:[],
 curFlavor:'milk',
 pieces:{}, // flavor -> count
 jobs:[], active:null,
 muted:false, seenIntro:false, tutStep:0,
 last:Date.now()
};}
let S=defaultState(); let resetting=false;
function save(){if(resetting)return;try{S.last=Date.now();localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch(e){}}
function load(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;const d=JSON.parse(raw),def=defaultState();for(const k in def){if(d[k]===undefined)continue;if(typeof def[k]==='object'&&def[k]&&!Array.isArray(def[k]))S[k]=Object.assign({},def[k],d[k]);else S[k]=d[k];}
 if(!Array.isArray(S.flavors)||!S.flavors.includes('milk'))S.flavors=['milk'];
 S.flavors=S.flavors.filter(f=>FLAVORS[f]); if(!FLAVORS[S.curFlavor]||!S.flavors.includes(S.curFlavor))S.curFlavor='milk';
 if(!KNIVES.find(k=>k.id===S.knife))S.knife='kitchen';
 S.money=+S.money||0; S.ordersDone=+S.ordersDone||0;
 if(!S.pieces||typeof S.pieces!=='object')S.pieces={};
 if(!Array.isArray(S.perks))S.perks=[];
 if(!Array.isArray(S.jobs))S.jobs=[];
 return true;}catch(e){return false;}}

const knife=()=>KNIVES.find(k=>k.id===S.knife)||KNIVES[0];
const piecesOf=f=>S.pieces[f]||0;
function addPiece(f,n=1){S.pieces[f]=piecesOf(f)+n;}

/* ============================================================
   JOBS (deliveries)
   ============================================================ */
function makeJob(){
 const flav=pick(S.flavors);
 const cap=S.perks.includes('cart')?9:5;
 const qty=rndi(1,Math.min(cap,2+Math.floor(S.ordersDone/5)));
 const floor=rndi(1,FLOORS), door=pick(DOORS);
 let reward=Math.round(qty*7*FLAVORS[flav].mult*(1+S.ordersDone*0.05)*rnd(1.05,1.3));
 if(S.perks.includes('bag'))reward=Math.round(reward*1.25);
 return{id:'j'+Math.floor(rnd(1e9)),flavor:flav,qty,floor,door,reward,addr:floor+door};
}
function refillJobs(){while(S.jobs.length<3)S.jobs.push(makeJob());}
function acceptJob(id){const j=S.jobs.find(x=>x.id===id);if(!j)return;S.active=j;S.jobs=S.jobs.filter(x=>x.id!==id);refillJobs();sfx.tap();save();buzzPhone();renderApp();}
function canDeliver(){return S.active&&piecesOf(S.active.flavor)>=S.active.qty;}
function completeDelivery(){
 const j=S.active; if(!j)return false;
 if(piecesOf(j.flavor)<j.qty)return false;
 S.pieces[j.flavor]=piecesOf(j.flavor)-j.qty;
 S.money+=j.reward; S.ordersDone++;
 S.active=null; sfx.coin();sfx.ding(); flashCash();
 wtoast('Delivered! +'+CUR+fmt(j.reward),true);
 refillJobs(); save(); syncCash();
 if(!S.tutStep||S.tutStep<9)S.tutStep=9;
 return true;
}

/* ============================================================
   PIXEL SPRITE HELPERS  (all art drawn in code, dark palette)
   ============================================================ */
function mkc(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=false;return[c,x];}
function px(x,c,X,Y,w=1,h=1){x.fillStyle=c;x.fillRect(X,Y,w,h);}

/* customer pixel sprite (16x22), varied by seed */
const custCache={};
const CUST_SKIN=['#e2b48c','#c98a5a','#9a643a','#6e4428','#d8b0d0'];
const CUST_HAIR=['#2a1c12','#5a3a20','#c9a34a','#7a2a2a','#3a3a48','#b0b0c0'];
const CUST_TOP=['#3a5a8a','#8a3a3a','#3a7a5a','#6a4a8a','#8a6a2a','#444a55','#7a3a5a'];
function custImg(seed){
 if(custCache[seed])return custCache[seed];
 const r=(n)=>{let x=Math.sin(seed*97.13+n*13.7)*43758.5;return x-Math.floor(x);};
 const skin=CUST_SKIN[Math.floor(r(1)*CUST_SKIN.length)],hair=CUST_HAIR[Math.floor(r(2)*CUST_HAIR.length)],top=CUST_TOP[Math.floor(r(3)*CUST_TOP.length)],st=Math.floor(r(4)*3);
 const[c,x]=mkc(16,22);
 // hair back
 px(x,hair,4,1,8,4);
 // face
 px(x,skin,4,3,8,7); px(x,adjust(skin,-20),4,9,8,1);
 // hair styles
 if(st===0){px(x,hair,4,1,8,2);px(x,hair,3,2,2,3);px(x,hair,11,2,2,3);}
 else if(st===1){px(x,hair,4,0,8,3);px(x,hair,4,1,1,4);px(x,hair,11,1,1,4);}
 else {px(x,hair,4,1,8,2);}
 // eyes
 px(x,'#141018',6,6,1,2);px(x,'#141018',9,6,1,2);
 // body
 px(x,top,4,10,8,8); px(x,adjust(top,18),4,10,8,1);
 px(x,skin,2,11,2,4);px(x,skin,12,11,2,4); // arms
 px(x,'#241820',5,18,2,4);px(x,'#241820',9,18,2,4); // legs
 px(x,'#0c0810',4,21,3,1);px(x,'#0c0810',9,21,3,1); // shoes
 custCache[seed]=c;return c;
}
function adjust(hex,d){const n=parseInt(hex.slice(1),16);let r=clamp(((n>>16)&255)+d,0,255),g=clamp(((n>>8)&255)+d,0,255),b=clamp((n&255)+d,0,255);return'#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}

/* item icon (store products) */
function itemIcon(it,size=40){const[c,x]=mkc(size,size);const s=size/40;x.save();x.scale(s,s);
 if(it.kind==='flavor'){const F=FLAVORS[it.flavor];px(x,F.wrap,6,4,28,32);px(x,adjust(F.wrap,-24),6,4,28,3);px(x,F.base,10,10,20,20);for(let r=0;r<2;r++)for(let cc=0;cc<2;cc++){px(x,F.hi,12+cc*10,12+r*10,7,7);px(x,F.lo,12+cc*10,18+r*10,7,2);}x.fillStyle='#f4e6c8';x.fillRect(9,6,22,3);}
 else if(it.kind==='knife'){x.translate(20,22);x.rotate(-0.5);px(x,'#c8d0d8',-16,-4,26,8);px(x,'#eef2f6',-16,-4,24,2);px(x,'#5b3a22',10,-5,12,10);}
 else if(it.perk==='bag'){px(x,'#3a6a5a',8,12,24,24);px(x,'#4a8a72',8,12,24,3);px(x,'#2a4a3e',14,6,4,8);px(x,'#2a4a3e',22,6,4,8);px(x,'#e9dfd0',16,20,8,8);}
 else {px(x,'#5a4a3a',6,18,28,16);px(x,'#7a6a52',6,18,28,3);px(x,'#2a2018',10,34,4,4);px(x,'#2a2018',26,34,4,4);px(x,'#8a7a62',10,10,20,10);}
 x.restore();return c;}

/* app / location icons */
function appIcon(name,size=40){const[c,x]=mkc(size,size);const s=size/40;x.save();x.scale(s,s);
 if(name==='map'){px(x,'#2a4a3a',4,6,32,28);px(x,'#3a6a4a',4,6,32,3);px(x,'#c9a13a',6,10,10,20);px(x,'#c94f4f',24,8,3,26);px(x,'#e5504a',20,4,10,10);px(x,'#7c2c22',24,10,2,2);}
 else if(name==='jobs'){px(x,'#d8cbb0',7,4,26,32);px(x,'#b0a488',7,4,26,3);px(x,'#8a3a3a',14,2,12,5);for(let i=0;i<4;i++){px(x,'#3a2c42',11,11+i*6,4,3);px(x,'#6b5f74',17,12+i*6,12,2);}}
 else if(name==='store'){px(x,'#3a2c42',4,14,32,22);px(x,'#54e0c8',4,8,32,8);px(x,'#2a9c8a',4,8,32,2);for(let i=0;i<4;i++)px(x,i%2?'#e0e6ee':'#c94f4f',4+i*8,8,4,8);px(x,'#1d1622',16,20,10,16);px(x,'#f0a63c',7,20,6,6);px(x,'#f0a63c',27,20,6,6);}
 else if(name==='wallet'){px(x,'#3a2c1a',5,10,30,22);px(x,'#5a4428',5,10,30,3);px(x,'#c9a13a',24,18,8,7);px(x,'#f4d97a',26,20,3,3);px(x,'#2a2012',5,10,30,2);}
 else if(name==='shop'){px(x,'#43291a',6,10,28,24);px(x,'#6a4429',6,10,28,3);px(x,'#8a5a2b',10,16,8,6);px(x,'#8a5a2b',22,16,8,6);px(x,'#8a5a2b',10,24,8,6);px(x,'#8a5a2b',22,24,8,6);px(x,'#c8d0d8',26,4,10,4);}
 else if(name==='apt'){px(x,'#2c2230',6,4,28,32);px(x,'#3a2c42',6,4,28,3);for(let r=0;r<4;r++)for(let cc=0;cc<3;cc++)px(x,r+cc&1?'#f0a63c':'#5a4a6a',10+cc*8,9+r*7,5,4);}
 x.restore();return c;}

/* ============================================================
   WORLD  (canvas scenes)
   ============================================================ */
const W=640,H=360;
const cv=document.getElementById('world');
const ctx=cv.getContext('2d'); ctx.imageSmoothingEnabled=false;
let loc='shop';           // shop | store | apartment
let nowT=0, shakeT=0, shakeMag=0;
const fx=[];
function shake(m,d){shakeMag=m;shakeT=d;}
function pushFx(o){if(fx.length<220)fx.push(o);}

/* ---- texture helpers ---- */
function noiseRect(X,Y,w,h,base,amt,seed){ctx.fillStyle=base;ctx.fillRect(X,Y,w,h);for(let i=0;i<w*h*amt/40;i++){const rx=X+((Math.sin((i+seed)*12.9)*43758.5)%1+1)%1*w,ry=Y+((Math.sin((i+seed)*78.2)*13758.5)%1+1)%1*h;ctx.fillStyle=i%2?'rgba(255,255,255,.03)':'rgba(0,0,0,.10)';ctx.fillRect(rx|0,ry|0,1,1);} }
function vignette(){const g=ctx.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,H*0.95);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.55)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
function label(txt,x,y,c='#e9dfd0',sz=8){ctx.font=sz+'px PX, monospace';ctx.fillStyle='#000';ctx.fillText(txt,x+1,y+1);ctx.fillStyle=c;ctx.fillText(txt,x,y);}

/* ============================================================
   SHOP scene — the infinite chocolate trick
   ============================================================ */
const BX=196,BY=118,BW=210,BH=150;
const SLANT_L=BY+64, SLANT_R=BY+98;              // slant cut endpoints (left/right edge)
const VX=BX+92;                                   // vertical cut x
const CUT1={x1:BX,y1:SLANT_L,x2:BX+BW,y2:SLANT_R};
const CUT2={x1:VX,y1:BY,x2:VX,y2:BY+ (SLANT_L+(SLANT_R-SLANT_L)*((VX-BX)/BW)) - BY };
const slantY=x=>SLANT_L+(SLANT_R-SLANT_L)*((x-BX)/BW);
const POLY_TL=[[BX,BY],[VX,BY],[VX,slantY(VX)],[BX,SLANT_L]];
const POLY_TR=[[VX,BY],[BX+BW,BY],[BX+BW,SLANT_R],[VX,slantY(VX)]];
const POLY_BOT=[[BX,SLANT_L],[BX+BW,SLANT_R],[BX+BW,BY+BH],[BX,BY+BH]];

const trick={stage:'cut1',prog:0,lastT:0,cutting:false,sawCD:0,
 drag:null,tl:{x:0,y:0},tr:{x:0,y:0},snappedTL:false,snappedTR:false,popT:0,flash:0};
function resetTrick(){trick.stage='cut1';trick.prog=0;trick.lastT=0;trick.cutting=false;trick.tl={x:0,y:0};trick.tr={x:0,y:0};trick.snappedTL=false;trick.snappedTR=false;trick.popT=0;}

let barCache={};
function barImg(fl){if(barCache[fl])return barCache[fl];const F=FLAVORS[fl];const[c,x]=mkc(BW+4,BH+4);
 // slab
 x.fillStyle=F.lo;x.fillRect(0,0,BW+4,BH+4);
 const cols=5,rows=5,pad=4,cw=(BW-pad*(cols+1))/cols,ch=(BH-pad*(rows+1))/rows;
 for(let r=0;r<rows;r++)for(let cc=0;cc<cols;cc++){const X=2+pad+cc*(cw+pad),Y=2+pad+r*(ch+pad);
  const g=x.createLinearGradient(X,Y,X,Y+ch);g.addColorStop(0,F.hi);g.addColorStop(.5,F.base);g.addColorStop(1,F.lo);x.fillStyle=g;x.fillRect(X,Y,cw,ch);
  x.fillStyle='rgba(255,240,220,.18)';x.fillRect(X,Y,cw,2);x.fillRect(X,Y,2,ch);
  x.fillStyle='rgba(0,0,0,.28)';x.fillRect(X,Y+ch-2,cw,2);x.fillRect(X+cw-2,Y,2,ch);}
 barCache[fl]=c;return c;}

function polyPath(poly,ox,oy){ctx.beginPath();ctx.moveTo(poly[0][0]+ox,poly[0][1]+oy);for(let i=1;i<poly.length;i++)ctx.lineTo(poly[i][0]+ox,poly[i][1]+oy);ctx.closePath();}
function drawPiece(poly,ox,oy,fl){ctx.save();polyPath(poly,ox,oy);ctx.clip();ctx.drawImage(barImg(fl),BX-2+ox,BY-2+oy);ctx.restore();ctx.save();polyPath(poly,ox,oy);ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();}

function drawShop(){
 // dark kitchen wall + counter
 noiseRect(0,0,W,220,'#241a26',1,3); noiseRect(0,220,W,H-220,'#1a1420',1.2,7);
 ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(0,216,W,6);
 // hanging lamp + light cone over the board
 ctx.fillStyle='#0a070d';ctx.fillRect(BX+BW/2-2,0,4,26);ctx.beginPath();ctx.moveTo(BX+BW/2,20);ctx.lineTo(BX+BW/2-26,40);ctx.lineTo(BX+BW/2+26,40);ctx.closePath();ctx.fillStyle='#3a3040';ctx.fill();
 const lg=ctx.createRadialGradient(BX+BW/2,40,10,BX+BW/2,BY+BH,300);lg.addColorStop(0,'rgba(255,214,150,.28)');lg.addColorStop(1,'rgba(255,214,150,0)');ctx.fillStyle=lg;ctx.beginPath();ctx.moveTo(BX+BW/2,36);ctx.lineTo(-40,H);ctx.lineTo(W+40,H);ctx.closePath();ctx.fill();
 // cutting board
 ctx.save();ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=16;ctx.shadowOffsetY=10;
 ctx.fillStyle='#5a4632';ctx.fillRect(BX-24,BY-14,BW+48,BH+34);ctx.restore();
 ctx.fillStyle='#6a5440';ctx.fillRect(BX-24,BY-14,BW+48,5);
 ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=1;for(let i=1;i<7;i++){ctx.beginPath();ctx.moveTo(BX-24+i*(BW+48)/7,BY-9);ctx.lineTo(BX-24+i*(BW+48)/7,BY+BH+18);ctx.stroke();}

 // owned-flavor chips (tap to select which to cut)
 let fx0=BX-14;
 for(const f of S.flavors){const F=FLAVORS[f];const sel=S.curFlavor===f;ctx.fillStyle=sel?'#f0a63c':'#0a070d';ctx.fillRect(fx0-2,300-2,26,26);ctx.fillStyle=F.base;ctx.fillRect(fx0,300,22,22);ctx.fillStyle=F.hi;ctx.fillRect(fx0,300,22,4);ctx.fillStyle=F.lo;ctx.fillRect(fx0,318,22,4);fx0+=32;}
 label('FLAVOR',BX-14,296,'#9c8fa6',7);

 // the bar / pieces
 const st=trick.stage;
 if(st==='cut1'){ if(trick.prog<=0){ctx.drawImage(barImg(S.curFlavor),BX-2,BY-2);} else {drawPiece(POLY_TL,0,0,S.curFlavor);drawPiece(POLY_TR,0,0,S.curFlavor);drawPiece(POLY_BOT,0,0,S.curFlavor);} drawSlantGuide(CUT1,trick.prog); }
 else if(st==='cut2'){ drawPiece(POLY_BOT,0,0,S.curFlavor);drawPiece(POLY_TL,0,0,S.curFlavor);drawPiece(POLY_TR,0,0,S.curFlavor); drawCrack(CUT1); drawVertGuide(trick.prog); }
 else if(st==='rearrange'||st==='pop'){
  drawPiece(POLY_BOT,0,0,S.curFlavor);
  // ghosts (targets) — TL goes right, TR goes left (the swap that frees a square)
  if(st==='rearrange'){ ctx.save();ctx.setLineDash([4,4]);ctx.strokeStyle='rgba(240,166,60,.7)';ctx.lineWidth=2; polyPath(POLY_TL,VX-BX,0);ctx.stroke(); polyPath(POLY_TR,-(VX-BX),0);ctx.stroke(); ctx.restore(); }
  const tlo=trick.snappedTL?{x:VX-BX,y:0}:trick.tl, tro=trick.snappedTR?{x:-(VX-BX),y:0}:trick.tr;
  drawPiece(POLY_BOT,0,0,S.curFlavor); // keep bottom
  drawPiece(POLY_TR,tro.x,tro.y,S.curFlavor);
  drawPiece(POLY_TL,tlo.x,tlo.y,S.curFlavor);
  if(st==='pop'){ const t=trick.popT; const py=BY+BH-20-easeOut(Math.min(1,t/0.5))*40; const a=Math.min(1,t/0.3); ctx.globalAlpha=a; const F=FLAVORS[S.curFlavor]; ctx.fillStyle=F.base;ctx.fillRect(BX+BW-30,py,24,24);ctx.fillStyle=F.hi;ctx.fillRect(BX+BW-30,py,24,4);ctx.fillStyle=F.lo;ctx.fillRect(BX+BW-30,py+20,24,4);ctx.globalAlpha=1; }
 }
 // flash on complete
 if(trick.flash>0){ctx.fillStyle=`rgba(255,240,220,${trick.flash})`;ctx.fillRect(BX-6,BY-6,BW+12,BH+12);}

 drawKnife();

 // inventory readout (bottom-left, subtle)
 let iy=336; label('BAG',10,iy,'#9c8fa6',7);
 let ix=44; for(const f of S.flavors){const n=piecesOf(f);if(n<=0)continue;const F=FLAVORS[f];ctx.fillStyle=F.base;ctx.fillRect(ix,iy-8,10,10);ctx.fillStyle=F.hi;ctx.fillRect(ix,iy-8,10,3);label('x'+n,ix+13,iy,'#e9dfd0',7);ix+=44;}

 // step hint
 const hints={cut1:'DRAG THE KNIFE ALONG THE DOTTED SLANT',cut2:'NOW MAKE THE VERTICAL CUT',rearrange:'DRAG THE TWO TOP PIECES INTO THE GHOSTS',pop:''};
 if(hints[st])label(hints[st],BX-10,BY-24,'#f0a63c',7);
}
function drawSlantGuide(line,prog){const px2=line.x1+(line.x2-line.x1)*prog,py=line.y1+(line.y2-line.y1)*prog;
 if(prog>0){ctx.strokeStyle='#0a070d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(line.x1,line.y1);ctx.lineTo(px2,py);ctx.stroke();}
 ctx.save();ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.lineDashOffset=-nowT*16;ctx.beginPath();ctx.moveTo(px2,py);ctx.lineTo(line.x2,line.y2);ctx.stroke();ctx.restore();
 const p=2+Math.sin(nowT*7);ctx.fillStyle='#f0a63c';ctx.fillRect(px2-p/2,py-p/2,p,p);}
function drawVertGuide(prog){const y2=CUT2.y1+(CUT2.y2-CUT2.y1)*prog;
 if(prog>0){ctx.strokeStyle='#0a070d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(VX,CUT2.y1);ctx.lineTo(VX,y2);ctx.stroke();}
 ctx.save();ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.lineDashOffset=-nowT*16;ctx.beginPath();ctx.moveTo(VX,y2);ctx.lineTo(VX,CUT2.y2);ctx.stroke();ctx.restore();}
function drawCrack(line){ctx.strokeStyle='#0a070d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(line.x1,line.y1);ctx.lineTo(line.x2,line.y2);ctx.stroke();}
function drawKnife(){ if(loc!=='shop')return; let x,y,ang;
 if(trick.stage==='cut1'||trick.stage==='cut2'){ const line=trick.stage==='cut1'?CUT1:{x1:VX,y1:CUT2.y1,x2:VX,y2:CUT2.y2};
  if(ptr.down&&ptr.on){x=ptr.x;y=ptr.y;} else {const t=0.12;x=line.x1+(line.x2-line.x1)*t;y=line.y1+(line.y2-line.y1)*t+Math.sin(nowT*3)*2;}
  ang=Math.atan2(line.y2-line.y1,line.x2-line.x1); }
 else return;
 ctx.save();ctx.translate(x,y-6);ctx.rotate(ang+Math.PI*0.28);
 ctx.fillStyle='#c8d0d8';ctx.fillRect(-4,-5,30,9);ctx.fillStyle='#eef2f6';ctx.fillRect(-4,-5,28,2);ctx.fillStyle='#5b3a22';ctx.fillRect(26,-6,14,11);ctx.restore();}

/* shop input */
function shopDown(x,y){
 // flavor chips
 let fx0=BX-16;for(const f of S.flavors){if(x>fx0&&x<fx0+26&&y>296&&y<324){S.curFlavor=f;sfx.tap();save();return;}fx0+=32;}
 const st=trick.stage;
 if(st==='cut1'){const pr=proj(CUT1,x,y);if(pr.d<18){trick.cutting=true;trick.lastT=pr.t;ptr.on=true;}}
 else if(st==='cut2'){const line={x1:VX,y1:CUT2.y1,x2:VX,y2:CUT2.y2};const pr=proj(line,x,y);if(pr.d<18){trick.cutting=true;trick.lastT=pr.t;ptr.on=true;}}
 else if(st==='rearrange'){ if(!trick.snappedTR&&inPoly(x,y,POLY_TR,trick.tr.x,trick.tr.y)){trick.drag='tr';sfx.slide();} else if(!trick.snappedTL&&inPoly(x,y,POLY_TL,trick.tl.x,trick.tl.y)){trick.drag='tl';sfx.slide();} }
}
function shopMove(x,y){
 const st=trick.stage;
 if((st==='cut1'||st==='cut2')&&trick.cutting){const line=st==='cut1'?CUT1:{x1:VX,y1:CUT2.y1,x2:VX,y2:CUT2.y2};const pr=proj(line,x,y);if(pr.d<22){ptr.on=true;const dl=Math.abs(pr.t-trick.lastT);if(dl>0&&dl<0.4){trick.prog=clamp(trick.prog+dl*0.7,0,1);if(trick.sawCD<=0){sfx.saw();trick.sawCD=.06;}pushFx({type:'crumb',x:pr.cx,y:pr.cy,vx:rnd(-40,40),vy:-rnd(20,80),g:400,t:0,life:.5,c:FLAVORS[S.curFlavor].lo,s:2});}trick.lastT=pr.t;} else ptr.on=false;}
 // rearrange dragging is handled in the pointermove listener
}
function proj(line,px2,py){const dx=line.x2-line.x1,dy=line.y2-line.y1,l2=dx*dx+dy*dy;let t=((px2-line.x1)*dx+(py-line.y1)*dy)/l2;t=clamp(t,0,1);const cx=line.x1+dx*t,cy=line.y1+dy*t;return{t,d:Math.hypot(px2-cx,py-cy),cx,cy};}
function inPoly(px2,py,poly,ox,oy){let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0]+ox,yi=poly[i][1]+oy,xj=poly[j][0]+ox,yj=poly[j][1]+oy;if(((yi>py)!==(yj>py))&&(px2<(xj-xi)*(py-yi)/(yj-yi)+xi))ins=!ins;}return ins;}

/* ============================================================
   STORE scene — basket shopping + cashier
   ============================================================ */
const basket=[]; // {id,...item}
let shelfHit=[]; // clickable product rects [{x,y,w,h,item}]
function drawStore(){
 noiseRect(0,0,W,H,'#14101a',1,11);
 // floor
 ctx.fillStyle='#0e0b12';ctx.fillRect(0,280,W,H-280);for(let x=0;x<W;x+=32){ctx.strokeStyle='rgba(255,255,255,.04)';ctx.beginPath();ctx.moveTo(x,280);ctx.lineTo(x,H);ctx.stroke();}
 // neon sign
 ctx.save();ctx.shadowColor='#54e0c8';ctx.shadowBlur=14;label('24H  SWEET SUPPLIES',W/2-108,30,'#54e0c8',9);ctx.restore();
 // shelves with products
 const items=storeItems(); shelfHit=[];
 const cols=4, cellW=132, cellH=96, x0=40, y0=54;
 items.forEach((it,i)=>{const c=i%cols,r=Math.floor(i/cols);const X=x0+c*cellW,Y=y0+r*cellH;
  // shelf plank
  ctx.fillStyle='#2a2030';ctx.fillRect(X-8,Y+70,cellW-8,6);ctx.fillStyle='#1a1420';ctx.fillRect(X-8,Y+76,cellW-8,3);
  // product box
  const owned=it.owned;
  ctx.fillStyle=owned?'#171220':'#221a2a';ctx.fillRect(X,Y,cellW-16,66);ctx.strokeStyle='#0a070d';ctx.lineWidth=2;ctx.strokeRect(X,Y,cellW-16,66);
  ctx.drawImage(itemIcon(it,40),X+8,Y+8);
  label(it.name.length>13?it.name.slice(0,12)+'…':it.name,X+52,Y+18,'#e9dfd0',7);
  if(owned)label('OWNED',X+52,Y+40,'#7ed67e',7);
  else{label(CUR+fmt(it.price),X+52,Y+40,'#f0a63c',8);label('drag →',X+52,Y+56,'#6b5f74',7);}
  if(!owned&&!basket.find(b=>b.id===it.id))shelfHit.push({x:X,y:Y,w:cellW-16,h:66,item:it});
 });
 // basket
 const bx=W-190,by=252,bw=180,bh=96;
 ctx.fillStyle='#0a070d';ctx.fillRect(bx-4,by-4,bw+8,bh+8);
 ctx.fillStyle='#2a2030';ctx.fillRect(bx,by,bw,bh);ctx.strokeStyle=canPay()?'#54e0c8':'#3a2c42';ctx.lineWidth=2;ctx.strokeRect(bx,by,bw,bh);
 label('BASKET',bx+6,by+14,'#54e0c8',7);
 let total=0; basket.forEach((b,i)=>{total+=b.price;label(('- '+b.name).slice(0,20),bx+6,by+30+i*13,'#e9dfd0',7);});
 label('TOTAL '+CUR+fmt(total),bx+6,by+bh-8,total<=S.money?'#f0a63c':'#e5504a',8);
 // cashier (decorative — you pay by tapping the basket)
 drawCashier(300,250);
 // pay button
 const pb={x:bx,y:by+bh+6,w:bw,h:0}; // (drawn as text button below basket via label; hit handled separately)
 storePay={x:bx,y:by,w:bw,h:bh,total};
 // dragging item
 if(dragItem){ctx.drawImage(itemIcon(dragItem,40),ptr.x-20,ptr.y-20);}
 label('DRAG PRODUCTS INTO THE BASKET, THEN TAP IT TO PAY THE CASHIER',44,H-12,'#6b5f74',7);
}
let storePay=null, dragItem=null, dragFrom=null;
function drawCashier(x,y){ // pixel clerk behind a counter
 ctx.drawImage(custImg(777),x,y-8,16*2,22*2); // scaled clerk
 ctx.fillStyle='#3a2c42';ctx.fillRect(x-14,y+34,76,26);ctx.fillStyle='#2a2030';ctx.fillRect(x-14,y+34,76,4);
 ctx.fillStyle='#54e0c8';ctx.fillRect(x+40,y+40,16,10);ctx.fillStyle='#0a070d';ctx.fillRect(x+42,y+42,12,2);
 label('CASHIER',x-4,y-14,'#9c8fa6',7);
}
function canPay(){let t=0;basket.forEach(b=>t+=b.price);return basket.length>0&&t<=S.money;}
function storeDown(x,y){
 // start dragging a product
 for(const h of shelfHit){if(x>h.x&&x<h.x+h.w&&y>h.y&&y<h.y+h.h){dragItem=h.item;sfx.tap();return;}}
 // tap basket to pay
 if(storePay&&x>storePay.x&&x<storePay.x+storePay.w&&y>storePay.y&&y<storePay.y+storePay.h){payBasket();}
}
function storeUp(x,y){
 if(dragItem){ if(storePay&&x>storePay.x-30&&x<storePay.x+storePay.w+30&&y>storePay.y-30){ if(!basket.find(b=>b.id===dragItem.id)){basket.push(dragItem);sfx.slide();} } dragItem=null; }
}
function payBasket(){ if(basket.length===0){sfx.nope();return;} let t=0;basket.forEach(b=>t+=b.price); if(t>S.money){sfx.nope();wtoast('Not enough '+CUR);return;}
 S.money-=t; basket.forEach(b=>applyPurchase(b)); const n=basket.length; basket.length=0; sfx.buy();flashCash();syncCash();wtoast('Bought '+n+' item'+(n>1?'s':'')+'!',true); save();
 if(S.tutStep<8)S.tutStep=8;
}
function applyPurchase(it){ if(it.kind==='flavor'){if(!S.flavors.includes(it.flavor))S.flavors.push(it.flavor);S.curFlavor=it.flavor;} else if(it.kind==='knife'){S.knife=it.knife;} else if(it.kind==='perk'){if(!S.perks.includes(it.perk))S.perks.push(it.perk);} }

/* ============================================================
   APARTMENT scene — lobby, elevator, floors, doors, delivery
   ============================================================ */
let apt={view:'lobby',floor:1,liftY:0,liftTarget:0,moving:false,openDoor:-1,custSeed:0,custY:0};
function enterApartment(){apt.view='lobby';apt.floor=1;apt.moving=false;apt.openDoor=-1;}
function drawApartment(){
 noiseRect(0,0,W,H,'#100c14',1.3,17);
 if(apt.view==='lobby'){
  label(BUILDING+' APARTMENTS',W/2-96,28,'#f0a63c',9);
  label('PICK A FLOOR',W/2-52,48,'#9c8fa6',7);
  // elevator panel with floor buttons
  const px0=W/2-90,py0=70; ctx.fillStyle='#2a2030';ctx.fillRect(px0-10,py0-10,196,230);ctx.strokeStyle='#0a070d';ctx.lineWidth=3;ctx.strokeRect(px0-10,py0-10,196,230);
  label('LIFT',px0+70,py0+4,'#54e0c8',7);
  for(let f=FLOORS;f>=1;f--){const idx=FLOORS-f;const r=Math.floor(idx/2),c=idx%2;const bx=px0+c*92,by=py0+16+r*66;
   const isActive=S.active&&S.active.floor===f;
   ctx.fillStyle=isActive?'#3a3018':'#171220';ctx.fillRect(bx,by,80,54);ctx.strokeStyle=isActive?'#f0a63c':'#3a2c42';ctx.lineWidth=2;ctx.strokeRect(bx,by,80,54);
   label('FLR '+f,bx+16,by+26,'#e9dfd0',9);
   if(isActive)label('* JOB HERE',bx+10,by+44,'#f0a63c',7);
   aptFloorHit[idx]={x:bx,y:by,w:80,h:54,floor:f};}
  if(S.active)label('DELIVER TO  '+BUILDING.toUpperCase()+'  '+S.active.floor+S.active.door,W/2-120,H-16,'#54e0c8',8);
  else label('NO ACTIVE JOB — CHECK YOUR PHONE (JOBS APP)',W/2-140,H-16,'#6b5f74',7);
 } else {
  // hallway on a floor
  drawHallway();
 }
 // lift cabin motion overlay
 if(apt.moving){ctx.fillStyle='rgba(0,0,0,'+(0.6)+')';ctx.fillRect(0,0,W,H);label('▲ FLOOR '+apt.floor+' ▲',W/2-56,H/2,'#54e0c8',10);}
}
let aptFloorHit=[], aptDoorHit=[];
function drawHallway(){
 // corridor perspective
 ctx.fillStyle='#1a1522';ctx.fillRect(0,60,W,220);
 ctx.fillStyle='#0e0b12';ctx.fillRect(0,280,W,H-280);
 ctx.fillStyle='#241c2e';ctx.fillRect(0,60,W,10);
 // ceiling lights
 for(let i=0;i<4;i++){const lx=90+i*150;const g=ctx.createRadialGradient(lx,70,4,lx,180,140);g.addColorStop(0,'rgba(240,200,140,.22)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(lx-90,60,180,220);ctx.fillStyle='#f0d69a';ctx.fillRect(lx-8,62,16,4);}
 label('FLOOR '+apt.floor,20,44,'#f0a63c',9);
 // back button
 ctx.fillStyle='#2a2030';ctx.fillRect(W-92,20,72,26);ctx.strokeStyle='#3a2c42';ctx.strokeRect(W-92,20,72,26);label('< LIFT',W-84,38,'#e9dfd0',7);
 aptDoorHit=[];
 // doors
 const n=DOORS.length,gap=W/(n+1);
 for(let i=0;i<n;i++){const dx=gap*(i+1)-26,dy=120,dw=52,dh=150;const addr=apt.floor+DOORS[i];
  const isTarget=S.active&&S.active.floor===apt.floor&&S.active.door===DOORS[i];
  const open=apt.openDoor===i;
  // frame
  ctx.fillStyle='#0a070d';ctx.fillRect(dx-4,dy-4,dw+8,dh+8);
  ctx.fillStyle='#2a2030';ctx.fillRect(dx-4,dy-4,dw+8,4);
  if(open){ // opened — show customer inside
   ctx.fillStyle='#070509';ctx.fillRect(dx,dy,dw,dh);
   const seed=apt.custSeed;ctx.drawImage(custImg(seed),dx+dw/2-16,dy+dh-70+apt.custY,32,44);
   ctx.fillStyle='#3a2c42';ctx.fillRect(dx-8,dy,6,dh); // door swung open
  } else {
   const g=ctx.createLinearGradient(dx,dy,dx+dw,dy);g.addColorStop(0,'#4a3a2a');g.addColorStop(.5,'#5a4632');g.addColorStop(1,'#3a2c20');ctx.fillStyle=g;ctx.fillRect(dx,dy,dw,dh);
   ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(dx+6,dy+10,dw-12,60);ctx.fillRect(dx+6,dy+80,dw-12,60);
   ctx.fillStyle='#c9a13a';ctx.fillRect(dx+dw-12,dy+dh/2-2,5,5);
  }
  // number plate
  ctx.fillStyle=isTarget?'#f0a63c':'#c9b58a';ctx.fillRect(dx+dw/2-13,dy-2,26,12);label(addr,dx+dw/2-11,dy+8,'#0a070d',7);
  if(isTarget&&!open){ctx.save();ctx.strokeStyle='rgba(240,166,60,'+(0.5+Math.sin(nowT*5)*0.3)+')';ctx.lineWidth=3;ctx.strokeRect(dx-4,dy-4,dw+8,dh+8);ctx.restore();
   label('DELIVER HERE',dx-16,dy-14,'#f0a63c',7);}
  aptDoorHit.push({x:dx-4,y:dy-4,w:dw+8,h:dh+8,door:DOORS[i],idx:i});
 }
}
function aptDown(x,y){
 if(apt.moving)return;
 if(apt.view==='lobby'){ for(const h of aptFloorHit){if(h&&x>h.x&&x<h.x+h.w&&y>h.y&&y<h.y+h.h){goFloor(h.floor);return;}} }
 else {
  if(x>W-92&&x<W-20&&y>20&&y<46){apt.view='lobby';sfx.tap();return;}
  for(const h of aptDoorHit){if(x>h.x&&x<h.x+h.w&&y>h.y&&y<h.y+h.h){knockDoor(h);return;}}
 }
}
function goFloor(f){apt.floor=f;apt.moving=true;sfx.lift();setTimeout(()=>{apt.moving=false;apt.view='hall';apt.openDoor=-1;sfx.open();},900);}
function knockDoor(h){
 sfx.knock();
 const isTarget=S.active&&S.active.floor===apt.floor&&S.active.door===h.door;
 if(!isTarget){wtoast('Nobody home for you here.');return;}
 if(!canDeliver()){wtoast('You need '+S.active.qty+' '+FLAVORS[S.active.flavor].name+' pieces — go cut some!');sfx.nope();return;}
 apt.openDoor=h.idx;apt.custSeed=1000+S.active.floor*10+h.idx;apt.custY=8;
 setTimeout(()=>{ completeDelivery(); apt.custY=0;
   pushFx({type:'flyaddr'}); setTimeout(()=>{apt.openDoor=-1;},900); },700);
}

/* ============================================================
   FX
   ============================================================ */
function stepFx(dt){ if(shakeT>0)shakeT-=dt; if(trick.flash>0)trick.flash=Math.max(0,trick.flash-dt*3); if(trick.sawCD>0)trick.sawCD-=dt;
 for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.t+=dt;if(f.t>=f.life){fx.splice(i,1);continue;}if(f.type==='crumb'){f.vy+=(f.g||0)*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;}else if(f.type==='spark'){f.x+=f.vx*dt;f.y+=f.vy*dt;}}}
function drawFx(){ for(const f of fx){const k=f.t/f.life; if(f.type==='crumb'){ctx.globalAlpha=1-k;ctx.fillStyle=f.c;ctx.fillRect(f.x,f.y,f.s,f.s);ctx.globalAlpha=1;} else if(f.type==='spark'){ctx.globalAlpha=1-k;ctx.fillStyle=f.c||'#f0a63c';ctx.fillRect(f.x-1,f.y,3,1);ctx.fillRect(f.x,f.y-1,1,3);ctx.globalAlpha=1;}}}
function sparkle(x,y,n){for(let i=0;i<n;i++)pushFx({type:'spark',x:x+rnd(-8,8),y:y+rnd(-8,8),vx:rnd(-30,30),vy:rnd(-40,10),t:0,life:rnd(.3,.7),c:Math.random()<.5?'#f0a63c':'#fff'});}

/* ============================================================
   TRICK STEP (advance stages)
   ============================================================ */
function stepTrick(dt){
 if(loc!=='shop')return;
 const st=trick.stage;
 if(st==='cut1'||st==='cut2'){ if(trick.prog>=1){ sfx.snap();shake(3,.15);sparkle(trick.stage==='cut1'?BX+BW:VX,SLANT_R,5);
   if(st==='cut1'){trick.stage='cut2';trick.prog=0;trick.lastT=0;if(S.tutStep<3)S.tutStep=3;}
   else{trick.stage='rearrange';trick.prog=0;trick.tl={x:0,y:0};trick.tr={x:0,y:0};if(S.tutStep<4)S.tutStep=4;}
   trick.cutting=false; } }
 else if(st==='pop'){ trick.popT+=dt; if(trick.popT>0.55&&!trick._collected){trick._collected=true;sfx.collect();sparkle(BX+BW-18,BY+BH-30,10);addPiece(S.curFlavor,knife().bonus);flashCash();}
   if(trick.popT>1.1){trick._collected=false;trick.flash=0.9;resetTrick();if(S.tutStep<5)S.tutStep=5;} }
}
function tryAdvanceRearrange(){ if(trick.snappedTL&&trick.snappedTR){trick.stage='pop';trick.popT=0;sfx.pop();shake(2,.12);} }

/* ============================================================
   POINTER (world canvas)
   ============================================================ */
const ptr={x:0,y:0,down:false,on:false};
function cpos(e){const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)};}
cv.addEventListener('pointerdown',e=>{Snd.init();Snd.resume();const p=cpos(e);ptr.x=p.x;ptr.y=p.y;ptr.down=true;cv.setPointerCapture(e.pointerId);
 if(loc==='shop')shopDown(p.x,p.y); else if(loc==='store')storeDown(p.x,p.y); else if(loc==='apartment')aptDown(p.x,p.y);});
cv.addEventListener('pointermove',e=>{const p=cpos(e);ptr.x=p.x;ptr.y=p.y;
 if(loc==='shop'){ shopMove(p.x,p.y);
   if(trick.stage==='rearrange'&&trick.drag&&ptr.down){ const o=trick.drag==='tr'?trick.tr:trick.tl; // move piece by delta from its home anchor
     const homeX=trick.drag==='tr'?(VX+ (BX+BW))/2:(BX+VX)/2, homeY=(BY+SLANT_R)/2;
     o.x=p.x-homeX; o.y=p.y-homeY; }
 }
 // cursor
 cv.className=(loc==='store'&&dragItem)?'grab':(loc==='apartment'||loc==='store')?'point':(loc==='shop'&&(trick.stage==='rearrange'))?'hand':'';
});
function worldUp(){ if(loc==='store')storeUp(ptr.x,ptr.y);
 if(loc==='shop'){ trick.cutting=false;ptr.on=false;
   if(trick.stage==='rearrange'&&trick.drag){ const which=trick.drag;
     if(which==='tr'){const gx=-(VX-BX),gy=0; if(dist(trick.tr.x,trick.tr.y,gx,gy)<34){trick.tr={x:gx,y:gy};trick.snappedTR=true;sfx.snap();} else trick.tr={x:0,y:0}; }
     else{const gx=(VX-BX),gy=0; if(dist(trick.tl.x,trick.tl.y,gx,gy)<34){trick.tl={x:gx,y:gy};trick.snappedTL=true;sfx.snap();} else trick.tl={x:0,y:0}; }
     trick.drag=null; tryAdvanceRearrange(); }
 }
 ptr.down=false; }
window.addEventListener('pointerup',worldUp);
window.addEventListener('pointercancel',worldUp);

/* ============================================================
   PHONE OS  (DOM)
   ============================================================ */
const $=id=>document.getElementById(id);
let phoneOpen=false, app='home', appStack=[];
function openPhone(){phoneOpen=true;$('phone').classList.remove('closed');app='home';renderApp();sfx.open();}
function closePhone(){phoneOpen=false;$('phone').classList.add('closed');}
function goApp(a){appStack.push(app);app=a;sfx.tap();renderApp();}
function backApp(){app=appStack.pop()||'home';sfx.tap();renderApp();}
function buzzPhone(){const b=$('phone-btn');b.classList.remove('buzz');void b.offsetWidth;b.classList.add('buzz');sfx.buzz();}

function renderApp(){
 const scr=$('phone-screen'); if(!scr)return;
 $('ph-cash').textContent=CUR+fmt(S.money);
 if(app==='home')scr.innerHTML=homeHTML();
 else if(app==='map')scr.innerHTML=mapHTML();
 else if(app==='jobs')scr.innerHTML=jobsHTML();
 else if(app==='store')scr.innerHTML=storeInfoHTML();
 else if(app==='wallet')scr.innerHTML=walletHTML();
 wireApp();
}
function homeHTML(){
 const jobsN=S.jobs.length;
 return `<div class="home-wall"><div class="home-clock">9:41</div><div class="home-date">CHOCO-CITY · FRI</div></div>
 <div class="app-grid">
  <div class="app" data-app="map"><div class="app-ico" style="background:#1c3328" data-icon="map"></div><div class="app-name">Map</div></div>
  <div class="app" data-app="jobs"><div class="app-ico" style="background:#2a2018" data-icon="jobs">${jobsN?`<span class="app-badge">${jobsN}</span>`:''}</div><div class="app-name">Jobs</div></div>
  <div class="app" data-app="store"><div class="app-ico" style="background:#12241f" data-icon="store"></div><div class="app-name">Store</div></div>
  <div class="app" data-app="wallet"><div class="app-ico" style="background:#241a10" data-icon="wallet"></div><div class="app-name">Wallet</div></div>
 </div>
 ${S.active?`<div class="card" style="margin-top:14px"><div class="row-title">▶ Active delivery</div><div class="row-sub">${S.active.qty}× ${FLAVORS[S.active.flavor].name} → ${BUILDING} ${S.active.addr} · +${CUR}${fmt(S.active.reward)}</div></div>`:''}`;
}
function locData(){return[
 {id:'shop',name:'Your Shop',sub:'Cut the impossible bar',icon:'shop'},
 {id:'store',name:'24H Sweet Supplies',sub:'Flavors · knives · perks',icon:'store'},
 {id:'apartment',name:BUILDING+' Apartments',sub:S.active?('Deliver to '+S.active.addr):'Delivery destination',icon:'apt'}
];}
function mapHTML(){ return `<div class="scr-title">CITY MAP</div>`+locData().map(l=>`
 <div class="card"><div class="map-loc"><div class="mi" style="background:#0e0b12" data-icon="${l.icon}"></div>
 <div><div class="row-title">${l.name}</div><div class="row-sub">${l.sub}</div></div>
 ${loc===l.id?'<span class="here">HERE</span>':`<button class="pbtn" data-travel="${l.id}">GO</button>`}</div></div>`).join('');
}
function jobsHTML(){ refillJobs();
 let h=`<div class="scr-title">DELIVERY JOBS</div>`;
 if(S.active)h+=`<div class="card" style="border-color:#f0a63c"><div class="row"><div><div class="row-title">▶ ${S.active.qty}× ${FLAVORS[S.active.flavor].name}</div><div class="row-sub">${BUILDING} ${S.active.addr} · +${CUR}${fmt(S.active.reward)}</div></div><span class="pill ${canDeliver()?'ok':''}">${piecesOf(S.active.flavor)}/${S.active.qty} ready</span></div><button class="pbtn ghost wide" data-cancel="1">DROP JOB</button></div>`;
 h+=`<div class="row-sub" style="margin:6px 2px">Available around town:</div>`;
 h+=S.jobs.map(j=>`<div class="card"><div class="row"><div><div class="row-title">${j.qty}× ${FLAVORS[j.flavor].name} pieces</div><div class="row-sub">${BUILDING} ${j.addr} · pays +${CUR}${fmt(j.reward)}</div></div>${S.active?'<span class="pill">busy</span>':`<button class="pbtn" data-accept="${j.id}">ACCEPT</button>`}</div></div>`).join('');
 return h;
}
function storeInfoHTML(){ return `<div class="scr-title">SWEET SUPPLIES</div>
 <div class="card"><div class="row-title">Walk over to shop in person</div><div class="row-sub">The store is on the map. Drag products into your basket and pay the cashier for flavors, knives & perks.</div></div>
 ${loc==='store'?'<div class="row-sub" style="text-align:center;color:#54e0c8">You are at the store — pocket the phone.</div>':'<button class="pbtn wide" data-travel="store">TRAVEL TO STORE</button>'}`;
}
function walletHTML(){ return `<div class="wallet-big">${CUR}${fmt(S.money)}</div><div class="wallet-lbl">BALANCE</div>
 <div class="stat-line"><span>Deliveries done</span><b>${S.ordersDone}</b></div>
 <div class="stat-line"><span>Knife</span><b>${knife().name}</b></div>
 <div class="stat-line"><span>Flavors</span><b>${S.flavors.length}/${FLAV_ORDER.length}</b></div>
 <div class="stat-line"><span>Perks</span><b>${S.perks.length?S.perks.join(', '):'none'}</b></div>
 <div class="stat-line"><span>In the bag</span><b>${S.flavors.map(f=>piecesOf(f)?piecesOf(f)+FLAVORS[f].name[0]:'').filter(Boolean).join(' ')||'empty'}</b></div>`;
}
function wireApp(){
 // draw icon canvases
 document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML='';el.appendChild(appIcon(el.dataset.icon,el.classList.contains('mi')?32:40));});
 document.querySelectorAll('.app').forEach(a=>a.onclick=()=>goApp(a.dataset.app));
 document.querySelectorAll('[data-travel]').forEach(b=>b.onclick=()=>travel(b.dataset.travel));
 document.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>acceptJob(b.dataset.accept));
 document.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{S.jobs.unshift(S.active);S.active=null;while(S.jobs.length>3)S.jobs.pop();sfx.tap();save();renderApp();});
}
function travel(to){ loc=to; if(to==='apartment')enterApartment(); if(to==='shop')resetTrick(); if(to==='store')basket.length=0;
 closePhone(); sfx.open(); setSceneLabel(); syncCash();
 if(to==='apartment'&&S.tutStep<7)S.tutStep=7; if(to==='store'&&S.tutStep<6)S.tutStep=6; }

/* ============================================================
   HUD-lite (cash chip, scene label, toasts)
   ============================================================ */
function syncCash(){$('cash').textContent=fmt(S.money);$('ph-cash')&&($('ph-cash').textContent=CUR+fmt(S.money));}
function flashCash(){const c=$('cash-chip');c.classList.remove('flash');void c.offsetWidth;c.classList.add('flash');syncCash();}
function setSceneLabel(){$('scene-name').textContent={shop:'Your Shop',store:'Sweet Supplies',apartment:BUILDING}[loc]||'';}
function wtoast(msg,gold){const box=$('w-toasts');const el=document.createElement('div');el.className='w-toast'+(gold?' gold':'');el.textContent=msg;box.appendChild(el);while(box.children.length>3)box.removeChild(box.firstChild);setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),320);},2400);}

/* ============================================================
   RENDER LOOP
   ============================================================ */
function draw(){ ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H); ctx.save();
 if(shakeT>0){const k=shakeT/.15;ctx.translate(rnd(-1,1)*shakeMag*k,rnd(-1,1)*shakeMag*k);}
 if(loc==='shop')drawShop(); else if(loc==='store')drawStore(); else drawApartment();
 drawFx(); ctx.restore(); vignette();
}
let lastF=0,saveT=0;
function frame(ts){const t=ts/1000;let dt=t-lastF;lastF=t;if(dt>.1)dt=.1;if(dt<0)dt=0;nowT=t;
 stepTrick(dt); stepFx(dt);
 if(apt.openDoor>=0&&apt.custY>0)apt.custY=Math.max(0,apt.custY-dt*20);
 draw();
 saveT+=dt;if(saveT>6){saveT=0;save();}
 requestAnimationFrame(frame);}

/* ============================================================
   PHONE buttons + overlay + boot
   ============================================================ */
$('phone-btn').addEventListener('click',()=>{Snd.init();Snd.resume();phoneOpen?closePhone():openPhone();});
$('ph-close').addEventListener('click',closePhone);
$('ph-home').addEventListener('click',()=>{app='home';appStack=[];renderApp();sfx.tap();});
$('ph-back').addEventListener('click',backApp);

let resetArmed=false,resetTmr=null;
// reset via long-press on cash chip (hidden, keeps UI clean)
$('cash-chip').addEventListener('click',()=>{ if(!resetArmed){resetArmed=true;wtoast('Tap cash again to WIPE save');resetTmr=setTimeout(()=>resetArmed=false,2200);} else {resetting=true;try{localStorage.removeItem(SAVE_KEY);}catch(e){}location.reload();} });

function showOverlay(title,text,btn,onClose){$('overlay-title').textContent=title;$('overlay-text').innerHTML=text;$('overlay-btn').textContent=btn||'OK';$('overlay').classList.add('show');$('overlay-btn').onclick=()=>{Snd.init();Snd.resume();sfx.tap();$('overlay').classList.remove('show');if(onClose)onClose();};}

function boot(){
 const had=load(); refillJobs(); setSceneLabel(); syncCash();
 if(!S.seenIntro){S.seenIntro=true;save();
  showOverlay('INFINITE CHOCO.CO',
   `You took over a grimy little shop on the wrong side of Choco-City with one <b>endless chocolate bar</b>.<br><br>`+
   `<span class="dim">Slice the bar with the impossible trick to pull free pieces out of nowhere. Pick up delivery jobs on your <b>phone</b>, travel the <b>map</b>, ride the lift up the apartments and drop orders at the right door. Spend your cut at the 24H store.</span><br><br>`+
   `<span class="dim">Tap the phone (bottom-right) any time.</span>`,
   'START HUSTLING', ()=>{ openPhone(); app='jobs'; renderApp(); });
 } else $('overlay').classList.remove('show');
 requestAnimationFrame(t=>{lastF=t/1000;requestAnimationFrame(frame);});
}
window.addEventListener('beforeunload',()=>{if(!document.hidden)save();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});

/* debug hooks */
window.GAME={get S(){return S;},get loc(){return loc;},get trick(){return trick;},get apt(){return apt;},get basket(){return basket;},
 fmt,travel,openPhone,closePhone,goApp,acceptJob,piecesOf,canDeliver,completeDelivery,
 finishTrick(){addPiece(S.curFlavor,knife().bonus);syncCash();}, // shortcut for tests
 addPiece,give:n=>{S.money+=n;syncCash();renderApp();},
 setStage:s=>{trick.stage=s;}, snapRearrange(){trick.tl={x:VX-BX,y:0};trick.tr={x:-(VX-BX),y:0};trick.snappedTL=true;trick.snappedTR=true;tryAdvanceRearrange();},
 storeAdd(id){const it=storeItems().find(i=>i.id===id);if(it&&!basket.find(b=>b.id===id))basket.push(it);}, pay:payBasket,
 goFloor,knockAt(door){const h={door,idx:DOORS.indexOf(door)};knockDoor(h);},
 reset(){resetting=true;try{localStorage.removeItem(SAVE_KEY);}catch(e){}location.reload();}};

if(document.fonts&&document.fonts.load)document.fonts.load('8px PX').catch(()=>{}).finally(boot); else boot();
