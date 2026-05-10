"""
Generate real painting data from Baidu images and replace in famous-paintings.ts
"""
import json, os, subprocess, re, sys
from PIL import Image

IMAGES = {
    "birth-of-venus": "https://img0.baidu.com/it/u=1617375496,8300620&fm=253&fmt=auto?w=1271&h=800",
    "iris": "https://img2.baidu.com/it/u=1867747857,277798172&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1068",
    "liberty": "https://img2.baidu.com/it/u=1777162105,1678749326&fm=253&fmt=auto&app=120&f=JPEG?w=1039&h=800",
    "night-cafe": "https://img1.baidu.com/it/u=3164162046,3321255285&fm=253&fmt=auto&app=120&f=JPEG?w=1046&h=800",
    "cafe-terrace": "https://img2.baidu.com/it/u=3620068583,35326420&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=611",
    "sleeping-gypsy": "https://img0.baidu.com/it/u=263327278,2610391180&fm=253&fmt=auto&app=120&f=JPEG?w=1228&h=800",
    "olympia": "https://img0.baidu.com/it/u=1176692560,410827064&fm=253&fmt=auto&app=138&f=JPEG?w=836&h=500",
    "saturday-afternoon": "https://img2.baidu.com/it/u=1988337313,4015098237&fm=253&fmt=auto&app=120&f=JPEG?w=1202&h=800",
    "saturn-devouring": "https://img1.baidu.com/it/u=3728897310,3942643048&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1051",
    "third-of-may": "https://img2.baidu.com/it/u=272439122,2570851611&fm=253&fmt=auto&app=120&f=JPEG?w=1043&h=800",
}

OUT = "/tmp/paintings3"
os.makedirs(OUT, exist_ok=True)

def dl(url, path):
    r = subprocess.run(["curl", "-sL", "--connect-timeout", "10", "--max-time", "30",
           "-H", "User-Agent: Mozilla/5.0", "-o", path, url], capture_output=True)
    return r.returncode == 0 and os.path.getsize(path) > 2000

def extract(img_path, size=40):
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
    return rows

def fmt_ts(name, rows):
    lines = [f"\nconst {name}Data: string[][] = ["]
    for row in rows:
        colors = ",".join(f"'{c}'" for c in row)
        lines.append(f"  [{colors}],")
    lines.append("]")
    return "\n".join(lines)

# Download and extract all
new_data = {}
for pid, url in IMAGES.items():
    fname = pid.replace("-", "_")
    path = os.path.join(OUT, f"{pid}.jpg")
    print(f"{pid}...", end=" ", flush=True)
    if not dl(url, path):
        print("FAIL")
        continue
    rows = extract(path)
    new_data[fname] = fmt_ts(fname, rows)
    cols = len(set(c for row in rows for c in row))
    print(f"{cols} colors")

# Read the TS file
ts_path = "/Users/lzc/.qclaw/workspace/alights-website/src/lib/famous-paintings.ts"
with open(ts_path, 'r') as f:
    content = f.read()

# Replace each data block
for fname, ts_block in new_data.items():
    # Find old block: from "const xxxData: string[][] = [" to the matching "]"
    pattern = re.compile(
        rf"(\nconst {fname}Data: string\[\]\[\] = \[)(.*?)(^\])",
        re.MULTILINE | re.DOTALL
    )
    if pattern.search(content):
        content = pattern.sub(ts_block, content)
        print(f"Replaced: {fname}")
    else:
        print(f"NOT FOUND: {fname}")

# Write back
with open(ts_path, 'w') as f:
    f.write(content)

print("\nDone! File updated.")
