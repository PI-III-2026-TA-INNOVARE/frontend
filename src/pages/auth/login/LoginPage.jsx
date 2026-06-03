import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { listPublicUniversities, lookupCompanyCnpj } from '../../../services/pdConnectApi'
import './LoginPage.scss'

const defaultLoginForm = {
  email: '',
  password: '',
}

const defaultCompanyForm = {
  email: '',
  password: '',
  confirmPassword: '',
  cnpj: '',
}

const defaultResearcherForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  universityId: '',
  availability: 'true',
}

function getReturnPath(pathname) {
  return typeof pathname === 'string' && pathname.trim() ? pathname : '/painel'
}

function normalizeCnpjDigits(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 14)
}

function formatCnpj(value) {
  const digits = normalizeCnpjDigits(value)

  if (!digits) {
    return ''
  }

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function isValidCnpj(value) {
  const digits = normalizeCnpjDigits(value)

  if (digits.length !== 14 || digits === digits[0]?.repeat(14)) {
    return false
  }

  const numbers = digits.split('').map((digit) => Number(digit))
  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const firstSum = firstWeights.reduce((sum, weight, index) => sum + numbers[index] * weight, 0)
  const firstCheck = 11 - (firstSum % 11)
  const firstDigit = firstCheck >= 10 ? 0 : firstCheck

  const secondSum = secondWeights.reduce((sum, weight, index) => {
    const number = index < 12 ? numbers[index] : firstDigit
    return sum + number * weight
  }, 0)
  const secondCheck = 11 - (secondSum % 11)
  const secondDigit = secondCheck >= 10 ? 0 : secondCheck

  return numbers[12] === firstDigit && numbers[13] === secondDigit
}

function validateLoginForm(form) {
  if (!form.email.trim() || !form.password) {
    return 'Informe e-mail e senha para continuar.'
  }

  return ''
}

function validateCompanyForm(form, { companyLookup } = {}) {
  if (!form.email.trim()) {
    return 'Informe um e-mail para criar o acesso.'
  }

  if (!form.password) {
    return 'Informe uma senha para o cadastro.'
  }

  if (form.password.length < 8) {
    return 'A senha precisa ter pelo menos 8 caracteres.'
  }

  if (form.password !== form.confirmPassword) {
    return 'A confirmacao da senha nao confere.'
  }

  if (!isValidCnpj(form.cnpj)) {
    return 'CNPJ nao encontrado'
  }

  if (
    !companyLookup?.pode_cadastrar ||
    normalizeCnpjDigits(companyLookup.cnpj) !== normalizeCnpjDigits(form.cnpj)
  ) {
    return 'Consulte um CNPJ valido antes de cadastrar.'
  }

  return ''
}

function validateResearcherForm(form, { universitiesLoading, universitiesError, universities }) {
  if (!form.name.trim()) {
    return 'Informe o nome do pesquisador.'
  }

  if (!form.email.trim()) {
    return 'Informe um e-mail institucional para criar o acesso.'
  }

  if (!form.password) {
    return 'Informe uma senha para o cadastro.'
  }

  if (form.password.length < 8) {
    return 'A senha precisa ter pelo menos 8 caracteres.'
  }

  if (form.password !== form.confirmPassword) {
    return 'A confirmacao da senha nao confere.'
  }

  if (universitiesLoading) {
    return 'Aguarde o carregamento das universidades.'
  }

  if (universitiesError) {
    return 'Nao foi possivel carregar as universidades.'
  }

  if (!universities.length) {
    return 'Nenhuma universidade disponivel.'
  }

  if (!form.universityId || Number(form.universityId) <= 0) {
    return 'Selecione uma universidade.'
  }

  return ''
}

export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    authError,
    isAuthenticated,
    registerCompany,
    registerResearcher,
    signInWithCredentials,
  } = useAuth()

  const [isRegister, setIsRegister] = useState(false)
  const [regTab, setRegTab] = useState('empresa')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [companyLookupLoading, setCompanyLookupLoading] = useState(false)
  const [companyLookup, setCompanyLookup] = useState(null)
  const [companyRegistrationStep, setCompanyRegistrationStep] = useState('cnpj')
  const [companyCnpjFeedback, setCompanyCnpjFeedback] = useState({ type: '', message: '' })
  const [loginMessage, setLoginMessage] = useState('')
  const [registerMessage, setRegisterMessage] = useState('')
  const [loginForm, setLoginForm] = useState(defaultLoginForm)
  const [companyForm, setCompanyForm] = useState(defaultCompanyForm)
  const [researcherForm, setResearcherForm] = useState(defaultResearcherForm)
  const [universities, setUniversities] = useState([])
  const [universitiesLoading, setUniversitiesLoading] = useState(false)
  const [universitiesError, setUniversitiesError] = useState('')

  useEffect(() => {
    setIsRegister(location.hash === '#cadastro')
  }, [location.hash])

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getReturnPath(location.state?.from), { replace: true })
    }
  }, [isAuthenticated, location.state, navigate])

  useEffect(() => {
    let isMounted = true

    if (!isRegister || regTab !== 'pesquisador') {
      return () => {
        isMounted = false
      }
    }

    const loadUniversities = async () => {
      setUniversitiesLoading(true)
      setUniversitiesError('')

      try {
        const loadedUniversities = await listPublicUniversities()

        if (!isMounted) {
          return
        }

        setUniversities(
          [...loadedUniversities].sort((first, second) =>
            String(first.name || '').localeCompare(String(second.name || ''), 'pt-BR')
          )
        )
      } catch (error) {
        if (!isMounted) {
          return
        }

        setUniversities([])
        setUniversitiesError(
          error.message || 'Nao foi possivel carregar a lista de universidades.'
        )
      } finally {
        if (isMounted) {
          setUniversitiesLoading(false)
        }
      }
    }

    loadUniversities()

    return () => {
      isMounted = false
    }
  }, [isRegister, regTab])

  const openRegisterForm = (event) => {
    event.preventDefault()
    navigate('/login#cadastro')
    setLoginMessage('')
    setRegisterMessage('')
  }

  const openLoginForm = (event) => {
    event.preventDefault()
    navigate('/login')
    setLoginMessage('')
    setRegisterMessage('')
  }

  const handleLoginChange = (field, value) => {
    setLoginForm((current) => ({
      ...current,
      [field]: value,
    }))
    setLoginMessage('')
  }

  const handleRegisterTabChange = (nextTab) => {
    setRegTab(nextTab)
    setRegisterMessage('')

    if (nextTab === 'empresa') {
      setCompanyRegistrationStep(companyLookup ? 'details' : 'cnpj')
    }
  }

  const handleCompanyChange = (field, value) => {
    setCompanyForm((current) => ({
      ...current,
      [field]: field === 'cnpj' ? formatCnpj(value) : value,
    }))
    if (field === 'cnpj') {
      setCompanyLookup(null)
      setCompanyRegistrationStep('cnpj')
      setCompanyCnpjFeedback({ type: '', message: '' })
    }
    setRegisterMessage('')
  }

  const handleResearcherChange = (field, value) => {
    setResearcherForm((current) => ({
      ...current,
      [field]: value,
    }))
    setRegisterMessage('')
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()

    const validationMessage = validateLoginForm(loginForm)
    if (validationMessage) {
      setLoginMessage(validationMessage)
      return
    }

    setSubmitLoading(true)
    setLoginMessage('')

    const result = await signInWithCredentials(loginForm)

    if (!result.ok) {
      setLoginMessage(result.message)
    }

    setSubmitLoading(false)
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()

    const validationMessage = validateCompanyForm(companyForm, { companyLookup })
    if (validationMessage) {
      setRegisterMessage(validationMessage)
      return
    }

    setSubmitLoading(true)
    setRegisterMessage('')

    const result = await registerCompany({
      email: companyForm.email,
      password: companyForm.password,
      cnpj: companyForm.cnpj,
    })

    if (!result.ok) {
      if (result.registered) {
        setLoginForm({
          email: result.email || companyForm.email,
          password: '',
        })
        navigate('/login')
        setLoginMessage(result.message)
      } else {
        setRegisterMessage(result.message)
      }
    }

    setSubmitLoading(false)
  }

  const handleResearcherRegisterSubmit = async (event) => {
    event.preventDefault()

    const validationMessage = validateResearcherForm(researcherForm, {
      universities,
      universitiesError,
      universitiesLoading,
    })
    if (validationMessage) {
      setRegisterMessage(validationMessage)
      return
    }

    setSubmitLoading(true)
    setRegisterMessage('')

    const result = await registerResearcher({
      name: researcherForm.name,
      email: researcherForm.email,
      password: researcherForm.password,
      universityId: researcherForm.universityId,
      availability: researcherForm.availability === 'true',
    })

    if (!result.ok) {
      if (result.registered) {
        setLoginForm({
          email: result.email || researcherForm.email,
          password: '',
        })
        navigate('/login')
        setLoginMessage(result.message)
      } else {
        setRegisterMessage(result.message)
      }
    }

    setSubmitLoading(false)
  }

  const handleCompanyLookup = async () => {
    if (!isValidCnpj(companyForm.cnpj)) {
      setCompanyCnpjFeedback({ type: 'error', message: 'CNPJ nao encontrado' })
      return
    }

    setCompanyLookupLoading(true)
    setRegisterMessage('')
    setCompanyCnpjFeedback({ type: '', message: '' })
    setCompanyLookup(null)

    try {
      const result = await lookupCompanyCnpj({
        cnpj: companyForm.cnpj,
      })

      if (!result?.pode_cadastrar) {
        setCompanyCnpjFeedback({ type: 'error', message: 'CNPJ nao encontrado' })
        return
      }

      setCompanyLookup(result)
      setCompanyCnpjFeedback({ type: 'success', message: 'CNPJ valido' })
      window.setTimeout(() => {
        setCompanyRegistrationStep('details')
      }, 2000)
    } catch (error) {
      setCompanyCnpjFeedback({ type: 'error', message: 'CNPJ nao encontrado' })
    } finally {
      setCompanyLookupLoading(false)
    }
  }

  return (
    <section className="login-page">
      <div className="login-page__bg">
        <div className="login-page__bg-orb login-page__bg-orb--1"></div>
        <div className="login-page__bg-orb login-page__bg-orb--2"></div>
      </div>

      <div className="login-shell">
        <aside className="login-brand-panel" aria-label="Apresentação P&D Connect">
          <div className="login-brand-panel__overlay"></div>
          <div className="login-brand-panel__content">
            <span className="login-brand-panel__brand">P&amp;D Connect</span>
            <p className="login-brand-panel__tagline">
              Pesquisa aplicada, oportunidades reais e conexões inteligentes.
            </p>
          </div>
        </aside>

        <main className="login-shell__form" aria-label="Acesso e cadastro">
      {!isRegister && (
        <div className="login-box login-box--wide" id="loginBox">
          <div className="login-box__header">
            <h1 className="login-box__title">Entrar</h1>
            <p className="login-box__subtitle">Acesse sua conta P&amp;D Connect.</p>
          </div>

          {authError ? (
            <div className="login-feedback login-feedback--error">
              <strong>Sessao anterior encerrada</strong>
              <p>{authError}</p>
            </div>
          ) : null}

          <form onSubmit={handleLoginSubmit} className="login-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">
                  E-mail
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  value={loginForm.email}
                  onChange={(event) => handleLoginChange('email', event.target.value)}
                  placeholder="voce@empresa.com"
                  autoComplete="email"
                  disabled={submitLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">
                  Senha
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  value={loginForm.password}
                  onChange={(event) => handleLoginChange('password', event.target.value)}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  disabled={submitLoading}
                />
              </div>
            </div>

            {loginMessage ? <p className="login-message">{loginMessage}</p> : null}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                {submitLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>

            <div className="form-footer login-forgot-link">
              <Link to="/esqueci-minha-senha">Esqueci minha senha</Link>
            </div>
          </form>

          <div className="form-divider">ou</div>

          <div className="form-footer">
            Ainda nao possui acesso? <a href="/login#cadastro" onClick={openRegisterForm}>Cadastrar</a>
          </div>
        </div>
      )}

      {isRegister && (
        <div className="login-box login-box--wide" id="registerBox">
          <div className="login-box__header">
            <h1 className="login-box__title">Criar conta</h1>
            <p className="login-box__subtitle">Escolha seu perfil e preencha os dados principais.</p>
          </div>

          <div className="login-tabs">
            <div
              className={`login-tab${regTab === 'empresa' ? ' active' : ''}`}
              onClick={() => handleRegisterTabChange('empresa')}
            >
              Empresa
            </div>
            <div
              className={`login-tab${regTab === 'pesquisador' ? ' active' : ''}`}
              onClick={() => handleRegisterTabChange('pesquisador')}
            >
              Pesquisador
            </div>
          </div>

          {regTab === 'empresa' ? (
            <form onSubmit={handleRegisterSubmit} className="login-register-preview">
              {companyRegistrationStep === 'cnpj' ? (
                <div className="login-company-cnpj-step">
                  <div className="form-group">
                    <label className="form-label" htmlFor="company-cnpj">
                      CNPJ
                    </label>
                    {companyCnpjFeedback.message ? (
                      <span className={`login-cnpj-feedback login-cnpj-feedback--${companyCnpjFeedback.type}`}>
                        {companyCnpjFeedback.message}
                      </span>
                    ) : null}
                    <input
                      id="company-cnpj"
                      className="form-input"
                      value={companyForm.cnpj}
                      onChange={(event) => handleCompanyChange('cnpj', event.target.value)}
                      placeholder="00.000.000/0000-00"
                      disabled={submitLoading || companyLookupLoading}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline login-register-preview__secondary-action"
                    onClick={handleCompanyLookup}
                    disabled={submitLoading || companyLookupLoading}
                  >
                    {companyLookupLoading ? 'Consultando CNPJ...' : 'Consultar CNPJ'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="login-feedback">
                    <strong>{companyLookup?.razao_social || 'CNPJ valido'}</strong>
                    <p>CNPJ validado. Continue o cadastro da empresa.</p>
                  </div>

                  <div className="login-register-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="company-email">
                        E-mail de acesso
                      </label>
                      <input
                        id="company-email"
                        type="email"
                        className="form-input"
                        value={companyForm.email}
                        onChange={(event) => handleCompanyChange('email', event.target.value)}
                        placeholder="contato@empresa.com"
                        autoComplete="email"
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="company-password">
                        Senha
                      </label>
                      <input
                        id="company-password"
                        type="password"
                        className="form-input"
                        value={companyForm.password}
                        onChange={(event) => handleCompanyChange('password', event.target.value)}
                        placeholder="Minimo de 8 caracteres"
                        autoComplete="new-password"
                        disabled={submitLoading}
                      />
                    </div>

                    <div className="form-group login-register-grid__confirm">
                      <label className="form-label" htmlFor="company-password-confirm">
                        Confirmacao da senha
                      </label>
                      <input
                        id="company-password-confirm"
                        type="password"
                        className="form-input"
                        value={companyForm.confirmPassword}
                        onChange={(event) => handleCompanyChange('confirmPassword', event.target.value)}
                        placeholder="Repita a senha"
                        autoComplete="new-password"
                        disabled={submitLoading}
                      />
                    </div>
                  </div>
                </>
              )}

              {registerMessage ? <p className="login-message">{registerMessage}</p> : null}

              {companyRegistrationStep === 'details' ? (
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                    {submitLoading ? 'Salvando...' : 'Cadastrar empresa'}
                  </button>
                </div>
              ) : null}
            </form>
          ) : (
            <form onSubmit={handleResearcherRegisterSubmit} className="login-register-preview">
              <div className="login-register-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="researcher-name">
                    Nome completo
                  </label>
                  <input
                    id="researcher-name"
                    className="form-input"
                    value={researcherForm.name}
                    onChange={(event) => handleResearcherChange('name', event.target.value)}
                    placeholder="Nome do pesquisador"
                    disabled={submitLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="researcher-university">
                    Universidade
                  </label>
                  <select
                    id="researcher-university"
                    className="form-input"
                    value={researcherForm.universityId}
                    onChange={(event) => handleResearcherChange('universityId', event.target.value)}
                    disabled={submitLoading || universitiesLoading || universities.length === 0}
                  >
                    <option value="">
                      {universitiesLoading ? 'Carregando universidades...' : 'Selecione uma universidade'}
                    </option>
                    {universities.map((university) => (
                      <option key={university.id_university} value={university.id_university}>
                        {university.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="researcher-email">
                    E-mail institucional
                  </label>
                  <input
                    id="researcher-email"
                    type="email"
                    className="form-input"
                    value={researcherForm.email}
                    onChange={(event) => handleResearcherChange('email', event.target.value)}
                    placeholder="voce@universidade.edu"
                    autoComplete="email"
                    disabled={submitLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="researcher-availability">
                    Disponibilidade
                  </label>
                  <select
                    id="researcher-availability"
                    className="form-input"
                    value={researcherForm.availability}
                    onChange={(event) => handleResearcherChange('availability', event.target.value)}
                    disabled={submitLoading}
                  >
                    <option value="true">Disponivel</option>
                    <option value="false">Indisponivel</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="researcher-password">
                    Senha
                  </label>
                  <input
                    id="researcher-password"
                    type="password"
                    className="form-input"
                    value={researcherForm.password}
                    onChange={(event) => handleResearcherChange('password', event.target.value)}
                    placeholder="Minimo de 8 caracteres"
                    autoComplete="new-password"
                    disabled={submitLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="researcher-password-confirm">
                    Confirmacao da senha
                  </label>
                  <input
                    id="researcher-password-confirm"
                    type="password"
                    className="form-input"
                    value={researcherForm.confirmPassword}
                    onChange={(event) => handleResearcherChange('confirmPassword', event.target.value)}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    disabled={submitLoading}
                  />
                </div>
              </div>

              {universitiesError ? (
                <div className="login-feedback login-feedback--error">
                  <strong>Universidades indisponiveis</strong>
                  <p>{universitiesError}</p>
                </div>
              ) : null}

              {!universitiesLoading && !universitiesError && universities.length === 0 ? (
                <div className="login-feedback">
                  <strong>Nenhuma universidade encontrada</strong>
                  <p>Nenhuma universidade disponivel para selecao.</p>
                </div>
              ) : null}

              {registerMessage ? <p className="login-message">{registerMessage}</p> : null}

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitLoading || universitiesLoading || universities.length === 0}
                >
                  {submitLoading ? 'Salvando...' : 'Cadastrar pesquisador'}
                </button>
              </div>
            </form>
          )}

          <div className="form-footer">
            Ja possui acesso? <a href="/login" onClick={openLoginForm}>Voltar para o login</a>
          </div>
        </div>
      )}
        </main>
      </div>
    </section>
  )
}
