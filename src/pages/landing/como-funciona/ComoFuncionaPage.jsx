import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import IconBadge from '../../../components/IconBadge'
import Reveal from '../../../components/Reveal'
import { appIcons } from '../../../lib/icons'
import './ComoFuncionaPage.scss'

const journeySteps = [
  {
    id: 'cadastro',
    step: '01',
    eyebrow: 'Acesso e perfis',
    title: 'Crie sua conta e complete o perfil.',
    text: 'Empresas e pesquisadores entram na plataforma com dados essenciais.',
    details: [
      {
        label: 'Empresas',
        text: 'Informam CNPJ, e-mail e senha.',
      },
      {
        label: 'Pesquisadores',
        text: 'Selecionam universidade e completam o currículo depois.',
      },
    ],
    tags: [
      { label: 'Acesso' },
      { label: 'Empresa' },
      { label: 'Pesquisador' },
      { label: 'Perfil' },
      { label: 'Currículo' },
    ],
  },
  {
    id: 'exploracao',
    step: '02',
    eyebrow: 'Exploração',
    title: 'Navegue pela base da plataforma.',
    text: 'Use filtros para encontrar pesquisadores, empresas, universidades e pesquisas.',
    tags: [
      { label: 'Empresas' },
      { label: 'Pesquisadores' },
      { label: 'Universidades' },
      { label: 'Áreas' },
      { label: 'Indicadores' },
    ],
  },
  {
    id: 'pesquisas',
    step: '03',
    eyebrow: 'Publicação de pesquisas',
    title: 'Publique pesquisas e acompanhe interesse.',
    text: 'Empresas criam demandas e visualizam candidatos vinculados.',
    tags: [
      { label: 'Research' },
      { label: 'Deadline' },
      { label: 'Budget' },
      { label: 'Área' },
      { label: 'Candidatos' },
    ],
  },
  {
    id: 'roadmap',
    step: '04',
    eyebrow: 'Evolução',
    title: 'Novos fluxos entram quando estiverem prontos.',
    text: 'Propostas, notificações e IA seguem como próximos passos.',
    tags: [
      { label: 'Propostas', tone: 'warning' },
      { label: 'Notificações', tone: 'warning' },
      { label: 'IA', tone: 'warning' },
      { label: 'Roadmap', tone: 'secondary' },
    ],
  },
]

const resourceCards = [
  {
    icon: appIcons.matchmaking,
    title: 'Base integrada',
    text: 'Perfis, universidades, currículos e áreas no mesmo painel.',
  },
  {
    icon: appIcons.proposals,
    title: 'Demandas e interesses',
    text: 'Demandas publicadas e candidatos organizados para acompanhamento.',
  },
  {
    icon: appIcons.security,
    title: 'Acesso seguro',
    text: 'Ambiente protegido para acessar, acompanhar e sair com clareza.',
    iconModifier: 'feature-card__icon--warm',
  },
]

export default function ComoFuncionaPage() {
  const shouldReduceMotion = useReducedMotion()
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [direction, setDirection] = useState(1)

  const totalSteps = String(journeySteps.length).padStart(2, '0')
  const activeStep = journeySteps[activeStepIndex]
  const carouselTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.34, ease: [0.22, 1, 0.36, 1] }

  function goToStep(nextIndex) {
    if (nextIndex < 0 || nextIndex >= journeySteps.length || nextIndex === activeStepIndex) return
    setDirection(nextIndex > activeStepIndex ? 1 : -1)
    setActiveStepIndex(nextIndex)
  }

  return (
    <>
      <section className="section process-journey">
        <div className="container">
          <Reveal className="text-center process-journey__intro">
            <span className="section-label">Fluxo da plataforma</span>
            <h2 className="section-title">Quatro etapas principais.</h2>
            <p className="section-subtitle">Um fluxo direto para entrar, explorar e publicar.</p>
          </Reveal>

          <Reveal>
            <div className="process-journey__overview">
              {journeySteps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  className={`process-journey__overview-item${
                    index === activeStepIndex ? ' process-journey__overview-item--active' : ''
                  }`}
                  onClick={() => goToStep(index)}
                  aria-current={index === activeStepIndex ? 'step' : undefined}
                  aria-label={`Ver etapa ${step.step}: ${step.eyebrow}`}
                >
                  <span className="process-journey__overview-number">{step.step}</span>
                  <h3 className="process-journey__overview-title">{step.eyebrow}</h3>
                </button>
              ))}
            </div>
          </Reveal>

          <div className="process-journey__stack">
            <div className="process-step-carousel">
              <AnimatePresence mode="wait" initial={false}>
                <motion.article
                  key={activeStep.id}
                  className="process-step-card"
                  initial={
                    shouldReduceMotion
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, x: direction > 0 ? 24 : -24, y: 10 }
                  }
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: direction > 0 ? -24 : 24, y: -10 }
                  }
                  transition={carouselTransition}
                >
                  <div className="process-step-card__meta">
                    <span className="process-step-card__meta-label">Etapa {activeStep.step}</span>
                    <span className="process-step-card__meta-count">
                      {activeStep.step} / {totalSteps}
                    </span>
                  </div>

                  <div className="process-step-card__header">
                    <span className="process-step-card__number">{activeStep.step}</span>
                    <div className="process-step-card__heading">
                      <p className="process-step-card__eyebrow">{activeStep.eyebrow}</p>
                      <h3 className="process-step-card__title">{activeStep.title}</h3>
                    </div>
                  </div>

                  <div className="process-step-card__layout">
                    <div className="process-step-card__copy">
                      <p className="process-step-card__text">{activeStep.text}</p>
                    </div>

                    <div
                      className={`process-step-card__support${
                        activeStep.details ? '' : ' process-step-card__support--tags-only'
                      }`}
                    >
                      {activeStep.details ? (
                        <div className="process-step-card__details">
                          {activeStep.details.map((detail) => (
                            <div key={detail.label} className="process-step-card__detail">
                              <span className="process-step-card__detail-label">{detail.label}</span>
                              <p className="process-step-card__detail-text">{detail.text}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </motion.article>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      <section className="section process-extra">
        <div className="container">
          <Reveal className="text-center">
            <span className="section-label">Recursos adicionais</span>
            <h2 className="section-title">
              Recursos que apoiam a <span className="text-gradient">conexão</span>
            </h2>
          </Reveal>

          <div className="features__grid">
            {resourceCards.map((card) => (
              <Reveal key={card.title}>
                <div className="feature-card">
                  <IconBadge icon={card.icon} className={card.iconModifier || ''} />
                  <div className="feature-card__content">
                    <h3 className="feature-card__title">{card.title}</h3>
                    <p className="feature-card__text">{card.text}</p>
                  </div>
                </div>
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
                Comece a conectar <span className="text-gradient">pesquisa e inovação</span>
              </h2>
              <p className="cta-box__subtitle">
                Entre ou crie seu cadastro para explorar oportunidades na plataforma.
              </p>
              <div className="cta-box__buttons">
                <Link to="/login#cadastro" className="btn btn-primary btn-lg">
                  Criar cadastro
                </Link>
                <Link to="/login" className="btn btn-outline btn-lg">
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
