const NAV_LINKS = ['首页', '电视剧', '电影', '综艺', '动漫', '纪录片', '少儿', 'NBA']

export default function TencentNavBar() {
  return (
    <div
      className="flex items-center shrink-0 w-full tencent-navbar"
      style={{
        height: 56,
        background: '#0a0a0a',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 24px',
        gap: 0,
        zIndex: 30,
        position: 'relative',
      }}
    >
      {/* Logo */}
      <a
        href="#"
        className="shrink-0 mr-8 no-underline"
        style={{ fontSize: 20, fontWeight: 700, color: '#FF6600', letterSpacing: '-0.5px', textDecoration: 'none' }}
        onClick={e => e.preventDefault()}
      >
        腾讯视频
      </a>

      {/* 导航链接 */}
      <nav className="nav-links flex items-center" style={{ gap: 20 }}>
        {NAV_LINKS.map(link => (
          <NavLink key={link}>{link}</NavLink>
        ))}
      </nav>

      {/* 右侧操作区 */}
      <div className="flex items-center ml-auto shrink-0" style={{ gap: 12 }}>
        {/* 搜索框（桌面/平板） */}
        <div className="nav-search-full relative flex items-center">
          <input
            type="text"
            placeholder="搜索"
            readOnly
            className="outline-none"
            style={{
              width: 200,
              height: 32,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 16,
              padding: '0 36px 0 14px',
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              cursor: 'default',
            }}
          />
          <span
            className="absolute right-3 pointer-events-none"
            style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}
          >🔍</span>
        </div>

        {/* 搜索图标（移动端） */}
        <button
          className="nav-search-icon"
          style={{
            width: 32, height: 32, background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.5)', cursor: 'default', fontSize: 16,
            alignItems: 'center', justifyContent: 'center',
          }}
        >🔍</button>

        {/* VIP 按钮 */}
        <button
          className="nav-vip"
          style={{
            height: 30,
            padding: '0 14px',
            borderRadius: 15,
            background: 'linear-gradient(135deg, #f5c842, #e8a020)',
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            color: '#5a3200',
            cursor: 'default',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
          }}
        >
          开通VIP
        </button>

        {/* 用户头像 */}
        <div
          className="nav-avatar flex items-center justify-center rounded-full shrink-0"
          style={{
            width: 32,
            height: 32,
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.15)',
            fontSize: 16,
          }}
        >
          👤
        </div>
      </div>
    </div>
  )
}

function NavLink({ children }) {
  return (
    <a
      href="#"
      className="transition-colors no-underline"
      style={{ fontSize: 14, color: '#aaa', textDecoration: 'none', whiteSpace: 'nowrap' }}
      onClick={e => e.preventDefault()}
      onMouseEnter={e => e.currentTarget.style.color = '#fff'}
      onMouseLeave={e => e.currentTarget.style.color = '#aaa'}
    >
      {children}
    </a>
  )
}
