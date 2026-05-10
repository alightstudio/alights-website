#!/usr/bin/env python3
"""
新片场收藏夹抓取脚本 - 用于抓取 Stash 140-144 数据
用法: python3 scrape_stash.py <stash_id> <output_file>

示例:
  python3 scrape_stash.py 140 data/stash140.json

注意事项:
  1. 需要登录新片场账号，Cookie 有效期约7天
  2. 如果遇到人机验证，脚本会报错，用户需在浏览器手动完成验证后重新运行
  3. Cookie 获取方法: 浏览器登录 xinpianchang.com 后，打开开发者工具 → Application → Cookies
"""

import json
import sys
import os
import re
import time
import base64

# 如需使用 cookie 认证，取消下面注释并填入
# COOKIE = "your_cookie_here"

def get_cookie_from_env():
    """从环境变量读取 cookie"""
    return os.environ.get('XINPIANCHANG_COOKIE', '')

def fetch_stash(stash_id: str, cookie: str) -> dict:
    """抓取指定收藏夹数据"""
    import urllib.request
    
    url = f"https://www.xinpianchang.com/bookmark/{stash_id}?from=userBookmark"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.xinpianchang.com/',
    }
    
    if cookie:
        headers['Cookie'] = cookie
    
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        print(f"请求失败: {e}")
        return {}
    
    # 提取视频数据 (页面中有 SSR 数据)
    videos = []
    
    # 方法1: 从 __NEXT_DATA__ 中提取
    next_data_match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if next_data_match:
        try:
            data = json.loads(next_data_match.group(1))
            print(f"  ✅ 找到 __NEXT_DATA__ 数据")
            # 提取视频列表
            props = data.get('props', {}).get('pageProps', {})
            video_list = props.get('videoList', [])
            if video_list:
                videos = video_list
                print(f"  ✅ 提取到 {len(videos)} 个视频")
                return {'videos': videos, 'source': 'next_data'}
        except json.JSONDecodeError:
            print("  ⚠️ __NEXT_DATA__ 解析失败")
    
    # 方法2: 从 pageData 中提取
    page_data_match = re.search(r'window\.pageData\s*=\s*(\{.*?\});', html, re.DOTALL)
    if page_data_match:
        try:
            data = json.loads(page_data_match.group(1))
            print(f"  ✅ 找到 pageData")
            video_list = data.get('videoList', []) or data.get('data', {}).get('list', [])
            if video_list:
                videos = video_list
                print(f"  ✅ 提取到 {len(videos)} 个视频")
                return {'videos': videos, 'source': 'page_data'}
        except json.JSONDecodeError:
            print("  ⚠️ pageData 解析失败")
    
    # 方法3: 尝试从 HTML 中提取视频 ID 列表
    video_ids = re.findall(r'data-vid="(\d+)"', html)
    if video_ids:
        print(f"  ⚠️ 找到 {len(video_ids)} 个视频ID，需要单独抓取")
        # 返回 ID 列表，供后续单独抓取
        return {'video_ids': video_ids, 'source': 'ids_only'}
    
    # 检查是否需要登录
    if '请登录' in html or 'login' in html.lower():
        print("  ❌ 需要登录，请设置 COOKIE 环境变量或直接在浏览器中操作")
        return {}
    
    # 检查人机验证
    if '验证' in html or 'captcha' in html.lower() or '验证码' in html:
        print("  ❌ 遇到人机验证，请在浏览器中完成验证后再试")
        return {}
    
    print(f"  ❌ 无法解析页面，未找到视频数据")
    return {}

def save_json(data: dict, output_path: str):
    """保存 JSON 文件"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  💾 已保存: {output_path}")

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        print("\n快速用法:")
        print("  python3 scrape_stash.py 140 data/stash140.json")
        return
    
    stash_id = sys.argv[1]
    output_path = sys.argv[2]
    cookie = get_cookie_from_env()
    
    print(f"\n🎬 抓取 Stash {stash_id}...")
    result = fetch_stash(stash_id, cookie)
    
    if result and result.get('videos'):
        save_json(result['videos'], output_path)
    elif result and result.get('video_ids'):
        print(f"  📋 视频ID列表: {result['video_ids'][:5]}... (共{len(result['video_ids'])}个)")
        save_json({'video_ids': result['video_ids']}, output_path)
    else:
        print("  ❌ 未获取到数据")

if __name__ == '__main__':
    main()