import json, os, glob, re

all_files = glob.glob('src/data/stash*.json')
files = sorted([f for f in all_files if re.match(r'^src/data/stash\d+\.json$', f)], key=lambda x: int(re.search(r'stash(\d+)', x).group(1)))
total = 0
issues = []
zero_score = []
by_stash = []

for f in files:
    n = int(f.replace('src/data/stash','').replace('.json',''))
    d = json.load(open(f))
    count = len(d)
    by_stash.append((n, count))
    total += count
    
    for j, item in enumerate(d):
        if not isinstance(item.get('id'), (int, float)):
            issues.append(f'stash{n}[{j}] id类型异常')
        if not isinstance(item.get('title'), str) or not item.get('title'):
            issues.append(f'stash{n}[{j}] title异常')
        if not isinstance(item.get('cover'), str) or not item.get('cover'):
            issues.append(f'stash{n}[{j}] cover异常')
        if not isinstance(item.get('author'), str):
            issues.append(f'stash{n}[{j}] author异常')
        if not isinstance(item.get('categories'), str):
            issues.append(f'stash{n}[{j}] categories异常')
        if not isinstance(item.get('web_url'), str) or not item.get('web_url'):
            issues.append(f'stash{n}[{j}] web_url异常')
        
        score = item.get('count_score', 0)
        if score == 0 or score is None:
            zero_score.append((n, j, item.get('title','?'), item.get('web_url','?')))

print(f'=== 全量数据检查 ===')
print(f'Stash 范围: {by_stash[0][0]} - {by_stash[-1][0]}')
print(f'文件总数: {len(files)}')
print(f'作品总数: {total}')
print(f'格式问题: {len(issues)} 个')
for i in issues[:15]:
    print(f'  ⚠️ {i}')
print(f'\nscore=0 的作品: {len(zero_score)} 个')
for s in zero_score:
    print(f'  stash{s[0]}[{s[1]}] "{s[2][:50]}"')
    print(f'    → {s[3]}')

print(f'\n=== 各 Stash 数量 ===')
line = ''
for n, c in by_stash:
    line += f'  Stash {n}: {c:>3}  '
    if n % 5 == 0 and n >= 5:
        print(line)
        line = ''
if line:
    print(line)