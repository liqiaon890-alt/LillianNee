import { useState, useRef, useEffect } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import ChatBubble from '../components/ChatBubble'
import Favorites from '../components/Favorites'
import CompanionSelect from '../components/CompanionSelect'
import CompanionDropdown from '../components/CompanionDropdown'
import TencentNavBar from '../components/TencentNavBar'
import { uploadVideo, askQuestion, rolePlay, extractStoryMap, extractEventMap } from '../utils/geminiAPI'
import { fetchEmbedding } from '../utils/semanticSearch'

// ─── 主题色（引用 CSS 变量） ─────────────────────────────────────────────────────
const T = {
  pageBg:       'var(--bg-base)',
  panelBg:      'var(--bg-panel)',
  panelBorder:  'var(--border-subtle)',
  orange:       'var(--accent)',
  orangeDim:    'rgba(255,102,0,0.12)',
  orangeGlow:   'rgba(255,102,0,0.40)',
  orangeGlowHi: 'rgba(255,102,0,0.65)',
  inputBg:      'var(--bg-input)',
  divider:      'var(--border-subtle)',
  pillBg:       'var(--chip-bg)',
  pillHover:    'rgba(255,102,0,0.18)',
}

// 搭子欢迎语
const WELCOME_MESSAGES = {
  study:     '你好！我是你的学习搭子，专注帮你从视频中提炼知识点。上传视频后随时提问，咱们一起搞懂它！',
  detective: '我是你的专属侦探搭子，视频已就位。案情扑朔迷离——说说你的第一个疑问？',
  drama:     '嘿！我是你的剧情搭子，超级剧迷一枚！有没有哪个情节让你想聊聊？',
  language:  'Hi！我是你的外语搭子。视频里有什么生词或地道表达搞不懂？告诉我，咱们一起研究！',
  meme:      '我是你的热梗搭子！这期视频有没有超好笑的梗？直接问我，来源用法我全知道！',
  food:      '你好，我是美食搭子！看到好吃的了吗？食谱、做法、食材——随时问我！',
  music:     '我是你的音乐搭子！这段音乐怎么样？歌词、编曲、艺人故事，一起深挖吧！',
  sports:    '我是你的体育搭子！比赛看得怎么样？有什么精彩战术或关键时刻想聊聊？',
  history:   '你好！我是历史搭子。视频里涉及哪段历史？让我们一起梳理时间线，还原历史真相。',
  tech:      '我是你的科技搭子！视频里有什么有趣的产品或技术？一起来分析评测吧！',
  travel:    '你好！我是旅行搭子。视频里的目的地看起来怎么样？有什么想了解的随时问我！',
  game:      '来了！我是你的游戏搭子。这游戏你玩过吗？剧情、操作、战术，咱们一起聊！',
  parenting: '你好，我是亲子搭子。视频里有什么育儿方法让你印象深刻？我们一起来探讨吧！',
  fashion:   '嗨！我是时尚搭子。视频里有什么穿搭让你眼前一亮？一起来分析搭配和流行趋势！',
  pet:       '你好！我是宠物搭子。视频里的小可爱太萌了！有什么护理问题或行为疑问想聊聊吗？',
}

// 推荐动作映射到 AI 问题提示（summary/characterMap/eventMap 有专用 handler）
const ACTION_PROMPTS = {
  quiz:            '请根据视频内容出 3 道测验题，包含答案和解析。',
  roleplay:        '请选择视频中一个角色，用第一人称和我互动，展示这个角色的性格和说话方式。',
  vocabulary:      '请整理视频中出现的重要外语词汇，附上中文释义、例句和记忆技巧。',
  culture:         '请补充视频中涉及的文化背景知识，帮助我更好地理解视频内容。',
  memeCollection:  '请整理视频中出现的有趣梗或段子，解释来源和使用场景。',
  recipe:          '请根据视频整理详细的食谱步骤、所需食材和烹饪小技巧。',
  lyrics:          '请深度分析视频中出现的歌词，解读意境、情感和创作背景。',
  comparison:      '请对视频中的产品做详细的参数对比和综合评测总结。',
  placeCollection: '请整理视频中出现的地点信息，包括特色、实用建议和旅行小贴士。',
  outfitCollection:'请分析视频中的穿搭搭配，总结风格要点、单品推荐和穿搭技巧。',
  careRecord:      '请整理视频中的宠物护理要点，包括日常护理、健康建议和注意事项。',
  knowledgeMap:    '请梳理视频中的核心知识点，以结构化方式呈现概念关系和学习路径。',
}

