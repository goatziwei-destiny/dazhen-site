// LINE 驗簽轉送函式（netlify/functions/line-webhook.js）的單元測試：node tools/line-webhook-proxy-test.js
const crypto=require('crypto');const fn=require('/home/claude/dazhen-site/netlify/functions/line-webhook.js');
process.env.LINE_CHANNEL_SECRET='s3cret';process.env.LINE_PROXY_KEY='KEY1';process.env.LINE_GAS_URL='https://script.example/exec';
let sent=[];global.fetch=async(u,o)=>{sent.push([u,String(o.body)]);return{status:200}};
const body=JSON.stringify({events:[{type:'message',replyToken:'r',source:{userId:'U1'},message:{type:'text',text:'hi'}}]});
const good=crypto.createHmac('sha256','s3cret').update(body).digest('base64');
(async()=>{
 let ok=0,f=0;const t=(c,m)=>{console.log(c?'✓':'✗',m);c?ok++:f++};
 let r=await fn.handler({httpMethod:'POST',headers:{'x-line-signature':good},body});t(r.statusCode===200&&sent.length===1&&sent[0][0]==='https://script.example/exec?pk=KEY1'&&sent[0][1]===body,'簽章對：轉送原文、帶密鑰');
 r=await fn.handler({httpMethod:'POST',headers:{'x-line-signature':'bad'},body});t(r.statusCode===401&&sent.length===1,'簽章錯：401、不轉送');
 r=await fn.handler({httpMethod:'POST',headers:{},body});t(r.statusCode===401&&sent.length===1,'沒簽章：401、不轉送');
 r=await fn.handler({httpMethod:'GET',headers:{},body:''});t(r.statusCode===405,'GET：405');
 delete process.env.LINE_PROXY_KEY;r=await fn.handler({httpMethod:'POST',headers:{'x-line-signature':good},body});t(r.statusCode===500&&sent.length===1,'沒設定好：500、不轉送');
 console.log(f?'有 '+f+' 項沒過':'全部通過');
})();
