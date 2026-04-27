import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="footer__brand-name">
              <span>P&amp;D Connect</span>
            </div>
            <p className="footer__brand-text">Empresas, pesquisadores e pesquisas em um so lugar.</p>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Plataforma</h4>
            <Link to="/como-funciona">Como Funciona</Link>
            <Link to="/indicadores">Indicadores</Link>
            <Link to="/login">Entrar</Link>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Institucional</h4>
            <Link to="/sobre">Sobre</Link>
          </div>
        </div>

        <div className="footer__bottom">
          <span>2026 P&amp;D Connect.</span>
        </div>
      </div>
    </footer>
  )
}