// ─── 当前剧情焦点文案 ───────────────────────────────────────────────────────────
const DRAMA_FOCUS = {
  detective: '案情扑朔迷离，幕后真凶究竟是谁？',
  drama:     '命运齿轮转动，主角将面临最艰难的抉择',
  study:     '知识体系正在构建，深度理解视频内容',
  language:  '语言密码等待破译，地道表达即将呈现',
  meme:      '梗点已锁定，趣味内容即将解析',
  food:      '美食密码已就绪，烹饪奥秘等待揭晓',
  music:     '旋律情感等待解读，音乐故事徐徐展开',
  sports:    '赛场战术分析中，关键时刻复盘启动',
  history:   '历史卷轴正在展开，时代真相即将揭晓',
  tech:      '科技原理解析中，产品评测全面启动',
  travel:    '目的地信息加载中，旅行攻略即将送达',
  game:      '游戏世界探索中，攻略技巧等你发现',
  parenting: '育儿智慧等待挖掘，专业建议即将呈现',
  fashion:   '时尚密码正在解读，穿搭技巧即将揭晓',
  pet:       '宠物行为分析中，护理要点等你了解',
}

// ─── 建议问题（每搭子 4 个） ─────────────────────────────────────────────────────
const SUGGESTED_QUESTIONS = {
  detective: ['凶手是谁？', '案件有何漏洞？', '谁有不在场证明？', '真正动机是什么？'],
  drama:     ['这集讲了什么？', '主角经历了什么？', '有哪些名场面？', '剧情走向如何？'],
  study:     ['核心知识点是？', '难点在哪里？', '能出练习题吗？', '怎么记忆这个？'],
  language:  ['有哪些生词？', '这句话怎么理解？', '有何地道表达？', '语法点是什么？'],
  meme:      ['这梗从哪来？', '怎么使用这梗？', '还有类似的梗？', '为何这么好笑？'],
  food:      ['这道菜怎么做？', '食材有哪些？', '有什么烹饪技巧？', '营养价值如何？'],
  music:     ['这首歌讲什么？', '歌词怎么理解？', '谁创作的？', '编曲有何特色？'],
  sports:    ['这是什么战术？', '谁发挥最好？', '关键时刻在哪？', '整体表现如何？'],
  history:   ['历史背景是？', '关键人物是谁？', '后续影响如何？', '有何历史意义？'],
  tech:      ['技术原理是？', '有什么优缺点？', '跟竞品比如何？', '适合什么场景？'],
  travel:    ['这地方在哪？', '有什么特色？', '最佳旅游时间？', '推荐什么活动？'],
  game:      ['这游戏好玩吗？', '核心玩法是？', '有哪些技巧？', '剧情讲什么？'],
  parenting: ['这方法有效吗？', '适合什么年龄？', '有什么注意？', '如何在家实践？'],
  fashion:   ['这是什么风格？', '如何复刻这套？', '适合什么场合？', '单品在哪买？'],
  pet:       ['这行为正常吗？', '如何训练？', '需要注意什么？', '推荐什么食物？'],
}

