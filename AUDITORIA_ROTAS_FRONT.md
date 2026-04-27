# Auditoria de rotas utilizadas pelo front-end

Este documento mapeia as rotas que o front-end do P&D Connect utiliza hoje. A fonte principal desta auditoria e o proprio front-end, especialmente `src/services/pdConnectApi.js`, `src/lib/api.js`, `src/context/AuthContext.jsx` e as paginas que consomem esses servicos.

## Infra de API e autenticacao

Todas as chamadas passam por `src/lib/api.js`, que resolve a base por `VITE_API_BASE_URL` ou usa `http://127.0.0.1:8000/api`.

- Service central: `src/services/pdConnectApi.js`
- Cliente HTTP: `src/lib/api.js`
- Contexto de auth: `src/context/AuthContext.jsx`
- Armazenamento de sessao: `localStorage`, chave `pdconnect-auth-session-v2`
- Header automatico: `Authorization: Bearer <accessToken>` quando `skipAuth` nao e usado
- Refresh automatico: em resposta `401`, se existir `refreshToken`, chama `/auth/token/refresh/` uma unica vez por request

## Login JWT

- Endpoint: `/auth/token/`
- Metodo HTTP: `POST`
- Autenticacao:
  - publica
  - nao exige JWT
  - nao usa refresh token nesta chamada
  - nao depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`requestAuthToken`)
  - context: `src/context/AuthContext.jsx` (`signInWithCredentials`)
  - page: `src/pages/auth/login/LoginPage.jsx`
- Para que serve: autenticar usuario por credenciais reais e obter `access` e `refresh`.
- Input enviado pelo front:

```json
{
  "email": "usuario@email.com",
  "password": "senha"
}
```

- Output esperado pelo front:

```json
{
  "access": "jwt-access-token",
  "refresh": "jwt-refresh-token"
}
```

- Como o front trata sucesso: salva tokens em memoria e `localStorage`, chama `/auth/profile/` para hidratar usuario e redireciona para a area autenticada.
- Como o front trata erro: traduz credenciais invalidas para mensagem amigavel e exibe no formulario.
- Observacoes e riscos: se o backend retornar HTML em erro 500, o parser atual pode expor texto tecnico; isso foi mantido fora do escopo de correcao.

## Refresh de token

- Endpoint: `/auth/token/refresh/`
- Metodo HTTP: `POST`
- Autenticacao:
  - publica
  - nao exige JWT access
  - usa refresh token
  - depende de sessao persistida pelo front
- Arquivos onde aparece:
  - lib: `src/lib/api.js` (`requestTokenRefresh`, `refreshAccessToken`)
- Para que serve: renovar o access token apos `401`.
- Input enviado pelo front:

```json
{
  "refresh": "jwt-refresh-token"
}
```

- Output esperado pelo front:

```json
{
  "access": "novo-jwt-access-token",
  "refresh": "jwt-refresh-token-opcional"
}
```

- Como o front trata sucesso: atualiza sessao em memoria e persiste no `localStorage`.
- Como o front trata erro: limpa sessao e dispara fluxo de usuario nao autorizado.
- Observacoes e riscos: ha protecao contra loop por `retryUnauthorized: false` na segunda tentativa.

## Perfil autenticado

- Endpoint: `/auth/profile/`
- Metodo HTTP: `GET`
- Autenticacao:
  - exige JWT
  - pode acionar refresh token se access expirar
  - depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`getAuthenticatedProfile`)
  - context: `src/context/AuthContext.jsx` (`fetchHydratedUser`, `hydrateSession`)
- Para que serve: descobrir se o usuario autenticado e empresa ou pesquisador e montar a sessao do front.
- Input enviado pelo front: nenhum body; envia `Authorization: Bearer`.
- Output esperado pelo front:

```json
{
  "id_user": 1,
  "email": "usuario@email.com",
  "id_tipo": 2,
  "tipo": "Empresa",
  "empresa": {}
}
```

ou

