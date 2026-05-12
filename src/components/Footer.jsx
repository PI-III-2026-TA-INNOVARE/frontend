import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__inner">
          <Link to="/" className="footer__brand-name">
            P&amp;D Connect
          </Link>

          <nav className="footer__links" aria-label="Links do rodape">
            <Link to="/">Inicio</Link>
            <Link to="/sobre">Sobre</Link>
            <Link to="/como-funciona">Como funciona</Link>
            <Link to="/indicadores">Indicadores</Link>
            <Link to="/login">Entrar</Link>
          </nav>

          <span className="footer__copy">2026</span>
        </div>
      </div>
    </footer>
  )
}
