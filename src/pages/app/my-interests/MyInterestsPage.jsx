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
    id: 'interests',
    label: 'Seus interesses',
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

const interestStatusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'interested', label: 'Interessado' },
  { value: 'approved', label: 'Aceito' },
  { value: 'rejected', label: 'Negado' },
]

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
  const [activeTab, setActiveTab] = useState('interests')
  const [activeInterestStatus, setActiveInterestStatus] = useState('all')
  const [selectedResearch, setSelectedResearch] = useState(null)
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

  const interestStatusCounts = useMemo(() => (
    interestedItems.reduce((lookup, item) => {
      lookup.all += 1
      lookup[item.candidateStatus] = (lookup[item.candidateStatus] || 0) + 1
      return lookup
    }, { all: 0 })
  ), [interestedItems])

  const tabItems = useMemo(() => {
    if (activeTab === 'ai') return aiItems
    if (activeTab === 'suggestions') return suggestionItems

    if (activeInterestStatus === 'all') return interestedItems
    return interestedItems.filter((item) => item.candidateStatus === activeInterestStatus)
  }, [activeInterestStatus, activeTab, aiItems, interestedItems, suggestionItems])

  const interestCount = useMemo(
    () => interestedItems.length,
    [interestedItems]
  )

  const aiCount = useMemo(() => aiItems.length, [aiItems])
  const suggestionsCount = useMemo(() => suggestionItems.length, [suggestionItems])

  const activeTabContent = tabs.find((tab) => tab.id === activeTab) || tabs[0]
  const activeStatusLabel = (
    interestStatusOptions.find((item) => item.value === activeInterestStatus)?.label || ''
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
              aria-selected={activeTab === 'interests'}
              className={`my-interests-tab${activeTab === 'interests' ? ' active' : ''}`}
              onClick={() => {
                setActiveTab('interests')
              }}
            >
              Seus interesses ({interestCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ai'}
              className={`my-interests-tab${activeTab === 'ai' ? ' active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              Sugeridos pela IA ({aiCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'suggestions'}
              className={`my-interests-tab${activeTab === 'suggestions' ? ' active' : ''}`}
              onClick={() => setActiveTab('suggestions')}
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

        {!loading && !errorMessage && activeTab === 'interests' ? (
          <div className="my-interests-status-tabs" aria-label="Filtrar interesses por status">
            {interestStatusOptions.map((statusOption) => (
              <button
                type="button"
                key={statusOption.value}
                className={`my-interests-status-tab${
                  activeInterestStatus === statusOption.value ? ' active' : ''
                }`}
                onClick={() => setActiveInterestStatus(statusOption.value)}
              >
                {statusOption.label} ({interestStatusCounts[statusOption.value] || 0})
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
              {activeTab === 'interests' && activeInterestStatus !== 'all'
                ? `Nenhum projeto com status ${activeStatusLabel.toLowerCase()}.`
                : activeTabContent.emptyTitle}
            </h2>
            <p>
              {activeTab === 'interests' && activeInterestStatus !== 'all'
                ? 'Altere o filtro de status para ver outras candidaturas.'
                : activeTabContent.emptyText}
            </p>
          </div>
        ) : null}

        {!loading && !errorMessage && tabItems.length > 0 ? (
          <div className="my-interests-list">
            {tabItems.map((item) => (
              <article className="my-interest-card" key={item.id}>
                <div className="my-interest-card__head">
                  <div>
                    <span className="section-label">Projeto</span>
                    <h2>{item.title}</h2>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary my-interest-card__button"
                    onClick={() => setSelectedResearch(item)}
                  >
                    Ver detalhes
                  </button>
                </div>

                <dl className="my-interest-card__grid">
                  <div>
                    <dt>Empresa</dt>
                    <dd>{item.companyLabel}</dd>
                  </div>
                  <div>
                    <dt>Area</dt>
                    <dd>{item.areaLabel}</dd>
                  </div>
                  <div>
                    <dt>Prazo</dt>
                    <dd>{formatDateTime(item.deadline)}</dd>
                  </div>
                  <div>
                    <dt>Orcamento</dt>
                    <dd>{formatCurrency(item.budget)}</dd>
                  </div>
                </dl>

                <div className="my-interest-card__status-row">
                  <span className="my-interest-status">
                    {item.source === 'ai' ? 'Match da IA' : item.source === 'manual' ? 'Indicação da empresa' : 'Candidatura'}:{' '}
                    {getCandidateStatusLabel(item.candidateStatus)}
                  </span>
                  <span className="my-interest-status my-interest-status--project">
                    Projeto: {item.status}
                  </span>
                  {item.source === 'ai' && item.scoreMatch !== null ? (
                    <span className="my-interest-status my-interest-status--score">
                      Compatibilidade: {formatMatchScore(item.scoreMatch)}
                    </span>
                  ) : null}
                </div>

                {item.source === 'ai' ? (
                  item.llmReason ? (
                    <p className="my-interest-card__llm-reason">
                      <span className="my-interest-card__llm-badge">IA</span>
                      {item.llmReason}
                    </p>
                  ) : item.matchReasons.length > 0 ? (
                    <div className="my-interest-card__reasons" aria-label="Motivos do match">
                      {item.matchReasons.map((reason) => (
                        <span key={`${item.id}-${reason}`} className="my-interest-reason">
                          {formatMatchReason(reason)}
                        </span>
                      ))}
                    </div>
                  ) : null
                ) : null}

                {/* Resposta já dada */}
                {item.source === 'manual' && item.candidateStatus !== 'under_review' ? (
                  <p className="my-interest-card__responded">
                    {item.candidateStatus === 'interested'
                      ? '✓ Você aceitou participar desta pesquisa.'
                      : item.candidateStatus === 'rejected'
                      ? '✗ Você recusou esta indicação.'
                      : null}
                  </p>
                ) : null}
              </article>
            ))}
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
