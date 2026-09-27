#!/usr/bin/env python3
"""
把網站實際用到的字，從霞鶩文楷 TC 挑出來做成自架的小字體檔（static/fonts/）。
網站內容新增很多新字之後重跑一次即可：python3 scripts/subset-font.py <Regular.ttf> <Medium.ttf> [其他要一併收錄的檔案...]
沒收錄到的字，網頁仍會由 Google Fonts 的霞鶩文楷補上，不會缺字。
"""
import sys, glob, os, subprocess
reg, med = sys.argv[1], sys.argv[2]
extra = sys.argv[3:]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = glob.glob(os.path.join(root, 'content/**/*.md'), recursive=True) + \
        glob.glob(os.path.join(root, 'layouts/**/*.html'), recursive=True) + \
        glob.glob(os.path.join(root, 'static/admin/*.yml')) + extra
text = ''.join(open(f, encoding='utf-8', errors='ignore').read() for f in files)
# 常用標點、全形符號、英數一併收錄
text += ''.join(chr(c) for c in range(0x20, 0x7F)) + '，。、；：？！「」『』（）《》〈〉…—～·・％＋－＝／＼｜＃＠＆＊'
chars = sorted(set(c for c in text if not c.isspace()))
out = os.path.join(root, 'static/fonts')
open('/tmp/_chars.txt', 'w', encoding='utf-8').write(''.join(chars))
for src, name in ((reg, 'dazhen-wenkai-400.woff2'), (med, 'dazhen-wenkai-700.woff2')):
    subprocess.run(['pyftsubset', src, '--text-file=/tmp/_chars.txt', '--flavor=woff2',
                    '--layout-features=*', '--no-hinting', '--output-file=' + os.path.join(out, name)], check=True)
print('收錄字數：', len(chars))
