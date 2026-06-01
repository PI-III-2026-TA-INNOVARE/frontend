import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useAuth } from '../../../context/AuthContext'
import { getCompanyDashboard, getResearcherDashboard } from '../../../services/pdConnectApi'
import './AppIndicadoresPage.scss'

const STATUS_LABELS = {
  suggested:    'Sugerido',
  interested:   'Interessado',
  under_review: 'Em análise',
  approved:     'Aprovado',
  rejected:     'Rejeitado',
}

const SOURCE_LABELS = {
  ai:       'Match da IA',
  interest: 'Interesse próprio',
  manual:   'Indicação manual',
}

const SOURCE_COLORS = {
  ai:       '#4a7fc1',
  interest: '#243a69',
  manual:   '#5b88a5',
}

const STATUS_COLORS = {
  suggested:    '#9ca3b0',
  interested:   '#4a7fc1',
  under_review: '#d4921a',
  approved:     '#1a7a48',
  rejected:     '#b94040',
}

function formatScore(value) {
  if (value === null || value === undefined) return '—'
  return `${Math.round(value * 100)}%`
}

function StatCard({ label, value, sub }) {
  return (
    <div className="app-ind-stat">
      <span className="app-ind-stat__value">{value}</span>
      <span className="app-ind-stat__label">{label}</span>
      {sub ? <span className="app-ind-stat__sub">{sub}</span> : null}
    </div>
  )
}

function ToggleChips({ items, active, onToggle }) {
  return (
    <div className="app-ind-chips">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`app-ind-chip${active.has(item.key) ? ' app-ind-chip--active' : ''}`}
          style={active.has(item.key) ? { borderColor: item.color, color: item.color } : {}}
          onClick={() => onToggle(item.key)}
        >
          <span className="app-ind-chip__dot" style={{ background: item.color }} />
          {item.label}
        </button>
      ))}
    </div>
  )
}

function ChartSection({ title, children, chips }) {
  return (
    <section className="app-ind-panel">
      <div className="app-ind-panel__head">
        <h3>{title}</h3>
        {chips}
      </div>
      {children}
    </section>
  )
}

