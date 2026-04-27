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
            <p className="footer__brand-text">
              Conectando empresas a pesquisadores para impulsionar a inovação tecnológica no
              Brasil. Alinhado com a ODS 9 da ONU.
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
            <Link to="/sobre">Sobre Nós</Link>
            <span className="footer__placeholder-link">Termos de Uso em breve</span>
            <span className="footer__placeholder-link">Privacidade em breve</span>
            <span className="footer__placeholder-link">Contato em breve</span>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Parceiros</h4>
            <span className="footer__placeholder-link">CNPq</span>
            <span className="footer__placeholder-link">MCTI</span>
            <span className="footer__placeholder-link">CAPES</span>
            <span className="footer__placeholder-link">IBGE</span>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© 2026 P&amp;D Connect. Todos os direitos reservados.</span>
          <div className="footer__bottom-links">
            <span className="footer__placeholder-link">Política de Privacidade em breve</span>
            <span className="footer__placeholder-link">Termos de Serviço em breve</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
