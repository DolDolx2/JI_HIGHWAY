import {getJSON,respond,requireGET,upstreamFailure} from "./_shared.js";
export default async function handler(req,res){
 if(!requireGET(req,res))return;
 const key=process.env.EX_API_KEY;
 if(!key)return respond(res,503,{ok:false,code:"NOT_CONFIGURED"});
 // The EX OpenAPI guide documents unitList (tollgate list), not a complete IC/JCT graph.
 const url=new URL("https://data.ex.co.kr/openapi/basicinfo/unitList");
 url.searchParams.set("key",key);url.searchParams.set("type","json");
 try{
  const doc=await getJSON(url.toString());
  const list=Array.isArray(doc?.list)?doc.list:Array.isArray(doc?.unitList)?doc.unitList:[];
  const normalized=list.map(x=>({name:String(x.unitName||"").trim(),code:String(x.unitCode||"").trim()})).filter(x=>x.name&&x.code).slice(0,1500);
  if(!normalized.length)return respond(res,502,{ok:false,code:"RESPONSE_SCHEMA",message:"영업소 목록 응답 구조를 확인해야 합니다."});
  return respond(res,200,{ok:true,source:"한국도로공사 영업소 목록",stations:normalized,at:new Date().toISOString()},true);
 }catch(e){return upstreamFailure(res,e)}
}
