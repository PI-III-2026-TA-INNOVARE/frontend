import { Link } from 'react-router-dom'
import Reveal from '../../../components/Reveal'
import './HomePage.scss'

const matchFlow = [
  {
    label: 'Demanda',
    text: 'A empresa descreve o problema, objetivo, prazo e area de pesquisa.',
  },
  {
    label: 'Perfil',
    text: 'O pesquisador apresenta curriculo, experiencias e competencias.',
  },
  {
    label: 'Match',
    text: 'A IA aproxima os perfis com maior potencial de colaboracao.',
  },
]

const supportCards = [
  {
    title: 'Para empresas',
    text: 'Publique demandas de P&D e encontre pesquisadores com aderencia tecnica.',
  },
  {
    title: 'Para pesquisadores',
    text: 'Mantenha seu perfil claro e descubra oportunidades alinhadas a sua area.',
  },
  {
    title: 'Com apoio de IA',
    text: 'Reduza a busca manual e priorize conexoes com mais contexto.',
  },
]

export default function HomePage() {
  return (
    <>
      <section className="hero" id="hero">
        <div className="container">
          <div className="hero__layout">
            <div className="hero__content">
              <div className="hero__badge">
                <span className="badge-dot"></span>
                Match inteligente para P&amp;D
              </div>

              <h1 className="hero__title">Conectando empresas e pesquisadores com IA</h1>

              <p className="hero__description">
                A P&amp;D Connect ajuda empresas a encontrar especialistas e pesquisadores a
                descobrir oportunidades de colaboracao com mais clareza, contexto e velocidade.
              </p>

              <div className="hero__actions">
                <Link to="/login#cadastro" className="btn btn-primary btn-lg">
                  Explorar solucoes
                </Link>
                <Link to="/como-funciona" className="btn btn-outline btn-lg">
                  Saiba mais
                </Link>
              </div>

              <div className="hero__match-card">
                <div className="hero__match-card-head">
                  <span>IA aplicada</span>
                  <h2>Match inteligente com IA</h2>
                </div>
                <p>
                  A plataforma cruza demandas de empresas com perfis de pesquisadores para sugerir
                  conexoes com maior potencial.
                </p>
                <div className="hero__match-flow" aria-label="Fluxo resumido do match">
                  {matchFlow.map((item) => (
                    <article key={item.label} className="hero__match-step">
                      <strong>{item.label}</strong>
                      <span>{item.text}</span>
                    </article>
                  ))}
                </div>
                <Link to="/login#cadastro" className="btn btn-primary hero__match-cta">
                  Conecte-se agora
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section home-ai" id="funcionalidades">
        <div className="container home-ai__container">
          <Reveal>
            <div className="home-ai__panel">
              <div className="home-ai__mark" aria-hidden="true">IA</div>

              <div className="home-ai__copy">
                <span className="section-label">Como funciona</span>
                <h2 className="section-title">
                  Menos busca manual, mais conexoes relevantes.
                </h2>
                <p className="section-subtitle">
                  A P&amp;D Connect organiza os dados essenciais e apoia empresas e pesquisadores
                  na descoberta de colaboracoes com maior aderencia.
                </p>
              </div>

              <div className="home-ai__cards">
                {supportCards.map((card) => (
                  <article key={card.title} className="home-ai-card">
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section cta-section">
        <div className="container">
          <Reveal>
            <div className="cta-box">
              <h2 className="cta-box__title">
                Conecte-se com pesquisadores ou empresas agora
              </h2>
              <p className="cta-box__subtitle">
                Comece pela plataforma e transforme demandas de P&amp;D em oportunidades reais de
                colaboracao.
              </p>
              <div className="cta-box__buttons">
                <Link to="/login#cadastro" className="btn btn-primary btn-lg">
                  Criar conexao
                </Link>
                <Link to="/login" className="btn btn-outline btn-lg">
                  Entrar
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
