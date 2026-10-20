import base64,sys
s=open('preview-template.html',encoding='utf-8').read()
for k,f in (('__HERO1__','service-1-t.jpg'),('__HERO2__','service-2-t.jpg'),('__HERO3__','text-1-t.jpg'),('__HERO4__','text-2-t.jpg')):
    s=s.replace(k,'data:image/jpeg;base64,'+base64.b64encode(open('../static/images/line/'+f,'rb').read()).decode())
open('preview.html','w',encoding='utf-8').write(s)
