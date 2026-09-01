# Especificação do Mini CRM

Documento de especificação do Mini CRM, projeto da disciplina de Soluções Cloud.
Consolida em um só lugar o produto pretendido (33 requisitos funcionais e 9 não
funcionais levantados pelo grupo), o recorte entregue nesta etapa do PJBL, as
regras de negócio implementadas, o modelo de dados, os contratos da API e as
decisões de arquitetura.

Documentos relacionados:

| Documento | Papel |
|---|---|
| `PJBL - Soluções Cloud.xlsx` | Levantamento original de requisitos, feito pelo grupo |
| `mini-crm-arc42_4.md` | Documentação de arquitetura no padrão arc42, com os diagramas C4 |
| [`docs/openapi.yaml`](openapi.yaml) | Contrato formal da API, importável no Apidog |
| [`README.md`](../README.md) | Endereços publicados, como rodar e como testar |

> Este documento foi escrito depois da implementação, a partir do levantamento de
> requisitos do grupo e do código já em execução. Ele descreve o que o sistema faz
> hoje, e não uma intenção anterior ao desenvolvimento.

---

## 1. Visão geral

**Objetivo.** Sistema simples de gestão de relacionamento com clientes, que permita
cadastrar clientes, registrar interações e acompanhar oportunidades de venda em um
funil.

**Escopo do produto.** Aplicação web com autenticação, CRUD de clientes, registro de
interações, funil de vendas, tarefas, notificações e dashboard.

**Fora do escopo do produto.** Integrações externas, com exceção de serviço de
e-mail transacional para redefinição de senha. E-mail marketing não faz parte do
sistema.

## 2. Atores e perfis

| Perfil | Descrição | Alcance dos dados |
|---|---|---|
| Administrador | Gestão do sistema e dos usuários | Todos os dados, ranking geral |
| Gerente de Vendas | Acompanha o desempenho da equipe e do funil. Tem todas as permissões do Vendedor | A própria carteira e a dos vendedores que cadastrou |
| Vendedor | Usuário do dia a dia, gerencia a própria carteira. A conta é criada pelo Gerente, ao qual fica vinculado | Apenas a própria carteira, sem acesso ao ranking |
| Cliente | Não acessa o sistema e não possui login. É a entidade gerenciada nele | Não se aplica |

O perfil sozinho não decide o alcance: cada usuário tem também um **modo de
visualização** (`Total`, `Equipe` ou `Individual`), que o Administrador ajusta. Um
Gerente em modo `Individual` enxerga apenas a própria carteira. A regra completa
está em `api/src/shared/escopo.js`.

## 3. Escopo desta entrega

O PJBL pede no mínimo duas telas. Foram entregues cinco, escolhidas por cobrirem o
fluxo principal do CRM de ponta a ponta:

| Tela | Rota | O que faz |
|---|---|---|
| Login | `/` | Autenticação simulada, com as regras do RF01 |
| Dashboard | `/dashboard` | Indicadores, funil resumido, tarefas por faixa de vencimento e ranking |
| Clientes | `/clientes` | Listagem com busca, filtros, paginação, cadastro, edição e exclusão lógica |
| Detalhe do cliente | `/clientes/:id` | Histórico de interações, oportunidades e tarefas do cliente, em abas |
| Funil de vendas | `/funil` | Oportunidades nas quatro etapas, com movimentação e fechamento |

Ficaram de fora desta etapa as telas de relatórios, gestão de usuários, central de
notificações e liberação de acesso. A seção 4 marca requisito a requisito.

## 4. Requisitos funcionais

Legenda: **Sim** = implementado e verificável na aplicação publicada.
**Parcial** = parte da regra está implementada, o restante está descrito na coluna
de observação. **Não** = fora do recorte desta entrega, permanece no escopo do
produto.

