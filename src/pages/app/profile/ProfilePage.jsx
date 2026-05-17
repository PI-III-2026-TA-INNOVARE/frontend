import { useEffect, useMemo, useState } from 'react'
import { formatDateLabel } from '../../../lib/domain'
import { useAuth } from '../../../context/AuthContext'
import {
  createEducation,
  createExperience,
  createResume,
  deleteEducation,
  deleteExperience,
  getAuthenticatedProfile,
  getCompany,
  getResearcherResume,
  getUniversity,
  listResearchAreas,
  listSkills,
  updateCompany,
  updateResearcher,
  updateResume,
} from '../../../services/pdConnectApi'
import './ProfilePage.scss'

const PROFILE_EDUCATION_PAGE_SIZE = 3
const PROFILE_EXPERIENCE_PAGE_SIZE = 3

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

async function fetchProfileSnapshot() {
  const profilePayload = await getAuthenticatedProfile()

  if (profilePayload?.empresa) {
    const company = profilePayload.empresa
    const [companyDetailResult] = await Promise.allSettled([
      company.id_company ? getCompany(company.id_company) : Promise.resolve(null),
    ])
    const hydratedCompany =
      companyDetailResult.status === 'fulfilled' && companyDetailResult.value
        ? { ...company, ...companyDetailResult.value }
        : company

    return {
      idUser: profilePayload.id_user,
      email: profilePayload.email,
      userTypeId: profilePayload.id_tipo,
      userTypeLabel: profilePayload.tipo,
      type: 'empresa',
      profileId: hydratedCompany.id_company,
      displayName: hydratedCompany.razao_social || hydratedCompany.legal_name || hydratedCompany.name || profilePayload.email,
      company: hydratedCompany,
      researcher: null,
      university: null,
      resume: null,
    }
  }

  if (profilePayload?.pesquisador) {
    const researcher = profilePayload.pesquisador
    const [universityResult, resumeResult] = await Promise.allSettled([
      researcher.university ? getUniversity(researcher.university) : Promise.resolve(null),
      researcher.id_researcher ? getResearcherResume(researcher.id_researcher) : Promise.resolve(null),
    ])

    return {
      idUser: profilePayload.id_user,
      email: profilePayload.email,
      userTypeId: profilePayload.id_tipo,
      userTypeLabel: profilePayload.tipo,
      type: 'pesquisador',
      profileId: researcher.id_researcher,
      displayName: researcher.name || profilePayload.email,
      company: null,
      researcher,
      university: universityResult.status === 'fulfilled' ? universityResult.value : null,
      resume: resumeResult.status === 'fulfilled' ? resumeResult.value : null,
    }
  }

  throw new Error('A API autenticada nao retornou um perfil valido.')
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profileUser, setProfileUser] = useState(user)
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
  const [activeSkillInnerTab, setActiveSkillInnerTab] = useState('areas')
  const [educationPage, setEducationPage] = useState(1)
  const [experiencePage, setExperiencePage] = useState(1)
  const [skillsCatalog, setSkillsCatalog] = useState([])
  const [researchAreaCatalog, setResearchAreaCatalog] = useState([])
  const [selectedResearchAreaId, setSelectedResearchAreaId] = useState('')
  const [selectedSkillIds, setSelectedSkillIds] = useState(() => (
    (user?.resume?.skill || []).map((item) => String(item.id_skill))
  ))

  const isEmpresa = profileUser?.type === 'empresa'
  const resumeData = profileUser?.resume || { education: [], experience: [], skill: [] }
  const researcherUniversityName = profileUser?.university?.name || 'Universidade nao informada'

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

  const paginatedEducation = useMemo(
    () => paginateItems(resumeData.education || [], educationPage, PROFILE_EDUCATION_PAGE_SIZE),
    [educationPage, resumeData.education]
  )

  const paginatedExperience = useMemo(
    () => paginateItems(resumeData.experience || [], experiencePage, PROFILE_EXPERIENCE_PAGE_SIZE),
    [experiencePage, resumeData.experience]
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

  const availableResearchAreasToAdd = useMemo(
    () => researchAreaCatalog.filter((area) => !linkedResearcherAreaIds.has(String(area.id_area))),
    [linkedResearcherAreaIds, researchAreaCatalog]
  )

  useEffect(() => {
    setProfileUser(user)
  }, [user])

  useEffect(() => {
    setFormData(buildInitialProfile(profileUser))
    setSelectedResearchAreaId('')
    setSelectedSkillIds((profileUser?.resume?.skill || []).map((item) => String(item.id_skill)))
    setSkillForm(defaultSkillForm)
  }, [profileUser])

  useEffect(() => {
    setEducationPage((current) => Math.min(current, totalEducationPages))
  }, [totalEducationPages])

  useEffect(() => {
    setExperiencePage((current) => Math.min(current, totalExperiencePages))
  }, [totalExperiencePages])

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
  }, [isEmpresa, profileUser?.researcher?.id_researcher])

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
  }, [isEmpresa, profileUser?.researcher?.id_researcher])

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
        await updateCompany(profileUser.company.id_company, {
          name: formData.name.trim(),
          status: toBoolean(formData.status),
        })
      } else {
        if (!formData.name.trim()) {
          throw new Error('Informe o nome do pesquisador antes de salvar.')
        }

        await updateResearcher(profileUser.researcher.id_researcher, {
          name: formData.name.trim(),
          availability: toBoolean(formData.availability),
          area: (formData.areaIds || []).map((areaId) => Number(areaId)),
        })
      }

      await refreshProfileView()
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

  const refreshProfileView = async () => {
    const nextProfileUser = await fetchProfileSnapshot()
    setProfileUser(nextProfileUser)
    return nextProfileUser
  }

  const syncResumeAfterChange = async (message) => {
    await refreshProfileView()
    setResumeMessage(message)
  }

  const ensureResearcherResume = async () => {
    if (profileUser?.researcher?.resume) {
      return Number(profileUser.researcher.resume)
    }

    if (!profileUser?.researcher?.id_researcher) {
      throw new Error('O perfil autenticado nao retornou o ID do pesquisador.')
    }

    const createdResume = await createResume({})

    if (!createdResume?.id_resume) {
      throw new Error('Nao foi possivel confirmar o curriculo criado.')
    }

    await updateResearcher(profileUser.researcher.id_researcher, {
      resume: createdResume.id_resume,
    })

    await refreshProfileView()

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
                  Informações gerais
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeResearcherTab === 'educations'}
                  className={`profile-tab${activeResearcherTab === 'educations' ? ' active' : ''}`}
                  onClick={() => setActiveResearcherTab('educations')}
                >
                  Formações ({resumeData.education?.length || 0})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeResearcherTab === 'experiences'}
                  className={`profile-tab${activeResearcherTab === 'experiences' ? ' active' : ''}`}
                  onClick={() => setActiveResearcherTab('experiences')}
                >
                  Experiências ({resumeData.experience?.length || 0})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeResearcherTab === 'skills'}
                  className={`profile-tab${activeResearcherTab === 'skills' ? ' active' : ''}`}
                  onClick={() => setActiveResearcherTab('skills')}
                >
                  Áreas e habilidades ({selectedResearchAreas.length + selectedSkills.length})
                </button>
              </div>

              {errorMessage ? <p className="login-message">{errorMessage}</p> : null}
              {resumeMessage ? <p className="profile-side__message">{resumeMessage}</p> : null}

              {activeResearcherTab === 'general' ? (
                <div className="profile-tab-panel">
                  <form className="profile-form-card profile-form-card--embedded profile-form-card--general" onSubmit={handleSubmit}>
                    <div className="profile-form-card__intro">
                      <span className="profile-side__eyebrow">Pesquisador</span>
                      <h3 className="profile-side__title">Informações gerais</h3>
                    </div>

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

                    </div>

                    <div className="profile-form-card__actions">
                      <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'Salvando...' : 'Salvar alterações'}
                      </button>
                    </div>
                  </form>

                </div>
              ) : null}

              {activeResearcherTab === 'educations' ? (
                <div className="profile-tab-panel">
                  <section className="profile-side__card profile-side__card--registered profile-side__card--compact-list">
                    <div className="profile-section-head">
                      <div>
                        <span className="profile-side__eyebrow">Formações</span>
                        <h3 className="profile-side__title">Histórico acadêmico</h3>
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

                    <form className="profile-inline-form profile-inline-form--grid profile-inline-form--panel" onSubmit={handleEducationSubmit}>
                      <span className="profile-inline-form__title">+ Nova formação</span>
                      <label className="profile-field">
                        <span>Curso</span>
                        <input
                          placeholder="Nome do curso"
                          value={educationForm.course}
                          onChange={(event) => handleEducationChange('course', event.target.value)}
                        />
                      </label>
                      <label className="profile-field">
                        <span>Instituição</span>
                        <input
                          placeholder="Nome da instituição"
                          value={educationForm.institution}
                          onChange={(event) => handleEducationChange('institution', event.target.value)}
                        />
                      </label>
                      <label className="profile-field">
                        <span>Data de início</span>
                        <input
                          type="date"
                          value={educationForm.startDate}
                          onChange={(event) => handleEducationChange('startDate', event.target.value)}
                        />
                      </label>
                      <label className="profile-field">
                        <span>Data de término</span>
                        <input
                          type="date"
                          value={educationForm.endDate}
                          onChange={(event) => handleEducationChange('endDate', event.target.value)}
                        />
                      </label>
                      <button type="submit" className="btn btn-primary" disabled={isEducationSaving}>
                        {isEducationSaving ? 'Salvando...' : 'Adicionar formação'}
                      </button>
                    </form>

                    <div className="profile-side__stack profile-side__stack--compact">
                      {paginatedEducation.length > 0 ? (
                        paginatedEducation.map((item) => (
                          <article key={item.id_education} className="profile-side__item profile-side__item--timeline">
                            <div className="profile-side__icon" aria-hidden="true">F</div>
                            <div className="profile-side__content">
                              <strong>{item.course}</strong>
                              <small>
                                {item.institution} · {formatDateLabel(item.start_date)} até {formatDateLabel(item.end_date)}
                              </small>
                            </div>
                            <button
                              type="button"
                              className="btn btn-ghost profile-side__action"
                              onClick={() => handleEducationDelete(item.id_education)}
                              disabled={isEducationSaving}
                            >
                              Remover
                            </button>
                          </article>
                        ))
                      ) : (
                        <article className="profile-side__item profile-side__item--empty">
                          <strong>Nenhuma formação cadastrada ainda.</strong>
                          <small>Adicione sua primeira formação acadêmica para completar seu perfil.</small>
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
                          Página {educationPage} de {totalEducationPages}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setEducationPage((current) => Math.min(totalEducationPages, current + 1))}
                          disabled={educationPage === totalEducationPages}
                        >
                          Próxima
                        </button>
                      </div>
                    ) : null}
                  </section>
                </div>
              ) : null}

              {activeResearcherTab === 'experiences' ? (
                <div className="profile-tab-panel">
                  <section className="profile-side__card profile-side__card--registered profile-side__card--compact-list">
                    <div className="profile-section-head">
                      <div>
                        <span className="profile-side__eyebrow">Experiências</span>
                        <h3 className="profile-side__title">Histórico profissional</h3>
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

                    <form className="profile-inline-form profile-inline-form--grid profile-inline-form--panel" onSubmit={handleExperienceSubmit}>
                      <span className="profile-inline-form__title">+ Nova experiência</span>
                      <label className="profile-field profile-field--full">
                        <span>Descrição</span>
                        <textarea
                          placeholder="Descreva sua experiência"
                          value={experienceForm.description}
                          onChange={(event) => handleExperienceChange('description', event.target.value)}
                        />
                      </label>
                      <label className="profile-field">
                        <span>Data de início</span>
                        <input
                          type="date"
                          value={experienceForm.startDate}
                          onChange={(event) => handleExperienceChange('startDate', event.target.value)}
                        />
                      </label>
                      <label className="profile-field">
                        <span>Data de término</span>
                        <input
                          type="date"
                          value={experienceForm.endDate}
                          onChange={(event) => handleExperienceChange('endDate', event.target.value)}
                        />
                      </label>
                      <button type="submit" className="btn btn-primary" disabled={isExperienceSaving}>
                        {isExperienceSaving ? 'Salvando...' : 'Adicionar experiência'}
                      </button>
                    </form>

                    <div className="profile-side__stack profile-side__stack--compact">
                      {paginatedExperience.length > 0 ? (
                        paginatedExperience.map((item) => (
                          <article key={item.id_experience} className="profile-side__item profile-side__item--timeline">
                            <div className="profile-side__icon" aria-hidden="true">E</div>
                            <div className="profile-side__content">
                              <strong>{item.description}</strong>
                              <small>
                                {formatDateLabel(item.start_date)} até {formatDateLabel(item.end_date)}
                              </small>
                            </div>
                            <button
                              type="button"
                              className="btn btn-ghost profile-side__action"
                              onClick={() => handleExperienceDelete(item.id_experience)}
                              disabled={isExperienceSaving}
                            >
                              Remover
                            </button>
                          </article>
                        ))
                      ) : (
                        <article className="profile-side__item profile-side__item--empty">
                          <strong>Nenhuma experiência cadastrada ainda.</strong>
                          <small>Adicione experiências profissionais para fortalecer seu perfil.</small>
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
                          Página {experiencePage} de {totalExperiencePages}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setExperiencePage((current) => Math.min(totalExperiencePages, current + 1))}
                          disabled={experiencePage === totalExperiencePages}
                        >
                          Próxima
                        </button>
                      </div>
                    ) : null}
                  </section>
                </div>
              ) : null}

              {activeResearcherTab === 'skills' ? (
                <div className="profile-tab-panel">
                  <section className="profile-side__card profile-side__card--compact-list profile-skill-groups">
                    <div className="profile-inner-tabs" role="tablist" aria-label="Escolha entre areas de pesquisa e habilidades">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeSkillInnerTab === 'areas'}
                        className={`profile-inner-tab${activeSkillInnerTab === 'areas' ? ' active' : ''}`}
                        onClick={() => setActiveSkillInnerTab('areas')}
                      >
                        Áreas de pesquisa
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeSkillInnerTab === 'skills'}
                        className={`profile-inner-tab${activeSkillInnerTab === 'skills' ? ' active' : ''}`}
                        onClick={() => setActiveSkillInnerTab('skills')}
                      >
                        Habilidades
                      </button>
                    </div>

                    <div className="profile-skill-group" hidden={activeSkillInnerTab !== 'areas'}>
                      <span className="profile-side__eyebrow">Áreas de pesquisa</span>
                      <h3 className="profile-side__title">Áreas selecionadas</h3>
                      <p className="profile-skill-description">
                        Escolha as áreas em que você atua para melhorar o match com demandas de P&D.
                      </p>

                      {researchAreaCatalogError ? (
                        <article className="profile-side__item">
                          <strong>Falha ao carregar catálogo</strong>
                          <small>{researchAreaCatalogError}</small>
                        </article>
                      ) : null}

                      <form className="profile-area-picker profile-area-picker--flat" onSubmit={handleSubmit}>
                        <div className="profile-area-picker__controls">
                          <label className="profile-area-picker__select">
                            <span className="sr-only">Área disponível</span>
                            <div className="profile-multiselect__chips" aria-live="polite">
                              {selectedResearchAreas.length > 0 ? (
                                selectedResearchAreas.map((item) => (
                                  <span key={item.id_area} className="profile-area-chip profile-area-chip--inside">
                                    <span>{item.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleResearchAreaRemove(item.id_area)}
                                      disabled={isSaving}
                                      aria-label={`Remover área ${item.name}`}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))
                              ) : (
                                <span className="profile-area-picker__empty">
                                  Nenhuma área selecionada.
                                </span>
                              )}
                            </div>
                            <select
                              value={selectedResearchAreaId}
                              onChange={handleResearchAreaSelectChange}
                              disabled={isSaving || availableResearchAreasToAdd.length === 0}
                            >
                              <option value="">
                                {availableResearchAreasToAdd.length > 0
                                  ? 'Selecione uma área'
                                  : 'Todas as áreas disponíveis foram adicionadas'}
                              </option>
                              {availableResearchAreasToAdd.map((item) => (
                                <option key={item.id_area} value={item.id_area}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleResearchAreaAdd}
                            disabled={isSaving || !selectedResearchAreaId}
                          >
                            + Adicionar
                          </button>
                        </div>

                        <div className="profile-form-card__actions">
                          <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Salvando...' : 'Salvar áreas'}
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="profile-skill-group" hidden={activeSkillInnerTab !== 'skills'}>
                      <span className="profile-side__eyebrow">Habilidades</span>
                      <h3 className="profile-side__title">Habilidades selecionadas</h3>
                      <p className="profile-skill-description">
                        Vincule competências técnicas ao seu currículo para destacar seu perfil.
                      </p>

                      {skillsCatalogError ? (
                        <article className="profile-side__item">
                          <strong>Falha ao carregar catálogo</strong>
                          <small>{skillsCatalogError}</small>
                        </article>
                      ) : null}

                      <form className="profile-area-picker profile-area-picker--flat" onSubmit={handleSkillAttach}>
                        <div className="profile-area-picker__controls">
                          <label className="profile-area-picker__select">
                            <span className="sr-only">Habilidade disponível</span>
                            <div className="profile-multiselect__chips" aria-live="polite">
                              {selectedSkills.length > 0 ? (
                                selectedSkills.map((item) => (
                                  <span key={item.id_skill} className="profile-area-chip profile-area-chip--inside">
                                    <span>{item.description}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleSkillRemove(item.id_skill)}
                                      disabled={isSkillSaving}
                                      aria-label={`Remover habilidade ${item.description}`}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))
                              ) : (
                                <span className="profile-area-picker__empty">
                                  Nenhuma habilidade selecionada.
                                </span>
                              )}
                            </div>
                            <select
                              value={skillForm.selectedSkillId}
                              onChange={(event) => handleSkillChange('selectedSkillId', event.target.value)}
                              disabled={isSkillSaving || availableSkillsToLink.length === 0}
                            >
                              <option value="">
                                {availableSkillsToLink.length > 0
                                  ? 'Selecione uma habilidade'
                                  : 'Todas as habilidades disponíveis foram adicionadas'}
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
                            + Adicionar
                          </button>
                        </div>

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
