const STORAGE_KEY = 'feedbacks'

/** 从 localStorage 读取所有反馈 */
export function getAllFeedbacks() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
}

/**
 * 批量分类：一次 API 调用对所有反馈做零样本分类
 * 分类：剧情类 / 知识类 / 续集期待 / 其他
 * @returns {Promise<Array<{...原反馈, category: string}>>}
 */
export async function classifyFeedbacks(feedbacks) {
  if (!feedbacks.length) return []
  const res = await fetch('/api/gemini/classify-feedbacks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedbacks }),
  })
  if (!res.ok) throw new Error(`分类失败 (${res.status})`)
  const { results } = await res.json()
  return results
}

/**
 * 返回出现频率最高的前 n 条反馈（按问题文本去重计数）
 * @returns {Array<{question: string, count: number, latest: object}>}
 */
export function getTopFeedbacks(n = 5) {
  const feedbacks = getAllFeedbacks()
  const countMap = new Map()
  for (const f of feedbacks) {
    const key = (f.question ?? '').trim() || '（无文本）'
    if (!countMap.has(key)) {
      countMap.set(key, { question: key, count: 0, latest: f })
    }
    const entry = countMap.get(key)
    entry.count++
    if (f.createdAt > (entry.latest.createdAt ?? '')) entry.latest = f
  }
  return [...countMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}
