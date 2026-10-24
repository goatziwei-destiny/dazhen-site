"""把「日式紙雕」卡面原圖做輕度像素化（2px 格、64 色、銳化＋微加飽和），外框與星名維持原細緻畫風。
用法：python3 tools/pixelize_cards.py <卡面原圖資料夾>   → 輸出 assets/sprites/o_00..o_13.webp（對應 DUOCARDS 順序）
需要：pip install pillow numpy"""
import sys,os,re,json
import numpy as np
from PIL import Image,ImageFilter,ImageEnhance
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FW,FH=400,600;X0,Y0,X1,Y1=12,12,388,516;B=2;PAL=64
def frame_palette(o):
    w=np.asarray(o);ring=np.concatenate([w[:,:9].reshape(-1,3),w[:,-9:].reshape(-1,3),w[-80:,:].reshape(-1,3)])
    q=Image.fromarray(ring.reshape(1,-1,3).astype('uint8')).quantize(colors=10,method=Image.Quantize.MEDIANCUT)
    return np.array(q.getpalette()[:30]).reshape(-1,3)
def pixelize(path):
    o=Image.open(path).convert('RGB').resize((FW,FH),Image.LANCZOS)
    win=o.crop((X0,Y0,X1,Y1));w,h=win.size
    big=win.resize((w*2,h*2),Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2,percent=80,threshold=2))
    g=big.resize((w//B,h//B),Image.BOX);g=ImageEnhance.Color(g).enhance(1.12);g=ImageEnhance.Contrast(g).enhance(1.05)
    g=g.quantize(colors=PAL,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).convert('RGB').resize((w//B*B,h//B*B),Image.NEAREST)
    c=o.copy();c.paste(g,(X0,Y0))
    P=frame_palette(o);oa=np.asarray(o).astype(int);ca=np.asarray(c).copy()
    for x0,y0,x1,y1 in [(0,0,46,46),(FW-46,0,FW,46),(160,0,240,32),(0,120,30,175),(FW-30,120,FW,175),(0,300,30,355),(FW-30,300,FW,355)]:
        sub=oa[y0:y1,x0:x1];d=np.min(np.linalg.norm(sub[:,:,None,:]-P[None,None,:,:],axis=3),axis=2);m=d<26
        sel=ca[y0:y1,x0:x1];sel[m]=sub[m];ca[y0:y1,x0:x1]=sel   # 角飾、邊中點裝飾維持原圖
    return Image.fromarray(ca)
if __name__=='__main__':
    src=sys.argv[1];files={f.split('-')[1]:f for f in os.listdir(src) if f[:2].isdigit() and int(f[:2])<=14}
    s=open(os.path.join(R,'src','game-src.html'),encoding='utf-8').read()
    cards=json.loads(re.search(r'const DUOCARDS=(\[.*?\]);',s,re.S).group(1))
    for c in cards:
        pixelize(os.path.join(src,files[c['star']])).save(os.path.join(R,'assets','sprites',c['img']+'.webp'),quality=92,method=6);print(c['star'],c['img'])
