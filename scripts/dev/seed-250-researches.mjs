const DEFAULT_BASE_URL = 'http://127.0.0.1:8000/api'
const DEFAULT_COMPANY_EMAIL = 'pdconnect.seed.empresa@teste.com'
const DEFAULT_COMPANY_PASSWORD = 'minimo8caracteres'
const TARGET_TOTAL = 250

const baseUrl = normalizeBaseUrl(process.env.BASE_URL || DEFAULT_BASE_URL)
const providedToken = process.env.TOKEN?.trim() || ''
const companyEmail = process.env.COMPANY_EMAIL?.trim() || DEFAULT_COMPANY_EMAIL
const companyPassword = process.env.COMPANY_PASSWORD || DEFAULT_COMPANY_PASSWORD

const areaProfiles = {
  'agronegocio e agricultura de precisao': {
    domain: 'agricultura de precisao',
    assets: ['sensores de solo', 'imagens de drones', 'telemetria de maquinas', 'dados climaticos'],
    methods: ['modelagem preditiva', 'sensoriamento remoto', 'analise geoespacial', 'otimizacao de manejo'],
    benefits: ['aumentar produtividade', 'reduzir desperdicio de insumos', 'antecipar estresse hidrico', 'melhorar rastreabilidade rural'],
  },
  'arquitetura e urbanismo': {
    domain: 'planejamento urbano',
    assets: ['modelos BIM', 'mapas urbanos', 'fluxos de pedestres', 'dados de conforto ambiental'],
    methods: ['simulacao urbana', 'analise de desempenho ambiental', 'prototipacao parametrica', 'diagnostico territorial'],
    benefits: ['melhorar uso do espaco', 'reduzir ilhas de calor', 'qualificar mobilidade local', 'apoiar decisoes de retrofit'],
  },
  bioinformatica: {
    domain: 'bioinformatica aplicada',
    assets: ['sequencias genomicas', 'dados omicos', 'bases clinicas anonimizadas', 'marcadores moleculares'],
    methods: ['analise de variantes', 'aprendizado de maquina', 'integracao multiomica', 'curadoria computacional'],
    benefits: ['identificar biomarcadores', 'acelerar triagem biologica', 'melhorar classificacao de amostras', 'apoiar medicina personalizada'],
  },
  biotecnologia: {
    domain: 'bioprocessos e bioinsumos',
    assets: ['culturas microbianas', 'residuos organicos', 'ensaios de bancada', 'parametros de fermentacao'],
    methods: ['otimizacao de fermentacao', 'analise microbiologica', 'escalonamento de processo', 'controle de qualidade biologico'],
    benefits: ['gerar produtos sustentaveis', 'reduzir descarte industrial', 'aumentar rendimento biologico', 'criar rotas de bioeconomia'],
  },
  'ciencia de dados': {
    domain: 'analise avancada de dados',
    assets: ['bases historicas', 'eventos transacionais', 'series temporais', 'dados operacionais'],
    methods: ['modelagem estatistica', 'aprendizado supervisionado', 'deteccao de anomalias', 'engenharia de atributos'],
    benefits: ['melhorar previsoes', 'apoiar decisao gerencial', 'reduzir riscos operacionais', 'identificar oportunidades ocultas'],
  },
  'ciencias ambientais': {
    domain: 'gestao ambiental',
    assets: ['indicadores ambientais', 'amostras de campo', 'imagens orbitais', 'inventarios de emissao'],
    methods: ['modelagem ambiental', 'analise de impacto', 'monitoramento remoto', 'avaliacao de ciclo de vida'],
    benefits: ['reduzir impacto ambiental', 'melhorar conformidade', 'priorizar acoes de mitigacao', 'apoiar relatorios ESG'],
  },
  'computacao em nuvem': {
    domain: 'arquiteturas em nuvem',
    assets: ['logs de aplicacoes', 'custos de infraestrutura', 'pipelines de dados', 'ambientes distribuidos'],
    methods: ['observabilidade', 'otimizacao de custos', 'modernizacao de arquitetura', 'automacao de infraestrutura'],
    benefits: ['aumentar escalabilidade', 'reduzir custo operacional', 'melhorar resiliencia', 'acelerar deploys seguros'],
  },
  'direito e tecnologia': {
    domain: 'governanca digital',
    assets: ['contratos digitais', 'politicas internas', 'bases reguladoras', 'fluxos de consentimento'],
    methods: ['analise regulatoria', 'auditoria algoritimica', 'mapeamento de riscos juridicos', 'privacidade por desenho'],
    benefits: ['reduzir risco regulatorio', 'melhorar compliance', 'aumentar transparencia', 'proteger dados sensiveis'],
  },
  'educacao e tecnologias educacionais': {
    domain: 'aprendizagem digital',
    assets: ['trilhas de aprendizagem', 'interacoes em plataformas', 'avaliacoes diagnosticas', 'conteudos educacionais'],
    methods: ['analise de aprendizagem', 'personalizacao adaptativa', 'design instrucional', 'avaliacao de engajamento'],
    benefits: ['aumentar retencao', 'personalizar ensino', 'identificar lacunas de aprendizagem', 'melhorar formacao continuada'],
  },
  'energias renovaveis': {
    domain: 'energia renovavel',
    assets: ['dados de geracao solar', 'dados eolicos', 'perfil de consumo', 'medicoes meteorologicas'],
    methods: ['previsao energetica', 'simulacao de microredes', 'otimizacao de armazenamento', 'analise de viabilidade'],
    benefits: ['reduzir custo energetico', 'aumentar uso de energia limpa', 'melhorar confiabilidade', 'apoiar descarbonizacao'],
  },
  'engenharia biomedica': {
    domain: 'tecnologia em saude',
    assets: ['sinais fisiologicos', 'imagens medicas', 'dispositivos vestiveis', 'prototipos assistivos'],
    methods: ['processamento de sinais', 'validacao de dispositivos', 'modelagem biomecanica', 'analise de imagens'],
    benefits: ['melhorar monitoramento clinico', 'aumentar seguranca de dispositivos', 'apoiar diagnostico', 'qualificar reabilitacao'],
  },
  'engenharia de materiais': {
    domain: 'materiais avancados',
    assets: ['amostras de materiais', 'ensaios mecanicos', 'dados de corrosao', 'formulacoes polimericas'],
    methods: ['caracterizacao fisico-quimica', 'simulacao de propriedades', 'ensaios acelerados', 'otimizacao de composicao'],
    benefits: ['aumentar durabilidade', 'reduzir peso estrutural', 'melhorar resistencia', 'criar materiais sustentaveis'],
  },
  'engenharia de producao': {
    domain: 'operacoes produtivas',
    assets: ['tempos de ciclo', 'indicadores OEE', 'mapas de processo', 'historico de qualidade'],
    methods: ['simulacao discreta', 'lean manufacturing', 'otimizacao de capacidade', 'analise de gargalos'],
    benefits: ['reduzir desperdicios', 'aumentar produtividade', 'melhorar nivel de servico', 'estabilizar processos'],
  },
  'engenharia de software': {
    domain: 'produtos digitais',
    assets: ['repositorios de codigo', 'metricas de qualidade', 'logs de uso', 'pipelines de entrega'],
    methods: ['arquitetura evolutiva', 'testes automatizados', 'analise de confiabilidade', 'engenharia de requisitos'],
    benefits: ['aumentar qualidade do software', 'reduzir falhas em producao', 'acelerar entregas', 'melhorar experiencia do usuario'],
  },
  'financas e economia aplicada': {
    domain: 'financas aplicadas',
    assets: ['series economicas', 'dados financeiros', 'carteiras de clientes', 'indicadores de risco'],
    methods: ['modelagem econometrica', 'analise de risco', 'previsao de demanda', 'simulacao de cenarios'],
    benefits: ['melhorar previsibilidade', 'reduzir exposicao a risco', 'apoiar precificacao', 'otimizar alocacao de recursos'],
  },
  'gestao da inovacao': {
    domain: 'gestao da inovacao',
    assets: ['portfolio de projetos', 'funil de ideias', 'indicadores de P&D', 'dados de mercado'],
    methods: ['roadmapping tecnologico', 'avaliacao de maturidade', 'gestao de portfolio', 'inteligencia competitiva'],
    benefits: ['priorizar investimentos', 'acelerar inovacao', 'reduzir incerteza', 'aumentar alinhamento estrategico'],
  },
  'industria 4.0': {
    domain: 'industria conectada',
    assets: ['sensores industriais', 'CLPs', 'dados de manutencao', 'sistemas supervisiorios'],
    methods: ['gemeo digital', 'analise de anomalias', 'integracao OT-IT', 'automacao inteligente'],
    benefits: ['reduzir paradas', 'aumentar eficiencia', 'melhorar qualidade', 'digitalizar operacoes'],
  },
  'inteligencia artificial': {
    domain: 'inteligencia artificial',
    assets: ['dados rotulados', 'documentos tecnicos', 'imagens operacionais', 'historico de decisoes'],
    methods: ['aprendizado profundo', 'processamento de linguagem natural', 'busca semantica', 'IA explicavel'],
    benefits: ['automatizar analises', 'melhorar recomendacoes', 'reduzir tempo de resposta', 'apoiar decisoes complexas'],
  },
  'internet das coisas': {
    domain: 'IoT e sistemas conectados',
    assets: ['sensores remotos', 'gateways industriais', 'telemetria em tempo real', 'redes de baixa potencia'],
    methods: ['arquitetura IoT', 'processamento de borda', 'monitoramento remoto', 'seguranca de dispositivos'],
    benefits: ['aumentar visibilidade operacional', 'reduzir manutencao corretiva', 'monitorar ativos', 'automatizar alertas'],
  },
  'logistica e pesquisa operacional': {
    domain: 'logistica e otimizacao',
    assets: ['rotas de entrega', 'estoques', 'pedidos historicos', 'capacidade de frota'],
    methods: ['programacao matematica', 'roteirizacao', 'simulacao operacional', 'otimizacao estocastica'],
    benefits: ['reduzir custo logistico', 'melhorar pontualidade', 'aumentar uso da frota', 'otimizar estoques'],
  },
  'marketing e comportamento do consumidor': {
    domain: 'marketing analitico',
    assets: ['jornadas de cliente', 'dados de campanhas', 'pesquisas de satisfacao', 'comportamento digital'],
    methods: ['segmentacao de clientes', 'modelagem de propensao', 'experimentos A/B', 'analise de sentimento'],
    benefits: ['aumentar conversao', 'melhorar experiencia do cliente', 'reduzir churn', 'personalizar ofertas'],
  },
  'nanotecnologia': {
    domain: 'nanotecnologia aplicada',
    assets: ['nanoparticulas', 'filmes finos', 'ensaios de superficie', 'materiais funcionais'],
    methods: ['sintese controlada', 'caracterizacao nanometrica', 'funcionalizacao de superficies', 'ensaios de estabilidade'],
    benefits: ['criar propriedades funcionais', 'aumentar desempenho de materiais', 'reduzir consumo de insumos', 'viabilizar novos produtos'],
  },
  'psicologia e comportamento organizacional': {
    domain: 'comportamento organizacional',
    assets: ['pesquisas internas', 'indicadores de clima', 'dados de treinamento', 'rotinas de trabalho'],
    methods: ['analise psicometrica', 'diagnostico organizacional', 'avaliacao de intervencoes', 'modelagem comportamental'],
    benefits: ['melhorar engajamento', 'reduzir rotatividade', 'apoiar liderancas', 'qualificar programas de bem-estar'],
  },
  'quimica aplicada': {
    domain: 'quimica aplicada',
    assets: ['amostras quimicas', 'formulacoes industriais', 'efluentes', 'dados cromatograficos'],
    methods: ['otimizacao de formulacao', 'analise instrumental', 'quimica verde', 'controle de processo'],
    benefits: ['melhorar desempenho de produtos', 'reduzir toxicidade', 'aumentar estabilidade', 'reduzir custo de insumos'],
  },
  'robotica e automacao': {
    domain: 'robotica e automacao',
    assets: ['celulas robotizadas', 'sensores de visao', 'atuadores', 'dados de trajetoria'],
    methods: ['planejamento de movimento', 'controle automatico', 'visao robotica', 'integracao de celulas'],
    benefits: ['aumentar seguranca', 'reduzir tarefas repetitivas', 'melhorar precisao', 'ampliar produtividade'],
  },
}

