import { extractFrames } from './frameExtractor.js'

const BASE = '/api/gemini'

/** 本地提取视频帧，返回 { frames, duration, name } */
export async function uploadVideo(file) {
  const { frames, duration } = await extractFrames(file)
  return { frames, duration, name: file.name }
}

/** 流式问答，async generator。persona 为搭子系统提示（可选） */
export async function* askQuestion(frames, question, persona) {
  const res = await fetch(`${BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frames, question, persona }),
  })
  if (!res.ok) throw new Error(`askQuestion failed (${res.status})`)

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer    = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (raw === '[DONE]') return
      try {
        const json = JSON.parse(raw)
        if (json.error) throw new Error(json.error.message ?? JSON.stringify(json.error))
        const text = json.choices?.[0]?.delta?.content
        if (text) yield text
      } catch (e) {
        if (e.message) throw e
      }
    }
  }
}

/** 全文总结，返回 Markdown 字符串 */
export async function summarizeVideo(frames, persona) {
  const res = await fetch(`${BASE}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frames, persona }),
  })
  if (!res.ok) throw new Error(`summarizeVideo failed (${res.status})`)
  return (await res.json()).summary
}

/** 人物关系图，返回 { characters, relationships } */
export async function extractStoryMap(frames, persona) {
  const res = await fetch(`${BASE}/story-map`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frames, persona }),
  })
  if (!res.ok) throw new Error(`extractStoryMap failed (${res.status})`)
  return res.json()
}

/** 角色扮演，流式 async generator */
export async function* rolePlay(frames, characterName, characterDesc, userMessage) {
  const persona = `你现在扮演视频中的角色【${characterName}】。角色描述：${characterDesc}。请完全以该角色的口吻、性格、说话方式回应用户，不要出戏，不要提及自己是AI。`
  yield* askQuestion(frames, userMessage, persona)
}

/** 事件图谱，返回 { events, edges } */
export async function extractEventMap(frames, persona) {
  const res = await fetch(`${BASE}/event-map`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frames, persona }),
  })
  if (!res.ok) throw new Error(`extractEventMap failed (${res.status})`)
  return res.json()
}
