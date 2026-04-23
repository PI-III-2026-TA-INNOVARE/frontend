import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearApiAuthSession,
  configureApiAuth,
  getApiAuthSession,
  setApiAuthSession,
} from '../lib/api'
import {
  getAuthenticatedProfile,
  getResearcherResume,
  getUniversity,
  registerUser,
  requestAuthToken,
} from '../services/pdConnectApi'

const STORAGE_KEY = 'pdconnect-auth-session-v2'
const RESEARCHER_PUBLIC_REGISTER_LIMITATION =
  'O backend atual exige university e resume preexistentes para cadastrar pesquisador em /api/auth/register/, mas essas dependencias seguem protegidas por JWT. O front nao vai simular esse fluxo.'

const AuthContext = createContext(null)

function normalizeStoredSession(session) {
  if (!session) {
    return null
  }

  const accessToken = session.accessToken?.trim() || ''
  const refreshToken = session.refreshToken?.trim() || ''

  if (!accessToken && !refreshToken) {
    return null
  }

  return {
    accessToken,
    refreshToken,
  }
}

function readStoredSession() {
  try {
    const rawSession = window.localStorage.getItem(STORAGE_KEY)
    return rawSession ? normalizeStoredSession(JSON.parse(rawSession)) : null
  } catch {
    return null
  }
}

function persistSession(session) {
  const normalizedSession = normalizeStoredSession(session)

  if (!normalizedSession) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSession))
}

function clearStoredSession() {
  window.localStorage.removeItem(STORAGE_KEY)
}

function translateApiMessage(message) {
  if (!message) {
    return ''
  }

  if (message.includes('No active account found with the given credentials')) {
    return 'E-mail ou senha invalidos.'
  }

  if (message.includes('token_not_valid')) {
    return 'Sua sessao expirou. Faca login novamente.'
  }

  return message
}

function buildFriendlyErrorMessage(error, fallback) {
  if (!error?.message) {
    return fallback
  }

  return translateApiMessage(error.message) || fallback
}

function buildCompanyUser(profilePayload) {
  const company = profilePayload?.empresa

  if (!company) {
    throw new Error('O perfil autenticado nao retornou os dados da empresa vinculada.')
  }

  return {
    idUser: profilePayload.id_user,
    email: profilePayload.email,
    userTypeId: profilePayload.id_tipo,
    userTypeLabel: profilePayload.tipo,
    type: 'empresa',
    profileId: company.id_company,
    displayName: company.name || profilePayload.email,
    company,
    researcher: null,
    university: null,
    resume: null,
  }
}

function buildResearcherUser(profilePayload, university = null, resume = null) {
  const researcher = profilePayload?.pesquisador

  if (!researcher) {
    throw new Error('O perfil autenticado nao retornou os dados do pesquisador vinculado.')
  }

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
    university,
    resume,
  }
}

async function fetchHydratedUser() {
  const profilePayload = await getAuthenticatedProfile()

  if (profilePayload?.empresa) {
    return buildCompanyUser(profilePayload)
  }

  if (profilePayload?.pesquisador) {
    const researcher = profilePayload.pesquisador
    const [universityResult, resumeResult] = await Promise.allSettled([
      researcher.university ? getUniversity(researcher.university) : Promise.resolve(null),
      researcher.id_researcher ? getResearcherResume(researcher.id_researcher) : Promise.resolve(null),
    ])

    return buildResearcherUser(
      profilePayload,
      universityResult.status === 'fulfilled' ? universityResult.value : null,
      resumeResult.status === 'fulfilled' ? resumeResult.value : null
    )
  }

  throw new Error('A API autenticada nao retornou um perfil de empresa nem de pesquisador.')
}

