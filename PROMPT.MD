# Prompts utilizados

O enunciado pede o prompt que usamos para gerar o front-end. Só que não foi um
prompt, foi uma conversa. A ferramenta foi o Claude Code (modelo Claude Opus), e o
trabalho andou em etapas: a gente pedia uma parte, olhava o resultado, apontava o
que estava errado e seguia. As decisões de arquitetura foram nossas, tomadas a cada
passo, e o código foi revisado e testado antes de ir para o repositório.

Abaixo estão os pedidos na ordem em que foram feitos, com o que saiu de cada um.

> Corrigimos ortografia e pontuação das transcrições, porque foram digitadas às
> pressas. O que foi pedido, e por quê, está preservado.

---

## O que já existia antes da primeira conversa

Três arquivos que o grupo produziu antes, e que foram entregues junto do primeiro
pedido:

| Arquivo | Conteúdo |
|---|---|
| `PJBL - Soluções Cloud.xlsx` | 33 requisitos funcionais e 9 não funcionais do Mini CRM, os perfis de acesso e a matriz de permissões |
| `mini-crm-arc42_4.md` | Documentação de arquitetura no padrão arc42, com os diagramas C4 de contexto |
| `Mini_CRM_-_Prototipo_completo_2.html` | Protótipo navegável do front-end, em HTML, CSS e JS, já validado pelo grupo |

O protótipo acabou sendo a referência mais usada. Dele vieram o design system
(cores, tipografia, componentes), os 27 ícones em SVG e o gerador da massa de dados
fictícios. A ideia nunca foi redesenhar nada, era portar o que já estava aprovado
para React sem perder a aparência.

---

## Prompt 1: o enunciado e o contexto

> Em grupo PJBL, alunos criam frontend que se comunica com azure functions e mock
> backend. (Opcional: utilizar React, opcional: utilizar o Module Federation).
> No mínimo duas funcionalidades/telas do projeto PJBL.
> No repo deve conter um arquivo GRUPO.md deve conter o nome dos alunos.
> Comunicação do frontend com pelo menos 1 endpoint GET de Azure Functions
> (utilizar dados mocks).
> Outras funcionalidades: sugiro realizar o mock com Apidog.
> Utilizar IAG. Informe no arquivo Prompt.md qual o prompt utilizado para gerar o
> frontend. Publicar no Azure Web Static Apps. No arquivo Readme.MD deve conter o
> endereço do site criado no azure web Static apps. e Se utilizou o apidog para mock
> informar os endereços. No AVA fornecer o link público do repositório no github e
> azure function.
>
> Vamos iniciar este projeto. As especificações estão em `PJBL - Soluções Cloud.xlsx`,
> parte da documentação de arquitetura C4 está em `mini-crm-arc42_4.md` e o protótipo
> em HTML que já temos é o `Mini_CRM_-_Prototipo_completo_2.html`. Prefiro conduzir
> passo a passo, para eu acompanhar cada decisão.

Passamos o enunciado inteiro junto com os três arquivos, em vez de pedir "faça um
CRM em React". A diferença é grande: com o protótipo e os requisitos em mãos, o que
saiu já veio no formato do nosso projeto, e não um CRM genérico qualquer.

## O que decidimos no caminho

Antes de sair gerando código, apareceram três decisões para o grupo bater o martelo:

- **Stack do front-end.** React na versão estável mais recente, com Vite.
- **Telas.** Dashboard, Clientes, Funil de vendas, Detalhe do cliente e Login. O
  enunciado pede duas, entregamos cinco, porque menos que isso não fecha o fluxo do
  CRM de ponta a ponta.
- **Mock.** Azure Functions como back-end principal, com o Apidog servindo o mesmo
  contrato por outro caminho.

## Prompt 2: os verbos HTTP

> Toda a comunicação vai ser por GET? Assim a aplicação fica limitada demais. Um CRM
> precisa cadastrar cliente, mover oportunidade no funil e concluir tarefa. Como
> tratamos as operações de escrita?

