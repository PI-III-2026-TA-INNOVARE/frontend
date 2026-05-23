import { Route, Routes } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import PublicLayout from './components/PublicLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AuthenticatedLayout from './components/AuthenticatedLayout'
import HomePage from './pages/landing/home'
import SobrePage from './pages/landing/sobre'
import ComoFuncionaPage from './pages/landing/como-funciona'
import IndicadoresPage from './pages/landing/indicadores'
import LoginPage from './pages/auth/login'
import ForgotPasswordPage from './pages/auth/forgot-password'
import ResetPasswordPage from './pages/auth/reset-password'
import SearchPage from './pages/app/search'
import ProfilePage from './pages/app/profile'
import PublishChallengePage from './pages/app/publish-challenge'
import MyInterestsPage from './pages/app/my-interests'

function App() {
  return (
    <>
      <ScrollToTop />

      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/sobre" element={<SobrePage />} />
          <Route path="/como-funciona" element={<ComoFuncionaPage />} />
          <Route path="/indicadores" element={<IndicadoresPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/esqueci-minha-senha" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AuthenticatedLayout />}>
            <Route path="/pesquisa" element={<SearchPage />} />
            <Route path="/app/indicadores" element={<IndicadoresPage />} />
            <Route path="/perfil" element={<ProfilePage />} />

            <Route element={<ProtectedRoute requiredType="pesquisador" />}>
              <Route path="/meus-interesses" element={<MyInterestsPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredType="empresa" />}>
              <Route path="/desafios/novo" element={<PublishChallengePage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  )
}

export default App
