import { Link } from 'react-router-dom'
import Reveal from '../../../components/Reveal'
import './SobrePage.scss'

const aboutHighlights = [
  {
    title: 'Perfis com dados reais',
    text: 'Empresas, pesquisadores, universidades e curriculos agora refletem a base real da API.',
  },
  {
    title: 'Publicacao autenticada',
    text: 'Empresas autenticadas ja conseguem publicar pesquisas usando o recurso real do backend.',
  },
  {
    title: 'Roadmap explicito',
    text: 'Propostas, notificacoes e IA continuam visiveis como evolucao, sem simulacao no front.',
  },
]

const aboutPillars = [
  {
    eyebrow: 'Conexao qualificada',
    title: 'Empresas e pesquisadores no mesmo ambiente autenticado.',
    text: 'A plataforma organiza perfis reais e usa o backend como fonte de verdade para a integracao.',
  },
  {
    eyebrow: 'Pesquisas autenticadas',
    title: 'Demandas reais agora usam o recurso de pesquisa do backend.',
    text: 'A publicacao autentica trabalha com titulo, escopo, objetivo, justificativa, resultados, prazo e orcamento.',
  },
  {
    eyebrow: 'Evolucao controlada',
    title: 'O front nao finge fluxos que o backend ainda nao sustenta.',
    text: 'Propostas, notificacoes, status e IA continuam fora da entrega real enquanto o contrato nao existir.',
  },
  {
    eyebrow: 'Dados e indicadores',
    title: 'Leituras reais exigem contexto autenticado.',
    text: 'Indicadores e consultas protegidas aparecem com base na sessao JWT e nas respostas atuais da API.',
  },
]

const aboutOdsFacts = [
  {
    label: 'Meta 9.5',
    text: 'Fortalecer a pesquisa cientifica e ampliar capacidades tecnologicas com incentivo a inovacao.',
  },
  {
    label: 'Impacto esperado',
    text: 'Aproximar universidade e mercado para ampliar a aplicacao pratica do conhecimento.',
  },
]

export default function SobrePage() {
  return (
    <>
      <section className="about-hero">
        <div className="about-hero__glow"></div>
        <div className="about-hero__glow about-hero__glow--right"></div>

        <div className="container">
          <Reveal>
            <div className="about-hero__intro">
              <div className="about-hero__content">
                <div className="about-hero__badge">
                  <span className="badge-dot"></span>
                  Sobre a P&amp;D Connect
                </div>

                <h1 className="about-hero__title">Pesquisa aplicada conectada a industria.</h1>

                <div className="about-hero__body">
                  <p className="about-hero__text">
                    A P&amp;D Connect aproxima empresas e pesquisadores com base em contratos reais
                    da API e evolucao gradual do produto.
                  </p>

                  <div className="about-hero__support-block">
                    <span className="about-hero__support-label">Menos dispersao, mais clareza</span>
                    <p className="about-hero__support">
                      Problema, especialista e oportunidade passam a coexistir em um fluxo mais
                      claro de descoberta e colaboracao.
                    </p>
                  </div>
                </div>

                <div className="about-hero__highlights">
                  {aboutHighlights.map((item, index) => (
                    <article key={item.title} className="about-hero__highlight">
                      <div className="about-hero__highlight-top">
                        <span className="about-hero__highlight-number">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h2 className="about-hero__highlight-title">{item.title}</h2>
                      </div>
                      <p className="about-hero__highlight-text">{item.text}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal className="text-center">
            <span className="section-label">Pilares da plataforma</span>
            <h2 className="section-title">Problema, expertise e decisao no mesmo fluxo.</h2>
            <p className="section-subtitle">
              A plataforma organiza demanda, parceria e direcionamento em uma leitura mais
              objetiva.
            </p>
          </Reveal>

          <div className="about-pillars">
            {aboutPillars.map((pillar, index) => (
              <Reveal key={pillar.title}>
                <article className="about-pillar-card">
                  <div className="about-pillar-card__top">
                    <span className="about-pillar-card__index">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="about-pillar-card__eyebrow">{pillar.eyebrow}</span>
                  </div>

                  <h3 className="about-pillar-card__title">{pillar.title}</h3>
                  <p className="about-pillar-card__text">{pillar.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section about-ods-section">
        <div className="container">
          <Reveal>
            <div className="about-ods-panel">
              <div className="about-ods-panel__intro">
                <span className="section-label">ODS 9</span>
                <h2 className="section-title about-ods-panel__title">
                  Alinhada a industria e a pesquisa aplicada.
                </h2>
              </div>

              <div className="about-ods-panel__body">
                <div className="about-ods-panel__content">
                  <p className="section-subtitle about-ods-panel__text">
                    A plataforma reduz a distancia entre producao cientifica e demanda produtiva ao
                    aproximar empresas, pesquisadores e oportunidades com mais contexto.
                  </p>
                  <p className="about-ods-panel__text about-ods-panel__text--secondary">
                    Esse movimento se conecta a Meta 9.5 da ODS 9, fortalecendo pesquisa
                    cientifica, capacidade tecnologica e inovacao com impacto.
                  </p>
                </div>

                <div className="about-ods-panel__facts">
                  {aboutOdsFacts.map((fact) => (
                    <div key={fact.label} className="about-ods-panel__fact">
                      <span className="about-ods-panel__fact-label">{fact.label}</span>
                      <p className="about-ods-panel__fact-text">{fact.text}</p>
                    </div>
                  ))}
                </div>
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
                Leve sua demanda ou pesquisa para um fluxo mais{' '}
                <span className="text-gradient">conectado</span>
              </h2>
              <p className="cta-box__subtitle">
                Entre na plataforma ou cadastre uma empresa. O acesso de pesquisador depende de
                conta ja provisionada no backend atual.
              </p>
              <div className="cta-box__buttons">
                <Link to="/login" className="btn btn-primary btn-lg">
                  Entrar na plataforma
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
