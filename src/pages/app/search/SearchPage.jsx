import { useEffect, useMemo, useRef, useState } from 'react'
import ResearchDetailModal from '../../../components/ResearchDetailModal'
import ResearcherDetailModal from '../../../components/ResearcherDetailModal'
import { useAuth } from '../../../context/AuthContext'
import { buildPageLabel, paginateItems } from '../../../lib/domain'
import {
  createManualCandidate,
  createResearchInterest,
  getResearch,
  getResearcher,
  getResearcherResume,
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
const SEARCH_RESULTS_PAGE_SIZE = 20

function getDefaultQuery(userType) {
  return userType === 'empresa'
    ? 'Busque por área, universidade, experiência ou habilidade'
    : 'Busque por tema, área, objetivo ou empresa'
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
    return 'relevância não informada'
  }

  return `${Math.round(parsed * 100)}% de relevância`
}

function normalizeSearchText(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isMissingSearchEndpoint(error) {
  return error?.status === 404
}

function scoreLocalResearchMatch(research, query, researchAreaLookup) {
  const normalizedQuery = normalizeSearchText(query)
  const terms = normalizedQuery.split(/[^a-z0-9]+/).filter((term) => term.length >= 2)
  const areaName = researchAreaLookup[String(research.area)]?.name || ''
  const fields = [
    research.title,
    research.scope,
    research.goal,
    research.justification,
    research.results,
    areaName,
  ]
  const searchableText = normalizeSearchText(fields.filter(Boolean).join(' '))

  if (!searchableText || terms.length === 0) {
    return 0
  }

  const matchedTerms = terms.filter((term) => searchableText.includes(term))
  const titleMatch = normalizeSearchText(research.title).includes(normalizedQuery)
  const areaMatch = normalizeSearchText(areaName).includes(normalizedQuery)
  const coverage = matchedTerms.length / terms.length
  const exactBoost = titleMatch ? 0.25 : areaMatch ? 0.15 : 0

  return Math.min(1, coverage + exactBoost)
}

function buildLocalResearchResults(researches, params, researchAreaLookup) {
  return researches
    .filter((research) => {
      if (params.area_id && String(research.area) !== String(params.area_id)) {
        return false
      }

      if (params.open_only === 'true' && research.status !== 'aberta') {
        return false
      }

      return scoreLocalResearchMatch(research, params.q, researchAreaLookup) > 0
    })
    .map((research) => {
      const score = scoreLocalResearchMatch(research, params.q, researchAreaLookup)
      const areaName = researchAreaLookup[String(research.area)]?.name || 'Area nao informada'

      return {
        ...research,
        area: areaName,
        company: research.company ? `Empresa #${research.company}` : 'Empresa nao informada',
        score_hybrid: score,
        score_semantic: score,
        score_lexical: score,
      }
    })
    .sort((a, b) => b.score_hybrid - a.score_hybrid)
}

function getResearcherAreaIds(researcher) {
  if (!Array.isArray(researcher.area)) {
    return []
  }

  return researcher.area.map((area) => {
    if (area && typeof area === 'object') {
      return String(area.id_area ?? area.id)
    }

    return String(area)
  })
}

function countResearchesByArea(researches) {
  return researches.reduce((lookup, research) => {
    const areaId = research.area

    if (areaId !== null && areaId !== undefined) {
      lookup[String(areaId)] = (lookup[String(areaId)] || 0) + 1
    }

    return lookup
  }, {})
}

function countResearchersByArea(researchers, availabilityFilter = '') {
  return researchers.reduce((lookup, researcher) => {
    if (researcher.status !== true) {
      return lookup
    }

    if (availabilityFilter && String(researcher.availability) !== availabilityFilter) {
      return lookup
    }

    getResearcherAreaIds(researcher).forEach((areaId) => {
      lookup[areaId] = (lookup[areaId] || 0) + 1
    })

    return lookup
  }, {})
}

function scoreLocalResearcherMatch(researcher, query, researchAreaLookup, universityName = '') {
  const normalizedQuery = normalizeSearchText(query)
  const terms = normalizedQuery.split(/[^a-z0-9]+/).filter((term) => term.length >= 2)
  const areaNames = getResearcherAreaIds(researcher).map(
    (areaId) => researchAreaLookup[areaId]?.name || ''
  )
  const searchableText = normalizeSearchText([
    researcher.name,
    universityName,
    ...areaNames,
  ].filter(Boolean).join(' '))

  if (!searchableText || terms.length === 0) {
    return 0
  }

  const matchedTerms = terms.filter((term) => searchableText.includes(term))
  const nameMatch = normalizeSearchText(researcher.name).includes(normalizedQuery)
  const areaMatch = areaNames.some((areaName) => normalizeSearchText(areaName).includes(normalizedQuery))
  const universityMatch = normalizeSearchText(universityName).includes(normalizedQuery)
  const coverage = matchedTerms.length / terms.length
  const exactBoost = nameMatch ? 0.3 : areaMatch ? 0.18 : universityMatch ? 0.12 : 0

  return Math.min(1, coverage + exactBoost)
}

function buildLocalResearcherResults(researchers, params, researchAreaLookup, universityLookup) {
  return researchers
    .filter((researcher) => {
      if (researcher.status !== true) {
        return false
      }

      if (params.available && String(researcher.availability) !== params.available) {
        return false
      }

      if (params.area_id && !getResearcherAreaIds(researcher).includes(String(params.area_id))) {
        return false
      }

      const universityName = universityLookup[String(researcher.university)]?.name || ''
      return scoreLocalResearcherMatch(researcher, params.q, researchAreaLookup, universityName) > 0
    })
    .map((researcher) => {
      const universityName = universityLookup[String(researcher.university)]?.name || null
      const score = scoreLocalResearcherMatch(researcher, params.q, researchAreaLookup, universityName)

      return {
        id_researcher: researcher.id_researcher,
        name: researcher.name,
        university: universityName,
        availability: researcher.availability,
        score_hybrid: score,
        score_semantic: score,
        score_lexical: score,
        score_token_coverage: score,
      }
    })
    .sort((a, b) => b.score_hybrid - a.score_hybrid)
}

function getResearcherAreaTags(detail, researchAreaLookup) {
  const areaList = Array.isArray(detail?.area)
    ? detail.area
    : detail?.area
      ? [detail.area]
      : []
  const areaNames = areaList
    .map((area) => {
      if (area && typeof area === 'object') {
        const areaId = area.id_area ?? area.id
        return area.name || researchAreaLookup[String(areaId)]?.name
      }

      return researchAreaLookup[String(area)]?.name || (Number.isNaN(Number(area)) ? String(area) : '')
    })
    .filter(Boolean)

  return [...new Set(areaNames)]
}

function formatCurrency(value) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 'orçamento não informado'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(parsed)
}

