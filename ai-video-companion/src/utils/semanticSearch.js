/** 调用后端对一段文本做向量化，返回 number[] */
export async function fetchEmbedding(text) {
  const res = await fetch('/api/gemini/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`向量化失败 (${res.status})`)
  const { embedding } = await res.json()
  return embedding
}

function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na  += a[i] * a[i]
    nb  += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

/**
 * 对查询词做一次向量化，与 localStorage 中已存的 embedding 做余弦相似度排序。
 * 没有 embedding 的条目排在最后。
 */
export async function semanticSearch(query, favorites) {
  const queryVec = await fetchEmbedding(query)
  return [...favorites].sort((a, b) => {
    const sa = a.embedding?.length ? cosineSimilarity(queryVec, a.embedding) : -1
    const sb = b.embedding?.length ? cosineSimilarity(queryVec, b.embedding) : -1
    return sb - sa
  })
}
