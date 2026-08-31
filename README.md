# Mini CRM (PJBL) — Soluções Cloud

Front-end em React que consome uma API de Azure Functions com dados mock, publicado
no Azure Static Web Apps. Projeto da disciplina de Soluções Cloud.

O sistema é um CRM simples: carteira de clientes, histórico de interações, funil de
oportunidades de venda, tarefas com faixas de vencimento e indicadores por perfil de
usuário. Os requisitos vêm da especificação do grupo (33 requisitos funcionais) e a
identidade visual vem do protótipo validado pela equipe.

- **Integrantes:** ver [GRUPO.md](GRUPO.md)
- **Especificação do sistema:** ver [docs/SPEC.md](docs/SPEC.md)
- **Prompts usados na geração:** ver [PROMPT.MD](PROMPT.MD)

## Endereços

| O quê | Endereço |
|---|---|
| Site (Azure Static Web Apps) | <https://ambitious-pebble-077133f10.7.azurestaticapps.net> |
| API (Azure Functions integrada) | <https://ambitious-pebble-077133f10.7.azurestaticapps.net/api/health> (mesma origem do site, sob `/api`) |
| Documentação no Apidog | <https://rydx0vewxp.apidog.io> |
| Mock server no Apidog (Cloud Mock) | <https://mock.apidog.com/m1/1365834-1370078-default> |

## Telas

| Tela | Requisitos atendidos |
|---|---|
| Login | RF01 (senha mínima, bloqueio por tentativas, expiração de sessão), RF02 |
| Dashboard | RF11, RF13, RF15, RF19, RF29, RF31 |
| Clientes | RF03, RF04, RF18, RF26, RF30, RF33 |
| Detalhe do cliente | RF05, RF06, RF16, RF28 |
| Funil de vendas | RF07, RF08, RF09, RF19, RF29, RF30 |

## Endpoints da API

Todos anônimos, sob `/api`. O parâmetro `usuarioId` define o escopo dos dados
(RF15): o Vendedor recebe apenas a própria carteira, o Gerente a da equipe e o
Administrador o conjunto completo.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Estado da API e tamanho da massa mock |
| GET | `/api/usuarios` | Usuários do sistema, sem credenciais |
| GET | `/api/dashboard` | Indicadores, funil resumido, tarefas e ranking |
| GET | `/api/clientes` | Lista com busca (`q`), filtros (`status`, `responsavelId`) e paginação de 20 |
| GET | `/api/clientes/{id}` | Cliente com interações, oportunidades e tarefas |
| POST | `/api/clientes` | Cadastra cliente (nasce como Prospect) |
| PATCH | `/api/clientes/{id}` | Altera campos do cliente |
| DELETE | `/api/clientes/{id}` | Exclusão lógica: passa a Inativo e sai das listagens |
| POST | `/api/clientes/{id}/interacoes` | Registra ligação, e-mail ou reunião |
| GET | `/api/oportunidades` | Funil agrupado nas quatro etapas, com contagem e soma |
| POST | `/api/oportunidades` | Cria oportunidade vinculada a um cliente |
| PATCH | `/api/oportunidades/{id}` | Move no funil, fecha ou reabre |
| GET | `/api/tarefas` | Tarefas com faixa de vencimento calculada |
| PATCH | `/api/tarefas/{id}` | Conclui ou reabre a tarefa |

Exemplos:

```bash
curl "https://ambitious-pebble-077133f10.7.azurestaticapps.net/api/clientes?usuarioId=u2&q=acme&status=Ativo"
curl "https://ambitious-pebble-077133f10.7.azurestaticapps.net/api/dashboard?usuarioId=u1"
```

### Sobre a persistência

As Azure Functions **validam** as operações de escrita e devolvem o registro
resultante, mas não gravam em banco: são funções sem estado servindo dados mock,
como pede o enunciado. Quem guarda o resultado é o front-end.

Na prática isso significa que a validação é real. Cadastrar um cliente com e-mail
inválido devolve `400` com a lista de problemas:

```json
{
  "erro": "Cliente inválido",
  "erros": ["email: formato inválido", "responsavelId: usuário inexistente"]
}
```

E as regras de negócio também: fechar uma oportunidade como perdida sem informar o
motivo devolve `400` (RF29), e tirar do funil uma oportunidade já fechada exige
`reabrir: true` no corpo (RF09).

## Dados mock

A massa é gerada por `api/scripts/gerar-mock.mjs` com semente fixa, então é sempre
idêntica: 8 usuários, 46 clientes, 60 oportunidades, 123 interações e 22 tarefas.

