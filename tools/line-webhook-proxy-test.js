// LINE 轉送函式（netlify/functions/line-webhook.mjs）的單元測試：node tools/line-webhook-proxy-test.js
const crypto=require('crypto');
(async()=>{
 const m=await import('../netlify/functions/line-webhook.mjs'); const fn=m.default;
 delete process.env.LINE_CHANNEL_SECRET;delete process.env.LINE_GAS_URL;
 let sent=[],reply={status:200,text:'OK'},slow=0;
 global.fetch=async(u,o)=>{sent.push([u,Buffer.from(o.body).toString()]);if(slow)await new Promise(r=>setTimeout(r,slow));if(reply.throw)throw new Error('ECONNRESET');return{status:reply.status,ok:reply.status>=200&&reply.status<300,text:async()=>reply.text}};
 const body=JSON.stringify({events:[{type:'message',replyToken:'r',webhookEventId:'E1',source:{userId:'U1'},message:{type:'text',text:'你好 😀'}}]});
 const good=crypto.createHmac('sha256','s3cret').update(body).digest('base64');
 const mk=(sig,method)=>new Request('https://x/.netlify/functions/line-webhook',{method:method||'POST',headers:sig===null?{}:{'x-line-signature':sig===undefined?good:sig},body:method==='GET'?undefined:body});
 let f=0;const t=(c,m)=>{console.log(c?'✓':'✗',m);if(!c)f++};
 let waits=[];const ctx={waitUntil:p=>waits.push(p)};
 slow=3000;const t0=Date.now();let r=await fn(mk(),ctx);const dt=Date.now()-t0;
 t(r.status===200&&dt<500,'Apps Script 很慢（3 秒）：先回 200 給 LINE，不等它（'+dt+'ms）');
 const out=await waits[0];slow=0;
 t(out==='OK'&&sent.length===1&&sent[0][0].endsWith('/exec?sig='+encodeURIComponent(good))&&sent[0][0].startsWith('https://script.google.com/macros/s/')&&sent[0][1]===body,'背景照樣轉送：原文、簽章放在網址、正式 Apps Script');
 reply={status:503,text:'x'};waits=[];r=await fn(mk(),ctx);t(r.status===200&&(await waits[0])==='x','Apps Script 503：記在紀錄，不影響回 LINE');
 reply={throw:true};waits=[];r=await fn(mk(),ctx);t((await waits[0])==='FAIL','連線中斷：記在紀錄');
 reply={status:200,text:'OK'};const n=sent.length;
 r=await fn(mk(null),ctx);t(r.status===401&&sent.length===n,'沒簽章：401、不轉送');
 r=await fn(mk(undefined,'GET'),ctx);t(r.status===405,'GET：405');
 process.env.LINE_CHANNEL_SECRET='s3cret';r=await fn(mk('bad'),ctx);t(r.status===401&&sent.length===n,'有設 secret：簽章錯在這裡就擋');
 waits=[];r=await fn(mk(),ctx);await waits[0];t(r.status===200&&sent.length===n+1,'有設 secret：簽章對照轉');
 console.log(f?'有 '+f+' 項沒過':'全部通過');process.exitCode=f?1:0;
})();
