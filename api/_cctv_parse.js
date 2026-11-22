// CCTV upstream accepts JSON and XML; do not mistake schema errors for empty data.
function decodeEntities(value){
 return String(value??"").replace(/&(?:amp|lt|gt|quot|apos|#(\d+)|#x([0-9a-fA-F]+));/g,(m,decimal,hex)=>{
   if(decimal||hex){const n=Number.parseInt(decimal||hex,hex?16:10);return Number.isFinite(n)&&n>=0&&n<=0x10ffff?String.fromCodePoint(n):""}
   return {"&amp;":"&","&lt;":"<","&gt;":">",'&quot;':'"',"&apos;":"'"}[m]||m;
 });
}
function field(block,name){
 const m=block.match(new RegExp("<"+name+"\\b[^>]*>([\\s\\S]*?)<\\/"+name+">","i"));
 return decodeEntities(m?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1")?.trim()||"");
}
export function parseCctvPayload(raw){
 const body=String(raw??"").trim();
 if(body.startsWith("{")||body.startsWith("[")){
  let obj;try{obj=JSON.parse(body)}catch{throw Error("RESPONSE_SCHEMA")}
  if(!obj||typeof obj!=="object"||!obj.response)throw Error("RESPONSE_SCHEMA");
  const v=obj.response.data;
  if(v===undefined||v===null)throw Error("RESPONSE_SCHEMA");
  return Array.isArray(v)?v:Array.isArray(v.cctv)?v.cctv:Array.isArray(v.data)?v.data:[v];
 }
 if(!/<response(?:\s|>)/i.test(body))throw Error("RESPONSE_SCHEMA");
 const parts=[...body.matchAll(/<data\b[^>]*>([\s\S]*?)<\/data>/gi)].map(m=>m[1]);
 if(parts.length===0){
  // A syntactically valid empty CCTV response may have an empty <data/> node.
  if(/<data\s*\/>/i.test(body)||field(body,"datacount")==="0")return [];
  throw Error("RESPONSE_SCHEMA");
 }
 return parts.map(part=>({
  cctvname:field(part,"cctvname"),
  cctvurl:field(part,"cctvurl"),
  coordx:field(part,"coordx"),
  coordy:field(part,"coordy"),
  cctvformat:field(part,"cctvformat")
 }));
}
export function sanitizeCameras(items){
 return items.slice(0,120).map(x=>{
   const url=String(x.cctvurl||x.cctvUrl||"").trim();
   const lat=Number(x.coordy??x.coordY??x.latitude),lon=Number(x.coordx??x.coordX??x.longitude);
   return {name:String(x.cctvname||x.cctvName||"CCTV").trim().slice(0,100),
     lat,lon,
     url:/^https?:\/\//i.test(url)?url.slice(0,2048):"",
     playable:/^https:\/\//i.test(url),
     format:String(x.cctvformat||"").slice(0,20)
   };
 }).filter(x=>x.name&&x.lat>=33&&x.lat<=39&&x.lon>=124&&x.lon<=132&&x.url);
}
