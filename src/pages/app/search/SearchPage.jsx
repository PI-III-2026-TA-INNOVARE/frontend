import { useEffect, useMemo, useState } from 'react'
import { formatBooleanLabel, normalizeText } from '../../../lib/domain'
import { useAuth } from '../../../context/AuthContext'
import PageFaq from '../../../components/PageFaq'
import {
  getResearcherResume,
  listCompanies,
  listResearchAreas,
  listResearchers,
  listUniversities,
} from '../../../services/pdConnectApi'
import './SearchPage.scss'

const defaultQuery = 'pesquisar por nome, universidade, cnpj, area ou status'

const searchFaqSections = [
  {
    title: 'O que esta pagina usa hoje',
    text: 'A busca trabalha com leitura real da API protegida por JWT e filtro textual local no front.',
    items: [
      'GET /api/companies/',
      'GET /api/researchers/',
      'GET /api/research/area/',
      'GET /api/universities/',
      'GET /api/researchers/{id}/resume/',
    ],
  },
  {
    title: 'O que continua fora do escopo',
    text: 'Alguns fluxos previstos no projeto ainda nao tem rota real disponivel e, por isso, nao aparecem como funcionalidade completa aqui.',
    items: [
      'Busca semantica',
      'Match por IA',
      'Propostas e atualizacao de status',
      'Notificacoes',
    ],
  },
  {
    title: 'Como esta tela se comporta',
    text: 'Empresas e pesquisadores veem a mesma base integrada, mas a aba inicial muda conforme o perfil autenticado para priorizar o tipo de exploracao mais util naquele contexto.',
  },
]

function getDefaultTab(userType) {
  return userType === 'empresa' ? 'pesquisadores' : 'empresas'
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

export default function SearchPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [activeTab, setActiveTab] = useState(() => getDefaultTab(user?.type))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFaqOpen, setIsFaqOpen] = useState(false)
  const [catalog, setCatalog] = useState({
    companies: [],
    researchers: [],
    researchAreas: [],
    universities: [],
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

      try {
        const [companies, researchers, researchAreas, universities] = await Promise.all([
          listCompanies(),
          listResearchers(),
          listResearchAreas(),
          listUniversities(),
        ])

        const resumeResults = await Promise.allSettled(
          researchers.map((item) => getResearcherResume(item.id_researcher))
        )

        if (!isMounted) {
          return
        }

        setCatalog({
          companies,
          researchers,
          researchAreas,
          universities,
          resumeLookup: buildResumeLookup(researchers, resumeResults),
        })
      } catch (loadFailure) {
        if (!isMounted) {
          return
        }

        setError(
          loadFailure.message || 'Nao foi possivel carregar os dados reais da API para o painel.'
        )
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
  }, [])

  const universityLookup = useMemo(
    () => buildUniversityLookup(catalog.universities),
    [catalog.universities]
  )

  const researchAreaLookup = useMemo(
    () => buildResearchAreaLookup(catalog.researchAreas),
    [catalog.researchAreas]
  )

  const companyItems = useMemo(() => (
    catalog.companies.map((company) => ({
      id: `company-${company.id_company}`,
      type: 'empresa',
      title: company.name,
      subtitle: company.cnpj,
      description:
        `Situacao cadastral: ${company.registration_status || 'nao informada'}. ` +
        `Status do cadastro: ${formatBooleanLabel(company.status, {
          trueLabel: 'ativo',
          falseLabel: 'inativo',
          nullLabel: 'nao informado',
        })}.`,
      tags: [
        company.registration_status || 'Sem situacao',
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
            : 'Nenhum pesquisador esta vinculado a esta universidade no backend atual.',
        tags: ['Universidade', `${linkedResearchers.length} vinculados`],
      }
    })
  ), [catalog.researchers, catalog.universities])

  const visibleItems = useMemo(() => {
    const sourceMap = {
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
  }, [activeQuery, activeTab, companyItems, researcherItems, universityItems])

  const handleSubmit = (event) => {
    event.preventDefault()
    setActiveQuery(query.trim())
  }

  return (
    <section className="app-page app-search-page">
      <div className="container app-page__container">
        <header className="app-page__header">
          <div>
            <span className="section-label">Painel integrado</span>
            <h1 className="app-page__title">Exploracao dos dados reais da plataforma</h1>
          </div>
          <div className="app-page__header-actions">
            <p className="app-page__subtitle">
              Explore empresas, pesquisadores, areas de pesquisa e universidades com base nos dados
              autenticados disponiveis hoje.
            </p>
            <button
              type="button"
              className="btn btn-outline page-faq-trigger"
              onClick={() => setIsFaqOpen(true)}
            >
              FAQ da pagina
            </button>
          </div>
        </header>

        <div className="search-hero-card">
          <div className="search-hero-card__content">
            <span className="search-hero-card__eyebrow">Busca integrada</span>
            <h2 className="search-hero-card__title">Explore a base atual sem sair do fluxo principal</h2>
            <p className="search-hero-card__text">
              Use o filtro para localizar perfis e instituicoes com rapidez. Os detalhes tecnicos da
              integracao ficam disponiveis no FAQ desta pagina.
            </p>
          </div>

          <form className="app-search-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="catalog-search">
              Filtrar dados reais da API
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
                  ? 'Empresa logada: priorizamos a exploracao de pesquisadores, areas e curriculos.'
                  : 'Pesquisador logado: priorizamos a exploracao de empresas e universidades.'}
              </p>
            </div>

            <div className="semantic-panel__block">
              <h3 className="semantic-panel__title">Colecoes disponiveis</h3>
              <div className="semantic-panel__chips">
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

            <div className="semantic-panel__block semantic-panel__block--faq">
              <h3 className="semantic-panel__title">Precisa de contexto?</h3>
              <p className="semantic-panel__text">
                Abra o FAQ para ver os endpoints usados nesta tela e o que ainda depende de backend.
              </p>
              <button
                type="button"
                className="btn btn-ghost page-faq-trigger"
                onClick={() => setIsFaqOpen(true)}
              >
                Abrir FAQ
              </button>
            </div>
          </aside>

          <div className="search-results">
            <div className="search-results__header">
              <div>
                <span className="section-label">Resultado atual</span>
                <h2 className="search-results__title">
                  {activeTab === 'pesquisadores'
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

            {loading ? (
              <div className="search-feedback-card">
                <h3>Carregando dados da API</h3>
                <p>Estamos consultando os endpoints protegidos para montar o painel integrado.</p>
              </div>
            ) : null}

            {!loading && error ? (
              <div className="search-feedback-card search-feedback-card--error">
                <h3>Falha ao carregar o painel</h3>
                <p>{error}</p>
              </div>
            ) : null}

            {!loading && !error && visibleItems.length === 0 ? (
              <div className="search-feedback-card">
                <h3>Nenhum resultado encontrado</h3>
                <p>
                  Ajuste o filtro textual ou troque a colecao ativa para explorar outra parte da base
                  integrada.
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
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <PageFaq
        isOpen={isFaqOpen}
        onClose={() => setIsFaqOpen(false)}
        title="Busca integrada"
        intro="Este FAQ resume o que a pagina ja consome do backend autenticado e o que ainda esta fora do escopo porque depende de rotas que nao existem hoje."
        sections={searchFaqSections}
      />
    </section>
  )
}
