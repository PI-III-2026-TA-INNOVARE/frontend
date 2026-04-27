import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Reveal from '../../../components/Reveal'
import { useAuth } from '../../../context/AuthContext'
import {
  listCompanies,
  listEducations,
  listExperiences,
  listResearchers,
  listResearches,
  listResumes,
  listSkills,
  listUniversities,
} from '../../../services/pdConnectApi'
import './IndicadoresPage.scss'

function formatMetric(value) {
  return new Intl.NumberFormat('pt-BR').format(value || 0)
}

function buildHeight(value, total) {
  if (!total) {
    return '22%'
  }

  return `${Math.max(22, Math.round((value / total) * 100))}%`
}

function readSettledValue(result, fallback) {
  return result?.status === 'fulfilled' ? result.value : fallback
}

function IndicatorCard({ item, shouldReduceMotion }) {
  return (
    <article className="indicador-card">
      <span className="indicador-card__eyebrow">{item.eyebrow}</span>
      <div className="indicador-card__value">{item.value}</div>
      <p className="indicador-card__label">{item.label}</p>
      <div className="indicador-card__bar" aria-hidden="true">
        <motion.div
          className="indicador-card__bar-fill"
          style={{ width: `${item.progress}%`, transformOrigin: 'left center' }}
          initial={shouldReduceMotion ? { scaleX: 1 } : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.45 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </article>
  )
}

function DistributionChart({ eyebrow, title, subtitle, items, secondary = false, shouldReduceMotion }) {
  return (
    <article className="chart-panel">
      <div className="chart-panel__head">
        <span className="chart-panel__eyebrow">{eyebrow}</span>
        <h3 className="chart-panel__title">{title}</h3>
        <p className="chart-panel__subtitle">{subtitle}</p>
      </div>
      <div className="chart-bars" aria-hidden="true">
        {items.map((item, index) => (
          <div key={item.label} className="chart-bar">
            <div className="chart-bar__track">
              <motion.div
                className={`chart-bar__fill${secondary ? ' chart-bar__fill--secondary' : ''}`}
                initial={shouldReduceMotion ? { height: item.height } : { height: '0%' }}
                whileInView={{ height: item.height }}
                viewport={{ once: true, amount: 0.4 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.55, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className="chart-bar__meta">
              <span className="chart-bar__value">{item.value}</span>
              <span className="chart-bar__label">{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

export default function IndicadoresPage() {
  const shouldReduceMotion = useReducedMotion()
  const { isAuthenticated, isBootstrapping } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [partialWarnings, setPartialWarnings] = useState([])
  const [metrics, setMetrics] = useState({
    companies: [],
    researchers: [],
    universities: [],
    researches: [],
    resumes: [],
    educations: [],
    experiences: [],
    skills: [],
  })

  useEffect(() => {
    let isMounted = true

    if (!isAuthenticated) {
      setLoading(false)
      setError('')
      setPartialWarnings([])
      setMetrics({
        companies: [],
        researchers: [],
        universities: [],
        researches: [],
        resumes: [],
        educations: [],
        experiences: [],
        skills: [],
      })
      return () => {
        isMounted = false
      }
    }

    const loadMetrics = async () => {
      setLoading(true)
      setError('')
      setPartialWarnings([])

      try {
        const metricRequests = [
          listCompanies(),
          listResearchers(),
          listUniversities(),
          listResearches(),
          listResumes(),
          listEducations(),
          listExperiences(),
          listSkills(),
        ]
        const metricLabels = [
          'empresas',
          'pesquisadores',
          'universidades',
          'pesquisas',
          'curriculos',
          'formacoes',
          'experiencias',
          'habilidades',
        ]
        const metricResults = await Promise.allSettled(metricRequests)
        const [
          companiesResult,
          researchersResult,
          universitiesResult,
          researchesResult,
          resumesResult,
          educationsResult,
          experiencesResult,
          skillsResult,
        ] = metricResults
        const companies = readSettledValue(companiesResult, [])
        const researchers = readSettledValue(researchersResult, [])
        const universities = readSettledValue(universitiesResult, [])
        const researches = readSettledValue(researchesResult, [])
        const resumes = readSettledValue(resumesResult, [])
        const educations = readSettledValue(educationsResult, [])
        const experiences = readSettledValue(experiencesResult, [])
        const skills = readSettledValue(skillsResult, [])
        const failedMetrics = metricResults
          .map((result, index) => result.status === 'rejected' ? metricLabels[index] : '')
          .filter(Boolean)

        if (!isMounted) {
          return
        }

        setMetrics({
          companies,
          researchers,
          universities,
          researches,
          resumes,
          educations,
          experiences,
          skills,
        })
        setPartialWarnings(
          failedMetrics.map((label) => `Nao foi possivel carregar ${label}.`)
        )
      } catch (loadFailure) {
        if (!isMounted) {
          return
        }

        setError(
          loadFailure.message || 'Nao foi possivel consolidar os indicadores.'
        )
        setPartialWarnings([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadMetrics()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  const companyCount = metrics.companies.length
  const researcherCount = metrics.researchers.length
  const universityCount = metrics.universities.length
  const researchCount = metrics.researches.length
  const activeCompanies = metrics.companies.filter((item) => item.status === true).length
  const availableResearchers = metrics.researchers.filter((item) => item.availability === true).length
  const activeResearchers = metrics.researchers.filter((item) => item.status === true).length

  const overviewIndicators = useMemo(() => ([
    {
      eyebrow: 'Empresas',
      value: formatMetric(companyCount),
      label: 'Empresas cadastradas',
      progress: companyCount ? 100 : 16,
    },
    {
      eyebrow: 'Pesquisadores',
      value: formatMetric(researcherCount),
      label: 'Pesquisadores cadastrados',
      progress: researcherCount ? 100 : 16,
    },
    {
      eyebrow: 'Universidades',
      value: formatMetric(universityCount),
      label: 'Instituicoes registradas',
      progress: universityCount ? 100 : 16,
    },
    {
      eyebrow: 'Pesquisas',
      value: formatMetric(researchCount),
      label: 'Pesquisas publicadas',
      progress: researchCount ? 100 : 16,
    },
    {
      eyebrow: 'Curriculos',
      value: formatMetric(metrics.resumes.length),
      label: 'Curriculos criados',
      progress: metrics.resumes.length ? 100 : 16,
    },
  ]), [companyCount, metrics.resumes.length, researcherCount, researchCount, universityCount])

  const secondaryIndicators = useMemo(() => ([
    {
      eyebrow: 'Formacoes',
      value: formatMetric(metrics.educations.length),
      label: 'Formacoes cadastradas',
      progress: metrics.educations.length ? 100 : 16,
    },
    {
      eyebrow: 'Experiencias',
      value: formatMetric(metrics.experiences.length),
      label: 'Experiencias cadastradas',
      progress: metrics.experiences.length ? 100 : 16,
    },
    {
      eyebrow: 'Habilidades',
      value: formatMetric(metrics.skills.length),
      label: 'Habilidades disponiveis',
      progress: metrics.skills.length ? 100 : 16,
    },
    {
      eyebrow: 'Disponibilidade',
      value: `${researcherCount ? Math.round((availableResearchers / researcherCount) * 100) : 0}%`,
      label: 'Pesquisadores marcados como disponiveis',
      progress: researcherCount ? Math.round((availableResearchers / researcherCount) * 100) : 16,
    },
  ]), [
    availableResearchers,
    metrics.educations.length,
    metrics.experiences.length,
    metrics.skills.length,
    researcherCount,
  ])

  const researchersByUniversity = useMemo(() => {
    const counts = metrics.universities.map((university) => {
      const linkedResearchers = metrics.researchers.filter(
        (researcher) => researcher.university === university.id_university
      ).length

      return {
        label: university.name,
        value: linkedResearchers,
      }
    })

    const totalLinkedResearchers = counts.reduce((sum, item) => sum + item.value, 0)

    return counts
      .sort((left, right) => right.value - left.value)
      .slice(0, 5)
      .map((item) => ({
        label: item.label,
        value: `${item.value} pesquisador(es)`,
        height: buildHeight(item.value, totalLinkedResearchers),
      }))
  }, [metrics.researchers, metrics.universities])

  const statusDistribution = useMemo(() => {
    const inactiveCompanies = companyCount - activeCompanies
    const unavailableResearchers = researcherCount - availableResearchers

    const items = [
      {
        label: 'Empresas ativas',
        value: `${activeCompanies}`,
        raw: activeCompanies,
      },
      {
        label: 'Empresas inativas',
        value: `${inactiveCompanies}`,
        raw: inactiveCompanies,
      },
      {
        label: 'Pesquisadores ativos',
        value: `${activeResearchers}`,
        raw: activeResearchers,
      },
      {
        label: 'Pesquisadores disponiveis',
        value: `${availableResearchers}`,
        raw: availableResearchers,
      },
      {
        label: 'Pesquisadores indisponiveis',
        value: `${unavailableResearchers}`,
        raw: unavailableResearchers,
      },
    ]

    const maxValue = Math.max(...items.map((item) => item.raw), 0)

    return items.map((item) => ({
      label: item.label,
      value: item.value,
      height: buildHeight(item.raw, maxValue),
    }))
  }, [activeCompanies, activeResearchers, availableResearchers, companyCount, researcherCount])

  const showPublicFallback = !isAuthenticated && !isBootstrapping

  return (
    <>
      <section className="page-header">
        <div className="container">
          <span className="section-label">Indicadores</span>
          <h1 className="page-header__title">
            Numeros da <span className="text-gradient">P&amp;D Connect</span>
          </h1>
          <p className="page-header__text">Acompanhe cadastros, pesquisas e curriculos.</p>
        </div>
      </section>

      <section className="section indicators-stage">
        <div className="container">
          {isBootstrapping ? (
            <div className="indicators-feedback">
              <h2>Preparando sessao</h2>
              <p>Verificando seu acesso.</p>
            </div>
          ) : null}

          {showPublicFallback ? (
            <div className="indicators-feedback">
              <h2>Entre para ver os indicadores</h2>
              <p>Os numeros da plataforma ficam disponiveis apos o login.</p>
            </div>
          ) : null}

          {isAuthenticated && loading ? (
            <div className="indicators-feedback">
              <h2>Carregando indicadores</h2>
              <p>Montando cards e graficos.</p>
            </div>
          ) : null}

          {isAuthenticated && !loading && error ? (
            <div className="indicators-feedback indicators-feedback--error">
              <h2>Falha ao carregar indicadores</h2>
              <p>{error}</p>
            </div>
          ) : null}

          {isAuthenticated && !loading && !error && partialWarnings.length > 0 ? (
            <div className="indicators-feedback">
              <h2>Indicadores carregados parcialmente</h2>
              <p>{partialWarnings.join(' ')}</p>
            </div>
          ) : null}

          {isAuthenticated && !loading && !error ? (
            <>
              <div className="indicadores__grid">
                {overviewIndicators.map((item) => (
                  <Reveal key={item.label}>
                    <IndicatorCard item={item} shouldReduceMotion={shouldReduceMotion} />
                  </Reveal>
                ))}
              </div>

              <div className="indicators__charts">
                <Reveal>
                  <DistributionChart
                    eyebrow="Universidades vinculadas"
                    title="Pesquisadores por universidade"
                    subtitle="Top 5 instituicoes por pesquisadores vinculados."
                    items={researchersByUniversity.length > 0 ? researchersByUniversity : [
                      { label: 'Sem dados', value: '0', height: '22%' },
                    ]}
                    shouldReduceMotion={shouldReduceMotion}
                  />
                </Reveal>

                <Reveal>
                  <DistributionChart
                    eyebrow="Status dos cadastros"
                    title="Empresas e pesquisadores por disponibilidade"
                    subtitle="Distribuicao de status e disponibilidade."
                    items={statusDistribution}
                    secondary
                    shouldReduceMotion={shouldReduceMotion}
                  />
                </Reveal>
              </div>

              <div className="indicadores__grid indicadores__grid--secondary">
                {secondaryIndicators.map((item) => (
                  <Reveal key={item.label}>
                    <IndicatorCard item={item} shouldReduceMotion={shouldReduceMotion} />
                  </Reveal>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="section cta-section">
        <div className="container">
          <Reveal>
            <div className="cta-box">
              <h2 className="cta-box__title">
                Continue navegando pela <span className="text-gradient">plataforma</span>
              </h2>
              <p className="cta-box__subtitle">
                Acesse o painel, edite seu perfil ou explore pesquisas.
              </p>
              <div className="cta-box__buttons">
                {isAuthenticated ? (
                  <>
                    <Link to="/pesquisa" className="btn btn-primary btn-lg">
                      Abrir painel integrado
                    </Link>
                    <Link to="/perfil" className="btn btn-outline btn-lg">
                      Editar perfil
                    </Link>
                  </>
                ) : (
                  <Link to="/login" className="btn btn-primary btn-lg">
                    Entrar na plataforma
                  </Link>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
