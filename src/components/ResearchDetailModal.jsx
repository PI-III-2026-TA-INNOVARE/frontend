import { useState } from 'react'

function formatCurrency(value) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 'orçamento não informado'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(parsed)
}

function formatDateTime(value) {
  if (!value) {
    return 'prazo não informado'
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

function readResearchValue(research, detail, keys, fallback) {
  const values = keys.flatMap((key) => [research?.[key], detail?.[key]])
  const value = values.find((item) => item !== null && item !== undefined && item !== '')
  return value ?? fallback
}

const TABS = [
  { id: 'escopo',       label: 'Escopo',            field: 'scope',         fallback: 'Escopo não informado.' },
  { id: 'objetivo',     label: 'Objetivo',           field: 'goal',          fallback: 'Objetivo não informado.' },
  { id: 'justificativa',label: 'Justificativa',      field: 'justification', fallback: 'Justificativa não informada.' },
  { id: 'resultados',   label: 'Resultados esperados', field: 'results',    fallback: 'Resultados esperados não informados.' },
]

export default function ResearchDetailModal({ research, onClose, action = null, respond = null }) {
  const [activeTab, setActiveTab] = useState('escopo')

  if (!research) {
    return null
  }

  const detail = research.detail || research
  const title = readResearchValue(research, detail, ['title'], 'Pesquisa sem título informado')
  const company = readResearchValue(
    research,
    detail,
    ['companyLabel', 'companyName', 'company'],
    'Empresa não informada'
  )
  const status = readResearchValue(research, detail, ['status'], 'não informado')
  const budget = readResearchValue(research, detail, ['budget'], null)
  const deadline = readResearchValue(research, detail, ['deadline'], null)
  const area = readResearchValue(research, detail, ['areaLabel', 'areaName', 'area'], 'Área não informada')

  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0]

  return (
    <div
      className="research-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="research-detail-title"
    >
      <button
        type="button"
        className="research-detail-modal__backdrop"
        aria-label="Fechar detalhes da pesquisa"
        onClick={onClose}
      />
      <article className="research-detail-modal__card">
        <header className="research-detail-modal__header">
          <div>
            <span className="section-label">Detalhes da pesquisa</span>
            <h2 id="research-detail-title">{title}</h2>
          </div>
          <button
            type="button"
            className="research-detail-modal__close"
            aria-label="Fechar detalhes"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <dl className="research-detail-modal__summary">
          <div>
            <dt>Empresa</dt>
            <dd>{company}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{status}</dd>
          </div>
          <div>
            <dt>Orçamento</dt>
            <dd>{formatCurrency(budget)}</dd>
          </div>
          <div>
            <dt>Prazo</dt>
            <dd>{formatDateTime(deadline)}</dd>
          </div>
          <div>
            <dt>Área</dt>
            <dd>{area}</dd>
          </div>
        </dl>

        <div className="research-detail-modal__tabs-wrap">
          <nav
            className="research-detail-modal__tabs"
            role="tablist"
            aria-label="Seções da pesquisa"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`rdm-panel-${tab.id}`}
                id={`rdm-tab-${tab.id}`}
                className={`research-detail-modal__tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div
            id={`rdm-panel-${currentTab.id}`}
            role="tabpanel"
            aria-labelledby={`rdm-tab-${currentTab.id}`}
            className="research-detail-modal__panel"
          >
            <p>{detail[currentTab.field] || currentTab.fallback}</p>
          </div>
        </div>

        {action ? (
          <footer className="research-detail-modal__actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
            >
              {action.loading ? action.loadingLabel : action.label}
            </button>
          </footer>
        ) : null}

        {respond ? (
          <footer className="research-detail-modal__actions research-detail-modal__actions--respond">
            <p className="research-detail-modal__respond-hint">
              Deseja participar desta pesquisa?
            </p>
            <div className="research-detail-modal__respond-btns">
              <button
                type="button"
                className="btn btn-ghost research-detail-modal__respond-reject"
                onClick={respond.onReject}
                disabled={respond.loading}
              >
                Recusar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={respond.onAccept}
                disabled={respond.loading}
              >
                {respond.loading ? 'Enviando...' : 'Aceitar indicação'}
              </button>
            </div>
          </footer>
        ) : null}
      </article>
    </div>
  )
}