```json
{
  "id_user": 2,
  "email": "pesquisador@universidade.edu",
  "id_tipo": 1,
  "tipo": "Pesquisador",
  "pesquisador": {}
}
```

- Como o front trata sucesso: monta `user` global no `AuthContext`; para empresa busca detalhes adicionais da empresa; para pesquisador busca universidade e curriculo.
- Como o front trata erro: limpa sessao e exibe mensagem de sessao invalida/expirada.
- Observacoes e riscos: o front depende dos campos `empresa` ou `pesquisador`; se nenhum vier, a hidratacao falha.

## Cadastro de usuario

- Endpoint: `/auth/register/`
- Metodo HTTP: `POST`
- Autenticacao:
  - publica
  - nao exige JWT
  - nao usa refresh token nesta chamada
  - nao depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`registerUser`)
  - context: `src/context/AuthContext.jsx` (`registerCompany`, `registerResearcher`)
  - page: `src/pages/auth/login/LoginPage.jsx`
- Para que serve: cadastrar empresa ou pesquisador conforme contrato atual do backend.
- Input enviado pelo front para empresa:

```json
{
  "email": "contato@empresa.com",
  "password": "senha",
  "id_tipo": "empresa",
  "cnpj": "00.000.000/0000-00"
}
```

- Input enviado pelo front para pesquisador:

```json
{
  "email": "pesquisador@universidade.edu",
  "password": "senha",
  "id_tipo": "pesquisador",
  "name": "Nome do pesquisador",
  "university": 1,
  "availability": true
}
```

- Output esperado pelo front: usuario criado e, no caso de empresa, possivel objeto `empresa` na resposta. O front nao depende dessa resposta para sessao final, pois tenta login automatico em seguida.
- Como o front trata sucesso: chama login automatico com as credenciais cadastradas.
- Como o front trata erro: exibe mensagem amigavel retornada pelo backend; mantem o usuario no formulario.
- Observacoes e riscos: validacoes de CNPJ ativo, email institucional, unicidade e integridade da universidade ficam no backend. O front faz apenas validacao basica de UX.

## Consulta publica de CNPJ

- Endpoint: `/companies/cnpj-lookup/`
- Metodo HTTP: `POST`
- Autenticacao:
  - publica
  - nao exige JWT
  - nao usa refresh token
  - nao depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`lookupCompanyCnpj`)
  - page: `src/pages/auth/login/LoginPage.jsx`
- Para que serve: consultar CNPJ antes do cadastro de empresa.
- Input enviado pelo front:

```json
{
  "cnpj": "00.000.000/0000-00"
}
```

- Output esperado pelo front:

```json
{
  "razao_social": "Empresa LTDA",
  "situacao_cadastral": "ATIVA",
  "pode_cadastrar": true,
  "motivo_bloqueio": null
}
```

- Como o front trata sucesso: mostra razao social, situacao cadastral e se o backend considera cadastravel.
- Como o front trata erro: exibe mensagem no formulario de cadastro.
- Observacoes e riscos: o front nao decide se o CNPJ esta ativo; apenas mostra a resposta do backend.

## Listagem de empresas

- Endpoint: `/companies/`
- Metodo HTTP: `GET`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`listCompanies`)
  - page: `src/pages/app/search/SearchPage.jsx`
  - page: `src/pages/landing/indicadores/IndicadoresPage.jsx`
- Para que serve: montar busca integrada e indicadores.
- Input enviado pelo front: nenhum body; pode seguir paginacao DRF por `next`.
- Output esperado pelo front: lista ou objeto paginado com empresas, incluindo campos como `id_company`, `name`, `cnpj`, `registration_status`, `situacao_cadastral`, `legal_name`, `status`.
- Como o front trata sucesso: monta cards de empresas, calcula metricas e usa `Promise.allSettled` para falha parcial.
- Como o front trata erro: busca e indicadores exibem aviso parcial quando outros endpoints funcionam.
- Observacoes e riscos: se a lista falhar, telas ainda podem renderizar parcialmente.

