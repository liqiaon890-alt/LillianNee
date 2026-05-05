import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { semanticSearch } from '../utils/semanticSearch'

// ─── 常量 ──────────────────────────────────────────────────────────────────────
const TYPE_MAP = { '问答': 'qa', '总结': 'summary', '图谱': 'storymap' }

// ─── 工具函数 ──────────────────────────────────────────────────────────────────
function timeStr(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function applySearch(query, items) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return items
  return items.filter(item => {
    const text = [item.question, item.answer, item.sourceVideo,
      ...(item.data?.characters?.map(c => c.name) ?? []),
      ...(item.data?.events?.map(e => e.title) ?? []),
    ].filter(Boolean).join(' ').toLowerCase()
    return terms.every(t => text.includes(t))
  })
}

function newId() {
  return Math.random().toString(36).slice(2, 10)
}

function MenuBtn({ children, onClick, color }) {
  return (
    <button
      className="w-full text-left"
      style={{ padding: '8px 12px', fontSize: 12, color: color ?? 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >{children}</button>
  )
}

// ─── 卡片菜单 ──────────────────────────────────────────────────────────────────
function CardMenu({ x, y, folders, onCopy, onDelete, onMove, onClose }) {
  const [showFolders, setShowFolders] = useState(false)
  const canClose = useRef(false)
  useEffect(() => {
    const t = setTimeout(() => { canClose.current = true }, 300)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="fixed inset-0 z-50" onPointerDown={() => canClose.current && onClose()}>
      <ul
        className="absolute py-1 overflow-hidden"
        style={{
          left: x, top: y, minWidth: 144,
          background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', listStyle: 'none', margin: 0, padding: '4px 0',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {showFolders ? (
          <>
            <li><MenuBtn color="var(--text-muted)" onClick={() => setShowFolders(false)}>← 返回</MenuBtn></li>
            {folders.map(f => (
              <li key={f.id}><MenuBtn onClick={() => { onMove(f.id); onClose() }}>📁 {f.name}</MenuBtn></li>
            ))}
            <li><MenuBtn color="var(--text-muted)" onClick={() => { onMove(null); onClose() }}>⊘ 移出文件夹</MenuBtn></li>
          </>
        ) : (
          <>
            <li><MenuBtn onClick={() => { onCopy(); onClose() }}>复制内容</MenuBtn></li>
            <li>
              <button
                className="w-full text-left flex items-center justify-between"
                style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowFolders(true)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span>移入文件夹</span><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>→</span>
              </button>
            </li>
            <li><MenuBtn color="#f87171" onClick={() => { onDelete(); onClose() }}>删除</MenuBtn></li>
          </>
        )}
      </ul>
    </div>
  )
}

// ─── 文件夹标签菜单 ────────────────────────────────────────────────────────────
function FolderTagMenu({ x, y, folder, onRename, onDelete, onClose }) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(folder.name)
  return (
    <div className="fixed inset-0 z-50" onClick={() => onClose()}>
      <ul className="absolute bg-gray-700 rounded-lg shadow-xl py-1 min-w-36 text-sm overflow-hidden"
        style={{ left: x, top: y }} onClick={e => e.stopPropagation()}>
        {renaming ? (
          <li className="px-3 py-2 flex gap-2">
            <input
              autoFocus
              className="flex-1 min-w-0 bg-gray-600 rounded px-2 py-1 text-sm outline-none text-white"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim()) { onRename(name.trim()); onClose() }
                if (e.key === 'Escape') onClose()
              }}
            />
            <button className="text-blue-400 text-xs"
              onClick={() => { if (name.trim()) { onRename(name.trim()); onClose() } }}>
              确定
            </button>
          </li>
        ) : (
          <>
            <li><button className="w-full text-left px-4 py-2 hover:bg-gray-600 text-gray-100"
              onClick={() => setRenaming(true)}>重命名</button></li>
            <li><button className="w-full text-left px-4 py-2 hover:bg-gray-600 text-red-400"
              onClick={() => { onDelete(); onClose() }}>删除文件夹</button></li>
          </>
        )}
      </ul>
    </div>
  )
}