| ID | Requisito (resumo) | Nesta entrega | Onde / observação |
|---|---|---|---|
| RF01 | Login com e-mail e senha, mínimo de 8 caracteres com letras e números, bloqueio de 15 min após 5 tentativas, sessão de 8 h | Parcial | Tela de Login. As três regras funcionam, mas a validação é feita no front (`app/src/auth/`), porque não há backend de autenticação neste protótipo |
| RF02 | Diferenciação de permissões entre Administrador, Gerente e Vendedor | Sim | `api/src/shared/escopo.js` filtra toda listagem; o front protege as rotas |
| RF03 | Criar, visualizar, editar e excluir clientes, com exclusão lógica | Sim | `POST`, `PATCH` e `DELETE /api/clientes`, gravando no MongoDB; o excluído vira Inativo e sai das listagens |
| RF04 | Busca por nome ou empresa e filtros por status e responsável, preservados na navegação | Sim | `GET /api/clientes?q=&status=&responsavelId=`, resolvido por consulta no MongoDB |
| RF05 | Registro de interações (ligação, e-mail, reunião) com data e observações | Sim | `POST /api/clientes/{id}/interacoes` |
| RF06 | Histórico de interações e oportunidades por cliente | Sim | `GET /api/clientes/{id}`, abas da tela de detalhe |
| RF07 | Oportunidades vinculadas a cliente, com valor, data prevista e responsável | Sim | `POST /api/oportunidades` |
| RF08 | Funil em Prospecção → Contato → Proposta → Fechado (ganho/perdido) | Sim | `GET /api/oportunidades`, tela de Funil |
| RF09 | Mover a oportunidade entre etapas, inclusive retrocedendo; fechada exige reabertura explícita | Sim | `PATCH /api/oportunidades/{id}`, regra em `validarMovimentacao` |
| RF10 | Criar tarefas com vencimento vinculadas a clientes ou oportunidades | Parcial | As tarefas existem no modelo, aparecem no dashboard e no detalhe do cliente e podem ser concluídas, mas não há rota de criação (`POST /api/tarefas`) |
| RF11 | Dashboard com total de clientes por status, oportunidades por etapa e valor em negociação | Sim | `GET /api/dashboard` |
| RF12 | Relatórios com exportação em CSV e PDF | Não | Depende da tela de relatórios, fora desta etapa |
| RF13 | Destaque das tarefas vencidas e próximas do vencimento (15 dias, 1 dia, no dia) | Sim | Faixa calculada na API a cada requisição; ver seção 5.3 |
| RF14 | Administrador cadastra, edita e desativa usuários | Não | `GET /api/usuarios` é somente leitura |
| RF15 | Dashboard restrito ao escopo do perfil | Sim | Verificado: Administrador vê 46 clientes, Gerente 28, Vendedor 10 |
| RF16 | Aba de tarefas no detalhe do cliente, incluindo as das suas oportunidades | Sim | Tela de detalhe do cliente |
| RF17 | Recuperação de senha por código enviado por e-mail | Não | Exige e-mail transacional e backend de autenticação |
| RF18 | Paginação de 20 registros preservando busca e filtros | Sim | `api/src/shared/http.js` e `componentes/Paginacao.tsx` |
| RF19 | Contagem e soma dos valores por etapa do funil | Sim | Presente no funil e no dashboard, recalculado após cada movimentação |
| RF20 | Reativação de usuários desativados | Não | Depende do RF14 |
| RF21 | Filtros de período e status nos relatórios | Não | Depende do RF12 |
| RF22 | Relatórios acessíveis apenas a Gerente e Administrador | Não | Depende do RF12 |
| RF23 | Central de notificações com lida/não lida e contador | Não | Fora desta etapa |
| RF24 | Pop-up de aviso de vencimento, uma vez por sessão, por tarefa e por faixa | Não | O componente de aviso existe, mas é usado para retorno de ações, não para o alerta do RF24 |
| RF25 | Tela de liberação de acesso, exclusiva do Administrador | Não | O campo `modoVisualizacao` já existe no modelo e é respeitado pela API |
| RF26 | Cada cliente tem exatamente um vendedor responsável, transferível | Sim | Campo obrigatório no cadastro, validado contra a lista de usuários |
| RF27 | Gerente cria contas de Vendedor, que ficam vinculadas a ele | Parcial | O vínculo `gerenteId` existe no modelo e governa o escopo do Gerente, mas não há criação de contas |
| RF28 | Conclusão de tarefa pelo usuário; "vencida" é calculada, não persistida | Sim | `PATCH /api/tarefas/{id}` aceita apenas `pendente` e `concluida` |
| RF29 | Motivo obrigatório ao fechar como perdido, de lista fixa | Sim | Preço, Concorrente, Sem verba, Sem resposta; recusa com `400` sem motivo |
| RF30 | Cliente classificado em Prospect, Ativo ou Inativo | Sim | Nasce Prospect; vira Ativo na primeira oportunidade ganha |
| RF31 | Ranking de vendedores por valor ganho e oportunidades fechadas | Sim | No dashboard, restrito ao escopo; o Vendedor não recebe ranking |
| RF32 | Administrador inicial criado por script de inicialização | Parcial | A massa mock marca o Administrador com `seed: true`, mas não há troca de senha obrigatória |
| RF33 | Dados de usuários desativados preservados e sinalizados como "sem responsável ativo" | Sim | Campo `semResponsavelAtivo` nas respostas e selo na interface |

