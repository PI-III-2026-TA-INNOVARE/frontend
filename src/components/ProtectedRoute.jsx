import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ requiredType = null }) {
  const { isAuthenticated, isBootstrapping, user } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return (
      <section className="route-state">
        <div className="container route-state__container">
          <div className="route-state__card">
            <span className="section-label">Sessao</span>
            <h1 className="route-state__title">Restaurando acesso</h1>
            <p className="route-state__text">Preparando sua area autenticada.</p>
          </div>
        </div>
      </section>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requiredType && user?.type !== requiredType) {
    return <Navigate to="/pesquisa" replace />
  }

  return <Outlet />
}