## Detalhe de empresa

- Endpoint: `/companies/{id}`
- Metodo HTTP: `GET`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`getCompany`)
  - context: `src/context/AuthContext.jsx`
- Para que serve: hidratar detalhes da empresa apos `/auth/profile/`.
- Input enviado pelo front: parametro de rota `id_company`.
- Output esperado pelo front: objeto de empresa com dados detalhados.
- Como o front trata sucesso: mescla dados detalhados com o perfil autenticado.
- Como o front trata erro: falha e ignorada com `Promise.allSettled`; usa os dados da empresa ja vindos do profile.
- Observacoes e riscos: se o detail falhar, o front continua com dados parciais.

## Edicao de empresa

- Endpoint: `/companies/{id}`
- Metodo HTTP: `PATCH`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`updateCompany`)
  - page: `src/pages/app/profile/ProfilePage.jsx`
- Para que serve: salvar alteracoes no perfil de empresa.
- Input enviado pelo front:

```json
{
  "name": "Nome interno",
  "status": true
}
```

- Output esperado pelo front: empresa atualizada.
- Como o front trata sucesso: chama `refreshUser()` e exibe "Perfil atualizado com sucesso."
- Como o front trata erro: exibe mensagem no perfil.
- Observacoes e riscos: status continua editavel por decisao pendente; CNPJ e situacao cadastral sao exibidos como leitura.

## Listagem de pesquisadores

- Endpoint: `/researchers/`
- Metodo HTTP: `GET`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`listResearchers`)
  - page: `src/pages/app/search/SearchPage.jsx`
  - page: `src/pages/landing/indicadores/IndicadoresPage.jsx`
- Para que serve: montar busca, indicadores e relacionamento com universidades/curriculos.
- Input enviado pelo front: nenhum body.
- Output esperado pelo front: lista de pesquisadores com `id_researcher`, `name`, `availability`, `status`, `university`, `resume`, `area`.
- Como o front trata sucesso: exibe pesquisadores e calcula metricas.
- Como o front trata erro: renderizacao parcial em busca/indicadores.
- Observacoes e riscos: curriculos sao carregados por endpoint separado por pesquisador.

## Edicao de pesquisador

- Endpoint: `/researchers/{id}`
- Metodo HTTP: `PATCH`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`updateResearcher`)
  - page: `src/pages/app/profile/ProfilePage.jsx`
- Para que serve: salvar perfil do pesquisador e vincular curriculo criado sob demanda.
- Input enviado pelo front para perfil:

```json
{
  "name": "Nome do pesquisador",
  "availability": true,
  "area": [1, 2]
}
```

- Input enviado pelo front para vincular curriculo:

```json
{
  "resume": 1
}
```

- Output esperado pelo front: pesquisador atualizado.
- Como o front trata sucesso: chama `refreshUser()` e exibe mensagem de sucesso.
- Como o front trata erro: exibe mensagem no perfil.
- Observacoes e riscos: universidade e status do pesquisador nao sao alterados pelo front nesta tela.

## Curriculo do pesquisador

- Endpoint: `/researchers/{id}/resume/`
- Metodo HTTP: `GET`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`getResearcherResume`)
  - context: `src/context/AuthContext.jsx`
  - page: `src/pages/app/search/SearchPage.jsx`
- Para que serve: hidratar curriculo do pesquisador logado e enriquecer cards de pesquisadores na busca.
- Input enviado pelo front: parametro de rota `id_researcher`.
- Output esperado pelo front: curriculo com `education`, `experience` e `skill`.
- Como o front trata sucesso: inclui curriculo no usuario autenticado ou nos cards da busca.
- Como o front trata erro: no AuthContext usa `Promise.allSettled` e permite `resume` nulo; na busca curriculos ausentes nao derrubam a tela.
- Observacoes e riscos: 404 para pesquisador sem curriculo e aceitavel em alguns fluxos.

## Areas de pesquisa