As datas são gravadas como **deslocamento em dias**, não como data absoluta, e a API
converte para data real no momento da requisição. Assim as faixas de vencimento do
RF13 (vencida, hoje, amanhã, próximos 15 dias) continuam corretas em qualquer data
de execução, sem regerar nada.

Para regerar:

```bash
cd api && node scripts/gerar-mock.mjs
```

## Usuários de demonstração

A autenticação é simulada no front-end: não há back-end de autenticação neste
protótipo. A senha de todos é `demo1234`.

| E-mail | Perfil | O que enxerga |
|---|---|---|
| `rui@empresa.com` | Administrador | Todos os dados e o ranking geral |
| `ana@empresa.com` | Gerente de Vendas | A própria carteira e a dos seus vendedores |
| `pedro@empresa.com` | Vendedor | Apenas a própria carteira, sem ranking |

## Mock no Apidog

O contrato OpenAPI das 14 rotas está em [`docs/openapi.yaml`](docs/openapi.yaml),
com os mesmos contratos que as Azure Functions devolvem. Ela foi importada no Apidog
(**Import → OpenAPI/Swagger**), que criou os endpoints, gerou o Cloud Mock a partir
dos schemas e publicou a documentação em <https://rydx0vewxp.apidog.io>.

O servidor de mock (Cloud Mock) responde em
<https://mock.apidog.com/m1/1365834-1370078-default>, com os mesmos caminhos da API:

```bash
curl https://mock.apidog.com/m1/1365834-1370078-default/health
curl https://mock.apidog.com/m1/1365834-1370078-default/clientes
```

Para apontar o front-end a ele em vez das Azure Functions, basta definir a variável
`VITE_API_URL` com essa URL antes do build.

Cada resposta de sucesso do `openapi.yaml` carrega um **exemplo capturado da própria
API**, e não um valor inventado. Esses mesmos exemplos foram gravados no Apidog como
*mock expectations*, uma por rota, de modo que o Cloud Mock devolve os dados reais do
CRM em vez de valores gerados a partir dos tipos. O projeto também está configurado
com **Response Example First** em Mock Settings.

O mock devolve sempre a mesma resposta por rota: ele não interpreta `usuarioId` nem
os filtros, que são aplicados apenas pelas Azure Functions.

Quando o `docs/openapi.yaml` mudar, reimporte o arquivo no mesmo projeto para manter
a documentação e o mock alinhados com a API.

## Rodando localmente

Requer Node.js 22 ou superior.

```bash
# instala as dependências
npm install --prefix app
npm install --prefix api

# sobe a API em http://localhost:7071
node api/scripts/servidor-local.mjs

# em outro terminal, sobe o front em http://127.0.0.1:5180
npm run dev --prefix app
```

O Vite faz proxy de `/api` para a porta 7071, então o front usa o mesmo caminho
relativo em desenvolvimento e em produção.

O script `api/scripts/servidor-local.mjs` registra os mesmos handlers que rodam na
nuvem e os serve por HTTP, o que dispensa o Azure Functions Core Tools. Com o
`func` instalado, `cd api && func start` também funciona.

## Testes

```bash
node api/scripts/testar-api.mjs
```

São 29 casos cobrindo o escopo por perfil, a paginação, os filtros, as validações e
as regras de negócio dos requisitos. Também há `npm run lint --prefix app` e
`npm run build --prefix app`.

## Estrutura

```
Mini-CRM/
├── app/                      front-end React 19 + Vite + TypeScript
│   ├── public/fonts/         fontes extraídas do protótipo
│   ├── public/staticwebapp.config.json
│   └── src/
│       ├── api/              cliente HTTP e hook de leitura
│       ├── auth/             sessão e regras de login (RF01)
│       ├── componentes/      layout, ícones, badges, modal, paginação
│       ├── estado/           alterações locais e mesclagem com a API
│       ├── paginas/          Login, Dashboard, Clientes, Detalhe, Funil
│       └── styles/           design system copiado do protótipo
├── docs/SPEC.md              especificação do sistema: requisitos, regras e decisões
├── docs/openapi.yaml         contrato das rotas, para importar no Apidog
├── api/                      Azure Functions (Node v4, ESM)
│   ├── src/functions/        as 14 rotas
│   ├── src/shared/           dados, escopo por perfil, validação, HTTP
│   ├── src/data/             massa mock gerada
│   └── scripts/              gerador, testes e servidor local
└── swa-cli.config.json       configuração do Static Web Apps CLI
```

## Tecnologias

React 19, Vite 8, TypeScript, React Router 7, Azure Functions (modelo Node v4),
Azure Static Web Apps.
