import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import PageFaq from '../../../components/PageFaq'
import './LoginPage.scss'

const loginFaqSections = [
  {
    title: 'Como o acesso funciona agora',
    text: 'O login usa JWT real em /api/auth/token/ e a sessao autenticada e hidratada por /api/auth/profile/.',
  },
  {
    title: 'O que o front valida apenas para UX',
    items: [
      'Campos visiveis obrigatorios',
      'Formato basico de e-mail',
      'Senha minima de 8 caracteres',
      'Confirmacao de senha no cadastro de empresa',
      'Formato basico do CNPJ com 14 digitos',
    ],
  },
  {
    title: 'O que continua sendo validacao real do backend',
    items: [
      'Credenciais validas',
      'Unicidade de e-mail',
      'E-mail institucional para pesquisador',
      'Dependencias de university e resume',
      'Permissoes e integridade do perfil autenticado',
    ],
  },
]

const defaultLoginForm = {
  email: '',
  password: '',
}

const defaultCompanyForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  cnpj: '',
}

function getReturnPath(pathname) {
  return typeof pathname === 'string' && pathname.trim() ? pathname : '/pesquisa'
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

function validateLoginForm(form) {
  if (!form.email.trim() || !form.password) {
    return 'Informe e-mail e senha para continuar.'
  }

  return ''
}

function validateCompanyForm(form) {
  if (!form.name.trim()) {
    return 'Informe o nome da empresa.'
  }

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

  if (normalizeCnpjDigits(form.cnpj).length !== 14) {
    return 'Informe um CNPJ com 14 digitos.'
  }

  return ''
}

export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    authError,
    authMode,
    isAuthenticated,
    registerCompany,
    researcherRegistrationLimitation,
    signInWithCredentials,
  } = useAuth()

  const [isRegister, setIsRegister] = useState(false)
  const [regTab, setRegTab] = useState('empresa')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [loginMessage, setLoginMessage] = useState('')
  const [registerMessage, setRegisterMessage] = useState('')
  const [isFaqOpen, setIsFaqOpen] = useState(false)
  const [loginForm, setLoginForm] = useState(defaultLoginForm)
  const [companyForm, setCompanyForm] = useState(defaultCompanyForm)

  useEffect(() => {
    setIsRegister(location.hash === '#cadastro')
  }, [location.hash])

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getReturnPath(location.state?.from), { replace: true })
    }
  }, [isAuthenticated, location.state, navigate])

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

  const handleCompanyChange = (field, value) => {
    setCompanyForm((current) => ({
      ...current,
      [field]: field === 'cnpj' ? formatCnpj(value) : value,
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

    const validationMessage = validateCompanyForm(companyForm)
    if (validationMessage) {
      setRegisterMessage(validationMessage)
      return
    }

    setSubmitLoading(true)
    setRegisterMessage('')

    const result = await registerCompany({
      name: companyForm.name,
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

  return (
    <section className="login-page">
      <div className="login-page__bg">
        <div className="login-page__bg-orb login-page__bg-orb--1"></div>
        <div className="login-page__bg-orb login-page__bg-orb--2"></div>
      </div>

      {!isRegister && (
        <div className="login-box login-box--wide" id="loginBox">
          <div className="login-box__header">
            <h1 className="login-box__title">Acesso autenticado com JWT real</h1>
            <p className="login-box__subtitle">
              Use suas credenciais reais para entrar. O front passou a depender da autenticacao e
              do perfil retornado pela API.
            </p>
            <button
              type="button"
              className="btn btn-outline page-faq-trigger login-box__faq-trigger"
              onClick={() => setIsFaqOpen(true)}
            >
              FAQ da pagina
            </button>
          </div>

          <div className="login-demo">
            <article className="login-demo__card">
              <span className="login-demo__eyebrow">Sessao real</span>
              <h2 className="login-demo__title">JWT + profile</h2>
              <p className="login-demo__credentials">
                O login usa access e refresh token, e a area autenticada e hidratada a partir de
                /api/auth/profile/.
              </p>
            </article>

            <article className="login-demo__card">
              <span className="login-demo__eyebrow">Validacao conservadora</span>
              <h2 className="login-demo__title">UX no front</h2>
              <p className="login-demo__credentials">
                O client valida apenas o basico de experiencia e deixa a validacao real de negocio
                para a API.
              </p>
            </article>
          </div>

          <div className="login-note">
            <strong>Contrato atual</strong>
            <p>{authMode}</p>
          </div>

          {authError ? (
            <div className="login-feedback login-feedback--error">
              <strong>Sessao anterior encerrada</strong>
              <p>{authError}</p>
            </div>
          ) : null}

          <form onSubmit={handleLoginSubmit}>
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

            <p className="login-inline-help">
              O backend valida as credenciais e libera o acesso aos endpoints protegidos. O front
              apenas orienta o preenchimento e apresenta as mensagens retornadas pela API.
            </p>

            {loginMessage ? <p className="login-message">{loginMessage}</p> : null}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                {submitLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>

          <div className="form-divider">ou</div>

          <div className="form-footer">
            Ainda nao possui acesso? <a href="/login#cadastro" onClick={openRegisterForm}>Cadastrar empresa</a>
          </div>
        </div>
      )}

      {isRegister && (
        <div className="login-box login-box--wide" id="registerBox">
          <div className="login-box__header">
            <h1 className="login-box__title">Cadastro conforme o contrato atual</h1>
            <p className="login-box__subtitle">
              O front envia apenas o que o backend realmente pede e evita simular dependencias que a
              API nao resolve de forma publica.
            </p>
            <button
              type="button"
              className="btn btn-outline page-faq-trigger login-box__faq-trigger"
              onClick={() => setIsFaqOpen(true)}
            >
              FAQ da pagina
            </button>
          </div>

          <div className="login-tabs">
            <div
              className={`login-tab${regTab === 'empresa' ? ' active' : ''}`}
              onClick={() => setRegTab('empresa')}
            >
              Empresa
            </div>
            <div
              className={`login-tab${regTab === 'pesquisador' ? ' active' : ''}`}
              onClick={() => setRegTab('pesquisador')}
            >
              Pesquisador
            </div>
          </div>

          {regTab === 'empresa' ? (
            <form onSubmit={handleRegisterSubmit} className="login-register-preview">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="company-name">
                    Nome da empresa
                  </label>
                  <input
                    id="company-name"
                    className="form-input"
                    value={companyForm.name}
                    onChange={(event) => handleCompanyChange('name', event.target.value)}
                    placeholder="Ex.: EcoMove Mobility"
                    disabled={submitLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="company-cnpj">
                    CNPJ
                  </label>
                  <input
                    id="company-cnpj"
                    className="form-input"
                    value={companyForm.cnpj}
                    onChange={(event) => handleCompanyChange('cnpj', event.target.value)}
                    placeholder="00.000.000/0000-00"
                    disabled={submitLoading}
                  />
                </div>
              </div>

              <div className="form-row">
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
              </div>

              <div className="form-group">
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

              <p className="login-inline-help">
                Neste cadastro publico o front envia apenas nome, e-mail, senha, tipo e CNPJ. A API
                fica responsavel pela validacao real e pela criacao do usuario da empresa.
              </p>

              {registerMessage ? <p className="login-message">{registerMessage}</p> : null}

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Salvando...' : 'Cadastrar empresa'}
                </button>
              </div>
            </form>
          ) : (
            <div className="login-feedback">
              <strong>Cadastro publico de pesquisador indisponivel</strong>
              <p>{researcherRegistrationLimitation}</p>
              <button type="button" className="btn btn-ghost" onClick={openLoginForm}>
                Voltar para o acesso
              </button>
            </div>
          )}

          <div className="form-footer">
            Ja possui acesso? <a href="/login" onClick={openLoginForm}>Voltar para o login</a>
          </div>
        </div>
      )}

      <PageFaq
        isOpen={isFaqOpen}
        onClose={() => setIsFaqOpen(false)}
        title="Acesso e cadastro"
        intro={authMode}
        sections={loginFaqSections}
      />
    </section>
  )
}
