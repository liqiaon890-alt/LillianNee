import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { COMPANIONS } from '../data/companions'

const STYLE_OPTIONS = [
  { value: 'casual',   label: '随性',  desc: '像朋友聊天，轻松自在' },
  { value: 'formal',   label: '正式',  desc: '专业严谨，条理清晰' },
  { value: 'humorous', label: '幽默',  desc: '风趣活泼，笑料不断' },
]

const STYLE_PERSONA = {
  casual:   '说话随性自然，像和老朋友聊天，不拘小节，语气轻松。',
  formal:   '说话专业严谨，逻辑清晰，用语正式，给用户信赖感。',
  humorous: '说话风趣幽默，善用比喻和玩笑，让对话轻松有趣。',
}

// ─── 搭子图标（PNG 优先，emoji 兜底） ─────────────────────────────────────────
function CompanionIcon({ companion, size = 24 }) {
  const [failed, setFailed] = useState(false)
  if (companion?.iconImage && !failed) {
    return (
      <img
        src={companion.iconImage}
        alt={companion.name}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
      />
    )
  }
  return <span style={{ fontSize: size * 0.75, lineHeight: 1, flexShrink: 0 }}>{companion?.emoji}</span>
}

// ─── 自定义搭子弹窗 ────────────────────────────────────────────────────────────
function CustomModal({ onConfirm, onClose }) {
  const [name,     setName]     = useState('')
  const [type,     setType]     = useState('')
  const [skill,    setSkill]    = useState('')
  const [style,    setStyle]    = useState('casual')
  const [roleplay, setRoleplay] = useState(false)
  const [charName, setCharName] = useState('')
  const [charDesc, setCharDesc] = useState('')

  const canSubmit = roleplay
    ? name.trim() && charName.trim() && charDesc.trim()
    : name.trim() && type.trim() && skill.trim()

  const handleConfirm = () => {
    if (!canSubmit) return
    let persona
    if (roleplay) {
      persona = `你现在扮演视频中的角色【${charName.trim()}】。角色描述：${charDesc.trim()}。请完全以该角色的口吻、性格、说话方式回应用户，不要出戏，不要提及自己是AI。`
    } else {
      persona = `你是用户的专属 AI 搭子「${name.trim()}」，专注于${type.trim()}相关内容，擅长${skill.trim()}。${STYLE_PERSONA[style]}请完全按照这个角色陪伴用户观看视频。`
    }
    onConfirm({
      id: `custom_${Date.now()}`,
      emoji: roleplay ? '🎭' : '⚙️',
      name: name.trim(),
      contentType: roleplay ? `扮演：${charName.trim()}` : type.trim(),
      persona,
      isRoleplay: roleplay,
      roleplayCharacter: roleplay ? charName.trim() : undefined,
      roleplayDesc: roleplay ? charDesc.trim() : undefined,
      recommendedActions: [
        { id: 'summary',      label: '📄 全文总结' },
        { id: 'characterMap', label: '👥 人物关系图' },
        { id: 'eventMap',     label: '📅 事件图谱' },
      ],
    })
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.70)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm flex flex-col"
        style={{ background: 'var(--bg-card)', borderRadius: 16, boxShadow: 'var(--shadow-modal)', border: '1px solid var(--border-subtle)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 16, margin: 0 }}>自定义搭子</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, marginBottom: 0 }}>打造专属于你的 AI 伴侣</p>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 搭子名字 */}
          <ModalField label="搭子名字 *" value={name} onChange={setName} placeholder="例如：法律搭子" autoFocus onEnter={() => canSubmit && handleConfirm()} />

          {/* 扮演视频角色开关 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>扮演视频角色</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>以视频中某个角色身份对话</p>
            </div>
            <button
              onClick={() => setRoleplay(v => !v)}
              style={{
                width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                background: roleplay ? 'var(--accent)' : '#333',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: roleplay ? 20 : 3,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

          {roleplay ? (
            <>
              <ModalField label="角色名称 *" value={charName} onChange={setCharName} placeholder="例如：韩立、何炅" onEnter={() => canSubmit && handleConfirm()} />
              <ModalTextarea label="角色性格描述 *" value={charDesc} onChange={setCharDesc} placeholder="例如：性格沉稳、寡言少语，说话直接，偶尔带一点江湖气" />
            </>
          ) : (
            <>
              <ModalField label="适配视频类型 *" value={type} onChange={setType} placeholder="例如：法庭纪录片、法律科普" onEnter={() => canSubmit && handleConfirm()} />
              <ModalField label="它擅长什么 *" value={skill} onChange={setSkill} placeholder="例如：解读法律条文、分析案情" onEnter={() => canSubmit && handleConfirm()} />
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 8 }}>说话风格</label>
                <div className="flex gap-2">
                  {STYLE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStyle(opt.value)}
                      style={{
                        flex: 1, borderRadius: 8, padding: '8px 4px', fontSize: 12,
                        transition: 'all 0.2s',
                        background: style === opt.value ? 'var(--accent)' : 'var(--bg-hover)',
                        border: `1px solid ${style === opt.value ? 'var(--accent)' : 'var(--border-subtle)'}`,
                        color: style === opt.value ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      <p style={{ fontWeight: 600, margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 10, marginTop: 2, opacity: 0.8, margin: 0 }}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 shrink-0" style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            style={{
              flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 500,
              background: canSubmit ? 'var(--accent)' : 'var(--border-subtle)',
              color: canSubmit ? '#fff' : 'var(--text-muted)',
              borderRadius: 12, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s', boxShadow: canSubmit ? '0 4px 12px rgba(255,102,0,0.35)' : 'none',
            }}
            onClick={handleConfirm}
            disabled={!canSubmit}
          >创建搭子</button>
          <button
            style={{ padding: '10px 16px', fontSize: 14, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
            onClick={onClose}
            onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
          >取消</button>
        </div>
      </div>
    </div>
  )
}

function ModalField({ label, value, onChange, placeholder, autoFocus, onEnter }) {
  return (
    <div>
      <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        autoFocus={autoFocus}
        className="w-full outline-none"
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', transition: 'border-color 0.2s' }}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
      />
    </div>
  )
}

function ModalTextarea({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>{label}</label>
      <textarea
        className="w-full outline-none resize-none"
        rows={3}
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', transition: 'border-color 0.2s', lineHeight: 1.6 }}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
      />
    </div>
  )
}

// ─── 下拉组件 ──────────────────────────────────────────────────────────────────
export default function CompanionDropdown({ currentCompanion, onSwitch }) {
  const [open, setOpen]             = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [btnHov, setBtnHov]         = useState(false)
  const [dropPos, setDropPos]       = useState({ top: 0, left: 0, width: 256 })
  const btnRef  = useRef(null)
  const dropRef = useRef(null)

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (!btnRef.current?.contains(e.target) && !dropRef.current?.contains(e.target))
        setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  const handleOpen = () => {
    if (open) { setOpen(false); return }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) {
      setDropPos({
        top:  rect.bottom + 6,
        left: rect.left,
      })
    }
    setOpen(true)
  }

  const handleSelect = (companion) => {
    setOpen(false)
    if (companion.id === 'custom') { setShowCustom(true); return }
    if (companion.id !== currentCompanion?.id) onSwitch(companion)
  }

  return (
    <>
      {/* 触发器 */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="flex items-center gap-1.5 transition-all"
        style={{
          background: 'var(--bg-card)',
          border: `1px solid ${btnHov || open ? 'var(--accent)' : 'var(--border-subtle)'}`,
          borderRadius: 20,
          padding: '6px 12px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={() => setBtnHov(true)}
        onMouseLeave={() => setBtnHov(false)}
      >
        <CompanionIcon companion={currentCompanion} size={24} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>
          {currentCompanion?.name}
        </span>
        <span style={{
          fontSize: 10,
          color: 'var(--accent)',
          transition: 'transform 0.2s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>▼</span>
      </button>

      {/* 下拉列表 — portal 到 body，绕过 panel 的 transform 堆叠上下文 */}
      {open && createPortal(
        <div
          ref={dropRef}
          className="rounded-2xl shadow-2xl py-1.5 overflow-y-auto"
          style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            width: 256,
            maxHeight: 320,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            zIndex: 9999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {COMPANIONS.map(companion => {
            const active = companion.id === currentCompanion?.id
              || (currentCompanion?.id?.startsWith('custom_') && companion.id === 'custom')
            return (
              <DropItem
                key={companion.id}
                companion={companion}
                active={active}
                onClick={() => handleSelect(companion)}
              />
            )
          })}
        </div>,
        document.body
      )}

      {showCustom && (
        <CustomModal
          onConfirm={(companion) => { setShowCustom(false); onSwitch(companion) }}
          onClose={() => setShowCustom(false)}
        />
      )}
    </>
  )
}

function DropItem({ companion, active, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
      style={{ background: hov || active ? 'var(--bg-hover)' : 'transparent' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <CompanionIcon companion={companion} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
          {companion.name}
        </p>
        <p className="text-xs leading-snug truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {companion.contentType}
        </p>
      </div>
      {active && <span className="text-xs shrink-0" style={{ color: 'var(--accent)' }}>✓</span>}
    </button>
  )
}
