"""
从百度图片下载名画 → 缩放 40×40 → 提取像素数据 → 生成 TypeScript 代码
"""
import json, os, sys, urllib.request, urllib.parse
from PIL import Image
from io import BytesIO

# 需要替换的 10 张画
PAINTINGS = [
    {"id": "birth-of-venus", "keyword": "波提切利 维纳斯的诞生 名画"},
    {"id": "iris", "keyword": "梵高 鸢尾花 名画"},
    {"id": "liberty", "keyword": "德拉克罗瓦 自由引导人民 名画"},
    {"id": "night-cafe", "keyword": "梵高 夜间咖啡馆 名画"},
    {"id": "cafe-terrace", "keyword": "梵高 露天咖啡座 名画"},
    {"id": "sleeping-gypsy", "keyword": "卢梭 沉睡的吉普赛人 名画"},
    {"id": "olympia", "keyword": "马奈 奥林匹亚 名画"},
    {"id": "saturday-afternoon", "keyword": "修拉 大碗岛的星期天下午 名画"},
    {"id": "saturn-devouring", "keyword": "戈雅 农神食子 名画"},
    {"id": "third-of-may", "keyword": "戈雅 1808年5月3日 名画"},
]

OUT_DIR = "/tmp/paintings"
os.makedirs(OUT_DIR, exist_ok=True)

def search_baidu_image(keyword, max_retries=3):
    """通过百度图片搜索获取图片URL"""
    query = urllib.parse.quote(keyword)
    url = f"https://image.baidu.com/search/acjson?tn=resultjson_com&word={query}&pn=0&rn=10"
    
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    })
    
    for attempt in range(max_retries):
        try:
            resp = urllib.request.urlopen(req, timeout=15)
            data = json.loads(resp.read().decode('utf-8', errors='replace'))
            urls = []
            for item in data.get("data", []):
                if not item:
                    continue
                # 偏好 large/thumb/middle URL
                for key in ["thumbURL", "middleURL", "hoverURL"]:
                    u = item.get(key, "")
                    if u and u.startswith("http"):
                        urls.append(u)
                        break
            if urls:
                print(f"  ✓ 搜到 {len(urls)} 张")
                return urls
            print(f"  ✗ 搜到 0 张, 重试...")
        except Exception as e:
            print(f"  ✗ 搜索失败: {e}, 重试...")
    return []

def download_image(url, path, max_retries=3):
    """下载图片"""
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    })
    for attempt in range(max_retries):
        try:
            resp = urllib.request.urlopen(req, timeout=20)
            data = resp.read()
            if len(data) < 1000:
                print(f"  ✗ 太小 ({len(data)} bytes)")
                return None
            with open(path, 'wb') as f:
                f.write(data)
            return path
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"  ✗ 下载失败: {e}, 重试...")
            else:
                print(f"  ✗ 下载失败: {e}")
    return None

def extract_pixels(img_path, size=40):
    """缩放图片并提取像素颜色"""
    img = Image.open(img_path).convert("RGB")
    # 先缩放到正方形（保持比例，居中裁剪）
    w, h = img.size
    min_side = min(w, h)
    left = (w - min_side) // 2
    top = (h - min_side) // 2
    img = img.crop((left, top, left + min_side, top + min_side))
    # 缩放到目标尺寸
    img = img.resize((size, size), Image.LANCZOS)
    
    pixels = img.load()
    rows = []
    for y in range(size):
        row = []
        for x in range(size):
            r, g, b = pixels[x, y]
            hex_color = f"#{r:02x}{g:02x}{b:02x}"
            row.append(hex_color)
        rows.append(row)
    
    # 统计颜色数量
    all_colors = set(c for row in rows for c in row)
    print(f"  ✓ 提取完毕: {len(all_colors)} 种颜色")
    return rows

def format_ts_data(name, rows):
    """生成 TypeScript 代码"""
    lines = [f"const {name}Data: string[][] = ["]
    for row in rows:
        colors = ",".join(f"'{c}'" for c in row)
        lines.append(f"  [{colors}],")
    lines.append("]")
    return "\n".join(lines)

def main():
    results = {}
    
    for p in PAINTINGS:
        pid = p["id"]
        keyword = p["keyword"]
        print(f"\n=== {pid} ({keyword}) ===")
        
        # 1. 搜索图片
        urls = search_baidu_image(keyword)
        if not urls:
            print(f"  ✗ 跳过 {pid}")
            continue
        
        # 2. 下载
        img_path = os.path.join(OUT_DIR, f"{pid}.jpg")
        dl_result = download_image(urls[0], img_path)
        if not dl_result:
            print(f"  ✗ 跳过 {pid}")
            continue
        
        # 3. 提取像素
        pixels = extract_pixels(img_path)
        if pixels:
            results[pid] = pixels
    
    # 输出结果
    print(f"\n\n===== 结果汇总（成功 {len(results)}/{len(PAINTINGS)}）=====")
    
    for pid, pixels in results.items():
        code = format_ts_data(pid.replace("-", "_"), pixels)
        print(f"\n// === {pid} ===")
        print(code)

if __name__ == "__main__":
    main()
