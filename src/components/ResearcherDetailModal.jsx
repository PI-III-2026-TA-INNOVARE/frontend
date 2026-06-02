import { formatDateLabel } from '../lib/domain'

const MATCH_REASON_LABELS = {
  alta_similaridade_semantica: 'Alta similaridade semântica',
  similaridade_semantica_moderada: 'Similaridade moderada',
  boa_aderencia_textual: 'Boa aderência textual',
  mesma_area_de_pesquisa: 'Mesma área de pesquisa',
  disponibilidade_compativel: 'Disponibilidade compatível',
}

function formatMatchReason(reason) {
  if (!reason) return ''
  return MATCH_REASON_LABELS[reason] || reason.replace(/_/g, ' ')
}

function formatMatchScore(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return `${Math.round(parsed * 100)}%`
}

function formatRelevanceScore(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed * 100)
}

function getAvailabilityLabel(value) {
  if (value === true) return 'Disponível'
  if (value === false) return 'Indisponível'
  return 'Não informada'
}

function getResumeData(researcher) {
  return researcher?.detail?.resumeData || null
}

function buildPeriodLabel(startDate, endDate) {
  return `${formatDateLabel(startDate, 'Data não informada')} até ${formatDateLabel(endDate)}`
}

function EmptyDetail({ title, text }) {
  return (
    <article className="researcher-detail-modal__empty">
      <strong>{title}</strong>
      <span>{text}</span>
    </article>
  )
}

