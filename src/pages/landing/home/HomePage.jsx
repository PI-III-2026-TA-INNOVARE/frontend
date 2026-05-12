import { Link } from 'react-router-dom'
import FeatureCard from '../../../components/FeatureCard'
import { appIcons } from '../../../lib/icons'
import './HomePage.scss'

const featureCards = [
  {
    icon: appIcons.proposals,
    title: 'Empresa publica uma demanda',
    description: 'Cadastre problemas, desafios ou oportunidades de P&D que precisam de apoio tecnico ou academico.',
  },
  {
    icon: appIcons.matchmaking,
    title: 'Pesquisador monta seu perfil',
    description: 'Informe formacao, experiencias, habilidades e areas de atuacao para ser encontrado com mais precisao.',
  },
  {
    icon: appIcons.search,
    title: 'A IA sugere conexoes',
    description: 'O sistema compara demandas e perfis para destacar pesquisadores com maior aderencia ao desafio.',
  },
  {
    icon: appIcons.indicators,
    title: 'A colaboracao comeca',
    description: 'Empresas e pesquisadores avancam para conversas, propostas e possiveis projetos em conjunto.',
  },
]

export default function HomePage() {
  return (
    <>
      <section className="hero" id="hero">
        <div className="hero__bg-glow"></div>
        <div className="hero__bg-glow hero__bg-glow--right"></div>

        <div className="hero__shell">
          <div className="container">
            <div className="hero__layout">
              <div className="hero__content">
                <div className="hero__ai-mark" aria-hidden="true">IA</div>

                <div className="hero__badge">
                  <span className="badge-dot"></span>
                  Match inteligente para pesquisa e inovacao
                </div>

                <h1 className="hero__title">Conectamos empresas com pesquisadores usando IA</h1>

                <p className="hero__description">
                  Empresas publicam desafios de P&amp;D, pesquisadores cadastram seus perfis e a
                  plataforma sugere conexoes com maior compatibilidade tecnica.
                </p>

                <div className="cta-box">
                  <h2 className="cta-box__title">
                    Da demanda ao pesquisador certo
                  </h2>
                  <p className="cta-box__subtitle">
                    A empresa descreve seu desafio, o pesquisador mantem seu perfil atualizado e
                    a IA cruza informacoes para indicar conexoes com maior potencial de colaboracao.
                  </p>
                  <div className="cta-box__buttons">
                    <Link to="/login" className="btn btn-primary btn-lg">
                      Entrar na plataforma
                    </Link>
                    <Link to="/login#cadastro" className="btn btn-outline btn-lg">
                      Criar cadastro
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="hero__steps" aria-label="Como o P&D Connect funciona">
            <div className="hero__steps-head">
              <span className="section-label">Como funciona</span>
              <h2>4 passos para conectar demanda e pesquisa</h2>
            </div>

            {featureCards.map((card, index) => (
              <FeatureCard
                key={card.title}
                icon={card.icon}
                title={`${index + 1}. ${card.title}`}
                description={card.description}
              />
            ))}
          </aside>
        </div>
      </section>
    </>
  )
}
