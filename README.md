# Mini CRM (PJBL)

Projeto da disciplina de Soluções Cloud. É um CRM enxuto, com carteira de clientes,
histórico de interações, funil de oportunidades, tarefas com aviso de vencimento e
indicadores que mudam conforme o perfil de quem está logado.

O front-end é React e conversa com uma API de Azure Functions. Os clientes são
gravados num banco MongoDB Atlas; as demais entidades ainda são servidas de uma massa
mock em memória. Tudo está publicado no Azure Static Web Apps. Os requisitos saíram do levantamento
que o grupo fez (33 requisitos funcionais) e a aparência veio do protótipo em HTML
que a equipe validou antes de começar a programar.

- **Quem fez:** [GRUPO.md](GRUPO.md)
- **O que o sistema faz, em detalhe:** [docs/SPEC.md](docs/SPEC.md)
- **Como a IA foi usada:** [PROMPT.MD](PROMPT.MD)

## Endereços

| O quê | Endereço |
|---|---|
| Site (Azure Static Web Apps) | <https://ambitious-pebble-077133f10.7.azurestaticapps.net> |
| API (Azure Functions integrada) | <https://ambitious-pebble-077133f10.7.azurestaticapps.net/api/health> |
| Documentação no Apidog | <https://rydx0vewxp.apidog.io> |
| Mock server no Apidog (Cloud Mock) | <https://mock.apidog.com/m1/1365834-1370078-default> |

A API não tem domínio próprio: ela vive sob `/api`, no mesmo endereço do site. É o
recurso de API integrada do Static Web Apps, e a vantagem é não precisar lidar com
CORS nem com duas URLs diferentes.

## Telas

O enunciado pede duas telas no mínimo. Fizemos cinco, porque com menos que isso o
fluxo do CRM não fecha.

| Tela | Requisitos atendidos |
|---|---|
| Login | RF01 (senha mínima, bloqueio por tentativas, expiração de sessão), RF02 |
| Dashboard | RF11, RF13, RF15, RF19, RF29, RF31 |
| Clientes | RF03, RF04, RF18, RF26, RF30, RF33 |
| Detalhe do cliente | RF05, RF06, RF16, RF28 |
| Funil de vendas | RF07, RF08, RF09, RF19, RF29, RF30 |

## Endpoints da API

