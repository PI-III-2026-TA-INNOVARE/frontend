import { useEffect, useMemo, useState } from 'react'
import ResearchDetailModal from '../../../components/ResearchDetailModal'
import {
  getCompany,
  getResearch,
  listMyResearchInterests,
  listResearchAreas,
} from '../../../services/pdConnectApi'
import './MyInterestsPage.scss'

const tabs = [
  {
    id: 'interests',
    label: 'Seus interesses',
    emptyTitle: 'Voce ainda nao demonstrou interesse em nenhum projeto.',
    emptyText: 'Use a busca semantica para encontrar pesquisas aderentes ao seu perfil.',
  },
  {
    id: 'ai',
    label: 'Sugestoes da IA',
    emptyTitle: 'A IA ainda nao sugeriu projetos para o seu perfil.',
    emptyText: 'Quando uma empresa executar o match, as pesquisas sugeridas aparecem aqui.',
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
    researchDetails: {},
    companies: {},
    researchAreas: [],
  })

  useEffect(() => {
    let isMounted = true

    const loadInterests = async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const [interests, researchAreas] = await Promise.all([
          listMyResearchInterests(),
          listResearchAreas(),
        ])

        const detailResults = await Promise.allSettled(
          interests.map((item) => getResearch(item.research_id))
        )
        const researchDetails = detailResults.reduce((lookup, result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            lookup[String(interests[index].research_id)] = result.value
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

        if (!isMounted) {
          return
        }

        setCatalog({
          interests,
          researchDetails,
          companies,
          researchAreas,
        })
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(error.message || 'Nao foi possivel carregar seus projetos de interesse.')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadInterests()

    return () => {
      isMounted = false
    }
  }, [])

  const researchAreaLookup = useMemo(
    () => buildLookup(catalog.researchAreas, 'id_area'),
    [catalog.researchAreas]
  )

  const interestItems = useMemo(() => (
    catalog.interests.map((interest) => {
      const detail = catalog.researchDetails[String(interest.research_id)] || {}
      const company = catalog.companies[String(detail.company)] || {}
      const companyLabel = (
        company.razao_social ||
        company.legal_name ||
        company.name ||
        'Empresa nao informada'
      )
      const areaLabel = researchAreaLookup[String(detail.area)]?.name || 'Area nao informada'
      const projectStatus = detail.status || 'nao informado'
      const projectStatusLabel = getProjectStatusLabel(projectStatus)

      return {
        id: interest.id_candidate,
        researchId: interest.research_id,
        source: interest.source,
        title: detail.title || interest.research_title || 'Pesquisa sem titulo informado',
        companyLabel,
        areaLabel,
        status: projectStatusLabel,
        candidateStatus: interest.status,
        deadline: detail.deadline,
        budget: detail.budget,
        detail: {
          ...detail,
          companyLabel,
          areaLabel,
          status: projectStatusLabel,
        },
      }
    })
  ), [catalog.companies, catalog.interests, catalog.researchDetails, researchAreaLookup])

  const interestedItems = useMemo(
    () => interestItems.filter((item) => item.source === 'interest'),
    [interestItems]
  )

  const aiItems = useMemo(
    () => interestItems.filter((item) => item.source === 'ai'),
    [interestItems]
  )

  const interestStatusCounts = useMemo(() => (
    interestedItems.reduce((lookup, item) => {
      lookup.all += 1
      lookup[item.candidateStatus] = (lookup[item.candidateStatus] || 0) + 1
      return lookup
    }, { all: 0 })
  ), [interestedItems])

  const tabItems = useMemo(() => {
    if (activeTab === 'ai') {
      return aiItems
    }

    if (activeInterestStatus === 'all') {
      return interestedItems
    }

    return interestedItems.filter((item) => item.candidateStatus === activeInterestStatus)
  }, [activeInterestStatus, activeTab, aiItems, interestedItems])

  const interestCount = useMemo(
    () => interestedItems.length,
    [interestedItems]
  )

  const aiCount = useMemo(
    () => aiItems.length,
    [aiItems]
  )

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
                    {item.source === 'ai' ? 'Match da IA' : 'Candidatura'}:{' '}
                    {getCandidateStatusLabel(item.candidateStatus)}
                  </span>
                  <span className="my-interest-status my-interest-status--project">
                    Projeto: {item.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      {selectedResearch ? (
        <ResearchDetailModal
          research={selectedResearch}
          onClose={() => setSelectedResearch(null)}
        />
      ) : null}
    </section>
  )
}
