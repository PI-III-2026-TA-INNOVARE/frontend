import { useCallback, useEffect, useMemo, useState } from 'react'
import ResearchDetailModal from '../../../components/ResearchDetailModal'
import {
  getCompany,
  getResearch,
  listMyRecommendations,
  listMyResearchInterests,
  listMySuggestions,
  listResearchAreas,
  respondToSuggestion,
} from '../../../services/pdConnectApi'
import './MyInterestsPage.scss'

const MATCH_REASON_LABELS = {
  alta_similaridade_semantica: 'Alta similaridade semântica',
  similaridade_semantica_moderada: 'Similaridade moderada',
  boa_aderencia_textual: 'Boa aderência textual',
  mesma_area_de_pesquisa: 'Mesma área',
  disponibilidade_compativel: 'Disponibilidade compatível',
}

function formatMatchReason(reason) {
  if (!reason) return ''
  return MATCH_REASON_LABELS[reason] || reason.replace(/_/g, ' ')
}

function formatMatchScore(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return `${Math.round(parsed * 100)}%`
}

const tabs = [
  {
    id: 'all',
    label: 'Todas',
    emptyTitle: 'Nenhuma candidatura encontrada.',
    emptyText: 'Demonstre interesse em pesquisas ou aguarde sugestões da IA.',
  },
  {
    id: 'interests',
    label: 'Meus interesses',
    emptyTitle: 'Você ainda não demonstrou interesse em nenhum projeto.',
    emptyText: 'Use a busca semântica para encontrar pesquisas aderentes ao seu perfil.',
  },
  {
    id: 'ai',
    label: 'Sugeridos pela IA',
    emptyTitle: 'A IA ainda não sugeriu projetos para o seu perfil.',
    emptyText: 'Quando uma empresa executar o match, as pesquisas sugeridas aparecem aqui.',
  },
  {
    id: 'suggestions',
    label: 'Indicados por empresas',
    emptyTitle: 'Nenhuma empresa indicou você para um projeto ainda.',
    emptyText: 'Quando uma empresa indicar seu perfil para uma pesquisa, ela aparece aqui.',
  },
]

const statusFilterOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'suggested', label: 'Sugerido' },
  { value: 'interested', label: 'Interessado' },
  { value: 'under_review', label: 'Em análise' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'rejected', label: 'Negado' },
]

