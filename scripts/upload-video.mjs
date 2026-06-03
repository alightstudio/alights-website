import { put } from '@vercel/blob'
import { readFileSync } from 'fs'
import { basename } from 'path'
import { randomBytes } from 'crypto'

const filePath = process.argv[2]
const projectTitle = process.argv[3]

if (!filePath) {
  console.error('用法: node upload.mjs <视频路径> [项目标题]')
  process.exit(1)
}

const buffer = readFileSync(filePath)
const fileName = basename(filePath)
const title = projectTitle || fileName.replace(/\.[^/.]+$/, '')
const safeName = randomBytes(8).toString('hex')
const ext = fileName.split('.').pop() || 'mp4'
const blobPath = `reviews/${safeName}.${ext}`

console.log(`📤 ${fileName} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`)
console.log(`   上传至: ${blobPath}`)

const start = Date.now()
const blob = await put(blobPath, buffer, {
  access: 'public',
  addRandomSuffix: false,
})
const elapsed = ((Date.now() - start) / 1000).toFixed(1)
const speed = (buffer.length / 1024 / 1024 / elapsed).toFixed(1)

console.log(`✅ ${elapsed}s (${speed}MB/s)`)
console.log(`URL: ${blob.url}`)
console.log(`---RECORD---`)
console.log(JSON.stringify({ title, videoUrl: blob.url, videoName: fileName }))
