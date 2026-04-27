import { Link } from 'react-router-dom'
import FeatureCard from '../../../components/FeatureCard'
import Reveal from '../../../components/Reveal'
import { appIcons } from '../../../lib/icons'
import './HomePage.scss'

const heroSupportCards = [
  {
    eyebrow: 'Cadastros',
    title: 'Empresas e pesquisadores entram pelo mesmo acesso.',
  },
  {
    eyebrow: 'Perfis',
    title: 'Curriculos, experiencias e habilidades em um perfil.',
  },
  {
    eyebrow: 'Pesquisas',
    title: 'Demandas abertas para descoberta e interesse.',
  },
]

const featureCards = [
  {
    icon: appIcons.matchmaking,
    title: 'Perfis completos',
    description: 'Dados essenciais para empresas e pesquisadores.',
  },
  {
    icon: appIcons.proposals,
    title: 'Pesquisas e interesses',
    description: 'Publique demandas e acompanhe pesquisadores interessados.',
  },
  {
    icon: appIcons.search,
    title: 'Busca da plataforma',
    description: 'Filtre empresas, pesquisadores, universidades e pesquisas.',
  },
]

export default function HomePage() {
  return (
    <>
      <section className="hero" id="hero">
        <div className="hero__bg-glow"></div>
        <div className="hero__bg-glow hero__bg-glow--right"></div>

        <div className="container">
          <div className="hero__content hero__content--centered">
            <div className="hero__badge">
              <span className="badge-dot"></span>
              ODS 9 | Pesquisa, industria e inovacao conectadas
            </div>

            <h1 className="hero__title">Conecte empresas e pesquisadores</h1>

            <p className="hero__description">
              Uma plataforma para publicar pesquisas, encontrar perfis e criar conexoes de P&amp;D.
            </p>

            <div className="hero__actions hero__actions--centered">
              <Link to="/login" className="btn btn-primary btn-lg">
                Entrar na plataforma
              </Link>
              <Link to="/como-funciona" className="btn btn-outline btn-lg">
                Ver como funciona
              </Link>
            </div>
          </div>

          <div className="hero__support hero__support--compact">
            <div className="hero__support-grid">
              {heroSupportCards.map((card) => (
                <article key={card.eyebrow} className="hero__support-card">
                  <span className="hero__support-card-eyebrow">{card.eyebrow}</span>
                  <h3 className="hero__support-card-title">{card.title}</h3>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="section section--muted home-features home-features--focused"
        id="funcionalidades"
      >
        <div className="container">
          <Reveal className="text-center">
            <span className="section-label">Funcionalidades</span>
            <h2 className="section-title">
              Funcionalidades para <span className="text-gradient">operar melhor</span>
            </h2>
            <p className="section-subtitle">O essencial para descobrir, publicar e acompanhar.</p>
          </Reveal>

          <div className="features__grid features__grid--three">
            {featureCards.map((card) => (
              <Reveal key={card.title}>
                <FeatureCard icon={card.icon} title={card.title} description={card.description} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section cta-section">
        <div className="container">
          <Reveal>
            <div className="cta-box">
              <h2 className="cta-box__title">
                Comece a usar a <span className="text-gradient">P&amp;D Connect</span>
              </h2>
              <p className="cta-box__subtitle">
                Entre para explorar perfis, pesquisas e indicadores.
              </p>
              <div className="cta-box__buttons">
                <Link to="/login" className="btn btn-primary btn-lg">
                  Entrar na plataforma
                </Link>
                <Link to="/login#cadastro" className="btn btn-outline btn-lg">
                  Cadastrar
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