function clearRuntimeAuth() {
  clearApiAuthSession()
  clearStoredSession()
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [authError, setAuthError] = useState('')

  const clearAuthState = (message = '') => {
    setUser(null)
    setSession(null)
    setAuthError(message)
    clearRuntimeAuth()
  }

  const hydrateSession = async (nextSession, { persist = true } = {}) => {
    const normalizedSession = normalizeStoredSession(nextSession)

    if (!normalizedSession) {
      clearAuthState('')
      setIsBootstrapping(false)
      return {
        ok: false,
        message: 'Sessao autenticada invalida. Faca login novamente.',
      }
    }

    setIsBootstrapping(true)
    setAuthError('')
    setApiAuthSession(normalizedSession)

    try {
      const nextUser = await fetchHydratedUser()
      const resolvedSession = normalizeStoredSession(getApiAuthSession()) || normalizedSession

      setSession(resolvedSession)
      setUser(nextUser)

      if (persist) {
        persistSession(resolvedSession)
      }

      return { ok: true, user: nextUser }
    } catch (error) {
      const message = buildFriendlyErrorMessage(
        error,
        'Nao foi possivel restaurar a sessao autenticada com os dados atuais da API.'
      )

      clearAuthState(message)
      return { ok: false, message }
    } finally {
      setIsBootstrapping(false)
    }
  }

  useEffect(() => {
    configureApiAuth({
      onUnauthorized: () => {
        clearAuthState('Sua sessao expirou. Faca login novamente.')
        setIsBootstrapping(false)
      },
      onSessionRefresh: (nextSession) => {
        const normalizedSession = normalizeStoredSession(nextSession)

        if (!normalizedSession) {
          return
        }

        setSession(normalizedSession)
        persistSession(normalizedSession)
      },
    })

    const storedSession = readStoredSession()

    if (!storedSession) {
      setIsBootstrapping(false)
      return () => {
        configureApiAuth()
      }
    }

    setSession(storedSession)
    hydrateSession(storedSession, { persist: false })

    return () => {
      configureApiAuth()
    }
  }, [])

  const signInWithCredentials = async ({ email, password }) => {
    try {
      const tokenPayload = await requestAuthToken({
        email: email.trim(),
        password,
      })

      return hydrateSession({
        accessToken: tokenPayload?.access || '',
        refreshToken: tokenPayload?.refresh || '',
      })
    } catch (error) {
      return {
        ok: false,
        message: buildFriendlyErrorMessage(
          error,
          'Nao foi possivel autenticar com as credenciais informadas.'
        ),
      }
    }
  }

  const registerCompany = async ({ name, email, password, cnpj }) => {
    try {
      await registerUser({
        email: email.trim(),
        password,
        id_tipo: 'empresa',
        name: name.trim(),
        cnpj,
      })

      const loginResult = await signInWithCredentials({
        email,
        password,
      })

      if (loginResult.ok) {
        return loginResult
      }

      return {
        ok: false,
        registered: true,
        email: email.trim(),
        message:
          'Empresa cadastrada com sucesso, mas o login automatico falhou. Entre com as credenciais criadas.',
      }
    } catch (error) {
      return {
        ok: false,
        message: buildFriendlyErrorMessage(
          error,
          'Nao foi possivel cadastrar a empresa com os dados informados.'
        ),
      }
    }
  }

  const registerResearcher = async () => ({
    ok: false,
    message: RESEARCHER_PUBLIC_REGISTER_LIMITATION,
  })

  const refreshUser = async () => {
    if (!session) {
      return {
        ok: false,
        message: 'Nao existe sessao autenticada ativa para atualizar.',
      }
    }

    return hydrateSession(session)
  }

  const logout = () => {
    clearAuthState('')
    setIsBootstrapping(false)
  }

  const value = useMemo(() => ({
    user,
    session,
    isAuthenticated: Boolean(user),
    isBootstrapping,
    authError,
    authMode:
      'A area autenticada agora usa JWT real via /api/auth/token/ e hidrata o usuario por /api/auth/profile/.',
    researcherRegistrationLimitation: RESEARCHER_PUBLIC_REGISTER_LIMITATION,
    signInWithCredentials,
    registerCompany,
    registerResearcher,
    refreshUser,
    logout,
  }), [
    authError,
    isBootstrapping,
    logout,
    refreshUser,
    registerCompany,
    registerResearcher,
    session,
    signInWithCredentials,
    user,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
