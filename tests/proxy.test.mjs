import test from "node:test";
import assert from "node:assert/strict";
import statusHandler from "../api/status.js";
import icsHandler from "../api/ics.js";
import poisHandler from "../api/pois.js";
import routeHandler from "../api/route.js";
import cctvHandler from "../api/cctv.js";
function fakeResponse(){
 const res={code:200,headers:{},payload:null,setHeader(k,v){this.headers[k]=v;return this},status(n){this.code=n;return this},json(v){this.payload=v;return this}};
 return res;
}
function withFetch(handler){
 return async fn=>{
  const prev=globalThis.fetch;globalThis.fetch=fn;
  try{return await handler()}finally{globalThis.fetch=prev}
 };
}
const okay=x=>({ok:true,text:async()=>JSON.stringify(x),json:async()=>x});
test("status never returns API key values",()=>{
 const prev=process.env.EX_API_KEY;process.env.EX_API_KEY="unit-test-secret";
 try{const res=fakeResponse();statusHandler({method:"GET"},res);assert.equal(res.code,200);assert.equal(res.payload.configured.ex,true);assert.ok(!JSON.stringify(res.payload).includes("unit-test-secret"))}
 finally{if(prev===undefined)delete process.env.EX_API_KEY;else process.env.EX_API_KEY=prev}
});
test("EX IC parser normalizes coordinates and does not expose key",async()=>{
 const prev=process.env.EX_API_KEY;process.env.EX_API_KEY="unit-test-secret";
 try{await withFetch(async()=>{
  const res=fakeResponse();
  await icsHandler({method:"GET"},res);
  assert.equal(res.code,200);
  assert.equal(res.payload.locations[0].name,"청주IC");
  assert.equal(res.payload.locations[0].lon,127.4);
  assert.ok(!JSON.stringify(res.payload).includes("unit-test-secret"));
 })(async url=>{
  assert.equal(new URL(url).searchParams.get("key"),"unit-test-secret");
  assert.equal(new URL(url).searchParams.get("numOfRows"),"1000");
  return okay({list:[{icName:"청주IC",icCode:"01",xValue:"127.4",yValue:"36.6",routeName:"경부선"}]});
 })}
 finally{if(prev===undefined)delete process.env.EX_API_KEY;else process.env.EX_API_KEY=prev}
});
test("TMAP route refuses invalid coordinates without upstream request",async()=>{
 const prev=process.env.TMAP_APP_KEY;process.env.TMAP_APP_KEY="unit-test-secret";
 try{const res=fakeResponse();await routeHandler({method:"POST",body:{startLat:0,startLon:127,endLat:35,endLon:129}},res);assert.equal(res.code,400);assert.equal(res.payload.code,"COORD_REQUIRED")}
 finally{if(prev===undefined)delete process.env.TMAP_APP_KEY;else process.env.TMAP_APP_KEY=prev}
});
test("TMAP route returns distance/minutes without raw upstream payload",async()=>{
 const prev=process.env.TMAP_APP_KEY;process.env.TMAP_APP_KEY="unit-test-secret";
 try{await withFetch(async()=>{
  const res=fakeResponse();
  await routeHandler({method:"POST",body:{startLat:36.6,startLon:127.4,endLat:37,endLon:127.9}},res);
  assert.equal(res.code,200);assert.equal(res.payload.distanceKm,15.2);
  assert.equal(res.payload.durationMin,21);assert.equal(res.payload.polyline.length,2);
 })(async (_url,init)=>{
  assert.equal(init.headers.appKey,"unit-test-secret");
  return okay({features:[{properties:{totalDistance:15200,totalTime:1210},geometry:{type:"LineString",coordinates:[[127.4,36.6],[127.9,37]]}}]});
 })}
 finally{if(prev===undefined)delete process.env.TMAP_APP_KEY;else process.env.TMAP_APP_KEY=prev}
});
test("CCTV rejects out of bounds and methods",async()=>{
 const prev=process.env.ITS_CCTV_API_KEY;process.env.ITS_CCTV_API_KEY="unit-test-secret";
 try{const res=fakeResponse();await cctvHandler({method:"GET",query:{lat:"0",lon:"127"}},res);assert.equal(res.code,400);
 const noPost=fakeResponse();await cctvHandler({method:"POST",query:{}},noPost);assert.equal(noPost.code,405)}
 finally{if(prev===undefined)delete process.env.ITS_CCTV_API_KEY;else process.env.ITS_CCTV_API_KEY=prev}
});
test("POI rejects one-letter search",async()=>{
 const prev=process.env.TMAP_APP_KEY;process.env.TMAP_APP_KEY="unit-test-secret";
 try{const res=fakeResponse();await poisHandler({method:"GET",query:{q:"가"}},res);assert.equal(res.code,400)}
 finally{if(prev===undefined)delete process.env.TMAP_APP_KEY;else process.env.TMAP_APP_KEY=prev}
});
