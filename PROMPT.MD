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
