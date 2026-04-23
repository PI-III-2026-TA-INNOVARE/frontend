import { useEffect, useMemo, useState } from 'react'
import PageFaq from '../../../components/PageFaq'
import { useAuth } from '../../../context/AuthContext'
import {
  createResearch,
  listResearchAreas,
  listResearches,
  listResearchers,
} from '../../../services/pdConnectApi'
import './PublishChallengePage.scss'

const challengeFaqSections = [
  {
    title: 'O que esta pagina usa agora',
    items: [
      'GET /api/research/',
      'POST /api/research/',
      'GET /api/research/area/',
      'GET /api/researchers/',
    ],
  },
  {
    title: 'O que continua fora do escopo',
    text: 'O backend agora sustenta a publicacao de pesquisas, mas ainda nao expoe fluxos completos de propostas e notificacoes.',
    items: [
      'Propostas recebidas',
      'Aceite, recusa e status de proposta',
      'Notificacoes',
      'Match por IA',
    ],
  },
]

const defaultResearchForm = {
  title: '',
  scope: '',
  goal: '',
  justification: '',
  results: '',
  deadline: '',
  budget: '',
  researcherId: '',
  areaId: '',
}

function validateResearchForm(form) {
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

  if (!form.researcherId || !form.areaId) {
    return 'Selecione um pesquisador e uma area de pesquisa.'
  }

  return ''
}