- Endpoint: `/research/area/`
- Metodo HTTP: `GET`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`listResearchAreas`)
  - page: `src/pages/app/profile/ProfilePage.jsx`
  - page: `src/pages/app/publish-challenge/PublishChallengePage.jsx`
  - page: `src/pages/app/search/SearchPage.jsx`
- Para que serve: preencher select de area de pesquisa, vincular areas ao pesquisador e rotular pesquisas.
- Input enviado pelo front: nenhum body.
- Output esperado pelo front: lista com `id_area` e `name`.
- Como o front trata sucesso: monta selects, checkboxes e labels.
- Como o front trata erro: perfil mostra erro de catalogo; busca renderiza parcialmente; publicacao pode bloquear se nao houver areas.
- Observacoes e riscos: o front nao cria areas para evitar mutacao de catalogo global.

## Listagem de pesquisas

- Endpoint: `/research/`
- Metodo HTTP: `GET`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`listResearches`)
  - page: `src/pages/app/publish-challenge/PublishChallengePage.jsx`
  - page: `src/pages/app/search/SearchPage.jsx`
  - page: `src/pages/landing/indicadores/IndicadoresPage.jsx`
- Para que serve: listar pesquisas para painel, publicacao da empresa e indicadores.
- Input enviado pelo front: nenhum body.
- Output esperado pelo front: lista de pesquisas com `id_research`, `title`, `scope`, `goal`, `justification`, `results`, `deadline`, `budget`, `area`, `company`, `status`.
- Como o front trata sucesso: filtra pesquisas da empresa logada ou monta cards de busca/indicadores.
- Como o front trata erro: mensagem na pagina de publicacao ou aviso parcial em busca/indicadores.
- Observacoes e riscos: depende do campo `company` para saber quais pesquisas pertencem a empresa logada.

## Criacao de pesquisa

- Endpoint: `/research/`
- Metodo HTTP: `POST`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado empresa
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`createResearch`)
  - page: `src/pages/app/publish-challenge/PublishChallengePage.jsx`
- Para que serve: empresa autenticada publica uma pesquisa.
- Input enviado pelo front:

```json
{
  "title": "Titulo da pesquisa",
  "scope": "Escopo",
  "goal": "Objetivo",
  "justification": "Justificativa",
  "results": "Resultados esperados",
  "deadline": "2027-02-01T03:00:00.000Z",
  "budget": 24500,
  "area": 1
}
```

- Output esperado pelo front: pesquisa criada com `id_research`.
- Como o front trata sucesso: adiciona a pesquisa no estado local, cria lista vazia de candidatos, limpa formulario e mostra sucesso.
- Como o front trata erro: mostra mensagem no formulario.
- Observacoes e riscos: `company` e `researcher` nao sao enviados; empresa vem do JWT. Se nao houver area cadastrada, envio e bloqueado.

## Interesse em pesquisa

- Endpoint: `/research/{id}/interest/`
- Metodo HTTP: `POST`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado pesquisador
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`createResearchInterest`)
  - page: `src/pages/app/search/SearchPage.jsx`
- Para que serve: pesquisador registra interesse em uma pesquisa.
- Input enviado pelo front: body vazio por padrao.
- Output esperado pelo front: interesse/candidato criado ou confirmado.
- Como o front trata sucesso: recarrega `/research/my-interests/` e atualiza cards.
- Como o front trata erro: mostra mensagem no painel de busca.
- Observacoes e riscos: botao fica desabilitado quando ja existe interesse retornado pelo backend.

## Meus interesses de pesquisa

- Endpoint: `/research/my-interests/`
- Metodo HTTP: `GET`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado pesquisador
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`listMyResearchInterests`)
  - page: `src/pages/app/search/SearchPage.jsx`
