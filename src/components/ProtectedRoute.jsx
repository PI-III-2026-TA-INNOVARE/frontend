import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ requiredType = null }) {
  const { isAuthenticated, isBootstrapping, user } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return (
      <section className="route-state">
        <div className="container route-state__container">
          <div className="route-state__loader" role="status" aria-live="polite">
            <span className="route-state__spinner" aria-hidden="true" />
            <span className="sr-only">Carregando area autenticada</span>
          </div>
        </div>
      </section>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requiredType && user?.type !== requiredType) {
    return <Navigate to="/painel" replace />
  }

  return <Outlet />
}
