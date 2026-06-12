import { Link } from 'react-router-dom'
import './HomePage.scss'

export default function HomePage() {
  return (
    <>
      <section className="hero" id="hero">
        <div className="hero__image-overlay"></div>

        <div className="hero__shell">
          <div className="container">
            <div className="hero__layout">
              <div className="hero__content">
                <div className="hero__mark-row">
                  <div className="hero__badge">
                    <span className="badge-dot"></span>
                    Match inteligente para pesquisa e inovação
                  </div>
                </div>

                <h1 className="hero__title">
                  Conectamos empresas com pesquisadores{' '}
                  <em className="hero__title-accent">usando IA</em>
                </h1>

                <p className="hero__description">
                  Empresas publicam desafios de P&amp;D, pesquisadores cadastram seus perfis e a
                  plataforma sugere conexões com maior compatibilidade técnica.
                </p>

                <div className="cta-box">
                  <h2 className="cta-box__title">
                    Da demanda ao pesquisador certo
                  </h2>
                  <p className="cta-box__subtitle">
                    A empresa descreve seu desafio, o pesquisador mantém seu perfil atualizado e
                    a IA cruza informações para indicar conexões com maior potencial de colaboração.
                  </p>
                  <div className="cta-box__buttons2">
                    <Link to="/login#cadastro" className="btn btn-primary btn-lg">
                      Criar cadastro
                    </Link>
                    <Link to="/login" className="btn btn-outline btn-lg">
                      Entrar na plataforma
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