export default function MainPage() {
  const [messages, setMessages]                   = useState([])
  const [inputText, setInputText]                 = useState('')
  const [frames, setFrames]                       = useState(null)
  const [videoName, setVideoName]                 = useState('')
  const [videoSrc, setVideoSrc]                   = useState('')
  const [uploading, setUploading]                 = useState(false)
  const [streaming, setStreaming]                 = useState(false)
  const [summarizing, setSummarizing]             = useState(false)
  const [extracting, setExtracting]               = useState(false)
  const [favOpen, setFavOpen]                     = useState(false)
  const [selectedCompanion, setSelectedCompanion] = useState(null)
  const [isPanelOpen, setIsPanelOpen]             = useState(false)

  const bp       = useBreakpoint()
  const isMobile = bp === 'mobile'
  const isTablet = bp === 'tablet'

  const fileInputRef  = useRef(null)
  const chatEndRef    = useRef(null)
  const messagesRef   = useRef([])
  const touchStartY   = useRef(null)
  messagesRef.current = messages

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── 消息操作 ──────────────────────────────────────────────────────────────
  const pushMessage = (role, content, type = 'text') => {
    const id = crypto.randomUUID()
    setMessages((prev) => [...prev, { id, role, content, type }])
    return id
  }

  const patchMessage = (id, patch) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  // ─── 搭子选择 / 切换 ────────────────────────────────────────────────────────
  const activateCompanion = (companion) => {
    setSelectedCompanion(companion)
    const welcome = WELCOME_MESSAGES[companion.id]
      ?? `${companion.emoji} 你好！我是你的${companion.name}，随时准备好了。上传视频后直接向我提问吧！`
    const id = crypto.randomUUID()
    setMessages([{ id, role: 'ai', content: welcome, type: 'text' }])
  }

  // ─── 视频上传 ──────────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setVideoSrc(URL.createObjectURL(file))
    setVideoName(file.name)
    setUploading(true)
    try {
      const result = await uploadVideo(file)
      setFrames(result.frames)
      pushMessage('ai', `✅ 视频「${file.name}」已提取 ${result.frames.length} 帧，可以开始提问了！`)
    } catch (err) {
      pushMessage('ai', `❌ 上传失败：${err.message}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // ─── 流式问答（通用） ───────────────────────────────────────────────────────
  const streamAnswer = async (userLabel, prompt, type = 'text') => {
    pushMessage('user', userLabel)
    const aiId = crypto.randomUUID()
    setMessages((prev) => [...prev, { id: aiId, role: 'ai', content: '', type }])
    setStreaming(true)
    let fullText = ''
    try {
      const c = selectedCompanion
      const stream = c?.isRoleplay
        ? rolePlay(frames, c.roleplayCharacter, c.roleplayDesc, prompt)
        : askQuestion(frames, prompt, c?.persona)
      for await (const chunk of stream) {
        fullText += chunk
        patchMessage(aiId, { content: fullText })
      }
      if (!fullText) patchMessage(aiId, { content: '❌ 未收到任何内容，请重试' })
    } catch (err) {
      patchMessage(aiId, { content: `❌ 错误：${err.message}` })
    } finally {
      setStreaming(false)
    }
  }

  // ─── 发送问题 ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const q = inputText.trim()
    if (!q || !frames || streaming || uploading) return
    setInputText('')
    await streamAnswer(q, q)
  }

  // ─── 全文总结 ──────────────────────────────────────────────────────────────
  const handleSummarize = async () => {
    if (!frames || summarizing || streaming) return
    setSummarizing(true)
    const prompt = '请用中文对这个视频进行结构化总结。按时间段分段，每段给出核心要点，使用 Markdown 格式（## 段落标题 + 要点列表），简洁清晰，不超过 600 字。'
    pushMessage('user', '📄 生成全文总结')
    const aiId = crypto.randomUUID()
    setMessages((prev) => [...prev, { id: aiId, role: 'ai', content: '', type: 'summary' }])
    setStreaming(true)
    let fullText = ''
    try {
      for await (const chunk of askQuestion(frames, prompt, selectedCompanion?.persona)) {
        fullText += chunk
        patchMessage(aiId, { content: fullText })
      }
      if (!fullText) patchMessage(aiId, { content: '❌ 未收到任何内容，请重试' })
    } catch (err) {
      patchMessage(aiId, { content: `❌ 错误：${err.message}` })
    } finally {
      setSummarizing(false)
      setStreaming(false)
    }
  }

  // ─── 人物关系图 ────────────────────────────────────────────────────────────
  const handleCharacterMap = async () => {
    if (!frames || extracting || streaming) return
    setExtracting(true)
    pushMessage('user', '👥 生成人物关系图')
    const aiId = crypto.randomUUID()
    setMessages((prev) => [...prev, { id: aiId, role: 'ai', content: '', type: 'charactermap', data: null }])
    try {
      const result = await extractStoryMap(frames, selectedCompanion?.persona)
      patchMessage(aiId, { data: result })
    } catch (err) {
      patchMessage(aiId, { content: `❌ 错误：${err.message}`, type: 'text' })
    } finally {
      setExtracting(false)
    }
  }

  // ─── 事件图谱 ──────────────────────────────────────────────────────────────
  const handleEventMap = async () => {
    if (!frames || extracting || streaming) return
    setExtracting(true)
    pushMessage('user', '📅 生成事件图谱')
    const aiId = crypto.randomUUID()
    setMessages((prev) => [...prev, { id: aiId, role: 'ai', content: '', type: 'eventmap', data: null }])
    try {
      const result = await extractEventMap(frames, selectedCompanion?.persona)
      patchMessage(aiId, { data: result })
    } catch (err) {
      patchMessage(aiId, { content: `❌ 错误：${err.message}`, type: 'text' })
    } finally {
      setExtracting(false)
    }
  }

  // ─── 推荐动作 ──────────────────────────────────────────────────────────────
  const handleRecommendedAction = (action) => {
    if (!frames || streaming || summarizing || extracting) return
    if (action.id === 'summary')      return handleSummarize()
    if (action.id === 'characterMap') return handleCharacterMap()
    if (action.id === 'eventMap')     return handleEventMap()
    const prompt = ACTION_PROMPTS[action.id]
    if (prompt) streamAnswer(action.label, prompt)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ─── localStorage 操作 ────────────────────────────────────────────────────
  const getPrecedingQuestion = (msgId) => {
    const msgs = messagesRef.current
    const idx  = msgs.findIndex((m) => m.id === msgId)
    return [...msgs].slice(0, idx).reverse().find((m) => m.role === 'user')?.content ?? ''
  }

  const makeSaveHandler = (msg) => async () => {
    const question = getPrecedingQuestion(msg.id)
    const isMap = ['storymap', 'charactermap', 'eventmap'].includes(msg.type)
    let textToEmbed
    if (isMap && msg.data) {
      const chars  = (msg.data.characters ?? []).map(c => c.name).join(' ')
      const events = (msg.data.events ?? []).map(e => e.title).join(' ')
      textToEmbed  = `${chars} ${events}`.trim()
    } else {
      textToEmbed = `${question} ${msg.content ?? ''}`.trim()
    }
    let embedding = null
    try { embedding = await fetchEmbedding(textToEmbed) } catch {}
    const favorites = JSON.parse(localStorage.getItem('favorites') ?? '[]')
    favorites.push({
      type: msg.type ?? 'qa',
      question,
      answer: isMap ? '' : msg.content,
      data:   msg.data ?? null,
      sourceVideo: videoName,
      savedAt: new Date().toISOString(),
      embedding,
      companionId:    selectedCompanion?.id    ?? null,
      companionName:  selectedCompanion?.name  ?? null,
      companionEmoji: selectedCompanion?.emoji ?? null,
    })
    localStorage.setItem('favorites', JSON.stringify(favorites))
  }

  const makeFeedbackHandler = (msg) => () => {
    const question  = getPrecedingQuestion(msg.id)
    const feedbacks = JSON.parse(localStorage.getItem('feedbacks') ?? '[]')
    feedbacks.push({ question, sourceVideo: videoName, createdAt: new Date().toISOString() })
    localStorage.setItem('feedbacks', JSON.stringify(feedbacks))
  }

  // ─── 移动端抽屉滑动关闭 ───────────────────────────────────────────────────────
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
  }
  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta > 100) setIsPanelOpen(false)
    touchStartY.current = null
  }

  const busy = streaming || summarizing || extracting

  // ─── 渲染 ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="text-white"
      style={{ background: '#0a0a0a', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* ── 腾讯视频导航栏 ─────────────────────────────────────────────────────── */}
      <TencentNavBar />

      {/* ── 全宽视频区域 ───────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        ...(isMobile ? { height: '56vw', flexShrink: 0 } : { flex: 1 }),
      }}>
        {videoSrc ? (
          <video
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block' }}
            controls
            src={videoSrc}
          />
        ) : (
          <CinematicPlaceholder
            onUpload={() => fileInputRef.current?.click()}
            uploading={uploading}
          />
        )}

        {/* 视频底部信息覆盖层 */}
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '32px 20px 10px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            pointerEvents: 'none',
          }}
        >
          <div />
          <button
            style={{ fontSize: 11, color: '#888', pointerEvents: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? '上传中…' : videoSrc ? '📁 换视频' : ''}
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* ── 移动端：视频下方深色填充区 ────────────────────────────────────────── */}
      {isMobile && <div style={{ flex: 1, background: '#0a0a0a' }} />}

      {/* ── 圆形浮窗气泡（全端显示） ───────────────────────────────────────────── */}
      <FloatingBubble
        visible={!isPanelOpen}
        emoji={selectedCompanion?.emoji ?? '🤖'}
        onClick={() => setIsPanelOpen(true)}
      />

      {/* ── AI 面板：桌面/平板右侧滑入，移动端底部抽屉 ────────────────────────── */}
      <div
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        style={{
          position: 'fixed',
          background: 'rgba(17,17,17,0.94)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,102,0,0.15)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)',
          transition: 'transform 0.3s ease',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          ...(isMobile ? {
            bottom: 0, left: 0, right: 0,
            height: '75vh',
            borderRadius: '16px 16px 0 0',
            transform: isPanelOpen ? 'translateY(0)' : 'translateY(100%)',
          } : {
            right: 12, top: 12, bottom: 12,
            width: `min(${isTablet ? 360 : 380}px, calc(100vw - 24px))`,
            borderRadius: 16,
            transform: isPanelOpen ? 'translateX(0)' : 'translateX(calc(100% + 28px))',
          }),
        }}
      >
        {/* 移动端拖动条 */}
        {isMobile && (
          <div style={{ padding: '10px 0 2px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#555' }} />
          </div>
        )}
        {/* 面板顶部栏 */}
        <div style={{
          height: 52, display: 'flex', alignItems: 'center',
          padding: '0 12px', gap: 8, flexShrink: 0,
          borderBottom: '1px solid #2a2a2a',
        }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
            {selectedCompanion
              ? <CompanionDropdown currentCompanion={selectedCompanion} onSwitch={activateCompanion} />
              : <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>AI 视频伴侣</span>
            }
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <HeaderIconBtn title="收藏夹" onClick={() => setFavOpen(true)}>
              <img src="/book.png" alt="收藏夹" style={{ width: 22, height: 22, objectFit: 'contain' }} />
            </HeaderIconBtn>
            <PanelCloseBtn onClick={() => setIsPanelOpen(false)} />
          </div>
        </div>

        {/* 内容区 */}
        {!selectedCompanion ? (
          <CompanionSelect onSelect={activateCompanion} />
        ) : (
          <>
            {/* 当前剧情焦点 */}
            <div style={{ padding: '10px 12px 0', flexShrink: 0 }}>
              <DramaFocusBox companion={selectedCompanion} />
            </div>

            {/* 三大功能按钮 */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
              <ActionButtonRow
                disabled={!frames || busy}
                onCharMap={handleCharacterMap}
                onEventMap={handleEventMap}
                onSummary={handleSummarize}
              />
            </div>

            {/* 对话流 */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '8px 12px' }}>
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  type={msg.type}
                  data={msg.data}
                  companionEmoji={msg.role === 'ai' ? selectedCompanion?.emoji : undefined}
                  companionImage={msg.role === 'ai' ? selectedCompanion?.iconImage : undefined}
                  onSave={makeSaveHandler(msg)}
                  onFeedback={makeFeedbackHandler(msg)}
                />
              ))}
              {streaming && (
                <div className="flex justify-start mb-3">
                  <div style={{
                    background: '#1e1e1e', border: '1px solid #2a2a2a',
                    borderRadius: '4px 16px 16px 16px',
                    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span className="animate-pulse" style={{ color: 'var(--accent)', fontSize: 16, lineHeight: 1 }}>▍</span>
                    <span style={{ fontSize: 13, color: '#888' }}>思考中，请稍候…</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 建议问题（固定在输入栏上方） */}
            {messages.length <= 1 && (
              <div style={{ flexShrink: 0, borderTop: '1px solid #2a2a2a' }}>
                <SuggestedQuestions
                  companion={selectedCompanion}
                  onAsk={(q) => streamAnswer(q, q)}
                />
              </div>
            )}

            {/* 底部输入栏 */}
            <InputBar
              value={inputText}
              onChange={setInputText}
              onSend={handleSend}
              onKeyDown={handleKeyDown}
              disabled={!frames || streaming}
              hasContent={!!inputText.trim()}
              placeholder={frames ? '输入问题…' : '请先上传视频'}
            />
          </>
        )}

        <Favorites isOpen={favOpen} onClose={() => setFavOpen(false)} />
      </div>
    </div>
  )
}

// ─── 浮窗气泡（圆形 + 橙色光环） ──────────────────────────────────────────────
const SIZE = 72
function FloatingBubble({ visible, onClick }) {
  const [hov, setHov] = useState(false)
  // pos=null 时使用默认右下角位置
  const [pos, setPos] = useState(null)
  const dragRef = useRef({ dragging: false, startMx: 0, startMy: 0, startBx: 0, startBy: 0, moved: false })

  const resolvePos = () => pos ?? {
    x: window.innerWidth  - SIZE - 20,
    y: window.innerHeight - SIZE - 28,
  }

  const clamp = (x, y) => ({
    x: Math.max(0, Math.min(window.innerWidth  - SIZE, x)),
    y: Math.max(0, Math.min(window.innerHeight - SIZE, y)),
  })

  const handlePointerDown = (e) => {
    e.preventDefault()
    const cur = resolvePos()
    const d = dragRef.current
    d.dragging = true
    d.moved    = false
    d.startMx  = e.clientX
    d.startMy  = e.clientY
    d.startBx  = cur.x
    d.startBy  = cur.y

    const onMove = (ev) => {
      if (!d.dragging) return
      const dx = ev.clientX - d.startMx
      const dy = ev.clientY - d.startMy
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true
      setPos(clamp(d.startBx + dx, d.startBy + dy))
    }
    const onUp = () => {
      d.dragging = false
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup',   onUp)
      if (!d.moved) onClick()
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup',   onUp)
  }

  const cur = resolvePos()

  return (
    <div
      aria-label="打开 AI 伴侣"
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'fixed',
        left: cur.x,
        top:  cur.y,
        width: SIZE,
        height: SIZE,
        borderRadius: '50%',
        background: 'linear-gradient(145deg, #ff8833, #FF6600, #cc3300)',
        border: `2px solid ${hov ? 'rgba(255,130,50,0.9)' : 'rgba(255,102,0,0.5)'}`,
        boxShadow: hov
          ? '0 0 0 6px rgba(255,102,0,0.18), 0 8px 28px rgba(255,102,0,0.60)'
          : '0 0 0 4px rgba(255,102,0,0.10), 0 6px 20px rgba(255,102,0,0.42)',
        zIndex: 50,
        opacity: visible ? 1 : 0,
        transform: visible ? (hov ? 'scale(1.10)' : 'scale(1)') : 'scale(0.7)',
        pointerEvents: visible ? 'auto' : 'none',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        transition: 'opacity 0.25s ease, transform 0.25s ease, box-shadow 0.2s ease',
        outline: 'none',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <img src="/ai.png" alt="AI伴侣" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
    </div>
  )
}

// ─── 面板关闭按钮 (×) ──────────────────────────────────────────────────────────
function PanelCloseBtn({ onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title="关闭面板"
      style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hov ? 'rgba(255,102,0,0.15)' : 'var(--bg-card)',
        border: `1px solid ${hov ? 'var(--accent)' : 'var(--border-subtle)'}`,
        color: hov ? 'var(--accent)' : 'var(--text-secondary)',
        cursor: 'pointer', fontSize: 14, transition: 'all 0.2s ease',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      ×
    </button>
  )
}

// ─── 影视感占位（无视频时全屏显示） ───────────────────────────────────────────
function CinematicPlaceholder({ onUpload, uploading }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      style={{
        width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 60%, #181818 0%, #0a0a0a 70%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 24,
      }}
    >
      {/* 光晕层 */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 50% 55%, rgba(255,102,0,0.06) 0%, transparent 70%)',
      }} />

      {/* 胶片框线装饰 */}
      <div style={{
        position: 'absolute', inset: 20, borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.04)',
        pointerEvents: 'none',
      }} />

      {/* 大图标 */}
      <div style={{
        fontSize: 56, lineHeight: 1, filter: 'drop-shadow(0 0 20px rgba(255,102,0,0.25))',
        userSelect: 'none',
      }}>
        🎬
      </div>

      {/* 文案 */}
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          上传视频，开始陪伴
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          支持 MP4、MOV、WebM 等格式<br />AI 搭子将实时解读视频内容
        </p>
      </div>

      {/* 上传按钮 */}
      <button
        onClick={onUpload}
        disabled={uploading}
        style={{
          height: 44, padding: '0 32px', borderRadius: 22,
          background: hov && !uploading
            ? 'linear-gradient(135deg, #ff7722, #FF6600)'
            : 'linear-gradient(135deg, #FF6600, #cc4400)',
          border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
          cursor: uploading ? 'not-allowed' : 'pointer',
          boxShadow: hov && !uploading
            ? '0 6px 24px rgba(255,102,0,0.55)'
            : '0 4px 16px rgba(255,102,0,0.35)',
          opacity: uploading ? 0.7 : 1,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        {uploading ? '⏳ 上传中…' : '📁 选择视频文件'}
      </button>
    </div>
  )
}

// ─── 当前剧情焦点框 ────────────────────────────────────────────────────────────
function DramaFocusBox({ companion }) {
  const text = companion ? (DRAMA_FOCUS[companion.id] ?? '视频内容分析中，请上传视频后提问') : ''
  return (
    <div style={{
      borderRadius: 10,
      background: '#1e1e1e',
      border: '1px solid rgba(255,102,0,0.20)',
      padding: '10px 14px 10px 17px',
      display: 'flex', gap: 10, alignItems: 'flex-start',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* 渐变左竖条 */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: 'linear-gradient(180deg, #FF6600, #ff4400)',
        borderRadius: '10px 0 0 10px',
      }} />
      <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 700, flexShrink: 0, lineHeight: 1.6 }}>»</span>
      <div>
        <p style={{ fontSize: 12, color: '#FF6600', fontWeight: 600, margin: '0 0 4px', letterSpacing: '1px' }}>
          当前剧情焦点
        </p>
        <p style={{ fontSize: 14, color: '#e0e0f0', margin: 0, lineHeight: 1.6 }}>
          {text}
        </p>
      </div>
    </div>
  )
}

// ─── 三大功能按钮行 ────────────────────────────────────────────────────────────
function ActionButtonRow({ disabled, onCharMap, onEventMap, onSummary }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <ActionBigBtn onClick={onCharMap} disabled={disabled} emoji="👥" label="人物关系图" />
      <ActionBigBtn onClick={onEventMap} disabled={disabled} emoji="📅" label="事件图谱" />
      <ActionBigBtn onClick={onSummary} disabled={disabled} emoji="📄" label="全文总结" />
    </div>
  )
}

function ActionBigBtn({ onClick, disabled, emoji, label }) {
  const [hov, setHov] = useState(false)
  const [act, setAct] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, height: 36, borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        background: act
          ? 'linear-gradient(180deg, #252520, #1e1800)'
          : hov
            ? 'linear-gradient(180deg, #222220, #1a1600)'
            : 'linear-gradient(180deg, #1e1e1e, #161410)',
        border: `1px solid ${act || hov ? 'rgba(255,102,0,0.65)' : 'rgba(255,102,0,0.30)'}`,
        display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
        padding: '0 10px',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.18s ease',
        boxShadow: hov && !disabled ? '0 2px 12px rgba(255,102,0,0.12)' : 'none',
      }}
      onMouseEnter={() => { if (!disabled) setHov(true) }}
      onMouseLeave={() => { setHov(false); setAct(false) }}
      onMouseDown={() => { if (!disabled) setAct(true) }}
      onMouseUp={() => setAct(false)}
    >
      <span style={{ fontSize: 13, lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: 13, color: hov ? '#ff8833' : '#cc5500', fontWeight: 500, lineHeight: 1 }}>{label}</span>
    </button>
  )
}

// ─── 建议问题区 ────────────────────────────────────────────────────────────────
function SuggestedQuestions({ companion, onAsk }) {
  const questions = companion ? (SUGGESTED_QUESTIONS[companion.id] ?? []) : []
  if (!questions.length) return null
  return (
    <div style={{ padding: '10px 12px 12px' }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, margin: '0 0 8px', letterSpacing: '0.4px' }}>
        你可能想问
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {questions.map(q => (
          <QuestionChip key={q} label={q} onClick={() => onAsk(q)} />
        ))}
      </div>
    </div>
  )
}

function QuestionChip({ label, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px', borderRadius: 14, fontSize: 12,
        background: 'transparent',
        border: `1px solid ${hov ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}`,
        color: hov ? '#fff' : '#9999bb',
        cursor: 'pointer', transition: 'all 0.18s ease', whiteSpace: 'nowrap',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {label}
    </button>
  )
}

// ─── 顶部栏图标按钮 ────────────────────────────────────────────────────────────
function HeaderIconBtn({ children, onClick, title }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-full transition-all text-sm shrink-0"
      style={{
        width: 36,
        height: 36,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        color: hov ? 'var(--accent)' : 'var(--text-secondary)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  )
}

// ─── 功能胶囊 Chip ─────────────────────────────────────────────────────────────
function ActionChip({ children, onClick, disabled }) {
  const [hov, setHov]     = useState(false)
  const [active, setActive] = useState(false)

  // label 形如 "📄 全文总结"，emoji 和文字之间有空格
  const text = String(children ?? '')
  const spaceIdx = text.indexOf(' ')
  const emoji = spaceIdx > -1 ? text.slice(0, spaceIdx) : ''
  const label = spaceIdx > -1 ? text.slice(spaceIdx + 1) : text

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center shrink-0 disabled:opacity-40 transition-all"
      style={{
        height: 36,
        padding: '0 14px',
        borderRadius: 18,
        gap: 6,
        background: active
          ? 'linear-gradient(135deg, rgba(255,102,0,0.15), rgba(255,68,0,0.10))'
          : hov
            ? 'var(--bg-hover)'
            : 'var(--chip-bg)',
        border: `1px solid ${hov || active ? 'var(--accent)' : 'var(--chip-border)'}`,
        color: hov || active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: 13,
        fontWeight: 500,
        boxShadow: hov ? '0 0 8px var(--accent-glow)' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={() => { if (!disabled) setHov(true) }}
      onMouseLeave={() => { setHov(false); setActive(false) }}
      onMouseDown={() => { if (!disabled) setActive(true) }}
      onMouseUp={() => setActive(false)}
    >
      {emoji && <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>}
      {label}
    </button>
  )
}

// ─── 底部输入栏 ────────────────────────────────────────────────────────────────
function InputBar({ value, onChange, onSend, onKeyDown, disabled, hasContent, placeholder }) {
  const [focused,   setFocused]   = useState(false)
  const [micHov,    setMicHov]    = useState(false)
  const [recording, setRecording] = useState(false)
  const [sendHov,   setSendHov]   = useState(false)

  const sendActive = hasContent && !disabled

  return (
    <div
      className="shrink-0 flex items-center gap-2"
      style={{
        padding: '12px 16px',
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      {/* 输入框包裹层（麦克风内嵌） */}
      <div className="relative flex-1 min-w-0">
        {/* 麦克风（左内嵌） */}
        <button
          type="button"
          title="语音输入"
          className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center transition-all"
          style={{
            width: 16,
            height: 16,
            color: recording ? '#FF4444' : micHov ? 'var(--accent)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            zIndex: 1,
          }}
          onClick={() => setRecording(r => !r)}
          onMouseEnter={() => setMicHov(true)}
          onMouseLeave={() => setMicHov(false)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            width="16"
            height="16"
            className={recording ? 'animate-pulse' : ''}
          >
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21h2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z"/>
          </svg>
        </button>

        {/* 文本输入框 */}
        <input
          type="text"
          placeholder={placeholder}
          className="w-full outline-none disabled:opacity-50 transition-all"
          style={{
            background: 'var(--bg-input)',
            border: `1px solid ${focused ? 'var(--accent)' : 'var(--border-subtle)'}`,
            borderRadius: 24,
            padding: '10px 16px 10px 40px',
            fontSize: 14,
            color: 'var(--text-primary)',
            caretColor: 'var(--accent)',
            boxShadow: focused ? '0 0 0 2px var(--accent-glow)' : 'none',
            transition: 'all 0.2s ease',
          }}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
        />
      </div>

      {/* 发送按钮 */}
      <button
        type="button"
        onClick={onSend}
        disabled={!sendActive}
        title="发送"
        className="shrink-0 flex items-center justify-center transition-all"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          cursor: sendActive ? 'pointer' : 'not-allowed',
          background: sendActive ? 'var(--accent)' : 'var(--border-subtle)',
          color: sendActive ? '#fff' : 'var(--text-muted)',
          boxShadow: sendActive ? '0 4px 12px rgba(255,102,0,0.4)' : 'none',
          transform: sendHov && sendActive ? 'scale(1.05)' : 'scale(1)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={() => setSendHov(true)}
        onMouseLeave={() => setSendHov(false)}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  )
}
