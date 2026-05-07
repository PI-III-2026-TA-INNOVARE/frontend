import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="footer__brand-name">
              <div className="logo-icon">PD</div>
              <span>P&amp;D Connect</span>
            </div>
            <p className="footer__brand-text">
              Empresas, pesquisadores, universidades e pesquisas em um so ambiente para aproximar
              demandas de inovacao da producao cientifica.
            </p>
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

          <div className="footer__col footer__col--summary">
            <h4 className="footer__col-title">Conexao</h4>
            <p>Pesquisa aplicada, perfis completos e indicadores para orientar parcerias.</p>
          </div>
        </div>

        <div className="footer__bottom">
          <span>2026 P&amp;D Connect.</span>
        </div>
      </div>
    </footer>
  )
}
