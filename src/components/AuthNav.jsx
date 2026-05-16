import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

export default function AuthNav() {
  const { user, logout } = useAuth()

  const navItems = useMemo(() => {
    const items = [
      { to: '/pesquisa', label: 'Painel' },
      { to: '/app/indicadores', label: 'Indicadores' },
      { to: '/perfil', label: 'Perfil' },
    ]

    if (user?.type === 'empresa') {
      items.push({ to: '/desafios/novo', label: 'Pesquisas' })
    }

    return items
  }, [user?.type])

  const profileName = user?.displayName || 'Perfil sem nome'
  const profileMeta = user?.type === 'empresa'
    ? user?.company?.cnpj || 'Empresa'
    : user?.university?.name || 'Pesquisador'

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
          <div className="auth-nav__profile-text">
            <span className="auth-nav__profile-name" title={profileName}>
              {profileName}
            </span>
            <span
              className="auth-nav__profile-meta"
              title={`${user?.type === 'empresa' ? 'Empresa' : 'Pesquisador'} | ${profileMeta}`}
            >
              {user?.type === 'empresa' ? 'Empresa' : 'Pesquisador'} | {profileMeta}
            </span>
          </div>

          <ThemeToggle />

          <button type="button" className="btn btn-ghost auth-nav__logout" onClick={logout}>
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
