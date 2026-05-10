"""
批量从百度图片下载名画 → 缩放 40×40 → 生成TS代码
使用 curl + Python Pillow，避免 urllib 兼容问题
"""
import json, os, sys, subprocess, re, urllib.parse
from PIL import Image
from io import BytesIO

PAINTINGS = [
    ("birth-of-venus", "波提切利 维纳斯的诞生 油画"),
    ("iris", "梵高 鸢尾花 油画"),
    ("liberty", "德拉克罗瓦 自由引导人民 油画"),
    ("night-cafe", "梵高 夜间咖啡馆 油画"),
    ("cafe-terrace", "梵高 夜间的露天咖啡座 油画"),
    ("sleeping-gypsy", "卢梭 沉睡的吉普赛人 油画"),
    ("olympia", "马奈 奥林匹亚 油画"),
    ("saturday-afternoon", "修拉 大碗岛的星期天下午 油画"),
    ("saturn-devouring", "戈雅 农神食子 油画"),
    ("third-of-may", "戈雅 1808年5月3日 油画"),
]

# 备用名画ID → 替代英文搜索词（中英文都用）
FALLBACK = {
    "liberty": "Eugène Delacroix Liberty Leading the People",
}

def search_baidu(keyword):
    """用 curl 搜索百度图片，返回URL列表"""
    cmd = [
        "curl", "-sL", "--connect-timeout", "10", "--max-time", "15",
        "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        f"https://image.baidu.com/search/acjson?tn=resultjson_com&word={keyword}&pn=0&rn=5"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return []
    try:
        data = json.loads(result.stdout)
    except:
        return []
    
    urls = []
    for item in data.get("data", []):
        if not item:
            continue
        for key in ["thumbURL", "middleURL", "hoverURL"]:
            u = item.get(key, "")
            if u and u.startswith("http"):
                # 过滤掉过大的图
                width = item.get("width", 0)
                if isinstance(width, int) and width > 100:
                    urls.append(u)
                    break
    return urls

def download_curl(url, out_path):
    cmd = [
        "curl", "-sL", "--connect-timeout", "10", "--max-time", "30",
        "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "-o", out_path, url
    ]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode == 0 and os.path.getsize(out_path) > 2000:
        return True
    return False

def extract_pixels(img_path, size=40):
    """缩放图片并提取像素颜色"""
    img = Image.open(img_path).convert("RGB")
    w, h = img.size
    min_side = min(w, h)
    left = (w - min_side) // 2
    top = (h - min_side) // 2
    img = img.crop((left, top, left + min_side, top + min_side))
    img = img.resize((size, size), Image.LANCZOS)
    
    pixels = img.load()
    rows = []
    for y in range(size):
        row = []
        for x in range(size):
            r, g, b = pixels[x, y]
            row.append(f"#{r:02x}{g:02x}{b:02x}")
        rows.append(row)
    
    all_colors = set(c for row in rows for c in row)
    return rows, len(all_colors)

def format_data(name, rows):
    lines = [f"const {name}Data: string[][] = ["]
    for row in rows:
        colors = ",".join(f"'{c}'" for c in row)
        lines.append(f"  [{colors}],")
    lines.append("]")
    return "\n".join(lines)

OUT = "/tmp/paintings2"
os.makedirs(OUT, exist_ok=True)
results = {}

for pid, keyword in PAINTINGS:
    print(f"\n=== {pid} ===")
    
    # 先用英文搜索试试
    search_terms = [keyword]
    if pid in FALLBACK:
        search_terms.append(FALLBACK[pid])
    
    all_urls = []
    for term in search_terms:
        encoded = urllib.parse.quote(term)
        urls = search_baidu(encoded)
        if urls:
            all_urls = urls
            print(f"  搜索 '{term}' → {len(urls)} 张")
            break
        print(f"  搜索 '{term}' → 0 张, 换词...")
    
    if not all_urls:
        print(f"  ✗ 搜索无结果, 跳过")
        continue
    
    # 下载前3张候选
    downloaded = None
    for i, url in enumerate(all_urls[:3]):
        out = os.path.join(OUT, f"{pid}_{i}.jpg")
        if download_curl(url, out):
            size = os.path.getsize(out)
            try:
                with Image.open(out) as img:
                    w, h = img.size
                print(f"  下载 ✓ ({w}x{h}, {size//1024}KB)")
            except:
                print(f"  下载 ✓ (尺寸未知)")
            downloaded = out
            break
        else:
            print(f"  下载 ✗ ({url[:50]}...)")
    
    if not downloaded:
        print(f"  ✗ 下载失败, 跳过")
        continue
    
    rows, n_colors = extract_pixels(downloaded)
    print(f"  提取 ✓ {n_colors} 种颜色")
    results[pid] = (pid.replace("-", "_"), rows)

print(f"\n===== 成功 {len(results)}/10 =====")
for var_name, rows in results.values():
    print(f"\n// === {var_name.replace('_','-')} ===")
    print(format_data(var_name, rows))
