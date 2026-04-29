#!/usr/bin/env node
/**
 * 简化版名画导入脚本
 * 使用 Wikimedia Commons 公共域名图片
 * 生成 24×24 像素数据并输出 TypeScript 代码
 */

const https = require('https')
const http = require('http')
const { createWriteStream, writeFileSync } = require('fs')
const { execSync } = require('child_process')

// 目标画作列表（使用 Wikimedia Commons 链接）
const PAINTINGS = [
  {
    id: 'mona-lisa',
    title: '蒙娜丽莎',
    artist: '达芬奇',
    year: '1503',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg'
  },
  {
    id: 'starry-night',
    title: '星月夜',
    artist: '梵高',
    year: '1889',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/thumb/7/76/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/800px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg'
  }
  // 可继续添加...
]

// 下载图片
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    protocol.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // 重定向
        return downloadImage(res.headers.location).then(resolve).catch(reject)
      }
      
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

// 使用 ImageMagick 或 Sharp 缩放图片到 24x24
// 这里简化为生成占位符代码
function generatePlaceholderCode(painting) {
  return `
// ${painting.title} - ${painting.artist} (${painting.year})
function generate${painting.id.replace(/-/g, '')}(): string[][] {
  const canvas: string[][] = []
  for (let y = 0; y < 24; y++) {
    const row: string[] = []
    for (let x = 0; x < 24; x++) {
      // 简化版：使用主题色
      row.push('#8B4513') // 占位符颜色
    }
    canvas.push(row)
  }
  return canvas
}`
}

// 主函数
async function main() {
  console.log('开始导入名画...')
  
  const outputs = []
  
  for (const p of PAINTINGS) {
    console.log(`处理: ${p.title}...`)
    
    try {
      // 1. 下载图片（如果环境支持）
      // const imgBuffer = await downloadImage(p.imageUrl)
      // 2. 缩放 + 提取颜色（需要 Sharp 库）
      // 3. 生成代码
      
      const code = generatePlaceholderCode(p)
      outputs.push(code)
      
      console.log(`  ✅ ${p.title} 完成`)
    } catch (e) {
      console.error(`  ❌ ${p.title} 失败:`, e.message)
    }
  }
  
  // 输出到文件
  const outputPath = __dirname + '/imported-paintings.ts'
  writeFileSync(outputPath, outputs.join('\n'))
  console.log(`\n输出文件: ${outputPath}`)
}

main().catch(console.error)
