import {getJSON,respond,requireGET,upstreamFailure} from "./_shared.js";
// Korean Expressway Corporation real-time VDS/conzone traffic feed.
// This is an independent national status feed, not a TMAP route match.
export default async function handler(req,res){
 if(!requireGET(req,res))return;
 const key=process.env.EX_API_KEY;
 if(!key)return respond(res,503,{ok:false,code:"NOT_CONFIGURED"});
 const url=new URL("https://data.ex.co.kr/openapi/odtraffic/trafficAmountByRealtime");
 url.searchParams.set("key",key);
 url.searchParams.set("type","json");
 url.searchParams.set("numOfRows","2500");
 url.searchParams.set("pageNo","1");
 try{
  const doc=await getJSON(url.toString());
  if(doc?.code==="ERROR"||doc?.errorCode||doc?.resultCode&&String(doc.resultCode)!=="00") {
   return respond(res,502,{ok:false,code:"UPSTREAM_REJECTED",message:"도로공사 API에서 요청을 거부했습니다."});
  }
  const raw=Array.isArray(doc?.list)?doc.list:Array.isArray(doc?.trafficAmountByRealtime)?doc.trafficAmountByRealtime:[];
  if(!raw.length){
   if(!Array.isArray(doc?.list)&&!Array.isArray(doc?.trafficAmountByRealtime))
    return respond(res,502,{ok:false,code:"RESPONSE_SCHEMA",message:"도로공사 실시간 소통 응답 형식 확인이 필요합니다."});
   return respond(res,200,{ok:true,source:"한국도로공사 실시간 소통",count:0,totalRead:0,sections:[],at:new Date().toISOString(),message:"수신된 교통정보가 없습니다."},true);
  }
  const parsed=raw.map(x=>{
   const speed=Number(x.speed);
   const grade=Number(x.grade);
   return {
    road:String(x.routeName||"").slice(0,65),
    routeNo:String(x.routeNo||"").slice(0,20),
    segment:String(x.conzoneName||"").slice(0,120),
    segmentId:String(x.conzoneId||"").slice(0,45),
    updown:String(x.updownTypeCode||"").slice(0,10),
    speed:Number.isFinite(speed)&&speed>=0?speed:null,
    grade:[1,2,3].includes(grade)?grade:null,
    sampledAt:[x.stdDate,x.stdHour].filter(Boolean).join(" ").slice(0,35)
   };
  }).filter(x=>x.segment&&x.routeNo);
  // Only grades 2/3 are presented as congestion; grade 1 and unknown are not
  // to be misreported as congested. Preserve real sample time.
  const sections=parsed.filter(x=>x.grade===2||x.grade===3)
    .sort((a,b)=>b.grade-a.grade||(a.speed??1000)-(b.speed??1000))
    .slice(0,100);
  return respond(res,200,{ok:true,source:"한국도로공사 실시간 소통",totalRead:parsed.length,count:sections.length,sections,at:new Date().toISOString(),message:sections.length?"":"수신된 구간 중 서행·정체 등급이 없습니다."},true);
 }catch(e){return upstreamFailure(res,e)}
}