function getErrorTitle(error) {
  if (error?.status === 403) {
    return 'Busca indisponível para este perfil'
  }

  if (error?.status === 401) {
    return 'Sessão expirada'
  }

  return 'Não foi possível concluir a busca'
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
  const [resultsPage, setResultsPage] = useState(1)
  const [researchDetails, setResearchDetails] = useState({})
  const [researcherDetails, setResearcherDetails] = useState({})
  const [researcherResumeDetails, setResearcherResumeDetails] = useState({})
  const [selectedResearch, setSelectedResearch] = useState(null)
  const [selectedResearcher, setSelectedResearcher] = useState(null)
  const [companyResearches, setCompanyResearches] = useState([])
  const [projectSearch, setProjectSearch] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supportLoading, setSupportLoading] = useState(true)
  const [error, setError] = useState('')
  const [errorTitle, setErrorTitle] = useState('Não foi possível concluir a busca')
  const [partialWarnings, setPartialWarnings] = useState([])
  const [interestLoading, setInterestLoading] = useState('')
  const [interestMessage, setInterestMessage] = useState('')
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestMessage, setSuggestMessage] = useState('')
  const [suggestError, setSuggestError] = useState('')
  const [researchAreas, setResearchAreas] = useState([])
  const [myInterests, setMyInterests] = useState([])
  const [areaCountSource, setAreaCountSource] = useState([])

  useEffect(() => {
    let isMounted = true

    const loadSupportData = async () => {
      setSupportLoading(true)
      setPartialWarnings([])
      const warnings = []

      if (!isMounted) {
        return
      }

      try {
        setResearchAreas(await listResearchAreas())
      } catch {
        warnings.push('Nao foi possivel carregar areas de pesquisa.')
        setResearchAreas([])
      }

      if (!isMounted) {
        return
      }

      setSupportLoading(false)

      try {
        if (isCompanyUser) {
          const [researches, researchers] = await Promise.all([
            listResearches(),
            listResearchers(),
          ])

          if (!isMounted) {
            return
          }

          setAreaCountSource(researchers)
          setCompanyResearches(
            researches.filter((item) => String(item.company) === String(user?.company?.id_company))
          )
          setMyInterests([])
        } else {
          const [interests, researches] = await Promise.all([
            listMyResearchInterests(),
            listResearches(),
          ])

          if (!isMounted) {
            return
          }

          setAreaCountSource(researches)
          setMyInterests(interests)
          setCompanyResearches([])
        }
      } catch {
        warnings.push(
          isCompanyUser
            ? 'Nao foi possivel carregar pesquisas da empresa.'
            : 'Nao foi possivel carregar interesses do pesquisador.'
        )
      }

      if (isMounted) {
        setPartialWarnings(warnings)
      }
    }

    setQuery('')
    setActiveQuery('')
    setSelectedAreaId('')
    setAvailabilityFilter('')
    setResults([])
    setResultsPage(1)
    setResearchDetails({})
    setResearcherDetails({})
    setResearcherResumeDetails({})
    setSelectedResearch(null)
    setSelectedResearcher(null)
    setSelectedProjectId('')
    setProjectSearch('')
    setAreaCountSource([])
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
  const areaCountLookup = useMemo(() => (
    isCompanyUser
      ? countResearchersByArea(areaCountSource, availabilityFilter)
      : countResearchesByArea(areaCountSource)
  ), [areaCountSource, availabilityFilter, isCompanyUser])
  const selectedAreaResultCount = selectedAreaId
    ? areaCountLookup[String(selectedAreaId)] || 0
    : 0

  const visibleItems = useMemo(() => {
    if (isCompanyUser) {
      return results.map((item) => {
        const detail = researcherDetails[item.id_researcher] || {}
        const resume = researcherResumeDetails[item.id_researcher] || null
        const tags = getResearcherAreaTags(detail, researchAreaLookup)
        const fallbackTags = tags.length > 0 ? tags : getResearcherAreaTags(item, researchAreaLookup)

        return {
          id: `researcher-${item.id_researcher}`,
          researcherId: item.id_researcher,
          type: 'pesquisador',
          title: detail.name || item.name || 'Pesquisador sem nome informado',
          subtitle: detail.university_name || item.university || 'Universidade não informada',
          tags: fallbackTags,
          availability: detail.availability ?? item.availability,
          scoreHybrid: item.score_hybrid ?? null,
          scoreSemantic: item.score_semantic ?? null,
          detail: {
            ...detail,
            resumeData: resume,
            scoreHybrid: item.score_hybrid ?? null,
            scoreSemantic: item.score_semantic ?? null,
          },
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
      const company = item.company || 'Empresa não informada'
      const area = item.area || 'Área não informada'

      return {
        id: `research-${item.id_research}`,
        type: 'pesquisa',
        researchId: item.id_research,
        title: detail.title || item.title || 'Pesquisa sem título informado',
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
  }, [interestLookup, interestedResearchIds, isCompanyUser, researchAreaLookup, researchDetails, researcherDetails, researcherResumeDetails, results])

  const shouldShowResults = hasSearched || loading || Boolean(error) || Boolean(interestMessage)
  const hasEmptySearchResult = hasSearched && !loading && !error && visibleItems.length === 0
  const totalResultPages = Math.max(
    1,
    Math.ceil(visibleItems.length / SEARCH_RESULTS_PAGE_SIZE)
  )
  const paginatedVisibleItems = useMemo(
    () => paginateItems(visibleItems, resultsPage, SEARCH_RESULTS_PAGE_SIZE),
    [resultsPage, visibleItems]
  )

  useEffect(() => {
    setResultsPage((current) => Math.min(current, totalResultPages))
  }, [totalResultPages])

  const activeSelectedResearcher = useMemo(() => {
    if (!selectedResearcher) {
      return null
    }

    return visibleItems.find((item) => item.id === selectedResearcher.id) || selectedResearcher
  }, [selectedResearcher, visibleItems])

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
      setResultsPage(1)
      setResearchDetails({})
      setResearcherDetails({})
      setResearcherResumeDetails({})
      setSelectedResearch(null)
      setSelectedResearcher(null)
      setErrorTitle('Termo de busca obrigatório')
      setError('Digite um termo para iniciar a busca semântica.')
      return
    }

    const requestId = searchRequestRef.current + 1
    searchRequestRef.current = requestId
    setLoading(true)
    setHasSearched(true)
    setActiveQuery(trimmedQuery)
    setResultsPage(1)
    setError('')
    setResearcherResumeDetails({})
    setErrorTitle('Não foi possível concluir a busca')

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
      let data
      let allResearchers = null

      if (isCompanyUser) {
        try {
          data = await searchResearchers(params)
        } catch (searchError) {
          if (!isMissingSearchEndpoint(searchError)) {
            throw searchError
          }

          allResearchers = await listResearchers()
          const universityIds = [
            ...new Set(
              allResearchers
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

          data = buildLocalResearcherResults(allResearchers, params, researchAreaLookup, universityLookup)
        }
      } else {
        try {
          data = await searchResearch(params)
        } catch (searchError) {
          if (!isMissingSearchEndpoint(searchError)) {
            throw searchError
          }

          const researches = await listResearches()
          data = buildLocalResearchResults(researches, params, researchAreaLookup)
        }
      }

      if (searchRequestRef.current !== requestId) {
        return
      }

      let nextResults = Array.isArray(data) ? data : []
      let nextDetails = {}
      let nextResearcherDetails = {}
      let nextResearcherResumeDetails = {}

      if (isCompanyUser) {
        allResearchers = allResearchers || await listResearchers()
        const directResearcherMatches = allResearchers.filter((researcher) => {
          if (researcher.status !== true) {
            return false
          }

          if (availabilityFilter && String(researcher.availability) !== availabilityFilter) {
            return false
          }

          if (
            selectedAreaId &&
            !getResearcherAreaIds(researcher).includes(String(selectedAreaId))
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
        const resumeResults = await Promise.allSettled(
          nextResults.map((item) => getResearcherResume(item.id_researcher))
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
        nextResearcherResumeDetails = resumeResults.reduce((lookup, result, index) => {
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
      setResearcherResumeDetails(nextResearcherResumeDetails)
      setSelectedResearch(null)
    } catch (searchError) {
      if (searchRequestRef.current !== requestId) {
        return
      }

      setResults([])
      setResearchDetails({})
      setResearcherDetails({})
      setResearcherResumeDetails({})
      setSelectedResearch(null)
      setSelectedResearcher(null)
      setErrorTitle(getErrorTitle(searchError))
      setError(searchError.message || 'A busca semântica não retornou uma resposta válida.')
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
      setErrorTitle('Não foi possível registrar interesse')
      setError(interestError.message || 'Não foi possível registrar interesse nesta pesquisa.')
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
    setSuggestMessage('')
    setSuggestError('')
  }

  const handleSuggestParticipation = async (researchId, researcherId) => {
    if (!researchId || !researcherId) return
    setSuggestLoading(true)
    setSuggestMessage('')
    setSuggestError('')
    try {
      await createManualCandidate(researchId, researcherId)
      setSuggestMessage('Pesquisador indicado com sucesso para a pesquisa.')
      setSelectedProjectId('')
    } catch (err) {
      setSuggestError(err.message || 'Não foi possível registrar a indicação.')
    } finally {
      setSuggestLoading(false)
    }
  }

  return (
    <section className="app-page app-search-page">
      <div className="container app-page__container app-search-page__container">
        <div className="app-search-layout">
          <aside className="semantic-panel">
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
                      <span>Area</span>
                      {selectedAreaId ? (
                        <span className="semantic-field__count-badge">
                          {selectedAreaResultCount}
                        </span>
                      ) : null}
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

            {!shouldShowResults ? (
              <div className="search-empty-state">
                <p className="search-empty-state__text">
                  {isCompanyUser
                    ? 'Use a busca acima para encontrar pesquisadores compatíveis com sua demanda.'
                    : 'Use a busca acima para encontrar pesquisas abertas compatíveis com seu perfil.'}
                </p>
              </div>
            ) : null}

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
                    {hasSearched
                      ? `${buildPageLabel(resultsPage, visibleItems.length, SEARCH_RESULTS_PAGE_SIZE)} resultado(s) para "${activeQuery}".`
                      : ''}
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
                <>
                  <div className="search-results__list">
                    {paginatedVisibleItems.map((item) => (
                      <article key={item.id} className="search-result-card">
                      {item.type === 'pesquisa' ? (
                        <div className="search-result-card__top">
                          <span className={`search-result-card__type search-result-card__type--${item.type}`}>
                            Pesquisa
                          </span>
                        </div>
                      ) : null}

                      {item.type === 'pesquisador' ? (
                        <div className="search-result-card__researcher-heading">
                          <h3 className="search-result-card__title">{item.title}</h3>
                          <span className="researcher-availability-badge">
                            {item.availability === false ? 'Indisponivel' : item.availability === true ? 'Disponivel' : 'Disponibilidade nao informada'}
                          </span>
                        </div>
                      ) : (
                        <h3 className="search-result-card__title">{item.title}</h3>
                      )}
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

                     
                      </article>
                    ))}
                  </div>

                  {visibleItems.length > SEARCH_RESULTS_PAGE_SIZE ? (
                    <div className="search-pagination">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setResultsPage((current) => Math.max(1, current - 1))}
                        disabled={resultsPage === 1}
                      >
                        Anterior
                      </button>
                      <span className="search-pagination__status">
                        Pagina {resultsPage} de {totalResultPages}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setResultsPage((current) => Math.min(totalResultPages, current + 1))}
                        disabled={resultsPage === totalResultPages}
                      >
                        Proxima
                      </button>
                    </div>
                  ) : null}
                </>
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

      {activeSelectedResearcher ? (
        <ResearcherDetailModal
          researcher={activeSelectedResearcher}
          onClose={closeResearcherDetails}
          companyResearches={companyResearches}
          projectGroups={projectGroups}
          projectSearch={projectSearch}
          onProjectSearchChange={(event) => setProjectSearch(event.target.value)}
          selectedProjectId={selectedProjectId}
          onSelectedProjectChange={(event) => setSelectedProjectId(event.target.value)}
          onSuggest={handleSuggestParticipation}
          suggestLoading={suggestLoading}
          suggestMessage={suggestMessage}
          suggestError={suggestError}
        />
      ) : null}
    </section>
  )
}
