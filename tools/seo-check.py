#!/usr/bin/env python3
"""SEO 改版前後比對小工具（只讀、不改網站）。

用法：
  hugo && node scripts/prerender-home.js          # 先建置出 public/
  python3 tools/seo-check.py public                          # 只列目前檢查結果
  python3 tools/seo-check.py public --write-baseline docs/seo-baseline.json   # 存成基準
  python3 tools/seo-check.py public --baseline docs/seo-baseline.json         # 跟基準比對

比對輸出分兩段：
  「要處理」= 新出現的問題、頁面消失、sitemap 混進不收錄頁
  「有變動」= 標題/描述/結構化資料/文字量改變（不一定是壞事，請人看）
有「要處理」時結束碼為 1，否則 0。
"""
import argparse, collections, html, json, os, re, sys
from urllib.parse import unquote, urljoin

BASE = 'https://dazhen-site.netlify.app'


def load_pages(root):
    pages = {}
    for d, _, fs in os.walk(root):
        if 'index.html' in fs:
            rel = os.path.relpath(d, root).replace('\\', '/')
            p = '/' if rel == '.' else '/' + rel + '/'
            pages[p] = os.path.join(d, 'index.html')
    return pages


def first(pattern, h, flags=re.S):
    m = re.search(pattern, h, flags)
    return html.unescape(m.group(1)).strip() if m else ''


def snapshot(root):
    pages = load_pages(root)
    sm_file = os.path.join(root, 'sitemap.xml')
    sm = set()
    if os.path.exists(sm_file):
        sm = {unquote(x) for x in re.findall(
            r'<loc>https?://[^/<]+([^<]*)</loc>', open(sm_file, encoding='utf-8').read())}
    snap = {'pages': {}, 'problems': []}
    titles, descs = collections.defaultdict(list), collections.defaultdict(list)
    linked = set()
    for p, f in sorted(pages.items()):
        h = open(f, encoding='utf-8', errors='replace').read()
        title = first(r'<title>(.*?)</title>', h)
        desc = first(r'<meta name="description" content="(.*?)"', h)
        robots = first(r'<meta name="robots" content="(.*?)"', h)
        canon = first(r'<link rel="canonical" href="(.*?)"', h)
        ld = ' '.join(re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', h, re.S))
        body = re.sub(r'<[^>]+>', '', re.sub(r'<(script|style|noscript).*?</\1>', '', h, flags=re.S))
        hnos = re.sub(r'<script\b.*?</script>', '', h, flags=re.S)  # 排除 JS 字串裡的假標籤/連結
        hs = [int(x) for x in re.findall(r'<h([1-6])[ >]', hnos)]
        snap['pages'][p] = {
            'inSitemap': p in sm,
            'noindex': 'noindex' in robots,
            'title': title,
            'desc': desc,
            'canonicalOK': canon.rstrip('/') == (BASE + p).rstrip('/') if canon else False,
            'h1': hs.count(1),
            'jsonld': sorted(set(re.findall(r'"@type":\s*"([A-Za-z]+)"', ld))),
            'textLen': len(re.sub(r'\s+', '', body)),
            'headingSkip': any(b - a > 1 for a, b in zip(hs, hs[1:])),
        }
        for m in re.finditer(r'<a\b[^>]*?href="([^"]+)"', hnos):
            u = html.unescape(m.group(1))
            if u.startswith(BASE):
                u = u[len(BASE):] or '/'
            if u.startswith(('/', '.')) and not u.startswith('//'):
                linked.add(urljoin(p, u).split('#')[0].split('?')[0])
        if p in sm:
            titles[title].append(p)
            descs[desc].append(p)
    P = snap['problems']
    for p, s in snap['pages'].items():
        if p in sm:
            if s['noindex']: P.append(f'{p} 設了不收錄卻在 sitemap')
            if not s['desc']: P.append(f'{p} 沒有 meta description')
            if not s['title']: P.append(f'{p} 沒有 title')
            if not s['canonicalOK']: P.append(f'{p} canonical 網址不正確或缺少')
            if s['h1'] != 1: P.append(f'{p} H1 數量為 {s["h1"]}（應為 1）')
            if s['textLen'] < 150 and p != '/voice/': P.append(f'{p} 原始 HTML 文字過少（{s["textLen"]} 字），爬蟲可能看不到內容')
    for t, ps in titles.items():
        if len(ps) > 1: P.append(f'重複標題：{t}（{", ".join(ps)}）')
    for d, ps in descs.items():
        if len(ps) > 1 and d: P.append(f'重複描述：{d[:20]}…（{", ".join(ps)}）')
    for p in sm:
        if p != '/' and p not in linked: P.append(f'{p} 在 sitemap 但站內沒有任何連結指向它（孤兒頁）')
        if p not in pages: P.append(f'{p} 在 sitemap 但建置結果裡沒有這個頁面')
    for name in ('robots.txt', 'llms.txt', 'sitemap.xml'):
        if not os.path.exists(os.path.join(root, name)): P.append(f'缺少 {name}')
    snap['pages'] = {p: dict(s, orphan=(p in sm and p != '/' and p not in linked)) for p, s in snap['pages'].items()}
    return snap


def compare(old, new):
    todo, changed = [], []
    for p in old['pages']:
        if p not in new['pages']: todo.append(f'頁面消失：{p}')
    for p, s in new['pages'].items():
        o = old['pages'].get(p)
        if o is None:
            changed.append(f'新增頁面：{p}'); continue
        for k, label in (('title', '標題'), ('desc', '描述'), ('jsonld', '結構化資料'), ('inSitemap', '是否在 sitemap'), ('noindex', '不收錄設定')):
            if o.get(k) != s[k]:
                changed.append(f'{p} {label}改變：{o.get(k)} → {s[k]}')
        if o['textLen'] and s['textLen'] < o['textLen'] * 0.5:
            todo.append(f'{p} 文字量減少一半以上（{o["textLen"]} → {s["textLen"]}）')
        elif abs(s['textLen'] - o['textLen']) > max(200, o['textLen'] * 0.3):
            changed.append(f'{p} 文字量變動（{o["textLen"]} → {s["textLen"]}）')
    for pr in new['problems']:
        if pr not in old['problems']: todo.append('新問題：' + pr)
    fixed = [pr for pr in old['problems'] if pr not in new['problems']]
    return todo, changed, fixed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('root')
    ap.add_argument('--baseline')
    ap.add_argument('--write-baseline')
    a = ap.parse_args()
    snap = snapshot(a.root)
    n_sm = sum(1 for s in snap['pages'].values() if s['inSitemap'])
    print(f'建置頁面 {len(snap["pages"])} 頁，sitemap {n_sm} 頁')
    if a.write_baseline:
        json.dump(snap, open(a.write_baseline, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
        print('已存成基準：', a.write_baseline)
    print('\n== 目前的問題 ==')
    print('\n'.join('- ' + x for x in snap['problems']) or '無')
    if a.baseline:
        old = json.load(open(a.baseline, encoding='utf-8'))
        todo, changed, fixed = compare(old, snap)
        print('\n== 要處理（比基準更糟）==');  print('\n'.join('- ' + x for x in todo) or '無')
        print('\n== 有變動（請人看一眼）==');  print('\n'.join('- ' + x for x in changed) or '無')
        print('\n== 已改善 ==');                print('\n'.join('- ' + x for x in fixed) or '無')
        sys.exit(1 if todo else 0)


if __name__ == '__main__':
    main()
