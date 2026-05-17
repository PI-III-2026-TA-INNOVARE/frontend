const DEFAULT_BASE_URL = 'http://127.0.0.1:8000/api'
const DEFAULT_COMPANY_EMAIL = 'teste@teste.com'
const DEFAULT_COMPANY_PASSWORD = 'minimo8caracteres'

const baseUrl = normalizeBaseUrl(process.env.BASE_URL || DEFAULT_BASE_URL)
const providedToken = process.env.TOKEN?.trim() || ''
const companyEmail = process.env.COMPANY_EMAIL?.trim() || DEFAULT_COMPANY_EMAIL
const companyPassword = process.env.COMPANY_PASSWORD || DEFAULT_COMPANY_PASSWORD
const companyCnpj = process.env.COMPANY_CNPJ?.trim() || ''
const createMissingAreas = process.env.CREATE_MISSING_AREAS === 'true'

const requiredAreas = [
  'Inteligencia Artificial Aplicada',
  'Automacao Industrial e IoT',
  'Biotecnologia e Bioeconomia',
  'Energia e Sustentabilidade',
  'Saude Digital',
  'Logistica e Operacoes',
  'Saneamento e Recursos Hidricos',
  'Materiais Avancados',
]

const researchSeeds = [
  {
    areaName: 'Inteligencia Artificial Aplicada',
    title: 'Inspecao visual inteligente para detectar defeitos em linhas de producao',
    status: 'aberta',
    scope:
      'Desenvolver um sistema de visao computacional para identificar trincas, rebarbas, manchas e falhas dimensionais em pecas metalicas durante o processo produtivo. O projeto deve integrar cameras industriais, modelos de aprendizado profundo e uma camada de alerta para operadores.',
    goal:
      'Reduzir refugos e retrabalho por meio de deteccao automatica de defeitos em tempo quase real, com rastreabilidade por lote e relatorios para engenharia de qualidade.',
    justification:
      'A inspeccao manual tem variabilidade entre turnos, alto custo operacional e baixa capacidade de registrar evidencias para analise posterior. Uma solucao baseada em IA pode padronizar criterios de qualidade e acelerar a tomada de decisao.',
    results:
      'Modelo treinado com imagens reais da fabrica, painel de indicadores de defeitos por lote, API de classificacao e protocolo de implantacao piloto em uma celula produtiva.',
    deadline: '2026-12-18 18:00',
    budget: '185000.00',
  },
  {
    areaName: 'Automacao Industrial e IoT',
    title: 'Manutencao preditiva de motores eletricos usando sensores IoT',
    status: 'aberta',
    scope:
      'Criar um estudo aplicado com coleta de vibracao, temperatura, corrente eletrica e ruido em motores de baixa e media potencia. A solucao deve comparar sinais de operacao normal e sinais de falha incipiente.',
    goal:
      'Antecipar falhas mecanicas e eletricas em motores criticos para reduzir paradas nao planejadas e otimizar o calendario de manutencao preventiva.',
    justification:
      'A empresa possui ativos distribuidos em varias linhas e hoje depende de inspecoes periodicas. A deteccao precoce de anomalias pode reduzir custos de manutencao, perda de produtividade e consumo energetico.',
    results:
      'Pipeline de coleta IoT, modelo de anomalia, recomendacoes de limites operacionais e demonstrador com alertas para equipe de manutencao.',
    deadline: '2026-11-30 17:00',
    budget: '142000.00',
  },
  {
    areaName: 'Biotecnologia e Bioeconomia',
    title: 'Aproveitamento de residuos agroindustriais para producao de bioinsumos',
    status: 'aberta',
    scope:
      'Investigar rotas de fermentacao e estabilizacao de residuos organicos de origem agroindustrial para gerar bioinsumos com aplicacao em solo agricola. O estudo deve avaliar composicao, seguranca, rendimento e viabilidade de escala.',
    goal:
      'Transformar subprodutos de baixo valor em um insumo biologico com potencial de reduzir desperdicio, custos de descarte e dependencia de fertilizantes convencionais.',
    justification:
      'Cadeias agroindustriais geram grande volume de residuos ricos em materia organica. O reaproveitamento controlado pode criar novos produtos, melhorar indicadores ambientais e abrir uma frente de economia circular.',
    results:
      'Caracterizacao dos residuos, protocolo de fermentacao, analise de qualidade do bioinsumo, estimativa preliminar de custo e recomendacao para planta piloto.',
    deadline: '2027-02-27 18:00',
    budget: '210000.00',
  },
  {
    areaName: 'Energia e Sustentabilidade',
    title: 'Otimizacao energetica em camaras frias com controle inteligente',
    status: 'aberta',
    scope:
      'Modelar o consumo de energia de camaras frias em operacao industrial e propor estrategias de controle baseadas em previsao de demanda, abertura de portas, carga termica e tarifa horaria.',
    goal:
      'Reduzir consumo eletrico sem comprometer a temperatura de conservacao e a seguranca dos produtos armazenados.',
    justification:
      'Refrigeracao industrial representa parcela relevante do custo operacional. Controles fixos tendem a desperdiçar energia em periodos de baixa demanda ou ignorar variacoes externas de temperatura.',
    results:
      'Modelo de consumo, simulador de cenarios, recomendacoes de controle e plano de validacao com indicadores de economia energetica.',
    deadline: '2026-10-15 18:00',
    budget: '128000.00',
  },
  {
    areaName: 'Saude Digital',
    title: 'Triagem digital de risco cardiometabolico em programas corporativos de saude',
    status: 'aberta',
    scope:
      'Construir um modelo de estratificacao de risco usando questionarios, historico ocupacional e indicadores clinicos basicos coletados em campanhas de saude. O projeto deve priorizar explicabilidade e protecao de dados sensiveis.',
    goal:
      'Apoiar equipes de saude ocupacional na identificacao de grupos prioritarios para acompanhamento preventivo e intervencoes personalizadas.',
    justification:
      'Programas de saude corporativa coletam dados relevantes, mas muitas vezes sem analise integrada. Uma abordagem digital pode melhorar a alocacao de recursos e prevenir afastamentos relacionados a doencas cronicas.',
    results:
      'Modelo de risco validado em base anonimizada, matriz de explicabilidade, painel de acompanhamento populacional e diretrizes de governanca de dados.',
    deadline: '2027-01-20 18:00',
    budget: '165000.00',
  },
  {
    areaName: 'Logistica e Operacoes',
    title: 'Roteirizacao dinamica para entregas urbanas com restricoes operacionais',
    status: 'aberta',
    scope:
      'Desenvolver um algoritmo de roteirizacao para entregas urbanas considerando janelas de atendimento, capacidade de veiculos, prioridade de pedidos, trafego estimado e replanejamento durante o dia.',
    goal:
      'Diminuir quilometragem rodada, atrasos de entrega e tempo de ociosidade da frota em operacoes de distribuicao urbana.',
    justification:
      'A roteirizacao manual tem dificuldade para incorporar restricoes dinamicas e mudancas de demanda. O uso de otimizacao pode melhorar custo logistico e nivel de servico.',
    results:
      'Prototipo de motor de roteirizacao, comparativo com rotas historicas, metricas de economia e recomendacoes para integracao com sistema operacional existente.',
    deadline: '2026-09-25 18:00',
    budget: '152000.00',
  },
  {
    areaName: 'Saneamento e Recursos Hidricos',
    title: 'Monitoramento inteligente de perdas de agua em redes de distribuicao',
    status: 'aberta',
    scope:
      'Avaliar sensores de pressao e vazao em pontos criticos da rede para detectar padroes de vazamento, consumo anomalo e rompimentos. O estudo deve combinar analise temporal, mapas da rede e regras operacionais.',
    goal:
      'Aumentar a velocidade de deteccao de perdas reais de agua e priorizar equipes de campo com base no impacto estimado.',
    justification:
      'Perdas em redes de distribuicao elevam custos, reduzem disponibilidade hidrica e prejudicam indicadores ambientais. Ferramentas preditivas podem tornar a operacao mais proativa.',
    results:
      'Modelo de anomalias hidraulicas, painel de eventos, mapa de priorizacao e protocolo de resposta para equipes de manutencao.',
    deadline: '2027-03-10 18:00',
    budget: '198000.00',
  },
  {
    areaName: 'Materiais Avancados',
    title: 'Revestimento anticorrosivo de baixa toxicidade para ambientes agressivos',
    status: 'aberta',
    scope:
      'Pesquisar formulacoes de revestimentos anticorrosivos com menor toxicidade para equipamentos expostos a umidade, salinidade e agentes quimicos. O estudo deve contemplar adesao, resistencia, durabilidade e custo de aplicacao.',
    goal:
      'Aumentar vida util de componentes metalicos e reduzir impacto ambiental associado a revestimentos convencionais.',
    justification:
      'Ambientes agressivos aceleram corrosao e aumentam paradas para reparo. Alternativas menos toxicas podem reduzir riscos ocupacionais e atender requisitos ambientais mais exigentes.',
    results:
      'Selecao de formulacoes candidatas, ensaios laboratoriais, comparativo tecnico-economico e recomendacao para teste em campo.',
    deadline: '2027-04-12 18:00',
    budget: '235000.00',
  },
  {
    areaName: 'Inteligencia Artificial Aplicada',
    title: 'Assistente de analise de documentos tecnicos para equipes de engenharia',
    status: 'aberta',
    scope:
      'Projetar um assistente capaz de recuperar informacoes em normas, laudos, manuais e historicos de projeto, respondendo perguntas tecnicas com citacao da fonte e controle de permissao por area.',
    goal:
      'Reduzir tempo de busca por conhecimento tecnico e apoiar decisoes de engenharia com respostas auditaveis.',
    justification:
      'Informacoes criticas ficam espalhadas em documentos longos e repositorios diferentes. A recuperacao semantica com governanca pode acelerar consultas sem substituir a validacao tecnica.',
    results:
      'Prototipo de busca semantica documental, avaliacao de qualidade das respostas, matriz de riscos e plano de implantacao controlada.',
    deadline: '2026-12-05 18:00',
    budget: '176000.00',
  },
  {
    areaName: 'Energia e Sustentabilidade',
    title: 'Previsao de geracao solar para gestao de microredes industriais',
    status: 'aberta',
    scope:
      'Criar modelos de previsao de geracao fotovoltaica usando dados meteorologicos, historico de irradiancia e perfil de consumo da planta. O estudo deve apoiar decisao de armazenamento e despacho de cargas flexiveis.',
    goal:
      'Melhorar o uso local da energia solar e reduzir custos em horarios de ponta por meio de previsoes operacionais confiaveis.',
    justification:
      'Microredes industriais precisam equilibrar geracao variavel, demanda e contratos de energia. Previsoes melhores permitem operar baterias e cargas com menor desperdicio.',
    results:
      'Modelo de previsao, simulacao de operacao da microrede, indicadores de economia e recomendacoes para integracao com supervisorio energetico.',
    deadline: '2027-05-22 18:00',
    budget: '190000.00',
  },
]

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

