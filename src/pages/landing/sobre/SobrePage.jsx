import { Link } from 'react-router-dom'
import Reveal from '../../../components/Reveal'
import './SobrePage.scss'

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

                <p className="about-hero__text">
                  A P&amp;D Connect aproxima empresas e pesquisadores em uma experiencia simples.
                </p>
              </div>

              <div className="about-hero__support-block">
                <span className="about-hero__support-label">Menos dispersao, mais clareza</span>
                <p className="about-hero__support">
                  Problema, especialista e oportunidade passam a coexistir em um fluxo mais claro
                  de descoberta e colaboracao.
                </p>
              </div>
            </div>
          </Reveal>
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
    </>
  )
}
