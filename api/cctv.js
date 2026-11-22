import {respond,requireGET,inputNumber,upstreamFailure} from "./_shared.js";
import {parseCctvPayload,sanitizeCameras} from "./_cctv_parse.js";
export default async function handler(req,res){
 if(!requireGET(req,res))return;
 const key=process.env.ITS_CCTV_API_KEY;
 if(!key)return respond(res,503,{ok:false,code:"NOT_CONFIGURED"});
 const lat=inputNumber(req.query.lat,33,39),lon=inputNumber(req.query.lon,124,132);
 if(lat===null||lon===null)return respond(res,400,{ok:false,code:"COORD_REQUIRED",message:"조회 중심 좌표를 입력하세요."});
 const radius=Math.min(inputNumber(req.query.radius,0.03,0.35)??0.12,0.35);
 const url=new URL("https://openapi.its.go.kr:9443/cctvInfo");
 Object.entries({apiKey:key,type:"ex",cctvType:"1",minX:(lon-radius).toFixed(5),maxX:(lon+radius).toFixed(5),minY:(lat-radius).toFixed(5),maxY:(lat+radius).toFixed(5),getType:"json"}).forEach(([k,v])=>url.searchParams.set(k,v));
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),9500);
 try{
  const upstream=await fetch(url,{headers:{Accept:"application/json, application/xml, text/xml"},signal:controller.signal});
  if(!upstream.ok)throw Error("UPSTREAM_HTTP_"+upstream.status);
  const content=await upstream.text();
  if(content.length>3000000)throw Error("UPSTREAM_TOO_LARGE");
  let items;try{items=parseCctvPayload(content)}catch{ return respond(res,502,{ok:false,code:"RESPONSE_SCHEMA",message:"ITS CCTV 응답 형식을 확인해야 합니다."}) }
  const cameras=sanitizeCameras(items);
  return respond(res,200,{ok:true,source:"국토교통부 ITS CCTV",cameras,count:cameras.length,at:new Date().toISOString(),note:"HTTP 영상 주소는 HTTPS 사이트에서 직접 재생되지 않을 수 있습니다."},true);
 }catch(e){return upstreamFailure(res,e)}
 finally{clearTimeout(timer)}
}
