"""截圖檢查：python3 tools/shots.py wide|tall '<plan json>' [local-game.html|local-duo.html]
plan 例：[{"act":"temple","t":3,"shot":"a"},{"act":"tc","t":1},{"poke":2,"t":1,"shot":"b"}]
  act=跳到場景/按鈕 id；poke=模擬點擊推進對話；t=往前跑幾秒；shot=存成 shots/<mode>_<名稱>.png
需要：pip install playwright（並有 chromium）"""
import sys,json,os
from playwright.sync_api import sync_playwright
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
mode=sys.argv[1];plan=json.loads(sys.argv[2]);page=sys.argv[3] if len(sys.argv)>3 else 'local-game.html'
vw,vh=(1080,1920) if mode=='tall' else (1920,1080);os.makedirs(os.path.join(R,'shots'),exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':vw,'height':vh});msgs=[]
    pg.on('pageerror',lambda e:msgs.append(str(e)))
    pg.goto('file://'+os.path.join(R,'dist',page)+'?capture'+('&tall' if mode=='tall' else ''));pg.wait_for_function('window.__ready===true',timeout=60000)
    for st in plan:
        if 'act' in st: pg.evaluate(f"window.__act('{st['act']}')")
        for _ in range(st.get('poke',0)): pg.evaluate("window.__poke()");pg.evaluate("window.__step(2)")
        pg.evaluate(f"window.__step({int(st.get('t',0)*30)})")
        if st.get('shot'): pg.screenshot(path=os.path.join(R,'shots',f"{mode}_{st['shot']}.png"));print(st['shot'],pg.evaluate("window.__state()"))
    print('errors:',msgs[:5]);b.close()
