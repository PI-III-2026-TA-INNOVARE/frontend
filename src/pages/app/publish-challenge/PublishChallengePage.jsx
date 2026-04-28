import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import {
  createResearch,
  listResearchAreas,
  listResearchCandidates,
  listResearches,
  runResearchMatch,
  updateResearchCandidateStatus,
} from '../../../services/pdConnectApi'
import './PublishChallengePage.scss'

const candidateStatusOptions = [
  { value: 'under_review', label: 'Em analise' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'rejected', label: 'Rejeitado' },
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

function buildCandidatesLookup(researches, candidateResults) {
  return researches.reduce((lookup, research, index) => {
    const response = candidateResults[index]
    lookup[research.id_research] = response?.status === 'fulfilled' ? response.value : []
    return lookup
  }, {})
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

function getCandidateStatusLabel(status) {
  const labels = {
    suggested: 'Sugerido',
    interested: 'Interessado',
    under_review: 'Em analise',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
  }

  return labels[status] || status || 'nao informado'
}

function getCandidateSourceLabel(source) {
  const labels = {
    ai: 'Match',
    interest: 'Interesse',
    manual: 'Manual',
  }

  return labels[source] || source || 'origem nao informada'
}

export default function PublishChallengePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [candidateActionLoading, setCandidateActionLoading] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [candidateMessage, setCandidateMessage] = useState('')
  const [catalog, setCatalog] = useState({
    researches: [],
    researchAreas: [],
    candidatesByResearch: {},
  })
  const [researchForm, setResearchForm] = useState(defaultResearchForm)

  useEffect(() => {
    let isMounted = true

    const loadCatalog = async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const [researches, researchAreas] = await Promise.all([
          listResearches(),
          listResearchAreas(),
        ])

        const ownedResearches = researches.filter(
          (item) => item.company === user?.company?.id_company
        )
        const candidateResults = await Promise.allSettled(
          ownedResearches.map((item) => listResearchCandidates(item.id_research))
        )

        if (!isMounted) {
          return
        }

        setCatalog({
          researches,
          researchAreas,
          candidatesByResearch: buildCandidatesLookup(ownedResearches, candidateResults),
        })
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(
          error.message || 'Nao foi possivel carregar os dados necessarios para publicar a pesquisa.'
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
  }, [user?.company?.id_company])

  const ownedResearches = useMemo(() => (
    catalog.researches.filter((item) => item.company === user?.company?.id_company)
  ), [catalog.researches, user?.company?.id_company])

  const researchAreaLookup = useMemo(
    () => buildLookup(catalog.researchAreas, 'id_area', 'name'),
    [catalog.researchAreas]
  )
  const hasResearchAreas = catalog.researchAreas.length > 0

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
      const createdResearch = await createResearch({
        title: researchForm.title.trim(),
        scope: researchForm.scope.trim(),
        goal: researchForm.goal.trim(),
        justification: researchForm.justification.trim(),
        results: researchForm.results.trim(),
        deadline: normalizeDeadlineToIso(researchForm.deadline),
        budget: Number(researchForm.budget),
        area: Number(researchForm.areaId),
      })

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
    } catch (error) {
      setErrorMessage(
        error.message || 'Nao foi possivel publicar a pesquisa com os dados informados.'
      )
    } finally {
      setSubmitLoading(false)
    }
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

        <div className="challenge-page__stack">
          <div className="challenge-form-card challenge-form-card--editor">
            <div className="challenge-form-card__section-head">
              <div>
                <span className="challenge-form-card__eyebrow">Criacao</span>
                <h2 className="challenge-form-card__title">Dados da pesquisa</h2>
              </div>
            </div>

            {loading ? (
              <div className="challenge-form-card__item">
                <strong>Carregando dados</strong>
                <span>Preparando formulario e pesquisas da empresa.</span>
              </div>
            ) : null}

            {!loading && errorMessage ? (
              <div className="challenge-form-card__item">
                <strong>Falha ao preparar a publicacao</strong>
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {!loading && !hasResearchAreas ? (
              <div className="challenge-form-card__item">
                <strong>Publicacao bloqueada por catalogo vazio</strong>
                <span>
                  Nenhuma area de pesquisa esta disponivel. E necessario ter ao menos uma area
                  cadastrada para publicar.
                </span>
              </div>
            ) : null}

            {!loading ? (
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
                    <span>Orcamento</span>
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
                      disabled={submitLoading || !hasResearchAreas}
                    >
                      <option value="">
                        {hasResearchAreas
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
                    disabled={submitLoading}
                  >
                    {submitLoading ? 'Publicando...' : 'Publicar pesquisa'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>

          <div className="challenge-form-card challenge-form-card--published">
            <div className="challenge-form-card__section-head">
              <div>
                <span className="challenge-form-card__eyebrow">Acompanhamento</span>
                <h2 className="challenge-form-card__title">Pesquisas publicadas</h2>
              </div>
            </div>

            {candidateMessage ? <p className="challenge-form-card__success">{candidateMessage}</p> : null}

            <div className="challenge-form-card__list">
              {ownedResearches.length > 0 ? (
                ownedResearches.map((item) => {
                  const candidates = catalog.candidatesByResearch[item.id_research] || []

                  return (
                    <article key={item.id_research} className="challenge-form-card__item">
                      <strong>{item.title}</strong>
                      <span>
                        {researchAreaLookup[item.area] || 'Area nao identificada'} | status{' '}
                        {item.status || 'nao informado'} | prazo {formatDeadlineLabel(item.deadline)}
                      </span>

                      <div className="challenge-form-card__actions">
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

                        {candidates.length > 0 ? (
                          candidates.map((candidate) => (
                            <div key={candidate.id_candidate} className="challenge-candidate">
                              <div>
                                <strong>{candidate.researcher_name || 'Pesquisador nao identificado'}</strong>
                                <span>
                                  {getCandidateSourceLabel(candidate.source)} |{' '}
                                  {getCandidateStatusLabel(candidate.status)}
                                  {candidate.score_match ? ` | score ${candidate.score_match}` : ''}
                                </span>
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
                  <strong>Nenhuma pesquisa publicada por esta empresa</strong>
                  <span>Assim que uma publicacao for criada, ela aparecera aqui.</span>
                </article>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