function buildLookup(items, idKey, labelKey) {
  return items.reduce((lookup, item) => {
    lookup[item[idKey]] = item[labelKey]
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

export default function PublishChallengePage() {
  const { user } = useAuth()
  const [isFaqOpen, setIsFaqOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [catalog, setCatalog] = useState({
    researches: [],
    researchAreas: [],
    researchers: [],
  })
  const [researchForm, setResearchForm] = useState(defaultResearchForm)

  useEffect(() => {
    let isMounted = true

    const loadCatalog = async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const [researches, researchAreas, researchers] = await Promise.all([
          listResearches(),
          listResearchAreas(),
          listResearchers(),
        ])

        if (!isMounted) {
          return
        }

        setCatalog({
          researches,
          researchAreas,
          researchers,
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
  }, [])

  const ownedResearches = useMemo(() => (
    catalog.researches.filter((item) => item.company === user?.company?.id_company)
  ), [catalog.researches, user?.company?.id_company])

  const researchAreaLookup = useMemo(
    () => buildLookup(catalog.researchAreas, 'id_area', 'name'),
    [catalog.researchAreas]
  )

  const researcherLookup = useMemo(
    () => buildLookup(catalog.researchers, 'id_researcher', 'name'),
    [catalog.researchers]
  )

  const handleChange = (field, value) => {
    setResearchForm((current) => ({
      ...current,
      [field]: value,
    }))
    setSuccessMessage('')
    setErrorMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationMessage = validateResearchForm(researchForm)
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
        deadline: researchForm.deadline,
        budget: Number(researchForm.budget),
        researcher: Number(researchForm.researcherId),
        area: Number(researchForm.areaId),
      })

      setCatalog((current) => ({
        ...current,
        researches: [createdResearch, ...current.researches],
      }))
      setResearchForm(defaultResearchForm)
      setSuccessMessage('Pesquisa publicada com sucesso no recurso real do backend.')
    } catch (error) {
      setErrorMessage(
        error.message || 'Nao foi possivel publicar a pesquisa com os dados informados.'
      )
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <section className="app-page challenge-page">
      <div className="container app-page__container">
        <header className="app-page__header">
          <div>
            <span className="section-label">Pesquisas</span>
            <h1 className="app-page__title">Publicacao baseada no recurso real do backend</h1>
          </div>
          <div className="app-page__header-actions">
            <p className="app-page__subtitle">
              Esta area agora usa o dominio real de pesquisa exposto pela API para empresas
              autenticadas.
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

        <div className="challenge-form-card">
          <div className="challenge-form-card__section">
            <div className="challenge-form-card__section-head">
              <div>
                <span className="challenge-form-card__eyebrow">Empresa autenticada</span>
                <h2 className="challenge-form-card__title">Nova pesquisa</h2>
              </div>
            </div>

            <p className="challenge-form-card__text">
              O backend define a empresa pelo usuario autenticado. O front envia apenas os campos que
              o contrato real da pesquisa exige.
            </p>

            {loading ? (
              <div className="challenge-form-card__item">
                <strong>Carregando catalogos</strong>
                <span>Consultando areas de pesquisa, pesquisadores e pesquisas existentes.</span>
              </div>
            ) : null}

            {!loading && errorMessage ? (
              <div className="challenge-form-card__item">
                <strong>Falha ao preparar a publicacao</strong>
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {!loading ? (
              <form className="challenge-form-card__section" onSubmit={handleSubmit}>
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
                    <span>Pesquisador</span>
                    <select
                      value={researchForm.researcherId}
                      onChange={(event) => handleChange('researcherId', event.target.value)}
                      disabled={submitLoading || catalog.researchers.length === 0}
                    >
                      <option value="">Selecione um pesquisador</option>
                      {catalog.researchers.map((item) => (
                        <option key={item.id_researcher} value={item.id_researcher}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="profile-field">
                    <span>Area de pesquisa</span>
                    <select
                      value={researchForm.areaId}
                      onChange={(event) => handleChange('areaId', event.target.value)}
                      disabled={submitLoading || catalog.researchAreas.length === 0}
                    >
                      <option value="">Selecione uma area</option>
                      {catalog.researchAreas.map((item) => (
                        <option key={item.id_area} value={item.id_area}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="profile-field profile-field--full">
                  <span>Prazo</span>
                  <input
                    type="datetime-local"
                    value={researchForm.deadline}
                    onChange={(event) => handleChange('deadline', event.target.value)}
                    disabled={submitLoading}
                  />
                </label>

                <label className="profile-field profile-field--full">
                  <span>Escopo</span>
                  <textarea
                    rows={4}
                    value={researchForm.scope}
                    onChange={(event) => handleChange('scope', event.target.value)}
                    placeholder="Descreva o escopo da pesquisa."
                    disabled={submitLoading}
                  />
                </label>

                <label className="profile-field profile-field--full">
                  <span>Objetivo</span>
                  <textarea
                    rows={4}
                    value={researchForm.goal}
                    onChange={(event) => handleChange('goal', event.target.value)}
                    placeholder="Descreva o objetivo principal."
                    disabled={submitLoading}
                  />
                </label>

                <label className="profile-field profile-field--full">
                  <span>Justificativa</span>
                  <textarea
                    rows={4}
                    value={researchForm.justification}
                    onChange={(event) => handleChange('justification', event.target.value)}
                    placeholder="Explique a justificativa de negocio ou tecnica."
                    disabled={submitLoading}
                  />
                </label>

                <label className="profile-field profile-field--full">
                  <span>Resultados esperados</span>
                  <textarea
                    rows={4}
                    value={researchForm.results}
                    onChange={(event) => handleChange('results', event.target.value)}
                    placeholder="Informe os resultados esperados."
                    disabled={submitLoading}
                  />
                </label>

                {successMessage ? <p className="challenge-form-card__success">{successMessage}</p> : null}

                <div className="challenge-form-card__footer">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      submitLoading ||
                      catalog.researchers.length === 0 ||
                      catalog.researchAreas.length === 0
                    }
                  >
                    {submitLoading ? 'Publicando...' : 'Publicar pesquisa'}
                  </button>

                  <span className="challenge-form-card__text">
                    A API define o campo `company` automaticamente a partir da autenticacao.
                  </span>
                </div>
              </form>
            ) : null}
          </div>

          <div className="challenge-form-card__section">
            <div className="challenge-form-card__section-head">
              <div>
                <span className="challenge-form-card__eyebrow">Base atual</span>
                <h2 className="challenge-form-card__title">Pesquisas da empresa autenticada</h2>
              </div>
            </div>

            <div className="challenge-form-card__list">
              {ownedResearches.length > 0 ? (
                ownedResearches.map((item) => (
                  <article key={item.id_research} className="challenge-form-card__item">
                    <strong>{item.title}</strong>
                    <span>
                      Area {researchAreaLookup[item.area] || item.area} | pesquisador{' '}
                      {researcherLookup[item.researcher] || item.researcher} | status{' '}
                      {item.status || 'nao informado'} | prazo {formatDeadlineLabel(item.deadline)}
                    </span>
                  </article>
                ))
              ) : (
                <article className="challenge-form-card__item">
                  <strong>Nenhuma pesquisa publicada por esta empresa</strong>
                  <span>Assim que uma publicacao real for criada, ela aparecera aqui.</span>
                </article>
              )}
            </div>
          </div>
        </div>
      </div>

      <PageFaq
        isOpen={isFaqOpen}
        onClose={() => setIsFaqOpen(false)}
        title="Fluxo de pesquisa"
        intro="Este FAQ resume o que o front agora consome do backend real para publicacao autenticada de pesquisas."
        sections={challengeFaqSections}
      />
    </section>
  )
}
