import {getJSON,respond,requireGET,inputNumber,upstreamFailure} from "./_shared.js";
export default async function handler(req,res){
 if(!requireGET(req,res))return;
 if(!process.env.ITS_CCTV_API_KEY)return respond(res,503,{ok:false,code:"NOT_CONFIGURED"});
 const lat=inputNumber(req.query.lat,33,39),lon=inputNumber(req.query.lon,124,132);
 if(lat===null||lon===null)return respond(res,400,{ok:false,code:"COORD_REQUIRED",message:"조회 중심 좌표를 입력하세요."});
 const radius=Math.min(inputNumber(req.query.radius,0.03,0.35)??0.12,0.35);
 const url=new URL("https://openapi.its.go.kr:9443/cctvInfo");
 Object.entries({apiKey:process.env.ITS_CCTV_API_KEY,type:"ex",cctvType:"1",minX:(lon-radius).toFixed(5),maxX:(lon+radius).toFixed(5),minY:(lat-radius).toFixed(5),maxY:(lat+radius).toFixed(5),getType:"json"}).forEach(([k,v])=>url.searchParams.set(k,v));
 try{
  const doc=await getJSON(url.toString());
  const raw=doc?.response?.data;
  const list=Array.isArray(raw)?raw:Array.isArray(raw?.cctv)?raw.cctv:[];
  const cameras=list.slice(0,100).map(x=>({
   name:String(x.cctvname||x.cctvName||"CCTV").slice(0,100),
   lat:Number(x.coordy||x.coordY||x.latitude),
   lon:Number(x.coordx||x.coordX||x.longitude),
   url:String(x.cctvurl||x.cctvUrl||"").slice(0,2048)
  })).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon)&&/^https:\/\//.test(x.url));
  if(!raw)return respond(res,502,{ok:false,code:"RESPONSE_SCHEMA",message:"CCTV 응답 구조를 확인해야 합니다."});
  return respond(res,200,{ok:true,source:"국토교통부 ITS",cameras,at:new Date().toISOString()},true);
 }catch(e){return upstreamFailure(res,e)}
}
