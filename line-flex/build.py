import base64,sys
s=open('preview-template.html',encoding='utf-8').read()
for k,f in (('__HERO1__','service-1-t.jpg'),('__HERO2__','service-2-t.jpg'),('__HERO3__','text-1-t.jpg'),('__HERO4__','text-2-t.jpg')):
    s=s.replace(k,'data:image/jpeg;base64,'+base64.b64encode(open('../static/images/line/'+f,'rb').read()).decode())
for k,f in (('__T1__','title-service.png'),('__T2__','title-booking.png'),('__T3__','title-text.png'),('__T4__','title-choose.png'),('__T5__','btn-one.png'),('__T6__','btn-text.png')):
    s=s.replace(k,'data:image/png;base64,'+base64.b64encode(open('../static/images/line/'+f,'rb').read()).decode())
open('preview.html','w',encoding='utf-8').write(s)
