#!/usr/bin/env python3
import json

# Read existing stash177.json  
with open('src/data/stash177.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"✅ Read {len(data)} items")

fixed_count = 0

# Fix each item
for item in data:
    # Fix author field (flatten if nested object)
    if isinstance(item.get('author'), dict):
        userinfo = item['author'].get('userinfo', {})
        item['author'] = userinfo.get('username', '未知')
        fixed_count += 1
    
    # Fix categories field (flatten if list)
    
    
            
        
    
   
   
   
   

print(f"✅ Fixed {fixed_count} missing fields")

# Save fixed data  
with open('src/data/stash177.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("✅ Saved to src/data/st_ahs177.jon")

# Verify first 3 items  
            
         
            
        
            
         
            
         