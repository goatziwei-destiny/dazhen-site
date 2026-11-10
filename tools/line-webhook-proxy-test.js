// LINE 轉送函式（netlify/functions/line-webhook.js）的單元測試：node tools/line-webhook-proxy-test.js
const crypto=require('crypto');const fn=require('../netlify/functions/line-webhook.js');
delete process.env.LINE_CHANNEL_SECRET;delete process.env.LINE_GAS_URL;
let sent=[],reply={status:200,text:'OK'};
global.fetch=async(u,o)=>{sent.push([u,String(o.body)]);if(reply.throw)throw new Error('ECONNRESET');return{status:reply.status,ok:reply.status>=200&&reply.status<300,text:async()=>reply.text}};
const body=JSON.stringify({events:[{type:'message',replyToken:'r',webhookEventId:'E1',source:{userId:'U1'},message:{type:'text',text:'你好 😀'}}]});
const good=crypto.createHmac('sha256','s3cret').update(body).digest('base64');
const post=(sig)=>fn.handler({httpMethod:'POST',headers:{'x-line-signature':sig===undefined?good:sig},body});
(async()=>{
 let f=0;const t=(c,m)=>{console.log(c?'✓':'✗',m);if(!c)f++};
 let r=await post();t(r.statusCode===200&&sent.length===1&&sent[0][0].startsWith('https://script.google.com/macros/s/')&&sent[0][0].endsWith('/exec?sig='+encodeURIComponent(good))&&sent[0][1]===body,'不用設定：簽章放在網址、原文照轉到正式 Apps Script、回 200');
 reply={status:503,text:'busy'};r=await post();t(r.statusCode===502,'Apps Script 回 503：回 502 給 LINE');
 reply={throw:true};r=await post();t(r.statusCode===502,'連線中斷：回 502');
 reply={status:200,text:'REJECTED'};r=await post();t(r.statusCode===401,'Apps Script 驗簽不過：回 401');
 reply={status:200,text:'ERROR'};r=await post();t(r.statusCode===500,'Apps Script 處理出錯：回 500');
 reply={status:200,text:'OK'};let n=sent.length;
 r=await fn.handler({httpMethod:'POST',headers:{},body});t(r.statusCode===401&&sent.length===n,'沒簽章：401、不轉送');
 r=await fn.handler({httpMethod:'GET',headers:{},body:''});t(r.statusCode===405,'GET：405');
 process.env.LINE_CHANNEL_SECRET='s3cret';r=await post('bad');t(r.statusCode===401&&sent.length===n,'有設 secret：簽章錯在這裡就擋');
 r=await post();t(r.statusCode===200&&sent.length===n+1,'有設 secret：簽章對照轉');
 console.log(f?'有 '+f+' 項沒過':'全部通過');process.exitCode=f?1:0;
})();