// ─── AI 整理确认弹窗 ───────────────────────────────────────────────────────────
function AiOrganizeModal({ result, favorites, onAcceptAll, onStepwise, onClose }) {
  const { folders, assignments } = result
  const grouped = {}
  folders.forEach(name => { grouped[name] = [] })
  Object.entries(assignments).forEach(([idx, fname]) => {
    const fav = favorites[Number(idx)]
    if (fav && grouped[fname] !== undefined) grouped[fname].push(fav)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
      <div
        className="w-80 flex flex-col"
        style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-modal)', maxHeight: '70vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>AI 整理建议</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, marginBottom: 0 }}>共 {folders.length} 个文件夹，{Object.keys(assignments).length} 条归类</p>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {folders.map(name => (
            <div key={name} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, border: '1px solid var(--border-subtle)' }}>
              <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>📁 {name}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0 }}>{grouped[name]?.length ?? 0} 条收藏</p>
              {grouped[name]?.slice(0, 2).map((f, i) => (
                <p key={i} style={{ color: 'var(--text-muted)', fontSize: 12, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  · {f.question || f.sourceVideo || '图谱'}
                </p>
              ))}
            </div>
          ))}
        </div>
        <div className="flex gap-2 shrink-0" style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            style={{ flex: 1, padding: '8px 0', fontSize: 13, background: 'var(--accent)', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
            onClick={onAcceptAll}
            onMouseEnter={e => e.target.style.background = 'var(--accent-hover)'}
            onMouseLeave={e => e.target.style.background = 'var(--accent)'}
          >全部接受</button>
          <button
            style={{ flex: 1, padding: '8px 0', fontSize: 13, background: 'var(--bg-hover)', color: 'var(--text-primary)', borderRadius: 8, border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.2s' }}
            onClick={onStepwise}
            onMouseEnter={e => e.currentTarget.style.background = '#252525'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          >逐条确认</button>
          <button
            style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={onClose}
            onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
          >取消</button>
        </div>
      </div>
    </div>
  )
}

// ─── 逐条确认弹窗 ──────────────────────────────────────────────────────────────
function StepwiseModal({ favorites, assignments, folderNames, onFinish, onClose }) {
  const entries = Object.entries(assignments)
  const [step, setStep] = useState(0)
  const [edits, setEdits] = useState({ ...assignments })

  if (!entries.length) { onFinish({}); return null }
  const [idx, suggestedFolder] = entries[step]
  const fav = favorites[Number(idx)]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div
        className="w-80 flex flex-col"
        style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-modal)' }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>逐条确认 {step + 1} / {entries.length}</p>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, border: '1px solid var(--border-subtle)' }}>
            <p style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, margin: 0 }}>{fav?.question || fav?.sourceVideo || '图谱'}</p>
            {fav?.answer && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {fav.answer}
              </p>
            )}
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6 }}>归入文件夹</p>
            <select
              className="w-full outline-none"
              style={{
                background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)',
                borderRadius: 8, padding: '8px 12px', fontSize: 13,
              }}
              value={edits[idx] ?? suggestedFolder}
              onChange={e => setEdits(prev => ({ ...prev, [idx]: e.target.value }))}
            >
              {folderNames.map(name => <option key={name} value={name}>{name}</option>)}
              <option value="">不归类</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 shrink-0" style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
          {step < entries.length - 1 ? (
            <button
              style={{ flex: 1, padding: '8px 0', fontSize: 13, background: 'var(--accent)', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer' }}
              onClick={() => setStep(s => s + 1)}
            >确认，下一条 →</button>
          ) : (
            <button
              style={{ flex: 1, padding: '8px 0', fontSize: 13, background: '#166534', color: '#86efac', borderRadius: 8, border: 'none', cursor: 'pointer' }}
              onClick={() => onFinish(edits)}
            >完成</button>
          )}
          <button
            style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={onClose}
            onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
          >取消</button>
        </div>
      </div>
    </div>
  )
}

