import { useCallback, useEffect, useMemo, useState } from 'react'
import ResearchDetailModal from '../../../components/ResearchDetailModal'
import ResearcherDetailModal from '../../../components/ResearcherDetailModal'
import { useAuth } from '../../../context/AuthContext'
import { buildPageLabel, paginateItems } from '../../../lib/domain'
import {
  createResearch,
  getResearcher,
  getResearcherResume,
  getUniversity,
  listResearchAreas,
  listResearchCandidates,
  listResearches,
  runResearchMatch,
  updateResearch,
  updateResearchCandidateStatus,
} from '../../../services/pdConnectApi'
import './PublishChallengePage.scss'

const candidateStatusOptions = [
  { value: 'under_review', label: 'Em análise' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'rejected', label: 'Rejeitado' },
]

const PUBLISHED_RESEARCH_PAGE_SIZE = 20

const researchCandidateFilterOptions = [
  { value: 'all', label: 'Todas as pesquisas' },
  { value: 'with_candidates', label: 'Com candidatos' },
  { value: 'source_interest', label: 'Com interessados' },
  { value: 'status_interested', label: 'Interesse pendente' },
  { value: 'status_under_review', label: 'Em analise' },
  { value: 'status_approved', label: 'Aceitos' },
  { value: 'status_rejected', label: 'Rejeitados' },
  { value: 'status_suggested', label: 'Sugeridos' },
  { value: 'source_ai', label: 'Match por IA' },
]

const defaultResearchForm = {
  title: '',
  scope: '',
  goal: '',
  justification: '',
  results: '',
  deadline: '',
  budget: '',
  areaId: '',
}

function validateResearchForm(form, { hasResearchAreas }) {
  if (!form.title.trim()) {
    return 'Informe o titulo da pesquisa.'
  }

  if (!form.scope.trim() || !form.goal.trim() || !form.justification.trim() || !form.results.trim()) {
    return 'Preencha escopo, objetivo, justificativa e resultados esperados.'
  }

  if (!form.deadline) {
    return 'Informe o prazo da pesquisa.'
  }

  if (!form.budget || Number(form.budget) <= 0) {
    return 'Informe um orcamento maior que zero.'
  }

  if (!hasResearchAreas) {
    return 'Nenhuma area de pesquisa esta disponivel para publicar.'
  }

  if (!form.areaId) {
    return 'Selecione uma area de pesquisa.'
  }

  return ''
}

function buildLookup(items, idKey, labelKey) {
  return items.reduce((lookup, item) => {
    lookup[item[idKey]] = item[labelKey]
    return lookup
  }, {})
}

function buildResearchModalPayload(research, researchAreaLookup, user) {
  if (!research) {
    return null
  }

  return {
    ...research,
    areaLabel: researchAreaLookup[research.area] || 'Área não identificada',
    companyLabel: user?.displayName || user?.company?.razao_social || 'Empresa não informada',
  }
}

