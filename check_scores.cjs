const http = require('http');
const WebSocket = require('ws');

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

  ws.on("open", () => {
    ws.send(JSON.stringify({id:msgId++,method:"Page.enable"}));
    navigateNext();
  });

  function navigateNext() {
    if (currentIdx >= stashIds.length) { ws.close(); return; }
    const stashNum = stashIds[currentIdx];
    console.log(`\n=== Stash ${stashNum} (folder ${stashes[stashNum]}) ===`);
    ws.send(JSON.stringify({id:msgId++,method:"Page.navigate",
      params:{url:`https://www.xinpianchang.com/bookmark/${stashes[stashNum]}?from=userBookmark`}}));
  }

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    
    if (msg.id && msg.result && msg.method === undefined) {
      setTimeout(() => {
        ws.send(JSON.stringify({id:msgId++,method:"Runtime.evaluate",params:{
          expression: `(function(){
            const el = document.querySelector("#__NEXT_DATA__");
            if (!el) return JSON.stringify({error:"no __NEXT_DATA__"});
            const d = JSON.parse(el.textContent);
            const list = d.props?.pageProps?.detail?.list || [];
            if (list.length === 0) return JSON.stringify({error:"empty list", total:0});
            const items = list.slice(0,3).map(function(x) { 
              var c = x.item.count || {};
              return {id: x.item.id, title: (x.item.title||"").substring(0,30), score: c.score, count_score: c.count_score, count_view: c.count_view, count_like: c.count_like, count_collect: c.count_collect};
            });
            var countKeys = list[0] && list[0].item && list[0].item.count ? Object.keys(list[0].item.count) : [];
            return JSON.stringify({total: list.length, countKeys: countKeys, items: items});
          })()`
        }}));
      }, 4000);
    }
    
    if (msg.id && msg.result && msg.result.result && msg.result.result.type === "string") {
      try {
        const data = JSON.parse(msg.result.result.value);
        console.log("Total: " + data.total + " | Count keys: [" + (data.countKeys||[]).join(", ") + "]");
        (data.items||[]).forEach(function(item, i) {
          console.log("  [" + i + "] " + item.title + " | score=" + item.score + " | count_score=" + item.count_score + " | views=" + item.count_view + " | likes=" + item.count_like + " | collects=" + item.count_collect);
        });
      } catch(e) {
        console.log("Eval result:", msg.result.result.value ? msg.result.result.value.substring(0,200) : "empty");
      }
      currentIdx++;
      setTimeout(navigateNext, 500);
    }
  });

  ws.on("error", function(e) { console.error("WS Error:", e.message); process.exit(1); });
  setTimeout(function() { console.log("Timeout"); process.exit(1); }, 120000);
}

main();
