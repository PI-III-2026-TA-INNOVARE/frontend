export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function formatBooleanLabel(value, labels = {}) {
  const {
    trueLabel = 'Sim',
    falseLabel = 'Não',
    nullLabel = 'Não informado',
  } = labels

  if (value === true) {
    return trueLabel
  }

  if (value === false) {
    return falseLabel
  }

  return nullLabel
}

export function formatDateLabel(value, fallback = 'Em andamento') {
  if (!value) {
    return fallback
  }

  const dateOnlyMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const parsedDate = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('pt-BR').format(parsedDate)
}

export function matchesSearch(value, query) {
  return normalizeText(value).includes(normalizeText(query))
}

export function paginateItems(items, page, pageSize) {
  const startIndex = (page - 1) * pageSize
  return items.slice(startIndex, startIndex + pageSize)
}

export function buildPageLabel(page, totalItems, pageSize) {
  if (!totalItems) {
    return '0 de 0'
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)
  return `${start}–${end} de ${totalItems}`
}
