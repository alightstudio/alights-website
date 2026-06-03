/**
 * 本地视频上传脚本 — 绕过 Vercel Hobby 4.5MB 请求体限制
 *
 * 用法:
 *   node scripts/upload-review.mjs ~/Desktop/DEMO/xxx.mp4 "项目名称"
 *
 * 原理: 直接通过 @vercel/blob SDK 从本机上传至 Vercel CDN
 *       视频文件不经过 Vercel Serverless Function，无大小限制
 */

import { put } from '@vercel/blob'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { basename } from 'path'
import { randomBytes } from 'crypto'

async function main() {
  const [filePath, title] = process.argv.slice(2)

  if (!filePath) {
    console.error('❌ 用法: node scripts/upload-review.mjs <视频路径> [项目名称]')
    process.exit(1)
  }

  // 1. 获取文件信息
  const stats = await stat(filePath)
  const fileName = basename(filePath)
  const projectTitle = title || fileName.replace(/\.[^/.]+$/, '')

  // 2. 生成唯一文件名（不可预测，防止枚举）
  const safeName = randomBytes(8).toString('hex')
  const ext = fileName.split('.').pop() || 'mp4'
  const blobPath = `reviews/${safeName}.${ext}`

  console.log(`📤 上传中: ${fileName} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`)
  console.log(`   目标: ${blobPath}`)

  const start = Date.now()

  // 3. 上传到 Vercel Blob
  const blob = await put(blobPath, createReadStream(filePath), {
    access: 'public',
    addRandomSuffix: false,
  })

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  const speed = (stats.size / 1024 / 1024 / elapsed).toFixed(1)

  console.log(`✅ 上传完成! (${elapsed}s, ${speed}MB/s)`)
  console.log(`   URL: ${blob.url}`)
  console.log('')
  console.log('📋 接下来请把以下信息填入审片系统:')
  console.log(JSON.stringify({
    title: projectTitle,
    videoUrl: blob.url,
    videoName: fileName,
  }, null, 2))
}

main().catch(err => {
  console.error('❌ 上传失败:', err.message)
  process.exit(1)
})
