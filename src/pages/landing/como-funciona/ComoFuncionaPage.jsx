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
    title: 'A plataforma agora comeca pelo contrato real da API.',
    text: 'O fluxo atual usa autenticacao JWT real. Empresas podem se cadastrar publicamente, enquanto pesquisadores acessam contas ja vinculadas no backend.',
    details: [
      {
        label: 'Empresas',
        text: 'Criam acesso pelo cadastro publico e entram com credenciais reais em /api/auth/token/.',
      },
      {
        label: 'Pesquisadores',
        text: 'Entram com credenciais reais e o perfil e hidratado a partir de /api/auth/profile/.',
      },
    ],
    tags: [
      { label: 'JWT' },
      { label: 'Empresa' },
      { label: 'Pesquisador' },
      { label: 'Perfil' },
      { label: 'Curriculo' },
    ],
  },
  {
    id: 'exploracao',
    step: '02',
    eyebrow: 'Exploracao autenticada',
    title: 'A area autenticada le a base real protegida pela API.',
    text: 'O painel integrado consulta empresas, pesquisadores, universidades, areas de pesquisa e curriculos reais antes de aplicar o filtro textual local.',
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
    title: 'Empresas autenticadas ja podem publicar pesquisas reais.',
    text: 'A criacao usa o recurso /api/research/, com vinculacao de pesquisador, area, prazo e orcamento definidos pelo contrato atual do backend.',
    tags: [
      { label: 'Research' },
      { label: 'Deadline' },
      { label: 'Budget' },
      { label: 'Area' },
      { label: 'Pesquisador' },
    ],
  },
  {
    id: 'roadmap',
    step: '04',
    eyebrow: 'Evolucao do produto',
    title: 'Alguns fluxos seguem como roadmap e nao sao simulados no front.',
    text: 'Propostas, match por IA, notificacoes e acompanhamento completo continuam dependendo de rotas reais do backend antes de virarem experiencia definitiva.',
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
    title: 'Leitura integrada da base',
    text: 'Consolida perfis, universidades, curriculos e areas a partir dos endpoints reais protegidos.',
  },
  {
    icon: appIcons.indicators,
    title: 'Leitura de indicadores',
    text: 'Mostra metricas reais apenas quando existe sessao autenticada valida.',
    iconModifier: 'feature-card__icon--secondary',
  },
  {
    icon: appIcons.security,
    title: 'Seguranca de sessao',
    text: 'Mantem access token, refresh controlado e logout limpo para os fluxos protegidos.',
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
            Do <span className="text-gradient">acesso real</span> a uma{' '}
            <span className="text-gradient">integracao confiavel</span>
          </h1>
          <p className="page-header__text">
            A jornada atual da plataforma mostra o que ja funciona com o backend novo e o que ainda
            permanece em evolucao.
          </p>
        </div>
      </section>

      <section className="section process-journey">
        <div className="container">
          <Reveal className="text-center process-journey__intro">
            <span className="section-label">Fluxo da Plataforma</span>
            <h2 className="section-title">Quatro etapas para operar com o backend real.</h2>
            <p className="section-subtitle">
              Um fluxo claro para autenticar, explorar, publicar e evoluir sem mascarar limitacoes.
            </p>
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
              Mais contexto para <span className="text-gradient">decidir</span>
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
                Entre na plataforma ou cadastre uma empresa conforme o contrato atual da API.
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
