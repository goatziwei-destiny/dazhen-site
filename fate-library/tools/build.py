"""命運書庫 build：把 src/game-src.html + assets/ 打包成單一 HTML。
用法：python3 tools/build.py            → dist/game.html（命運書庫）、dist/duo.html（抽牌小遊戲）、dist/web-duo.html（網站 /draw/ 用）
需要：pip install fonttools brotli（字型子集化）"""
import base64,json,os,subprocess,sys
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P=lambda *a:os.path.join(R,*a)
MIME={'webp':'image/webp','png':'image/png','jpg':'image/jpeg','jpeg':'image/jpeg'}
b64=lambda f:base64.b64encode(open(f,'rb').read()).decode()
def sprites(which):
    man=json.load(open(P('assets','manifest.json'),encoding='utf-8'))[which]
    return {k:f'data:{MIME[f.rsplit(".",1)[1]]};base64,'+b64(P('assets','sprites',f)) for k,f in man.items()}
def build(which,out,title=None):
    s=open(P('src','game-src.html'),encoding='utf-8').read()
    if which=='duo':
        s=s.replace('const DUO_PREVIEW=false,DUO_GAME=false;','const DUO_PREVIEW=false,DUO_GAME=true;')
        s=s.replace('<title>命運書庫</title>','<title>大正的抽牌小遊戲</title>')
    chars=set(c for c in s if ord(c)>127)|set('0123456789')
    os.makedirs(P('dist'),exist_ok=True);ct=P('dist','chars.txt');fw=P('dist','font.woff2')
    open(ct,'w',encoding='utf-8').write(''.join(sorted(chars)))
    subprocess.run([sys.executable,'-m','fontTools.subset',P('assets','media','Cubic_11_1.100_R.ttf'),f'--text-file={ct}','--flavor=woff2',f'--output-file={fw}'],check=True,capture_output=True)
    s=s.replace('__FONT__','data:font/woff2;base64,'+b64(fw)).replace('__AUDIO__','data:audio/mpeg;base64,'+b64(P('assets','media','loop.mp3')))
    fm=open(P('assets','frames-main.json' if which=='main' else 'frames-duo.json'),encoding='utf-8').read()
    s=s.replace('__SPR__',json.dumps(sprites(which))).replace('__FM__',json.dumps(json.loads(fm))).replace('__GRP__','null')
    open(P('dist',out),'w',encoding='utf-8').write(s)
    # 本機預覽版（含 doctype，可直接用瀏覽器開；截圖工具也用這個）
    open(P('dist','local-'+out),'w',encoding='utf-8').write('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+s+'</body></html>')
    if which=='duo':
        # 網站／LINE 用的完整網頁（手機版面＋分享預覽），複製到 dazhen-site/static/draw/index.html 就會在 /draw/ 上線
        og='<meta property="og:title" content="大正的抽牌小遊戲"><meta property="og:description" content="大正幫你洗牌，憑直覺抽兩張星曜卡，看看今天的提示。">'
        open(P('dist','web-'+out),'w',encoding='utf-8').write('<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+og+'</head><body style="margin:0">'+s+'</body></html>')
    os.remove(ct);os.remove(fw);print(out,round(len(s)/1e6,2),'MB')
def build_web(q=80):
    """網站／LINE 用的命運書庫：圖片拆成獨立檔案、用到才載入（不受 16 MB 限制，手機開得快、省流量）。
    輸出 dist/web/library/（index.html＋img/＋音樂），整個資料夾複製到 dazhen-site/static/library/ 就會在 /library/ 上線。
    圖檔名含內容雜湊，內容沒變就沿用手機裡的快取；圖片重新壓成 webp quality=q。"""
    import hashlib,io,shutil
    from PIL import Image
    out=P('dist','web','library');shutil.rmtree(out,ignore_errors=True);os.makedirs(os.path.join(out,'img'))
    man=json.load(open(P('assets','manifest.json'),encoding='utf-8'))['main']
    grp=json.load(open(P('assets','groups.json'),encoding='utf-8'));grp.pop('_說明',None)
    spr={};tot=0
    for k,f in man.items():
        im=Image.open(P('assets','sprites',f));b=io.BytesIO()
        im.save(b,'WEBP',quality=q,method=6);data=b.getvalue()
        src=open(P('assets','sprites',f),'rb').read()
        if len(src)<=len(data):data=src   # 重新壓縮沒有變小就用原檔
        h=hashlib.md5(data).hexdigest()[:8];name=f'img/{k}.{h}.webp'
        open(os.path.join(out,name),'wb').write(data);spr[k]=name;tot+=len(data)
    mp=open(P('assets','media','loop.mp3'),'rb').read();mname='loop.'+hashlib.md5(mp).hexdigest()[:8]+'.mp3'
    open(os.path.join(out,mname),'wb').write(mp)
    s=open(P('src','game-src.html'),encoding='utf-8').read()
    chars=set(c for c in s if ord(c)>127)|set('0123456789')
    ct=P('dist','chars.txt');fw=P('dist','font.woff2');open(ct,'w',encoding='utf-8').write(''.join(sorted(chars)))
    subprocess.run([sys.executable,'-m','fontTools.subset',P('assets','media','Cubic_11_1.100_R.ttf'),f'--text-file={ct}','--flavor=woff2',f'--output-file={fw}'],check=True,capture_output=True)
    s=s.replace('__FONT__','data:font/woff2;base64,'+b64(fw)).replace('__AUDIO__',mname)
    fm=json.load(open(P('assets','frames-main.json'),encoding='utf-8'))
    s=s.replace('__SPR__',json.dumps(spr)).replace('__FM__',json.dumps(fm)).replace('__GRP__',json.dumps(grp,ensure_ascii=False))
    # 放在自己網站：連結用本站網址、在同一個視窗開（LINE 裡不會跳出去）
    # 網站版不顯示上方的標題與說明文字（遊戲畫面裡已經有書庫名稱）
    s=s.replace('<header>','<header style="display:none">',1)
    s=s.replace("const SITE='https://dazhen-site.netlify.app';","const SITE='';").replace("a.target='_blank';a.rel='noopener';","a.target='_top';")
    og='<meta property="og:title" content="命運書庫｜大正命理諮詢"><meta property="og:description" content="住在書庫裡的羊——大正，帶你翻翻命理小知識。">'
    page='<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+og+'</head><body style="margin:0">'+s+'</body></html>'
    open(os.path.join(out,'index.html'),'w',encoding='utf-8').write(page)
    os.remove(ct);os.remove(fw)
    def sz(keys):return sum(os.path.getsize(os.path.join(out,spr[k])) for k in keys if k in spr)
    ori=grp['ori'];core_w=[k for k in grp['core'] if ori.get(k,'w')=='w'];core_t=[k for k in grp['core'] if ori.get(k,'t')=='t']
    print('web/library: index.html',round(len(page)/1e6,2),'MB；圖片共',round(tot/1e6,2),'MB')
    print('  開場要下載：橫式',round((len(page)+sz(core_w))/1e6,2),'MB／直式',round((len(page)+sz(core_t))/1e6,2),'MB')
    for g,ks in grp['group'].items():print('  ',g,round(sz(ks)/1e6,2),'MB')
if __name__=='__main__':
    which=sys.argv[1:] or ['main','duo','web']
    if 'main' in which:build('main','game.html')
    if 'duo' in which:build('duo','duo.html')
    if 'web' in which:build_web()
