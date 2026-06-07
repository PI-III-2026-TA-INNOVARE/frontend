import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { appIcons } from '../lib/icons'
import {
  getUnreadNotificationsCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/pdConnectApi'

const MATCH_TYPES = new Set(['novo_match', 'match_automatico'])

const TYPE_LABELS = {
  proposta_recebida: 'Proposta',
  status_alterado: 'Status atualizado',
  novo_match: 'Novo match',
  match_automatico: 'Match automático',
  deadline_proximo: 'Prazo próximo',
  feedback_recebido: 'Feedback',
  pesquisa_atualizada: 'Pesquisa atualizada',
  pesquisa_encerrada: 'Pesquisa encerrada',
}

function formatRelativeTime(value) {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}min atrás`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d atrás`
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [viewingNotification, setViewingNotification] = useState(null)
  const navigate = useNavigate()
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)
  const pollRef = useRef(null)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadNotificationsCount()
      setUnreadCount(data?.unread_count ?? 0)
    } catch {
      // silencia erros de polling
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listNotifications()
      setNotifications(Array.isArray(data) ? data : (data?.results ?? []))
      setUnreadCount((prev) => {
        const unread = (Array.isArray(data) ? data : (data?.results ?? [])).filter((n) => !n.is_read).length
        return unread
      })
    } catch {
      // silencia
    } finally {
      setLoading(false)
    }
  }, [])

  // Polling do contador a cada 30s
  useEffect(() => {
    fetchUnreadCount()
    pollRef.current = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(pollRef.current)
  }, [fetchUnreadCount])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) fetchNotifications()
      return !prev
    })
  }, [fetchNotifications])

  const handleMarkAsRead = useCallback(async (id) => {
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // silencia
    }
  }, [])

  const handleMarkAll = useCallback(async () => {
    setMarkingAll(true)
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // silencia
    } finally {
      setMarkingAll(false)
    }
  }, [])

  const handleOpenNotification = useCallback((notif) => {
    if (!notif.is_read) handleMarkAsRead(notif.id)
    setViewingNotification(notif)
  }, [handleMarkAsRead])

  const handleGoToResearch = useCallback((notif) => {
    setViewingNotification(null)
    setOpen(false)
    navigate(`/pesquisas?candidateId=${notif.related_id}`)
  }, [navigate])

  const hasUnread = unreadCount > 0

  return (
    <div className="notif-bell">
      <button
        ref={buttonRef}
        type="button"
        className={`notif-bell__btn${hasUnread ? ' notif-bell__btn--has-unread' : ''}`}
        aria-label={`Notificações${hasUnread ? ` (${unreadCount} não lidas)` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={handleToggle}
      >
        <svg
          className="notif-bell__icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {hasUnread && (
          <span className="notif-bell__badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div ref={dropdownRef} className="notif-dropdown" role="dialog" aria-label="Notificações">
          <div className="notif-dropdown__header">
            <span className="notif-dropdown__title">Notificações</span>
            {hasUnread && (
              <button
                type="button"
                className="notif-dropdown__mark-all"
                onClick={handleMarkAll}
                disabled={markingAll}
              >
                {markingAll ? 'Marcando...' : 'Marcar todas como lidas'}
              </button>
            )}
          </div>

          <div className="notif-dropdown__body">
            {loading ? (
              <div className="notif-dropdown__empty">
                <span className="notif-dropdown__spinner" aria-hidden="true" />
                <span>Carregando...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-dropdown__empty">
                <span className="notif-dropdown__empty-icon" aria-hidden="true">🔔</span>
                <span>Nenhuma notificação</span>
              </div>
            ) : (
              <ul className="notif-list" role="list">
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    className={`notif-item${notif.is_read ? ' notif-item--read' : ''}`}
                  >
                    <div
                      className="notif-item__content notif-item__content--clickable"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpenNotification(notif)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleOpenNotification(notif)
                        }
                      }}
                    >
                      <span className="notif-item__type">
                        {TYPE_LABELS[notif.type] || notif.type}
                      </span>
                      <p className="notif-item__title">{notif.title}</p>
                      <p className="notif-item__message">{notif.message}</p>
                      <span className="notif-item__time">
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>

                    {!notif.is_read && (
                      <button
                        type="button"
                        className="notif-item__read-btn"
                        aria-label="Marcar como lida"
                        title="Marcar como lida"
                        onClick={() => handleMarkAsRead(notif.id)}
                      >
                        <FontAwesomeIcon icon={appIcons.markAsRead} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {viewingNotification && createPortal(
        <div className="notif-modal" role="dialog" aria-modal="true" aria-labelledby="notif-modal-title">
          <button
            type="button"
            className="notif-modal__backdrop"
            aria-label="Fechar notificação"
            onClick={() => setViewingNotification(null)}
          />
          <div className="notif-modal__card">
            <header className="notif-modal__header">
              <span className="notif-item__type">
                {TYPE_LABELS[viewingNotification.type] || viewingNotification.type}
              </span>
              <h2 id="notif-modal-title" className="notif-modal__title">
                {viewingNotification.title}
              </h2>
              <span className="notif-modal__time">
                {formatRelativeTime(viewingNotification.created_at)}
              </span>
            </header>

            <p className="notif-modal__message">{viewingNotification.message}</p>

            <footer className="notif-modal__actions">
              {MATCH_TYPES.has(viewingNotification.type) && viewingNotification.related_id && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleGoToResearch(viewingNotification)}
                >
                  Ver pesquisa
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setViewingNotification(null)}
              >
                Fechar
              </button>
            </footer>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
