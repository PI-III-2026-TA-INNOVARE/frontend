import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'

const NAV_ITEMS = [
  { to: '/painel', label: 'Painel' },
  { to: '/indicadores/painel', label: 'Indicadores' },
  { to: '/pesquisas', label: 'Pesquisas' },
]

export default function AuthNav() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const hamburgerRef = useRef(null)

  const profileName = user?.displayName || 'Perfil sem nome'
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'U'

  // Fecha ao navegar
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!menuOpen) return undefined

    const onPointerDown = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        hamburgerRef.current && !hamburgerRef.current.contains(e.target)
      ) {
        setMenuOpen(false)
      }
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
  }

  return (
    <header className="auth-nav">
      <div className="container auth-nav__inner">
        <div className="auth-nav__brand">
          <div className="logo-icon">PD</div>
          <div className="auth-nav__brand-title">P&amp;D Connect</div>
        </div>

        {/* Links — visíveis apenas em desktop */}
        <nav className="auth-nav__links" aria-label="Navegação autenticada">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `auth-nav__link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Ações — visíveis apenas em desktop */}
        <div className="auth-nav__profile">
          <Link
            to="/perfil"
            className="auth-nav__profile-text"
            data-initial={profileInitial}
            title="Ir para meu perfil"
          >
            <span className="auth-nav__profile-name">{profileName}</span>
          </Link>
          <NotificationBell />
          <ThemeToggle />
          <button type="button" className="btn btn-ghost auth-nav__logout" onClick={handleLogout}>
            Sair
          </button>
        </div>

        {/* Hamburger — visível apenas em telas menores */}
        <div className="auth-nav__mobile-right">
          <NotificationBell />
          <button
            ref={hamburgerRef}
            type="button"
            className={`auth-nav__hamburger${menuOpen ? ' active' : ''}`}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Drawer mobile */}
      {menuOpen && (
        <div ref={menuRef} className="auth-nav__drawer" role="dialog" aria-label="Menu de navegação">
          <nav className="auth-nav__drawer-links">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `auth-nav__drawer-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="auth-nav__drawer-footer">
            <Link
              to="/perfil"
              className="auth-nav__drawer-profile"
              data-initial={profileInitial}
              onClick={() => setMenuOpen(false)}
            >
              <span className="auth-nav__drawer-profile-name">{profileName}</span>
            </Link>
            <div className="auth-nav__drawer-actions">
              <ThemeToggle />
              <button
                type="button"
                className="btn btn-ghost auth-nav__logout"
                onClick={handleLogout}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
