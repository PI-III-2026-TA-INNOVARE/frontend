function formatCurrency(value) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 'orcamento nao informado'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(parsed)
}

function formatDateTime(value) {
  if (!value) {
    return 'prazo nao informado'
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

function formatScore(value) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 'relevancia nao informada'
  }

  return `${Math.round(parsed * 100)}% de relevancia`
}

function readResearchValue(research, detail, keys, fallback) {
  const values = keys.flatMap((key) => [research?.[key], detail?.[key]])
  const value = values.find((item) => item !== null && item !== undefined && item !== '')
  return value ?? fallback
}

export default function ResearchDetailModal({ research, onClose, action = null }) {
  if (!research) {
    return null
  }

  const detail = research.detail || research
  const title = readResearchValue(research, detail, ['title'], 'Pesquisa sem titulo informado')
  const company = readResearchValue(
    research,
    detail,
    ['companyLabel', 'companyName', 'company'],
    'Empresa nao informada'
  )
  const status = readResearchValue(research, detail, ['status'], 'nao informado')
  const budget = readResearchValue(research, detail, ['budget'], null)
  const deadline = readResearchValue(research, detail, ['deadline'], null)
  const area = readResearchValue(research, detail, ['areaLabel', 'areaName', 'area'], 'Area nao informada')
  const relevance = readResearchValue(research, detail, ['score_hybrid'], null)

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
            X
          </button>
        </header>

        <dl className="research-detail-modal__summary">
          <div>
            <dt>Empresa</dt>
            <dd>{company}</dd>
          </div>
          <div>
            <dt>Status do projeto</dt>
            <dd>{status}</dd>
          </div>
          <div>
            <dt>Orcamento</dt>
            <dd>{formatCurrency(budget)}</dd>
          </div>
          <div>
            <dt>Prazo</dt>
            <dd>{formatDateTime(deadline)}</dd>
          </div>
          <div>
            <dt>Area</dt>
            <dd>{area}</dd>
          </div>
          <div>
            <dt>Aderencia</dt>
            <dd>{formatScore(relevance)}</dd>
          </div>
        </dl>

        <div className="research-detail-modal__content">
          <section>
            <h3>Escopo</h3>
            <p>{detail.scope || 'Escopo nao informado.'}</p>
          </section>
          <section>
            <h3>Objetivo</h3>
            <p>{detail.goal || 'Objetivo nao informado.'}</p>
          </section>
          <section>
            <h3>Justificativa</h3>
            <p>{detail.justification || 'Justificativa nao informada.'}</p>
          </section>
          <section>
            <h3>Resultados esperados</h3>
            <p>{detail.results || 'Resultados esperados nao informados.'}</p>
          </section>
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
      </article>
    </div>
  )
}
