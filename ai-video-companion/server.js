import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

const API_KEY = process.env.NOVA_API_KEY
const BASE_URL = process.env.NOVA_BASE_URL || 'https://us.novaiapi.com/v1'
const MODEL    = process.env.NOVA_MODEL    || 'gemini-2.0-flash'

console.log(`[server] BASE_URL=${BASE_URL}`)
console.log(`[server] MODEL=${MODEL}`)
console.log(`[server] API_KEY=${API_KEY ? API_KEY.slice(0, 8) + '...' : '未设置！'}`)

// 构建 OpenAI 兼容 messages：可选系统提示 + 图片帧 + 文字
function buildMessages(frames = [], prompt, persona) {
  const messages = []
  if (persona) messages.push({ role: 'system', content: persona })
  messages.push({
    role: 'user',
    content: [
      ...frames.map((f) => ({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${f}` },
      })),
      { type: 'text', text: prompt },
    ],
  })
  return messages
}

// upstream 错误统一处理：读取并返回完整错误文本
async function readUpstreamError(upstream, tag) {
  let body = ''
  try { body = await upstream.text() } catch {}
  console.error(`[${tag}] upstream HTTP ${upstream.status}:`, body)
  return body
}

async function novaFetch(path, body, stream = false, timeoutMs = 90_000) {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const payload = { model: MODEL, messages: body }
  if (stream) payload.stream = true          // 不流式时不传 stream 字段，避免部分 API 拒绝
  try {
    console.log(`[novaFetch] POST ${BASE_URL}${path} stream=${stream} msgs=${body.length}`)
    return await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
  } catch (err) {
    console.error(`[novaFetch] fetch 异常:`, err)
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// ─── 诊断接口：检测 API 连通性 ────────────────────────────────────────────────
app.get('/api/ping', async (req, res) => {
  try {
    const upstream = await novaFetch('/chat/completions', [
      { role: 'user', content: '回复"ok"' }
    ], false, 15_000)
    const body = await upstream.text()
    res.json({ status: upstream.status, body: body.slice(0, 300) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── 流式问答 ──────────────────────────────────────────────────────────────────
app.post('/api/gemini/ask', async (req, res) => {
  const { frames = [], question, persona } = req.body

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    console.log(`[ask] frames=${frames.length} question="${(question ?? '').slice(0, 60)}"`)
    const upstream = await novaFetch('/chat/completions', buildMessages(frames, question, persona), true)
    console.log(`[ask] upstream status=${upstream.status}`)

    if (!upstream.ok) {
      const errBody = await readUpstreamError(upstream, 'ask')
      res.write(`data: ${JSON.stringify({ error: { message: `[HTTP ${upstream.status}] ${errBody.slice(0, 300)}` } })}\n\n`)
      return res.end()
    }

    const reader  = upstream.body.getReader()
    const decoder = new TextDecoder()
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      total += chunk.length
      res.write(chunk)
    }
    console.log(`[ask] done, total bytes=${total}`)
  } catch (err) {
    console.error(`[ask] 异常:`, err)
    res.write(`data: ${JSON.stringify({ error: { message: err.message } })}\n\n`)
  } finally {
    res.end()
  }
})

// ─── 全文总结 ──────────────────────────────────────────────────────────────────
app.post('/api/gemini/summarize', async (req, res) => {
  const { frames = [], persona } = req.body
  const prompt = '请用中文对这个视频进行结构化总结。按时间段分段，每段给出核心要点，使用 Markdown 格式（## 段落标题 + 要点列表），简洁清晰，不超过 600 字。'
  try {
    const upstream = await novaFetch('/chat/completions', buildMessages(frames, prompt, persona))
    if (!upstream.ok) {
      const errBody = await readUpstreamError(upstream, 'summarize')
      return res.status(502).json({ error: `[HTTP ${upstream.status}] ${errBody.slice(0, 300)}` })
    }
    const data = await upstream.json()
    res.json({ summary: data.choices?.[0]?.message?.content ?? '' })
  } catch (err) {
    console.error('[summarize] 异常:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── 剧情图谱 ──────────────────────────────────────────────────────────────────
app.post('/api/gemini/story-map', async (req, res) => {
  const { frames = [], persona } = req.body
  const prompt = `仔细分析这些视频帧，尽可能多地提取信息，只返回 JSON，不要任何额外文字：
{"characters":[{"id":"c1","name":"角色名","description":"外貌/身份/性格简介"}],"relationships":[{"source":"c1","target":"c2","type":"关系类型（如朋友、对立、主仆等）"}],"events":[{"id":"e1","title":"事件名","description":"发生了什么"}]}
要求：
- characters：识别所有出现的人物/生物/重要物体，至少尝试填 2 个，上限 10
- relationships：角色之间的关系，有几条写几条，上限 15
- events：按时间线列出关键情节，至少尝试填 2 个，上限 5
- 如果视频内容单一，可以从场景、氛围、动作等角度补充`
  try {
    const upstream = await novaFetch('/chat/completions', buildMessages(frames, prompt, persona))
    if (!upstream.ok) {
      const errBody = await readUpstreamError(upstream, 'story-map')
      return res.status(502).json({ error: `[HTTP ${upstream.status}] ${errBody.slice(0, 300)}` })
    }
    const data    = await upstream.json()
    const content = data.choices?.[0]?.message?.content ?? '{}'
    console.log('[story-map] raw content:', content.slice(0, 300))
    const cleaned = content.replace(/```(?:json)?\n?|\n?```/g, '').trim()
    const match   = cleaned.match(/\{[\s\S]*\}/)
    res.json(match ? JSON.parse(match[0]) : { characters: [], relationships: [], events: [] })
  } catch (err) {
    console.error('[story-map] 异常:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── 事件图谱 ──────────────────────────────────────────────────────────────────
app.post('/api/gemini/event-map', async (req, res) => {
  const { frames = [], persona } = req.body
  const prompt = `仔细分析这些视频帧，提取关键事件序列，只返回 JSON，不要任何额外文字：
{"events":[{"id":"e1","title":"事件标题","description":"简短描述（1句话）","time":"时间点或阶段"}],"edges":[{"source":"e1","target":"e2","label":"导致"}]}
要求：
- events：按时间顺序排列的关键事件，最多 8 个，必须有 id 和 title
- edges：事件之间的因果或时序关系，有几条写几条
- time 字段填时间点、阶段描述（如"开始"、"高潮"）或留空字符串
- 如果视频内容单一，从动作、场景变化、情绪转折等角度补充事件`
  try {
    const upstream = await novaFetch('/chat/completions', buildMessages(frames, prompt, persona))
    if (!upstream.ok) {
      const errBody = await readUpstreamError(upstream, 'event-map')
      return res.status(502).json({ error: `[HTTP ${upstream.status}] ${errBody.slice(0, 300)}` })
    }
    const data    = await upstream.json()
    const content = data.choices?.[0]?.message?.content ?? '{}'
    console.log('[event-map] raw content:', content.slice(0, 300))
    const cleaned = content.replace(/```(?:json)?\n?|\n?```/g, '').trim()
    const match   = cleaned.match(/\{[\s\S]*\}/)
    res.json(match ? JSON.parse(match[0]) : { events: [], edges: [] })
  } catch (err) {
    console.error('[event-map] 异常:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── AI 整理收藏 ────────────────────────────────────────────────────────────────
app.post('/api/gemini/ai-organize', async (req, res) => {
  const { favorites } = req.body
  if (!Array.isArray(favorites) || !favorites.length) return res.json({ folders: [], assignments: {} })

  const summaries = favorites.map((f, i) => {
    if (f.type === 'storymap' || f.type === 'charactermap') {
      const chars  = (f.data?.characters ?? []).map(c => c.name).join('、')
      const events = (f.data?.events ?? []).map(e => e.title).join('、')
      return `${i}: [图谱] 角色:${chars} 事件:${events}`
    }
    return `${i}: [${f.type === 'summary' ? '总结' : '问答'}] ${(f.question || f.answer || '').slice(0, 80)}`
  }).join('\n')

  const prompt = `分析这些收藏内容，推荐 3-5 个文件夹分类名称，并指明每条收藏应归入哪个文件夹。
只返回 JSON，格式：{"folders":["文件夹名"],"assignments":{"0":"文件夹名","1":"文件夹名"}}，不要任何其他文字。

收藏内容：
${summaries}`

  try {
    const upstream = await novaFetch('/chat/completions', [{ role: 'user', content: prompt }])
    if (!upstream.ok) {
      const errBody = await readUpstreamError(upstream, 'ai-organize')
      return res.status(502).json({ error: `[HTTP ${upstream.status}] ${errBody.slice(0, 300)}` })
    }
    const data    = await upstream.json()
    const content = (data.choices?.[0]?.message?.content ?? '{}').replace(/```(?:json)?\n?|\n?```/g, '').trim()
    const match   = content.match(/\{[\s\S]*\}/)
    res.json(match ? JSON.parse(match[0]) : { folders: [], assignments: {} })
  } catch (err) {
    console.error('[ai-organize] 异常:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── 反馈分类 ──────────────────────────────────────────────────────────────────
app.post('/api/gemini/classify-feedbacks', async (req, res) => {
  const { feedbacks } = req.body
  if (!Array.isArray(feedbacks) || !feedbacks.length) return res.json({ results: [] })

  const items  = feedbacks.map((f, i) => `${i}. ${f.question || '（无问题文本）'}`).join('\n')
  const prompt = `对以下用户反馈做零样本分类，每条归入且仅归入一个类别：剧情类 / 知识类 / 续集期待 / 其他。
只返回 JSON 数组，格式：[{"index":0,"category":"剧情类"},...]，不要任何其他文字。

反馈列表：
${items}`

  try {
    const upstream = await novaFetch('/chat/completions', [{ role: 'user', content: prompt }])
    if (!upstream.ok) {
      const errBody = await readUpstreamError(upstream, 'classify-feedbacks')
      return res.status(502).json({ error: `[HTTP ${upstream.status}] ${errBody.slice(0, 300)}` })
    }
    const data    = await upstream.json()
    const content = (data.choices?.[0]?.message?.content ?? '[]').replace(/```(?:json)?\n?|\n?```/g, '').trim()
    const match   = content.match(/\[[\s\S]*\]/)
    const labels  = match ? JSON.parse(match[0]) : []
    const map     = Object.fromEntries(labels.map(l => [l.index, l.category]))
    res.json({ results: feedbacks.map((f, i) => ({ ...f, category: map[i] ?? '其他' })) })
  } catch (err) {
    console.error('[classify-feedbacks] 异常:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── 向量化 ────────────────────────────────────────────────────────────────────
app.post('/api/gemini/embed', async (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })
  const apiKey = process.env.VITE_GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'VITE_GEMINI_API_KEY not set' })
  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text }] } }),
        signal: AbortSignal.timeout(20_000),
      }
    )
    if (!upstream.ok) {
      const err = await upstream.text()
      console.error('[embed] error:', err)
      return res.status(502).json({ error: err })
    }
    const data = await upstream.json()
    res.json({ embedding: data.embedding?.values ?? [] })
  } catch (err) {
    console.error('[embed] 异常:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── 语义搜索 ──────────────────────────────────────────────────────────────────
app.post('/api/gemini/semantic-search', async (req, res) => {
  const { query, items } = req.body
  if (!query || !Array.isArray(items) || !items.length) return res.json({ ranked: items ?? [] })

  const prompt = `用户的搜索词：「${query}」
下面是收藏内容列表（JSON 数组），请按照与搜索词的语义相关性从高到低排序，返回排序后的完整数组。只返回 JSON 数组，不要任何其他文字：
${JSON.stringify(items)}`
  try {
    const upstream = await novaFetch('/chat/completions', [{ role: 'user', content: prompt }])
    if (!upstream.ok) return res.json({ ranked: items })
    const data    = await upstream.json()
    const content = (data.choices?.[0]?.message?.content ?? '[]').replace(/```(?:json)?\n?|\n?```/g, '').trim()
    const match   = content.match(/\[[\s\S]*\]/)
    res.json({ ranked: match ? JSON.parse(match[0]) : items })
  } catch {
    res.json({ ranked: items })
  }
})

const PORT = process.env.PORT || 3001
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => console.log(`[server] Proxy running at http://localhost:${PORT}`))
}
export default app