function RelevanceBar({ score }) {
  const pct = Math.min(100, Math.max(0, score))
  const color = pct >= 70 ? 'var(--accent-primary)' : pct >= 45 ? '#e09c20' : '#b94040'
  return (
    <div className="researcher-detail-modal__relevance-bar-wrap">
      <div className="researcher-detail-modal__relevance-bar-track">
        <div
          className="researcher-detail-modal__relevance-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="researcher-detail-modal__relevance-pct" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
}

export default function ResearcherDetailModal({
  researcher,
  onClose,
  companyResearches = [],
  projectGroups = [],
  projectSearch = '',
  onProjectSearchChange,
  selectedProjectId = '',
  onSelectedProjectChange,
  onSuggest,
  suggestLoading = false,
  suggestMessage = '',
  suggestError = '',
  hideSuggest = false,
}) {
  if (!researcher) return null

  const resume = getResumeData(researcher)
  const educations = resume?.education || []
  const experiences = resume?.experience || []
  const skills = resume?.skill || []
  const availability = researcher.detail?.availability ?? researcher.availability
  const matchReasons = Array.isArray(researcher.detail?.matchReasons) ? researcher.detail.matchReasons : []
  const matchScoreLabel = formatMatchScore(researcher.detail?.scoreMatch)
  const llmReason = researcher.detail?.llmReason || researcher.detail?.score_features?.llm_reason || null
  const candidateSource = researcher.detail?.candidateSource || null
  const interestMessage = researcher.detail?.interestMessage || ''
  const scoreHybrid = formatRelevanceScore(researcher.detail?.scoreHybrid ?? researcher.scoreHybrid)
  const scoreSemantic = formatRelevanceScore(researcher.detail?.scoreSemantic ?? researcher.scoreSemantic)

  const canSuggest = Boolean(selectedProjectId) && !suggestLoading && !suggestMessage
  const researcherId = researcher.researcherId ?? null

  return (
    <div
      className="researcher-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="researcher-detail-title"
    >
      <button
        type="button"
        className="researcher-detail-modal__backdrop"
        aria-label="Fechar detalhes do pesquisador"
        onClick={onClose}
      />
      <article className="researcher-detail-modal__card">
        <header className="researcher-detail-modal__header">
          <div>
            <span className="section-label">Detalhes do pesquisador</span>
            <div className="researcher-detail-modal__title-row">
              <h2 id="researcher-detail-title">{researcher.title}</h2>
              <span className={`researcher-availability-badge researcher-availability-badge--${availability === true ? 'available' : availability === false ? 'unavailable' : 'unknown'}`}>
                {getAvailabilityLabel(availability)}
              </span>
            </div>
            <p>{researcher.subtitle}</p>
          </div>
          <button
            type="button"
            className="researcher-detail-modal__close"
            aria-label="Fechar detalhes"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {/* Score de relevância semântica da busca */}
        {(scoreHybrid !== null || scoreSemantic !== null) ? (
          <section className="researcher-detail-modal__section researcher-detail-modal__scores">
            <h3>Relevância para a busca</h3>
            <div className="researcher-detail-modal__scores-grid">
              {scoreHybrid !== null ? (
                <div className="researcher-detail-modal__score-item">
                  <span className="researcher-detail-modal__score-label">Score geral</span>
                  <RelevanceBar score={scoreHybrid} />
                </div>
              ) : null}
              {scoreSemantic !== null ? (
                <div className="researcher-detail-modal__score-item">
                  <span className="researcher-detail-modal__score-label">Semântica</span>
                  <RelevanceBar score={scoreSemantic} />
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Match por IA */}
        {candidateSource === 'ai' && (llmReason || matchReasons.length > 0 || matchScoreLabel) ? (
          <section className="researcher-detail-modal__section researcher-detail-modal__match">
            <div className="researcher-detail-modal__match-head">
              <h3>Por que a IA recomendou</h3>
              {matchScoreLabel && matchScoreLabel !== '0%' ? (
                <span className="researcher-detail-modal__match-score">
                  Compatibilidade: {matchScoreLabel}
                </span>
              ) : null}
            </div>
            {llmReason ? (
              <p className="researcher-detail-modal__llm-reason">{llmReason}</p>
            ) : matchReasons.length > 0 ? (
              <div className="researcher-detail-modal__tags">
                {matchReasons.map((reason) => (
                  <span key={`match-${reason}`} className="researcher-detail-modal__match-reason">
                    {formatMatchReason(reason)}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Interesse do pesquisador */}
        {candidateSource === 'interest' ? (
          <section className="researcher-detail-modal__section researcher-detail-modal__match researcher-detail-modal__match--interest">
            <div className="researcher-detail-modal__match-head">
              <h3>Pesquisador se interessou pela pesquisa</h3>
            </div>
            {interestMessage ? (
              <p className="researcher-detail-modal__match-message">
                <strong>Mensagem do pesquisador:</strong> {interestMessage}
              </p>
            ) : (
              <p className="researcher-detail-modal__match-message">
                O pesquisador manifestou interesse em participar e aguarda retorno da empresa.
              </p>
            )}
          </section>
        ) : null}

        {/* Indicação manual */}
        {candidateSource === 'manual' ? (
          <section className="researcher-detail-modal__section researcher-detail-modal__match researcher-detail-modal__match--manual">
            <div className="researcher-detail-modal__match-head">
              <h3>Indicação manual</h3>
            </div>
            <p className="researcher-detail-modal__match-message">
              Este pesquisador foi indicado manualmente pela empresa.
            </p>
          </section>
        ) : null}

        {/* Visão geral — stats rápidos */}
        <section className="researcher-detail-modal__section researcher-detail-modal__overview">
          <h3>Visão geral</h3>
          <div className="researcher-detail-modal__overview-grid">
            <div className="researcher-detail-modal__overview-item">
              <span className="researcher-detail-modal__overview-value">{educations.length}</span>
              <span className="researcher-detail-modal__overview-label">Formações</span>
            </div>
            <div className="researcher-detail-modal__overview-item">
              <span className="researcher-detail-modal__overview-value">{experiences.length}</span>
              <span className="researcher-detail-modal__overview-label">Experiências</span>
            </div>
            <div className="researcher-detail-modal__overview-item">
              <span className="researcher-detail-modal__overview-value">{skills.length}</span>
              <span className="researcher-detail-modal__overview-label">Habilidades</span>
            </div>
            <div className="researcher-detail-modal__overview-item">
              <span className="researcher-detail-modal__overview-value">{researcher.tags.length}</span>
              <span className="researcher-detail-modal__overview-label">Áreas</span>
            </div>
          </div>
        </section>

        {/* Áreas de pesquisa */}
        <section className="researcher-detail-modal__section">
          <h3>Áreas de pesquisa</h3>
          {researcher.tags.length > 0 ? (
            <div className="researcher-detail-modal__tags">
              {researcher.tags.map((tag) => (
                <span key={`${researcher.id}-${tag}`} className="search-result-card__tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p>Nenhuma área de pesquisa informada.</p>
          )}
        </section>

        {/* Habilidades */}
        <section className="researcher-detail-modal__section">
          <h3>Habilidades</h3>
          {skills.length > 0 ? (
            <div className="researcher-detail-modal__tags">
              {skills.map((skill) => (
                <span key={skill.id_skill} className="search-result-card__tag researcher-detail-modal__skill-tag">
                  {skill.description}
                </span>
              ))}
            </div>
          ) : (
            <p>Nenhuma habilidade cadastrada no currículo.</p>
          )}
        </section>

        {/* Formação acadêmica */}
        <section className="researcher-detail-modal__section">
          <h3>Formação acadêmica</h3>
          <div className="researcher-detail-modal__timeline">
            {educations.length > 0 ? (
              educations.map((education) => (
                <article key={education.id_education} className="researcher-detail-modal__timeline-item">
                  <strong>{education.course}</strong>
                  <span>{education.institution}</span>
                  <small>{buildPeriodLabel(education.start_date, education.end_date)}</small>
                </article>
              ))
            ) : (
              <EmptyDetail
                title="Nenhuma formação cadastrada"
                text="Quando o pesquisador completar o currículo, a empresa verá o histórico acadêmico aqui."
              />
            )}
          </div>
        </section>

        {/* Experiência profissional */}
        <section className="researcher-detail-modal__section">
          <h3>Experiência profissional</h3>
          <div className="researcher-detail-modal__timeline">
            {experiences.length > 0 ? (
              experiences.map((experience) => (
                <article key={experience.id_experience} className="researcher-detail-modal__timeline-item">
                  <strong>{experience.description}</strong>
                  <small>{buildPeriodLabel(experience.start_date, experience.end_date)}</small>
                </article>
              ))
            ) : (
              <EmptyDetail
                title="Nenhuma experiência cadastrada"
                text="Experiências profissionais adicionadas pelo pesquisador aparecerão neste espaço."
              />
            )}
          </div>
        </section>

        {/* Sugerir participação — oculto quando acessado de lista de candidatos existentes */}
        {!hideSuggest ? (
        <section className="researcher-detail-modal__section researcher-detail-modal__invite">
          <div>
            <h3>Sugerir participação</h3>
            <p>
              Selecione uma das suas pesquisas publicadas para indicar este pesquisador como candidato.
            </p>
          </div>

          {suggestMessage ? (
            <div className="researcher-detail-modal__suggest-feedback researcher-detail-modal__suggest-feedback--success">
              {suggestMessage}
            </div>
          ) : null}

          {suggestError ? (
            <div className="researcher-detail-modal__suggest-feedback researcher-detail-modal__suggest-feedback--error">
              {suggestError}
            </div>
          ) : null}

          {!suggestMessage ? (
            <>
              <label className="semantic-field">
                <span className="semantic-field__label">Filtrar pesquisas</span>
                <input
                  className="semantic-field__control"
                  value={projectSearch}
                  onChange={onProjectSearchChange}
                  placeholder="Filtre por título ou área"
                />
              </label>

              <label className="semantic-field">
                <span className="semantic-field__label">Pesquisa da empresa</span>
                <select
                  className="semantic-field__control"
                  value={selectedProjectId}
                  onChange={onSelectedProjectChange}
                >
                  <option value="">
                    {companyResearches.length > 0
                      ? 'Selecione uma pesquisa'
                      : 'Nenhuma pesquisa publicada ainda'}
                  </option>
                  {projectGroups.map((group) => (
                    <optgroup key={group.areaName} label={group.areaName}>
                      {group.items.map((research) => (
                        <option key={research.id_research} value={research.id_research}>
                          {research.title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="btn btn-primary researcher-detail-modal__button"
                disabled={!canSuggest}
                onClick={() => onSuggest && onSuggest(selectedProjectId, researcherId)}
              >
                {suggestLoading ? 'Enviando...' : 'Sugerir participação'}
              </button>
            </>
          ) : null}
        </section>
        ) : null}
      </article>
    </div>
  )
}
