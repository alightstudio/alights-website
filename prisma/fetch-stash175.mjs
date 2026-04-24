import { readFileSync, writeFileSync } from 'fs';
import { createConnection } from 'net';

const WS_URL = 'ws://localhost:9333/devtools/browser/b8c6f509-f522-4e52-97a2';
const TARGET_URL = 'https://www.xinpianchang.com/bookmark/2098799';

// Simple WebSocket client via Node.js
async function connect() {
  // First get a page target
  const tabs = await fetch('http://localhost:9333/json').then(r => r.json());
  
  // Find an existing page or create one
  let target = tabs.find(t => t.url !== 'about:blank' && !t.url.startsWith('devtools'));
  if (!target) {
    // Create a new tab
    target = await fetch('http://localhost:9333/json/new?about:blank').then(r => r.json());
  }
  
  console.log('Using target:', target.id, target.url);
  
  // Connect via WebSocket
  const wsTargetUrl = target.webSocketDebuggerUrl;
  
  // Use a child process to run the CDP script
  const { execSync } = await import('child_process');
  const cdpScript = `
const WebSocket = require('ws');
const ws = new WebSocket('${wsTargetUrl}');

let msgId = 0;
const pending = {};

ws.on('open', () => {
  console.log('Connected');
  
  // Enable Page domain
  send('Page.enable');
  
  // Navigate
  send('Page.navigate', { url: '${TARGET_URL}' });
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  if (msg.method === 'Page.frameStoppedLoading') {
    console.log('Page loaded');
    
    // Wait a moment for JS to render
    setTimeout(() => {
      // Extract __NEXT_DATA__
      send('Runtime.evaluate', {
        expression: 'document.getElementById("__NEXT_DATA__")?.textContent || "NOT_FOUND"',
        returnByValue: true,
      });
    }, 3000);
  }
  
  if (msg.id && pending[msg.id]) {
    pending[msg.id](msg);
    delete pending[msg.id];
  }
});

function send(method, params = {}) {
  msgId++;
  const msg = JSON.stringify({ id: msgId, method, params });
  ws.send(msg);
  return new Promise(resolve => { pending[msgId] = resolve; });
}

// Wait for the nextData result
let resultFound = false;
const origOnMessage = ws.onmessage;
ws.onmessage = (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id && msg.result?.result?.type === 'string' && msg.result.result.value) {
    const value = msg.result.result.value;
    if (value === 'NOT_FOUND') {
      console.log('__NEXT_DATA__ not found');
      console.log('Page title:', document?.title || 'N/A');
    } else {
      console.log('NEXT_DATA found, length:', value.length);
      const fs = require('fs');
      const nextData = JSON.parse(value);
      fs.writeFileSync('/tmp/stash175-nextdata.json', JSON.stringify(nextData, null, 2));
      
      // Save the works data
      const props = nextData.props?.pageProps || {};
      let works = null;
      for (const key of Object.keys(props)) {
        const val = props[key];
        if (Array.isArray(val) && val.length > 0 && val[0]?.web_url) {
          works = val;
          break;
        }
        if (Array.isArray(val) && val.length > 0 && val[0]?.id && val[0]?.title) {
          works = val;
          break;
        }
      }
      
      if (works) {
        fs.writeFileSync('/tmp/stash175-works.json', JSON.stringify(works, null, 2));
        console.log('Works saved:', works.length, 'items');
        console.log('Sample:', JSON.stringify(works[0]).substring(0, 200));
      } else {
        // Dump props for debugging
        console.log('No works array found. Props keys:', Object.keys(props));
        fs.writeFileSync('/tmp/stash175-props.json', JSON.stringify(props, null, 2));
      }
    }
    resultFound = true;
    setTimeout(() => process.exit(0), 2000);
  }
  
  // Also handle the original handler
  origOnMessage(data);
};
`;
  
  execSync(`node -e "${cdpScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { timeout: 30000, stdio: 'inherit' });
}

connect().catch(console.error);