function formatDeadlineLabel(value) {
  if (!value) {
    return 'prazo não informado'
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

function normalizeDeadlineToIso(value) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toISOString()
}

function formatDatetimeLocalValue(value) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  const timezoneOffset = parsed.getTimezoneOffset() * 60000
  return new Date(parsed.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

function buildResearchFormFromItem(item) {
  return {
    title: item.title || '',
    scope: item.scope || '',
    goal: item.goal || '',
    justification: item.justification || '',
    results: item.results || '',
    deadline: formatDatetimeLocalValue(item.deadline),
    budget: item.budget === null || item.budget === undefined ? '' : String(item.budget),
    areaId: item.area === null || item.area === undefined ? '' : String(item.area),
  }
}

function buildResearchPayload(form) {
  return {
    title: form.title.trim(),
    scope: form.scope.trim(),
    goal: form.goal.trim(),
    justification: form.justification.trim(),
    results: form.results.trim(),
    deadline: normalizeDeadlineToIso(form.deadline),
    budget: Number(form.budget),
    area: Number(form.areaId),
  }
}

function researchMatchesCandidateFilter(research, candidatesByResearch, filter) {
  if (filter === 'all') {
    return true
  }

  const candidates = candidatesByResearch[research.id_research] || []

  if (filter === 'with_candidates') {
    return candidates.length > 0
  }

  if (filter === 'source_interest') {
    return candidates.some((candidate) => candidate.source === 'interest')
  }

  if (filter === 'source_ai') {
    return candidates.some((candidate) => candidate.source === 'ai')
  }

  if (filter.startsWith('status_')) {
    const status = filter.replace('status_', '')
    return candidates.some((candidate) => candidate.status === status)
  }

  return true
}

function getCandidateStatusLabel(status) {
  const labels = {
    suggested: 'Sugerido',
    interested: 'Interessado',
    under_review: 'Em análise',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
  }

  return labels[status] || status || 'não informado'
}

function getCandidateSourceLabel(source) {
  const labels = {
    ai: 'Match por IA',
    interest: 'Manifestação de interesse',
    manual: 'Indicação manual',
  }

  return labels[source] || source || 'origem não informada'
}

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

export default function PublishChallengePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('create')
  const [publishedPage, setPublishedPage] = useState(1)
  const [researchAreasLoading, setResearchAreasLoading] = useState(true)
  const [researchesLoading, setResearchesLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [candidateLoadingIds, setCandidateLoadingIds] = useState(() => new Set())
  const [candidateActionLoading, setCandidateActionLoading] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [candidateMessage, setCandidateMessage] = useState('')
  const [selectedResearch, setSelectedResearch] = useState(null)
  const [selectedResearcher, setSelectedResearcher] = useState(null)
  const [researcherLoadingId, setResearcherLoadingId] = useState(null)
  const [researcherErrorMessage, setResearcherErrorMessage] = useState('')
  const [editingResearchId, setEditingResearchId] = useState(null)
  const [researchCandidateFilter, setResearchCandidateFilter] = useState('all')
  const [catalog, setCatalog] = useState({
    researches: [],
    researchAreas: [],
    candidatesByResearch: {},
  })
  const [researchForm, setResearchForm] = useState(defaultResearchForm)

  useEffect(() => {
    let isMounted = true

    const loadCandidatesInBackground = async (researchesToLoad) => {
      const researchIds = researchesToLoad.map((item) => item.id_research)
      setCandidateLoadingIds(new Set(researchIds))

      for (let index = 0; index < researchesToLoad.length; index += 6) {
        const batch = researchesToLoad.slice(index, index + 6)
        const candidateResults = await Promise.allSettled(
          batch.map((item) => listResearchCandidates(item.id_research))
        )

        if (!isMounted) {
          return
        }

        setCatalog((current) => {
          const nextCandidatesByResearch = { ...current.candidatesByResearch }

          batch.forEach((research, batchIndex) => {
            const result = candidateResults[batchIndex]
            nextCandidatesByResearch[research.id_research] =
              result.status === 'fulfilled' ? result.value : []
          })

          return {
            ...current,
            candidatesByResearch: nextCandidatesByResearch,
          }
        })

        setCandidateLoadingIds((current) => {
          const next = new Set(current)
          batch.forEach((research) => next.delete(research.id_research))
          return next
        })
      }
    }

    const loadResearchAreas = async () => {
      setResearchAreasLoading(true)
      setErrorMessage('')

      try {
        const researchAreas = await listResearchAreas()

        if (!isMounted) {
          return
        }

        setCatalog((current) => ({
          ...current,
          researchAreas,
        }))
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(
          error.message || 'Nao foi possivel carregar as areas de pesquisa.'
        )
      } finally {
        if (isMounted) {
          setResearchAreasLoading(false)
        }
      }
    }

    const loadResearches = async () => {
      setResearchesLoading(true)
      setCandidateLoadingIds(new Set())

      try {
        const researches = await listResearches()
        const ownedResearches = researches.filter(
          (item) => item.company === user?.company?.id_company
        )

        if (!isMounted) {
          return
        }

        setCatalog((current) => ({
          ...current,
          researches,
          candidatesByResearch: {},
        }))
        loadCandidatesInBackground(ownedResearches)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(error.message || 'Nao foi possivel carregar as pesquisas publicadas.')
      } finally {
        if (isMounted) {
          setResearchesLoading(false)
        }
      }
    }

    loadResearchAreas()
    loadResearches()

    return () => {
      isMounted = false
    }
  }, [user?.company?.id_company])

  const ownedResearches = useMemo(() => (
    catalog.researches.filter((item) => item.company === user?.company?.id_company)
  ), [catalog.researches, user?.company?.id_company])
  const filteredOwnedResearches = useMemo(() => (
    ownedResearches.filter((item) => (
      researchMatchesCandidateFilter(item, catalog.candidatesByResearch, researchCandidateFilter)
    ))
  ), [catalog.candidatesByResearch, ownedResearches, researchCandidateFilter])
  const totalPublishedPages = Math.max(
    1,
    Math.ceil(filteredOwnedResearches.length / PUBLISHED_RESEARCH_PAGE_SIZE)
  )

  useEffect(() => {
    setPublishedPage((current) => Math.min(current, totalPublishedPages))
  }, [totalPublishedPages])

  useEffect(() => {
    setPublishedPage(1)
  }, [researchCandidateFilter])

  const paginatedOwnedResearches = useMemo(
    () => paginateItems(filteredOwnedResearches, publishedPage, PUBLISHED_RESEARCH_PAGE_SIZE),
    [filteredOwnedResearches, publishedPage]
  )

  const researchAreaLookup = useMemo(
    () => buildLookup(catalog.researchAreas, 'id_area', 'name'),
    [catalog.researchAreas]
  )
  const hasResearchAreas = catalog.researchAreas.length > 0

  const handleViewResearcher = useCallback(async (candidate) => {
    if (!candidate?.researcher) return

    setResearcherLoadingId(candidate.id_candidate)
    setResearcherErrorMessage('')

    try {
      const researcher = await getResearcher(candidate.researcher)

      const [resumeResult, universityResult] = await Promise.allSettled([
        researcher?.resume ? getResearcherResume(candidate.researcher) : Promise.resolve(null),
        researcher?.university ? getUniversity(researcher.university) : Promise.resolve(null),
      ])

      const resume = resumeResult.status === 'fulfilled' ? resumeResult.value : null
      const university = universityResult.status === 'fulfilled' ? universityResult.value : null

      const areaIds = Array.isArray(researcher?.area) ? researcher.area : []
      const tags = areaIds
        .map((areaId) => {
          if (areaId && typeof areaId === 'object') {
            return areaId.name || researchAreaLookup[String(areaId.id_area ?? areaId.id)]
          }
          return researchAreaLookup[String(areaId)]
        })
        .filter(Boolean)

      setSelectedResearcher({
        id: `researcher-${researcher.id_researcher}`,
        type: 'pesquisador',
        title: researcher.name || candidate.researcher_name || 'Pesquisador sem nome',
        subtitle: university?.name || 'Universidade não informada',
        tags,
        availability: researcher.availability,
        detail: {
          ...researcher,
          university_name: university?.name,
          resumeData: resume,
          matchReasons: Array.isArray(candidate.match_reasons) ? candidate.match_reasons : [],
          scoreMatch: candidate.score_match ?? null,
          candidateSource: candidate.source,
          interestMessage: candidate.interest_message || '',
        },
      })
    } catch (error) {
      setResearcherErrorMessage(
        error.message || 'Não foi possível carregar os detalhes deste pesquisador.'
      )
    } finally {
      setResearcherLoadingId(null)
    }
  }, [researchAreaLookup])

  const handleChange = (field, value) => {
    setResearchForm((current) => ({
      ...current,
      [field]: value,
    }))
    setSuccessMessage('')
    setErrorMessage('')
  }

  const refreshCandidates = async (researchId) => {
    const candidates = await listResearchCandidates(researchId)
    setCatalog((current) => ({
      ...current,
      candidatesByResearch: {
        ...current.candidatesByResearch,
        [researchId]: candidates,
      },
    }))
    return candidates
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationMessage = validateResearchForm(researchForm, {
      hasResearchAreas: catalog.researchAreas.length > 0,
    })
    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    setSubmitLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = buildResearchPayload(researchForm)

      if (editingResearchId) {
        const updatedResearch = await updateResearch(editingResearchId, payload)

        setCatalog((current) => ({
          ...current,
          researches: current.researches.map((item) => (
            item.id_research === editingResearchId ? { ...item, ...updatedResearch } : item
          )),
        }))
        setEditingResearchId(null)
        setResearchForm(defaultResearchForm)
        setSuccessMessage('Pesquisa atualizada com sucesso.')
        setActiveTab('published')
        return
      }

      const createdResearch = await createResearch(payload)

      setCatalog((current) => ({
        ...current,
        researches: [createdResearch, ...current.researches],
        candidatesByResearch: {
          ...current.candidatesByResearch,
          [createdResearch.id_research]: [],
        },
      }))
      setResearchForm(defaultResearchForm)
      setSuccessMessage('Pesquisa publicada com sucesso.')
      setPublishedPage(1)
      setActiveTab('published')
    } catch (error) {
      setErrorMessage(
        error.message || 'Nao foi possivel publicar a pesquisa com os dados informados.'
      )
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEditResearch = (research) => {
    setEditingResearchId(research.id_research)
    setResearchForm(buildResearchFormFromItem(research))
    setSuccessMessage('')
    setErrorMessage('')
    setActiveTab('create')
  }

  const handleCancelEdit = () => {
    setEditingResearchId(null)
    setResearchForm(defaultResearchForm)
    setSuccessMessage('')
    setErrorMessage('')
  }

  const handleRunMatch = async (researchId) => {
    const loadingKey = `match-${researchId}`
    setCandidateActionLoading(loadingKey)
    setCandidateMessage('')
    setErrorMessage('')

    try {
      const result = await runResearchMatch(researchId)
      await refreshCandidates(researchId)
      setCandidateMessage(
        `Match solicitado para a pesquisa ${result.research_id}. Job ${result.job_id}.`
      )
    } catch (error) {
      setErrorMessage(error.message || 'Nao foi possivel executar o match desta pesquisa.')
    } finally {
      setCandidateActionLoading('')
    }
  }

  const handleCandidateStatusChange = async (researchId, candidateId, status) => {
    const loadingKey = `candidate-${candidateId}`
    setCandidateActionLoading(loadingKey)
    setCandidateMessage('')
    setErrorMessage('')

    try {
      const updatedCandidate = await updateResearchCandidateStatus(researchId, candidateId, status)

      setCatalog((current) => ({
        ...current,
        candidatesByResearch: {
          ...current.candidatesByResearch,
          [researchId]: (current.candidatesByResearch[researchId] || []).map((candidate) => (
            candidate.id_candidate === candidateId
              ? { ...candidate, ...updatedCandidate }
              : candidate
          )),
        },
      }))
      setCandidateMessage('Status do candidato atualizado.')
    } catch (error) {
      setErrorMessage(error.message || 'Nao foi possivel atualizar o status do candidato.')
    } finally {
      setCandidateActionLoading('')
    }
  }

  return (
    <section className="app-page challenge-page">
      <div className="container app-page__container">
        <header className="app-page__header">
          <div>
            <span className="section-label">Pesquisas</span>
            <h1 className="app-page__title">Nova pesquisa</h1>
          </div>
          <div className="app-page__header-actions">
            <p className="app-page__subtitle">
              Publique demandas e acompanhe candidatos.
            </p>
          </div>
        </header>

        <div className="challenge-tabs" role="tablist" aria-label="Pesquisas da empresa">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'create'}
            className={`challenge-tab${activeTab === 'create' ? ' active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            {editingResearchId ? 'Editar pesquisa' : 'Cadastrar pesquisa'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'published'}
            className={`challenge-tab${activeTab === 'published' ? ' active' : ''}`}
            onClick={() => setActiveTab('published')}
          >
            Visualizar pesquisas ({researchesLoading ? '...' : ownedResearches.length})
          </button>
        </div>

        <div className="challenge-page__stack">
          {activeTab === 'create' ? (
          <div className="challenge-form-card challenge-form-card--editor">
            <div className="challenge-form-card__section-head">
              <div>
                <span className="challenge-form-card__eyebrow">
                  {editingResearchId ? 'Edicao' : 'Criacao'}
                </span>
                <h2 className="challenge-form-card__title">
                  {editingResearchId ? 'Editar pesquisa' : 'Dados da pesquisa'}
                </h2>
              </div>
              {editingResearchId ? (
                <button type="button" className="btn btn-ghost" onClick={handleCancelEdit}>
                  Cancelar edicao
                </button>
              ) : null}
            </div>

            {!researchAreasLoading && !hasResearchAreas ? (
              <div className="challenge-form-card__item">
                <strong>Publicação bloqueada — catálogo vazio</strong>
                <span>
                  Nenhuma área de pesquisa está disponível. É necessário ter ao menos uma área
                  cadastrada para publicar.
                </span>
              </div>
            ) : null}

              <form className="challenge-form-card__section" onSubmit={handleSubmit} noValidate>
                <div className="challenge-form-grid">
                  <label className="profile-field">
                    <span>Titulo</span>
                    <input
                      value={researchForm.title}
                      onChange={(event) => handleChange('title', event.target.value)}
                      placeholder="Ex.: Pesquisa aplicada em transicao energetica"
                      disabled={submitLoading}
                    />
                  </label>

                  <label className="profile-field">
                    <span>Orçamento</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={researchForm.budget}
                      onChange={(event) => handleChange('budget', event.target.value)}
                      placeholder="0.00"
                      disabled={submitLoading}
                    />
                  </label>

                  <label className="profile-field">
                    <span>Area de pesquisa</span>
                    <select
                      value={researchForm.areaId}
                      onChange={(event) => handleChange('areaId', event.target.value)}
                      disabled={submitLoading || researchAreasLoading || !hasResearchAreas}
                    >
                      <option value="">
                        {researchAreasLoading
                          ? 'Carregando areas...'
                          : hasResearchAreas
                          ? 'Selecione uma area'
                          : 'Nenhuma area disponivel'}
                      </option>
                      {catalog.researchAreas.map((item) => (
                        <option key={item.id_area} value={item.id_area}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="profile-field">
                    <span>Prazo</span>
                    <input
                      type="datetime-local"
                      value={researchForm.deadline}
                      onChange={(event) => handleChange('deadline', event.target.value)}
                      disabled={submitLoading}
                    />
                  </label>
                </div>

                <div className="challenge-text-grid">
                  <label className="profile-field">
                    <span>Escopo</span>
                    <textarea
                      rows={3}
                      value={researchForm.scope}
                      onChange={(event) => handleChange('scope', event.target.value)}
                      placeholder="Descreva o escopo da pesquisa."
                      disabled={submitLoading}
                    />
                  </label>

                  <label className="profile-field">
                    <span>Objetivo</span>
                    <textarea
                      rows={3}
                      value={researchForm.goal}
                      onChange={(event) => handleChange('goal', event.target.value)}
                      placeholder="Descreva o objetivo principal."
                      disabled={submitLoading}
                    />
                  </label>

                  <label className="profile-field">
                    <span>Justificativa</span>
                    <textarea
                      rows={3}
                      value={researchForm.justification}
                      onChange={(event) => handleChange('justification', event.target.value)}
                      placeholder="Explique a justificativa de negocio ou tecnica."
                      disabled={submitLoading}
                    />
                  </label>

                  <label className="profile-field">
                    <span>Resultados esperados</span>
                    <textarea
                      rows={3}
                      value={researchForm.results}
                      onChange={(event) => handleChange('results', event.target.value)}
                      placeholder="Informe os resultados esperados."
                      disabled={submitLoading}
                    />
                  </label>
                </div>

                {successMessage ? <p className="challenge-form-card__success">{successMessage}</p> : null}
                {errorMessage ? (
                  <p className="challenge-form-card__error" role="alert">
                    {errorMessage}
                  </p>
                ) : null}

                <div className="challenge-form-card__footer">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitLoading || researchAreasLoading || !hasResearchAreas}
                  >
                    {submitLoading
                      ? (editingResearchId ? 'Salvando...' : 'Publicando...')
                      : (editingResearchId ? 'Salvar alteracoes' : 'Publicar pesquisa')}
                  </button>
                </div>
              </form>
          </div>
          ) : null}

          {activeTab === 'published' ? (
          <div className="challenge-form-card challenge-form-card--published">
            <div className="challenge-form-card__section-head">
              <div>
                <span className="challenge-form-card__eyebrow">Acompanhamento</span>
                <h2 className="challenge-form-card__title">Pesquisas publicadas</h2>
              </div>
              {filteredOwnedResearches.length > PUBLISHED_RESEARCH_PAGE_SIZE ? (
                <span className="challenge-pagination__meta">
                  {buildPageLabel(publishedPage, filteredOwnedResearches.length, PUBLISHED_RESEARCH_PAGE_SIZE)}
                </span>
              ) : null}
            </div>

            {candidateMessage ? <p className="challenge-form-card__success">{candidateMessage}</p> : null}

            <div className="challenge-filter-bar">
              <label className="profile-field">
                <span>Filtrar pesquisas</span>
                <select
                  value={researchCandidateFilter}
                  onChange={(event) => setResearchCandidateFilter(event.target.value)}
                >
                  {researchCandidateFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <span className="challenge-pagination__meta">
                {filteredOwnedResearches.length} de {ownedResearches.length} pesquisa(s)
              </span>
            </div>

            <div className="challenge-form-card__list">
              {researchesLoading ? (
                <article className="challenge-form-card__item">
                  <strong>Carregando pesquisas</strong>
                  <span>Preparando a lista de pesquisas publicadas.</span>
                </article>
              ) : filteredOwnedResearches.length > 0 ? (
                paginatedOwnedResearches.map((item) => {
                  const candidates = catalog.candidatesByResearch[item.id_research] || []
                  const isLoadingCandidates = candidateLoadingIds.has(item.id_research)

                  return (
                    <article key={item.id_research} className="challenge-form-card__item">
                      <strong>{item.title}</strong>
                      <span>
                        {researchAreaLookup[item.area] || 'Área não identificada'} · status:{' '}
                        {item.status || 'não informado'} · prazo: {formatDeadlineLabel(item.deadline)}
                      </span>

                      <div className="challenge-form-card__actions">
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setSelectedResearch(
                            buildResearchModalPayload(item, researchAreaLookup, user)
                          )}
                        >
                          Mais detalhes
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => handleEditResearch(item)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handleRunMatch(item.id_research)}
                          disabled={candidateActionLoading === `match-${item.id_research}`}
                        >
                          {candidateActionLoading === `match-${item.id_research}`
                            ? 'Executando match...'
                            : 'Rodar match suportado'}
                        </button>
                      </div>

                      <div className="challenge-candidates">
                        <span className="challenge-form-card__eyebrow">
                          {candidates.length} candidato(s)
                        </span>

                        {isLoadingCandidates ? (
                          <span>Carregando candidatos desta pesquisa.</span>
                        ) : candidates.length > 0 ? (
                          candidates.map((candidate) => (
                            <div key={candidate.id_candidate} className="challenge-candidate">
                              <div className="challenge-candidate__info">
                                <button
                                  type="button"
                                  className="challenge-candidate__name"
                                  onClick={() => handleViewResearcher(candidate)}
                                  disabled={researcherLoadingId === candidate.id_candidate}
                                  title="Ver detalhes do pesquisador"
                                >
                                  {researcherLoadingId === candidate.id_candidate
                                    ? 'Carregando...'
                                    : candidate.researcher_name || 'Pesquisador não identificado'}
                                </button>
                                <span>
                                  {getCandidateSourceLabel(candidate.source)} ·{' '}
                                  {getCandidateStatusLabel(candidate.status)}
                                  {candidate.score_match ? ` · compatibilidade: ${Math.round(candidate.score_match * 100)}%` : ''}
                                </span>
                                {Array.isArray(candidate.match_reasons) && candidate.match_reasons.length > 0 ? (
                                  <div className="challenge-candidate__reasons" aria-label="Motivos do match">
                                    {candidate.match_reasons.map((reason) => (
                                      <span
                                        key={`${candidate.id_candidate}-${reason}`}
                                        className="challenge-candidate__reason"
                                      >
                                        {formatMatchReason(reason)}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>

                              <select
                                value=""
                                onChange={(event) => {
                                  if (event.target.value) {
                                    handleCandidateStatusChange(
                                      item.id_research,
                                      candidate.id_candidate,
                                      event.target.value
                                    )
                                  }
                                }}
                                disabled={candidateActionLoading === `candidate-${candidate.id_candidate}`}
                              >
                                <option value="">Alterar status</option>
                                {candidateStatusOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))
                        ) : (
                          <span>Nenhum candidato registrado ainda para esta pesquisa.</span>
                        )}
                      </div>
                    </article>
                  )
                })
              ) : (
                <article className="challenge-form-card__item">
                  <strong>
                    {ownedResearches.length > 0
                      ? 'Nenhuma pesquisa encontrada neste filtro'
                      : 'Nenhuma pesquisa publicada por esta empresa'}
                  </strong>
                  <span>
                    {ownedResearches.length > 0
                      ? 'Altere o filtro para ver outras pesquisas publicadas.'
                      : 'Assim que uma publicacao for criada, ela aparecera aqui.'}
                  </span>
                </article>
              )}
            </div>

            {filteredOwnedResearches.length > PUBLISHED_RESEARCH_PAGE_SIZE ? (
              <div className="challenge-pagination">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setPublishedPage((current) => Math.max(1, current - 1))}
                  disabled={publishedPage === 1}
                >
                  Anterior
                </button>
                <span className="challenge-pagination__status">
                  Página {publishedPage} de {totalPublishedPages}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setPublishedPage((current) => Math.min(totalPublishedPages, current + 1))}
                  disabled={publishedPage === totalPublishedPages}
                >
                  Próxima
                </button>
              </div>
            ) : null}
          </div>
          ) : null}
        </div>
      </div>

      {selectedResearch ? (
        <ResearchDetailModal
          research={selectedResearch}
          onClose={() => setSelectedResearch(null)}
        />
      ) : null}

      {selectedResearcher ? (
        <ResearcherDetailModal
          researcher={selectedResearcher}
          onClose={() => setSelectedResearcher(null)}
        />
      ) : null}

      {researcherErrorMessage ? (
        <div className="challenge-toast challenge-toast--error" role="alert">
          {researcherErrorMessage}
          <button
            type="button"
            onClick={() => setResearcherErrorMessage('')}
            aria-label="Fechar mensagem"
          >
            ×
          </button>
        </div>
      ) : null}
    </section>
  )
}