Esse foi o pedido que mais mudou o projeto. A primeira proposta tinha só endpoints
de leitura, porque as telas escolhidas eram de consulta e o enunciado exige apenas
um GET. Só que um CRM que não cadastra nada não é um CRM.

A discussão foi sobre onde guardar o que o usuário escreve, já que Azure Functions
não tem estado e o projeto não tem banco. A saída que o grupo escolheu: **POST,
PATCH e DELETE de verdade, com a validação acontecendo na Function, e o resultado
guardado no estado do front-end**. É por isso que cadastrar um cliente com e-mail
inválido devolve `400` com a lista de erros, mesmo sem nada ser gravado em banco.

## Prompt 3: publicação e a região do Azure

> Me passe o comando para instalar o Azure CLI, que eu faço o login. Tentei criar o
> Static Web App e recebi `RequestDisallowedByAzure`, dizendo que a política da
> assinatura mantém um conjunto de regiões permitidas. Meu resource group está em
> Brazil South. Preciso mudar para Central US para funcionar?
>
> Por enquanto, não quero que a publicação passe pelo GitHub.

O erro travou a publicação por um tempo e a resposta resolveu duas coisas. A
primeira é que o Static Web Apps existe em cinco regiões apenas (Central US, East
US 2, West US 2, West Europe e East Asia), e Brazil South não é uma delas. Mas não
precisava mexer no resource group: a região dele é só metadado e não limita onde os
recursos ficam. Criamos o app em Central US com o grupo em Brazil South e funcionou.

A segunda é que o deploy sai por linha de comando, com o SWA CLI e o token de
publicação, em vez de um pipeline no GitHub Actions.

## Prompt 4: o mock no Apidog

> Onde eu pego a URL do mock no Apidog? Confira se está tudo certo e se a entrega
> está de acordo com o enunciado.

Importamos a especificação das 14 rotas no Apidog, que gerou o Cloud Mock e publicou
a documentação. Na hora de conferir, o mock respondia com valores sem pé nem cabeça,
do tipo `"clientes": -44918985`. O motivo está no item 5 da lista mais abaixo.

## Prompt 5: a especificação

> Escreva a especificação do projeto a partir do levantamento de requisitos e do
> que já está implementado. O professor sugeriu essa etapa e acabamos não fazendo
> antes de programar, e ela serve também para documentar o projeto.

Saiu o [`docs/SPEC.md`](docs/SPEC.md), que junta a planilha de requisitos, o arc42 e
o código num documento só: perfis, os 33 requisitos com o que foi atendido e o que
ficou de fora, as regras de negócio que a API aplica, o modelo de dados, os
contratos das rotas, as decisões de arquitetura e as limitações.

O documento avisa logo no começo que foi escrito depois da implementação. A ordem
não foi a ideal, a spec deveria ter vindo antes do código, mas preferimos assumir
isso a fingir o contrário. E, escrita depois, ela descreve o sistema que existe de
fato.

---

## Como dividimos o trabalho com a IA

| Parte | O que a IA fez | O que o grupo fez |
|---|---|---|
| Design system | Tirou o CSS do protótipo, converteu as fontes de base64 para arquivos `.woff2` e transformou os 27 ícones em componentes JSX | Todo o desenho visual, feito antes no protótipo |
| Massa de dados | Transformou o gerador do protótipo num script reprodutível, trocando datas fixas por deslocamentos em dias | Definiu os requisitos que a massa precisa exercitar |
| API | Escreveu as 14 rotas, as validações e os testes | Decidiu usar Functions sem estado, com a persistência no cliente |
| Telas | Escreveu os componentes React que consomem a API | Escolheu as telas e revisou o resultado |
| Testes | Escreveu 29 casos para a API e um roteiro que percorre as telas no navegador | Revisou os casos e as falhas que apareceram |
| Documentação e mock | Escreveu o `openapi.yaml` com exemplos capturados da API rodando | Criou o projeto no Apidog e publicou a documentação |
| Especificação | Consolidou planilha, arc42 e código no `docs/SPEC.md` | Levantou os 33 requisitos funcionais e os 9 não funcionais |

## O que deu errado no caminho

