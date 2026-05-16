import { useEffect, useMemo, useState } from 'react'
import { formatBooleanLabel, normalizeText } from '../../../lib/domain'
import { useAuth } from '../../../context/AuthContext'
import {
  createResearchInterest,
  getResearcherResume,
  listMyResearchInterests,
  listResearchAreas,
  listResearchers,
  listResearches,
  listUniversities,
} from '../../../services/pdConnectApi'
import './SearchPage.scss'

function getDefaultQuery(userType) {
  return userType === 'empresa'
    ? 'pesquisar por pesquisador, universidade, area ou habilidade'
    : 'pesquisar por pesquisa, area, status ou prazo'
}

function getDefaultTab(userType) {
  return userType === 'empresa' ? 'pesquisadores' : 'pesquisas'
}

function getAllowedTabs(userType) {
  return userType === 'empresa' ? ['pesquisadores'] : ['pesquisas']
}

function buildResumeLookup(researchers, resumeResults) {
  return researchers.reduce((lookup, researcher, index) => {
    const response = resumeResults[index]

    lookup[researcher.id_researcher] =
      response?.status === 'fulfilled' ? response.value : null

    return lookup
  }, {})
}

function buildUniversityLookup(universities) {
  return universities.reduce((lookup, item) => {
    lookup[item.id_university] = item
    return lookup
  }, {})
}

function buildResearchAreaLookup(researchAreas) {
  return researchAreas.reduce((lookup, item) => {
    lookup[item.id_area] = item
    return lookup
  }, {})
}

function buildInterestLookup(interests) {
  return interests.reduce((lookup, item) => {
    lookup[item.research_id] = item
    return lookup
  }, {})
}

function readSettledValue(result, fallback) {
  return result?.status === 'fulfilled' ? result.value : fallback
}