São 14 rotas, todas anônimas, sob `/api`. Quem manda no que aparece é o parâmetro
`usuarioId`: o Vendedor recebe só a própria carteira, o Gerente recebe a da equipe e
o Administrador recebe tudo. Essa é a regra do RF15.

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/health` | Diz se a API está de pé e quantos registros existem |
| GET | `/api/usuarios` | Lista os usuários, sem nenhum dado de senha |
| GET | `/api/dashboard` | Indicadores, funil resumido, tarefas e ranking |
| GET | `/api/clientes` | Pesquisa no MongoDB, com busca (`q`), filtros e 20 por página |
| GET | `/api/clientes/{id}` | O cliente com suas interações, oportunidades e tarefas |
| POST | `/api/clientes` | Insere no MongoDB, o cliente nasce como Prospect |
| PATCH | `/api/clientes/{id}` | Altera o documento no MongoDB |
| DELETE | `/api/clientes/{id}` | Exclusão lógica: vira Inativo e some das listagens |
| POST | `/api/clientes/{id}/interacoes` | Registra uma ligação, e-mail ou reunião |
| GET | `/api/oportunidades` | O funil nas quatro etapas, com contagem e soma |
| POST | `/api/oportunidades` | Cria oportunidade vinculada a um cliente |
| PATCH | `/api/oportunidades/{id}` | Move no funil, fecha ou reabre |
| GET | `/api/tarefas` | Tarefas com a faixa de vencimento já calculada |
| PATCH | `/api/tarefas/{id}` | Conclui ou reabre a tarefa |

Dá para testar direto no navegador ou no terminal:

```bash
curl "https://ambitious-pebble-077133f10.7.azurestaticapps.net/api/clientes?usuarioId=u2&q=acme&status=Ativo"
curl "https://ambitious-pebble-077133f10.7.azurestaticapps.net/api/dashboard?usuarioId=u1"
```

### O que grava em banco e o que não grava

Os **clientes** ficam numa coleção do MongoDB Atlas. As quatro rotas de cliente
(pesquisar, inserir, alterar e excluir) falam com o banco de verdade, então o que
você cadastra continua lá depois de fechar o navegador.

As demais entidades (usuários, oportunidades, interações e tarefas) seguem numa
massa mock em memória. Para essas, a Function valida a escrita e devolve o registro
resultante, mas quem guarda é o front-end, no `localStorage`.

Em ambos os casos a validação é real. Tente cadastrar um cliente com e-mail
inválido e a resposta é `400` com a lista inteira de problemas, não só o primeiro:

```json
{
  "erro": "Cliente inválido",
  "erros": ["email: formato inválido", "responsavelId: usuário inexistente"]
}
```

As regras de negócio valem do mesmo jeito. Fechar uma oportunidade como perdida sem
dizer o motivo é recusado (RF29), e tirar do funil uma oportunidade já fechada exige
mandar `reabrir: true` no corpo (RF09).

## Os dados fictícios

A massa vem do script `api/scripts/gerar-mock.mjs`, que usa uma semente fixa. Por
isso ela é sempre a mesma: 8 usuários, 46 clientes, 60 oportunidades, 123 interações
e 22 tarefas. Os 46 clientes são carregados no MongoDB por
`api/scripts/seed-mongo.mjs`, com os mesmos ids, para que as oportunidades, as
interações e as tarefas continuem apontando para os clientes certos.

Tem um detalhe do qual gostamos: as datas não são gravadas como data absoluta, e sim
como **deslocamento em dias**. A API converte para data real na hora da requisição.
O efeito é que as faixas de vencimento do RF13 (vencida, hoje, amanhã, próximos 15
dias) continuam certas em qualquer dia que alguém abrir o sistema, sem ninguém
precisar regerar nada.

Se quiser regerar mesmo assim:

```bash
cd api && node scripts/gerar-mock.mjs
```

## Usuários para testar

O login é simulado no front, já que não existe back-end de autenticação neste
protótipo. A senha de todos é `demo1234`.

| E-mail | Perfil | O que enxerga |
|---|---|---|
| `rui@empresa.com` | Administrador | Todos os dados e o ranking geral |
| `ana@empresa.com` | Gerente de Vendas | A própria carteira e a dos seus vendedores |
| `pedro@empresa.com` | Vendedor | Só a própria carteira, sem ranking |

Vale entrar com os três para ver a diferença: o perfil de Administrador vê 46
clientes, o de Gerente vê 28 e o de Vendedor vê 10.

## O mock no Apidog

O contrato das 14 rotas está em [`docs/openapi.yaml`](docs/openapi.yaml), com os
mesmos formatos que as Azure Functions devolvem. Esse arquivo foi importado no
Apidog (**Import → OpenAPI/Swagger**), que criou os endpoints, gerou o Cloud Mock e
publicou a documentação em <https://rydx0vewxp.apidog.io>.

O mock atende no mesmo caminho da API:

```bash
curl https://mock.apidog.com/m1/1365834-1370078-default/health
curl https://mock.apidog.com/m1/1365834-1370078-default/clientes
```

Cada resposta de sucesso do `openapi.yaml` carrega um exemplo que foi **capturado da
API rodando**, não um valor inventado. Esses mesmos exemplos estão gravados no
Apidog como mock expectations, uma por rota, então o mock devolve os dados de
verdade do CRM em vez daquele lorem ipsum que ele gera sozinho a partir dos tipos.
O projeto também está com Response Example First ligado em Mock Settings.

Duas ressalvas para não gerar confusão:

- O mock devolve sempre a mesma resposta por rota. Ele não lê `usuarioId` nem os
  filtros, que só funcionam nas Azure Functions.
- Reimportar o `openapi.yaml` atualiza a documentação e os endpoints, mas não mexe
  nas mock expectations. Se o formato de alguma resposta mudar, a expectation
  daquela rota precisa ser atualizada à parte.

Para o front-end usar o mock no lugar das Functions, é só definir a variável
`VITE_API_URL` com a URL do mock antes de rodar o build.

## Rodando na sua máquina

Precisa de Node.js 22 ou mais novo.

Também precisa de uma string de conexão do MongoDB Atlas em
`api/local.settings.json`, que não vai para o repositório:

```json
{
  "Values": {
    "MONGODB_URI": "mongodb+srv://usuario:senha@cluster.mongodb.net/",
    "MONGODB_DB": "mini_crm"
  }
}
```

```bash
# instala as dependências
npm install --prefix app
npm install --prefix api

# carrega os 46 clientes na coleção (só na primeira vez)
cd api && node scripts/seed-mongo.mjs && cd ..

# sobe a API em http://localhost:7071
node api/scripts/servidor-local.mjs

# em outro terminal, sobe o front em http://127.0.0.1:5180
npm run dev --prefix app
```

O Vite faz proxy de `/api` para a porta 7071, então o caminho que o front usa é o
mesmo em desenvolvimento e em produção.

Sobre o `servidor-local.mjs`: ele registra os mesmos handlers que rodam na nuvem e
os serve por HTTP. Escrevemos esse script porque a instalação do Azure Functions
Core Tools falhava no ambiente do grupo. Se você tiver o `func` instalado,
`cd api && func start` funciona igual.

## Testes

```bash
node api/scripts/testar-api.mjs
```

São 30 casos, cobrindo o escopo por perfil, a paginação, os filtros, as validações
de cada entidade, as regras de negócio dos requisitos e a persistência no MongoDB.
Os testes gravam de verdade e apagam os próprios registros no final, então precisam
da `MONGODB_URI` configurada. O front tem ainda
`npm run lint --prefix app` e `npm run build --prefix app`.

## Como o projeto está organizado

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
├── docs/SPEC.md              especificação: requisitos, regras e decisões
├── docs/openapi.yaml         contrato das rotas, para importar no Apidog
├── api/                      Azure Functions (Node v4, ESM)
│   ├── src/features/         as 14 rotas, uma vertical slice por área
│   │                         (domain/application/adapters + index.js)
│   ├── src/shared/           kernel compartilhado: dados, escopo por perfil,
│   │                         validação, HTTP, MongoDB
│   ├── src/data/             massa mock gerada
│   ├── test/                 testes unitários dos módulos de domínio
│   └── scripts/              gerador, carga no MongoDB, testes e servidor local
└── swa-cli.config.json       configuração do Static Web Apps CLI
```

## Tecnologias

React 19, Vite 8, TypeScript, React Router 7, Azure Functions no modelo Node v4,
MongoDB Atlas com o driver oficial `mongodb` e Azure Static Web Apps.
