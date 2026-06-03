import { useMemo } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

export default function AuthNav() {
  const { user, logout } = useAuth()

  const navItems = useMemo(() => {
    const items = [
      { to: '/painel', label: 'Painel' },
      { to: '/indicadores/painel', label: 'Indicadores' },
      { to: '/pesquisas', label: 'Pesquisas' },
    ]

    return items
  }, [user?.type])

  const profileName = user?.displayName || 'Perfil sem nome'
  const profileMeta = user?.type === 'empresa'
    ? user?.company?.cnpj || 'Empresa'
    : user?.university?.name || 'Pesquisador'
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || 'U'

  return (
    <header className="auth-nav">
      <div className="container auth-nav__inner">
        <div className="auth-nav__brand">
          <div className="logo-icon">PD</div>
          <div>
            <div className="auth-nav__brand-title">P&amp;D Connect</div>
          </div>
        </div>

        <nav className="auth-nav__links" aria-label="Navegacao autenticada">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `auth-nav__link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="auth-nav__profile">
          <Link to="/perfil" className="auth-nav__profile-text" data-initial={profileInitial} title="Ir para meu perfil">
            <span className="auth-nav__profile-name">
              {profileName}
            </span>
          </Link>

          <ThemeToggle />

          <button type="button" className="btn btn-ghost auth-nav__logout" onClick={logout}>
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