- Para que serve: identificar pesquisas em que o pesquisador ja demonstrou interesse.
- Input enviado pelo front: nenhum body.
- Output esperado pelo front: lista de interesses com `research_id` e `status`.
- Como o front trata sucesso: cria lookup por `research_id` e desabilita acao duplicada.
- Como o front trata erro: busca renderiza parcialmente com aviso.
- Observacoes e riscos: so e chamado quando `user.type === 'pesquisador'`.

## Candidatos de pesquisa

- Endpoint: `/research/{id}/candidates/`
- Metodo HTTP: `GET`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado empresa
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`listResearchCandidates`)
  - page: `src/pages/app/publish-challenge/PublishChallengePage.jsx`
- Para que serve: listar candidatos/interessados por pesquisa da empresa.
- Input enviado pelo front: parametro de rota `id_research`; aceita query params opcionais, mas a UI atual chama sem filtros.
- Output esperado pelo front: lista com `id_candidate`, `researcher_name`, `source`, `status`, `score_match`.
- Como o front trata sucesso: exibe candidatos por pesquisa.
- Como o front trata erro: carregamento inicial usa `Promise.allSettled` e assume lista vazia para pesquisa que falhar; atualizacao individual mostra erro.
- Observacoes e riscos: depende de permissao de dona da pesquisa no backend.

## Atualizacao de status do candidato

- Endpoint: `/research/{id}/candidates/{candidateId}/`
- Metodo HTTP: `PATCH`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado empresa
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`updateResearchCandidateStatus`)
  - page: `src/pages/app/publish-challenge/PublishChallengePage.jsx`
- Para que serve: empresa muda status do candidato.
- Input enviado pelo front:

```json
{
  "status": "approved"
}
```

- Output esperado pelo front: candidato atualizado.
- Como o front trata sucesso: atualiza o candidato no estado local e mostra mensagem.
- Como o front trata erro: mostra mensagem de falha.
- Observacoes e riscos: opcoes atuais de status no front sao `under_review`, `approved`, `rejected`.

## Rodar match de pesquisa

- Endpoint: `/research/{id}/match/run/`
- Metodo HTTP: `POST`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado empresa
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`runResearchMatch`)
  - page: `src/pages/app/publish-challenge/PublishChallengePage.jsx`
- Para que serve: solicita match suportado pelo backend para uma pesquisa.
- Input enviado pelo front:

```json
{}
```

- Output esperado pelo front:

```json
{
  "research_id": 1,
  "job_id": "id-do-job"
}
```

- Como o front trata sucesso: recarrega candidatos da pesquisa e exibe mensagem com `research_id` e `job_id`.
- Como o front trata erro: mostra mensagem na tela de pesquisas.
- Observacoes e riscos: a propria UI descreve o match como suportado/operacional, nao como IA definitiva.

## Listagem de universidades

- Endpoint: `/universities/`
- Metodo HTTP: `GET`
- Autenticacao:
  - publica no cadastro de pesquisador via `listPublicUniversities`
  - exige JWT nas leituras autenticadas via `listUniversities`
  - pode usar refresh token quando chamada autenticada
  - pode depender ou nao do usuario autenticado conforme funcao usada
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`listPublicUniversities`, `listUniversities`)
  - page: `src/pages/auth/login/LoginPage.jsx`
  - page: `src/pages/app/search/SearchPage.jsx`
  - page: `src/pages/landing/indicadores/IndicadoresPage.jsx`
- Para que serve: popular select de universidade no cadastro de pesquisador e montar busca/indicadores.
- Input enviado pelo front: nenhum body.
- Output esperado pelo front: lista com `id_university` e `name`.
- Como o front trata sucesso: no cadastro usa `id_university` como `value` do select e `name` como texto visivel; em busca/indicadores monta labels e metricas.
- Como o front trata erro: cadastro mostra mensagem de universidades indisponiveis; busca/indicadores renderizam parcialmente.
- Observacoes e riscos: se a rota voltar a exigir JWT no cadastro publico, o select ficara vazio e o cadastro de pesquisador sera bloqueado.

## Detalhe de universidade