const contexts = [
  'em ambiente industrial de medio porte',
  'para operacoes com multiplas unidades',
  'em parceria com equipes tecnicas internas',
  'com validacao em dados reais da empresa',
  'para tomada de decisao baseada em evidencias',
  'com foco em escalabilidade e transferencia tecnologica',
  'considerando restricoes de custo, prazo e governanca',
  'com prototipo funcional para piloto controlado',
  'em processos criticos de alto impacto operacional',
  'com indicadores comparaveis antes e depois da intervencao',
]

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function logStep(message) {
  console.log(`[seed-250] ${message}`)
}

function flattenErrorDetail(detail) {
  if (!detail) {
    return ''
  }

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    return detail.map(flattenErrorDetail).filter(Boolean).join(' ')
  }

  if (typeof detail === 'object') {
    return Object.entries(detail)
      .map(([key, value]) => {
        const message = flattenErrorDetail(value)
        return message ? `${key}: ${message}` : ''
      })
      .filter(Boolean)
      .join(' ')
  }

  return String(detail)
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text ? { detail: text } : null
}

async function request(path, { method = 'GET', token = '', body } = {}) {
  const headers = new Headers()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await parseResponse(response)

  if (!response.ok) {
    const detail = (flattenErrorDetail(data) || response.statusText).slice(0, 900)
    const error = new Error(`${method} ${path} falhou com ${response.status}: ${detail}`)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

async function collectPaginated(path, token) {
  const items = []
  let nextPath = path

  for (let page = 0; nextPath && page < 50; page += 1) {
    const data = await request(nextPath, { token })

    if (Array.isArray(data)) {
      return data
    }

    if (!data || !Array.isArray(data.results)) {
      return items
    }

    items.push(...data.results)
    nextPath = data.next ? data.next.replace(baseUrl, '') : ''
  }

  return items
}

async function resolveToken() {
  if (providedToken) {
    logStep('Usando TOKEN informado por variavel de ambiente.')
    return providedToken
  }

  logStep(`Autenticando empresa ${companyEmail}.`)
  const data = await request('/auth/token/', {
    method: 'POST',
    body: {
      email: companyEmail,
      password: companyPassword,
    },
  })

  if (!data?.access) {
    throw new Error('Login nao retornou access token.')
  }

  return data.access
}

async function validateCompanyProfile(token) {
  const profile = await request('/auth/profile/', { token })

  if (profile?.id_tipo !== 2 && profile?.tipo !== 'empresa') {
    throw new Error('O token autenticado nao pertence a um usuario empresa.')
  }

  if (!profile?.empresa) {
    throw new Error('O usuario empresa autenticado nao possui perfil de empresa vinculado.')
  }

  logStep(`Empresa autenticada: ${profile.empresa.razao_social || profile.email}.`)
}

function buildSeedTitle(area, indexWithinArea) {
  const profile = resolveAreaProfile(area.name)
  const asset = profile.assets[indexWithinArea % profile.assets.length]
  const method = profile.methods[(indexWithinArea + 1) % profile.methods.length]
  return `${area.name} - ${method} com ${asset} ${String(indexWithinArea + 1).padStart(2, '0')}`
}

function resolveAreaProfile(areaName) {
  const key = normalizeKey(areaName)
  return areaProfiles[key] || {
    domain: areaName,
    assets: ['dados operacionais', 'indicadores de desempenho', 'processos internos', 'bases historicas'],
    methods: ['diagnostico aplicado', 'modelagem analitica', 'prototipacao tecnica', 'validacao experimental'],
    benefits: ['melhorar desempenho', 'reduzir riscos', 'aumentar eficiencia', 'apoiar decisao'],
  }
}

function buildPayload(area, indexWithinArea, globalIndex) {
  const profile = resolveAreaProfile(area.name)
  const asset = profile.assets[indexWithinArea % profile.assets.length]
  const method = profile.methods[(indexWithinArea + 1) % profile.methods.length]
  const benefit = profile.benefits[(indexWithinArea + 2) % profile.benefits.length]
  const context = contexts[indexWithinArea % contexts.length]
  const month = (globalIndex % 12) + 1
  const day = (globalIndex % 24) + 1
  const year = 2027 + (globalIndex % 2)
  const budget = 85000 + ((globalIndex * 7300) % 215000)

  return {
    title: buildSeedTitle(area, indexWithinArea),
    status: 'aberta',
    scope:
      `Executar uma pesquisa aplicada em ${profile.domain} usando ${asset} e ${method} ${context}. ` +
      `O estudo deve levantar requisitos, preparar dados ou amostras, construir um prototipo validavel e registrar limites tecnicos para implantacao.`,
    goal:
      `Desenvolver uma solucao que permita ${benefit}, com criterios de desempenho mensuraveis e comparacao com o processo atual da organizacao.`,
    justification:
      `A area de ${area.name} possui potencial direto para resolver desafios reais de produtividade, sustentabilidade, qualidade e inovacao. ` +
      `A empresa precisa de evidencias tecnicas para decidir investimento, reduzir incerteza e transformar conhecimento academico em aplicacao pratica.`,
    results:
      `Espera-se entregar diagnostico tecnico, base de evidencias, prototipo ou modelo demonstravel, indicadores de ganho, recomendacoes de escalabilidade e plano de continuidade para P&D.`,
    deadline: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 18:00`,
    budget: budget.toFixed(2),
    area: area.id_area,
  }
}

function buildSeeds(areas) {
  const orderedAreas = [...areas].sort((left, right) => left.id_area - right.id_area)
  const perArea = Math.floor(TARGET_TOTAL / orderedAreas.length)
  const extra = TARGET_TOTAL % orderedAreas.length
  const seeds = []

  orderedAreas.forEach((area, areaIndex) => {
    const countForArea = perArea + (areaIndex < extra ? 1 : 0)

    for (let indexWithinArea = 0; indexWithinArea < countForArea; indexWithinArea += 1) {
      seeds.push(buildPayload(area, indexWithinArea, seeds.length))
    }
  })

  return seeds
}

async function createResearches(token, seeds) {
  logStep('Carregando pesquisas existentes para evitar duplicacao por titulo.')
  const existingResearches = await collectPaginated('/research/', token)
  const existingTitles = new Set(
    existingResearches.map((research) => String(research.title || '').trim().toLowerCase())
  )
  let createdCount = 0
  let skippedCount = 0

  for (const [index, seed] of seeds.entries()) {
    const titleKey = seed.title.trim().toLowerCase()

    if (existingTitles.has(titleKey)) {
      skippedCount += 1
      continue
    }

    const research = await request('/research/', {
      method: 'POST',
      token,
      body: seed,
    })
    createdCount += 1
    existingTitles.add(titleKey)

    if (createdCount % 10 === 0 || index === seeds.length - 1) {
      logStep(`Criadas ${createdCount} de ${seeds.length} pesquisas planejadas.`)
    }

    if (research?.id_research) {
      process.stdout.write('')
    }
  }

  return { createdCount, skippedCount }
}

async function main() {
  logStep(`BASE_URL: ${baseUrl}`)
  const token = await resolveToken()
  await validateCompanyProfile(token)

  const areas = await collectPaginated('/research/area/', token)
  if (!areas.length) {
    throw new Error('Nenhuma area de pesquisa foi retornada pela API.')
  }

  logStep(`Areas suportadas encontradas: ${areas.length}.`)
  const seeds = buildSeeds(areas)
  logStep(`Payloads preparados: ${seeds.length}.`)

  const { createdCount, skippedCount } = await createResearches(token, seeds)
  logStep(`Concluido. Criadas: ${createdCount}. Ja existentes: ${skippedCount}.`)
}

main().catch((error) => {
  console.error('')
  console.error(`[seed-250] Erro: ${error.message}`)

  if (error.status) {
    console.error(`[seed-250] Status HTTP: ${error.status}`)
  }

  if (error.data) {
    console.error(`[seed-250] Resposta: ${JSON.stringify(error.data, null, 2).slice(0, 1200)}`)
  }

  process.exitCode = 1
})
