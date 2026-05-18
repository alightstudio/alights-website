const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const stashes = {130:2122282,131:2121655,132:2120379,133:2119460,134:2118551,135:2116308,136:2114581,137:2113670,138:2113167,139:2112261};

async function main() {
  const targets = JSON.parse(await new Promise((resolve, reject) => {
    http.get("http://127.0.0.1:9222/json", (res) => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve(d));
    }).on("error", reject);
  }));
  let target = targets.find(t => t.url.includes("xinpianchang")) || targets[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let currentIdx = 0;
  const stashIds = Object.keys(stashes);
  let msgId = 1;
  let pending = false;

  ws.on("open", () => {
    ws.send(JSON.stringify({id:msgId++,method:"Page.enable"}));
    setTimeout(navigateNext, 1000);
  });

  function navigateNext() {
    if (currentIdx >= stashIds.length) { 
      console.log("\nALL DONE");
      ws.close(); 
      return; 
    }
    const stashNum = stashIds[currentIdx];
    console.log(`\n=== Stash ${stashNum} (folder ${stashes[stashNum]}) ===`);
    ws.send(JSON.stringify({id:msgId++,method:"Page.navigate",
      params:{url:`https://www.xinpianchang.com/bookmark/${stashes[stashNum]}?from=userBookmark`}}));
    // Wait for navigation
    setTimeout(() => {
      // Now evaluate to get all data
      const evalId = msgId++;
      pending = true;
      ws.send(JSON.stringify({id:evalId,method:"Runtime.evaluate",params:{
        expression: `(function(){
          var el = document.querySelector("#__NEXT_DATA__");
          if (!el) return JSON.stringify({error:"no __NEXT_DATA__"});
          var d = JSON.parse(el.textContent);
          var list = d.props && d.props.pageProps && d.props.pageProps.detail && d.props.pageProps.detail.list || [];
          if (list.length === 0) return JSON.stringify({error:"empty list"});
          var result = list.map(function(x, idx) {
            var item = x.item || {};
            var c = item.count || {};
            return {
              id: item.id,
              title: item.title,
              cover: item.cover,
              duration: item.duration,
              web_url: item.web_url,
              author: (function(){
                var a = item.author;
                if (typeof a === 'string') return a;
                if (a && a.userinfo && a.userinfo.username) return a.userinfo.username;
                return '未知';
              })(),
              categories: (function(){
                var cats = item.categories;
                if (typeof cats === 'string') return cats;
                if (Array.isArray(cats)) return cats.map(function(cc){
                  if (typeof cc === 'string') return cc;
                  return cc.category_name || cc.name || '';
                }).filter(Boolean).join(', ') || '其他';
                return '其他';
              })(),
              publish_time: item.publish_time,
              count_view: c.count_view || 0,
              count_like: c.count_like || 0,
              count_collect: c.count_collect || 0,
              count_score: c.score || 0
            };
          });
          return JSON.stringify({stash: ' + stashIds[currentIdx] + ', items: result});
        })()`
      }}));
    }, 5000);
  }

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && msg.id >= 1 && msg.result && msg.result.result && msg.result.result.type === "string") {
      try {
        const payload = JSON.parse(msg.result.result.value);
        if (payload.items && payload.items.length > 0) {
          const stashNum = payload.stash;
          // Write to stash file
          const filePath = `src/data/stash${stashNum}.json`;
          const out = JSON.stringify(payload.items, null, 2);
          fs.writeFileSync(filePath, out, 'utf-8');
          const scores = payload.items.map(x => x.count_score);
          const min = Math.min(...scores);
          const max = Math.max(...scores);
          const avg = (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1);
          console.log(`  ${payload.items.length} items | score range: ${min}-${max} | avg: ${avg}`);
          currentIdx++;
          pending = false;
          setTimeout(navigateNext, 1000);
        } else {
          console.log("  No items, retrying...");
          setTimeout(() => {
            // Retry evaluation
            pending = true;
            ws.send(JSON.stringify({id:msgId++,method:"Runtime.evaluate",params:{
              expression: `(function(){
                var el = document.querySelector("#__NEXT_DATA__");
                if (!el) return JSON.stringify({error:"no __NEXT_DATA__"});
                var d = JSON.parse(el.textContent);
                var list = d.props && d.props.pageProps && d.props.pageProps.detail && d.props.pageProps.detail.list || [];
                if (list.length === 0) return JSON.stringify({error:"empty list",
                  debug: (d.props && d.props.pageProps ? Object.keys(d.props.pageProps) : []) + " | " + (d.props.pageProps && d.props.pageProps.detail ? Object.keys(d.props.pageProps.detail).join(",") : "no detail")});
                var result = list.map(function(x, idx) {
                  var item = x.item || {};
                  var c = item.count || {};
                  return {
                    id: item.id,
                    title: item.title,
                    cover: item.cover,
                    duration: item.duration,
                    web_url: item.web_url,
                    author: (function(){
                      var a = item.author;
                      if (typeof a === 'string') return a;
                      if (a && a.userinfo && a.userinfo.username) return a.userinfo.username;
                      return '未知';
                    })(),
                    categories: (function(){
                      var cats = item.categories;
                      if (typeof cats === 'string') return cats;
                      if (Array.isArray(cats)) return cats.map(function(cc){
                        if (typeof cc === 'string') return cc;
                        return cc.category_name || cc.name || '';
                      }).filter(Boolean).join(', ') || '其他';
                      return '其他';
                    })(),
                    publish_time: item.publish_time,
                    count_view: c.count_view || 0,
                    count_like: c.count_like || 0,
                    count_collect: c.count_collect || 0,
                    count_score: c.score || 0
                  };
                });
                return JSON.stringify({stash: ' + stashIds[currentIdx] + ', items: result});
              })()`
            }}));
          }, 3000);
        }
      } catch(e) {
        console.log("Parse error:", e.message, "| Raw:", msg.result.result.value?.substring(0,100));
        currentIdx++;
        setTimeout(navigateNext, 1000);
      }
    }
  });

  ws.on("error", function(e) { console.error("WS Error:", e.message); process.exit(1); });
  setTimeout(function() { console.log("Timeout"); process.exit(1); }, 300000);
}

main();