function getCandidateStatusBadgeClass(status) {
  if (status === 'approved') return 'mi-candidate-badge mi-candidate-badge--approved'
  if (status === 'rejected') return 'mi-candidate-badge mi-candidate-badge--rejected'
  if (status === 'under_review') return 'mi-candidate-badge mi-candidate-badge--review'
  if (status === 'interested') return 'mi-candidate-badge mi-candidate-badge--interested'
  return 'mi-candidate-badge'
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

function formatDateTime(value) {
  if (!value) {
    return 'prazo nao informado'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed)
}

function getCandidateStatusLabel(status) {
  const labels = {
    suggested: 'Sugerido',
    interested: 'Interessado',
    under_review: 'Em analise',
    approved: 'Aceito',
    rejected: 'Negado',
    cancelled: 'Cancelado',
  }

  return labels[status] || status || 'nao informado'
}

function getProjectStatusLabel(status) {
  const labels = {
    aberta: 'Aberto',
    aberto: 'Aberto',
    open: 'Aberto',
    in_progress: 'Em andamento',
    andamento: 'Em andamento',
    encerrada: 'Encerrado',
    closed: 'Encerrado',
    pausada: 'Pausada',
    paused: 'Pausada',
  }

  return labels[status] || status || 'nao informado'
}

function buildLookup(items, idKey) {
  return items.reduce((lookup, item) => {
    lookup[String(item[idKey])] = item
    return lookup
  }, {})
}

export default function MyInterestsPage() {
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [activeStatusFilter, setActiveStatusFilter] = useState('all')
  const [selectedResearch, setSelectedResearch] = useState(null)
  const [expandedItemId, setExpandedItemId] = useState(null)
  const [catalog, setCatalog] = useState({
    interests: [],
    recommendations: [],
    suggestions: [],
    researchDetails: {},
    companies: {},
    researchAreas: [],
  })
  const [aiRefreshLoading, setAiRefreshLoading] = useState(false)
  const [aiRefreshMessage, setAiRefreshMessage] = useState('')
  const [suggestionActionLoading, setSuggestionActionLoading] = useState('')
  const [suggestionActionMessage, setSuggestionActionMessage] = useState('')
  const [suggestionActionError, setSuggestionActionError] = useState('')

  const loadCatalog = useCallback(async ({ refreshRecommendations = false } = {}) => {
    const [interests, recommendations, suggestions, researchAreas] = await Promise.all([
      listMyResearchInterests(),
      listMyRecommendations({ refresh: refreshRecommendations }).catch(() => []),
      listMySuggestions().catch(() => []),
      listResearchAreas(),
    ])

    const allItems = [...interests, ...recommendations, ...suggestions]
    const uniqueResearchIds = [
      ...new Set(allItems.map((item) => String(item.research_id))),
    ]

    const detailResults = await Promise.allSettled(
      uniqueResearchIds.map((researchId) => getResearch(researchId))
    )
    const researchDetails = detailResults.reduce((lookup, result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        lookup[uniqueResearchIds[index]] = result.value
      }
      return lookup
    }, {})

    const companyIds = [
      ...new Set(
        Object.values(researchDetails)
          .map((detail) => detail.company)
          .filter((companyId) => companyId !== null && companyId !== undefined)
          .map((companyId) => String(companyId))
      ),
    ]
    const companyResults = await Promise.allSettled(
      companyIds.map((companyId) => getCompany(companyId))
    )
    const companies = companyResults.reduce((lookup, result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        lookup[companyIds[index]] = result.value
      }
      return lookup
    }, {})

    return { interests, recommendations, suggestions, researchDetails, companies, researchAreas }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadInterests = async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const data = await loadCatalog()
        if (!isMounted) return
        setCatalog(data)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(error.message || 'Nao foi possivel carregar seus projetos de interesse.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadInterests()

    return () => {
      isMounted = false
    }
  }, [loadCatalog])

  const handleRefreshRecommendations = useCallback(async () => {
    setAiRefreshLoading(true)
    setAiRefreshMessage('')

    try {
      const data = await loadCatalog({ refreshRecommendations: true })
      setCatalog(data)
      setAiRefreshMessage('Sugestões da IA atualizadas.')
    } catch (error) {
      setAiRefreshMessage(error.message || 'Não foi possível atualizar as sugestões da IA.')
    } finally {
      setAiRefreshLoading(false)
    }
  }, [loadCatalog])

  const handleRespondSuggestion = useCallback(async (candidateId, status) => {
    setSuggestionActionLoading(String(candidateId))
    setSuggestionActionMessage('')
    setSuggestionActionError('')
    try {
      await respondToSuggestion(candidateId, status)
      const label = status === 'interested' ? 'aceita' : 'recusada'
      setSuggestionActionMessage(`Indicação ${label} com sucesso.`)
      // atualiza localmente o status do candidato
      setCatalog((prev) => ({
        ...prev,
        suggestions: prev.suggestions.map((s) =>
          s.id_candidate === candidateId ? { ...s, status } : s
        ),
      }))
    } catch (err) {
      setSuggestionActionError(
        err?.status === 404
          ? 'Esta funcionalidade ainda não está disponível no servidor.'
          : err.message || 'Não foi possível registrar sua resposta.'
      )
    } finally {
      setSuggestionActionLoading('')
    }
  }, [])

  const researchAreaLookup = useMemo(
    () => buildLookup(catalog.researchAreas, 'id_area'),
    [catalog.researchAreas]
  )

  const buildItem = useCallback((source, candidate) => {
    const detail = catalog.researchDetails[String(candidate.research_id)] || {}
    const company = catalog.companies[String(detail.company)] || {}
    const companyLabel = (
      candidate.company_name ||
      company.razao_social ||
      company.legal_name ||
      company.name ||
      'Empresa nao informada'
    )
    const areaLabel = (
      candidate.research_area ||
      researchAreaLookup[String(detail.area)]?.name ||
      'Area nao informada'
    )
    const projectStatus = candidate.research_status || detail.status || 'nao informado'
    const projectStatusLabel = getProjectStatusLabel(projectStatus)

    return {
      id: `${source}-${candidate.id_candidate}`,
      candidateId: candidate.id_candidate,
      researchId: candidate.research_id,
      source: candidate.source || source,
      title: detail.title || candidate.research_title || 'Pesquisa sem titulo informado',
      companyLabel,
      areaLabel,
      status: projectStatusLabel,
      candidateStatus: candidate.status,
      deadline: detail.deadline,
      budget: detail.budget,
      scoreMatch: candidate.score_match ?? null,
      matchReasons: Array.isArray(candidate.match_reasons) ? candidate.match_reasons : [],
      llmReason: candidate.score_features?.llm_reason || null,
      detail: {
        ...detail,
        companyLabel,
        areaLabel,
        status: projectStatusLabel,
      },
    }
  }, [catalog.companies, catalog.researchDetails, researchAreaLookup])

  const interestedItems = useMemo(
    () => catalog.interests.map((interest) => buildItem('interest', interest)),
    [buildItem, catalog.interests]
  )

  const aiItems = useMemo(
    () => catalog.recommendations.map((rec) => buildItem('ai', rec)),
    [buildItem, catalog.recommendations]
  )

  const suggestionItems = useMemo(
    () => catalog.suggestions.map((s) => buildItem('manual', s)),
    [buildItem, catalog.suggestions]
  )

  const allItems = useMemo(
    () => [...interestedItems, ...aiItems, ...suggestionItems],
    [interestedItems, aiItems, suggestionItems]
  )

  const baseItemsForTab = useMemo(() => {
    if (activeTab === 'all') return allItems
    if (activeTab === 'ai') return aiItems
    if (activeTab === 'suggestions') return suggestionItems
    return interestedItems
  }, [activeTab, allItems, aiItems, interestedItems, suggestionItems])

  const statusCountsForTab = useMemo(() => (
    baseItemsForTab.reduce((lookup, item) => {
      lookup.all += 1
      lookup[item.candidateStatus] = (lookup[item.candidateStatus] || 0) + 1
      return lookup
    }, { all: 0 })
  ), [baseItemsForTab])

  const tabItems = useMemo(() => {
    if (activeStatusFilter === 'all') return baseItemsForTab
    return baseItemsForTab.filter((item) => item.candidateStatus === activeStatusFilter)
  }, [activeStatusFilter, baseItemsForTab])

  const allCount = useMemo(() => allItems.length, [allItems])
  const interestCount = useMemo(() => interestedItems.length, [interestedItems])
  const aiCount = useMemo(() => aiItems.length, [aiItems])
  const suggestionsCount = useMemo(() => suggestionItems.length, [suggestionItems])

  const activeTabContent = tabs.find((tab) => tab.id === activeTab) || tabs[0]
  const activeStatusLabel = (
    statusFilterOptions.find((item) => item.value === activeStatusFilter)?.label || ''
  )

  return (
    <section className="app-page my-interests-page">
      <div className="container app-page__container">
        <header className="app-page__header my-interests-page__header">
          <div>
            <span className="section-label">Acompanhamento</span>
            <h1 className="app-page__title">Pesquisas</h1>
          </div>
          <p className="app-page__subtitle">
            Acompanhe suas candidaturas e as sugestoes de match da IA.
          </p>
        </header>

        {!loading && !errorMessage ? (
          <div className="my-interests-tabs" role="tablist" aria-label="Pesquisas do pesquisador">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              className={`my-interests-tab${activeTab === 'all' ? ' active' : ''}`}
              onClick={() => { setActiveTab('all'); setExpandedItemId(null); setActiveStatusFilter('all') }}
            >
              Todas ({allCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'interests'}
              className={`my-interests-tab${activeTab === 'interests' ? ' active' : ''}`}
              onClick={() => {
                setActiveTab('interests')
                setExpandedItemId(null)
                setActiveStatusFilter('all')
              }}
            >
              Meus interesses ({interestCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ai'}
              className={`my-interests-tab${activeTab === 'ai' ? ' active' : ''}`}
              onClick={() => { setActiveTab('ai'); setExpandedItemId(null); setActiveStatusFilter('all') }}
            >
              Sugeridos pela IA ({aiCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'suggestions'}
              className={`my-interests-tab${activeTab === 'suggestions' ? ' active' : ''}`}
              onClick={() => { setActiveTab('suggestions'); setExpandedItemId(null); setActiveStatusFilter('all') }}
            >
              Indicados por empresas ({suggestionsCount})
            </button>
          </div>
        ) : null}

        {!loading && !errorMessage && activeTab === 'suggestions' ? (
          <div className="my-interests-ai-toolbar">
            <p className="my-interests-ai-toolbar__hint">
              Pesquisas em que uma empresa indicou seu perfil como candidato.
            </p>
            {suggestionActionMessage ? (
              <span className="my-interests-suggestion-feedback my-interests-suggestion-feedback--success">
                {suggestionActionMessage}
              </span>
            ) : null}
            {suggestionActionError ? (
              <span className="my-interests-suggestion-feedback my-interests-suggestion-feedback--error">
                {suggestionActionError}
              </span>
            ) : null}
          </div>
        ) : null}

        {!loading && !errorMessage && activeTab === 'ai' ? (
          <div className="my-interests-ai-toolbar">
            <p className="my-interests-ai-toolbar__hint">
              Pesquisas que a IA identificou como compatíveis com seu perfil.
            </p>
            <button
              type="button"
              className="btn btn-secondary my-interests-ai-toolbar__button"
              onClick={handleRefreshRecommendations}
              disabled={aiRefreshLoading}
            >
              {aiRefreshLoading ? 'Atualizando...' : 'Atualizar sugestões'}
            </button>
            {aiRefreshMessage ? (
              <span className="my-interests-ai-toolbar__message">{aiRefreshMessage}</span>
            ) : null}
          </div>
        ) : null}

        {!loading && !errorMessage ? (
          <div className="my-interests-status-tabs" aria-label="Filtrar por status da candidatura">
            {statusFilterOptions
              .filter((opt) => opt.value === 'all' || (statusCountsForTab[opt.value] || 0) > 0)
              .map((statusOption) => (
                <button
                  type="button"
                  key={statusOption.value}
                  className={`my-interests-status-tab${activeStatusFilter === statusOption.value ? ' active' : ''}`}
                  onClick={() => { setActiveStatusFilter(statusOption.value); setExpandedItemId(null) }}
                >
                  {statusOption.label} ({statusOption.value === 'all' ? statusCountsForTab.all : (statusCountsForTab[statusOption.value] || 0)})
                </button>
              ))}
          </div>
        ) : null}

        {loading ? (
          <div className="my-interests-feedback">
            <span className="my-interests-spinner" aria-hidden="true" />
            <p>Carregando seus projetos de interesse.</p>
          </div>
        ) : null}

        {!loading && errorMessage ? (
          <div className="my-interests-feedback my-interests-feedback--error">
            <h2>Nao foi possivel carregar</h2>
            <p>{errorMessage}</p>
          </div>
        ) : null}

        {!loading && !errorMessage && tabItems.length === 0 ? (
          <div className="my-interests-feedback">
            <h2>
              {activeStatusFilter !== 'all'
                ? `Nenhum projeto com situação ${activeStatusLabel.toLowerCase()}.`
                : activeTabContent.emptyTitle}
            </h2>
            <p>
              {activeStatusFilter !== 'all'
                ? 'Altere o filtro de situação para ver outras candidaturas.'
                : activeTabContent.emptyText}
            </p>
          </div>
        ) : null}

        {!loading && !errorMessage && tabItems.length > 0 ? (
          <div className="mi-table">
            <div className="mi-table__head">
              <span>Pesquisa</span>
              <span>Área</span>
              <span>Prazo</span>
              <span>Fonte</span>
              <span>Situação</span>
              <span>Ações</span>
            </div>

            {tabItems.map((item) => {
              const isOpen = expandedItemId === item.id
              const hasPanel = (
                item.source === 'ai' && (item.llmReason || item.matchReasons.length > 0)
              ) || item.source === 'manual'

              return (
                <div key={item.id} className={`mi-table__group${isOpen ? ' mi-table__group--open' : ''}`}>
                  <div
                    className="mi-table__row"
                    onClick={() => hasPanel && setExpandedItemId(isOpen ? null : item.id)}
                    role={hasPanel ? 'button' : undefined}
                    tabIndex={hasPanel ? 0 : undefined}
                    onKeyDown={hasPanel ? (e) => e.key === 'Enter' && setExpandedItemId(isOpen ? null : item.id) : undefined}
                  >
                    <span className="mi-table__title">
                      {hasPanel && (
                        <span className="mi-table__toggle" aria-hidden="true">
                          {isOpen ? '▾' : '▸'}
                        </span>
                      )}
                      {item.title}
                    </span>
                    <span>{item.areaLabel}</span>
                    <span>{formatDateTime(item.deadline)}</span>
                    <span>
                      {item.source === 'ai' && item.scoreMatch !== null ? (
                        <span className="mi-source-badge mi-source-badge--ai">
                          IA · {formatMatchScore(item.scoreMatch)}
                        </span>
                      ) : item.source === 'ai' ? (
                        <span className="mi-source-badge mi-source-badge--ai">IA</span>
                      ) : item.source === 'manual' ? (
                        <span className="mi-source-badge mi-source-badge--company">Indicação</span>
                      ) : (
                        <span className="mi-source-badge">Interesse</span>
                      )}
                    </span>
                    <span>
                      <span className={getCandidateStatusBadgeClass(item.candidateStatus)}>
                        {getCandidateStatusLabel(item.candidateStatus)}
                      </span>
                    </span>
                    <span className="mi-table__actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn mi-table-btn"
                        onClick={() => setSelectedResearch(item)}
                      >
                        Ver detalhes
                      </button>
                    </span>
                  </div>

                  {isOpen && hasPanel ? (
                    <div className="mi-table__panel">
                      {item.source === 'ai' && item.llmReason ? (
                        <p className="mi-panel__llm-reason">
                          <span className="mi-panel__llm-badge">IA</span>
                          {item.llmReason}
                        </p>
                      ) : item.source === 'ai' && item.matchReasons.length > 0 ? (
                        <div className="mi-panel__reasons">
                          {item.matchReasons.map((reason) => (
                            <span key={`${item.id}-${reason}`} className="mi-panel__reason-tag">
                              {formatMatchReason(reason)}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {item.source === 'manual' && item.candidateStatus === 'under_review' ? (
                        <div className="mi-panel__respond">
                          <p className="mi-panel__respond-hint">
                            Uma empresa indicou seu perfil para esta pesquisa. Deseja participar?
                          </p>
                          <div className="mi-panel__respond-actions">
                            <button
                              type="button"
                              className="btn btn-primary mi-panel__respond-btn"
                              disabled={suggestionActionLoading === String(item.candidateId)}
                              onClick={() => handleRespondSuggestion(item.candidateId, 'interested')}
                            >
                              {suggestionActionLoading === String(item.candidateId) ? 'Salvando...' : 'Aceitar'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost mi-panel__respond-btn mi-panel__respond-btn--reject"
                              disabled={suggestionActionLoading === String(item.candidateId)}
                              onClick={() => handleRespondSuggestion(item.candidateId, 'rejected')}
                            >
                              Recusar
                            </button>
                          </div>
                        </div>
                      ) : item.source === 'manual' ? (
                        <p className="mi-panel__responded">
                          {item.candidateStatus === 'interested'
                            ? '✓ Você aceitou participar desta pesquisa.'
                            : item.candidateStatus === 'rejected'
                            ? '✗ Você recusou esta indicação.'
                            : getCandidateStatusLabel(item.candidateStatus)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      {selectedResearch ? (
        <ResearchDetailModal
          research={selectedResearch}
          onClose={() => setSelectedResearch(null)}
          respond={
            selectedResearch.source === 'manual' && selectedResearch.candidateStatus === 'under_review'
              ? {
                  loading: suggestionActionLoading === String(selectedResearch.candidateId),
                  onAccept: () => handleRespondSuggestion(selectedResearch.candidateId, 'interested'),
                  onReject: () => handleRespondSuggestion(selectedResearch.candidateId, 'rejected'),
                }
              : null
          }
        />
      ) : null}
    </section>
  )
}
