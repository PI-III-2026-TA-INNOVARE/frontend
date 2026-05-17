import { useEffect, useMemo, useRef, useState } from 'react'
import ResearchDetailModal from '../../../components/ResearchDetailModal'
import { useAuth } from '../../../context/AuthContext'
import {
  createResearchInterest,
  getResearch,
  getResearcher,
  getUniversity,
  listMyResearchInterests,
  listResearchers,
  listResearchAreas,
  listResearches,
  searchResearch,
  searchResearchers,
} from '../../../services/pdConnectApi'
import './SearchPage.scss'

const DEFAULT_LIMIT = 20

function getDefaultQuery(userType) {
  return userType === 'empresa'
    ? 'Busque por area, universidade, experiencia ou habilidade'
    : 'Busque por tema, area, objetivo ou empresa'
}

function getResultLabel(userType) {
  return userType === 'empresa' ? 'pesquisadores' : 'pesquisas'
}

function buildInterestLookup(interests) {
  return interests.reduce((lookup, item) => {
    lookup[item.research_id] = item
    return lookup
  }, {})
}

function buildInterestedResearchSet(interests) {
  return interests.reduce((lookup, item) => {
    if (item.source === 'interest') {
      lookup.add(String(item.research_id))
    }

    return lookup
  }, new Set())
}

function readSettledValue(result, fallback) {
  return result?.status === 'fulfilled' ? result.value : fallback
}

function normalizeCompact(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function matchesResearcherDirectly(researcher, query) {
  const normalizedQuery = normalizeCompact(query)

  if (normalizedQuery.length < 3) {
    return false
  }

  const normalizedName = normalizeCompact(researcher.name)
  return normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)
}

function mergeResearcherResults(primaryResults, directResults) {
  const seenIds = new Set(primaryResults.map((item) => String(item.id_researcher)))

  return [
    ...primaryResults,
    ...directResults.filter((item) => {
      const key = String(item.id_researcher)
      if (seenIds.has(key)) {
        return false
      }

      seenIds.add(key)
      return true
    }),
  ]
}

function formatScore(value) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 'relevancia nao informada'
  }

  return `${Math.round(parsed * 100)}% de relevancia`
}

function getResearcherAreaTags(detail, researchAreaLookup) {
  const areaList = Array.isArray(detail?.area) ? detail.area : []
  const areaNames = areaList
    .map((area) => {
      if (area && typeof area === 'object') {
        const areaId = area.id_area ?? area.id
        return area.name || researchAreaLookup[String(areaId)]?.name
      }

      return researchAreaLookup[String(area)]?.name
    })
    .filter(Boolean)

  return [...new Set(areaNames)]
}

function formatCurrency(value) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 'orcamento nao informado'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(parsed)
}

function getErrorTitle(error) {
  if (error?.status === 403) {
    return 'Busca indisponivel para este perfil'
  }

  if (error?.status === 401) {
    return 'Sessao expirada'
  }

  return 'Nao foi possivel concluir a busca'
}

