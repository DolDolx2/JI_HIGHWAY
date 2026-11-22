import {getJSON,respond,requireGET,upstreamFailure} from "./_shared.js";
export default async function handler(req,res){
 if(!requireGET(req,res))return;
 if(!process.env.TMAP_APP_KEY)return respond(res,503,{ok:false,code:"NOT_CONFIGURED"});
 const q=String(req.query.q||"").trim();
 if(q.length<2||q.length>70)return respond(res,400,{ok:false,code:"QUERY_LENGTH",message:"검색어는 2~70자입니다."});
 const url=new URL("https://apis.openapi.sk.com/tmap/pois");
 Object.entries({version:"1",format:"json",searchKeyword:q,count:"10",page:"1",searchType:"all",reqCoordType:"WGS84GEO",resCoordType:"WGS84GEO"}).forEach(([k,v])=>url.searchParams.set(k,v));
 try{
  const doc=await getJSON(url.toString(),{appKey:process.env.TMAP_APP_KEY});
  const raw=doc?.searchPoiInfo?.pois?.poi||[];
  const list=(Array.isArray(raw)?raw:[raw]).filter(Boolean).map(x=>({
    name:String(x.name||"").slice(0,100),
    address:String([x.upperAddrName,x.middleAddrName,x.lowerAddrName,x.detailAddrName].filter(Boolean).join(" ")).slice(0,220),
    lon:Number(x.frontLon||x.noorLon||x.lon),
    lat:Number(x.frontLat||x.noorLat||x.lat)
  })).filter(x=>x.name&&Number.isFinite(x.lat)&&Number.isFinite(x.lon)).slice(0,10);
  if(!doc?.searchPoiInfo)return respond(res,502,{ok:false,code:"RESPONSE_SCHEMA"});
  return respond(res,200,{ok:true,pois:list},true);
 }catch(e){return upstreamFailure(res,e)}
}
