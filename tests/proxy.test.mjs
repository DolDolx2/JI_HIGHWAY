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

test("EX congestion normalizes conzone readings and never leaks API key",async()=>{
 const handler=(await import("../api/congestion.js")).default;
 const prior=process.env.EX_API_KEY;process.env.EX_API_KEY="unit-test-secret";
 try{await withFetch(async()=>{
  const res=fakeResponse();
  await handler({method:"GET"},res);
  assert.equal(res.code,200);
  assert.equal(res.payload.sections.length,1);
  assert.equal(res.payload.sections[0].segment,"양재IC-판교IC");
  assert.equal(res.payload.sections[0].speed,31);
  assert.equal(res.payload.sections[0].grade,3);
  assert.equal(res.payload.totalRead,1);
  assert.ok(!JSON.stringify(res.payload).includes("unit-test-secret"));
 })(async (url)=>{
  assert.equal(new URL(url).searchParams.get("key"),"unit-test-secret");
  return okay({list:[{routeNo:"0010",routeName:"경부선",conzoneName:"양재IC-판교IC",speed:"31",grade:"3",stdDate:"20261122",stdHour:"21"}]});
 })}
 finally{if(prior===undefined)delete process.env.EX_API_KEY;else process.env.EX_API_KEY=prior}
});

test("Realtime feed excludes smooth-grade rows and exposes real sampling time",async()=>{
 const handler=(await import("../api/congestion.js")).default;
 const previous=process.env.EX_API_KEY;process.env.EX_API_KEY="test-key";
 try{
  await withFetch(async()=>{
   const res=fakeResponse();await handler({method:"GET"},res);
   assert.equal(res.code,200);
   assert.equal(res.payload.totalRead,3);
   assert.deepEqual(res.payload.sections.map(x=>x.grade),[3,2]);
   assert.equal(res.payload.sections[0].sampledAt,"20261122 2150");
  })(async()=>okay({list:[
   {routeNo:"0010",routeName:"경부선",conzoneName:"A",grade:1,speed:101},
   {routeNo:"0010",routeName:"경부선",conzoneName:"B",grade:2,speed:50},
   {routeNo:"0010",routeName:"경부선",conzoneName:"C",grade:3,speed:18,stdDate:"20261122",stdHour:"2150"}
  ]}));
 }finally{if(previous===undefined)delete process.env.EX_API_KEY;else process.env.EX_API_KEY=previous}
});
test("Realtime feed never reports unknown API schema as valid empty congestion",async()=>{
 const handler=(await import("../api/congestion.js")).default;
 const previous=process.env.EX_API_KEY;process.env.EX_API_KEY="test-key";
 try{await withFetch(async()=>{
  const res=fakeResponse();await handler({method:"GET"},res);
  assert.equal(res.code,502);assert.equal(res.payload.code,"RESPONSE_SCHEMA");
 })(async()=>okay({code:"SUCCESS",unexpected:true}))}
 finally{if(previous===undefined)delete process.env.EX_API_KEY;else process.env.EX_API_KEY=previous}
});

test("ITS CCTV XML and JSON parsing preserve cameras and safely distinguish stream protocols",async()=>{
 const {parseCctvPayload,sanitizeCameras}=await import("../api/_cctv_parse.js");
 const xml='<response><coordtype>1</coordtype><datacount>2</datacount><data><cctvname>경부선 &amp; 청주</cctvname><coordx>127.49</coordx><coordy>36.65</coordy><cctvurl>http://example.org/a.m3u8</cctvurl><cctvformat>HLS</cctvformat></data><data><cctvname>영동선</cctvname><coordx>127.3</coordx><coordy>37.2</coordy><cctvurl>https://example.org/b.m3u8</cctvurl></data></response>';
 const cameras=sanitizeCameras(parseCctvPayload(xml));
 assert.equal(cameras.length,2);
 assert.equal(cameras[0].name,"경부선 & 청주");
 assert.equal(cameras[0].playable,false);
 assert.equal(cameras[1].playable,true);
 const json=JSON.stringify({response:{data:[{cctvname:"정상",coordx:127.49,coordy:36.65,cctvurl:"https://example.org/live.m3u8"}]}});
 assert.equal(sanitizeCameras(parseCctvPayload(json)).length,1);
 assert.throws(()=>parseCctvPayload("<invalid/>"),/RESPONSE_SCHEMA/);
});
