import { useEffect, useMemo, useState } from 'react'
import { formatBooleanLabel, normalizeText } from '../../../lib/domain'
import { useAuth } from '../../../context/AuthContext'
import {
  createResearchInterest,
  getResearcherResume,
  listCompanies,
  listMyResearchInterests,
  listResearchAreas,
  listResearchers,
  listResearches,
  listUniversities,
} from '../../../services/pdConnectApi'
import './SearchPage.scss'

const defaultQuery = 'pesquisar por pesquisa, nome, universidade, cnpj, area ou status'

function getDefaultTab(userType) {
  return userType === 'empresa' ? 'pesquisadores' : 'pesquisas'
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

function buildCompanyLookup(companies) {
  return companies.reduce((lookup, item) => {
    lookup[item.id_company] = item
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

function getCompanyDisplayName(company) {
  return company?.razao_social || company?.legal_name || company?.name || company?.cnpj || 'Empresa nao identificada'
}

function getCompanyRegistrationStatus(company) {
  return company?.situacao_cadastral || company?.registration_status || 'nao informada'
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
        const catalogRequests = [
          listCompanies(),
          listResearchers(),
          listResearches(),
          listResearchAreas(),
          listUniversities(),
          user?.type === 'pesquisador' ? listMyResearchInterests() : Promise.resolve([]),
        ]
        const catalogLabels = [
          'empresas',
          'pesquisadores',
          'pesquisas',
          'areas de pesquisa',
          'universidades',
          'interesses do pesquisador',
        ]
        const catalogResults = await Promise.allSettled(catalogRequests)
        const [companiesResult, researchersResult, researchesResult, researchAreasResult, universitiesResult, myInterestsResult] = catalogResults
        const companies = readSettledValue(companiesResult, [])
        const researchers = readSettledValue(researchersResult, [])
        const researches = readSettledValue(researchesResult, [])
        const researchAreas = readSettledValue(researchAreasResult, [])
        const universities = readSettledValue(universitiesResult, [])
        const myInterests = readSettledValue(myInterestsResult, [])

        const resumeResults = await Promise.allSettled(
          researchers.map((item) => getResearcherResume(item.id_researcher))
        )
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

  const companyLookup = useMemo(
    () => buildCompanyLookup(catalog.companies),
    [catalog.companies]
  )

  const interestLookup = useMemo(
    () => buildInterestLookup(catalog.myInterests),
    [catalog.myInterests]
  )

  const companyItems = useMemo(() => (
    catalog.companies.map((company) => ({
      id: `company-${company.id_company}`,
      type: 'empresa',
      title: getCompanyDisplayName(company),
      subtitle: company.cnpj,
      description:
        `Situacao cadastral: ${getCompanyRegistrationStatus(company)}. ` +
        `Status do cadastro: ${formatBooleanLabel(company.status, {
          trueLabel: 'ativo',
          falseLabel: 'inativo',
          nullLabel: 'nao informado',
        })}.`,
      tags: [
        getCompanyRegistrationStatus(company),
        company.status ? 'Ativa' : 'Inativa',
      ],
    }))
  ), [catalog.companies])

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
      const company = companyLookup[research.company]
      const areaName = researchAreaLookup[research.area]?.name || 'Area nao identificada'
      const interest = interestLookup[research.id_research]
      const canShowInterestAction = user?.type === 'pesquisador'

      return {
        id: `research-${research.id_research}`,
        type: 'pesquisa',
        title: research.title,
        subtitle: `${getCompanyDisplayName(company)} | ${areaName}`,
        description:
          `${research.goal || 'Objetivo nao informado'} ` +
          `Prazo: ${formatDeadlineLabel(research.deadline)}. ` +
          `Orcamento: ${research.budget || 'nao informado'}.`,
        tags: [
          areaName,
          research.status || 'status nao informado',
          company?.cnpj || 'empresa sem CNPJ',
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
  ), [catalog.researches, companyLookup, interestLookup, researchAreaLookup, user?.type])

  const universityItems = useMemo(() => (
    catalog.universities.map((university) => {
      const linkedResearchers = catalog.researchers.filter(
        (researcher) => researcher.university === university.id_university
      )

      return {
        id: `university-${university.id_university}`,
        type: 'universidade',
        title: university.name,
        subtitle: `${linkedResearchers.length} pesquisador(es) vinculado(s)`,
        description:
          linkedResearchers.length > 0
            ? `Cadastros ligados: ${linkedResearchers.map((item) => item.name).join(', ')}.`
            : 'Nenhum pesquisador vinculado a esta universidade.',
        tags: ['Universidade', `${linkedResearchers.length} vinculados`],
      }
    })
  ), [catalog.researchers, catalog.universities])

  const visibleItems = useMemo(() => {
    const sourceMap = {
      pesquisas: researchItems,
      empresas: companyItems,
      pesquisadores: researcherItems,
      universidades: universityItems,
    }

    const source = sourceMap[activeTab] || []
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
  }, [activeQuery, activeTab, companyItems, researcherItems, researchItems, universityItems])

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
      <div className="container app-page__container">
        <header className="app-page__header">
          <div>
            <span className="section-label">Explorar</span>
            <h1 className="app-page__title">Base da plataforma</h1>
          </div>
          <div className="app-page__header-actions">
            <p className="app-page__subtitle">
              Pesquise empresas, pesquisadores, pesquisas e universidades.
            </p>
          </div>
        </header>

        <div className="search-hero-card">
          <div className="search-hero-card__content">
            <span className="search-hero-card__eyebrow">Busca</span>
            <h2 className="search-hero-card__title">Encontre registros rapidamente</h2>
            <p className="search-hero-card__text">
              Use o filtro e alterne entre as colecoes disponiveis.
            </p>
          </div>

          <form className="app-search-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="catalog-search">
              Filtrar dados da plataforma
            </label>
            <textarea
              id="catalog-search"
              className="app-search-form__input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={3}
              placeholder={defaultQuery}
            />
            <button type="submit" className="btn btn-primary app-search-form__button">
              Filtrar dados
            </button>
          </form>
        </div>

        <div className="app-search-layout">
          <aside className="semantic-panel">
            <div className="semantic-panel__block">
              <span className="semantic-panel__label">Perfil autenticado</span>
              <p className="semantic-panel__query">{user?.displayName}</p>
              <p className="semantic-panel__text">
                {user?.type === 'empresa'
                  ? 'Pesquisadores aparecem primeiro para empresas.'
                  : 'Pesquisas aparecem primeiro para pesquisadores.'}
              </p>
            </div>

            <div className="semantic-panel__block">
              <h3 className="semantic-panel__title">Colecoes disponiveis</h3>
              <div className="semantic-panel__chips">
                <button
                  type="button"
                  className={`semantic-chip semantic-chip--button${activeTab === 'pesquisas' ? ' active' : ''}`}
                  onClick={() => setActiveTab('pesquisas')}
                >
                  Pesquisas
                </button>
                <button
                  type="button"
                  className={`semantic-chip semantic-chip--button${activeTab === 'pesquisadores' ? ' active' : ''}`}
                  onClick={() => setActiveTab('pesquisadores')}
                >
                  Pesquisadores
                </button>
                <button
                  type="button"
                  className={`semantic-chip semantic-chip--button${activeTab === 'empresas' ? ' active' : ''}`}
                  onClick={() => setActiveTab('empresas')}
                >
                  Empresas
                </button>
                <button
                  type="button"
                  className={`semantic-chip semantic-chip--button${activeTab === 'universidades' ? ' active' : ''}`}
                  onClick={() => setActiveTab('universidades')}
                >
                  Universidades
                </button>
              </div>
            </div>
          </aside>

          <div className="search-results">
            <div className="search-results__header">
              <div>
                <span className="section-label">Resultado atual</span>
                <h2 className="search-results__title">
                  {activeTab === 'pesquisas'
                    ? 'Base de pesquisas'
                    : activeTab === 'pesquisadores'
                      ? 'Base de pesquisadores'
                      : activeTab === 'empresas'
                        ? 'Base de empresas'
                        : 'Base de universidades'}
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
        </div>
      </div>
    </section>
  )
}
