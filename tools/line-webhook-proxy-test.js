// LINE 驗簽轉送函式（netlify/functions/line-webhook.js）的單元測試：node tools/line-webhook-proxy-test.js
const crypto=require('crypto');const fn=require('../netlify/functions/line-webhook.js');
process.env.LINE_CHANNEL_SECRET='s3cret';process.env.LINE_PROXY_KEY='KEY1';process.env.LINE_GAS_URL='https://script.example/exec';
let sent=[],reply={status:200,text:'OK'};
global.fetch=async(u,o)=>{sent.push([u,String(o.body)]);if(reply.throw)throw new Error('ECONNRESET');return{status:reply.status,ok:reply.status>=200&&reply.status<300,text:async()=>reply.text}};
const body=JSON.stringify({events:[{type:'message',replyToken:'r',webhookEventId:'E1',source:{userId:'U1'},message:{type:'text',text:'hi'}}]});
const good=crypto.createHmac('sha256','s3cret').update(body).digest('base64');
const post=()=>fn.handler({httpMethod:'POST',headers:{'x-line-signature':good},body});
(async()=>{
 let f=0;const t=(c,m)=>{console.log(c?'✓':'✗',m);if(!c)f++};
 let r=await post();t(r.statusCode===200&&sent.length===1&&sent[0][0]==='https://script.example/exec?pk=KEY1'&&sent[0][1]===body,'簽章對、Apps Script 回 OK：轉送原文、帶密鑰、回 200');
 reply={status:503,text:'busy'};r=await post();t(r.statusCode===502,'Apps Script 回 503：回 502 給 LINE（不當成功）');
 reply={throw:true};r=await post();t(r.statusCode===502,'連線中斷：回 502 給 LINE');
 reply={status:200,text:'REJECTED'};r=await post();t(r.statusCode===500,'Apps Script 拒收（密鑰不同）：回 500');
 reply={status:200,text:'ERROR'};r=await post();t(r.statusCode===500,'Apps Script 處理出錯：回 500');
 reply={status:200,text:'OK'};const n=sent.length;
 r=await fn.handler({httpMethod:'POST',headers:{'x-line-signature':'bad'},body});t(r.statusCode===401&&sent.length===n,'簽章錯：401、不轉送');
 r=await fn.handler({httpMethod:'POST',headers:{},body});t(r.statusCode===401&&sent.length===n,'沒簽章：401、不轉送');
 r=await fn.handler({httpMethod:'GET',headers:{},body:''});t(r.statusCode===405,'GET：405');
 delete process.env.LINE_PROXY_KEY;r=await post();t(r.statusCode===500&&sent.length===n,'沒設定好：500、不轉送');
 console.log(f?'有 '+f+' 項沒過':'全部通過');process.exitCode=f?1:0;
})();