Resumo: **20 requisitos atendidos, 4 parciais e 9 fora desta etapa**.

## 5. Regras de negócio

As regras abaixo são aplicadas na API, e não apenas na interface. É o que garante
que a validação continue valendo mesmo que a requisição venha de fora do front.

### 5.1 Escopo de visualização (RF02, RF15, RF26, RF33)

Toda listagem passa por `idsVisiveis(usuario)`, que resolve os responsáveis
visíveis:

- Perfil Vendedor, ou qualquer perfil em modo `Individual`: apenas o próprio id.
- Perfil Administrador em modo `Total`: todos os usuários.
- Demais casos (Gerente): o próprio id mais os vendedores cujo `gerenteId` aponta
  para ele.

Um registro cujo responsável foi desativado continua visível para Gerente e
Administrador, marcado com `semResponsavelAtivo: true`, sem redistribuição
automática.

### 5.2 Ciclo de vida da oportunidade (RF08, RF09, RF29)

Etapas: Prospecção, Contato, Proposta, Fechado. Mover para Fechado exige
`resultado` igual a `ganho` ou `perdido`. Fechar como perdido exige `motivoPerda`
dentro da lista fixa. Tirar do Fechado uma oportunidade já encerrada exige
`reabrir: true` no corpo da requisição, caso contrário a API responde `400`. O
retrocesso entre etapas abertas é livre, como pede o RF09.

### 5.3 Faixas de vencimento das tarefas (RF13, RF28)

Somente `pendente` e `concluida` são estados persistidos. A condição de vencimento
é derivada da data:

| Faixa | Critério |
|---|---|
| `vencida` | Vencimento anterior a hoje |
| `hoje` | Vence na data atual |
| `amanha` | Vence no dia seguinte |
| `quinze` | Vence dentro dos próximos 15 dias |

### 5.4 Status do cliente (RF03, RF30)

O cliente nasce como Prospect. Passa a Ativo quando tem ao menos uma oportunidade
ganha. A exclusão é lógica: o registro recebe `excluido: true`, passa a Inativo e
sai das listagens, preservando o histórico.

### 5.5 Validações de entrada

| Entidade | Regras |
|---|---|
| Cliente | `nome` com ao menos 3 caracteres, `empresa` com ao menos 2, `email` em formato válido, `responsavelId` existente, `status` dentro do domínio |
| Interação | `tipo` entre Ligação, E-mail e Reunião; `obs` com ao menos 3 caracteres |
| Oportunidade | `clienteId` existente, `titulo` com ao menos 3 caracteres, `valor` maior que zero, `etapa` válida quando enviada |
| Tarefa | `status` entre `pendente` e `concluida`; `titulo` com ao menos 3 caracteres quando enviado |

