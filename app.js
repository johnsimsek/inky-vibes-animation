const journey=document.querySelector('.journey'),stage=document.querySelector('#stage'),phases=[...document.querySelectorAll('.scene-copy')];
let frozen=matchMedia('(prefers-reduced-motion: reduce)').matches,current=0,target=0,dirty=true,renderScene=null;
function measure(){target=Math.max(0,Math.min(1,-journey.getBoundingClientRect().top/(journey.offsetHeight-innerHeight)));dirty=true}addEventListener('scroll',measure,{passive:true});addEventListener('resize',measure);measure();
const finishCTA=document.querySelector('#finish-cta'),bookNow=document.querySelector('#book-now');
function setCopy(p){p=frozen?1:p;document.querySelector('#progress').style.width=`${p*100}%`;const visible=p>=.965;finishCTA.style.opacity=Math.max(0,Math.min(1,(p-.965)/.025));finishCTA.setAttribute('aria-hidden',String(!visible));bookNow.disabled=!visible;bookNow.tabIndex=visible?0:-1;finishCTA.style.pointerEvents=visible?'auto':'none'}
const sceneLayer=document.querySelector('#tattoo-scene'),hand=document.querySelector('#artist-hand'),workLight=document.querySelector('#work-light'),contact=document.querySelector('#needle-contact'),surface=document.querySelector('#surface-ink'),ctx=surface.getContext('2d'),letterCanvas=document.querySelector('#lettering-canvas'),letterCtx=letterCanvas.getContext('2d'),prep=document.querySelector('#ink-prep'),bottle=document.querySelector('#ink-bottle'),drops=document.querySelector('#pour-drops'),cupFill=document.querySelector('#cup-fill'),cupSurface=document.querySelector('#cup-ink-surface'),ripple=document.querySelector('#cup-ripple');
const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n)},mix=(a,b,t)=>a+(b-a)*t;
let sceneW=1536,sceneH=1024,letterPoints=[],strokePaths=[],strokeWeight=0,artReady=false;
const artwork=new Image(),mask=document.createElement('canvas'),letteringInk=document.createElement('canvas');mask.width=letteringInk.width=1024;mask.height=letteringInk.height=1536;const maskCtx=mask.getContext('2d'),glyphCtx=letteringInk.getContext('2d'),baseCtx=document.querySelector('#base-art').getContext('2d');
artwork.onload=()=>{const scan=document.createElement('canvas');scan.width=1024;scan.height=1536;const sc=scan.getContext('2d',{willReadFrequently:true});sc.drawImage(artwork,0,0,1024,1536);const base=sc.getImageData(0,0,1024,1536),pixels=base.data,glyph=glyphCtx.createImageData(1024,1536);
// Black ink with alpha is mathematically equivalent to multiplying greyscale
// artwork into the skin. White paper is fully transparent on every browser.
for(let i=0;i<pixels.length;i+=4){const darkness=255-Math.round(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2]);pixels[i]=pixels[i+1]=pixels[i+2]=0;pixels[i+3]=darkness<10?0:darkness}
// Keep INKY VIBE intact. Flood only the connected final S letter shape, including
// their anti-aliased edges, so no rectangular image boundary is introduced.
const selected=new Uint8Array(1024*1536),queue=[];
for(let y=1217;y<1460;y++)for(let x=835;x<945;x++){const n=y*1024+x;if(pixels[n*4+3]>170){selected[n]=1;queue.push(n)}}
for(let head=0;head<queue.length;head++){const n=queue[head],x=n%1024,y=Math.floor(n/1024);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<820||nx>=945||ny<1217||ny>=1460)continue;const next=ny*1024+nx;if(!selected[next]&&pixels[next*4+3]){selected[next]=1;queue.push(next)}}}
for(const n of queue){const i=n*4;glyph.data[i+3]=pixels[i+3];pixels[i+3]=0}
baseCtx.putImageData(base,0,0);glyphCtx.putImageData(glyph,0,0);
for(let x=820,column=0;x<945;x+=5,column++){const ys=[];for(let y=1217;y<1460;y+=5){const i=(y*1024+x)*4;if(glyph.data[i+3]>170)ys.push(y)}if(column%2)ys.reverse();for(const y of ys)letterPoints.push({x,y})}
// Break the sampled lettering into short, connected working strokes.
let points=[],startIndex=0;function closeStroke(){if(!points.length)return;const weight=.8+((strokePaths.length*17)%11)/14;strokePaths.push({points,start:startIndex,end:startIndex+points.length,from:strokeWeight,to:strokeWeight+weight});strokeWeight+=weight;points=[]}
for(let i=0;i<letterPoints.length;i++){const q=letterPoints[i],last=points[points.length-1];if(last&&(Math.hypot(q.x-last.x,q.y-last.y)>8||points.length>=18))closeStroke();if(!points.length)startIndex=i;points.push(q)}closeStroke();
// Longer relocations receive more scroll distance instead of snapping at speed.
strokeWeight=0;strokePaths.forEach((s,i)=>{const next=strokePaths[Math.min(i+1,strokePaths.length-1)],a=s.points[s.points.length-1],b=next.points[0],length=Math.max(8,(s.points.length-1)*5),gap=Math.hypot(a.x-b.x,a.y-b.y),duration=length+8+gap*1.7;s.from=strokeWeight;s.to=strokeWeight+duration;s.drawUntil=length/duration;s.pauseUntil=(length+8)/duration;strokeWeight+=duration});
artReady=true;dirty=true};artwork.src='inky-vibes-final.jpeg';
const smokeImage=new Image(),smokeCanvas=document.querySelector('#smoke-ink'),smokeCtx=smokeCanvas.getContext('2d');
smokeImage.onload=()=>{smokeCtx.drawImage(smokeImage,0,0,512,1024);const image=smokeCtx.getImageData(0,0,512,1024),p=image.data;for(let i=0;i<p.length;i+=4){const darkness=1-(.2126*p[i]+.7152*p[i+1]+.0722*p[i+2])/255;p[i+3]=Math.round(p[i+3]*darkness*.78);p[i]=p[i+1]=p[i+2]=0}smokeCtx.putImageData(image,0,0);dirty=true};smokeImage.src='angel-wing-smoke.png';
function renderLettering(progress){if(!artReady)return;letterCtx.clearRect(0,0,1024,1536);maskCtx.clearRect(0,0,1024,1536);maskCtx.fillStyle='#fff';if(progress>=.999){maskCtx.fillRect(0,0,1024,1536)}else{const count=Math.floor(progress*letterPoints.length);for(let i=0;i<count;i++){const q=letterPoints[i];maskCtx.beginPath();maskCtx.arc(q.x,q.y,6,0,Math.PI*2);maskCtx.fill()}}
letterCtx.globalCompositeOperation='source-over';letterCtx.drawImage(letteringInk,0,0);letterCtx.globalCompositeOperation='destination-in';letterCtx.drawImage(mask,0,0);letterCtx.globalCompositeOperation='source-over'}
function letterPoint(f){const q=letterPoints[Math.min(letterPoints.length-1,Math.floor(clamp(f)*Math.max(0,letterPoints.length-1)))]||{x:835+f*75,y:1305};return{x:.09+q.x/1024*.285,y:.13+q.y/1536*.64}}
function workingStroke(progress){if(!strokePaths.length)return{point:letterPoint(progress),reveal:progress,lift:0,rock:0};const time=clamp(progress)*strokeWeight,idx=Math.max(0,strokePaths.findIndex(s=>time<=s.to)),stroke=strokePaths[progress>=1?strokePaths.length-1:idx],phase=clamp((time-stroke.from)/(stroke.to-stroke.from)),next=strokePaths[Math.min(strokePaths.length-1,strokePaths.indexOf(stroke)+1)];
// Draw, hold, lift, and reposition. No new ink is revealed during the lift.
const draw=ease(phase/stroke.drawUntil),distance=draw*(stroke.points.length-1),i=Math.floor(distance),u=distance-i,a=stroke.points[i],b=stroke.points[Math.min(i+1,stroke.points.length-1)];let px=mix(a.x,b.x,u),py=mix(a.y,b.y,u),lift=0;
if(phase>stroke.pauseUntil&&progress<1){const travel=ease((phase-stroke.pauseUntil)/(1-stroke.pauseUntil)),end=stroke.points[stroke.points.length-1],to=next.points[0];px=mix(end.x,to.x,travel);py=mix(end.y,to.y,travel);lift=Math.sin(travel*Math.PI)}
return{point:{x:.09+px/1024*.285,y:.13+py/1536*.64},reveal:progress>=1?1:(stroke.start+Math.min(stroke.points.length,Math.floor(distance)+1))/letterPoints.length,lift,rock:0}}
let sceneLeft=0,sceneTop=0;
function sizeScene(){const mobile=innerWidth<701;sceneW=mobile?stage.clientWidth*1.5:stage.clientWidth;sceneH=sceneW/1.5;sceneLeft=mobile?stage.clientWidth*.5-sceneW*.64:0;sceneTop=mobile?stage.clientHeight*.26:(stage.clientHeight-sceneH)/2;sceneLayer.style.width=sceneW+'px';sceneLayer.style.height=sceneH+'px';sceneLayer.style.left=sceneLeft+'px';sceneLayer.style.top=sceneTop+'px';surface.width=1536;surface.height=1024;dirty=true}new ResizeObserver(sizeScene).observe(stage);sizeScene();
function bead(x,y,r,alpha=1){ctx.save();ctx.translate(x,y);const g=ctx.createRadialGradient(-r*.25,-r*.35,0,0,0,r);g.addColorStop(0,`rgba(67,72,66,${alpha})`);g.addColorStop(.45,`rgba(12,17,13,${alpha})`);g.addColorStop(1,`rgba(9,13,10,${alpha*.7})`);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,r,r*.73,-.3,0,Math.PI*2);ctx.fill();ctx.fillStyle=`rgba(244,244,220,${alpha*.7})`;ctx.beginPath();ctx.ellipse(-r*.22,-r*.28,r*.3,Math.max(.5,r*.1),-.3,0,Math.PI*2);ctx.fill();ctx.restore()}
renderScene=p=>{const t=frozen?1:p,fill=ease((t-.025)/.195),bottleExit=ease((t-.225)/.045),dip=ease((t-.32)/.06),withdraw=ease((t-.38)/.065),travel=ease((t-.445)/.075),tattoo=clamp((t-.52)/.38),transition=ease((t-.46)/.06);
if(innerWidth<701){sceneLeft=mix(stage.clientWidth*.5-sceneW*.64,stage.clientWidth*.42-sceneW*.26,transition);sceneLayer.style.left=sceneLeft+'px'}
const stroke=workingStroke(tattoo);renderLettering(t<.52?0:stroke.reveal);ctx.clearRect(0,0,1536,1024);
for(const id of ['#prep-room','#prep-table'])document.querySelector(id).style.opacity=1-transition;document.querySelector('.backplate').style.opacity=transition;document.querySelector('#tattoo-art').style.opacity=transition;smokeCanvas.style.opacity=transition;prep.style.opacity=1-transition;prep.style.transform='none';
// The bottle and the hand holding it move as one photographed object.
const squeeze=t>.025&&t<.225?Math.sin(fill*Math.PI)**2:0;
const pourW=sceneW*.41,pourX=.831*sceneW,pourY=.68*sceneH;bottle.style.width=pourW+'px';bottle.style.left=(pourX-pourW*.318)+'px';bottle.style.top=(pourY-pourW*.938)+'px';bottle.style.transform=`translate(${bottleExit*sceneW*.12}px,${-bottleExit*sceneH*.13}px) scaleX(${1-.035*squeeze}) scaleY(${1+.008*squeeze})`;bottle.style.opacity=1-bottleExit;
const pouring=t>.025&&t<.225;drops.style.opacity=pouring?1:0;document.querySelector('#pour-thread').style.opacity=.18+.65*squeeze;
for(const [id,offset] of [['#pour-drop-a',0],['#pour-drop-b',.5]]){const d=(fill*8+offset)%1;document.querySelector(id).setAttribute('cy',String(d*96));document.querySelector(id).setAttribute('ry',String(4+Math.sin(d*Math.PI)*3))}
const level=107-fill*53;cupFill.setAttribute('y',String(level));cupFill.setAttribute('height',String(111-level));cupSurface.setAttribute('cy',String(level));cupSurface.style.opacity=fill>.01?1:0;ripple.setAttribute('cy',String(level));ripple.setAttribute('rx',String(5+((fill*8)%1)*35));ripple.style.opacity=pouring?.7*(1-(fill*8)%1):0;
const cup={x:.831,y:.7633},depth={x:.831,y:.7755},start=letterPoint(0),q=stroke.point;let point={x:.831,y:.54};
if(t>=.28&&t<.32){point={x:cup.x,y:mix(.54,cup.y,ease((t-.28)/.04))}}else if(t>=.32&&t<.38){point={x:cup.x,y:mix(cup.y,depth.y,dip)}}else if(t>=.38&&t<.445){point={x:cup.x,y:mix(depth.y,.59,withdraw)}}else if(t>=.445&&t<.52){point={x:mix(cup.x,start.x,travel),y:mix(.59,start.y,travel)}}else if(t>=.52)point=q;
const lift=ease((t-.91)/.045),microLift=t>=.52&&t<.90?stroke.lift:0,x=point.x*sceneW,y=point.y*sceneH-microLift*1.2,handW=sceneW*mix(.31,.29,travel),angle=28*travel+(t>=.52&&t<.90?stroke.rock:0);
// Tip is the transform origin: the entire dip is vertical, then a small working tilt.
hand.style.width=handW+'px';hand.style.left=(x-handW*.274)+'px';hand.style.top=(y-handW*.922)+'px';hand.style.transform=`translate(${lift*sceneW*.08}px,${-lift*sceneH*.08}px) rotate(${angle}deg)`;hand.style.opacity=frozen?0:ease((t-.278)/.025)*(1-ease((t-.925)/.04));
document.querySelector('#cup-front').style.opacity=ease((t-.325)/.015)*(1-ease((t-.412)/.02));const loaded=t>.38&&t<.965;contact.style.left=x+'px';contact.style.top=y+'px';contact.style.opacity=loaded&&!frozen?(1-microLift)*(1-ease((t-.925)/.04)):0;contact.style.transform=`translate(${lift*sceneW*.08}px,${-lift*sceneH*.08}px)`;
if(!frozen&&t>.39&&t<.44){const fall=ease((t-.39)/.05);bead(.831*1536,mix(.66,.7755,fall)*1024,2.8,1-fall*.5)}
if(!frozen&&t>.52&&t<1){const count=Math.floor(stroke.reveal*letterPoints.length),settle=1-ease((t-.91)/.09);for(let i=Math.max(0,count-45);i<count;i+=9){const a=letterPoints[i];bead((.09+a.x/1024*.285)*1536,(.13+a.y/1536*.64)*1024,1.5+(i%3)*.2,.6*settle)}if(t<.90&&microLift<.7)bead(point.x*1536,point.y*1024,3.1,(1-microLift));}
const closeUp=ease((t-.48)/.10),cameraZoom=1+.4*closeUp,cameraPan=stage.clientWidth*(innerWidth<701?.045:.30)*closeUp;sceneLayer.style.transform=`translateX(${cameraPan}px) scale(${cameraZoom})`;sceneLayer.style.transformOrigin='35% 68%';workLight.style.left=(x-sceneW*.14)+'px';workLight.style.top=(y-sceneH*.2)+'px';workLight.style.opacity=.09;document.querySelector('.rim-glow').style.opacity=transition*.22;

};
function tick(){if(document.visibilityState==='visible'&&(dirty||Math.abs(current-target)>.00001)){current+= (target-current)*.20;if(Math.abs(current-target)<.00001)current=target;setCopy(current);if(renderScene)renderScene(current);dirty=false}requestAnimationFrame(tick)}tick();
const dialog=document.querySelector('#booking'),bookingFrame=document.querySelector('#booking-frame');
bookNow.onclick=()=>{if(!bookingFrame.getAttribute('src'))bookingFrame.src=bookingFrame.dataset.src;dialog.showModal();document.body.style.overflow='hidden'};
document.querySelector('.booking-close').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{document.body.style.overflow='';bookNow.focus()});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
