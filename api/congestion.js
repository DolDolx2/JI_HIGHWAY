import {getJSON,respond,requireGET,upstreamFailure} from "./_shared.js";
/**
 * Highway congestion is reported as EX conzone/VDS readings.
 * This is a nationwide feed, NOT a matched trip route.
 */
export default async function handler(req,res){
 if(!requireGET(req,res))return;
 const key=process.env.EX_API_KEY;
 if(!key)return respond(res,503,{ok:false,code:"NOT_CONFIGURED"});
 const url=new URL("https://data.ex.co.kr/openapi/odtraffic/trafficAmountByCongest");
 url.searchParams.set("serviceKey",key);url.searchParams.set("type","json");
 try{
  const doc=await getJSON(url.toString());
  const raw=Array.isArray(doc?.list)?doc.list:Array.isArray(doc?.trafficAmountByCongest)?doc.trafficAmountByCongest:doc?.list&&typeof doc.list==="object"?[doc.list]:[];
  if(!raw.length)return respond(res,200,{ok:true,source:"한국도로공사 정체상황",sections:[],message:"현재 응답에 정체구간 항목이 없습니다.",at:new Date().toISOString()},true);
  const sections=raw.map(x=>({
   road:String(x.routeName||"").slice(0,70),
   routeNo:String(x.routeNo||"").slice(0,20),
   segment:String(x.conzoneName||"").slice(0,120),
   segmentId:String(x.conzoneId||"").slice(0,45),
   speed:Number(x.speed),
   grade:String(x.grade??"").slice(0,25),
   sampledAt:[x.stdDate,x.stdHour].filter(Boolean).join(" ").slice(0,35)
  })).filter(x=>x.segment||x.road).slice(0,150);
  return respond(res,200,{ok:true,source:"한국도로공사 정체상황",sections,at:new Date().toISOString()},true);
 }catch(e){return upstreamFailure(res,e)}
}
