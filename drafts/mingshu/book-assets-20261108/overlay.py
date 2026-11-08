import numpy as np, cv2
from PIL import Image
LOGO='/home/claude/dazhen-site/drafts/mingshu/logo-emblem-from-page1.png'
def build_layer(Wf,Hf,k=2,logo_w=0.74,logo_v=0.495,orn=True):
    lay=np.zeros((Hf*k,Wf*k),np.float32)
    P=lambda u,v:(int(u*Wf*k),int(v*Hf*k))
    th=int(3.6*k)
    def star(cu,cv,R):
        cx,cy=P(cu,cv);R=int(R*k);pts=[]
        for i in range(8):
            ang=i*np.pi/4;r=R if i%2==0 else R*0.4
            pts.append((cx+r*np.sin(ang),cy-r*np.cos(ang)))
            a2=ang+np.pi/8
            pts.append((cx+R*0.16*np.sin(a2),cy-R*0.16*np.cos(a2)))
        cv2.fillPoly(lay,[np.int32(pts)],1.0,lineType=cv2.LINE_AA)
    def o(v,half=0.22,gap=0.05,R=50):
        cv2.line(lay,P(0.5-gap-half,v),P(0.5-gap,v),1.0,th,cv2.LINE_AA)
        cv2.line(lay,P(0.5+gap,v),P(0.5+gap+half,v),1.0,th,cv2.LINE_AA)
        star(0.5,v,R)
    if orn: o(0.125); o(0.865)
    lg=np.array(Image.open(LOGO).convert('RGBA')).astype(np.float32)
    la=lg[...,3]/255
    la=np.clip(cv2.dilate(la,np.ones((2,2)))*1.15,0,1)
    sc=logo_w*Wf*k/422
    M=np.float32([[sc,0,0.5*Wf*k-238*sc],[0,sc,logo_v*Hf*k-101.5*sc]])
    lay=np.maximum(lay,cv2.warpAffine(la,M,(lay.shape[1],lay.shape[0]),flags=cv2.INTER_LINEAR))
    return lay
def apply(base_rgba,dst,size,out,logo_w=0.74,orn=True,shift=None):
    Wf,Hf=1000,1180;k=2
    lay=build_layer(Wf,Hf,k,logo_w,orn=orn)
    src=np.float32([[0,0],[Wf,0],[Wf,Hf],[0,Hf]])
    Hm=cv2.getPerspectiveTransform(src,np.float32(dst))@np.diag([1/k,1/k,1])
    oa=cv2.warpPerspective(lay,Hm,(size,size),flags=cv2.INTER_AREA)
    oa=cv2.GaussianBlur(oa,(0,0),0.5)
    col=np.array([236,194,102],np.float32)
    base=base_rgba[...,:3].astype(np.float32)
    sha=cv2.GaussianBlur(np.roll(np.roll(oa,2,0),2,1),(0,0),1.5)
    base=base*(1-0.45*sha[...,None])
    res=base*(1-oa[...,None]*.97)+col*oa[...,None]*.97
    fin=np.dstack([res.clip(0,255),base_rgba[...,3]]).astype(np.uint8)
    Image.fromarray(fin).save(out)
    return fin
if __name__=='__main__':
    b=np.array(Image.open('keyed/half-v1.png'))
    fin=apply(b,[[198,182],[344,68],[349,802],[201,903]],1254,'half-v1-logo.png',logo_w=0.78)
    im=Image.fromarray(fin);bg=Image.new('RGBA',im.size,(244,241,234,255));bg.alpha_composite(im)
    bg.convert('RGB').crop((100,0,520,1000)).save('/tmp/half_logo_crop.jpg')
    bg.convert('RGB').resize((627,627)).save('/tmp/half_logo.jpg')