- Endpoint: `/universities/{id}`
- Metodo HTTP: `GET`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`getUniversity`)
  - context: `src/context/AuthContext.jsx`
- Para que serve: hidratar nome da universidade do pesquisador autenticado.
- Input enviado pelo front: parametro de rota `id_university`.
- Output esperado pelo front: objeto de universidade.
- Como o front trata sucesso: adiciona objeto `university` ao usuario global.
- Como o front trata erro: usa `Promise.allSettled` e permite universidade nula.
- Observacoes e riscos: perfil do pesquisador mostra fallback quando universidade nao carrega.

## Listagem de curriculos

- Endpoint: `/resumes/`
- Metodo HTTP: `GET`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`listResumes`)
  - page: `src/pages/landing/indicadores/IndicadoresPage.jsx`
- Para que serve: calcular indicadores.
- Input enviado pelo front: nenhum body.
- Output esperado pelo front: lista de curriculos.
- Como o front trata sucesso: usa quantidade para cards de indicadores.
- Como o front trata erro: indicadores carregam parcialmente.
- Observacoes e riscos: nao ha CRUD visual geral de curriculos; criacao ocorre sob demanda no perfil.

## Criacao de curriculo

- Endpoint: `/resumes/`
- Metodo HTTP: `POST`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado pesquisador
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`createResume`)
  - page: `src/pages/app/profile/ProfilePage.jsx`
- Para que serve: criar curriculo real quando pesquisador ainda nao tem curriculo e tenta adicionar formacao, experiencia ou habilidade.
- Input enviado pelo front:

```json
{}
```

- Output esperado pelo front:

```json
{
  "id_resume": 1
}
```

- Como o front trata sucesso: vincula o curriculo ao pesquisador via `PATCH /researchers/{id}`.
- Como o front trata erro: mostra mensagem no perfil.
- Observacoes e riscos: se o backend nao retornar `id_resume`, o front considera erro.

## Atualizacao de curriculo

- Endpoint: `/resumes/{id}`
- Metodo HTTP: `PATCH`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado pesquisador
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`updateResume`)
  - page: `src/pages/app/profile/ProfilePage.jsx`
- Para que serve: sincronizar habilidades vinculadas ao curriculo.
- Input enviado pelo front:

```json
{
  "skills": [1, 2]
}
```

- Output esperado pelo front: curriculo atualizado.
- Como o front trata sucesso: chama `refreshUser()` e mostra mensagem.
- Como o front trata erro: mostra mensagem no perfil.
- Observacoes e riscos: o front nao cria habilidades novas; apenas vincula existentes.

## Listagem de formacoes

- Endpoint: `/educations/`
- Metodo HTTP: `GET`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`listEducations`)
  - page: `src/pages/landing/indicadores/IndicadoresPage.jsx`
- Para que serve: calcular indicadores.
- Input enviado pelo front: nenhum body.
- Output esperado pelo front: lista de formacoes.
- Como o front trata sucesso: usa quantidade nos indicadores.
- Como o front trata erro: indicadores carregam parcialmente.
- Observacoes e riscos: nao e usado para renderizar o perfil; o perfil usa formacoes vindas do curriculo hidratado.

## Criacao de formacao

- Endpoint: `/educations/`
- Metodo HTTP: `POST`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado pesquisador
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`createEducation`)
  - page: `src/pages/app/profile/ProfilePage.jsx`
- Para que serve: adicionar formacao ao curriculo do pesquisador.
- Input enviado pelo front:

```json
{
  "course": "Curso",
  "institution": "Instituicao",
  "start_date": "2020-01-01",
  "end_date": "2024-01-01",
  "resume": 1
}
```

- Output esperado pelo front: formacao criada.
- Como o front trata sucesso: chama `refreshUser()`, limpa formulario e mostra sucesso.
- Como o front trata erro: mostra mensagem no perfil.
- Observacoes e riscos: se pesquisador nao tiver curriculo, o front cria e vincula um curriculo antes.

## Exclusao de formacao

