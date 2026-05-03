import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import CharacterMap from './CharacterMap'
import EventMap from './EventMap'

const MAP_TYPES = ['storymap', 'charactermap', 'eventmap']

export default function ChatBubble({ role, content, type, data, companionEmoji, companionImage, onSave, onFeedback }) {
  const [toast, setToast]     = useState(null)
  const [menu, setMenu]       = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const longPressTimer        = useRef(null)

  const isUser = role === 'user'
  const isMap  = MAP_TYPES.includes(type)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1500) }

  const handleSave     = () => { onSave?.();     showToast('已收藏') }
  const handleFeedback = () => { onFeedback?.(); showToast('已反馈') }
  const handleCopy     = () => { navigator.clipboard.writeText(content ?? ''); setMenu(false); showToast('已复制') }

  const startLongPress = (x, y) => {
    longPressTimer.current = setTimeout(() => { setMenuPos({ x, y }); setMenu(true) }, 500)
  }
  const cancelLongPress = () => clearTimeout(longPressTimer.current)

  return (
    <div
      className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'} ${isMap ? 'w-full' : ''}`}
    >
      {/* 长按上下文菜单 */}
      {menu && (
        <div className="fixed inset-0 z-40" onClick={() => setMenu(false)}>
          <ul
            className="absolute py-1 min-w-32 text-sm overflow-hidden rounded-xl shadow-2xl"
            style={{
              left: menuPos.x,
              top: menuPos.y,
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-subtle)',
              zIndex: 50,
            }}
            onClick={e => e.stopPropagation()}
          >
            {[
              { label: '转发',    action: () => setMenu(false) },
              { label: '复制',    action: handleCopy },
              { label: '⭐ 收藏', action: () => { handleSave();     setMenu(false) } },
              { label: '📢 反馈', action: () => { handleFeedback(); setMenu(false) } },
            ].map(({ label, action }) => (
              <li key={label}>
                <ContextItem label={label} onClick={action} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 气泡主体 */}
      <div className={`relative ${isMap ? 'w-full' : isUser ? 'max-w-[80%]' : 'max-w-[90%]'}`}>
        {isUser ? (
          /* ── 用户气泡 ── */
          <div
            className="select-none cursor-default"
            style={{
              background: 'linear-gradient(135deg, #2a1800, #1e1200)',
              border: '1px solid rgba(255,102,0,0.35)',
              borderRadius: '16px 4px 16px 16px',
              padding: '12px 16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
            onMouseDown={e => startLongPress(e.clientX, e.clientY)}
            onMouseUp={cancelLongPress}
            onMouseLeave={cancelLongPress}
            onTouchStart={e => startLongPress(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={cancelLongPress}
          >
            <p style={{ fontSize: 14, fontWeight: 500, color: '#e8c89a', lineHeight: 1.7, margin: 0 }}>
              {content}
            </p>
          </div>
        ) : (
          /* ── AI 气泡 ── */
          <div
            className="select-none cursor-default"
            style={{
              background: '#1e1e1e',
              border: '1px solid #2a2a2a',
              borderRadius: '4px 16px 16px 16px',
              padding: '14px 16px',
            }}
            onMouseDown={e => startLongPress(e.clientX, e.clientY)}
            onMouseUp={cancelLongPress}
            onMouseLeave={cancelLongPress}
            onTouchStart={e => startLongPress(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={cancelLongPress}
          >

            {/* 搭子图标（PNG 优先） */}
            {(companionImage || companionEmoji) && (
              <div style={{ marginBottom: 8 }}>
                <CompanionIcon image={companionImage} emoji={companionEmoji} />
              </div>
            )}

            {/* 内容区 */}
            {(type === 'charactermap' || type === 'storymap') && (
              data
                ? <CharacterMap data={data} />
                : <MapPlaceholder label="人物关系图生成中…" />
            )}

            {type === 'eventmap' && (
              data
                ? <EventMap data={data} />
                : <MapPlaceholder label="事件图谱生成中…" />
            )}

            {!isMap && (
              <div className="markdown-body" style={{ fontSize: 14, lineHeight: 1.7, color: '#e8e8e8', wordBreak: 'break-word' }}>
                <ReactMarkdown
                  components={{
                    p:      ({ children }) => <p style={{ margin: '0 0 8px' }}>{children}</p>,
                    h2:     ({ children }) => <p style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0', margin: '12px 0 4px' }}>{children}</p>,
                    h3:     ({ children }) => <p style={{ fontSize: 13, fontWeight: 600, color: '#ddd', margin: '10px 0 4px' }}>{children}</p>,
                    strong: ({ children }) => <strong style={{ color: '#fff', fontWeight: 600 }}>{children}</strong>,
                    ul:     ({ children }) => <ul style={{ paddingLeft: 16, margin: '4px 0' }}>{children}</ul>,
                    ol:     ({ children }) => <ol style={{ paddingLeft: 16, margin: '4px 0' }}>{children}</ol>,
                    li:     ({ children }) => <li style={{ margin: '2px 0' }}>{children}</li>,
                    code:   ({ children }) => <code style={{ background: '#2a2a2a', padding: '1px 5px', borderRadius: 4, fontSize: 12, color: '#FF6600' }}>{children}</code>,
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}

            {/* 底部操作区 */}
            <div
              className="flex items-center justify-end gap-2 mt-2.5"
              style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}
            >
              {toast && (
                <span className="mr-auto text-xs" style={{ color: 'var(--accent)' }}>{toast}</span>
              )}
              <ActionIcon onClick={handleSave}    title="收藏">⭐</ActionIcon>
              <ActionIcon onClick={handleFeedback} title="反馈">📢</ActionIcon>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ActionIcon({ children, onClick, title }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      className="transition-colors"
      style={{ fontSize: 12, color: hov ? 'var(--accent)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  )
}

function ContextItem({ label, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      className="w-full text-left px-4 py-2 text-sm transition-colors"
      style={{ background: hov ? 'var(--bg-card)' : 'transparent', color: 'var(--text-primary)', border: 'none', cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {label}
    </button>
  )
}

function CompanionIcon({ image, emoji }) {
  const [failed, setFailed] = useState(false)
  if (image && !failed) {
    return (
      <img
        src={image}
        alt=""
        onError={() => setFailed(true)}
        style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 6 }}
      />
    )
  }
  return <span style={{ fontSize: 16, lineHeight: 1 }}>{emoji}</span>
}

function MapPlaceholder({ label }) {
  return (
    <div
      className="w-full flex items-center justify-center animate-pulse"
      style={{ height: 400, borderRadius: 12, background: 'var(--bg-hover)' }}
    >
      <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}
