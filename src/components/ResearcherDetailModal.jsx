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

function getAvailabilityLabel(value) {
  if (value === true) {
    return 'Disponivel'
  }

  if (value === false) {
    return 'Indisponivel'
  }

  return 'Nao informada'
}

function getResumeData(researcher) {
  return researcher?.detail?.resumeData || null
}

function buildPeriodLabel(startDate, endDate) {
  return `${formatDateLabel(startDate, 'Data nao informada')} ate ${formatDateLabel(endDate)}`
}

function EmptyDetail({ title, text }) {
  return (
    <article className="researcher-detail-modal__empty">
      <strong>{title}</strong>
      <span>{text}</span>
    </article>
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
}) {
  if (!researcher) {
    return null
  }

  const resume = getResumeData(researcher)
  const educations = resume?.education || []
  const experiences = resume?.experience || []
  const skills = resume?.skill || []
  const availability = researcher.detail?.availability ?? researcher.availability
  const matchReasons = Array.isArray(researcher.detail?.matchReasons) ? researcher.detail.matchReasons : []
  const matchScoreLabel = formatMatchScore(researcher.detail?.scoreMatch)
  const candidateSource = researcher.detail?.candidateSource || null
  const interestMessage = researcher.detail?.interestMessage || ''

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
              <span className="researcher-availability-badge">
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
            x
          </button>
        </header>

        {candidateSource === 'ai' && (matchReasons.length > 0 || matchScoreLabel) ? (
          <section className="researcher-detail-modal__section researcher-detail-modal__match">
            <div className="researcher-detail-modal__match-head">
              <h3>Por que a IA recomendou</h3>
              {matchScoreLabel && matchScoreLabel !== '0%' ? (
                <span className="researcher-detail-modal__match-score">
                  Compatibilidade: {matchScoreLabel}
                </span>
              ) : null}
            </div>
            {matchReasons.length > 0 ? (
              <div className="researcher-detail-modal__tags">
                {matchReasons.map((reason) => (
                  <span
                    key={`match-${reason}`}
                    className="researcher-detail-modal__match-reason"
                  >
                    {formatMatchReason(reason)}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

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

        <section className="researcher-detail-modal__section">
          <h3>Areas de pesquisa</h3>
          {researcher.tags.length > 0 ? (
            <div className="researcher-detail-modal__tags">
              {researcher.tags.map((tag) => (
                <span key={`${researcher.id}-${tag}`} className="search-result-card__tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p>Nenhuma area de pesquisa informada.</p>
          )}
        </section>

        <section className="researcher-detail-modal__section">
          <h3>Habilidades</h3>
          {skills.length > 0 ? (
            <div className="researcher-detail-modal__tags">
              {skills.map((skill) => (
                <span key={skill.id_skill} className="search-result-card__tag">
                  {skill.description}
                </span>
              ))}
            </div>
          ) : (
            <p>Nenhuma habilidade cadastrada no curriculo.</p>
          )}
        </section>

        <section className="researcher-detail-modal__section">
          <h3>Formacao academica</h3>
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
                title="Nenhuma formacao cadastrada"
                text="Quando o pesquisador completar o curriculo, a empresa vera o historico academico aqui."
              />
            )}
          </div>
        </section>

        <section className="researcher-detail-modal__section">
          <h3>Experiencia profissional</h3>
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
                title="Nenhuma experiencia cadastrada"
                text="Experiencias profissionais adicionadas pelo pesquisador aparecerao neste espaco."
              />
            )}
          </div>
        </section>

        <section className="researcher-detail-modal__section researcher-detail-modal__invite">
          <div>
            <h3>Sugerir participacao</h3>
            <p>
              Selecione uma das pesquisas publicadas pela empresa para indicar este pesquisador.
              O envio da sugestao estara disponivel em breve.
            </p>
          </div>

          <label className="semantic-field">
            <span className="semantic-field__label">Filtrar pesquisas</span>
            <input
              className="semantic-field__control"
              value={projectSearch}
              onChange={onProjectSearchChange}
              placeholder="Filtre por titulo ou area"
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
            disabled
          >
            Sugerir participacao
          </button>
        </section>
      </article>
    </div>
  )
}
