// No secrets or upstream error bodies are returned to browsers.
export const respond=(res,code,data,cache=false)=>{
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control",cache?"public, s-maxage=60, stale-while-revalidate=60":"no-store");
  return res.status(code).json(data);
};
export function inputNumber(value,min,max){
  const n=Number(value); return value!==undefined&&value!==null&&String(value).trim()!==""&&Number.isFinite(n)&&n>=min&&n<=max?n:null;
}
export async function getJSON(url,headers={}){
  const controller=new AbortController();const t=setTimeout(()=>controller.abort(),9500);
  try {
    const r=await fetch(url,{headers:{Accept:"application/json",...headers},signal:controller.signal});
    if(!r.ok)throw new Error("UPSTREAM_HTTP_"+r.status);
    const raw=await r.text();
    if(raw.length>3000000)throw new Error("UPSTREAM_TOO_LARGE");
    try{return JSON.parse(raw)}catch{throw new Error("UPSTREAM_NOT_JSON")}
  }finally{clearTimeout(t)}
}
export function upstreamFailure(res,e){
  const reason=e?.name==="AbortError"?"TIMEOUT":String(e?.message||"UPSTREAM_UNAVAILABLE");
  const code=/^UPSTREAM_HTTP_4(01|03)$/.test(reason)?"UPSTREAM_AUTH":/^UPSTREAM_HTTP_429$/.test(reason)?"UPSTREAM_LIMIT":"UPSTREAM_UNAVAILABLE";
  return respond(res,502,{ok:false,code,message:"외부 정보 제공처 응답을 확인할 수 없습니다."});
}
export function requireGET(req,res){if(req.method!=="GET"){res.setHeader("Allow","GET");respond(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"});return false}return true}
