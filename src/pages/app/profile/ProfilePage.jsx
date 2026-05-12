import { useEffect, useMemo, useState } from 'react'
import { formatBooleanLabel, formatDateLabel } from '../../../lib/domain'
import { useAuth } from '../../../context/AuthContext'
import {
  createEducation,
  createExperience,
  createResume,
  deleteEducation,
  deleteExperience,
  listResearchAreas,
  listSkills,
  updateCompany,
  updateResearcher,
  updateResume,
} from '../../../services/pdConnectApi'
import './ProfilePage.scss'

const PROFILE_AREA_PAGE_SIZE = 4
const PROFILE_EDUCATION_PAGE_SIZE = 3
const PROFILE_EXPERIENCE_PAGE_SIZE = 3
const PROFILE_SKILL_PAGE_SIZE = 2

const defaultEducationForm = {
  course: '',
  institution: '',
  startDate: '',
  endDate: '',
}

const defaultExperienceForm = {
  description: '',
  startDate: '',
  endDate: '',
}

const defaultSkillForm = {
  selectedSkillId: '',
}

function buildInitialProfile(user) {
  if (user?.type === 'empresa') {
    return {
      name: user.company?.name || '',
      cnpj: user.company?.cnpj || '',
      registrationStatus: user.company?.situacao_cadastral || user.company?.registration_status || '',
      status:
        user.company?.status === null || user.company?.status === undefined
          ? 'true'
          : String(Boolean(user.company?.status)),
    }
  }

  return {
    name: user?.researcher?.name || '',
    availability:
      user?.researcher?.availability === null || user?.researcher?.availability === undefined
        ? 'true'
        : String(Boolean(user?.researcher?.availability)),
    areaIds: (user?.researcher?.area || []).map((areaId) => String(areaId)),
  }
}

function toBoolean(value) {
  return value === 'true'
}

function paginateItems(items, page, pageSize) {
  const startIndex = (page - 1) * pageSize
  return items.slice(startIndex, startIndex + pageSize)
}

function buildPageLabel(page, totalItems, pageSize) {
  if (!totalItems) {
    return '0 de 0'
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)
  return `${start}-${end} de ${totalItems}`
}

function validateEducationForm(form) {
  if (!form.course.trim() || !form.institution.trim() || !form.startDate || !form.endDate) {
    return 'Preencha curso, instituicao, data de inicio e data de termino.'
  }

  if (form.endDate < form.startDate) {
    return 'A data de termino nao pode ser anterior a data de inicio.'
  }

  return ''
}

function validateExperienceForm(form) {
  if (!form.description.trim() || !form.startDate) {
    return 'Preencha descricao e data de inicio da experiencia.'
  }

  if (form.endDate && form.endDate < form.startDate) {
    return 'A data de termino nao pode ser anterior a data de inicio.'
  }

  return ''
}

