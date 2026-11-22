
"use strict";
(function(){
const L={ics:null,icError:"",from:null,to:null,route:null,routeError:"",pois:[],poiError:"",gps:null,gpsError:"",dest:null,destRoute:null,destError:"",cameras:[],cameraError:"",cameraIndex:0,status:null,statusError:"",busy:"",cctvAnchor:null};
const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $=s=>document.querySelector(s);
const msg=(s)=>'<div class="live-hint">'+safe(s)+'</div>';
async function request(url,init){
 const r=await fetch(url,{cache:"no-store",...init});
 let x;try{x=await r.json()}catch{throw Error("서버 응답을 해석할 수 없습니다.")};
 if(!r.ok||!x.ok)throw Error(x.message||({NOT_CONFIGURED:"API 키 미설정",RESPONSE_SCHEMA:"응답 형식 확인 필요",UPSTREAM_AUTH:"인증 실패",UPSTREAM_LIMIT:"API 호출 한도 초과",UPSTREAM_UNAVAILABLE:"정보 제공처 연결 불가"}[x.code]||"조회 실패"));
 return x;
}
function busyStart(which){L.busy=which;mount(true)}
function busyEnd(){L.busy="";mount(true)}
async function status(){
 try{L.status=await request("/api/status")}catch(e){L.statusError=e.message}mount(true);
}
async function ics(){
 if(L.ics)return L.ics;
 const d=await request("/api/ics");L.ics=d.locations.filter(x=>Number.isFinite(x.lon)&&Number.isFinite(x.lat)&&x.lon>=124&&x.lon<=132&&x.lat>=33&&x.lat<=39);
 if(!L.ics.length)throw Error("IC 좌표계 확인이 필요합니다.");
 return L.ics;
}
function inputSet(){
 return '<datalist id="live-ic-list">'+(L.ics||[]).map(x=>'<option value="'+safe(x.name)+'"></option>').join("")+'</datalist>';
}
function routeSummary(r){
 if(!r)return "";
 return '<div class="live-route"><div class="statgrid"><div class="stat"><div class="label">총 거리</div><div class="value">'+safe(r.distanceKm)+' km</div></div><div class="stat"><div class="label">예상 시간</div><div class="value">'+safe(r.durationMin)+' 분</div></div><div class="stat"><div class="label">출처</div><div class="value" style="font-size:14px">TMAP</div></div></div><p class="muted tiny">TMAP 자동차 경로탐색 결과. 구간별 소통정보와 CCTV 매칭은 추가 연동 중입니다.</p></div>';
}
function liveIC(){
 return '<section class="section live-section"><div class="sectiontitle"><h2>실제 IC/JCT 경로 조회</h2><span class="live-badge">API 연동</span></div><p class="muted tiny">한국도로공사 IC 위치정보와 TMAP 자동차 경로를 사용합니다. 기존 샘플 조회와 구분됩니다.</p>'+
 (L.icError?msg(L.icError):"")+
 '<div class="fields"><div class="field"><label for="live-from">진입 IC</label><input id="live-from" list="live-ic-list" placeholder="IC/JCT 이름" value="'+safe(L.from?.name||"")+'"></div><div class="field"><label for="live-to">진출 IC</label><input id="live-to" list="live-ic-list" placeholder="IC/JCT 이름" value="'+safe(L.to?.name||"")+'"></div></div>'+inputSet()+
 '<div class="actions"><button class="secondary" data-live="load-ics">'+(L.ics?"IC 목록 새로 조회":"IC/JCT 목록 불러오기")+'</button><button class="primary" style="margin-top:0" data-live="ic-route" '+(L.busy?"disabled":"")+'>실제 경로 조회</button></div>'+
 (L.ics?'<p class="muted tiny">불러온 IC/JCT: '+L.ics.length+'곳 · 이름을 입력하면 자동완성됩니다.</p>':"")+
 (L.busy==="ics"||L.busy==="ic-route"?msg("조회 중입니다..."):"")+
 routeSummary(L.route)+'</section>';
}
const checks={ex:{title:"도로공사 IC/JCT",state:"unchecked",detail:"아직 검사하지 않음"},
tmapPoi:{title:"TMAP 장소검색",state:"unchecked",detail:"아직 검사하지 않음"},
tmapRoute:{title:"TMAP 경로계산",state:"unchecked",detail:"아직 검사하지 않음"},
cctv:{title:"ITS CCTV",state:"unchecked",detail:"아직 검사하지 않음"},
congestion:{title:"도로공사 정체정보",state:"unchecked",detail:"아직 검사하지 않음"}};
let checkedAt="";
function statusLabel(v){return ({ok:"정상",fail:"연결 실패",empty:"데이터 미확인",unchecked:"미검사",busy:"확인 중"})[v]||"미검사"}
function homeStatus(){
 const flags=L.status?.configured||{};
 const keyStatus='<div class="muted tiny">API 키 등록: 도로공사 '+(flags.ex?"확인":"미확인")+' / CCTV '+(flags.cctv?"확인":"미확인")+' / TMAP '+(flags.tmap?"확인":"미확인")+' (실제 연결 상태와 별개)</div>';
 const rows=Object.values(checks).map(x=>'<div class="diagrow"><div><strong>'+safe(x.title)+'</strong><div class="muted tiny">'+safe(x.detail)+'</div></div><span class="diagstatus '+safe(x.state)+'">'+statusLabel(x.state)+'</span></div>').join("");
 return '<section class="section live-section"><div class="sectiontitle"><h2>실제 데이터 연동 점검</h2><span class="live-badge">API별 확인</span></div>'+
 '<p class="muted tiny">인증키 등록 여부가 아닌 실제 서버 응답을 확인합니다. CCTV는 연결 대기시간이 발생할 수 있습니다.</p>'+
 '<div class="diaglist">'+rows+'</div>'+keyStatus+
 (L.statusError?msg(L.statusError):"")+
 (checkedAt?'<p class="muted tiny">마지막 검사 '+safe(checkedAt)+'</p>':"")+
 '<button class="primary" style="margin-top:10px" data-live="diagnostics" '+(L.busy?"disabled":"")+'>API 실제 연결 검사 '+(L.busy==="diagnostics"?"진행 중...":"↻")+'</button>'+
 '<div class="actions"><button class="secondary" data-live="open-live-route">IC/JCT 조회</button><button class="secondary" data-action="destination">목적지 검색</button></div></section>';
}
async function diagnostics(){
 const tests=[
 ["ex","/api/ics",r=>({state:r.locations?.length?"ok":"empty",detail:"실제 IC/JCT "+(r.locations?.length||0)+"곳 수신"})],
 ["tmapPoi","/api/pois?q="+encodeURIComponent("서울역"),r=>({state:r.pois?.length?"ok":"empty",detail:"장소 검색 "+(r.pois?.length||0)+"건 수신"})],
 ["tmapRoute","/api/route",r=>({state:r.distanceKm>0&&r.durationMin>0?"ok":"empty",detail:"거리 "+r.distanceKm+"km · 예상 "+r.durationMin+"분"})],
 ["cctv","/api/cctv?lat=36.65&lon=127.49",r=>({state:r.cameras?.length?"ok":"empty",detail:"CCTV "+(r.cameras?.length||0)+"대 수신 (영상 재생 별도 검증)"})],
 ["congestion","/api/congestion",r=>({state:r.sections?.length?"ok":"empty",detail:r.sections?.length?"정체정보 "+r.sections.length+"건":"유효한 정체 데이터 0건"})]
 ];
 L.busy="diagnostics";
 for(const t of tests){checks[t[0]].state="busy";checks[t[0]].detail="서버 응답 확인 중"}
 mount(true);
 await Promise.all(tests.map(async ([k,url,mapper])=>{
   try{
    const init=k==="tmapRoute"?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({startLat:36.65,startLon:127.49,endLat:36.7,endLon:127.52})}:undefined;
    const data=await request(url,init);
    Object.assign(checks[k],mapper(data));
   }catch(e){checks[k].state="fail";checks[k].detail=e.message}
   mount(true);
 }));
 checkedAt=new Date().toLocaleString("ko-KR");
 L.busy="";mount(true);
}
function cameraPanel(){
 return '<section class="section live-section"><div class="sectiontitle"><h2>실시간 CCTV · 현재 위치 주변</h2><span class="live-badge">ITS API</span></div><p class="muted tiny">GPS 현재 위치 또는 선택한 IC 부근의 카메라를 조회합니다. 조회 경로 진행 방향 정렬 기능은 아직 없습니다.</p><div class="actions"><button class="secondary" data-live="camera-gps" '+(L.busy?"disabled":"")+'>⌖ 현재 위치 CCTV</button><button class="secondary" data-live="camera-ic" '+(L.busy?"disabled":"")+'>선택 IC 부근</button></div>'+
 (L.cameraError?msg(L.cameraError):"")+
 (L.busy==="cameras"?msg("CCTV 조회 중입니다..."):"")+
 (L.cameras.length?'<p class="muted tiny">ITS CCTV '+L.cameras.length+'대 · 실제 영상은 브라우저/제공처 지원 여부에 따라 재생되지 않을 수 있습니다.</p><div class="live-camera-select"><select id="live-camera-choice" aria-label="CCTV 선택">'+L.cameras.map((c,i)=>'<option value="'+i+'" '+(i===L.cameraIndex?"selected":"")+'>'+safe(c.name)+'</option>').join("")+'</select><button class="secondary" data-live="camera-view">선택 영상 보기</button></div><div id="live-camera-player" class="live-cam-player">'+renderPlayer()+'</div>':"")+'</section>';
}
function renderPlayer(){
 const cam=L.cameras[L.cameraIndex];if(!cam)return msg("카메라를 선택해 주세요.");
 if(!/^https:\/\//.test(cam.url))return msg("HTTPS 재생 주소를 제공하지 않습니다.");
 return '<div class="video"><video controls playsinline preload="none" src="'+safe(cam.url)+'" style="width:100%;height:auto;max-height:340px" aria-label="'+safe(cam.name)+'"></video></div><div class="muted tiny" style="margin-top:6px">'+safe(cam.name)+' · 브라우저가 해당 영상 포맷을 지원해야 재생됩니다.</div>';
}
function destinationPanel(){
 return '<section class="section live-section"><div class="sectiontitle"><h2>실제 목적지 경로 탐색</h2><span class="live-badge">TMAP API</span></div><div class="field"><label for="live-start">출발지 장소명</label><input id="live-start" value="" placeholder="예: 청주역"></div><div class="actions"><button class="secondary" data-live="gps" '+(L.busy?"disabled":"")+'>⌖ 현재 위치로 출발</button><button class="secondary" data-live="find-start" '+(L.busy?"disabled":"")+'>출발지 검색</button></div><div class="field" style="margin-top:14px"><label for="live-dest">목적지 장소명</label><input id="live-dest" placeholder="예: 부산역"></div><button class="secondary" style="margin-top:8px" data-live="find-dest" '+(L.busy?"disabled":"")+'>목적지 검색</button>'+
 (L.pois.length?'<div class="field" style="margin-top:12px"><label for="live-poi-choice">검색 결과 선택</label><select id="live-poi-choice">'+L.pois.map((p,i)=>'<option value="'+i+'">'+safe(p.name)+' · '+safe(p.address)+'</option>').join("")+'</select><button class="secondary" style="margin-top:8px" data-live="choose-poi">이 장소 선택</button></div>':"")+
 '<p class="muted tiny">출발지: '+safe(L.gps?.name||"미선택")+' / 목적지: '+safe(L.dest?.name||"미선택")+'</p><button class="primary" data-live="destination-route" '+(!L.gps||!L.dest||L.busy?"disabled":"")+'>실제 자동차 경로 계산</button>'+
 (L.busy?msg("조회 중입니다..."):"")+(L.poiError||L.destError?msg(L.poiError||L.destError):"")+routeSummary(L.destRoute)+'</section>';
}
async function fetchRoute(a,b){
 const r=await request("/api/route",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({startLat:a.lat,startLon:a.lon,endLat:b.lat,endLon:b.lon})});
 return r;
}

function drawRoute(r){
 const raw=Array.isArray(r?.polyline)?r.polyline:[];
 const pts=raw.filter(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[0]>=124&&p[0]<=132&&p[1]>=33&&p[1]<=39);
 if(pts.length<2)return msg("경로 좌표를 아직 제공받지 못했습니다.");
 const latCenter=pts.reduce((n,p)=>n+p[1],0)/pts.length;
 const scale=Math.cos(latCenter*Math.PI/180);
 const xs=pts.map(p=>p[0]*scale),ys=pts.map(p=>p[1]);
 let west=Math.min(...xs),east=Math.max(...xs),south=Math.min(...ys),north=Math.max(...ys);
 const dx=Math.max(east-west,0.0001),dy=Math.max(north-south,0.0001),k=Math.min(340/dx,260/dy);
 const ox=180-(east-west)*k/2,oy=140-(north-south)*k/2;
 const coords=pts.map((p,i)=>[(ox+(xs[i]-west)*k).toFixed(1),(oy+(north-ys[i])*k).toFixed(1)]);
 const path=coords.map((p,i)=>(i?"L":"M")+p.join(" ")).join(" ");
 const start=coords[0],end=coords[coords.length-1];
 return '<div class="mapbox" style="height:330px"><svg viewBox="0 0 360 280" width="100%" height="100%" role="img" aria-label="TMAP 실제 경로 형상">'+
 '<rect width="360" height="280" fill="#eaf2f6"/><path d="'+path+'" fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>'+
 '<path d="'+path+'" fill="none" stroke="#1674d0" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>'+
 '<circle cx="'+start[0]+'" cy="'+start[1]+'" r="8" fill="#259a55" stroke="white" stroke-width="3"/>'+
 '<circle cx="'+end[0]+'" cy="'+end[1]+'" r="8" fill="#dc4141" stroke="white" stroke-width="3"/></svg>'+
 '<div class="mapstamp">TMAP 실제 경로 형상 · 배경 지도 아님</div></div><p class="muted tiny">GPS 좌표로 그린 경로입니다. 지도 타일 및 정체 색상은 후속 연동 예정입니다.</p>';
}

function mount(force=false){
 const main=document.querySelector("#app .content");if(!main)return;
 if(main.dataset.liveMount&&!force)return;
 let html="";
 const p=state.page;
 if(p==="home")html=homeStatus();
 if(p==="ic")html=liveIC();
 if(p==="results")html=liveIC();
 if(p==="cctv")html=cameraPanel();
 if(p==="destination")html=destinationPanel();
 if(p==="destresults")html=destinationPanel();
 if(p==="map")html=(L.route||L.destRoute?'<section class="section live-section"><h2>TMAP 실제 경로</h2>'+routeSummary(L.route||L.destRoute)+drawRoute(L.route||L.destRoute)+'</section>':msg("실제 경로를 조회하면 요약 정보를 표시합니다."));
 if(html){
  let target=main.querySelector("#live-content");
  // The first version left sample cards below the live widgets. Replace them
  // rather than presenting contradictory demo and real search controls.
  if(!target){target=document.createElement("div");target.id="live-content";main.replaceChildren(target)}
  if(document.activeElement&&target.contains(document.activeElement)&&!force)return;
  target.innerHTML=html;
 }
 main.dataset.liveMount="1";
}
document.addEventListener("click",async e=>{
 const el=e.target.closest("[data-live]");if(!el)return;
 const a=el.dataset.live;
 if(a==="open-live-route"){setPage("ic");return}
 if(a==="diagnostics"){if(!L.busy)diagnostics();return}
 if(L.busy)return;
 if(a==="load-ics"){L.icError="";busyStart("ics");try{L.ics=null;await ics()}catch(err){L.icError=err.message}finally{busyEnd()}return}
 if(a==="ic-route"){
  L.icError="";L.route=null;
  const s=$("#live-from")?.value.trim(),d=$("#live-to")?.value.trim();
  busyStart("ic-route");
  try{
   await ics();
   const x=L.ics.find(i=>i.name===s),y=L.ics.find(i=>i.name===d);
   if(!x||!y)throw Error("실제 IC/JCT 목록에서 이름을 선택해 주세요.");
   if(x.name===y.name)throw Error("진입·진출 IC가 같습니다.");
   L.from=x;L.to=y;L.route=await fetchRoute(x,y);
  }catch(err){L.icError=err.message}finally{busyEnd()}return
 }
 if(a==="gps"||a==="camera-gps"){
  if(!navigator.geolocation){L.gpsError="현재 브라우저는 GPS를 지원하지 않습니다.";mount(true);return}
  busyStart(a==="gps"?"gps":"cameras");
  navigator.geolocation.getCurrentPosition(async p=>{
   const pos={lat:p.coords.latitude,lon:p.coords.longitude,name:"현재 위치"};
   if(a==="gps"){L.gps=pos;L.destError="";busyEnd();return}
   try{const d=await request("/api/cctv?lat="+pos.lat+"&lon="+pos.lon);L.cameras=d.cameras;L.cameraIndex=0;L.cameraError=L.cameras.length?"":"주변에 제공되는 CCTV가 없습니다."}
   catch(err){L.cameraError=err.message;L.cameras=[]}
   finally{busyEnd()}
  },err=>{if(a==="gps")L.destError="위치 사용이 취소되었거나 차단됐습니다.";else L.cameraError="위치 사용이 취소되었거나 차단됐습니다.";busyEnd()},{enableHighAccuracy:false,timeout:12000});
  return
 }
 if(a==="camera-ic"){
  const i=L.to||L.from;if(!i){L.cameraError="실제 IC/JCT 조회에서 먼저 IC를 선택하세요.";mount(true);return}
  L.cameraError="";busyStart("cameras");try{const d=await request("/api/cctv?lat="+i.lat+"&lon="+i.lon);L.cameras=d.cameras;L.cameraIndex=0;if(!L.cameras.length)L.cameraError="주변에 제공되는 CCTV가 없습니다."}catch(err){L.cameraError=err.message;L.cameras=[]}finally{busyEnd()}return
 }
 if(a==="camera-view"){L.cameraIndex=Number($("#live-camera-choice")?.value)||0;mount(true);return}
 if(a==="find-start"||a==="find-dest"){
  const input=$(a==="find-start"?"#live-start":"#live-dest"),q=input?.value.trim();
  if(!q||q.length<2){L.poiError="장소명을 두 글자 이상 입력하세요.";mount(true);return}
  L.poiError="";L.pois=[];L.whichPoi=a==="find-start"?"start":"dest";
  busyStart("pois");try{const d=await request("/api/pois?q="+encodeURIComponent(q));L.pois=d.pois;if(!L.pois.length)L.poiError="검색 결과가 없습니다."}catch(err){L.poiError=err.message}finally{busyEnd()}return
 }
 if(a==="choose-poi"){
  const p=L.pois[Number($("#live-poi-choice")?.value)||0];
  if(!p)return;
  if(L.whichPoi==="start")L.gps=p;else L.dest=p;
  L.pois=[];L.poiError="";mount(true);return
 }
 if(a==="destination-route"){
  if(!L.gps||!L.dest)return;
  L.destError="";L.destRoute=null;busyStart("destination-route");
  try{L.destRoute=await fetchRoute(L.gps,L.dest)}catch(err){L.destError=err.message}finally{busyEnd()}
 }
});
const observer=new MutationObserver(()=>mount());
observer.observe(document.getElementById("app"),{childList:true,subtree:true});
status();
})();
