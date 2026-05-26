# Auditoria Front ↔ Back

## Escopo desta revisao

- Apenas front-end.
- Estado validado contra o backend na branch `main` (commit mais recente: `b22d6a0 update .env.example`).
- Rotas documentadas a partir do codigo do front e cruzadas com `apps/*/urls.py` do backend.

## Arquivo complementar

- `AUDITORIA_ROTAS_FRONT.md`: mapa detalhado por endpoint, metodo, autenticacao, arquivos consumidores, input, output, tratamento de sucesso, tratamento de erro e riscos.

## Estado atual da integracao

| Area | Estado atual no front | Rotas consumidas | Observacoes |
|---|---|---|---|
| Autenticacao | JWT real com access/refresh, persistencia em `localStorage` e hidratacao por profile | `POST /api/auth/token/`, `POST /api/auth/token/refresh/`, `GET /api/auth/profile/` | `401` tenta refresh uma vez; falha limpa sessao. |
| **Recuperacao de senha** | Fluxo completo de "esqueci minha senha" + reset por token enviado por email | `POST /api/auth/forgot-password/`, `POST /api/auth/reset-password/` | Backend gera token, envia email; front consome o link `?token=` na URL. |
| Cadastro empresa | Cadastro publico por CNPJ e credenciais | `POST /api/auth/register/`, `POST /api/companies/cnpj-lookup/` | Front valida formato basico; regra real do CNPJ fica no backend. |
| Cadastro pesquisador | Cadastro publico com select de universidade e validacao de email institucional | `GET /api/universities/`, `POST /api/auth/register/` | Backend valida que email pertence a dominio universitario. |
| Perfil empresa | Edicao parcial de empresa autenticada | `GET /api/auth/profile/`, `GET /api/companies/{id}`, `PATCH /api/companies/{id}` | CNPJ e situacao cadastral sao leitura; status ainda esta editavel por decisao pendente. |
| Perfil pesquisador | Edicao de nome, disponibilidade, areas, curriculo, formacoes, experiencias e habilidades existentes | `GET /api/universities/{id}`, `GET /api/researchers/{id}/resume/`, `PATCH /api/researchers/{id}`, `GET /api/research/area/`, `GET /api/skills/`, `POST /api/resumes/`, `PATCH /api/resumes/{id}`, `POST /api/educations/`, `DELETE /api/educations/{id}`, `POST /api/experiences/`, `DELETE /api/experiences/{id}` | Se nao houver curriculo, o front cria e vincula antes de criar formacao/experiencia/habilidade. **Editar formacao/experiencia (PATCH) nao tem UI ainda.** |
| **Busca semantica real** | Busca em vetores (pgvector + sentence-transformers MiniLM) + ranking hibrido (semantico + lexical + cobertura) | `GET /api/search/researchers/`, `GET /api/search/research/` | Se o endpoint responder 404, cai num fallback local de busca por palavras-chave (mantido por seguranca). |
| Publicacao de pesquisa | Empresa cria pesquisa e gerencia candidatos/match. Tela exibe `score_match` e `match_reasons` por candidato. | `GET /api/research/`, `POST /api/research/`, `GET /api/research/area/`, `GET /api/research/{id}/candidates/`, `PATCH /api/research/{id}/candidates/{candidateId}/`, `POST /api/research/{id}/match/run/` | Em `main` o match e placeholder; na branch `match_ia_gemini` usa IA real (MiniLM + pgvector + rerank Gemini). |
| **Recomendacoes da IA para pesquisador** | Aba "Sugeridos pela IA" no `MyInterestsPage` consome o endpoint dedicado e exibe motivos/score; botao "Atualizar sugestoes" forca re-execucao do match. | `GET /api/research/my-recommendations/`, `GET /api/research/my-recommendations/?refresh=true` | So existe na branch `match_ia_gemini`. Em `main` o endpoint nao existe e o front cai num catch silencioso (retorna lista vazia). |
| Indicadores | Metricas calculadas no front a partir de listas reais | `GET /api/companies/`, `GET /api/researchers/`, `GET /api/universities/`, `GET /api/research/`, `GET /api/resumes/`, `GET /api/educations/`, `GET /api/experiences/`, `GET /api/skills/` | Tela publica informa que indicadores reais exigem autenticacao. |

## Mocks e simulacoes

