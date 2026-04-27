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
        text: 'Selecionam universidade e completam o curriculo depois.',
      },
    ],
    tags: [
      { label: 'Acesso' },
      { label: 'Empresa' },
      { label: 'Pesquisador' },
      { label: 'Perfil' },
      { label: 'Curriculo' },
    ],
  },
  {
    id: 'exploracao',
    step: '02',
    eyebrow: 'Exploracao',
    title: 'Navegue pela base da plataforma.',
    text: 'Use filtros para encontrar pesquisadores, empresas, universidades e pesquisas.',
    tags: [
      { label: 'Empresas' },
      { label: 'Pesquisadores' },
      { label: 'Universidades' },
      { label: 'Areas' },
      { label: 'Indicadores' },
    ],
  },
  {
    id: 'pesquisas',
    step: '03',
    eyebrow: 'Publicacao de pesquisas',
    title: 'Publique pesquisas e acompanhe interesse.',
    text: 'Empresas criam demandas e visualizam candidatos vinculados.',
    tags: [
      { label: 'Research' },
      { label: 'Deadline' },
      { label: 'Budget' },
      { label: 'Area' },
      { label: 'Candidatos' },
    ],
  },
  {
    id: 'roadmap',
    step: '04',
    eyebrow: 'Evolucao',
    title: 'Novos fluxos entram quando estiverem prontos.',
    text: 'Propostas, notificacoes e IA seguem como proximos passos.',
    tags: [
      { label: 'Propostas', tone: 'warning' },
      { label: 'Notificacoes', tone: 'warning' },
      { label: 'IA', tone: 'warning' },
      { label: 'Roadmap', tone: 'secondary' },
    ],
  },
]

const resourceCards = [
  {
    icon: appIcons.matchmaking,
    title: 'Base integrada',
    text: 'Perfis, universidades, curriculos e areas no mesmo painel.',
  },
  {
    icon: appIcons.proposals,
    title: 'Pesquisas e interesses',
    text: 'Demandas publicadas e candidatos acompanhados pela empresa.',
  },
  {
    icon: appIcons.security,
    title: 'Sessao segura',
    text: 'Acesso protegido e logout claro.',
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
      <section className="page-header">
        <div className="container">
          <span className="section-label">Como Funciona</span>
          <h1 className="page-header__title">
            Do <span className="text-gradient">cadastro</span> a uma{' '}
            <span className="text-gradient">conexao ativa</span>
          </h1>
          <p className="page-header__text">Um fluxo direto para entrar, explorar e publicar.</p>
        </div>
      </section>

      <section className="section process-journey">
        <div className="container">
          <Reveal className="text-center process-journey__intro">
            <span className="section-label">Fluxo da Plataforma</span>
            <h2 className="section-title">Quatro etapas principais.</h2>
            <p className="section-subtitle">Acoes claras para cada perfil.</p>
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
                >
                  <span className="process-journey__overview-number">{step.step}</span>
                  <h3 className="process-journey__overview-title">{step.eyebrow}</h3>
                </button>
              ))}
            </div>
          </Reveal>

          <div className="process-journey__stack">
            <div className="process-step-carousel">
              <div className="process-step-carousel__controls">
                <button
                  type="button"
                  className="process-step-carousel__button"
                  onClick={() => goToStep(activeStepIndex - 1)}
                  disabled={activeStepIndex === 0}
                  aria-label="Etapa anterior"
                >
                  <IconBadge icon={appIcons.previous} className="process-step-carousel__button-icon" />
                  <span>Anterior</span>
                </button>

                <div className="process-step-carousel__status" aria-live="polite">
                  <span className="process-step-carousel__status-current">{activeStep.step}</span>
                  <span className="process-step-carousel__status-separator">/</span>
                  <span className="process-step-carousel__status-total">{totalSteps}</span>
                </div>

                <button
                  type="button"
                  className="process-step-carousel__button"
                  onClick={() => goToStep(activeStepIndex + 1)}
                  disabled={activeStepIndex === journeySteps.length - 1}
                  aria-label="Proxima etapa"
                >
                  <span>Proxima</span>
                  <IconBadge icon={appIcons.next} className="process-step-carousel__button-icon" />
                </button>
              </div>

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
              Recursos para <span className="text-gradient">acompanhar</span>
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
                Comece sua <span className="text-gradient">entrada segura</span>
              </h2>
              <p className="cta-box__subtitle">
                Entre ou cadastre sua empresa para comecar.
              </p>
              <div className="cta-box__buttons">
                <Link to="/login" className="btn btn-primary btn-lg">
                  Entrar na plataforma
                </Link>
                <Link to="/login#cadastro" className="btn btn-outline btn-lg">
                  Cadastrar empresa
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
