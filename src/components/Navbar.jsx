import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { isAuthenticated, logout } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    document.body.style.overflow = ''
  }, [location])

  useEffect(() => {
    if (!menuOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        document.body.style.overflow = ''
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const closeMenu = () => {
    setMenuOpen(false)
    document.body.style.overflow = ''
  }

  const toggleMenu = () => {
    setMenuOpen((prev) => {
      document.body.style.overflow = !prev ? 'hidden' : ''
      return !prev
    })
  }

  const handleLogout = () => {
    logout()
    closeMenu()
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}${menuOpen ? ' menu-open' : ''}`} id="navbar">
      <div className="container">
        <Link to="/" className="navbar__logo">
          <div className="logo-icon">PD</div>
          <span>P&amp;D Connect</span>
        </Link>

        <div className={`navbar__links${menuOpen ? ' open' : ''}`} id="navLinks">
          <Link to="/" className={isActive('/') ? 'active' : ''}>Início</Link>
          <Link to="/sobre" className={isActive('/sobre') ? 'active' : ''}>Sobre</Link>
          <Link to="/como-funciona" className={isActive('/como-funciona') ? 'active' : ''}>Como funciona</Link>
          <Link to="/indicadores" className={isActive('/indicadores') ? 'active' : ''}>Indicadores</Link>

          <div className="navbar__mobile-actions">
            {isAuthenticated ? (
              <>
                <Link to="/pesquisa" className="btn btn-ghost">Abrir painel</Link>
                <button type="button" className="btn btn-primary" onClick={handleLogout}>
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">Entrar</Link>
                <Link to="/login#cadastro" className="btn btn-primary">Cadastrar</Link>
              </>
            )}
          </div>
        </div>

        <div className="navbar__actions">
          {isAuthenticated ? (
            <>
              <Link to="/pesquisa" className="btn btn-ghost">Abrir painel</Link>
              <button type="button" className="btn btn-primary" onClick={handleLogout}>
                Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Entrar</Link>
              <Link to="/login#cadastro" className="btn btn-primary">Cadastrar</Link>
            </>
          )}
        </div>

        <button
          type="button"
          className={`navbar__hamburger${menuOpen ? ' active' : ''}`}
          id="hamburger"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          aria-controls="navLinks"
          onClick={toggleMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {menuOpen && (
        <button
          type="button"
          className="navbar__backdrop"
          aria-label="Fechar menu"
          onClick={closeMenu}
        />
      )}
    </nav>
  )
}