- Nao ha uso de mocks na integracao principal.
- O front evita simular propostas, notificacoes e fluxos pos-aprovacao.
- A busca semantica usa **a IA de verdade** (MiniLM via `sentence-transformers` + pgvector). O fallback local so e ativado se o endpoint retornar 404.
- O match exibido na pagina de pesquisas continua sendo apresentado como "match suportado pelo backend atual" — internamente o backend ainda usa placeholder com score `1.0` fixo por candidato.

## Rotas usadas hoje pelo front

### Publicas

- `POST /api/auth/token/`
- `POST /api/auth/token/refresh/`
- `POST /api/auth/register/`
- `POST /api/auth/forgot-password/` **(novo)**
- `POST /api/auth/reset-password/` **(novo)**
- `POST /api/companies/cnpj-lookup/`
- `GET /api/universities/` no cadastro publico de pesquisador

### Protegidas por JWT

- `GET /api/auth/profile/`
- `GET /api/companies/`
- `GET /api/companies/{id}`
- `PATCH /api/companies/{id}`
- `GET /api/researchers/`
- `GET /api/researchers/{id}` (usado em enriquecimento de resultados de busca)
- `PATCH /api/researchers/{id}`
- `GET /api/researchers/{id}/resume/`
- `GET /api/search/researchers/` **(novo)**
- `GET /api/search/research/` **(novo)**
- `GET /api/research/area/`
- `GET /api/research/`
- `GET /api/research/{id}`
- `POST /api/research/`
- `POST /api/research/{id}/interest/`
- `GET /api/research/my-interests/`
- `GET /api/research/my-recommendations/` **(novo, branch `match_ia_gemini`)**
- `GET /api/research/{id}/candidates/`
- `PATCH /api/research/{id}/candidates/{candidateId}/`
- `POST /api/research/{id}/match/run/`
- `GET /api/universities/` em telas autenticadas
- `GET /api/universities/{id}`
- `GET /api/resumes/`
- `POST /api/resumes/`
- `PATCH /api/resumes/{id}`
- `GET /api/educations/`
- `POST /api/educations/`
- `DELETE /api/educations/{id}`
- `GET /api/experiences/`
- `POST /api/experiences/`
- `DELETE /api/experiences/{id}`
- `GET /api/skills/`

## Dependencias de backend ainda nao implementadas como fluxo definitivo no front

### Backend tem endpoint, front nao tem UI

- `PATCH /educations/{id}` — edicao de formacao (front so cria/deleta hoje)
- `PATCH /experiences/{id}` — edicao de experiencia (front so cria/deleta hoje)
- Alteracao de `status` da pesquisa (`PATCH /research/{id}` aceita o campo) — sem botao de abrir/encerrar pesquisa
- Alteracao de `status` do pesquisador (campo no model) — sem toggle no perfil

### Backend nao tem o endpoint

- Sugerir candidato manualmente pela empresa — UI pronta no `ResearcherDetailModal.jsx` (botao `disabled`), faltando `POST /research/{id}/candidates/`
- Match real com IA — `/research/{id}/match/run/` existe mas usa placeholder (score `1.0` fixo)
- Propostas formais pos-aprovacao
- Notificacoes
- CRUD administrativo de universidades, areas e skills (existem endpoints mas o front nao usa para evitar mutar catalogo global)

### Branch `match_ia_gemini` (em desenvolvimento, nao mergeada em `main`)

Implementacao real da IA de matching, integrada com o app `apps/search`:

- Pgvector + sentence-transformers MiniLM (mesmos vetores da busca semantica).
- Ranking hibrido: `WEIGHT_SEMANTIC=0.50`, `WEIGHT_LEXICAL=0.25`, `WEIGHT_AREA=0.15`, `WEIGHT_AVAILABILITY=0.10`.
- Score minimo: `0.30` (filtra ruido).
- Rerank opcional do top N candidatos via Gemini API (`AI_MATCH_RERANK_ENABLED`).
- Processamento assincrono opcional via Celery + Redis (`AI_MATCH_ASYNC_ENABLED`).
- Novos campos no `ResearchCandidate`: `match_reasons` (JSON array) e `score_features` (JSON).
- Endpoint novo: `GET /research/my-recommendations/`.

**Frontend ja consome essa branch** (campos extras tratados com graceful fallback quando ausentes).

### Branch `Fix_test_Ai` (alternativa abandonada)

App `apps/ai_matching/` com arquitetura paralela (Gemini API + modelos proprios `MatchingProfile`, `Match`, `MatchingHistory`). Nao foi mergeada e parece ter sido substituida pela `match_ia_gemini`. **Frontend nao consome.**
