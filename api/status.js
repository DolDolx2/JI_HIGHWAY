import {respond,requireGET} from "./_shared.js";
export default function handler(req,res){
 if(!requireGET(req,res))return;
 const flags={ex:Boolean(process.env.EX_API_KEY),cctv:Boolean(process.env.ITS_CCTV_API_KEY),tmap:Boolean(process.env.TMAP_APP_KEY)};
 return respond(res,200,{ok:true,configured:flags,at:new Date().toISOString()});
}