export default function ProfilePage() {
  const { refreshUser, user } = useAuth()
  const [savedMessage, setSavedMessage] = useState('')
  const [resumeMessage, setResumeMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [skillsCatalogError, setSkillsCatalogError] = useState('')
  const [researchAreaCatalogError, setResearchAreaCatalogError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isEducationSaving, setIsEducationSaving] = useState(false)
  const [isExperienceSaving, setIsExperienceSaving] = useState(false)
  const [isSkillSaving, setIsSkillSaving] = useState(false)
  const [formData, setFormData] = useState(() => buildInitialProfile(user))
  const [educationForm, setEducationForm] = useState(defaultEducationForm)
  const [experienceForm, setExperienceForm] = useState(defaultExperienceForm)
  const [skillForm, setSkillForm] = useState(defaultSkillForm)
  const [activeResearcherTab, setActiveResearcherTab] = useState('general')
  const [researchAreaPage, setResearchAreaPage] = useState(1)
  const [educationPage, setEducationPage] = useState(1)
  const [experiencePage, setExperiencePage] = useState(1)
  const [skillsPage, setSkillsPage] = useState(1)
  const [skillsCatalog, setSkillsCatalog] = useState([])
  const [researchAreaCatalog, setResearchAreaCatalog] = useState([])
  const [selectedResearchAreaId, setSelectedResearchAreaId] = useState('')
  const [selectedSkillIds, setSelectedSkillIds] = useState(() => (
    (user?.resume?.skill || []).map((item) => String(item.id_skill))
  ))

  const isEmpresa = user?.type === 'empresa'
  const resumeData = user?.resume || { education: [], experience: [], skill: [] }
  const hasLinkedResume = Boolean(user?.researcher?.resume)
  const researcherUniversityName = user?.university?.name || 'Universidade nao informada'
  const researcherStatusLabel = formatBooleanLabel(user?.researcher?.status, {
    trueLabel: 'Ativo',
    falseLabel: 'Inativo',
    nullLabel: 'Nao informado',
  })

  const totalEducationPages = Math.max(
    1,
    Math.ceil((resumeData.education?.length || 0) / PROFILE_EDUCATION_PAGE_SIZE)
  )
  const totalExperiencePages = Math.max(
    1,
    Math.ceil((resumeData.experience?.length || 0) / PROFILE_EXPERIENCE_PAGE_SIZE)
  )
  const selectedSkillIdSet = useMemo(
    () => new Set((selectedSkillIds || []).map((skillId) => String(skillId))),
    [selectedSkillIds]
  )

  const selectedSkills = useMemo(
    () => (selectedSkillIds || [])
      .map((skillId) => {
        const normalizedSkillId = String(skillId)
        return (
          skillsCatalog.find((item) => String(item.id_skill) === normalizedSkillId) ||
          (resumeData.skill || []).find((item) => String(item.id_skill) === normalizedSkillId)
        )
      })
      .filter(Boolean),
    [resumeData.skill, selectedSkillIds, skillsCatalog]
  )

  const totalSkillsPages = Math.max(
    1,
    Math.ceil(selectedSkills.length / PROFILE_SKILL_PAGE_SIZE)
  )

  const paginatedEducation = useMemo(
    () => paginateItems(resumeData.education || [], educationPage, PROFILE_EDUCATION_PAGE_SIZE),
    [educationPage, resumeData.education]
  )

  const paginatedExperience = useMemo(
    () => paginateItems(resumeData.experience || [], experiencePage, PROFILE_EXPERIENCE_PAGE_SIZE),
    [experiencePage, resumeData.experience]
  )

  const paginatedSkills = useMemo(
    () => paginateItems(selectedSkills, skillsPage, PROFILE_SKILL_PAGE_SIZE),
    [selectedSkills, skillsPage]
  )

  const availableSkillsToLink = useMemo(
    () => skillsCatalog.filter((item) => !selectedSkillIdSet.has(String(item.id_skill))),
    [selectedSkillIdSet, skillsCatalog]
  )

  const linkedResearcherAreaIds = useMemo(
    () => new Set((formData.areaIds || []).map((areaId) => String(areaId))),
    [formData.areaIds]
  )

  const selectedResearchAreas = useMemo(
    () => researchAreaCatalog.filter((area) => linkedResearcherAreaIds.has(String(area.id_area))),
    [linkedResearcherAreaIds, researchAreaCatalog]
  )

  const totalResearchAreaPages = Math.max(
    1,
    Math.ceil(selectedResearchAreas.length / PROFILE_AREA_PAGE_SIZE)
  )

  const paginatedSelectedResearchAreas = useMemo(
    () => paginateItems(selectedResearchAreas, researchAreaPage, PROFILE_AREA_PAGE_SIZE),
    [researchAreaPage, selectedResearchAreas]
  )

  const availableResearchAreasToAdd = useMemo(
    () => researchAreaCatalog.filter((area) => !linkedResearcherAreaIds.has(String(area.id_area))),
    [linkedResearcherAreaIds, researchAreaCatalog]
  )

  useEffect(() => {
    setFormData(buildInitialProfile(user))
    setSelectedResearchAreaId('')
    setResearchAreaPage(1)
    setSelectedSkillIds((user?.resume?.skill || []).map((item) => String(item.id_skill)))
    setSkillForm(defaultSkillForm)
    setSkillsPage(1)
  }, [user])

  useEffect(() => {
    setResearchAreaPage((current) => Math.min(current, totalResearchAreaPages))
  }, [totalResearchAreaPages])

  useEffect(() => {
    setEducationPage((current) => Math.min(current, totalEducationPages))
  }, [totalEducationPages])

  useEffect(() => {
    setExperiencePage((current) => Math.min(current, totalExperiencePages))
  }, [totalExperiencePages])

  useEffect(() => {
    setSkillsPage((current) => Math.min(current, totalSkillsPages))
  }, [totalSkillsPages])

  useEffect(() => {
    let isMounted = true

    if (isEmpresa) {
      setSkillsCatalog([])
      setSkillsCatalogError('')
      return () => {
        isMounted = false
      }
    }

    const loadSkillsCatalog = async () => {
      try {
        const loadedSkills = await listSkills()

        if (!isMounted) {
          return
        }

        setSkillsCatalog(loadedSkills)
        setSkillsCatalogError('')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setSkillsCatalogError(
          error.message || 'Nao foi possivel carregar o catalogo de habilidades disponiveis.'
        )
      }
    }

    loadSkillsCatalog()

    return () => {
      isMounted = false
    }
  }, [isEmpresa, user?.researcher?.id_researcher])

  useEffect(() => {
    let isMounted = true

    if (isEmpresa) {
      setResearchAreaCatalog([])
      setResearchAreaCatalogError('')
      return () => {
        isMounted = false
      }
    }

    const loadResearchAreaCatalog = async () => {
      try {
        const loadedAreas = await listResearchAreas()

        if (!isMounted) {
          return
        }

        setResearchAreaCatalog(loadedAreas)
        setResearchAreaCatalogError('')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setResearchAreaCatalog([])
        setResearchAreaCatalogError(
          error.message || 'Nao foi possivel carregar as areas de pesquisa disponiveis.'
        )
      }
    }

    loadResearchAreaCatalog()

    return () => {
      isMounted = false
    }
  }, [isEmpresa, user?.researcher?.id_researcher])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setSavedMessage('')
    setErrorMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setSavedMessage('')
    setErrorMessage('')

    try {
      if (isEmpresa) {
        await updateCompany(user.company.id_company, {
          name: formData.name.trim(),
          status: toBoolean(formData.status),
        })
      } else {
        if (!formData.name.trim()) {
          throw new Error('Informe o nome do pesquisador antes de salvar.')
        }

        await updateResearcher(user.researcher.id_researcher, {
          name: formData.name.trim(),
          availability: toBoolean(formData.availability),
          area: (formData.areaIds || []).map((areaId) => Number(areaId)),
        })
      }

      const refreshed = await refreshUser()

      if (!refreshed.ok) {
        throw new Error(refreshed.message)
      }

      setSavedMessage('Perfil atualizado com sucesso.')
    } catch (error) {
      setErrorMessage(
        error.message || 'Nao foi possivel salvar as alteracoes do perfil neste momento.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleEducationChange = (field, value) => {
    setEducationForm((current) => ({ ...current, [field]: value }))
    setResumeMessage('')
    setErrorMessage('')
  }

  const handleExperienceChange = (field, value) => {
    setExperienceForm((current) => ({ ...current, [field]: value }))
    setResumeMessage('')
    setErrorMessage('')
  }

  const handleSkillChange = (field, value) => {
    setSkillForm((current) => ({ ...current, [field]: value }))
    setResumeMessage('')
    setErrorMessage('')
  }

  const handleResearchAreaSelectChange = (event) => {
    setSelectedResearchAreaId(event.target.value)
    setSavedMessage('')
    setErrorMessage('')
  }

  const handleResearchAreaAdd = () => {
    if (!selectedResearchAreaId) {
      setErrorMessage('Selecione uma area de pesquisa antes de adicionar.')
      return
    }

    if (linkedResearcherAreaIds.has(String(selectedResearchAreaId))) {
      setErrorMessage('Esta area de pesquisa ja esta selecionada.')
      setSelectedResearchAreaId('')
      return
    }

    setFormData((current) => ({
      ...current,
      areaIds: [...(current.areaIds || []), String(selectedResearchAreaId)],
    }))

    setResearchAreaPage(Math.ceil((selectedResearchAreas.length + 1) / PROFILE_AREA_PAGE_SIZE))
    setSelectedResearchAreaId('')
    setSavedMessage('')
    setErrorMessage('')
  }

  const handleResearchAreaRemove = (areaId) => {
    const normalizedAreaId = String(areaId)

    setFormData((current) => {
      return {
        ...current,
        areaIds: (current.areaIds || []).filter((item) => String(item) !== normalizedAreaId),
      }
    })

    if (selectedResearchAreaId === normalizedAreaId) {
      setSelectedResearchAreaId('')
    }

    setSavedMessage('')
    setErrorMessage('')
  }

  const syncResumeAfterChange = async (message) => {
    const refreshed = await refreshUser()

    if (!refreshed.ok) {
      throw new Error(refreshed.message)
    }

    setResumeMessage(message)
  }

  const ensureResearcherResume = async () => {
    if (user?.researcher?.resume) {
      return Number(user.researcher.resume)
    }

    if (!user?.researcher?.id_researcher) {
      throw new Error('O perfil autenticado nao retornou o ID do pesquisador.')
    }

    const createdResume = await createResume({})

    if (!createdResume?.id_resume) {
      throw new Error('Nao foi possivel confirmar o curriculo criado.')
    }

    await updateResearcher(user.researcher.id_researcher, {
      resume: createdResume.id_resume,
    })

    const refreshed = await refreshUser()

    if (!refreshed.ok) {
      throw new Error(refreshed.message)
    }

    return Number(createdResume.id_resume)
  }

  const handleEducationSubmit = async (event) => {
    event.preventDefault()

    const validationMessage = validateEducationForm(educationForm)
    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    setIsEducationSaving(true)
    setResumeMessage('')
    setErrorMessage('')

    try {
      const resumeId = await ensureResearcherResume()

      await createEducation({
        course: educationForm.course.trim(),
        institution: educationForm.institution.trim(),
        start_date: educationForm.startDate,
        end_date: educationForm.endDate,
        resume: resumeId,
      })

      await syncResumeAfterChange('Formacao adicionada com sucesso.')
      setEducationForm(defaultEducationForm)
      setActiveResearcherTab('educations')
      setEducationPage(1)
    } catch (error) {
      setErrorMessage(
        error.message || 'Nao foi possivel adicionar a formacao ao curriculo.'
      )
    } finally {
      setIsEducationSaving(false)
    }
  }

  const handleEducationDelete = async (educationId) => {
    setIsEducationSaving(true)
    setResumeMessage('')
    setErrorMessage('')

    try {
      await deleteEducation(educationId)
      await syncResumeAfterChange('Formacao removida com sucesso.')
    } catch (error) {
      setErrorMessage(
        error.message || 'Nao foi possivel remover a formacao selecionada.'
      )
    } finally {
      setIsEducationSaving(false)
    }
  }

  const handleExperienceSubmit = async (event) => {
    event.preventDefault()

    const validationMessage = validateExperienceForm(experienceForm)
    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    setIsExperienceSaving(true)
    setResumeMessage('')
    setErrorMessage('')

    try {
      const resumeId = await ensureResearcherResume()

      await createExperience({
        description: experienceForm.description.trim(),
        start_date: experienceForm.startDate,
        end_date: experienceForm.endDate || null,
        resume: resumeId,
      })

      await syncResumeAfterChange('Experiencia adicionada com sucesso.')
      setExperienceForm(defaultExperienceForm)
      setActiveResearcherTab('experiences')
      setExperiencePage(1)
    } catch (error) {
      setErrorMessage(
        error.message || 'Nao foi possivel adicionar a experiencia ao curriculo.'
      )
    } finally {
      setIsExperienceSaving(false)
    }
  }

  const handleExperienceDelete = async (experienceId) => {
    setIsExperienceSaving(true)
    setResumeMessage('')
    setErrorMessage('')

    try {
      await deleteExperience(experienceId)
      await syncResumeAfterChange('Experiencia removida com sucesso.')
    } catch (error) {
      setErrorMessage(
        error.message || 'Nao foi possivel remover a experiencia selecionada.'
      )
    } finally {
      setIsExperienceSaving(false)
    }
  }

  const syncResumeSkills = async (nextSkillIds, successMessage) => {
    const resumeId = await ensureResearcherResume()

    await updateResume(resumeId, {
      skills: nextSkillIds,
    })

    await syncResumeAfterChange(successMessage)
  }

  const handleSkillAttach = (event) => {
    event.preventDefault()

    if (!skillForm.selectedSkillId) {
      setErrorMessage('Selecione uma habilidade existente para vincular ao curriculo.')
      return
    }

    if (selectedSkillIdSet.has(String(skillForm.selectedSkillId))) {
      setErrorMessage('Esta habilidade ja esta selecionada.')
      setSkillForm((current) => ({
        ...current,
        selectedSkillId: '',
      }))
      return
    }

    setSelectedSkillIds((current) => [...current, String(skillForm.selectedSkillId)])
    setSkillsPage(Math.ceil((selectedSkills.length + 1) / PROFILE_SKILL_PAGE_SIZE))
    setSkillForm((current) => ({
      ...current,
      selectedSkillId: '',
    }))
    setResumeMessage('')
    setErrorMessage('')
  }

  const handleSkillSave = async () => {
    setIsSkillSaving(true)
    setResumeMessage('')
    setErrorMessage('')

    try {
      await syncResumeSkills(
        (selectedSkillIds || []).map((skillId) => Number(skillId)),
        'Habilidades atualizadas com sucesso.'
      )
      setActiveResearcherTab('skills')
      setSkillsPage(1)
    } catch (error) {
      setErrorMessage(
        error.message || 'Nao foi possivel salvar as habilidades selecionadas.'
      )
    } finally {
      setIsSkillSaving(false)
    }
  }

  const handleSkillRemove = (skillId) => {
    setResumeMessage('')
    setErrorMessage('')

    setSelectedSkillIds((current) => (
      (current || []).filter((currentId) => String(currentId) !== String(skillId))
    ))
  }

  return (
    <section className="app-page profile-page">
      <div className="container app-page__container">
        <header className="app-page__header">
          <div>
            <span className="section-label">Perfil</span>
            <h1 className="app-page__title">
              {isEmpresa ? 'Dados da empresa' : 'Perfil do pesquisador'}
            </h1>
          </div>
          <p className="app-page__subtitle">Atualize informacoes essenciais da conta.</p>
        </header>

        {isEmpresa ? (
          <div className="profile-layout">
            <form className="profile-form-card" onSubmit={handleSubmit}>
              <div className="profile-form-card__head">
                <div>
                  <span className="profile-form-card__eyebrow">Empresa</span>
                  <h2 className="profile-form-card__title">Informacoes</h2>
                </div>
                {savedMessage ? <span className="profile-form-card__status">{savedMessage}</span> : null}
              </div>

              <div className="profile-form-grid">
                <label className="profile-field">
                  <span>Nome interno da empresa</span>
                  <input name="name" value={formData.name} onChange={handleChange} />
                </label>

                <div className="profile-field profile-field--readonly">
                  <span>CNPJ</span>
                  <div className="profile-readonly-value">{formData.cnpj || 'Nao informado'}</div>
                </div>

                <div className="profile-field profile-field--readonly profile-field--full">
                  <span>Situacao cadastral</span>
                  <div className="profile-readonly-value">
                    {formData.registrationStatus || 'Nao informada'}
                  </div>
                </div>

                <div className="profile-company-status">
                  <span className="profile-company-status__label">Empresa ativa</span>
                  <strong
                    className={`profile-company-status__badge${
                      formData.status === 'true' ? ' profile-company-status__badge--active' : ''
                    }`}
                  >
                    {formData.status === 'true' ? 'Ativa' : 'Inativa'}
                  </strong>
                </div>
              </div>

              {errorMessage ? <p className="login-message">{errorMessage}</p> : null}

              <div className="profile-form-card__actions">
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar alteracoes'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="profile-tabs-layout">
            <div className="profile-tabs-card">
              <div className="profile-tabs-card__head">
                <div>
                  <span className="profile-form-card__eyebrow">Pesquisador</span>
                  <h2 className="profile-form-card__title">Secoes do perfil</h2>
                </div>
                {savedMessage ? <span className="profile-form-card__status">{savedMessage}</span> : null}
              </div>

              <div className="profile-tabs" role="tablist" aria-label="Abas do perfil do pesquisador">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeResearcherTab === 'general'}
                  className={`profile-tab${activeResearcherTab === 'general' ? ' active' : ''}`}
                  onClick={() => setActiveResearcherTab('general')}
                >
                  Informacoes gerais
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeResearcherTab === 'educations'}
                  className={`profile-tab${activeResearcherTab === 'educations' ? ' active' : ''}`}
                  onClick={() => setActiveResearcherTab('educations')}
                >
                  Formacoes
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeResearcherTab === 'experiences'}
                  className={`profile-tab${activeResearcherTab === 'experiences' ? ' active' : ''}`}
                  onClick={() => setActiveResearcherTab('experiences')}
                >
                  Experiencias
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeResearcherTab === 'skills'}
                  className={`profile-tab${activeResearcherTab === 'skills' ? ' active' : ''}`}
                  onClick={() => setActiveResearcherTab('skills')}
                >
                  Habilidades
                </button>
              </div>

              {errorMessage ? <p className="login-message">{errorMessage}</p> : null}
              {resumeMessage ? <p className="profile-side__message">{resumeMessage}</p> : null}

              {activeResearcherTab === 'general' ? (
                <div className="profile-tab-panel">
                  <form className="profile-form-card profile-form-card--embedded" onSubmit={handleSubmit}>
                    <div className="profile-form-grid">
                      <label className="profile-field">
                        <span>Nome completo</span>
                        <input name="name" value={formData.name} onChange={handleChange} />
                      </label>

                      <label className="profile-field">
                        <span>Disponibilidade</span>
                        <select name="availability" value={formData.availability} onChange={handleChange}>
                          <option value="true">Disponivel</option>
                          <option value="false">Indisponivel</option>
                        </select>
                      </label>

                      <div className="profile-field profile-field--readonly">
                        <span>Universidade</span>
                        <div className="profile-readonly-value">{researcherUniversityName}</div>
                      </div>

                      <div className="profile-field profile-field--readonly">
                        <span>Status do cadastro</span>
                        <div className="profile-readonly-value">{researcherStatusLabel}</div>
                      </div>

                      <div className="profile-field profile-field--full">
                        <span>Areas de pesquisa</span>
                        {researchAreaCatalogError ? (
                          <div className="profile-readonly-value">
                            {researchAreaCatalogError}
                          </div>
                        ) : null}

                        {!researchAreaCatalogError && researchAreaCatalog.length === 0 ? (
                          <div className="profile-readonly-value">
                            Nenhuma area de pesquisa disponivel.
                          </div>
                        ) : null}

                        {!researchAreaCatalogError && researchAreaCatalog.length > 0 ? (
                          <div className="profile-area-picker">
                            <div className="profile-area-picker__controls">
                              <label className="profile-area-picker__select">
                                <span className="sr-only">Area de pesquisa disponivel</span>
                                <select
                                  value={selectedResearchAreaId}
                                  onChange={handleResearchAreaSelectChange}
                                  disabled={availableResearchAreasToAdd.length === 0}
                                >
                                  <option value="">
                                    {availableResearchAreasToAdd.length > 0
                                      ? 'Selecione uma area'
                                      : 'Todas as areas disponiveis foram adicionadas'}
                                  </option>
                                  {availableResearchAreasToAdd.map((area) => (
                                    <option key={area.id_area} value={area.id_area}>
                                      {area.name}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleResearchAreaAdd}
                                disabled={!selectedResearchAreaId}
                              >
                                Adicionar
                              </button>
                            </div>

                            <div className="profile-area-picker__selected" aria-live="polite">
                              {selectedResearchAreas.length > 0 ? (
                                paginatedSelectedResearchAreas.map((area) => (
                                  <span key={area.id_area} className="profile-area-chip">
                                    <span>{area.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleResearchAreaRemove(area.id_area)}
                                      aria-label={`Remover area ${area.name}`}
                                    >
                                      Remover
                                    </button>
                                  </span>
                                ))
                              ) : (
                                <span className="profile-area-picker__empty">
                                  Nenhuma area selecionada.
                                </span>
                              )}
                            </div>

                            {selectedResearchAreas.length > PROFILE_AREA_PAGE_SIZE ? (
                              <div className="profile-pagination profile-pagination--compact">
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  onClick={() => setResearchAreaPage((current) => Math.max(1, current - 1))}
                                  disabled={researchAreaPage === 1}
                                >
                                  Anterior
                                </button>
                                <span className="profile-pagination__status">
                                  Pagina {researchAreaPage} de {totalResearchAreaPages}
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  onClick={() => setResearchAreaPage((current) => (
                                    Math.min(totalResearchAreaPages, current + 1)
                                  ))}
                                  disabled={researchAreaPage === totalResearchAreaPages}
                                >
                                  Proxima
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        <small className="profile-field__hint">
                          Selecione as areas em que voce atua.
                        </small>
                      </div>
                    </div>

                    <div className="profile-form-card__actions">
                      <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'Salvando...' : 'Salvar alteracoes'}
                      </button>
                    </div>
                  </form>

                  <section className="profile-side__card profile-side__card--registered">
                    <span className="profile-side__eyebrow">Curriculo</span>
                    <h3 className="profile-side__title">Resumo</h3>
                    {!hasLinkedResume ? (
                      <article className="profile-side__item">
                        <strong>Curriculo ainda nao vinculado</strong>
                        <small>
                          Adicione formacao, experiencia ou habilidade para iniciar seu curriculo.
                        </small>
                      </article>
                    ) : null}
                    <div className="profile-side__stack">
                      <article className="profile-side__item">
                        <strong>{resumeData.education?.length || 0} formacao(oes)</strong>
                        <small>Historico academico.</small>
                      </article>
                      <article className="profile-side__item">
                        <strong>{resumeData.experience?.length || 0} experiencia(s)</strong>
                        <small>Experiencias profissionais.</small>
                      </article>
                      <article className="profile-side__item">
                        <strong>{resumeData.skill?.length || 0} habilidade(s)</strong>
                        <small>Competencias vinculadas.</small>
                      </article>
                    </div>
                  </section>
                </div>
              ) : null}

              {activeResearcherTab === 'educations' ? (
                <div className="profile-tab-panel">
                  <section className="profile-side__card profile-side__card--registered">
                    <div className="profile-section-head">
                      <div>
                        <span className="profile-side__eyebrow">Formacoes</span>
                        <h3 className="profile-side__title">Historico academico</h3>
                      </div>
                      {resumeData.education?.length > PROFILE_EDUCATION_PAGE_SIZE ? (
                        <span className="profile-pagination__meta">
                          {buildPageLabel(
                            educationPage,
                            resumeData.education.length,
                            PROFILE_EDUCATION_PAGE_SIZE
                          )}
                        </span>
                      ) : null}
                    </div>

                    <div className="profile-side__stack">
                      {paginatedEducation.length > 0 ? (
                        paginatedEducation.map((item) => (
                          <article key={item.id_education} className="profile-side__item">
                            <strong>{item.course}</strong>
                            <span>{item.institution}</span>
                            <small>
                              {formatDateLabel(item.start_date)} ate {formatDateLabel(item.end_date)}
                            </small>
                            <button
                              type="button"
                              className="btn btn-ghost profile-side__action"
                              onClick={() => handleEducationDelete(item.id_education)}
                              disabled={isEducationSaving}
                            >
                              Remover formacao
                            </button>
                          </article>
                        ))
                      ) : (
                        <article className="profile-side__item">
                          <strong>Nenhuma formacao cadastrada</strong>
                          <small>Cadastre sua primeira formacao para exibir o historico academico.</small>
                        </article>
                      )}
                    </div>

                    {resumeData.education?.length > PROFILE_EDUCATION_PAGE_SIZE ? (
                      <div className="profile-pagination">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setEducationPage((current) => Math.max(1, current - 1))}
                          disabled={educationPage === 1}
                        >
                          Anterior
                        </button>
                        <span className="profile-pagination__status">
                          Pagina {educationPage} de {totalEducationPages}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setEducationPage((current) => Math.min(totalEducationPages, current + 1))}
                          disabled={educationPage === totalEducationPages}
                        >
                          Proxima
                        </button>
                      </div>
                    ) : null}
                  </section>

                  <section className="profile-side__card profile-side__card--actions">
                    <span className="profile-side__eyebrow">Nova formacao</span>
                    <h3 className="profile-side__title">Adicionar formacao</h3>
                    <form className="profile-inline-form" onSubmit={handleEducationSubmit}>
                      <label className="profile-field">
                        <span>Curso</span>
                        <input
                          value={educationForm.course}
                          onChange={(event) => handleEducationChange('course', event.target.value)}
                        />
                      </label>
                      <label className="profile-field">
                        <span>Instituicao</span>
                        <input
                          value={educationForm.institution}
                          onChange={(event) => handleEducationChange('institution', event.target.value)}
                        />
                      </label>
                      <label className="profile-field">
                        <span>Data de inicio</span>
                        <input
                          type="date"
                          value={educationForm.startDate}
                          onChange={(event) => handleEducationChange('startDate', event.target.value)}
                        />
                      </label>
                      <label className="profile-field">
                        <span>Data de termino</span>
                        <input
                          type="date"
                          value={educationForm.endDate}
                          onChange={(event) => handleEducationChange('endDate', event.target.value)}
                        />
                      </label>
                      <button type="submit" className="btn btn-primary" disabled={isEducationSaving}>
                        {isEducationSaving ? 'Salvando...' : 'Adicionar formacao'}
                      </button>
                    </form>
                  </section>
                </div>
              ) : null}

              {activeResearcherTab === 'experiences' ? (
                <div className="profile-tab-panel">
                  <section className="profile-side__card profile-side__card--registered">
                    <div className="profile-section-head">
                      <div>
                        <span className="profile-side__eyebrow">Experiencias</span>
                        <h3 className="profile-side__title">Historico profissional</h3>
                      </div>
                      {resumeData.experience?.length > PROFILE_EXPERIENCE_PAGE_SIZE ? (
                        <span className="profile-pagination__meta">
                          {buildPageLabel(
                            experiencePage,
                            resumeData.experience.length,
                            PROFILE_EXPERIENCE_PAGE_SIZE
                          )}
                        </span>
                      ) : null}
                    </div>

                    <div className="profile-side__stack">
                      {paginatedExperience.length > 0 ? (
                        paginatedExperience.map((item) => (
                          <article key={item.id_experience} className="profile-side__item">
                            <strong>{item.description}</strong>
                            <small>
                              {formatDateLabel(item.start_date)} ate {formatDateLabel(item.end_date)}
                            </small>
                            <button
                              type="button"
                              className="btn btn-ghost profile-side__action"
                              onClick={() => handleExperienceDelete(item.id_experience)}
                              disabled={isExperienceSaving}
                            >
                              Remover experiencia
                            </button>
                          </article>
                        ))
                      ) : (
                        <article className="profile-side__item">
                          <strong>Nenhuma experiencia cadastrada</strong>
                          <small>Adicione sua primeira experiencia.</small>
                        </article>
                      )}
                    </div>

                    {resumeData.experience?.length > PROFILE_EXPERIENCE_PAGE_SIZE ? (
                      <div className="profile-pagination">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setExperiencePage((current) => Math.max(1, current - 1))}
                          disabled={experiencePage === 1}
                        >
                          Anterior
                        </button>
                        <span className="profile-pagination__status">
                          Pagina {experiencePage} de {totalExperiencePages}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setExperiencePage((current) => Math.min(totalExperiencePages, current + 1))}
                          disabled={experiencePage === totalExperiencePages}
                        >
                          Proxima
                        </button>
                      </div>
                    ) : null}
                  </section>

                  <section className="profile-side__card profile-side__card--actions">
                    <span className="profile-side__eyebrow">Nova experiencia</span>
                    <h3 className="profile-side__title">Adicionar experiencia</h3>
                    <form className="profile-inline-form" onSubmit={handleExperienceSubmit}>
                      <label className="profile-field profile-field--full">
                        <span>Descricao</span>
                        <input
                          value={experienceForm.description}
                          onChange={(event) => handleExperienceChange('description', event.target.value)}
                        />
                      </label>
                      <label className="profile-field">
                        <span>Data de inicio</span>
                        <input
                          type="date"
                          value={experienceForm.startDate}
                          onChange={(event) => handleExperienceChange('startDate', event.target.value)}
                        />
                      </label>
                      <label className="profile-field">
                        <span>Data de termino</span>
                        <input
                          type="date"
                          value={experienceForm.endDate}
                          onChange={(event) => handleExperienceChange('endDate', event.target.value)}
                        />
                      </label>
                      <button type="submit" className="btn btn-primary" disabled={isExperienceSaving}>
                        {isExperienceSaving ? 'Salvando...' : 'Adicionar experiencia'}
                      </button>
                    </form>
                  </section>
                </div>
              ) : null}

              {activeResearcherTab === 'skills' ? (
                <div className="profile-tab-panel">
                  <section className="profile-side__card profile-side__card--actions">
                    <span className="profile-side__eyebrow">Habilidades</span>
                    <h3 className="profile-side__title">Selecionar do catalogo</h3>

                    {skillsCatalogError ? (
                      <article className="profile-side__item">
                        <strong>Falha ao carregar catalogo</strong>
                        <small>{skillsCatalogError}</small>
                      </article>
                    ) : null}

                    <form className="profile-area-picker" onSubmit={handleSkillAttach}>
                      <div className="profile-area-picker__controls">
                        <label className="profile-area-picker__select">
                          <span className="sr-only">Habilidade disponivel</span>
                          <select
                            value={skillForm.selectedSkillId}
                            onChange={(event) => handleSkillChange('selectedSkillId', event.target.value)}
                            disabled={isSkillSaving || availableSkillsToLink.length === 0}
                          >
                            <option value="">
                              {availableSkillsToLink.length > 0
                                ? 'Selecione uma habilidade'
                                : 'Todas as habilidades disponiveis foram adicionadas'}
                            </option>
                            {availableSkillsToLink.map((item) => (
                              <option key={item.id_skill} value={item.id_skill}>
                                {item.description}
                              </option>
                            ))}
                          </select>
                        </label>

                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={isSkillSaving || !skillForm.selectedSkillId}
                        >
                          Adicionar
                        </button>
                      </div>

                      <div className="profile-area-picker__selected" aria-live="polite">
                        {selectedSkills.length > 0 ? (
                          paginatedSkills.map((item) => (
                            <span key={item.id_skill} className="profile-area-chip">
                              <span>{item.description}</span>
                              <button
                                type="button"
                                onClick={() => handleSkillRemove(item.id_skill)}
                                disabled={isSkillSaving}
                                aria-label={`Remover habilidade ${item.description}`}
                              >
                                Remover
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="profile-area-picker__empty">
                            Nenhuma habilidade selecionada.
                          </span>
                        )}
                      </div>

                      {selectedSkills.length > PROFILE_SKILL_PAGE_SIZE ? (
                        <div className="profile-pagination profile-pagination--compact">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setSkillsPage((current) => Math.max(1, current - 1))}
                            disabled={skillsPage === 1}
                          >
                            Anterior
                          </button>
                          <span className="profile-pagination__status">
                            Pagina {skillsPage} de {totalSkillsPages}
                          </span>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setSkillsPage((current) => Math.min(totalSkillsPages, current + 1))}
                            disabled={skillsPage === totalSkillsPages}
                          >
                            Proxima
                          </button>
                        </div>
                      ) : null}
                    </form>

                    <div className="profile-form-card__actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSkillSave}
                        disabled={isSkillSaving}
                      >
                        {isSkillSaving ? 'Salvando...' : 'Salvar habilidades'}
                      </button>
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