function SourcePieChart({ data }) {
  if (!data || data.length === 0 || data.every((d) => d.count === 0)) {
    return <p className="app-ind-empty">Sem dados para exibir.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={100}
          dataKey="count"
          nameKey="label"
          paddingAngle={3}
        >
          {data.map((entry) => (
            <Cell key={entry.key} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [value, name]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

function StatusBarChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="app-ind-empty">Sem dados para exibir.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
        <Tooltip />
        <Bar dataKey="count" name="Candidatos" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.key} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function useActiveSet(keys) {
  const [active, setActive] = useState(() => new Set(keys))
  const toggle = useCallback((key) => {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])
  return [active, toggle]
}

function ResearcherDashboard({ data }) {
  const total = data.summary.total_candidates || 0

  const allSources = useMemo(() => data.by_source.map((item) => ({
    key: item.source,
    label: SOURCE_LABELS[item.source] || item.source,
    color: SOURCE_COLORS[item.source] || '#888',
    count: item.count,
  })), [data.by_source])

  const allStatuses = useMemo(() => data.by_status.map((item) => ({
    key: item.status,
    label: STATUS_LABELS[item.status] || item.status,
    color: STATUS_COLORS[item.status] || '#888',
    count: item.count,
  })), [data.by_status])

  const [activeSources, toggleSource] = useActiveSet(allSources.map((s) => s.key))
  const [activeStatuses, toggleStatus] = useActiveSet(allStatuses.map((s) => s.key))

  const filteredSources = useMemo(() => allSources.filter((s) => activeSources.has(s.key)), [allSources, activeSources])
  const filteredStatuses = useMemo(() => allStatuses.filter((s) => activeStatuses.has(s.key)), [allStatuses, activeStatuses])

  return (
    <div className="app-ind-content">
      <div className="app-ind-stats-grid">
        <StatCard label="Total de candidaturas" value={total} />
        <StatCard label="Aprovado" value={data.summary.approved_candidates} />
        <StatCard label="Em análise" value={data.summary.under_review_candidates} />
        <StatCard label="Interessado" value={data.summary.interested_candidates} />
      </div>

      <div className="app-ind-charts-grid">
        <ChartSection
          title="Por origem"
          chips={
            <ToggleChips
              items={allSources}
              active={activeSources}
              onToggle={toggleSource}
            />
          }
        >
          <SourcePieChart data={filteredSources} />
        </ChartSection>

        <ChartSection
          title="Por status"
          chips={
            <ToggleChips
              items={allStatuses}
              active={activeStatuses}
              onToggle={toggleStatus}
            />
          }
        >
          <StatusBarChart data={filteredStatuses} />
        </ChartSection>
      </div>

      {data.top_companies?.length > 0 ? (
        <section className="app-ind-panel app-ind-panel--full">
          <h3>Empresas que mais indicaram você</h3>
          <div className="app-ind-table">
            <div className="app-ind-table__head">
              <span>Empresa</span>
              <span>Candidaturas</span>
              <span>Score médio</span>
            </div>
            {data.top_companies.map((row) => (
              <div key={row.company_id} className="app-ind-table__row">
                <span>{row.company_name || 'Empresa não identificada'}</span>
                <span>{row.count}</span>
                <span>{formatScore(row.average_score)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data.top_areas?.length > 0 ? (
        <section className="app-ind-panel app-ind-panel--full">
          <h3>Áreas com mais correspondências</h3>
          <div className="app-ind-table">
            <div className="app-ind-table__head">
              <span>Área</span>
              <span>Candidaturas</span>
              <span>Score médio</span>
            </div>
            {data.top_areas.map((row) => (
              <div key={row.area_id} className="app-ind-table__row">
                <span>{row.area_name || 'Área não identificada'}</span>
                <span>{row.count}</span>
                <span>{formatScore(row.average_score)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

const TABLE_PAGE_SIZE = 5

function normalizeText(v) {
  return (v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function CompanyDashboard({ data }) {
  const researches = useMemo(() => data.researches || [], [data.researches])

  // ── Research selection (drives charts + table) ──────────────────────
  const [activeResearches, setActiveResearches] = useState(
    () => new Set(researches.map((r) => r.research_id))
  )
  const toggleResearch = useCallback((id) => {
    setActiveResearches((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size > 1) next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setTablePage(1)
  }, [])

  // ── Aggregates from selected researches ─────────────────────────────
  const selected = useMemo(
    () => researches.filter((r) => activeResearches.has(r.research_id)),
    [researches, activeResearches]
  )

  const sum = useCallback((key) => selected.reduce((s, r) => s + (r[key] || 0), 0), [selected])

  const computedTotal    = useMemo(() => sum('total_candidates'),    [sum])
  const computedApproved = useMemo(() => sum('approved_candidates'), [sum])
  const computedReview   = useMemo(() => sum('under_review_candidates'), [sum])
  const computedInterest = useMemo(() => sum('interested_candidates'), [sum])

  const allSources = useMemo(() => [
    { key: 'manual',   source: 'manual',   label: SOURCE_LABELS.manual,   color: SOURCE_COLORS.manual,   count: sum('manual_candidates') },
    { key: 'ai',       source: 'ai',       label: SOURCE_LABELS.ai,       color: SOURCE_COLORS.ai,       count: sum('ai_candidates') },
    { key: 'interest', source: 'interest', label: SOURCE_LABELS.interest, color: SOURCE_COLORS.interest, count: sum('interest_candidates') },
  ], [sum])

  const allStatuses = useMemo(() => [
    { key: 'suggested',    status: 'suggested',    label: STATUS_LABELS.suggested,    color: STATUS_COLORS.suggested,    count: sum('suggested_candidates') },
    { key: 'interested',   status: 'interested',   label: STATUS_LABELS.interested,   color: STATUS_COLORS.interested,   count: sum('interested_candidates') },
    { key: 'under_review', status: 'under_review', label: STATUS_LABELS.under_review, color: STATUS_COLORS.under_review, count: sum('under_review_candidates') },
    { key: 'approved',     status: 'approved',     label: STATUS_LABELS.approved,     color: STATUS_COLORS.approved,     count: sum('approved_candidates') },
    { key: 'rejected',     status: 'rejected',     label: STATUS_LABELS.rejected,     color: STATUS_COLORS.rejected,     count: sum('rejected_candidates') },
  ], [sum])

  // ── Chart visibility toggles ─────────────────────────────────────────
  const [activeSources,  toggleSource]  = useActiveSet(allSources.map((s) => s.key))
  const [activeStatuses, toggleStatus]  = useActiveSet(allStatuses.map((s) => s.key))

  const filteredSources  = useMemo(() => allSources.filter((s) => activeSources.has(s.key)),  [allSources,  activeSources])
  const filteredStatuses = useMemo(() => allStatuses.filter((s) => activeStatuses.has(s.key)), [allStatuses, activeStatuses])

  // ── Table: search + pagination ───────────────────────────────────────
  const [tableSearch, setTableSearch] = useState('')
  const [tablePage,   setTablePage]   = useState(1)

  const filteredTable = useMemo(() => {
    const q = normalizeText(tableSearch)
    return selected.filter((r) =>
      !q || normalizeText(r.title).includes(q) || normalizeText(r.area).includes(q)
    )
  }, [selected, tableSearch])

  const totalTablePages = Math.max(1, Math.ceil(filteredTable.length / TABLE_PAGE_SIZE))
  const paginatedTable  = useMemo(
    () => filteredTable.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE),
    [filteredTable, tablePage]
  )

  useEffect(() => {
    setTablePage((p) => Math.min(p, Math.max(1, Math.ceil(filteredTable.length / TABLE_PAGE_SIZE))))
  }, [filteredTable.length])

  // ── Research chips for filtering ─────────────────────────────────────
  const researchChips = useMemo(() => researches.map((r) => ({
    key: r.research_id,
    label: r.title,
    color: 'var(--accent-primary)',
  })), [researches])

  return (
    <div className="app-ind-content">
      <div className="app-ind-stats-grid">
        <StatCard label="Pesquisas selecionadas" value={`${selected.length} / ${researches.length}`} />
        <StatCard label="Total de candidatos" value={computedTotal} />
        <StatCard
          label="Score médio de compatibilidade"
          value={formatScore(data.summary.average_score)}
          sub="média dos candidatos com score"
        />
        <StatCard label="Aprovados" value={computedApproved} />
      </div>

      {/* Research filter chips — sync charts + table */}
      {researches.length > 1 ? (
        <section className="app-ind-panel app-ind-panel--full">
          <div className="app-ind-panel__head">
            <h3>Filtrar por pesquisa</h3>
            <span className="app-ind-chips-hint">Clique para incluir/excluir dos gráficos e tabela</span>
          </div>
          <div className="app-ind-research-chips">
            {researchChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className={`app-ind-chip${activeResearches.has(chip.key) ? ' app-ind-chip--active' : ''}`}
                style={activeResearches.has(chip.key) ? { borderColor: chip.color, color: chip.color } : {}}
                onClick={() => toggleResearch(chip.key)}
              >
                <span className="app-ind-chip__dot" style={{ background: chip.color }} />
                {chip.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="app-ind-charts-grid">
        <ChartSection
          title="Candidatos por origem"
          chips={<ToggleChips items={allSources} active={activeSources} onToggle={toggleSource} />}
        >
          <SourcePieChart data={filteredSources} />
        </ChartSection>

        <ChartSection
          title="Candidatos por status"
          chips={<ToggleChips items={allStatuses} active={activeStatuses} onToggle={toggleStatus} />}
        >
          <StatusBarChart data={filteredStatuses} />
        </ChartSection>
      </div>

      {researches.length > 0 ? (
        <section className="app-ind-panel app-ind-panel--full">
          <div className="app-ind-panel__head">
            <h3>Candidatos por pesquisa</h3>
            <input
              className="app-ind-table-search"
              placeholder="Buscar por nome ou área..."
              value={tableSearch}
              onChange={(e) => { setTableSearch(e.target.value); setTablePage(1) }}
            />
            <span className="app-ind-chips-hint">
              {filteredTable.length} resultado(s)
            </span>
          </div>

          <div className="app-ind-table app-ind-table--wide">
            <div className="app-ind-table__head">
              <span>Pesquisa</span>
              <span>Área</span>
              <span>Total</span>
              <span>IA</span>
              <span>Interesse</span>
              <span>Manual</span>
              <span>Aprovados</span>
              <span>Score médio</span>
            </div>
            {paginatedTable.length > 0 ? paginatedTable.map((row) => (
              <div key={row.research_id} className="app-ind-table__row">
                <span>{row.title}</span>
                <span>{row.area || '—'}</span>
                <span>{row.total_candidates}</span>
                <span>{row.ai_candidates}</span>
                <span>{row.interest_candidates}</span>
                <span>{row.manual_candidates}</span>
                <span>{row.approved_candidates}</span>
                <span>{formatScore(row.average_score)}</span>
              </div>
            )) : (
              <div className="app-ind-table__row app-ind-table__row--empty">
                <span>Nenhuma pesquisa encontrada.</span>
              </div>
            )}
          </div>

          {totalTablePages > 1 ? (
            <div className="app-ind-pagination">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={tablePage === 1}
                onClick={() => setTablePage((p) => p - 1)}
              >
                Anterior
              </button>
              <span className="app-ind-pagination__status">
                Página {tablePage} de {totalTablePages}
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={tablePage === totalTablePages}
                onClick={() => setTablePage((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

export default function AppIndicadoresPage() {
  const { user } = useAuth()
  const isCompany = user?.type === 'empresa'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError('')

    const fetch = isCompany ? getCompanyDashboard : getResearcherDashboard
    fetch()
      .then((result) => { if (isMounted) setData(result) })
      .catch((err) => { if (isMounted) setError(err.message || 'Não foi possível carregar os indicadores.') })
      .finally(() => { if (isMounted) setLoading(false) })

    return () => { isMounted = false }
  }, [isCompany])

  return (
    <section className="app-page app-ind-page">
      <div className="container app-page__container">
        <header className="app-page__header">
          <div>
            <span className="section-label">Painel</span>
            <h1 className="app-page__title">Indicadores</h1>
          </div>
          <p className="app-page__subtitle">
            {isCompany
              ? 'Acompanhe o desempenho das suas pesquisas e candidatos.'
              : 'Acompanhe suas candidaturas e compatibilidade com pesquisas.'}
          </p>
        </header>

        {loading ? (
          <div className="app-ind-loading">
            <span className="app-ind-spinner" />
            <p>Carregando indicadores...</p>
          </div>
        ) : error ? (
          <div className="app-ind-error">
            <h2>Não foi possível carregar</h2>
            <p>{error}</p>
          </div>
        ) : data ? (
          isCompany
            ? <CompanyDashboard data={data} />
            : <ResearcherDashboard data={data} />
        ) : null}
      </div>
    </section>
  )
}