Vale registrar, porque quase nada saiu certo de primeira e foi conferindo que os
problemas apareceram:

1. Cadastrar um cliente e abrir o detalhe dele dava `404`. O id criado na hora não
   existe na massa da API. A correção foi na Function, que passou a reconhecer ids
   gerados na sessão. O mesmo acontecia ao registrar uma interação.
2. Componentes usando classes de CSS que não existiam no design system (`.tt`,
   `.cli` e `.ft` no card do funil, `.hd` na linha do tempo). O espaçamento saía
   quebrado. Corrigimos comparando o markup com o do protótipo.
3. Texto vazando da barra lateral e as abas aparecendo com a borda padrão de botão.
4. Dois avisos do linter: uma exportação que quebrava o Fast Refresh e um `setState`
   dentro de efeito no controle de bloqueio do login.
5. O mock do Apidog devolvendo dados aleatórios. A especificação descrevia só o tipo
   de cada campo, então o Apidog inventava o valor. Resolvemos capturando a resposta
   real das 14 rotas com a API rodando e gravando cada uma como exemplo no
   `openapi.yaml`, o que de quebra melhorou a documentação publicada.

---

## Prompt 6: Vertical Slice, Clean Architecture e SOLID no backend

> O professor pediu pra aplicar Vertical Slice e Clean Architecture e SOLID
> no backend do TDE2, usando o codigo que a gente ja tinha. Anexei os 3
> slides dele (Vertical Slice, SOLID e Clean Architecture) pra IA seguir
> exatamente os termos que ele usa (Entities, Use Cases, Interface Adapters,
> Frameworks and Drivers, e os 5 principios do SOLID). Pediu tambem pra
> dividir em partes pra cada um dos 4 do grupo fazer uma parte e explicar o
> que fez.

A divisão saiu por peso de regra de negócio, não por "uma rota pra cada":
quem pegou `clientes` pegou a parte maior (é a única com MongoDB de
verdade); quem pegou `oportunidades`+`tarefas` pegou as regras de funil e
vencimento; `dashboard`+`interacoes` ficou com agregação e histórico;
`usuarios`+`health`+o kernel compartilhado (`shared/`) ficou pra quem monta
a base que as outras slices usam.

### Nicolas Tancon — slice `clientes`

> Minha parte é a de clientes, que é a unica que grava em banco de
> verdade. Separa isso em domain/application/adapters tipo o exemplo do
> slide 11 do SOLID (aquele `order/api`, `order/application`, `order/domain`,
> `order/infrastructure`), mas com os nomes que a gente já usa em
> português. Quero um port `ClienteRepository` e o Mongo implementando ele,
> pra dar pra trocar por um fake nos teste sem precisar do banco.

O que saiu: a entidade `Cliente` (regra pura, sem Mongo), o port
`ClienteRepository` e dois adapters (`MongoClienteRepository` pro CRUD de
verdade, `MockHistoricoClienteRepository` pro histórico que ainda vem da
massa mock), 5 use cases — um por operação (SRP) — e o `clientes.controller.js`
só traduzindo HTTP pra chamada de use case, sem regra de negócio dentro.

### Leandro Canha — slices `oportunidades` e `tarefas`

> Fiquei com oportunidades e tarefas pq são as duas que tem regra de
> negocio mais chata (fechar oportunidade perdida exige motivo, reabrir
> exige confirmar, e tarefa concluida nao pode ter faixa de vencimento).
> Quero as regra isolada numa funcao pura que da pra testar sem subir nada,
> tipo o exemplo do `Order.addItem()` do slide da Clean Architecture.

O que saiu: `domain/Oportunidade.js` com `moverEtapa`, `promoveClienteParaAtivo`
e `foiReaberta` isoladas (e testadas com `node --test`, sem mock de Mongo
nem de Azure Functions), e o mesmo pra `domain/Tarefa.js` com a regra do
RF28. Os repositórios das duas slices leem a massa mock, igual antes —
nada de persistência nova.

### Pedro Costa — slices `dashboard` e `interacoes`

