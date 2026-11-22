(function(){
 const escape=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const root=document.getElementById("app");
 let result=null,busy=false,error="";
 async function load(){
  if(busy)return;
  busy=true;error="";paint();
  try{
   const response=await fetch("/api/congestion",{cache:"no-store"});
   const data=await response.json();
   if(!response.ok||!data.ok)throw new Error(data.message||"실시간 소통정보를 조회하지 못했습니다.");
   result=data;
  }catch(e){error=e.message;result=null}
  finally{busy=false;paint()}
 }
 function paint(){
  const main=root?.querySelector(".content");
  if(!main||!["home","results"].includes(state.page))return;
  let target=main.querySelector("#congestion-live");
  if(!target){target=document.createElement("section");target.id="congestion-live";target.className="section";main.appendChild(target)}
  const rows=result?.sections||[];
  target.innerHTML='<div class="sectiontitle"><h2>전국 고속도로 서행·정체</h2><button class="linkbtn" data-congestion-reload>갱신 ↻</button></div>'+
   '<p class="muted tiny">한국도로공사 실시간 VDS · 조회 경로와 무관한 전국 현황입니다.</p>'+
   (busy?'<p class="muted">조회 중...</p>':
    error?'<div class="notice">'+escape(error)+'</div>':
    result?'<div class="muted tiny">수신한 구간 '+escape(result.totalRead||0)+'곳 · 서행/정체 '+escape(result.count||0)+'곳'+(result.at?' · 확인 '+escape(new Date(result.at).toLocaleTimeString("ko-KR")):'')+'</div><div class="list">'+
     (rows.length?rows.slice(0,12).map(x=>{
       const level=x.grade===3?"jam":x.grade===2?"slow":"unknown";
       const title=x.grade===3?"정체":x.grade===2?"서행":"정보 없음";
       return '<div class="listitem"><div><div class="rowname">'+escape(x.road)+' · '+escape(x.segment)+'</div><div class="rowdesc">수집 '+escape(x.sampledAt||"시간 미상")+'</div></div><span class="pill '+level+'">'+title+(x.speed!==null?' · '+escape(x.speed)+'km/h':'')+'</span></div>';
     }).join(""):'<div class="empty">현재 수신된 서행·정체 등급 구간이 없습니다.</div>')+'</div>':
    '<button class="secondary" data-congestion-reload>실제 교통정보 조회</button>');
 }
 document.addEventListener("click",e=>{if(e.target.closest("[data-congestion-reload]"))load()});
 const observer=new MutationObserver(()=>paint());
 observer.observe(root,{subtree:false,childList:true});
 window.addEventListener("load",paint);
})();
