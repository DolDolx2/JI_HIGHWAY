(function(){
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;":"&quot;","'":"&#39;"}[c]));
 const root=document.getElementById("app");
 let result=null,busy=false,error="";
 async function load(){
  if(busy)return;
  busy=true;error="";paint();
  try{
   const response=await fetch("/api/congestion",{cache:"no-store"});
   const data=await response.json();
   if(!response.ok||!data.ok)throw new Error(data.message||"정체구간 정보를 조회할 수 없습니다.");
   result=data;
  }catch(e){error=e.message;result=null}
  finally{busy=false;paint()}
 }
 function paint(){
  const main=root?.querySelector(".content");if(!main)return;
  if(!["home","results"].includes(state.page))return;
  let target=main.querySelector("#congestion-live");
  if(!target){target=document.createElement("section");target.id="congestion-live";target.className="section";main.appendChild(target)}
  const section=result?.sections||[];
  target.innerHTML='<div class="sectiontitle"><h2>전국 고속도로 정체현황</h2><button class="linkbtn" data-congestion-reload>갱신 ↻</button></div>'+
  '<p class="muted tiny">도로공사 VDS/콘존별 정체정보 · 조회 경로에만 해당하는 결과는 아닙니다.</p>'+
  (busy?'<p class="muted">조회 중...</p>':error?'<div class="notice">'+esc(error)+'</div>':
    result?'<div class="list">'+(section.length?section.slice(0,8).map(x=>'<div class="listitem"><div><div class="rowname">'+esc(x.road||"노선 정보 없음")+' · '+esc(x.segment||"구간 정보 없음")+'</div><div class="rowdesc">수집 '+esc(x.sampledAt||"시각 미상")+'</div></div><span class="pill slow">'+(Number.isFinite(x.speed)?esc(x.speed)+" km/h":"속도 정보 없음")+'</span></div>').join(""):'<div class="empty">현재 제공된 정체구간이 없습니다.</div>')+'</div>':'<button class="secondary" data-congestion-reload>실시간 정체현황 조회</button>');
 }
 document.addEventListener("click",e=>{if(e.target.closest("[data-congestion-reload]"))load()});
 const obs=new MutationObserver(()=>paint());
 obs.observe(root,{subtree:false,childList:true});
 window.addEventListener("load",()=>paint());
 })();
