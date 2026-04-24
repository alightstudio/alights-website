// 记录作品点击（用于积分系统）
export async function trackWorkClick(workId?: string) {
  try {
    await fetch('/api/points/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workId: workId || null }),
    })
  } catch {
    // 静默失败，不影响用户体验
  }
}