Erros de validação retornam `400` com a lista completa dos problemas, não apenas o
primeiro:

```json
{
  "erro": "Cliente inválido",
  "erros": ["email: formato inválido", "responsavelId: usuário inexistente"]
}
```

## 6. Modelo de dados

Seis entidades. Os tipos completos estão em `app/src/tipos.ts` e os schemas em
`docs/openapi.yaml`.

| Entidade | Campos principais | Relacionamentos |
|---|---|---|
| Usuário | `id`, `nome`, `email`, `perfil`, `status`, `gerenteId`, `modoVisualizacao` | `gerenteId` aponta para outro usuário |
| Cliente | `id`, `nome`, `empresa`, `email`, `telefone`, `status`, `responsavelId`, `excluido` | Pertence a um usuário responsável. Persistido na coleção `clientes` do MongoDB |
| Interação | `id`, `clienteId`, `tipo`, `obs`, `data`, `autorId` | Pertence a um cliente, registrada por um usuário |
| Oportunidade | `id`, `clienteId`, `titulo`, `etapa`, `resultado`, `motivoPerda`, `valor`, `dataPrevista`, `responsavelId` | Pertence a um cliente e a um responsável |
| Tarefa | `id`, `titulo`, `clienteId`, `vinculoTipo`, `vinculoOppId`, `vencimento`, `status`, `responsavelId` | Vinculada a um cliente ou a uma oportunidade |
| Sessão | `usuario`, `expiraEm` | Vive apenas no navegador |

## 7. Interface da API

Todas as rotas são anônimas e ficam sob `/api`, no mesmo domínio do site. O
parâmetro `usuarioId` define o escopo dos dados; sem ele, a API assume o
Administrador da massa inicial, o que facilita testar no navegador.

| Método | Rota | Requisitos |
|---|---|---|
| GET | `/api/health` | Diagnóstico |
| GET | `/api/usuarios` | RF04, RF26 |
| GET | `/api/dashboard` | RF11, RF15, RF19, RF31 |
| GET | `/api/clientes` | RF04, RF18, RF30, RF33 |
| GET | `/api/clientes/{id}` | RF06, RF16 |
| POST | `/api/clientes` | RF03, RF26, RF30 |
| PATCH | `/api/clientes/{id}` | RF03, RF26 |
| DELETE | `/api/clientes/{id}` | RF03 |
| POST | `/api/clientes/{id}/interacoes` | RF05 |
| GET | `/api/oportunidades` | RF08, RF19 |
| POST | `/api/oportunidades` | RF07 |
| PATCH | `/api/oportunidades/{id}` | RF09, RF29, RF30 |
| GET | `/api/tarefas` | RF10, RF13 |
| PATCH | `/api/tarefas/{id}` | RF28 |

Códigos de retorno: `200` em leitura e atualização, `201` em criação, `400` em
entrada inválida ou regra de negócio violada, `404` em registro inexistente ou
fora do escopo do usuário.

## 8. Requisitos não funcionais

| ID | Requisito | Como esta entrega se posiciona |
|---|---|---|
| RNF01 | Interface simples, sem treinamento | A interface segue o protótipo validado pelo grupo, com cadastro de cliente em um formulário só |
| RNF02 | Resposta em menos de 3 segundos | Atendido com folga: as funções servem dados em memória; o `/api/health` responde na casa de milissegundos |
| RNF03 | Senhas com hash e rotas protegidas por autenticação | **Não atendido**, e por decisão consciente: o protótipo não tem backend de autenticação e as rotas são anônimas. Ver limitação 1 na seção 10 |
| RNF04 | Compatível com Chrome, Firefox e Edge | Build padrão do Vite, sem API exclusiva de um navegador. Verificado em Chromium |
| RNF05 | Código versionado e documentado | Repositório Git com README, especificação, OpenAPI, linter configurado e commits em Conventional Commits |
| RNF06 | Dados não perdidos em caso de falha | Parcial: os clientes ficam no MongoDB Atlas, que replica e faz backup do lado do serviço. As demais entidades são regeradas por script determinístico |
| RNF07 | Mínimo de 100 clientes e 10 usuários simultâneos | A massa tem 46 clientes; o Static Web Apps absorve a concorrência exigida |
| RNF08 | Layout utilizável a partir de 1366x768 | Herdado do protótipo, que já foi construído nessa faixa |
| RNF09 | Transições fluidas no funil, com resposta visual imediata | As transições do design system foram preservadas; a movimentação é por ação na interface, não por arrastar o card |