// ─── 收藏卡片（内联 dropdown 菜单，不依赖外部状态） ──────────────────────────
function FavoriteCard({ item, folders, onSource, onCopy, onDelete, onMove }) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ right: 0, bottom: 0 })
  const [showFolders, setShowFolders] = useState(false)
  const menuBtnRef = useRef(null)
  const dropRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) { setShowFolders(false); return }
    const handler = (e) => {
      if (!(menuBtnRef.current?.contains(e.target)) && !(dropRef.current?.contains(e.target)))
        setMenuOpen(false)
    }
    const t = setTimeout(() => document.addEventListener('pointerdown', handler), 10)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', handler) }
  }, [menuOpen])

  const handleMenuClick = (e) => {
    e.stopPropagation()
    if (!menuOpen) {
      const rect = menuBtnRef.current?.getBoundingClientRect()
      if (rect) setMenuPos({ right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.top + 4 })
    }
    setMenuOpen(m => !m)
  }

  const icon = item.type === 'qa' ? '💬' : item.type === 'summary' ? '📄' : '🗺️'
  const charCount = item.data?.characters?.length ?? 0
  const eventCount = item.data?.events?.length ?? 0
  const folder = folders.find(f => f.id === item.folderId)

  return (
    <div
      className="cursor-pointer select-none"
      style={{
        background: 'linear-gradient(135deg, #1e1e1e, #181818)',
        borderRadius: 12, padding: 12, marginBottom: 8,
        borderTop: '1px solid var(--border-subtle)',
        borderRight: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        borderLeft: '2px solid transparent',
        transition: 'border-left-color 0.18s, background 0.15s',
      }}
      onClick={() => setExpanded(e => !e)}
      onMouseEnter={e => { e.currentTarget.style.borderLeftColor = '#FF6600'; e.currentTarget.style.background = 'linear-gradient(135deg, #222222, #1c1c1c)' }}
      onMouseLeave={e => { e.currentTarget.style.borderLeftColor = 'transparent'; e.currentTarget.style.background = 'linear-gradient(135deg, #1e1e1e, #181818)' }}
    >
      {/* 搭子来源标签 */}
      {item.companionEmoji && item.companionName && (
        <div className="flex items-center gap-1" style={{ marginBottom: 6 }}>
          <span style={{
            fontSize: 10, background: 'var(--bg-card)', color: 'var(--text-secondary)',
            borderRadius: 9999, padding: '2px 8px', lineHeight: 1,
          }}>
            {item.companionEmoji} {item.companionName}
          </span>
        </div>
      )}
      <div className="flex items-start gap-2">
        <span className="shrink-0" style={{ fontSize: 15, marginTop: 2 }}>{icon}</span>
        <div className="flex-1 min-w-0">
          {item.type === 'qa' && (
            <p style={{
              color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, lineHeight: 1.4,
              marginBottom: 4, overflow: expanded ? 'visible' : 'hidden',
              display: expanded ? 'block' : '-webkit-box',
              WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
            }}>
              {item.question}
            </p>
          )}
          {item.type !== 'qa' && (
            <p style={{
              color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, lineHeight: 1.4,
              marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{item.sourceVideo}</p>
          )}

          {(item.type === 'qa' || item.type === 'summary') && item.answer && (
            <p style={{
              color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6, marginBottom: 6,
              overflow: expanded ? 'visible' : 'hidden',
              display: expanded ? 'block' : '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              whiteSpace: expanded ? 'pre-wrap' : 'normal',
            }}>
              {item.answer}
            </p>
          )}

          {item.type === 'storymap' && (
            <div style={{ fontSize: 12, marginBottom: 6 }}>
              <p style={{ color: 'var(--text-secondary)' }}>角色 {charCount} 个 · 事件 {eventCount} 个</p>
              {expanded && item.data && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {item.data.characters?.length > 0 && (
                    <div>
                      <span style={{ color: '#60a5fa', fontWeight: 600 }}>👤 角色</span>
                      <div className="flex flex-wrap" style={{ gap: 4, marginTop: 4 }}>
                        {item.data.characters.map((c, i) => (
                          <span key={i} style={{
                            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                            color: '#93c5fd', padding: '2px 8px', borderRadius: 8, fontSize: 11,
                          }}>{c.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.data.relationships?.length > 0 && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>🔗 关系</span>
                      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {item.data.relationships.map((r, i) => (
                          <p key={i} style={{ color: 'var(--text-secondary)', margin: 0 }}>{r.source} → {r.target}：{r.type}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.data.events?.length > 0 && (
                    <div>
                      <span style={{ color: '#fb923c', fontWeight: 600 }}>📌 事件</span>
                      <div className="flex flex-wrap" style={{ gap: 4, marginTop: 4 }}>
                        {item.data.events.map((e, i) => (
                          <span key={i} style={{
                            background: 'rgba(255,102,0,0.12)', border: '1px solid rgba(255,102,0,0.25)',
                            color: '#fb923c', padding: '2px 8px', borderRadius: 8, fontSize: 11,
                          }}>{e.title}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <span>{timeStr(item.savedAt)}</span>
              {folder && <span style={{ color: '#60a5fa' }}>· 📁 {folder.name}</span>}
              {item.type === 'qa' && item.sourceVideo && !folder && (
                <span className="truncate">· {item.sourceVideo}</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{expanded ? '▲' : '▼'}</span>
              <button
                style={{ fontSize: 14, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                onClick={e => { e.stopPropagation(); onSource(item) }}
                onMouseEnter={e => e.target.style.color = '#60a5fa'}
                onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                title="溯源">📺</button>
              {/* 内联菜单（portal 避免 overflow 裁剪） */}
              <button
                ref={menuBtnRef}
                className="px-1 leading-none transition-colors"
                style={{ fontSize: 14, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={handleMenuClick}
                onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                title="更多操作"
              >⋮</button>
              {menuOpen && createPortal(
                <div
                  ref={dropRef}
                  className="fixed py-1 z-[9999]"
                  style={{
                    right: menuPos.right, bottom: menuPos.bottom, minWidth: 128,
                    background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)',
                    borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {showFolders ? (
                    <>
                      <MenuBtn color="var(--text-muted)" onClick={() => setShowFolders(false)}>← 返回</MenuBtn>
                      {folders.map(f => (
                        <MenuBtn key={f.id} onClick={() => { onMove(f.id); setMenuOpen(false) }}>📁 {f.name}</MenuBtn>
                      ))}
                      <MenuBtn color="var(--text-muted)" onClick={() => { onMove(null); setMenuOpen(false) }}>⊘ 移出文件夹</MenuBtn>
                    </>
                  ) : (
                    <>
                      <MenuBtn onClick={() => { onCopy(); setMenuOpen(false) }}>复制内容</MenuBtn>
                      <button
                        className="w-full text-left flex justify-between items-center"
                        style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => setShowFolders(true)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <span>移入文件夹</span><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>→</span>
                      </button>
                      <MenuBtn color="#f87171" onClick={() => { onDelete(); setMenuOpen(false) }}>删除</MenuBtn>
                    </>
                  )}
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 文件夹标签（点击选择，⋯ 按钮打开重命名/删除菜单） ─────────────────────
function FolderTag({ folder, active, onClick, onRename, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(folder.name)
  const moreBtnRef = useRef(null)
  const dropRef = useRef(null)

  useEffect(() => { setName(folder.name) }, [folder.name])

  useEffect(() => {
    if (!menuOpen) { setRenaming(false); return }
    const handler = (e) => {
      if (!moreBtnRef.current?.contains(e.target) && !dropRef.current?.contains(e.target))
        setMenuOpen(false)
    }
    const t = setTimeout(() => document.addEventListener('pointerdown', handler), 10)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', handler) }
  }, [menuOpen])

  const handleMoreClick = (e) => {
    e.stopPropagation()
    if (menuOpen) { setMenuOpen(false); return }
    const rect = moreBtnRef.current?.getBoundingClientRect()
    if (rect) {
      const x = Math.min(rect.left, window.innerWidth - 148)
      setMenuPos({ x, y: rect.bottom + 4 })
    }
    setMenuOpen(true)
  }

  return (
    <>
      <div className="flex items-center shrink-0" style={{ borderRadius: 9999, overflow: 'hidden' }}>
        <button
          style={{
            padding: '4px 6px 4px 12px', fontSize: 12, border: 'none', cursor: 'pointer',
            background: active ? 'rgba(124,58,237,0.35)' : 'var(--chip-bg)',
            color: active ? '#c084fc' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}
          onClick={onClick}
        >
          📁 {folder.name}
        </button>
        <button
          ref={moreBtnRef}
          style={{
            padding: '4px 8px 4px 2px', fontSize: 12, border: 'none', cursor: 'pointer',
            background: active ? 'rgba(124,58,237,0.35)' : 'var(--chip-bg)',
            color: active ? 'rgba(192,132,252,0.7)' : 'var(--text-muted)',
            transition: 'all 0.2s', lineHeight: 1,
          }}
          onClick={handleMoreClick}
          title="重命名或删除"
        >⋯</button>
      </div>
      {menuOpen && createPortal(
        <div
          ref={dropRef}
          className="fixed py-1 z-[9999]"
          style={{
            left: menuPos.x, top: menuPos.y, minWidth: 128,
            background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)',
            borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {renaming ? (
            <div className="flex gap-2" style={{ padding: '8px 12px' }}>
              <input
                autoFocus
                className="flex-1 min-w-0 outline-none"
                style={{
                  background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
                  borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--text-primary)',
                }}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && name.trim()) { onRename(name.trim()); setMenuOpen(false) }
                  if (e.key === 'Escape') setMenuOpen(false)
                }}
              />
              <button
                style={{ color: 'var(--accent)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => { if (name.trim()) { onRename(name.trim()); setMenuOpen(false) } }}
              >确定</button>
            </div>
          ) : (
            <>
              <button
                className="w-full text-left"
                style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setRenaming(true)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >重命名</button>
              <button
                className="w-full text-left"
                style={{ padding: '8px 12px', fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => { onDelete(); setMenuOpen(false) }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >删除文件夹</button>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

// ─── 主组件 ────────────────────────────────────────────────────────────────────
export default function Favorites({ isOpen, onClose }) {
  const [favorites, setFavorites] = useState([])
  const [folders, setFolders] = useState([])
  const [typeFilter, setTypeFilter] = useState('全部')
  const [activeFolder, setActiveFolder] = useState(null)
  const [activeCompanion, setActiveCompanion] = useState(null)
  const [query, setQuery] = useState('')
  const [semanticResults, setSemanticResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [toast, setToast] = useState(null)
  const [cardMenu, setCardMenu] = useState(null)   // { index, x, y }
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [aiState, setAiState] = useState(null) // null | 'loading' | 'confirm' | 'stepwise'
  const [aiResult, setAiResult] = useState(null)
  const newFolderRef = useRef(null)

  const loadData = () => {
    setFavorites(JSON.parse(localStorage.getItem('favorites') ?? '[]'))
    setFolders(JSON.parse(localStorage.getItem('folders') ?? '[]'))
  }

  useEffect(() => {
    if (isOpen) {
      loadData()
      setQuery('')
      setTypeFilter('全部')
      setActiveFolder(null)
      setActiveCompanion(null)
      setSemanticResults(null)
      setAiState(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (showNewFolder) setTimeout(() => newFolderRef.current?.focus(), 50)
  }, [showNewFolder])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000) }

  // ── 文件夹操作 ──────────────────────────────────────────────────────────────
  const saveFolders = (updated) => {
    setFolders(updated)
    localStorage.setItem('folders', JSON.stringify(updated))
  }

  const createFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    const updated = [...folders, { id: newId(), name }]
    saveFolders(updated)
    setNewFolderName('')
    setShowNewFolder(false)
    showToast(`文件夹「${name}」已创建`)
  }

  const renameFolder = (folder, newName) => {
    saveFolders(folders.map(f => f.id === folder.id ? { ...f, name: newName } : f))
    showToast('重命名成功')
  }

  const deleteFolder = (folder) => {
    // 解除所有归属，不删除收藏
    const updatedFavs = favorites.map(f => f.folderId === folder.id ? { ...f, folderId: null } : f)
    localStorage.setItem('favorites', JSON.stringify(updatedFavs))
    setFavorites(updatedFavs)
    saveFolders(folders.filter(f => f.id !== folder.id))
    if (activeFolder === folder.id) setActiveFolder(null)
    showToast(`文件夹「${folder.name}」已删除`)
  }

  // ── 收藏操作 ────────────────────────────────────────────────────────────────
  const saveFavorites = (updated) => {
    setFavorites(updated)
    localStorage.setItem('favorites', JSON.stringify(updated))
  }

  const moveToFolder = (listIndex, folderId) => {
    const item = filtered[listIndex]
    const realIdx = favorites.indexOf(item)
    const updated = favorites.map((f, i) => i === realIdx ? { ...f, folderId } : f)
    saveFavorites(updated)
    const folderName = folders.find(f => f.id === folderId)?.name
    showToast(folderId ? `已移入「${folderName}」` : '已移出文件夹')
  }

  const handleDelete = (listIndex) => {
    const item = filtered[listIndex]
    const updated = favorites.filter(f => f !== item)
    saveFavorites(updated)
    setSemanticResults(null)
  }

  const handleCopy = (listIndex) => {
    const item = filtered[listIndex]
    navigator.clipboard.writeText(item.answer || item.question || '')
    showToast('已复制')
  }

  // ── 过滤逻辑 ────────────────────────────────────────────────────────────────
  const handleSemanticSearch = async () => {
    if (!query.trim() || searching || !favorites.length) return
    setSearching(true)
    try {
      const ranked = await semanticSearch(query.trim(), favorites)
      setSemanticResults(ranked)
    } catch (e) {
      showToast('语义搜索失败：' + e.message)
    } finally {
      setSearching(false)
    }
  }

  // 从收藏记录里提取用过的搭子（去重）
  const usedCompanions = Array.from(
    new Map(
      favorites
        .filter(f => f.companionId)
        .map(f => [f.companionId, { id: f.companionId, name: f.companionName, emoji: f.companionEmoji }])
    ).values()
  )

  const baseList = semanticResults ?? applySearch(query, favorites)
  const filtered = baseList
    .filter(item => typeFilter === '全部' ? true : item.type === TYPE_MAP[typeFilter])
    .filter(item => activeFolder ? item.folderId === activeFolder : true)
    .filter(item => activeCompanion ? item.companionId === activeCompanion : true)

  // ── AI 整理 ─────────────────────────────────────────────────────────────────
  const handleAiOrganize = async () => {
    if (!favorites.length || aiState === 'loading') return
    setAiState('loading')
    try {
      const res = await fetch('/api/gemini/ai-organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites }),
      })
      if (!res.ok) throw new Error(`请求失败 (${res.status})`)
      const data = await res.json()
      setAiResult(data)
      setAiState('confirm')
    } catch (e) {
      showToast('AI 整理失败：' + e.message)
      setAiState(null)
    }
  }

  const applyAssignments = (assignments, folderNames) => {
    // 创建尚不存在的文件夹
    const existingNames = new Set(folders.map(f => f.name))
    const newFolders = [...folders]
    const nameToId = Object.fromEntries(folders.map(f => [f.name, f.id]))
    folderNames.forEach(name => {
      if (!existingNames.has(name)) {
        const id = newId()
        newFolders.push({ id, name })
        nameToId[name] = id
      }
    })
    saveFolders(newFolders)

    // 归类
    const updatedFavs = [...favorites]
    Object.entries(assignments).forEach(([idx, folderName]) => {
      const i = Number(idx)
      if (updatedFavs[i] && folderName) {
        updatedFavs[i] = { ...updatedFavs[i], folderId: nameToId[folderName] }
      }
    })
    saveFavorites(updatedFavs)
    showToast('整理完成 ✓')
    setAiState(null)
    setAiResult(null)
  }

  // ─── 渲染 ────────────────────────────────────────────────────────────────────
  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ background: 'var(--bg-panel)' }}
    >

      {/* 弹窗层 */}
      {cardMenu && (
        <CardMenu
          x={cardMenu.x} y={cardMenu.y}
          folders={folders}
          onCopy={() => { handleCopy(cardMenu.index); setCardMenu(null) }}
          onDelete={() => { handleDelete(cardMenu.index); setCardMenu(null) }}
          onMove={(folderId) => moveToFolder(cardMenu.index, folderId)}
          onClose={() => setCardMenu(null)}
        />
      )}

      {aiState === 'confirm' && aiResult && (
        <AiOrganizeModal
          result={aiResult}
          favorites={favorites}
          onAcceptAll={() => applyAssignments(aiResult.assignments, aiResult.folders)}
          onStepwise={() => setAiState('stepwise')}
          onClose={() => { setAiState(null); setAiResult(null) }}
        />
      )}
      {aiState === 'stepwise' && aiResult && (
        <StepwiseModal
          favorites={favorites}
          assignments={aiResult.assignments}
          folderNames={aiResult.folders}
          onFinish={(edits) => applyAssignments(edits, aiResult.folders)}
          onClose={() => { setAiState(null); setAiResult(null) }}
        />
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <button
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, transition: 'color 0.2s' }}
            onClick={onClose}
            onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
          >← 返回</button>
          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>收藏夹</span>
        </div>
        <button
          className="flex items-center gap-1 disabled:opacity-40"
          style={{
            padding: '6px 12px', fontSize: 12, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'rgba(124,58,237,0.25)', color: '#c084fc', transition: 'background 0.2s',
          }}
          onClick={handleAiOrganize}
          disabled={!favorites.length || aiState === 'loading'}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.40)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,58,237,0.25)'}
        >
          {aiState === 'loading' ? <><span className="animate-spin inline-block">⏳</span> 整理中…</> : '✨ AI 整理'}
        </button>
      </div>

      {/* Search */}
      <div
        className="flex gap-2 shrink-0"
        style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <input
          type="text"
          placeholder="关键词过滤 / 语义搜索…"
          className="flex-1 min-w-0 outline-none"
          style={{
            background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
            borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
          }}
          value={query}
          onChange={e => { setQuery(e.target.value); setSemanticResults(null) }}
          onKeyDown={e => e.key === 'Enter' && handleSemanticSearch()}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
        />
        <button
          className="shrink-0 disabled:opacity-40"
          style={{
            padding: '8px 12px', fontSize: 13,
            background: 'linear-gradient(135deg, #2a1800, #1a1000)',
            color: '#FF6600',
            border: '1px solid rgba(255,102,0,0.45)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
          }}
          onClick={handleSemanticSearch}
          disabled={!query.trim() || searching || !favorites.length}
          onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.borderColor = 'rgba(255,102,0,0.8)' }}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,102,0,0.45)')}
        >
          {searching ? '搜索中…' : '语义搜索'}
        </button>
      </div>

      {/* 类型筛选 */}
      <div
        className="flex gap-2 shrink-0 overflow-x-auto"
        style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }}
      >
        {['全部', '问答', '总结', '图谱'].map(f => (
          <button key={f}
            onClick={() => setTypeFilter(f)}
            className="shrink-0"
            style={{
              padding: '4px 12px', borderRadius: 9999, fontSize: 12, cursor: 'pointer',
              background: typeFilter === f ? 'rgba(255,102,0,0.12)' : 'var(--chip-bg)',
              border: `1px solid ${typeFilter === f ? 'rgba(255,102,0,0.55)' : 'var(--chip-border)'}`,
              color: typeFilter === f ? '#FF6600' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
          >{f}</button>
        ))}
      </div>

      {/* 搭子筛选 */}
      {usedCompanions.length > 0 && (
        <div
          className="flex items-center gap-2 shrink-0 overflow-x-auto"
          style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span className="shrink-0" style={{ fontSize: 12, color: 'var(--text-muted)' }}>🤖</span>
          <button
            onClick={() => setActiveCompanion(null)}
            className="shrink-0"
            style={{
              padding: '4px 12px', borderRadius: 9999, fontSize: 12, border: 'none', cursor: 'pointer',
              background: !activeCompanion ? '#166534' : 'var(--chip-bg)',
              color: !activeCompanion ? '#86efac' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
          >全部</button>
          {usedCompanions.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCompanion(activeCompanion === c.id ? null : c.id)}
              className="shrink-0"
              style={{
                padding: '4px 12px', borderRadius: 9999, fontSize: 12, border: 'none', cursor: 'pointer',
                background: activeCompanion === c.id ? '#166534' : 'var(--chip-bg)',
                color: activeCompanion === c.id ? '#86efac' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >{c.emoji} {c.name}</button>
          ))}
        </div>
      )}

      {/* 文件夹筛选 */}
      {(folders.length > 0 || showNewFolder) && (
        <div
          className="flex items-center gap-2 shrink-0 overflow-x-auto"
          style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span className="shrink-0" style={{ fontSize: 12, color: 'var(--text-muted)' }}>📁</span>
          {folders.map(folder => (
            <FolderTag
              key={folder.id}
              folder={folder}
              active={activeFolder === folder.id}
              onClick={() => setActiveFolder(activeFolder === folder.id ? null : folder.id)}
              onRename={(newName) => renameFolder(folder, newName)}
              onDelete={() => deleteFolder(folder)}
            />
          ))}
          {showNewFolder ? (
            <div className="flex items-center gap-1 shrink-0">
              <input
                ref={newFolderRef}
                className="outline-none"
                style={{
                  width: 112, background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)',
                  borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--text-primary)',
                }}
                placeholder="输入文件夹名"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createFolder()
                  if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') }
                }}
              />
              <button
                style={{ color: 'var(--accent)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                onClick={createFolder}
              >确定</button>
              <button
                style={{ color: 'var(--text-muted)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
              >取消</button>
            </div>
          ) : (
            <button
              className="flex items-center justify-center shrink-0"
              style={{
                width: 24, height: 24, borderRadius: '50%', background: 'var(--chip-bg)',
                border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
                fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
              }}
              onClick={() => setShowNewFolder(true)}
              title="新建文件夹"
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--chip-bg)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >＋</button>
          )}
        </div>
      )}
      {folders.length === 0 && !showNewFolder && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }} className="shrink-0">
          <button
            style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
            onClick={() => setShowNewFolder(true)}
            onMouseEnter={e => e.target.style.color = 'var(--accent)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
          >＋ 新建文件夹</button>
        </div>
      )}

      {/* 卡片列表 */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '12px 16px' }}>
        {filtered.length === 0 ? (
          <p className="text-center mt-8" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {favorites.length === 0 ? '还没有收藏内容' : '没有匹配的收藏'}
          </p>
        ) : (
          filtered.map((item, i) => (
            <FavoriteCard
              key={i}
              item={item}
              folders={folders}
              onSource={item => showToast(`📺 来源：${item.sourceVideo ?? '未知'}`)}
              onCopy={() => { navigator.clipboard.writeText(item.answer || item.question || ''); showToast('已复制') }}
              onDelete={() => handleDelete(i)}
              onMove={(folderId) => moveToFolder(i, folderId)}
            />
          ))
        )}
      </div>

      {toast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] whitespace-nowrap"
          style={{
            background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)', fontSize: 13, padding: '10px 20px', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