export default function SearchPage() {
  const { user } = useAuth()
  const searchRequestRef = useRef(0)
  const isCompanyUser = user?.type === 'empresa'
  const resultLabel = useMemo(() => getResultLabel(user?.type), [user?.type])
  const searchPlaceholder = useMemo(() => getDefaultQuery(user?.type), [user?.type])

  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('')
  const [results, setResults] = useState([])
  const [researchDetails, setResearchDetails] = useState({})
  const [researcherDetails, setResearcherDetails] = useState({})
  const [selectedResearch, setSelectedResearch] = useState(null)
  const [selectedResearcher, setSelectedResearcher] = useState(null)
  const [companyResearches, setCompanyResearches] = useState([])
  const [projectSearch, setProjectSearch] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supportLoading, setSupportLoading] = useState(true)
  const [error, setError] = useState('')
  const [errorTitle, setErrorTitle] = useState('Nao foi possivel concluir a busca')
  const [partialWarnings, setPartialWarnings] = useState([])
  const [interestLoading, setInterestLoading] = useState('')
  const [interestMessage, setInterestMessage] = useState('')
  const [researchAreas, setResearchAreas] = useState([])
  const [myInterests, setMyInterests] = useState([])

  useEffect(() => {
    let isMounted = true

    const loadSupportData = async () => {
      setSupportLoading(true)
      setPartialWarnings([])

      const requests = isCompanyUser
        ? [listResearchAreas(), listResearches()]
        : [listResearchAreas(), listMyResearchInterests()]
      const labels = isCompanyUser
        ? ['areas de pesquisa', 'pesquisas da empresa']
        : ['areas de pesquisa', 'interesses do pesquisador']

      const settledResults = await Promise.allSettled(requests)

      if (!isMounted) {
        return
      }

      setResearchAreas(readSettledValue(settledResults[0], []))
      setMyInterests(isCompanyUser ? [] : readSettledValue(settledResults[1], []))
      setCompanyResearches(
        isCompanyUser
          ? readSettledValue(settledResults[1], []).filter(
              (item) => String(item.company) === String(user?.company?.id_company)
            )
          : []
      )
      setPartialWarnings(
        settledResults
          .map((result, index) => (
            result.status === 'rejected' ? `Nao foi possivel carregar ${labels[index]}.` : ''
          ))
          .filter(Boolean)
      )
      setSupportLoading(false)
    }

    setQuery('')
    setActiveQuery('')
    setSelectedAreaId('')
    setAvailabilityFilter('')
    setResults([])
    setResearchDetails({})
    setResearcherDetails({})
    setSelectedResearch(null)
    setSelectedResearcher(null)
    setSelectedProjectId('')
    setProjectSearch('')
    setHasSearched(false)
    setLoading(false)
    setError('')
    setInterestMessage('')
    loadSupportData()

    return () => {
      isMounted = false
    }
  }, [isCompanyUser, user?.company?.id_company])

  const interestLookup = useMemo(
    () => buildInterestLookup(myInterests),
    [myInterests]
  )
  const interestedResearchIds = useMemo(
    () => buildInterestedResearchSet(myInterests),
    [myInterests]
  )

  const researchAreaLookup = useMemo(() => (
    researchAreas.reduce((lookup, area) => {
      lookup[String(area.id_area)] = area
      return lookup
    }, {})
  ), [researchAreas])

  const visibleItems = useMemo(() => {
    if (isCompanyUser) {
      return results.map((item) => {
        const detail = researcherDetails[item.id_researcher] || {}

        return {
          id: `researcher-${item.id_researcher}`,
          type: 'pesquisador',
          title: detail.name || item.name || 'Pesquisador sem nome informado',
          subtitle: detail.university_name || item.university || 'Universidade nao informada',
          tags: getResearcherAreaTags(detail, researchAreaLookup),
          detail,
          action: null,
        }
      })
    }

    return results
      .filter((item) => !interestedResearchIds.has(String(item.id_research)))
      .map((item) => {
      const interest = interestLookup[item.id_research]
      const hasResearcherInterest = interest?.source === 'interest'
      const detail = researchDetails[item.id_research] || {}
      const budget = detail.budget ?? item.budget
      const status = detail.status || item.status || 'nao informado'
      const company = item.company || 'Empresa nao informada'
      const area = item.area || 'Area nao informada'

      return {
        id: `research-${item.id_research}`,
        type: 'pesquisa',
        researchId: item.id_research,
        title: detail.title || item.title || 'Pesquisa sem titulo informado',
        company,
        area,
        status,
        budget,
        subtitle: company,
        description: `Status: ${status}. Orcamento: ${formatCurrency(budget)}.`,
        tags: [
          formatScore(item.score_hybrid),
          `Semantica ${formatScore(item.score_semantic)}`,
        ],
        detail: {
          ...item,
          ...detail,
          companyLabel: company,
          areaLabel: area,
          status,
          budget,
        },
        action: {
          researchId: item.id_research,
          disabled: hasResearcherInterest,
          label: hasResearcherInterest ? 'Interesse registrado' : 'Tenho interesse',
        },
      }
    })
  }, [interestLookup, interestedResearchIds, isCompanyUser, researchAreaLookup, researchDetails, researcherDetails, results])

  const shouldShowResults = hasSearched || loading || Boolean(error) || Boolean(interestMessage)
  const hasEmptySearchResult = hasSearched && !loading && !error && visibleItems.length === 0

  const projectGroups = useMemo(() => {
    const normalizedFilter = normalizeCompact(projectSearch)
    const filteredResearches = companyResearches.filter((research) => {
      if (!normalizedFilter) {
        return true
      }

      const areaName = researchAreaLookup[String(research.area)]?.name || ''
      return (
        normalizeCompact(research.title).includes(normalizedFilter) ||
        normalizeCompact(areaName).includes(normalizedFilter)
      )
    })

    return filteredResearches.reduce((groups, research) => {
      const areaName = researchAreaLookup[String(research.area)]?.name || 'Area nao informada'
      const existingGroup = groups.find((group) => group.areaName === areaName)

      if (existingGroup) {
        existingGroup.items.push(research)
        return groups
      }

      groups.push({ areaName, items: [research] })
      return groups
    }, [])
  }, [companyResearches, projectSearch, researchAreaLookup])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedQuery = query.trim()
    setInterestMessage('')

    if (!trimmedQuery) {
      setHasSearched(false)
      setActiveQuery('')
      setResults([])
      setResearchDetails({})
      setResearcherDetails({})
      setSelectedResearch(null)
      setSelectedResearcher(null)
      setErrorTitle('Termo de busca obrigatorio')
      setError('Digite um termo para iniciar a busca semantica.')
      return
    }

    const requestId = searchRequestRef.current + 1
    searchRequestRef.current = requestId
    setLoading(true)
    setHasSearched(true)
    setActiveQuery(trimmedQuery)
    setError('')
    setErrorTitle('Nao foi possivel concluir a busca')

    const params = {
      q: trimmedQuery,
      limit: DEFAULT_LIMIT,
      area_id: selectedAreaId,
    }

    if (isCompanyUser) {
      params.available = availabilityFilter
    } else {
      params.open_only = 'false'
    }

    try {
      const data = isCompanyUser
        ? await searchResearchers(params)
        : await searchResearch(params)

      if (searchRequestRef.current !== requestId) {
        return
      }

      let nextResults = Array.isArray(data) ? data : []
      let nextDetails = {}
      let nextResearcherDetails = {}

      if (isCompanyUser) {
        const allResearchers = await listResearchers()
        const directResearcherMatches = allResearchers.filter((researcher) => {
          if (researcher.status !== true) {
            return false
          }

          if (availabilityFilter && String(researcher.availability) !== availabilityFilter) {
            return false
          }

          if (
            selectedAreaId &&
            !(researcher.area || []).map((areaId) => String(areaId)).includes(String(selectedAreaId))
          ) {
            return false
          }

          return matchesResearcherDirectly(researcher, trimmedQuery)
        })
        const universityIds = [
          ...new Set(
            directResearcherMatches
              .map((researcher) => researcher.university)
              .filter((universityId) => universityId !== null && universityId !== undefined)
              .map((universityId) => String(universityId))
          ),
        ]
        const universityResults = await Promise.allSettled(
          universityIds.map((universityId) => getUniversity(universityId))
        )
        const universityLookup = universityResults.reduce((lookup, result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            lookup[universityIds[index]] = result.value
          }

          return lookup
        }, {})
        const directResults = directResearcherMatches.map((researcher) => ({
          id_researcher: researcher.id_researcher,
          name: researcher.name,
          university: universityLookup[String(researcher.university)]?.name || null,
          availability: researcher.availability,
          score_hybrid: 1,
          score_semantic: 0,
          score_lexical: 1,
          score_token_coverage: 1,
        }))

        if (searchRequestRef.current !== requestId) {
          return
        }

        nextResults = mergeResearcherResults(nextResults, directResults)
      }

      if (isCompanyUser && nextResults.length > 0) {
        const detailResults = await Promise.allSettled(
          nextResults.map((item) => getResearcher(item.id_researcher))
        )

        if (searchRequestRef.current !== requestId) {
          return
        }

        nextResearcherDetails = detailResults.reduce((lookup, result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            lookup[nextResults[index].id_researcher] = result.value
          }

          return lookup
        }, {})
      }

      if (!isCompanyUser && nextResults.length > 0) {
        const detailResults = await Promise.allSettled(
          nextResults.map((item) => getResearch(item.id_research))
        )

        if (searchRequestRef.current !== requestId) {
          return
        }

        nextDetails = detailResults.reduce((lookup, result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            lookup[nextResults[index].id_research] = result.value
          }

          return lookup
        }, {})
      }

      setResults(nextResults)
      setResearchDetails(nextDetails)
      setResearcherDetails(nextResearcherDetails)
      setSelectedResearch(null)
    } catch (searchError) {
      if (searchRequestRef.current !== requestId) {
        return
      }

      setResults([])
      setResearchDetails({})
      setResearcherDetails({})
      setSelectedResearch(null)
      setSelectedResearcher(null)
      setErrorTitle(getErrorTitle(searchError))
      setError(searchError.message || 'A busca semantica nao retornou uma resposta valida.')
    } finally {
      if (searchRequestRef.current === requestId) {
        setLoading(false)
      }
    }
  }

  const handleResearchInterest = async (researchId) => {
    setInterestLoading(String(researchId))
    setInterestMessage('')
    setError('')

    try {
      await createResearchInterest(researchId)
      const nextInterests = await listMyResearchInterests()
      setMyInterests(nextInterests)
      setInterestMessage('Interesse registrado para a pesquisa selecionada.')
      setSelectedResearch((current) => (
        current?.action?.researchId === researchId
          ? {
              ...current,
              action: {
                ...current.action,
                disabled: true,
                label: 'Interesse registrado',
              },
            }
          : current
      ))
    } catch (interestError) {
      setErrorTitle('Nao foi possivel registrar interesse')
      setError(interestError.message || 'Nao foi possivel registrar interesse nesta pesquisa.')
    } finally {
      setInterestLoading('')
    }
  }

  const closeResearchDetails = () => {
    setSelectedResearch(null)
  }

  const closeResearcherDetails = () => {
    setSelectedResearcher(null)
    setSelectedProjectId('')
    setProjectSearch('')
  }

  return (
    <section className="app-page app-search-page">
      <div className="container app-page__container app-search-page__container">
        <div className="app-search-layout">
          <aside className="semantic-panel">
            <div className="semantic-panel__block">
              <h3 className="semantic-panel__title">Filtros</h3>
            
            </div>

            <div className="semantic-panel__block">
              <h3 className="semantic-panel__title">Coleção ativa</h3>
              <div className="semantic-panel__chips">
                <span className="semantic-chip semantic-chip--primary">
                  {isCompanyUser ? 'Pesquisadores' : 'Pesquisas'}
                </span>
              </div>
            </div>

            <div className="semantic-panel__block">
              <h3 className="semantic-panel__title">Áreas de pesquisas</h3>
              {supportLoading ? (
                <div className="semantic-filter-loading" role="status" aria-live="polite">
                  <span className="semantic-filter-spinner" aria-hidden="true" />
                  <span className="sr-only">Carregando áreas</span>
                </div>
              ) : (
                <>
                  <div className="semantic-field">
                    <label className="semantic-field__label" htmlFor="search-area">
                      Area
                    </label>
                    <select
                      id="search-area"
                      className="semantic-field__control"
                      value={selectedAreaId}
                      onChange={(event) => setSelectedAreaId(event.target.value)}
                    >
                      <option value="">Todas as areas</option>
                      {researchAreas.map((area) => (
                        <option key={area.id_area} value={area.id_area}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isCompanyUser ? (
                    <div className="semantic-field">
                      <label className="semantic-field__label" htmlFor="search-availability">
                        Disponibilidade
                      </label>
                      <select
                        id="search-availability"
                        className="semantic-field__control"
                        value={availabilityFilter}
                        onChange={(event) => setAvailabilityFilter(event.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="true">Disponiveis</option>
                        <option value="false">Indisponiveis</option>
                      </select>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </aside>

          <main className="search-feed">
            <header className="search-feed__header">
              <div>
                <span className="section-label">Explorar</span>
                <h1 className="app-page__title search-feed__title">
                  Busca inteligente
                </h1>
              </div>
            </header>

            <form className="app-search-form" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="catalog-search">
                Buscar {resultLabel}
              </label>
              <input
                id="catalog-search"
                className="app-search-form__input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
              />
              <button
                type="submit"
                className="btn btn-primary app-search-form__button"
                disabled={loading}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            {shouldShowResults ? (
            <div className="search-results">
              {!loading ? (
                <div className="search-results__header">
                  <div>
                    <span className="section-label">Resultado atual</span>
                    <h2 className="search-results__title">
                      {hasEmptySearchResult
                        ? (isCompanyUser ? 'Nenhum pesquisador encontrado' : 'Nenhum projeto encontrado')
                        : (isCompanyUser ? 'Pesquisadores recomendados' : 'Pesquisas recomendadas')}
                    </h2>
                  </div>
                  <p className="search-results__meta">
                    {hasSearched ? `${visibleItems.length} item(ns) encontrados para "${activeQuery}".` : ''}
                  </p>
                </div>
              ) : null}

              {interestMessage ? (
                <div className="search-feedback-card">
                  <h3>Interesse atualizado</h3>
                  <p>{interestMessage}</p>
                </div>
              ) : null}

              {!supportLoading && partialWarnings.length > 0 ? (
                <div className="search-feedback-card">
                  <h3>Filtros carregados parcialmente</h3>
                  <p>{partialWarnings.join(' ')}</p>
                </div>
              ) : null}

              {loading ? (
                <div className="search-loading-state" role="status" aria-live="polite">
                  <span className="search-loading-spinner" aria-hidden="true" />
                  <span className="sr-only">Buscando pesquisas</span>
                </div>
              ) : null}

              {!loading && error ? (
                <div className="search-feedback-card search-feedback-card--error">
                  <h3>{errorTitle}</h3>
                  <p>{error}</p>
                </div>
              ) : null}

              {!loading && !error && visibleItems.length > 0 ? (
                <div className="search-results__list">
                  {visibleItems.map((item) => (
                    <article key={item.id} className="search-result-card">
                      {item.type === 'pesquisa' ? (
                        <div className="search-result-card__top">
                          <span className={`search-result-card__type search-result-card__type--${item.type}`}>
                            Pesquisa
                          </span>
                        </div>
                      ) : null}

                      <h3 className="search-result-card__title">{item.title}</h3>
                      <p className="search-result-card__subtitle">{item.subtitle}</p>

                      {item.type === 'pesquisa' ? (
                        <dl className="search-result-card__meta">
                          <div>
                            <dt>Status</dt>
                            <dd>{item.status}</dd>
                          </div>
                          <div>
                            <dt>Orcamento</dt>
                            <dd>{formatCurrency(item.budget)}</dd>
                          </div>
                        </dl>
                      ) : null}

                      {item.type === 'pesquisa' ? (
                        <button
                          type="button"
                          className="btn btn-primary search-result-card__button"
                          onClick={() => setSelectedResearch(item)}
                        >
                          Mais detalhes
                        </button>
                      ) : null}

                      {item.type === 'pesquisador' ? (
                        <button
                          type="button"
                          className="btn btn-primary search-result-card__button"
                          onClick={() => setSelectedResearcher(item)}
                        >
                          Ver detalhes
                        </button>
                      ) : null}

                      {item.type === 'pesquisador' && item.tags.length > 0 ? (
                        <div className="search-result-card__tags">
                          {item.tags.map((tag) => (
                            <span key={`${item.id}-${tag}`} className="search-result-card__tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
            ) : null}
          </main>
        </div>
      </div>

      {selectedResearch ? (
        <ResearchDetailModal
          research={selectedResearch}
          onClose={closeResearchDetails}
          action={
            selectedResearch.action
              ? {
                  label: selectedResearch.action.label,
                  loadingLabel: 'Registrando...',
                  loading: interestLoading === String(selectedResearch.action.researchId),
                  disabled: selectedResearch.action.disabled,
                  onClick: () => handleResearchInterest(selectedResearch.action.researchId),
                }
              : null
          }
        />
      ) : null}

      {selectedResearcher ? (
        <div
          className="researcher-detail-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="researcher-detail-title"
        >
          <button
            type="button"
            className="researcher-detail-modal__backdrop"
            aria-label="Fechar detalhes do pesquisador"
            onClick={closeResearcherDetails}
          />
          <article className="researcher-detail-modal__card">
            <header className="researcher-detail-modal__header">
              <div>
                <span className="section-label">Detalhes do pesquisador</span>
                <h2 id="researcher-detail-title">{selectedResearcher.title}</h2>
                <p>{selectedResearcher.subtitle}</p>
              </div>
              <button
                type="button"
                className="researcher-detail-modal__close"
                aria-label="Fechar detalhes"
                onClick={closeResearcherDetails}
              >
                X
              </button>
            </header>

            <section className="researcher-detail-modal__section">
              <h3>Areas de pesquisa</h3>
              {selectedResearcher.tags.length > 0 ? (
                <div className="researcher-detail-modal__tags">
                  {selectedResearcher.tags.map((tag) => (
                    <span key={`${selectedResearcher.id}-${tag}`} className="search-result-card__tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p>Areas nao informadas.</p>
              )}
            </section>

            <section className="researcher-detail-modal__section researcher-detail-modal__invite">
              <div>
                <h3>Sugerir participacao</h3>
                <p>
                  Escolha uma pesquisa da empresa. O backend ainda nao expoe um endpoint para
                  registrar sugestao manual para um pesquisador especifico.
                </p>
              </div>

              <label className="semantic-field">
                <span className="semantic-field__label">Pesquisar pesquisa</span>
                <input
                  className="semantic-field__control"
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder="Filtre por titulo ou area"
                />
              </label>

              <label className="semantic-field">
                <span className="semantic-field__label">Pesquisa da empresa</span>
                <select
                  className="semantic-field__control"
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                >
                  <option value="">
                    {companyResearches.length > 0
                      ? 'Selecione uma pesquisa'
                      : 'Nenhuma pesquisa publicada pela empresa'}
                  </option>
                  {projectGroups.map((group) => (
                    <optgroup key={group.areaName} label={group.areaName}>
                      {group.items.map((research) => (
                        <option key={research.id_research} value={research.id_research}>
                          {research.title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="btn btn-primary researcher-detail-modal__button"
                disabled
              >
                Sugerir participacao
              </button>
            </section>
          </article>
        </div>
      ) : null}
    </section>
  )
}