function logStep(message) {
  console.log(`[seed] ${message}`)
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
    const detail = (flattenErrorDetail(data) || response.statusText).slice(0, 800)
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

  for (let page = 0; nextPath && page < 25; page += 1) {
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

  logStep(`TOKEN nao informado; autenticando empresa ${companyEmail}.`)
  const data = await loginCompany()

  if (!data?.access) {
    throw new Error('Login nao retornou access token.')
  }

  return data.access
}

async function loginCompany() {
  try {
    return await request('/auth/token/', {
      method: 'POST',
      body: {
        email: companyEmail,
        password: companyPassword,
      },
    })
  } catch (error) {
    if (error.status !== 401 || !companyCnpj) {
      throw error
    }

    logStep('Login falhou; tentando registrar empresa via /auth/register/ com COMPANY_CNPJ.')
    await request('/auth/register/', {
      method: 'POST',
      body: {
        email: companyEmail,
        password: companyPassword,
        id_tipo: 'empresa',
        cnpj: companyCnpj,
      },
    })
    logStep('Empresa registrada; autenticando novamente.')

    return request('/auth/token/', {
      method: 'POST',
      body: {
        email: companyEmail,
        password: companyPassword,
      },
    })
  }
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

async function ensureAreas(token) {
  logStep('Carregando areas existentes.')
  const existingAreas = await collectPaginated('/research/area/', token)
  const fallbackArea = existingAreas[0]
  const areaByName = new Map(
    existingAreas.map((area) => [String(area.name || '').trim().toLowerCase(), area])
  )

  if (!fallbackArea && !createMissingAreas) {
    throw new Error(
      'Nenhuma area existente foi encontrada. Informe CREATE_MISSING_AREAS=true para tentar criar areas via API.'
    )
  }

  for (const areaName of requiredAreas) {
    const key = areaName.toLowerCase()

    if (areaByName.has(key)) {
      logStep(`Area reutilizada: ${areaName}`)
      continue
    }

    if (!createMissingAreas) {
      areaByName.set(key, fallbackArea)
      logStep(`Area ausente: ${areaName}; usando area existente #${fallbackArea.id_area}.`)
      continue
    }

    try {
      const area = await request('/research/area/', {
        method: 'POST',
        token,
        body: { name: areaName },
      })
      areaByName.set(key, area)
      logStep(`Area criada: ${areaName} (#${area.id_area})`)
    } catch (error) {
      if (fallbackArea && error.status >= 500) {
        areaByName.set(key, fallbackArea)
        logStep(`Criacao da area falhou no backend; usando area existente #${fallbackArea.id_area} para ${areaName}.`)
        continue
      }

      throw error
    }
  }

  return areaByName
}

async function createResearches(token, areaByName) {
  logStep('Carregando pesquisas existentes para evitar duplicacao por titulo.')
  const existingResearches = await collectPaginated('/research/', token)
  const existingTitles = new Set(
    existingResearches.map((research) => String(research.title || '').trim().toLowerCase())
  )

  const created = []
  const skipped = []

  for (const seed of researchSeeds) {
    const titleKey = seed.title.trim().toLowerCase()

    if (existingTitles.has(titleKey)) {
      skipped.push(seed.title)
      logStep(`Pesquisa ja existente, pulando: ${seed.title}`)
      continue
    }

    const area = areaByName.get(seed.areaName.toLowerCase())

    if (!area?.id_area) {
      throw new Error(`Area nao resolvida para pesquisa: ${seed.title}`)
    }

    const payload = {
      title: seed.title,
      status: seed.status,
      scope: seed.scope,
      goal: seed.goal,
      justification: seed.justification,
      results: seed.results,
      deadline: seed.deadline,
      budget: seed.budget,
      area: area.id_area,
    }

    const research = await request('/research/', {
      method: 'POST',
      token,
      body: payload,
    })
    created.push(research)
    existingTitles.add(titleKey)
    logStep(`Pesquisa criada: ${research.title} (#${research.id_research})`)
  }

  return { created, skipped }
}

async function main() {
  logStep(`BASE_URL: ${baseUrl}`)
  const token = await resolveToken()
  await validateCompanyProfile(token)
  const areaByName = await ensureAreas(token)
  const { created, skipped } = await createResearches(token, areaByName)

  console.log('')
  logStep(`Concluido. Criadas: ${created.length}. Ja existentes: ${skipped.length}.`)
  logStep('Sugestoes de busca como pesquisador:')
  console.log('  - defeitos em pecas usando visao computacional')
  console.log('  - reduzir consumo de energia em refrigeracao industrial')
  console.log('  - bioinsumos a partir de residuos agroindustriais')
  console.log('  - vazamentos em rede de agua com sensores')
  console.log('  - assistente para consultar normas e laudos tecnicos')
}

main().catch((error) => {
  console.error('')
  console.error(`[seed] Erro: ${error.message}`)

  if (error.status) {
    console.error(`[seed] Status HTTP: ${error.status}`)
  }

  if (error.data) {
    console.error(`[seed] Resposta: ${JSON.stringify(error.data, null, 2)}`)
  }

  process.exitCode = 1
})
