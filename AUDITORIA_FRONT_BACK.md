# Auditoria Front x Back

Arquivo revisado para refletir o estado atual do front-end. Esta auditoria nao substitui `AUDITORIA_ROTAS_FRONT.md`; ela resume aderencia, riscos e pendencias funcionais do front em relacao aos contratos de API que ele consome hoje.

## Escopo desta revisao

- Apenas front-end.
- Nenhuma nova auditoria completa do backend foi feita.
- Rotas documentadas a partir do codigo do front.
- Backend continua sendo a fonte de verdade tecnica, mas este arquivo registra somente o que o front consome hoje.

## Arquivo complementar

- `AUDITORIA_ROTAS_FRONT.md`: mapa detalhado por endpoint, metodo, autenticacao, arquivos consumidores, input, output, tratamento de sucesso, tratamento de erro e riscos.

## Estado atual da integracao

| Area | Estado atual no front | Rotas consumidas | Observacoes |
|---|---|---|---|
| Autenticacao | JWT real com access/refresh, persistencia em `localStorage` e hidratacao por profile | `POST /api/auth/token/`, `POST /api/auth/token/refresh/`, `GET /api/auth/profile/` | `401` tenta refresh uma vez; falha limpa sessao. |
| Cadastro empresa | Cadastro publico por CNPJ e credenciais | `POST /api/auth/register/`, `POST /api/companies/cnpj-lookup/` | Front valida formato basico; regra real do CNPJ fica no backend. |
| Cadastro pesquisador | Cadastro publico com select de universidade | `GET /api/universities/`, `POST /api/auth/register/` | Select usa `id_university` como value e `name` como texto. |
| Perfil empresa | Edicao parcial de empresa autenticada | `GET /api/auth/profile/`, `GET /api/companies/{id}`, `PATCH /api/companies/{id}` | CNPJ e situacao cadastral sao leitura; status ainda esta editavel por decisao pendente. |
| Perfil pesquisador | Edicao de nome, disponibilidade, areas, curriculo, formacoes, experiencias e habilidades existentes | `GET /api/universities/{id}`, `GET /api/researchers/{id}/resume/`, `PATCH /api/researchers/{id}`, `GET /api/research/area/`, `GET /api/skills/`, `POST /api/resumes/`, `PATCH /api/resumes/{id}`, `POST /api/educations/`, `DELETE /api/educations/{id}`, `POST /api/experiences/`, `DELETE /api/experiences/{id}` | Se nao houver curriculo, o front cria e vincula antes de criar formacao/experiencia/habilidade. |
| Busca integrada | Busca textual local sobre dados reais carregados da API | `GET /api/companies/`, `GET /api/researchers/`, `GET /api/research/`, `GET /api/research/area/`, `GET /api/universities/`, `GET /api/research/my-interests/`, `GET /api/researchers/{id}/resume/`, `POST /api/research/{id}/interest/` | Usa `Promise.allSettled` para evitar queda total por falha parcial. |
| Publicacao de pesquisa | Empresa cria pesquisa e gerencia candidatos/match suportado | `GET /api/research/`, `POST /api/research/`, `GET /api/research/area/`, `GET /api/research/{id}/candidates/`, `PATCH /api/research/{id}/candidates/{candidateId}/`, `POST /api/research/{id}/match/run/` | Front nao envia `company` nem `researcher` ao criar pesquisa. |
| Indicadores | Metricas calculadas no front a partir de listas reais | `GET /api/companies/`, `GET /api/researchers/`, `GET /api/universities/`, `GET /api/research/`, `GET /api/resumes/`, `GET /api/educations/`, `GET /api/experiences/`, `GET /api/skills/` | Tela publica informa que indicadores reais exigem autenticacao. |

## Mocks e simulacoes

- Nao ha uso dos mocks antigos na integracao principal atual.
- O front evita simular propostas, notificacoes, busca semantica e IA definitiva.
- Match exibido na pagina de pesquisas e apresentado como recurso suportado pelo backend atual, nao como IA definitiva.

## Rotas usadas hoje pelo front

### Publicas

- `POST /api/auth/token/`
- `POST /api/auth/token/refresh/`
- `POST /api/auth/register/`
- `POST /api/companies/cnpj-lookup/`
- `GET /api/universities/` no cadastro publico de pesquisador

### Protegidas por JWT

- `GET /api/auth/profile/`
- `GET /api/companies/`
- `GET /api/companies/{id}`
- `PATCH /api/companies/{id}`
- `GET /api/researchers/`
- `PATCH /api/researchers/{id}`
- `GET /api/researchers/{id}/resume/`
- `GET /api/research/area/`
- `GET /api/research/`
- `POST /api/research/`
- `POST /api/research/{id}/interest/`
- `GET /api/research/my-interests/`
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

## Principais decisoes de front registradas

- O front envia apenas `email`, `password`, `id_tipo` e `cnpj` no cadastro publico de empresa.
- O front nao envia nome manual de empresa no cadastro publico; o backend define dados oficiais via CNPJ.
- O front envia `university` como ID no cadastro de pesquisador, selecionado por `GET /api/universities/`.
- O front nao cria universidades pelo cadastro publico.
- O front nao cria skills novas no perfil; apenas vincula skills existentes para evitar alterar catalogo global.
- O front nao cria areas de pesquisa; se nao houver area, publicacao de pesquisa fica bloqueada com mensagem.
- O front normaliza `deadline` de pesquisa para ISO string antes do envio.
- O front usa `Promise.allSettled` em busca e indicadores para renderizar dados parciais.

## Pontos de risco conhecidos

| Risco | Impacto | Estado atual |
|---|---|---|
| Erro HTML/tecnico do backend pode aparecer cru | Mensagem ruim para usuario final | Pendente por decisao anterior. |
| Status da empresa ainda editavel | Usuario pode alterar booleano sensivel se backend permitir | Pendente por decisao anterior. |
| Cadastro pesquisador depende de universidades existentes | Select fica vazio se base nao tiver universidade ou rota falhar | Front mostra erro/estado vazio e bloqueia submit. |
| Criacao de pesquisa depende de areas existentes | Empresa nao publica sem area | Front bloqueia envio e explica necessidade de area. |
| Curriculo pode nao existir no cadastro inicial de pesquisador | CRUD de formacao/experiencia/habilidade depende de curriculo | Front cria curriculo sob demanda e vincula ao pesquisador. |
| Endpoints de catalogo global podem ser perigosos | UI poderia alterar dados globais indevidamente | Front nao expoe criacao de skill, universidade ou area. |

## Dependencias de backend ainda nao implementadas como fluxo definitivo no front

- Propostas formais.
- Notificacoes.
- Status de proposta.
- Busca semantica real.
- Match por IA definitivo.
- CRUD administrativo de universidades, areas e skills.

## Pendencias recomendadas para proxima rodada

- Confirmar com backend se `GET /api/universities/` deve permanecer publico para cadastro de pesquisador.
- Confirmar se `status` de empresa deve continuar editavel no perfil.
- Melhorar sanitizacao/mensagem para erros HTML ou stack traces vindos da API.
- Confirmar se o backend tera endpoint publico especifico para dados auxiliares de cadastro, como universidades.
- Confirmar regras de permissao finais para candidatos, interesses e match.

## Conclusao

O front esta integrado ao backend atual com JWT real, cadastro publico de empresa/pesquisador, hidratacao de perfil, pesquisa, candidatos, interesses, curriculo e indicadores. As principais lacunas restantes nao devem ser simuladas no front sem contrato de backend. Para detalhes operacionais de cada rota usada, consultar `AUDITORIA_ROTAS_FRONT.md`.