- Endpoint: `/educations/{id}`
- Metodo HTTP: `DELETE`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado pesquisador
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`deleteEducation`)
  - page: `src/pages/app/profile/ProfilePage.jsx`
- Para que serve: remover formacao do curriculo.
- Input enviado pelo front: parametro `id_education`.
- Output esperado pelo front: resposta vazia ou confirmacao de exclusao.
- Como o front trata sucesso: chama `refreshUser()` e mostra sucesso.
- Como o front trata erro: mostra mensagem no perfil.
- Observacoes e riscos: nao ha confirmacao modal antes da exclusao.

## Listagem de experiencias

- Endpoint: `/experiences/`
- Metodo HTTP: `GET`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`listExperiences`)
  - page: `src/pages/landing/indicadores/IndicadoresPage.jsx`
- Para que serve: calcular indicadores.
- Input enviado pelo front: nenhum body.
- Output esperado pelo front: lista de experiencias.
- Como o front trata sucesso: usa quantidade nos indicadores.
- Como o front trata erro: indicadores carregam parcialmente.
- Observacoes e riscos: nao e usado para renderizar o perfil; o perfil usa experiencias vindas do curriculo hidratado.

## Criacao de experiencia

- Endpoint: `/experiences/`
- Metodo HTTP: `POST`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado pesquisador
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`createExperience`)
  - page: `src/pages/app/profile/ProfilePage.jsx`
- Para que serve: adicionar experiencia ao curriculo.
- Input enviado pelo front:

```json
{
  "description": "Descricao da experiencia",
  "start_date": "2022-01-01",
  "end_date": "2024-01-01",
  "resume": 1
}
```

- Output esperado pelo front: experiencia criada.
- Como o front trata sucesso: chama `refreshUser()`, limpa formulario e mostra sucesso.
- Como o front trata erro: mostra mensagem no perfil.
- Observacoes e riscos: `end_date` pode ser enviado como `null`.

## Exclusao de experiencia

- Endpoint: `/experiences/{id}`
- Metodo HTTP: `DELETE`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado pesquisador
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`deleteExperience`)
  - page: `src/pages/app/profile/ProfilePage.jsx`
- Para que serve: remover experiencia do curriculo.
- Input enviado pelo front: parametro `id_experience`.
- Output esperado pelo front: resposta vazia ou confirmacao de exclusao.
- Como o front trata sucesso: chama `refreshUser()` e mostra sucesso.
- Como o front trata erro: mostra mensagem no perfil.
- Observacoes e riscos: nao ha confirmacao modal antes da exclusao.

## Listagem de habilidades

- Endpoint: `/skills/`
- Metodo HTTP: `GET`
- Autenticacao:
  - exige JWT
  - pode usar refresh token
  - depende do usuario autenticado
- Arquivos onde aparece:
  - service: `src/services/pdConnectApi.js` (`listSkills`)
  - page: `src/pages/app/profile/ProfilePage.jsx`
  - page: `src/pages/landing/indicadores/IndicadoresPage.jsx`
- Para que serve: listar catalogo de habilidades para vincular ao curriculo e calcular indicadores.
- Input enviado pelo front: nenhum body.
- Output esperado pelo front: lista com `id_skill` e `description`.
- Como o front trata sucesso: perfil mostra select de habilidades existentes; indicadores contam itens.
- Como o front trata erro: perfil mostra falha ao carregar catalogo; indicadores carregam parcialmente.
- Observacoes e riscos: o front nao usa `POST /skills/` para evitar alterar catalogo global.

## Rotas exportadas mas nao usadas diretamente por tela hoje

Estas funcoes existem no service, mas nao foram encontradas como consumo direto em page/context/component no estado atual:

- `getResearcher(id)` -> `GET /researchers/{id}`
- `getResume(id)` -> `GET /resumes/{id}`

Elas devem ser revisadas antes de qualquer uso futuro para confirmar permissao, formato de resposta e necessidade real na UI.
