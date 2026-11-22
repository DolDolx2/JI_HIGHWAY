import {respond,inputNumber,upstreamFailure} from "./_shared.js";
export default async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return respond(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"})}
 if(!process.env.TMAP_APP_KEY)return respond(res,503,{ok:false,code:"NOT_CONFIGURED"});
 const b=req.body||{};
 const startLat=inputNumber(b.startLat,33,39),startLon=inputNumber(b.startLon,124,132),endLat=inputNumber(b.endLat,33,39),endLon=inputNumber(b.endLon,124,132);
 if([startLat,startLon,endLat,endLon].some(x=>x===null))return respond(res,400,{ok:false,code:"COORD_REQUIRED"});
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
 try{
  const r=await fetch("https://apis.openapi.sk.com/tmap/routes?version=1&format=json",{
   method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",appKey:process.env.TMAP_APP_KEY},
   body:JSON.stringify({startX:String(startLon),startY:String(startLat),endX:String(endLon),endY:String(endLat),startName:"출발지",endName:"목적지",reqCoordType:"WGS84GEO",resCoordType:"WGS84GEO",searchOption:"0",trafficInfo:"Y"}),
   signal:ctrl.signal
  });
  if(!r.ok)throw new Error("UPSTREAM_HTTP_"+r.status);
  const doc=await r.json(),features=doc?.features;
  if(!Array.isArray(features)||!features.length)return respond(res,502,{ok:false,code:"RESPONSE_SCHEMA"});
  const p=features.find(x=>x?.properties?.totalDistance!==undefined)?.properties||{};
  const dist=Number(p.totalDistance),sec=Number(p.totalTime);
  if(!Number.isFinite(dist)||!Number.isFinite(sec))return respond(res,502,{ok:false,code:"RESPONSE_SCHEMA"});
  const polyline=features.filter(x=>x.geometry?.type==="LineString").flatMap(x=>x.geometry.coordinates||[]).filter(x=>Array.isArray(x)&&Number.isFinite(Number(x[0]))&&Number.isFinite(Number(x[1]))).slice(0,3000).map(([lon,lat])=>[Number(lon),Number(lat)]);
  return respond(res,200,{ok:true,source:"TMAP",distanceKm:Math.round(dist/100)/10,durationMin:Math.ceil(sec/60),polyline,at:new Date().toISOString()});
 }catch(e){return upstreamFailure(res,e)}finally{clearTimeout(timer)}
}
