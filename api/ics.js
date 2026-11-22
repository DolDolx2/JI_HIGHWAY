import {getJSON,respond,requireGET,upstreamFailure} from "./_shared.js";
export default async function handler(req,res){
 if(!requireGET(req,res))return;
 const key=process.env.EX_API_KEY;
 if(!key)return respond(res,503,{ok:false,code:"NOT_CONFIGURED"});
 const url=new URL("https://data.ex.co.kr/openapi/locationinfo/locationinfoIc");
 url.searchParams.set("key",key);url.searchParams.set("type","json");
 try{
  const doc=await getJSON(url.toString());
  const raw=Array.isArray(doc?.list)?doc.list:Array.isArray(doc?.locationinfoIc)?doc.locationinfoIc:typeof doc?.list==="object"&&doc.list?[doc.list]:[];
  const locations=raw.map(x=>({
   name:String(x.icName||"").trim(),
   code:String(x.icCode||"").trim(),
   road:String(x.routeName||"").trim(),
   lon:Number(x.xValue),
   lat:Number(x.yValue)
  })).filter(x=>x.name).slice(0,2000);
  if(!locations.length)return respond(res,502,{ok:false,code:"RESPONSE_SCHEMA",message:"IC/JCT 위치정보 응답 형식을 검증해야 합니다."});
  return respond(res,200,{ok:true,source:"한국도로공사 IC/JCT 위치정보",locations,at:new Date().toISOString()},true);
 }catch(e){return upstreamFailure(res,e)}
}
