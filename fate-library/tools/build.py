"""命運書庫 build：把 src/game-src.html + assets/ 打包成單一 HTML。
用法：python3 tools/build.py            → dist/game.html（命運書庫）、dist/duo.html（抽牌小遊戲）
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
    s=s.replace('__SPR__',json.dumps(sprites(which))).replace('__FM__',json.dumps(json.loads(fm)))
    open(P('dist',out),'w',encoding='utf-8').write(s)
    # 本機預覽版（含 doctype，可直接用瀏覽器開；截圖工具也用這個）
    open(P('dist','local-'+out),'w',encoding='utf-8').write('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+s+'</body></html>')
    os.remove(ct);os.remove(fw);print(out,round(len(s)/1e6,2),'MB')
if __name__=='__main__':
    which=sys.argv[1:] or ['main','duo']
    if 'main' in which:build('main','game.html')
    if 'duo' in which:build('duo','duo.html')
