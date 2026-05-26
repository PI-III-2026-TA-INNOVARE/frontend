# P&D Connect Front-end

Front-end em React + Vite do projeto **P&D Connect** — plataforma que conecta empresas com pesquisadores via match inteligente com IA.

Este repositório contém **apenas o front-end**. O backend está em outro repositório (Django + DRF + PostgreSQL + pgvector).

## Requisitos

- `Node.js 18+`
- `npm 9+`
- API backend rodando em algum endereço acessível (por padrão `http://127.0.0.1:8000/api`)

## Como rodar

1. Instale as dependências:

```bash
npm install
```

2. Configure o endereço da API se necessário (crie um `.env` com base no exemplo):

```bash
cp .env.example .env
```

No Windows:

```bat
copy .env.example .env
```

3. Rode o projeto:

```bash
npm run dev
```

4. Abra a URL exibida pelo Vite no navegador (geralmente `http://localhost:5173`).

## URL padrão da API

Por padrão, o front usa:

```text
http://127.0.0.1:8000/api
```

Para alterar, edite o arquivo `.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## Build de produção

```bash
npm run build
```

Os arquivos compilados ficam em `dist/` e podem ser servidos por qualquer servidor estático.

## Scripts auxiliares de desenvolvimento

```bash
# Popula o backend com pesquisas de exemplo para testar a busca semântica
npm run seed:semantic-researches

# Popula com 250 pesquisas para testes de paginação
npm run seed:250-researches
```

> Esses scripts dependem de o backend estar rodando e de credenciais válidas. Veja `scripts/dev/` para detalhes.

---

## Estado da integração com o backend

### ✅ Funcional ponta a ponta

| Funcionalidade | Endpoints consumidos |
|---|---|
| Login + JWT (access + refresh) com retry automático | `POST /auth/token/`, `POST /auth/token/refresh/`, `GET /auth/profile/` |
| Cadastro de empresa com lookup de CNPJ | `POST /companies/cnpj-lookup/`, `POST /auth/register/` |
| Cadastro de pesquisador com seleção de universidade | `GET /universities/` (público), `POST /auth/register/` |
| **Recuperação de senha por email** (novo) | `POST /auth/forgot-password/`, `POST /auth/reset-password/` |
| Perfil da empresa — edição parcial | `GET /companies/{id}`, `PATCH /companies/{id}` |
| Perfil do pesquisador — edição completa | `PATCH /researchers/{id}`, `GET /researchers/{id}/resume/` |
| Currículo do pesquisador (formações, experiências, habilidades) | `POST/DELETE /educations/`, `POST/DELETE /experiences/`, `POST/PATCH /resumes/`, `GET /skills/` |
| **Busca semântica real com pgvector + MiniLM** (novo) | `GET /search/researchers/`, `GET /search/research/` |
| Publicação de pesquisas pela empresa | `POST /research/`, `GET /research/`, `GET /research/area/` |
| Pesquisador demonstra interesse em pesquisa | `POST /research/{id}/interest/`, `GET /research/my-interests/` |
| Empresa gerencia candidatos da pesquisa (com `match_reasons` e `score_match` exibidos) | `GET /research/{id}/candidates/`, `PATCH /research/{id}/candidates/{candidateId}/` |
| **Match de IA real** com pgvector + MiniLM + rerank Gemini (na branch `match_ia_gemini`) | `POST /research/{id}/match/run/` |
| **Recomendações personalizadas para pesquisador** (com refresh sob demanda) | `GET /research/my-recommendations/` |
| Indicadores públicos calculados sobre dados reais | `GET /companies/`, `GET /researchers/`, `GET /universities/`, etc. |

### ⚠️ Parcial ou mockado no backend

- **Match da IA** — depende da branch ativa. Em `main` ainda é placeholder (score `1.0` fixo). Na branch `match_ia_gemini` a IA é real: usa embeddings MiniLM via pgvector, ranking híbrido (semântico + lexical + área + disponibilidade), e rerank do top N com Gemini API. Frontend consome os mesmos endpoints; exibe `score_match` (compatibilidade %) e `match_reasons` (motivos do match) quando disponíveis.

### ❌ Não implementado em nenhum dos lados

| Faltando | Onde |
|---|---|
| Sugestão manual de candidato pela empresa | Botão existe no `ResearcherDetailModal.jsx` mas está `disabled` — backend não tem `POST /research/{id}/candidates/` |
| Edição de educação/experiência | Backend tem `PATCH /educations/{id}` e `PATCH /experiences/{id}` mas o frontend só faz add/delete |
| Status da pesquisa (abrir/encerrar) | Backend aceita `PATCH` no `status`, mas não há UI para alterar |
| Status do pesquisador (ativar/desativar perfil) | Campo existe no model, mas perfil não expõe |
| Propostas formais / contratos | Nada nos dois lados |
| Notificações | Nada nos dois lados |

---

## Estrutura principal

```text
src/
  components/   → componentes compartilhados (Navbar, AuthNav, modais, etc.)
  context/      → AuthContext (sessão + JWT) e ThemeContext (light/dark)
  lib/          → cliente HTTP, utilitários de domínio, ícones
  pages/
    landing/    → páginas públicas (home, sobre, como funciona, indicadores)
    auth/       → login, cadastro, esqueci/reset de senha
    app/        → páginas autenticadas (perfil, busca, publicar, meus interesses)
  services/     → camada de consumo dos endpoints reais (pdConnectApi.js)
  styles/       → variáveis CSS, mixins, base e estilos compartilhados
```

## Documentação adicional

- `AUDITORIA_FRONT_BACK.md` — visão consolidada da integração front ↔ backend
- `AUDITORIA_ROTAS_FRONT.md` — mapeamento detalhado de cada endpoint consumido
- `ai_instructions.md` — diretrizes para IA assistente de desenvolvimento

## Observações

- `.env` não deve ser versionado; só `.env.example`
- `node_modules` e `dist` estão no `.gitignore`
- Tema claro/escuro suportado via `data-theme` no `<html>`
- Tokens JWT armazenados em `localStorage` na chave `pdconnect-auth-session-v2`
