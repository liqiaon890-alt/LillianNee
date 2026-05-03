import { useState } from 'react'
import { COMPANIONS } from '../data/companions'

const STYLE_OPTIONS = [
  { value: 'casual',  label: '随性', desc: '像朋友聊天，轻松自在' },
  { value: 'formal',  label: '正式', desc: '专业严谨，条理清晰' },
  { value: 'humorous', label: '幽默', desc: '风趣活泼，笑料不断' },
]

const STYLE_PERSONA = {
  casual:  '说话随性自然，像和老朋友聊天，不拘小节，语气轻松。',
  formal:  '说话专业严谨，逻辑清晰，用语正式，给用户信赖感。',
  humorous: '说话风趣幽默，善用比喻和玩笑，让对话轻松有趣。',
}

// ─── 自定义搭子弹窗 ────────────────────────────────────────────────────────────
function CustomModal({ onConfirm, onClose }) {
  const [name, setName]         = useState('')
  const [type, setType]         = useState('')
  const [skill, setSkill]       = useState('')
  const [style, setStyle]       = useState('casual')
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
        { id: 'summary', label: '📄 全文总结' },
        { id: 'characterMap', label: '👥 人物关系图' },
        { id: 'eventMap', label: '📅 事件图谱' },
      ],
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
          {/* 搭子名字（始终显示） */}
          <ModalInput label="搭子名字 *" value={name} onChange={setName} placeholder="例如：法律搭子" autoFocus onEnter={() => canSubmit && handleConfirm()} />

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

          {/* 角色扮演字段 */}
          {roleplay ? (
            <>
              <ModalInput label="角色名称 *" value={charName} onChange={setCharName} placeholder="例如：韩立、何炅" onEnter={() => canSubmit && handleConfirm()} />
              <ModalTextarea label="角色性格描述 *" value={charDesc} onChange={setCharDesc} placeholder="例如：性格沉稳、寡言少语，说话直接，偶尔带一点江湖气" />
            </>
          ) : (
            <>
              <ModalInput label="适配视频类型 *" value={type} onChange={setType} placeholder="例如：法庭纪录片、法律科普" onEnter={() => canSubmit && handleConfirm()} />
              <ModalInput label="它擅长什么 *" value={skill} onChange={setSkill} placeholder="例如：解读法律条文、分析案情" onEnter={() => canSubmit && handleConfirm()} />
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

        <div
          className="flex gap-3 shrink-0"
          style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)' }}
        >
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
          >
            创建搭子
          </button>
          <button
            style={{ padding: '10px 16px', fontSize: 14, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
            onClick={onClose}
            onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 搭子卡片图片（带 emoji 占位回退） ────────────────────────────────────────
function CompanionImage({ companion }) {
  const [failed, setFailed] = useState(false)

  if (companion.iconImage && !failed) {
    return (
      <img
        src={companion.iconImage}
        alt={companion.name}
        onError={() => setFailed(true)}
        style={{
          width: '100%', height: 64, objectFit: 'cover',
          borderRadius: '10px 10px 0 0', display: 'block', background: '#1a1a1a',
        }}
      />
    )
  }

  return (
    <div style={{
      width: '100%', height: 64, borderRadius: '10px 10px 0 0',
      background: '#252525', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 28,
    }}>
      {companion.emoji}
    </div>
  )
}

// ─── 搭子卡片 ──────────────────────────────────────────────────────────────────
function CompanionCard({ companion, isCustomTrigger, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        padding: 0, borderRadius: 12, textAlign: 'left', cursor: 'pointer',
        background: isCustomTrigger ? 'linear-gradient(160deg, #1e1a14, #1a1a1a)' : '#1e1e1e',
        overflow: 'hidden',
        border: isCustomTrigger
          ? `1.5px dashed ${hov ? 'rgba(255,102,0,0.7)' : 'rgba(255,102,0,0.35)'}`
          : `1px solid ${hov ? 'rgba(255,102,0,0.45)' : '#2a2a2a'}`,
        boxShadow: hov ? '0 0 12px rgba(255,102,0,0.18)' : 'none',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.2s ease', outline: 'none',
      }}
    >
      <CompanionImage companion={companion} />
      <div style={{ padding: '8px 10px', background: 'transparent' }}>
        <p className="companion-card-name" style={{ fontSize: 13, fontWeight: 600, color: isCustomTrigger ? 'rgba(255,102,0,0.9)' : '#f0f0f0', lineHeight: 1.3, margin: '0 0 2px' }}>
          {companion.name}
        </p>
        <p className="companion-card-desc" style={{
          fontSize: 11, color: '#888888', lineHeight: 1.3, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {companion.contentType}
        </p>
      </div>
    </button>
  )
}

// ─── 主组件 ────────────────────────────────────────────────────────────────────
export default function CompanionSelect({ onSelect }) {
  const [showCustom, setShowCustom] = useState(false)

  const presets = COMPANIONS.filter(c => c.id !== 'custom')
  const customBase = COMPANIONS.find(c => c.id === 'custom')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 标题区 */}
      <div style={{ padding: '24px 20px 16px' }} className="shrink-0">
        <p style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>
          选择你的 AI 搭子
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0 }}>
          根据视频内容获得专属体验
        </p>
      </div>

      {/* 网格 */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 16px 24px' }}>
        <div className="grid grid-cols-4 companion-grid" style={{ columnGap: 8, rowGap: 28 }}>
          {presets.map(companion => (
            <CompanionCard
              key={companion.id}
              companion={companion}
              onClick={() => onSelect(companion)}
            />
          ))}

          {/* 自定义搭子入口 */}
          <CompanionCard
            companion={customBase}
            isCustomTrigger
            onClick={() => setShowCustom(true)}
          />
        </div>
      </div>

      {showCustom && (
        <CustomModal
          onConfirm={(companion) => { setShowCustom(false); onSelect(companion) }}
          onClose={() => setShowCustom(false)}
        />
      )}
    </div>
  )
}

function ModalInput({ label, value, onChange, placeholder, autoFocus, onEnter }) {
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
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
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