function formatDeadlineLabel(value) {
  if (!value) {
    return 'prazo nao informado'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(parsed)
}

export default function SearchPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [activeTab, setActiveTab] = useState(() => getDefaultTab(user?.type))
  const [loading, setLoading] = useState(true)
  const [interestLoading, setInterestLoading] = useState('')
  const [error, setError] = useState('')
  const [partialWarnings, setPartialWarnings] = useState([])
  const [interestMessage, setInterestMessage] = useState('')
  const [catalog, setCatalog] = useState({
    companies: [],
    researchers: [],
    researches: [],
    researchAreas: [],
    universities: [],
    myInterests: [],
    resumeLookup: {},
  })
  const allowedTabs = useMemo(() => getAllowedTabs(user?.type), [user?.type])
  const searchPlaceholder = useMemo(() => getDefaultQuery(user?.type), [user?.type])

  useEffect(() => {
    setActiveTab(getDefaultTab(user?.type))
  }, [user?.type])

  useEffect(() => {
    let isMounted = true

    const loadCatalog = async () => {
      setLoading(true)
      setError('')
      setPartialWarnings([])

      try {
        const isCompanyUser = user?.type === 'empresa'
        const catalogRequests = isCompanyUser
          ? [
              listResearchers(),
              listResearchAreas(),
              listUniversities(),
            ]
          : [
              listResearches(),
              listResearchAreas(),
              listMyResearchInterests(),
            ]
        const catalogLabels = isCompanyUser
          ? [
              'pesquisadores',
              'areas de pesquisa',
              'universidades',
            ]
          : [
              'pesquisas',
              'areas de pesquisa',
              'interesses do pesquisador',
            ]
        const catalogResults = await Promise.allSettled(catalogRequests)
        const companies = []
        const researchers = isCompanyUser ? readSettledValue(catalogResults[0], []) : []
        const researches = isCompanyUser ? [] : readSettledValue(catalogResults[0], [])
        const researchAreas = readSettledValue(catalogResults[1], [])
        const universities = isCompanyUser ? readSettledValue(catalogResults[2], []) : []
        const myInterests = isCompanyUser ? [] : readSettledValue(catalogResults[2], [])

        const resumeResults = isCompanyUser
          ? await Promise.allSettled(
              researchers.map((item) => getResearcherResume(item.id_researcher))
            )
          : []
        const failedCatalogs = catalogResults
          .map((result, index) => result.status === 'rejected' ? catalogLabels[index] : '')
          .filter(Boolean)

        if (!isMounted) {
          return
        }

        setCatalog({
          companies,
          researchers,
          researches,
          researchAreas,
          universities,
          myInterests,
          resumeLookup: buildResumeLookup(researchers, resumeResults),
        })
        setPartialWarnings([
          ...failedCatalogs.map((label) => `Nao foi possivel carregar ${label}.`),
        ])
      } catch (loadFailure) {
        if (!isMounted) {
          return
        }

        setError(
          loadFailure.message || 'Nao foi possivel carregar os dados do painel.'
        )
        setPartialWarnings([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadCatalog()

    return () => {
      isMounted = false
    }
  }, [user?.type])

  const universityLookup = useMemo(
    () => buildUniversityLookup(catalog.universities),
    [catalog.universities]
  )

  const researchAreaLookup = useMemo(
    () => buildResearchAreaLookup(catalog.researchAreas),
    [catalog.researchAreas]
  )

  const interestLookup = useMemo(
    () => buildInterestLookup(catalog.myInterests),
    [catalog.myInterests]
  )

  const researcherItems = useMemo(() => (
    catalog.researchers.map((researcher) => {
      const university = universityLookup[researcher.university]
      const resume = catalog.resumeLookup[researcher.id_researcher]
      const areaTags = (researcher.area || [])
        .map((areaId) => researchAreaLookup[areaId]?.name)
        .filter(Boolean)

      return {
        id: `researcher-${researcher.id_researcher}`,
        type: 'pesquisador',
        title: researcher.name,
        subtitle: university?.name || 'Universidade nao identificada',
        description:
          `Disponibilidade: ${formatBooleanLabel(researcher.availability, {
            trueLabel: 'disponivel',
            falseLabel: 'indisponivel',
            nullLabel: 'nao informada',
          })}. ` +
          `Status do cadastro: ${formatBooleanLabel(researcher.status, {
            trueLabel: 'ativo',
            falseLabel: 'inativo',
            nullLabel: 'nao informado',
          })}.`,
        tags: [
          university?.name || 'Universidade nao localizada',
          `${resume?.education?.length || 0} formacoes`,
          `${resume?.experience?.length || 0} experiencias`,
          ...areaTags,
          ...(resume?.skill || []).slice(0, 2).map((item) => item.description),
        ],
      }
    })
  ), [catalog.researchers, catalog.resumeLookup, researchAreaLookup, universityLookup])

  const researchItems = useMemo(() => (
    catalog.researches.map((research) => {
      const areaName = researchAreaLookup[research.area]?.name || 'Area nao identificada'
      const interest = interestLookup[research.id_research]
      const canShowInterestAction = user?.type === 'pesquisador'
      const companyLabel = research.company
        ? `Empresa #${research.company}`
        : 'Empresa nao identificada'

      return {
        id: `research-${research.id_research}`,
        type: 'pesquisa',
        title: research.title,
        subtitle: `${companyLabel} | ${areaName}`,
        description:
          `${research.goal || 'Objetivo nao informado'} ` +
          `Prazo: ${formatDeadlineLabel(research.deadline)}. ` +
          `Orcamento: ${research.budget || 'nao informado'}.`,
        tags: [
          areaName,
          research.status || 'status nao informado',
          interest ? `Interesse: ${interest.status}` : 'Sem interesse registrado',
        ],
        action: canShowInterestAction
          ? {
              researchId: research.id_research,
              disabled: Boolean(interest),
              label: interest ? `Interesse ${interest.status}` : 'Tenho interesse',
            }
          : null,
      }
    })
  ), [catalog.researches, interestLookup, researchAreaLookup, user?.type])

  const visibleItems = useMemo(() => {
    const sourceMap = {
      pesquisas: researchItems,
      pesquisadores: researcherItems,
    }

    const resolvedTab = allowedTabs.includes(activeTab) ? activeTab : getDefaultTab(user?.type)
    const source = sourceMap[resolvedTab] || []
    const normalizedQuery = normalizeText(activeQuery)

    if (!normalizedQuery) {
      return source
    }

    return source.filter((item) => normalizeText([
      item.title,
      item.subtitle,
      item.description,
      ...item.tags,
    ].join(' ')).includes(normalizedQuery))
  }, [activeQuery, activeTab, allowedTabs, researcherItems, researchItems, user?.type])

  const handleSubmit = (event) => {
    event.preventDefault()
    setActiveQuery(query.trim())
  }

  const handleResearchInterest = async (researchId) => {
    setInterestLoading(String(researchId))
    setInterestMessage('')
    setError('')

    try {
      await createResearchInterest(researchId)
      const myInterests = await listMyResearchInterests()
      setCatalog((current) => ({
        ...current,
        myInterests,
      }))
      setInterestMessage('Interesse registrado para a pesquisa selecionada.')
    } catch (interestError) {
      setError(interestError.message || 'Nao foi possivel registrar interesse nesta pesquisa.')
    } finally {
      setInterestLoading('')
    }
  }

  return (
    <section className="app-page app-search-page">
      <div className="container app-page__container app-search-page__container">
        <div className="app-search-layout">
          <aside className="semantic-panel">
            <div className="semantic-panel__block">
              <h3 className="semantic-panel__title">Filtrar por</h3>
              <div className="semantic-panel__chips">
                {allowedTabs.includes('pesquisas') ? (
                  <button
                    type="button"
                    className={`semantic-chip semantic-chip--button${activeTab === 'pesquisas' ? ' active' : ''}`}
                    onClick={() => setActiveTab('pesquisas')}
                  >
                    Pesquisas
                  </button>
                ) : null}
                {allowedTabs.includes('pesquisadores') ? (
                  <button
                    type="button"
                    className={`semantic-chip semantic-chip--button${activeTab === 'pesquisadores' ? ' active' : ''}`}
                    onClick={() => setActiveTab('pesquisadores')}
                  >
                    Pesquisadores
                  </button>
                ) : null}
              </div>
            </div>
          </aside>

          <main className="search-feed">
            <header className="search-feed__header">
              <div>
                <h1 className="app-page__title search-feed__title">Pesquisar</h1>
              </div>
             
            </header>

            <form className="app-search-form" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="catalog-search">
                Filtrar dados da plataforma
              </label>
              <input
                id="catalog-search"
                className="app-search-form__input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
              />
              <button type="submit" className="btn btn-primary app-search-form__button">
                Buscar
              </button>
            </form>

            <div className="search-results">
            <div className="search-results__header">
              <div>
                <span className="section-label">Resultado atual</span>
                <h2 className="search-results__title">
                  {activeTab === 'pesquisas'
                    ? 'Base de pesquisas'
                    : 'Base de pesquisadores'}
                </h2>
              </div>
              <p className="search-results__meta">
                {visibleItems.length} item(ns) encontrados{activeQuery ? ` para "${activeQuery}"` : '.'}
              </p>
            </div>

            {interestMessage ? (
              <div className="search-feedback-card">
                <h3>Interesse atualizado</h3>
                <p>{interestMessage}</p>
              </div>
            ) : null}

            {loading ? (
              <div className="search-feedback-card">
                <h3>Carregando dados</h3>
                <p>Buscando registros disponiveis.</p>
              </div>
            ) : null}

            {!loading && error ? (
              <div className="search-feedback-card search-feedback-card--error">
                <h3>Falha ao carregar o painel</h3>
                <p>{error}</p>
              </div>
            ) : null}

            {!loading && !error && partialWarnings.length > 0 ? (
              <div className="search-feedback-card">
                <h3>Painel carregado parcialmente</h3>
                <p>{partialWarnings.join(' ')}</p>
              </div>
            ) : null}

            {!loading && !error && visibleItems.length === 0 ? (
              <div className="search-feedback-card">
                <h3>Nenhum resultado encontrado</h3>
                <p>
                  Ajuste o filtro ou troque a colecao ativa.
                </p>
              </div>
            ) : null}

            {!loading && !error && visibleItems.length > 0 ? (
              <div className="search-results__list">
                {visibleItems.map((item) => (
                  <article key={item.id} className="search-result-card">
                    <div className="search-result-card__top">
                      <span className={`search-result-card__type search-result-card__type--${item.type}`}>
                        {item.type === 'pesquisador'
                          ? 'Pesquisador'
                          : item.type === 'empresa'
                            ? 'Empresa'
                            : item.type === 'pesquisa'
                              ? 'Pesquisa'
                              : 'Universidade'}
                      </span>
                    </div>

                    <h3 className="search-result-card__title">{item.title}</h3>
                    <p className="search-result-card__subtitle">{item.subtitle}</p>
                    <p className="search-result-card__text">{item.description}</p>

                    <div className="search-result-card__tags">
                      {item.tags.map((tag) => (
                        <span key={`${item.id}-${tag}`} className="search-result-card__tag">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {item.action ? (
                      <button
                        type="button"
                        className="btn btn-primary search-result-card__button"
                        onClick={() => handleResearchInterest(item.action.researchId)}
                        disabled={
                          item.action.disabled ||
                          interestLoading === String(item.action.researchId)
                        }
                      >
                        {interestLoading === String(item.action.researchId)
                          ? 'Registrando...'
                          : item.action.label}
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : null}
            </div>
          </main>
        </div>
      </div>
    </section>
  )
}
