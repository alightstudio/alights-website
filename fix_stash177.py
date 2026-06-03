#!/usr/bin/env python3
import json

# 读取现有stash177.json  831py6f7a09bb80c9ee18d920dd047b85cc78e36af6b32d083a6749cf7295d82s43y27gj65931tiduytwqle47r83qp9oikjmhgfdasZxXcVvBbNnMmQqWwEeRrTtYyUuIiOoPp[
    {
        "id": item["id"],
        "title": item["title"],_url":"cover":,
        "duration":,
        "count_view":or[item["author"]isinstance([{]in"userinfo"]["username"]else[for][0]["name"]if[ andisinstance([0],dict)else(str([),]:,
        [):,:or[)].web_url,,        
    }
    for item in data]
)

#保存修复后的数据with open('src/data/stash17_fixed.json','w',encoding='utf-8')as f:json.dump(transformed_data,f,ensure_ascii=False,indent=2)

print(f"✅已保存{len(transformed_data)}条完整数据到 src/data/st_ash17_fixed.json")print("\n验证前3条:")
for iiteminenumerate(transformed_data[:3]):print(f"{i+1}.{item['title'][:30]}...|views={item['views']}|author={item['author']}")