## 9. Decisões de arquitetura

**D1. React com Vite e TypeScript.** O enunciado deixa React opcional. Foi adotado
porque o protótipo do grupo já era componentizado e o porte ficou direto. O
TypeScript foi escolhido para que os contratos da API virassem tipos verificados
em tempo de compilação.

**D2. Azure Functions como API integrada do Static Web Apps.** Em vez de publicar
um Function App separado, a pasta `api/` é publicada junto com o site. Consequência:
mesma origem, sem CORS, uma única URL para entregar e um único deploy.

**D3. Persistência dividida entre banco e cliente.** Os clientes são gravados numa
coleção do MongoDB Atlas, através das quatro Functions de cliente. As demais
entidades continuam servidas de uma massa mock em memória: para elas a Function
valida a escrita e devolve o registro resultante, e o front guarda no `localStorage`
e mescla com o que a API devolve. A divisão é consequência do escopo das atividades,
que pediu banco para uma entidade, e não do desenho ideal do sistema.

**D4. Massa mock determinística com datas relativas.** A massa é gerada com semente
fixa, então é sempre idêntica. As datas são gravadas como deslocamento em dias e
convertidas na requisição, o que impede que as faixas do RF13 envelheçam com o
tempo.

**D5. Publicação por linha de comando.** O deploy é feito pelo SWA CLI com token de
publicação, sem pipeline no GitHub Actions, a pedido do grupo. O Static Web Apps
foi criado em Central US porque o serviço não existe em Brazil South, enquanto o
resource group permanece em Brazil South, já que sua região é apenas metadado.

**D7. MongoDB Atlas para a entidade Cliente.** O cluster é um M0 gratuito. A
conexão fica num módulo compartilhado, com o `MongoClient` criado uma vez por
processo, porque Azure Functions reaproveita o processo entre invocações e o M0
aceita poucas conexões simultâneas. A string de conexão vem de variável de ambiente,
nunca do código.

**D6. Apidog como segundo caminho para o mesmo contrato.** O `openapi.yaml`
descreve as 14 rotas e carrega exemplos capturados da API em execução. Importado no
Apidog, gera a documentação publicada e o Cloud Mock, que responde os mesmos
formatos sem depender do Azure.

## 10. Limitações conhecidas

1. **Não há autenticação real.** O login valida contra a lista de usuários que a
   API devolve, usando uma senha de demonstração comum. As rotas da API são
   anônimas. Em produção seria preciso provedor de identidade e autorização por
   token.
2. **Só a entidade Cliente é persistida.** Interações, oportunidades e tarefas
   continuam guardadas no navegador de quem fez a operação. Limpar o `localStorage`
   devolve essas entidades à massa original.
3. **O histórico ainda não conversa com o banco.** As oportunidades, as interações e
   as tarefas vivem num arquivo JSON carregado pela Function e apontam para os
   clientes por id.
4. **Nove requisitos permanecem fora da entrega**, listados na seção 4.

## 11. Verificação

| O que | Comando | Resultado atual |
|---|---|---|
| Testes da API | `node api/scripts/testar-api.mjs` | 30 casos, todos passando |
| Linter do front | `npm run lint --prefix app` | Sem avisos |
| Build do front | `npm run build --prefix app` | Compila sem erros |

Os testes cobrem o escopo por perfil, a paginação, os filtros, as validações de
cada entidade e as regras de negócio das seções 5.2 a 5.5.
