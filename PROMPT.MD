# Prompts utilizados

Este arquivo registra como a IA generativa foi usada para gerar o front-end e a API
deste projeto, conforme pedido no enunciado do PJBL. A ferramenta foi o **Claude Code**
(modelo Claude Opus), conduzido em conversa, com o código sendo revisado e testado a
cada etapa.

O trabalho não saiu de um único prompt. Foi conduzido em etapas, com material de
apoio produzido antes pela equipe e com decisões de arquitetura tomadas pelo grupo
a cada passo. Abaixo estão os prompts, na ordem em que foram dados.

> As transcrições foram revisadas para ortografia e pontuação. O conteúdo e a
> intenção de cada pedido estão preservados.

---

## Material de apoio fornecido junto ao primeiro prompt

Três arquivos produzidos pela equipe antes desta conversa:

| Arquivo | Conteúdo |
|---|---|
| `PJBL - Soluções Cloud.xlsx` | 33 requisitos funcionais e 9 não funcionais do Mini CRM, perfis de acesso e matriz de permissões |
| `mini-crm-arc42_4.md` | Documentação de arquitetura no padrão arc42, com diagramas C4 de contexto |
| `Mini_CRM_-_Prototipo_completo_2.html` | Protótipo navegável do front-end, em HTML/CSS/JS, validado pelo grupo |

O protótipo foi a principal referência: dele vieram o design system (tokens de cor,
tipografia, componentes), os 27 ícones SVG e o gerador da massa de dados fictícios.

---

## Prompt 1 — enunciado e contexto

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

## Decisões do grupo, respondidas durante a conversa

Antes de gerar código, a IA levantou três decisões de arquitetura. As respostas foram:

- **Stack do front-end:** React na versão estável mais recente, com Vite.
- **Telas a entregar:** Dashboard, Clientes, Funil de vendas, Detalhe do cliente e
  Login (acima do mínimo de duas pedido no enunciado).
- **Mock:** Azure Functions como back-end principal e Apidog para complementar.

## Prompt 2 — sobre os verbos HTTP

> Toda a comunicação vai ser por GET? Assim a aplicação fica limitada demais. Um CRM
> precisa cadastrar cliente, mover oportunidade no funil e concluir tarefa. Como
> tratamos as operações de escrita?

Este prompt mudou o desenho da API. A proposta inicial tinha apenas endpoints de
leitura, porque as telas escolhidas eram de consulta. O questionamento levou a
discutir onde a escrita seria persistida, já que Azure Functions é um serviço sem
estado, e o grupo optou por **verbos completos (POST, PATCH, DELETE) com validação
real na Function e o resultado guardado no estado do front-end**. É por isso que a
API valida um cadastro de cliente e devolve `400` com a lista de erros, mas não grava
em banco.

## Prompt 3 — publicação e restrição de região

> Me passe o comando para instalar o Azure CLI, que eu faço o login. Tentei criar o
> Static Web App e recebi `RequestDisallowedByAzure`, dizendo que a política da
> assinatura mantém um conjunto de regiões permitidas. Meu resource group está em
> Brazil South. Preciso mudar para Central US para funcionar?
>
> Por enquanto, não quero que a publicação passe pelo GitHub.

Duas definições saíram daqui. A primeira: o Azure Static Web Apps existe em apenas
cinco regiões (Central US, East US 2, West US 2, West Europe e East Asia) e Brazil
South não é uma delas, mas **o resource group pode continuar em Brazil South**,
porque sua localização é apenas metadado e não restringe onde os recursos vivem. A
segunda: o deploy é feito por linha de comando, com o SWA CLI e token de publicação,
em vez de um pipeline no GitHub Actions.

## Prompt 4 — mock no Apidog e conferência da entrega

> Onde eu pego a URL do mock no Apidog? Confira se está tudo certo e se a entrega
> está de acordo com o enunciado.

A especificação OpenAPI das 14 rotas foi importada no Apidog, que gerou o Cloud Mock
e publicou a documentação. Na conferência, o mock respondia com valores aleatórios,
porque o modo padrão (Smart Mock) monta a resposta olhando apenas o tipo de cada
campo. A correção está descrita no item 5 da lista abaixo.

## Prompt 5 — especificação do sistema

> Escreva a especificação do projeto a partir do levantamento de requisitos e do
> que já está implementado. O professor sugeriu essa etapa e acabamos não fazendo
> antes de programar, e ela serve também para documentar o projeto.

Resultado em [`docs/SPEC.md`](docs/SPEC.md): visão geral, perfis, os 33 requisitos
funcionais com o que foi atendido nesta entrega, as regras de negócio que a API
aplica, o modelo de dados, os contratos das 14 rotas, os 9 requisitos não
funcionais, seis decisões de arquitetura e as limitações conhecidas.

O documento registra logo no início que foi escrito **depois** da implementação, e
não antes. A ordem não é a ideal, mas o texto descreve o sistema que existe, o que
é mais útil do que uma especificação escrita no começo e nunca atualizada.

---

## Como a IA foi usada em cada parte

| Parte | Papel da IA | Papel da equipe |
|---|---|---|
| Design system | Extraiu do protótipo o CSS, converteu as fontes de base64 para arquivos `.woff2` e transformou os 27 ícones em componentes JSX | O protótipo, com todo o desenho visual, foi feito antes pela equipe |
| Massa de dados | Portou o gerador do protótipo para um script reprodutível, trocando datas fixas por deslocamentos em dias | Definição dos requisitos que a massa precisa exercitar |
| API | Escreveu as 14 rotas, as validações e os testes | Decisão de usar Functions com estado no cliente |
| Telas | Escreveu os componentes React consumindo a API | Escolha das telas e revisão do resultado |
| Testes | Escreveu 29 casos de teste da API e um roteiro que percorre as telas no navegador | Revisão dos casos e das falhas encontradas |
| Documentação e mock | Escreveu o `openapi.yaml` com os exemplos capturados da API em execução, para importar no Apidog | Criação do projeto no Apidog e publicação da documentação |
| Especificação | Consolidou o levantamento da planilha, o arc42 e o código em `docs/SPEC.md`, marcando requisito a requisito o que foi atendido | Levantamento original dos 33 requisitos funcionais e 9 não funcionais |

## Correções feitas a partir de falhas encontradas

Nem tudo saiu certo de primeira. Os problemas encontrados durante a verificação e
corrigidos ainda nesta conversa:

1. Cadastrar um cliente e abrir o detalhe dele retornava `404`, porque o id criado não
   existe na massa mock da API. Corrigido na Function, que passou a reconhecer ids
   gerados na própria sessão. O mesmo valia ao registrar uma interação.
2. Componentes usando classes CSS que não existiam no design system (`.tt`, `.cli`,
   `.ft` no card do funil, `.hd` na timeline), o que quebrava o espaçamento. Corrigido
   comparando o markup com o do protótipo.
3. Textos vazando da barra lateral de 172px e abas renderizando com borda de botão.
4. Dois avisos do linter: exportação que quebrava o Fast Refresh e `setState` dentro
   de efeito no controle de bloqueio de login.
5. O mock do Apidog devolvia dados sem sentido (`"clientes": -44918985`), porque a
   especificação descrevia apenas os tipos de cada campo. Corrigido capturando a
   resposta real de cada uma das 14 rotas da API em execução e gravando-a como
   exemplo no `openapi.yaml`, o que também melhorou a documentação publicada.