> Dashboard e interações ficaram comigo. O dashboard é só leitura, agrega
> um monte de coisa (cliente, oportunidade, tarefa, ranking). Minha duvida
> foi se o use case do dashboard podia importar direto o repositorio da
> slice de oportunidades pra nao duplicar codigo. Me expliquem se isso fere
> o Vertical Slice.

A resposta foi que sim, feriria — cada slice fica mais acoplada se importar
classe de dentro da outra. A solução: `dashboard` define os próprios ports
de leitura (`ClienteStatusRepository`, `OportunidadeConsultaRepository`,
`TarefaConsultaRepository`, `UsuarioConsultaRepository`), implementados
contra o kernel compartilhado — nunca contra a slice de oportunidades ou
tarefas diretamente. As contas de ranking e indicadores por etapa viraram
funções puras em `domain/Dashboard.js`, testadas isoladas.

### Lincoln Neto — slices `usuarios`, `health` e o kernel compartilhado

> Peguei as duas rotas mais simples (usuarios e health) e fiquei
> responsavel por organizar o `shared/`, que é usado por todo mundo. Achei
> estranho que a função de escopo (`escopoDaRequisicao`) recebia o
> `request` inteiro do Azure Functions — isso não é tipo o núcleo
> dependendo de um detalhe externo, que o slide da Clean Architecture fala
> pra nunca fazer?

Exatamente o que o slide 2 da Clean Architecture chama de Regra das
Dependências ("código-fonte só deve apontar para dentro"). A correção:
`resolverEscopo(usuarioId)` passou a receber só a string do id, e quem lê o
`request.query` agora é o controller HTTP de cada slice — o kernel não
conhece mais o tipo de request do Azure Functions. Esse ajuste também virou
o `EscopoService`, injetado nos use cases das outras 6 slices, e o
`ClienteConsultaRepository` (leitura mock de cliente usada por
oportunidades, tarefas e interações).

## Como dividimos o trabalho desta vez

| Parte | O que a IA fez | O que o grupo fez |
|---|---|---|
| Kernel compartilhado | Extraiu `EscopoService` e `ClienteConsultaRepository`, corrigiu a dependência invertida do `escopoDaRequisicao` | Apontou o problema ao ler o diagrama de componentes |
| `clientes` | Entity, port, 5 use cases, 2 adapters, controller | Revisou se o comportamento das 5 rotas continuava idêntico |
| `oportunidades` + `tarefas` | Isolou as regras de funil/vencimento em funções puras testadas | Validou as regras contra a SPEC.md (RF08/RF09/RF29/RF13/RF28) |
| `dashboard` + `interacoes` | Ports próprios por slice, sem acoplar com outras slices | Questionou o acoplamento entre slices, o que gerou a correção |
| Diagramas | Gerou os 3 diagramas Mermaid e exportou para PNG | Conferiu visualmente antes de aprovar |
| PDF da entrega | Montou o HTML e gerou o PDF a partir dele | Revisou o conteúdo final antes de entregar |

## O que deu certo e o que ficou pendente

O código ficou mais verboso (muito mais arquivos para a mesma funcionalidade),
que é exatamente o trade-off que os slides do SOLID e da Clean Architecture
avisam: "excesso de interfaces/classes" e "overengineering em sistemas
simples" são os riscos citados, e um CRM pequeno como este é, em parte, o
caso onde isso pesa mais que ajuda. Optamos por aplicar mesmo assim porque
o objetivo aqui é o exercício acadêmico dos três padrões, não o tamanho
ideal do código para este projeto específico.

Não foi possível rodar a suíte completa de 30 casos (`testar-api.mjs`) no
ambiente onde a IA trabalhou, porque exige `MONGODB_URI` de um cluster
MongoDB Atlas de verdade, e essas credenciais não estavam disponíveis ali.
Quem entregar precisa rodar `node api/scripts/testar-api.mjs` localmente
(com `api/local.settings.json` configurado) antes de considerar a
refatoração validada de ponta a ponta. As 5 rotas que não dependem do Mongo
(`health`, `usuarios`, `oportunidades`, `tarefas`, `interacoes`) foram
conferidas manualmente e responderam no formato esperado.
